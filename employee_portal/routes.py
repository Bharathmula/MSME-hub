import hashlib,json,secrets
from datetime import datetime,timedelta,timezone
from uuid import uuid4
from flask import Blueprint,current_app,g,jsonify,request
from itsdangerous import BadSignature,SignatureExpired,URLSafeTimedSerializer
from werkzeug.security import check_password_hash,generate_password_hash
from .database import connect,transaction
from .security import require,token

employee_api=Blueprint('employee_api',__name__)
def now():return datetime.now(timezone.utc)
def stamp():return now().isoformat()
def data():return request.get_json(silent=True) or {}
def reset_signer():return URLSafeTimedSerializer(current_app.config['SECRET_KEY'],salt='msme-employee-password-reset-v1')
def public(row):
 columns=set(row.keys())
 fields=('id','employee_id','name','email','workforce_role','status','biometric_status','phone','profile_photo_data','tenant_email')
 return {key:row[key] for key in fields if key in columns}
def audit(db,action,kind,eid,details):
 i=g.employee_identity;db.execute('INSERT INTO employee_audit_log VALUES(?,?,?,?,?,?,?,?)',(uuid4().hex,i['email'],i['role'],action,kind,str(eid),json.dumps(details),stamp()))
def current(db):
 row=db.execute('SELECT * FROM employee_accounts WHERE id=?',(g.employee_identity.get('employee_account_id'),)).fetchone()
 return row if row and row['status']=='ACTIVE' and row['tenant_email']==g.employee_identity['tenant'] else None

@employee_api.post('/api/employee/login')
def login():
 p=data();login_id=str(p.get('email','')).strip().lower();password=str(p.get('password',''))
 db=connect()
 try: row=db.execute('SELECT * FROM employee_accounts WHERE lower(email)=? OR phone=?',(login_id,login_id)).fetchone()
 finally: db.close()
 if not row or not row['password_hash'] or not check_password_hash(row['password_hash'],password):return jsonify({'error':'Incorrect employee email or password.'}),401
 if row['status']!='ACTIVE':return jsonify({'error':f"This account is {row['status'].lower()}."}),403
 return jsonify({'ok':True,'access_token':token(row['email'],'EMPLOYEE',row['tenant_email'],row['id']),'employee':public(row)})

@employee_api.post('/api/employee/activate')
def activate():
 p=data();raw=str(p.get('invite_token',''));contact=str(p.get('contact','')).strip().lower();password=str(p.get('password',''))
 if len(password)<8:return jsonify({'error':'Password must contain at least 8 characters.'}),400
 with transaction() as db:
  row=db.execute('SELECT * FROM employee_accounts WHERE invite_hash=?',(hashlib.sha256(raw.encode()).hexdigest(),)).fetchone()
  if not row or datetime.fromisoformat(row['invite_expires_at'])<now():return jsonify({'error':'Invitation is invalid or expired.'}),400
  if contact not in {str(row['email']).lower(),str(row['phone'] or '').lower()}:
   return jsonify({'error':'The phone number or email does not match this invitation.'}),400
  db.execute("UPDATE employee_accounts SET password_hash=?,pin_hash=NULL,status='ACTIVE',invite_hash=NULL,invite_expires_at=NULL,updated_at=? WHERE id=?",(generate_password_hash(password),stamp(),row['id']))
 return jsonify({'ok':True})

@employee_api.get('/api/employee/password-reset-captcha')
def employee_reset_captcha():
 alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
 answer=''.join(secrets.choice(alphabet) for _ in range(6))
 return jsonify({'captcha_code':answer,'captcha_id':reset_signer().dumps({'answer':answer})})

@employee_api.post('/api/employee/reset-password')
def employee_reset_password():
 p=data();email=str(p.get('email','')).strip().lower();password=str(p.get('password',''));answer=str(p.get('captcha_answer','')).strip().upper()
 if len(password)<8:return jsonify({'error':'Password must contain at least 8 characters.'}),400
 try:captcha=reset_signer().loads(str(p.get('captcha_id','')),max_age=600)
 except (BadSignature,SignatureExpired):return jsonify({'error':'The CAPTCHA is incorrect or expired. Generate a new code.'}),403
 if not secrets.compare_digest(str(captcha.get('answer','')),answer):return jsonify({'error':'The CAPTCHA is incorrect or expired. Generate a new code.'}),403
 with transaction() as db:
  row=db.execute('SELECT * FROM employee_accounts WHERE lower(email)=?',(email,)).fetchone()
  if not row:return jsonify({'error':'No employee account was found for this email.'}),404
  db.execute("UPDATE employee_accounts SET password_hash=?,status='ACTIVE',updated_at=? WHERE id=?",(generate_password_hash(password),stamp(),row['id']))
 return jsonify({'ok':True})

