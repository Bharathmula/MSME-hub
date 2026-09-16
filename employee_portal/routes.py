import hashlib,json,secrets
from datetime import datetime,timedelta,timezone
from urllib.parse import urlencode
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
def category_invite_signer():return URLSafeTimedSerializer(current_app.config['SECRET_KEY'],salt='msme-employee-category-invite-v1')
def public(row):
 columns=set(row.keys())
 fields=('id','employee_id','name','email','workforce_role','status','biometric_status','phone','profile_photo_data','tenant_email')
 return {key:row[key] for key in fields if key in columns}
def audit(db,action,kind,eid,details):
 i=g.employee_identity;db.execute('INSERT INTO employee_audit_log VALUES(?,?,?,?,?,?,?,?)',(uuid4().hex,i['email'],i['role'],action,kind,str(eid),json.dumps(details),stamp()))
def current(db):
 row=db.execute('SELECT * FROM employee_accounts WHERE id=?',(g.employee_identity.get('employee_account_id'),)).fetchone()
 return row if row and row['status']=='ACTIVE' and row['tenant_email']==g.employee_identity['tenant'] else None
def start_login_session(db,row):
 session_id=uuid4().hex;login_at=stamp()
 db.execute('INSERT INTO employee_login_sessions(id,employee_account_id,tenant_email,login_at,user_agent,created_at) VALUES(?,?,?,?,?,?)',(session_id,row['id'],row['tenant_email'],login_at,str(request.headers.get('User-Agent',''))[:500],login_at))
 return session_id,login_at
def shift_photos(db,shift_id):
 events=db.execute('SELECT event_type,face_capture_data FROM employee_attendance_events WHERE shift_id=? ORDER BY server_timestamp',(shift_id,)).fetchall()
 photos={item['event_type']:item['face_capture_data'] or '' for item in events}
 return photos.get('CHECK_IN',''),photos.get('CHECK_OUT','')

EMPLOYEE_EDITABLE_PROFILE_FIELDS={
 'name','phone','dob','gender','marital_status','aadhaar','qualification','hobbies','passion',
 'temporary_address','address','father_name','mother_name','father_occupation','mother_occupation',
 'father_birthday','mother_birthday','spouse_name','spouse_birthday','wedding_anniversary',
 'parents_anniversary','special_date','siblings_quantity','children_quantity','blood_group',
 'hospital','family_doctor','medical_history','languages','technical_skills','responsibilities',
 'emergency','driving_skill','driving_vehicle_type','driving_licence_number','skills'
}

def workspace_profile(db,row):
 stored=db.execute('SELECT workspace_json FROM tenant_workspaces WHERE tenant_email=?',(row['tenant_email'],)).fetchone()
 try:workspace=json.loads(stored['workspace_json']) if stored else {'account':{'email':row['tenant_email']},'storage':{},'schema_version':1}
 except (TypeError,json.JSONDecodeError):workspace={'account':{'email':row['tenant_email']},'storage':{},'schema_version':1}
 storage=workspace.setdefault('storage',{})
 preferred='temporary' if row['workforce_role']=='TEMPORARY' else 'people'
 for collection in (preferred,'people','temporary'):
  records=storage.get(collection)
  if not isinstance(records,list):continue
  for index,profile in enumerate(records):
   if not isinstance(profile,dict):continue
   if str(profile.get('id',''))==str(row['employee_id']) or str(profile.get('email','')).strip().lower()==str(row['email']).strip().lower():
    try:employee_saved=json.loads(row['profile_json'] or '{}')
    except (KeyError,TypeError,json.JSONDecodeError):employee_saved={}
    if isinstance(employee_saved,dict):profile.update(employee_saved)
    return workspace,collection,index,profile
 role='Temporary Worker' if row['workforce_role']=='TEMPORARY' else row['workforce_role'].title()
 profile={'id':row['employee_id'],'name':row['name'],'email':row['email'],'phone':row['phone'],'role':role,'skills':[]}
 try:employee_saved=json.loads(row['profile_json'] or '{}')
 except (KeyError,TypeError,json.JSONDecodeError):employee_saved={}
 if isinstance(employee_saved,dict):profile.update(employee_saved)
 records=storage.setdefault(preferred,[]);records.append(profile)
 return workspace,preferred,len(records)-1,profile

