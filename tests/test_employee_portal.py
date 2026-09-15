import os,tempfile,unittest
from datetime import datetime,timezone
from pathlib import Path
TMP=tempfile.TemporaryDirectory();os.environ.pop('DATABASE_URL',None);os.environ['MSME_EMPLOYEE_DB']=str(Path(TMP.name)/'employees.db');os.environ['MSME_SECRET_KEY']='tests-only'
from backend import app
from employee_portal.security import token

class EmployeePortalTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  app.config['TESTING']=True;cls.c=app.test_client()
  with app.app_context():cls.admin=token('admin@example.com','ADMIN','admin@example.com')
 def headers(self,t,extra=None):return {'Authorization':'Bearer '+t,**(extra or {})}
 def test_health_reports_photo_api_schema(self):
  response=self.c.get('/api/health');self.assertEqual(response.status_code,200,response.text)
  self.assertTrue(response.json['attendance_photo_api']);self.assertGreaterEqual(response.json['schema_version'],7)
 def test_admin_account_is_saved_in_database(self):
  captcha=self.c.get('/api/auth/captcha').json
  registered=self.c.post('/api/auth/register',json={'email':'owner.persistence@example.com','password':'OwnerTest123!','name':'Database Owner','company':'Persistent Company','captcha_id':captcha['captcha_id'],'captcha_answer':captcha['captcha_code']})
  self.assertEqual(registered.status_code,200,registered.text)
  login=self.c.post('/api/auth/login',json={'email':'owner.persistence@example.com','password':'OwnerTest123!'})
  self.assertEqual(login.status_code,200,login.text)
  workspace=self.c.get('/api/workspace',headers=self.headers(login.json['access_token']))
  self.assertEqual(workspace.status_code,200,workspace.text);self.assertTrue(workspace.json['exists']);self.assertEqual(workspace.json['account']['company'],'Persistent Company')
 def test_workspace_is_persistent_and_company_isolated(self):
  payload={'account':{'email':'admin@example.com','company':'Test Company'},'storage':{'people':[{'id':'W-1','name':'Persisted Worker'}],'attendance':[{'date':'2026-09-15','records':[]}]}}
  saved=self.c.put('/api/workspace',json=payload,headers=self.headers(self.admin));self.assertEqual(saved.status_code,200,saved.text)
  loaded=self.c.get('/api/workspace?email=admin@example.com',headers=self.headers(self.admin));self.assertEqual(loaded.status_code,200,loaded.text);self.assertTrue(loaded.json['exists']);self.assertEqual(loaded.json['storage']['people'][0]['name'],'Persisted Worker')
  with app.app_context():other=token('other@example.com','ADMIN','other@example.com')
  forbidden=self.c.get('/api/workspace?email=admin@example.com',headers=self.headers(other));self.assertEqual(forbidden.status_code,403,forbidden.text)
 def test_account_activation_and_attendance(self):
  face='data:image/jpeg;base64,/9j/2Q=='
  r=self.c.post('/api/admin/employee-accounts',json={'name':'Test Worker','employee_id':'W-100','email':'worker100@gmail.com','phone':'9876543210','workforce_role':'WORKER'},headers=self.headers(self.admin));self.assertEqual(r.status_code,201,r.text)
  workspace={'account':{'email':'admin@example.com','company':'Test Company'},'storage':{'people':[{'id':'W-100','name':'Test Worker','email':'worker100@gmail.com','phone':'9876543210','role':'Worker','skills':['Assembly']}],'temporary':[],'attendance':[]}}
  self.assertEqual(self.c.put('/api/workspace',json=workspace,headers=self.headers(self.admin)).status_code,200)
  invite=r.json['invite_token'];activation=self.c.post('/api/employee/activate',json={'invite_token':invite,'contact':'worker100@gmail.com','password':'Testing123!'});self.assertEqual(activation.status_code,200);self.assertTrue(activation.json['access_token'])
  self.assertEqual(self.c.get('/api/employee/dashboard',headers=self.headers(activation.json['access_token'])).status_code,200)
  login=self.c.post('/api/employee/login',json={'email':'worker100@gmail.com','password':'Testing123!'});self.assertEqual(login.status_code,200);employee=login.json['access_token']
  session_dashboard=self.c.get('/api/employee/dashboard',headers=self.headers(employee));self.assertTrue(session_dashboard.json['session']['login_at'])
  self.assertEqual(session_dashboard.json['profile']['skills'],['Assembly'])
  profile=self.c.patch('/api/employee/profile-details',json={'phone':'9000011111','children_quantity':'2','child_name_1':'Asha','child_name_2':'Arun','skills':'Assembly, Welding'},headers=self.headers(employee));self.assertEqual(profile.status_code,200,profile.text);self.assertEqual(profile.json['profile']['child_name_2'],'Arun')
  saved_workspace=self.c.get('/api/workspace',headers=self.headers(self.admin));saved_person=saved_workspace.json['storage']['people'][0];self.assertEqual(saved_person['children_quantity'],'2');self.assertEqual(saved_person['phone'],'9000011111')
  phone_login=self.c.post('/api/employee/login',json={'email':'9000011111','password':'Testing123!'});self.assertEqual(phone_login.status_code,200,phone_login.text)
  self.assertEqual(self.c.get('/api/admin/employee-accounts',headers=self.headers(employee)).status_code,403)
  first=self.c.post('/api/employee/attendance',json={'device_identifier':'test','face_capture':face},headers=self.headers(employee,{'Idempotency-Key':'in'}));self.assertEqual(first.status_code,200,first.text);self.assertEqual(first.json['event']['event_type'],'CHECK_IN')
  retry=self.c.post('/api/employee/attendance',json={'device_identifier':'test','face_capture':face},headers=self.headers(employee,{'Idempotency-Key':'in'}));self.assertTrue(retry.json['duplicate'])
  out=self.c.post('/api/employee/attendance',json={'device_identifier':'test','face_capture':face},headers=self.headers(employee,{'Idempotency-Key':'out'}));self.assertEqual(out.json['event']['event_type'],'CHECK_OUT')
  detail=self.c.get('/api/employee/attendance-detail',query_string={'date':datetime.now(timezone.utc).date().isoformat()},headers=self.headers(employee));self.assertEqual(detail.status_code,200,detail.text);self.assertEqual(detail.json['check_in_photo'],face);self.assertEqual(detail.json['check_out_photo'],face)
  admin_attendance=self.c.get('/api/admin/employee-attendance',headers=self.headers(self.admin));self.assertEqual(admin_attendance.status_code,200,admin_attendance.text);self.assertEqual(admin_attendance.json['attendance'][0]['employee_id'],'W-100')
  self.assertEqual(admin_attendance.json['attendance'][0]['profile_details']['child_name_2'],'Arun')
  self.assertEqual(admin_attendance.json['attendance'][0]['email'],'worker100@gmail.com')
  self.assertEqual(admin_attendance.json['attendance'][0]['checkin_face_captured'],1);self.assertEqual(admin_attendance.json['attendance'][0]['checkout_face_captured'],1)
  month=datetime.now(timezone.utc).strftime('%Y-%m')
  admin_month=self.c.get('/api/admin/employee-attendance-month',query_string={'employee_id':'W-100','month':month},headers=self.headers(self.admin));self.assertEqual(admin_month.status_code,200,admin_month.text);self.assertEqual(len(admin_month.json['attendance']),1)
  admin_detail=self.c.get('/api/admin/employee-attendance-detail',query_string={'employee_id':'W-100','date':datetime.now(timezone.utc).date().isoformat()},headers=self.headers(self.admin));self.assertEqual(admin_detail.status_code,200,admin_detail.text);self.assertEqual(admin_detail.json['check_in_photo'],face);self.assertEqual(admin_detail.json['check_out_photo'],face)
  photo=self.c.patch('/api/employee/profile-photo',json={'profile_photo':face},headers=self.headers(employee));self.assertEqual(photo.status_code,200,photo.text)
  dash=self.c.get('/api/employee/dashboard',headers=self.headers(employee));self.assertEqual(dash.json['today']['status'],'COMPLETED');self.assertEqual(dash.json['employee']['employee_id'],'W-100')
  self.assertEqual(dash.json['employee']['phone'],'9000011111');self.assertTrue(dash.json['employee']['profile_photo_data'].startswith('data:image/'))
  controls=self.c.patch('/api/employee/account-controls',json={'current_password':'Testing123!','new_password':'Changed123!','new_pin':'654321'},headers=self.headers(employee));self.assertEqual(controls.status_code,200,controls.text)
  self.assertEqual(self.c.post('/api/employee/login',json={'email':'worker100@gmail.com','password':'Testing123!'}).status_code,401)
  self.assertEqual(self.c.post('/api/employee/login',json={'email':'worker100@gmail.com','password':'Changed123!'}).status_code,200)
  captcha=self.c.get('/api/employee/password-reset-captcha');self.assertEqual(captcha.status_code,200,captcha.text)
  reset=self.c.post('/api/employee/reset-password',json={'email':'worker100@gmail.com','password':'Reset123!','captcha_id':captcha.json['captcha_id'],'captcha_answer':captcha.json['captcha_code']});self.assertEqual(reset.status_code,200,reset.text)
  self.assertEqual(self.c.post('/api/employee/login',json={'email':'worker100@gmail.com','password':'Reset123!'}).status_code,200)
  logout=self.c.post('/api/employee/logout',headers=self.headers(employee));self.assertEqual(logout.status_code,200,logout.text)
  after_logout=self.c.get('/api/employee/dashboard',headers=self.headers(employee));self.assertTrue(after_logout.json['last_logout_at'])

 def test_admin_can_create_active_employee_credentials(self):
  response=self.c.post('/api/admin/employee-accounts',json={'name':'Direct Staff','employee_id':'ST-DIRECT','email':'direct.staff@gmail.com','phone':'9000000001','workforce_role':'STAFF','password':'Direct123!','pin':'456789'},headers=self.headers(self.admin))
  self.assertEqual(response.status_code,201,response.text);self.assertTrue(response.json['credentials_created'])
  login=self.c.post('/api/employee/login',json={'email':'direct.staff@gmail.com','password':'Direct123!'})
  self.assertEqual(login.status_code,200,login.text);self.assertEqual(login.json['employee']['workforce_role'],'STAFF')
  accounts=self.c.get('/api/admin/employee-accounts',headers=self.headers(self.admin)).json['employees'];account_id=next(item['id'] for item in accounts if item['email']=='direct.staff@gmail.com')
  removed=self.c.delete(f'/api/admin/employee-accounts/{account_id}',headers=self.headers(self.admin));self.assertEqual(removed.status_code,200,removed.text)
  self.assertEqual(self.c.post('/api/employee/login',json={'email':'direct.staff@gmail.com','password':'Direct123!'}).status_code,401)

 def test_employee_password_reset_captcha_is_required(self):
  captcha=self.c.get('/api/employee/password-reset-captcha');self.assertEqual(captcha.status_code,200,captcha.text);self.assertEqual(len(captcha.json['captcha_code']),6)
  rejected=self.c.post('/api/employee/reset-password',json={'email':'worker100@gmail.com','password':'Another123!','captcha_id':captcha.json['captcha_id'],'captcha_answer':'WRONG1'})
  self.assertEqual(rejected.status_code,403,rejected.text)

 def test_admin_can_regenerate_pending_invitation(self):
  payload={'name':'Pending Worker','employee_id':'W-PENDING','email':'pending@gmail.com','workforce_role':'WORKER'}
  first=self.c.post('/api/admin/employee-accounts',json=payload,headers=self.headers(self.admin));self.assertEqual(first.status_code,201,first.text)
  remaining=(datetime.fromisoformat(first.json['expires_at'])-datetime.now(timezone.utc)).total_seconds();self.assertGreater(remaining,23*3600);self.assertLessEqual(remaining,24*3600)
  second=self.c.post('/api/admin/employee-accounts',json=payload,headers=self.headers(self.admin));self.assertEqual(second.status_code,200,second.text);self.assertTrue(second.json['regenerated'])
  self.assertNotEqual(first.json['invite_token'],second.json['invite_token'])
  old_activation=self.c.post('/api/employee/activate',json={'invite_token':first.json['invite_token'],'contact':'pending@gmail.com','password':'Testing123!','pin':'123456'})
  self.assertEqual(old_activation.status_code,400)
  new_activation=self.c.post('/api/employee/activate',json={'invite_token':second.json['invite_token'],'contact':'pending@gmail.com','password':'Testing123!'})
  self.assertEqual(new_activation.status_code,200,new_activation.text)

if __name__=='__main__':unittest.main()