@employee_api.get('/api/employee/dashboard')
@require('EMPLOYEE')
def dashboard():
 db=connect()
 try:
  row=current(db)
  if not row:return jsonify({'error':'Employee account is not active.'}),403
  shift=db.execute('SELECT * FROM employee_shifts WHERE employee_account_id=? AND work_date=?',(row['id'],now().date().isoformat())).fetchone()
  history=db.execute('SELECT * FROM employee_shifts WHERE employee_account_id=? ORDER BY work_date DESC LIMIT 400',(row['id'],)).fetchall()
  return jsonify({
   'employee':public(row),
   'server_time':stamp(),
   'today':dict(shift) if shift else None,
   'next_action':'CHECK_OUT' if shift and shift['status']=='OPEN' else 'CHECK_IN',
   'history':[dict(x) for x in history],
   'verification_method':'FACE_CAPTURE',
   'biometric_ready':True,
  })
 finally:db.close()

@employee_api.patch('/api/employee/profile-photo')
@require('EMPLOYEE')
def profile_photo():
 photo=str(data().get('profile_photo',''))
 if not photo.startswith('data:image/') or len(photo)>1_500_000:
  return jsonify({'error':'Choose a valid profile photo smaller than 1.5 MB.'}),400
 with transaction() as db:
  row=current(db)
  if not row:return jsonify({'error':'Employee account is not active.'}),403
  db.execute('UPDATE employee_accounts SET profile_photo_data=?,updated_at=? WHERE id=?',(photo,stamp(),row['id']))
  audit(db,'PROFILE_PHOTO_UPDATED','employee_account',row['id'],{})
 return jsonify({'ok':True})