@employee_api.post('/api/employee/login')
def login():
 p=data();login_id=str(p.get('email','')).strip().lower();password=str(p.get('password',''))
 with transaction() as db:
  row=db.execute('SELECT * FROM employee_accounts WHERE lower(email)=? OR phone=?',(login_id,login_id)).fetchone()
  if not row or not row['password_hash'] or not check_password_hash(row['password_hash'],password):return jsonify({'error':'Incorrect employee email or password.'}),401
  if row['status']!='ACTIVE':return jsonify({'error':f"This account is {row['status'].lower()}."}),403
  session_id,login_at=start_login_session(db,row)
 return jsonify({'ok':True,'access_token':token(row['email'],'EMPLOYEE',row['tenant_email'],row['id'],session_id),'employee':public(row),'login_at':login_at})

@employee_api.post('/api/employee/activate')
def activate():
 p=data();raw=str(p.get('invite_token',''));contact=str(p.get('contact','')).strip().lower();password=str(p.get('password',''))
 if len(password)<8:return jsonify({'error':'Password must contain at least 8 characters.'}),400
 with transaction() as db:
  row=db.execute('SELECT * FROM employee_accounts WHERE invite_hash=?',(hashlib.sha256(raw.encode()).hexdigest(),)).fetchone()
  if row:
   issued_at=datetime.fromisoformat(row['updated_at'] or row['created_at'])
   effective_expiry=min(datetime.fromisoformat(row['invite_expires_at']),issued_at+timedelta(hours=24))
   if effective_expiry<now():return jsonify({'error':'Invitation is invalid or expired.'}),400
   if not contact.endswith('@gmail.com') or contact!=str(row['email']).lower():
    return jsonify({'error':'Enter the Gmail address used for this invitation.'}),400
   db.execute("UPDATE employee_accounts SET password_hash=?,pin_hash=NULL,status='ACTIVE',invite_hash=NULL,invite_expires_at=NULL,updated_at=? WHERE id=?",(generate_password_hash(password),stamp(),row['id']))
  else:
   try:category=category_invite_signer().loads(raw,max_age=86400)
   except (BadSignature,SignatureExpired):return jsonify({'error':'Invitation is invalid or expired.'}),400
   if not isinstance(category,dict):return jsonify({'error':'Invitation is invalid or expired.'}),400
   tenant=str(category.get('tenant','')).strip().lower();role=str(category.get('role','')).upper()
   if category.get('kind')!='employee-category' or role not in {'WORKER','STAFF','TEMPORARY'}:
    return jsonify({'error':'Invitation is invalid or expired.'}),400
   stored=db.execute('SELECT workspace_json FROM tenant_workspaces WHERE tenant_email=?',(tenant,)).fetchone()
   try:workspace=json.loads(stored['workspace_json']) if stored else {}
   except (TypeError,json.JSONDecodeError):workspace={}
   storage=workspace.get('storage',{}) if isinstance(workspace,dict) else {}
   records=storage.get('temporary' if role=='TEMPORARY' else 'people',[])
   expected_role='Temporary Worker' if role=='TEMPORARY' else role.title()
   profile=next((item for item in records if isinstance(item,dict) and str(item.get('email','')).strip().lower()==contact and (role=='TEMPORARY' or item.get('role')==expected_role)),None)
   if not contact.endswith('@gmail.com') or not profile:
    return jsonify({'error':f'This Gmail address is not registered in the {expected_role} category.'}),400
   eid=str(profile.get('id','')).strip();name=str(profile.get('name','')).strip();phone=str(profile.get('phone','')).strip()
   if not eid or not name:return jsonify({'error':'Your workforce profile is incomplete. Ask the administrator to add your name and employee ID.'}),400
   row=db.execute('SELECT * FROM employee_accounts WHERE tenant_email=? AND (lower(email)=? OR employee_id=?)',(tenant,contact,eid)).fetchone()
   if row and row['status']=='ACTIVE':return jsonify({'error':'Your account is already active. Use the Sign in tab.'}),409
   if row and row['status']=='SUSPENDED':return jsonify({'error':'This account is suspended. Contact your administrator.'}),403
   if row and (str(row['email']).lower()!=contact or str(row['employee_id'])!=eid):return jsonify({'error':'This email or employee ID belongs to another account.'}),409
   if row:
    db.execute("UPDATE employee_accounts SET name=?,email=?,workforce_role=?,phone=?,password_hash=?,pin_hash=NULL,status='ACTIVE',invite_hash=NULL,invite_expires_at=NULL,profile_json=?,updated_at=? WHERE id=?",(name,contact,role,phone,generate_password_hash(password),json.dumps(profile),stamp(),row['id']))
   else:
    db.execute('INSERT INTO employee_accounts(tenant_email,employee_id,name,email,workforce_role,phone,password_hash,pin_hash,status,invite_hash,invite_expires_at,profile_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',(tenant,eid,name,contact,role,phone,generate_password_hash(password),None,'ACTIVE',None,None,json.dumps(profile),stamp(),stamp()))
    row=db.execute('SELECT * FROM employee_accounts WHERE tenant_email=? AND employee_id=?',(tenant,eid)).fetchone()
  active=db.execute('SELECT * FROM employee_accounts WHERE id=?',(row['id'],)).fetchone()
  session_id,login_at=start_login_session(db,active)
 return jsonify({'ok':True,'access_token':token(active['email'],'EMPLOYEE',active['tenant_email'],active['id'],session_id),'employee':public(active),'login_at':login_at})

@employee_api.post('/api/employee/logout')
@require('EMPLOYEE')
def logout():
 session_id=str(g.employee_identity.get('session_id') or '')
 if session_id:
  with transaction() as db:
   db.execute('UPDATE employee_login_sessions SET logout_at=? WHERE id=? AND employee_account_id=? AND logout_at IS NULL',(stamp(),session_id,g.employee_identity.get('employee_account_id')))
 return jsonify({'ok':True,'logout_at':stamp()})

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
  history=db.execute('''SELECT s.*,
   EXISTS(SELECT 1 FROM employee_attendance_events e WHERE e.shift_id=s.id AND e.event_type='CHECK_IN' AND e.face_capture_data LIKE 'data:image/%%') AS checkin_face_captured,
   EXISTS(SELECT 1 FROM employee_attendance_events e WHERE e.shift_id=s.id AND e.event_type='CHECK_OUT' AND e.face_capture_data LIKE 'data:image/%%') AS checkout_face_captured
   FROM employee_shifts s WHERE s.employee_account_id=? ORDER BY s.work_date DESC LIMIT 400''',(row['id'],)).fetchall()
  sessions=db.execute('SELECT id,login_at,logout_at FROM employee_login_sessions WHERE employee_account_id=? ORDER BY login_at DESC LIMIT 50',(row['id'],)).fetchall()
  current_session=next((item for item in sessions if item['id']==g.employee_identity.get('session_id')),None)
  previous_logout=next((item['logout_at'] for item in sessions if item['logout_at']),None)
  _,_,_,profile=workspace_profile(db,row)
  return jsonify({
   'employee':public(row),
   'profile':profile,
   'server_time':stamp(),
   'today':dict(shift) if shift else None,
   'next_action':'CHECK_OUT' if shift and shift['status']=='OPEN' else 'CHECK_IN',
   'history':[dict(x) for x in history],
   'session':dict(current_session) if current_session else None,
   'last_logout_at':previous_logout,
   'login_history':[dict(item) for item in sessions],
   'verification_method':'FACE_CAPTURE',
   'biometric_ready':True,
  })
 finally:db.close()