@employee_api.post('/api/employee/attendance')
@require('EMPLOYEE')
def attendance():
 p=data();key=request.headers.get('Idempotency-Key','').strip();device=str(p.get('device_identifier','')).strip()[:250];face=str(p.get('face_capture',''))
 if not key or not device:return jsonify({'error':'Idempotency key and device identifier are required.'}),400
 if not face.startswith('data:image/') or len(face)>1_500_000:return jsonify({'error':'Capture a current face photo before recording attendance.'}),400
 with transaction() as db:
  row=current(db)
  if not row:return jsonify({'error':'Employee account is not active.'}),403
  duplicate=db.execute('SELECT * FROM employee_attendance_events WHERE employee_account_id=? AND idempotency_key=?',(row['id'],key)).fetchone()
  if duplicate:return jsonify({'ok':True,'duplicate':True,'event':dict(duplicate)})
  date=now().date().isoformat();shift=db.execute('SELECT * FROM employee_shifts WHERE employee_account_id=? AND work_date=?',(row['id'],date)).fetchone();event_time=stamp()
  if shift and shift['status']=='COMPLETED':return jsonify({'error':'Today’s attendance is already completed.'}),409
  if not shift:
   action='CHECK_IN';sid=uuid4().hex;db.execute('INSERT INTO employee_shifts(id,employee_account_id,work_date,check_in_at,status) VALUES(?,?,?,?,?)',(sid,row['id'],date,event_time,'OPEN'))
  else:
   action='CHECK_OUT';sid=shift['id'];minutes=max(0,int((now()-datetime.fromisoformat(shift['check_in_at'])).total_seconds()//60));db.execute("UPDATE employee_shifts SET check_out_at=?,worked_minutes=?,status='COMPLETED' WHERE id=?",(event_time,minutes,sid))
  eid=uuid4().hex;db.execute('INSERT INTO employee_attendance_events(id,employee_account_id,shift_id,event_type,server_timestamp,verification_method,idempotency_key,device_identifier,face_capture_data) VALUES(?,?,?,?,?,?,?,?,?)',(eid,row['id'],sid,action,event_time,'FACE_CAPTURE',key,device,face));event=db.execute('SELECT * FROM employee_attendance_events WHERE id=?',(eid,)).fetchone()
 return jsonify({'ok':True,'event':dict(event)})

@employee_api.patch('/api/employee/account-controls')
@require('EMPLOYEE')
def account_controls():
 p=data();current_password=str(p.get('current_password',''));new_password=str(p.get('new_password',''));new_pin=str(p.get('new_pin',''))
 if not new_password and not new_pin:return jsonify({'error':'Enter a new password or a new attendance PIN.'}),400
 if new_password and len(new_password)<8:return jsonify({'error':'New password must contain at least 8 characters.'}),400
 if new_pin and not(new_pin.isdigit() and len(new_pin)==6):return jsonify({'error':'New PIN must contain exactly 6 digits.'}),400
 with transaction() as db:
  row=current(db)
  if not row:return jsonify({'error':'Employee account is not active.'}),403
  if not check_password_hash(row['password_hash'] or '',current_password):return jsonify({'error':'Current password is incorrect.'}),401
  password_hash=generate_password_hash(new_password) if new_password else row['password_hash']
  pin_hash=generate_password_hash(new_pin) if new_pin else row['pin_hash']
  db.execute('UPDATE employee_accounts SET password_hash=?,pin_hash=?,updated_at=? WHERE id=?',(password_hash,pin_hash,stamp(),row['id']))
  audit(db,'ACCOUNT_CONTROLS_UPDATED','employee_account',row['id'],{'password_changed':bool(new_password),'pin_changed':bool(new_pin)})
 return jsonify({'ok':True})

@employee_api.route('/api/admin/employee-accounts',methods=['GET','POST'])
@require('ADMIN','HR')
def accounts():
 tenant=g.employee_identity['tenant']
 with transaction() as db:
  if request.method=='GET':return jsonify({'employees':[public(x) for x in db.execute('SELECT * FROM employee_accounts WHERE tenant_email=? ORDER BY workforce_role,name',(tenant,)).fetchall()]})
  p=data();role=str(p.get('workforce_role','')).upper();email=str(p.get('email','')).strip().lower();eid=str(p.get('employee_id','')).strip();name=str(p.get('name','')).strip();phone=str(p.get('phone','')).strip();password=str(p.get('password',''));pin=str(p.get('pin',''))
  if role not in {'WORKER','STAFF','TEMPORARY'} or not name or not eid or '@' not in email:return jsonify({'error':'Name, employee ID, valid email, and workforce role are required.'}),400
  direct=bool(password or pin)
  if direct and len(password)<8:return jsonify({'error':'Employee password must contain at least 8 characters.'}),400
  if direct and not(pin.isdigit() and len(pin)==6):return jsonify({'error':'Attendance PIN must contain exactly 6 digits.'}),400
  raw=secrets.token_urlsafe(32);expires=(now()+timedelta(hours=48)).isoformat()
  existing=db.execute('SELECT * FROM employee_accounts WHERE tenant_email=? AND (lower(email)=? OR employee_id=?)',(tenant,email,eid)).fetchone()
  if existing:
   if existing['status']=='ACTIVE':return jsonify({'error':'That employee already has an active account.'}),409
   if str(existing['email']).lower()!=email or str(existing['employee_id'])!=eid:return jsonify({'error':'That employee ID or email belongs to another account.'}),409
   db.execute("UPDATE employee_accounts SET name=?,workforce_role=?,phone=?,status='INVITED',invite_hash=?,invite_expires_at=?,updated_at=? WHERE id=?",(name,role,phone,hashlib.sha256(raw.encode()).hexdigest(),expires,stamp(),existing['id']))
   audit(db,'EMPLOYEE_INVITATION_REGENERATED','employee_account',existing['id'],{'employee_id':eid,'role':role})
   return jsonify({'ok':True,'credentials_created':False,'invite_token':raw,'expires_at':expires,'regenerated':True}),200
  try:cur=db.execute('INSERT INTO employee_accounts(tenant_email,employee_id,name,email,workforce_role,phone,password_hash,pin_hash,status,invite_hash,invite_expires_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',(tenant,eid,name,email,role,phone,generate_password_hash(password) if direct else None,generate_password_hash(pin) if direct else None,'ACTIVE' if direct else 'INVITED',None if direct else hashlib.sha256(raw.encode()).hexdigest(),None if direct else expires,stamp(),stamp()))
  except Exception:return jsonify({'error':'That employee ID or email already has an account.'}),409
  audit(db,'EMPLOYEE_CREDENTIALS_CREATED' if direct else 'EMPLOYEE_INVITED','employee_account',cur.lastrowid,{'employee_id':eid,'role':role})
 return jsonify({'ok':True,'credentials_created':direct,'invite_token':None if direct else raw,'expires_at':None if direct else expires}),201

@employee_api.patch('/api/admin/employee-accounts/<int:account_id>')
@require('ADMIN','HR')
def account_status(account_id):
 p=data();status=str(p.get('status','')).upper();password=str(p.get('password',''));pin=str(p.get('pin',''))
 if password or pin:
  if len(password)<8:return jsonify({'error':'Employee password must contain at least 8 characters.'}),400
  if not(pin.isdigit() and len(pin)==6):return jsonify({'error':'Attendance PIN must contain exactly 6 digits.'}),400
  with transaction() as db:
   row=db.execute('SELECT * FROM employee_accounts WHERE id=? AND tenant_email=?',(account_id,g.employee_identity['tenant'])).fetchone()
   if not row:return jsonify({'error':'Employee account not found.'}),404
   db.execute("UPDATE employee_accounts SET password_hash=?,pin_hash=?,status='ACTIVE',invite_hash=NULL,invite_expires_at=NULL,updated_at=? WHERE id=?",(generate_password_hash(password),generate_password_hash(pin),stamp(),account_id));audit(db,'EMPLOYEE_CREDENTIALS_RESET','employee_account',account_id,{})
  return jsonify({'ok':True})
  if status not in {'ACTIVE','SUSPENDED'}:return jsonify({'error':'Status must be ACTIVE or SUSPENDED.'}),400
 with transaction() as db:
  row=db.execute('SELECT * FROM employee_accounts WHERE id=? AND tenant_email=?',(account_id,g.employee_identity['tenant'])).fetchone()
  if not row:return jsonify({'error':'Employee account not found.'}),404
  db.execute('UPDATE employee_accounts SET status=?,updated_at=? WHERE id=?',(status,stamp(),account_id));audit(db,'ACCOUNT_STATUS_CHANGED','employee_account',account_id,{'from':row['status'],'to':status,'reason':p.get('reason','')})
 return jsonify({'ok':True})

@employee_api.delete('/api/admin/employee-accounts/<int:account_id>')
@require('ADMIN','HR')
def remove_employee_access(account_id):
 tenant=g.employee_identity['tenant']
 with transaction() as db:
  row=db.execute('SELECT * FROM employee_accounts WHERE id=? AND tenant_email=?',(account_id,tenant)).fetchone()
  if not row:return jsonify({'error':'Employee account not found.'}),404
  shift_ids=[item['id'] for item in db.execute('SELECT id FROM employee_shifts WHERE employee_account_id=?',(account_id,)).fetchall()]
  db.execute('DELETE FROM employee_attendance_events WHERE employee_account_id=?',(account_id,))
  db.execute('DELETE FROM employee_shifts WHERE employee_account_id=?',(account_id,))
  db.execute("DELETE FROM employee_audit_log WHERE entity_type='employee_account' AND entity_id=?",(str(account_id),))
  for shift_id in shift_ids:db.execute("DELETE FROM employee_audit_log WHERE entity_type='employee_shift' AND entity_id=?",(shift_id,))
  db.execute('DELETE FROM employee_accounts WHERE id=?',(account_id,))
 return jsonify({'ok':True,'removed_employee_id':row['employee_id']})


@employee_api.get('/api/admin/employee-attendance')
@require('ADMIN','HR')
def employee_attendance():
 tenant=g.employee_identity['tenant']
 work_date=str(request.args.get('date','')).strip()
 query='''
  SELECT s.work_date,s.check_in_at,s.check_out_at,s.worked_minutes,s.status,
         EXISTS(SELECT 1 FROM employee_attendance_events e WHERE e.shift_id=s.id AND e.event_type='CHECK_IN' AND e.face_capture_data LIKE 'data:image/%') AS checkin_face_captured,
         EXISTS(SELECT 1 FROM employee_attendance_events e WHERE e.shift_id=s.id AND e.event_type='CHECK_OUT' AND e.face_capture_data LIKE 'data:image/%') AS checkout_face_captured,
         a.employee_id,a.name,a.email,a.workforce_role
  FROM employee_shifts s
  JOIN employee_accounts a ON a.id=s.employee_account_id
  WHERE a.tenant_email=?
 '''
 parameters=[tenant]
 if work_date:
  query+=' AND s.work_date=?'
  parameters.append(work_date)
 query+=' ORDER BY s.work_date DESC,a.workforce_role,a.name'
 db=connect()
 try:rows=db.execute(query,parameters).fetchall()
 finally:db.close()
 return jsonify({'attendance':[dict(row) for row in rows]})