@employee_api.patch('/api/employee/profile-details')
@require('EMPLOYEE')
def profile_details():
 p=data()
 with transaction() as db:
  row=current(db)
  if not row:return jsonify({'error':'Employee account is not active.'}),403
  workspace,collection,index,profile=workspace_profile(db,row)
  updates={}
  for key,value in p.items():
   if key in EMPLOYEE_EDITABLE_PROFILE_FIELDS or key.startswith('sibling_name_') or key.startswith('child_name_'):
    updates[key]=value
  if not updates:return jsonify({'error':'No editable personal details were provided.'}),400
  if 'skills' in updates:
   skills=updates['skills']
   updates['skills']=skills if isinstance(skills,list) else [item.strip() for item in str(skills).split(',') if item.strip()]
  for quantity_field,prefix in (('siblings_quantity','sibling_name_'),('children_quantity','child_name_')):
   if quantity_field not in updates:continue
   try:count=max(0,min(10,int(updates[quantity_field])))
   except (TypeError,ValueError):return jsonify({'error':f'{quantity_field.replace("_"," ").title()} must be between 0 and 10.'}),400
   updates[quantity_field]=str(count)
   for key in list(profile):
    if key.startswith(prefix) and key[len(prefix):].isdigit() and int(key[len(prefix):])>count:profile.pop(key,None)
  profile.update(updates)
  workspace['storage'][collection][index]=profile
  db.execute('''INSERT INTO tenant_workspaces(tenant_email,workspace_json,updated_at) VALUES(?,?,?)
   ON CONFLICT(tenant_email) DO UPDATE SET workspace_json=excluded.workspace_json,updated_at=excluded.updated_at''',(row['tenant_email'],json.dumps(workspace),stamp()))
  db.execute('UPDATE employee_accounts SET name=?,phone=?,profile_json=?,updated_at=? WHERE id=?',(str(profile.get('name') or row['name']),str(profile.get('phone') or row['phone']),json.dumps(profile),stamp(),row['id']))
  audit(db,'EMPLOYEE_PROFILE_UPDATED','employee_account',row['id'],{'fields':sorted(updates)})
 return jsonify({'ok':True,'profile':profile})

@employee_api.get('/api/employee/attendance-detail')
@require('EMPLOYEE')
def attendance_detail():
 work_date=str(request.args.get('date','')).strip()
 if not work_date:return jsonify({'error':'Attendance date is required.'}),400
 db=connect()
 try:
  row=current(db)
  if not row:return jsonify({'error':'Employee account is not active.'}),403
  shift=db.execute('SELECT * FROM employee_shifts WHERE employee_account_id=? AND work_date=?',(row['id'],work_date)).fetchone()
  if not shift:return jsonify({'date':work_date,'attendance':None,'check_in_photo':'','check_out_photo':''})
  check_in_photo,check_out_photo=shift_photos(db,shift['id'])
  return jsonify({'date':work_date,'attendance':dict(shift),'check_in_photo':check_in_photo,'check_out_photo':check_out_photo})
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
  if role not in {'WORKER','STAFF','TEMPORARY'} or not name or not eid or not email.endswith('@gmail.com'):return jsonify({'error':'Name, employee ID, a valid @gmail.com address, and workforce role are required.'}),400
  direct=bool(password or pin)
  if direct and len(password)<8:return jsonify({'error':'Employee password must contain at least 8 characters.'}),400
  if direct and not(pin.isdigit() and len(pin)==6):return jsonify({'error':'Attendance PIN must contain exactly 6 digits.'}),400
  raw=secrets.token_urlsafe(32);expires=(now()+timedelta(hours=24)).isoformat()
  existing=db.execute('SELECT * FROM employee_accounts WHERE tenant_email=? AND (lower(email)=? OR employee_id=?)',(tenant,email,eid)).fetchone()
  if existing:
   if existing['status']=='ACTIVE':return jsonify({'error':'That employee already has an active account.'}),409
   if str(existing['email']).lower()!=email or str(existing['employee_id'])!=eid:return jsonify({'error':'That employee ID or email belongs to another account.'}),409
   db.execute("UPDATE employee_accounts SET name=?,workforce_role=?,phone=?,status='INVITED',invite_hash=?,invite_expires_at=?,updated_at=? WHERE id=?",(name,role,phone,hashlib.sha256(raw.encode()).hexdigest(),expires,stamp(),existing['id']))
   audit(db,'EMPLOYEE_INVITATION_REGENERATED','employee_account',existing['id'],{'employee_id':eid,'role':role})
   return jsonify({'ok':True,'credentials_created':False,'invite_token':raw,'expires_at':expires,'regenerated':True}),200
  try:
   db.execute('INSERT INTO employee_accounts(tenant_email,employee_id,name,email,workforce_role,phone,password_hash,pin_hash,status,invite_hash,invite_expires_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',(tenant,eid,name,email,role,phone,generate_password_hash(password) if direct else None,generate_password_hash(pin) if direct else None,'ACTIVE' if direct else 'INVITED',None if direct else hashlib.sha256(raw.encode()).hexdigest(),None if direct else expires,stamp(),stamp()))
  except Exception:return jsonify({'error':'That employee ID or email already has an account.'}),409
  created=db.execute('SELECT id FROM employee_accounts WHERE tenant_email=? AND employee_id=?',(tenant,eid)).fetchone()
  audit(db,'EMPLOYEE_CREDENTIALS_CREATED' if direct else 'EMPLOYEE_INVITED','employee_account',created['id'],{'employee_id':eid,'role':role})
 return jsonify({'ok':True,'credentials_created':direct,'invite_token':None if direct else raw,'expires_at':None if direct else expires}),201

@employee_api.post('/api/admin/employee-invitations/category-link')
@require('ADMIN','HR')
def category_employee_invitation():
 p=data();role=str(p.get('workforce_role','')).upper();application_url=str(p.get('application_url','')).strip()
 if role not in {'WORKER','STAFF','TEMPORARY'}:return jsonify({'error':'Choose Workers, Staff or Temporary Workers.'}),400
 if not application_url.startswith(('https://','http://localhost:')):return jsonify({'error':'A valid application URL is required.'}),400
 tenant=g.employee_identity['tenant'];db=connect()
 try:
  stored=db.execute('SELECT workspace_json FROM tenant_workspaces WHERE tenant_email=?',(tenant,)).fetchone()
  workspace=json.loads(stored['workspace_json']) if stored else {}
 finally:db.close()
 storage=workspace.get('storage',{}) if isinstance(workspace,dict) else {}
 collection='temporary' if role=='TEMPORARY' else 'people'
 expected_role='Temporary Worker' if role=='TEMPORARY' else role.title()
 profiles=[item for item in storage.get(collection,[]) if isinstance(item,dict) and (role=='TEMPORARY' or item.get('role')==expected_role)]
 eligible=[item for item in profiles if str(item.get('email','')).strip().lower().endswith('@gmail.com') and str(item.get('id','')).strip() and str(item.get('name','')).strip()]
 if not eligible:return jsonify({'error':'No complete profiles with Gmail addresses are available in this category.'}),400
 invite_token=category_invite_signer().dumps({'kind':'employee-category','tenant':tenant,'role':role})
 base=application_url.split('?',1)[0].rstrip('/')+'/'
 invitation_url=base+'?'+urlencode({'employee_invite':invite_token})
 return jsonify({'ok':True,'role':role,'invitation_url':invitation_url,'recipient_count':len(eligible),'expires_in_hours':24})

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
          EXISTS(SELECT 1 FROM employee_attendance_events e WHERE e.shift_id=s.id AND e.event_type='CHECK_IN' AND e.face_capture_data LIKE 'data:image/%%') AS checkin_face_captured,
          EXISTS(SELECT 1 FROM employee_attendance_events e WHERE e.shift_id=s.id AND e.event_type='CHECK_OUT' AND e.face_capture_data LIKE 'data:image/%%') AS checkout_face_captured,
         (SELECT ls.login_at FROM employee_login_sessions ls WHERE ls.employee_account_id=a.id ORDER BY ls.login_at DESC LIMIT 1) AS portal_login_at,
         (SELECT ls.logout_at FROM employee_login_sessions ls WHERE ls.employee_account_id=a.id AND ls.logout_at IS NOT NULL ORDER BY ls.login_at DESC LIMIT 1) AS portal_logout_at,
         a.employee_id,a.name,a.email,a.workforce_role,a.profile_json
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
 attendance=[]
 for row in rows:
  item=dict(row)
  try:item['profile_details']=json.loads(item.pop('profile_json') or '{}')
  except (TypeError,json.JSONDecodeError):item['profile_details']={}
  attendance.append(item)
 return jsonify({'attendance':attendance})

@employee_api.get('/api/admin/employee-attendance-month')
@require('ADMIN','HR')
def employee_attendance_month():
 tenant=g.employee_identity['tenant'];employee_id=str(request.args.get('employee_id','')).strip();month=str(request.args.get('month','')).strip()
 if not employee_id or len(month)!=7:return jsonify({'error':'Employee ID and month are required.'}),400
 db=connect()
 try:
  account=db.execute('SELECT * FROM employee_accounts WHERE tenant_email=? AND employee_id=?',(tenant,employee_id)).fetchone()
  if not account:return jsonify({'error':'Employee attendance account was not found.'}),404
  shifts=db.execute('''SELECT s.*,
   EXISTS(SELECT 1 FROM employee_attendance_events e WHERE e.shift_id=s.id AND e.event_type='CHECK_IN' AND e.face_capture_data LIKE 'data:image/%%') AS checkin_face_captured,
   EXISTS(SELECT 1 FROM employee_attendance_events e WHERE e.shift_id=s.id AND e.event_type='CHECK_OUT' AND e.face_capture_data LIKE 'data:image/%%') AS checkout_face_captured
   FROM employee_shifts s WHERE s.employee_account_id=? AND s.work_date LIKE ? ORDER BY s.work_date''',(account['id'],month+'-%')).fetchall()
  return jsonify({'employee':public(account),'month':month,'attendance':[dict(item) for item in shifts]})
 finally:db.close()

@employee_api.get('/api/admin/employee-attendance-detail')
@require('ADMIN','HR')
def admin_employee_attendance_detail():
 tenant=g.employee_identity['tenant'];employee_id=str(request.args.get('employee_id','')).strip();work_date=str(request.args.get('date','')).strip()
 if not employee_id or not work_date:return jsonify({'error':'Employee ID and attendance date are required.'}),400
 db=connect()
 try:
  shift=db.execute('''SELECT s.* FROM employee_shifts s JOIN employee_accounts a ON a.id=s.employee_account_id
   WHERE a.tenant_email=? AND a.employee_id=? AND s.work_date=?''',(tenant,employee_id,work_date)).fetchone()
  if not shift:return jsonify({'date':work_date,'attendance':None,'check_in_photo':'','check_out_photo':''})
  check_in_photo,check_out_photo=shift_photos(db,shift['id'])
  return jsonify({'date':work_date,'attendance':dict(shift),'check_in_photo':check_in_photo,'check_out_photo':check_out_photo})
 finally:db.close()
