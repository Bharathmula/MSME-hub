import os,tempfile,unittest
from pathlib import Path
TMP=tempfile.TemporaryDirectory();os.environ['MSME_EMPLOYEE_DB']=str(Path(TMP.name)/'employees.db');os.environ['MSME_SECRET_KEY']='tests-only'
from backend import app
from employee_portal.security import token

class EmployeePortalTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  app.config['TESTING']=True;cls.c=app.test_client()
  with app.app_context():cls.admin=token('admin@example.com','ADMIN','admin@example.com')
 def headers(self,t,extra=None):return {'Authorization':'Bearer '+t,**(extra or {})}
 def test_account_activation_and_attendance(self):
  face='data:image/jpeg;base64,/9j/2Q=='
  r=self.c.post('/api/admin/employee-accounts',json={'name':'Test Worker','employee_id':'W-100','email':'worker100@example.com','phone':'9876543210','workforce_role':'WORKER'},headers=self.headers(self.admin));self.assertEqual(r.status_code,201,r.text)
  invite=r.json['invite_token'];self.assertEqual(self.c.post('/api/employee/activate',json={'invite_token':invite,'contact':'worker100@example.com','password':'Testing123!'}).status_code,200)
  login=self.c.post('/api/employee/login',json={'email':'worker100@example.com','password':'Testing123!'});self.assertEqual(login.status_code,200);employee=login.json['access_token']
  phone_login=self.c.post('/api/employee/login',json={'email':'9876543210','password':'Testing123!'});self.assertEqual(phone_login.status_code,200,phone_login.text)
  self.assertEqual(self.c.get('/api/admin/employee-accounts',headers=self.headers(employee)).status_code,403)
  first=self.c.post('/api/employee/attendance',json={'device_identifier':'test','face_capture':face},headers=self.headers(employee,{'Idempotency-Key':'in'}));self.assertEqual(first.status_code,200,first.text);self.assertEqual(first.json['event']['event_type'],'CHECK_IN')
  retry=self.c.post('/api/employee/attendance',json={'device_identifier':'test','face_capture':face},headers=self.headers(employee,{'Idempotency-Key':'in'}));self.assertTrue(retry.json['duplicate'])
  out=self.c.post('/api/employee/attendance',json={'device_identifier':'test','face_capture':face},headers=self.headers(employee,{'Idempotency-Key':'out'}));self.assertEqual(out.json['event']['event_type'],'CHECK_OUT')
  admin_attendance=self.c.get('/api/admin/employee-attendance',headers=self.headers(self.admin));self.assertEqual(admin_attendance.status_code,200,admin_attendance.text);self.assertEqual(admin_attendance.json['attendance'][0]['employee_id'],'W-100')
  self.assertEqual(admin_attendance.json['attendance'][0]['email'],'worker100@example.com')
  self.assertEqual(admin_attendance.json['attendance'][0]['checkin_face_captured'],1);self.assertEqual(admin_attendance.json['attendance'][0]['checkout_face_captured'],1)
  photo=self.c.patch('/api/employee/profile-photo',json={'profile_photo':face},headers=self.headers(employee));self.assertEqual(photo.status_code,200,photo.text)
  dash=self.c.get('/api/employee/dashboard',headers=self.headers(employee));self.assertEqual(dash.json['today']['status'],'COMPLETED');self.assertEqual(dash.json['employee']['employee_id'],'W-100')
  self.assertEqual(dash.json['employee']['phone'],'9876543210');self.assertTrue(dash.json['employee']['profile_photo_data'].startswith('data:image/'))
  controls=self.c.patch('/api/employee/account-controls',json={'current_password':'Testing123!','new_password':'Changed123!','new_pin':'654321'},headers=self.headers(employee));self.assertEqual(controls.status_code,200,controls.text)
  self.assertEqual(self.c.post('/api/employee/login',json={'email':'worker100@example.com','password':'Testing123!'}).status_code,401)
  self.assertEqual(self.c.post('/api/employee/login',json={'email':'worker100@example.com','password':'Changed123!'}).status_code,200)
  captcha=self.c.get('/api/employee/password-reset-captcha');self.assertEqual(captcha.status_code,200,captcha.text)
  reset=self.c.post('/api/employee/reset-password',json={'email':'worker100@example.com','password':'Reset123!','captcha_id':captcha.json['captcha_id'],'captcha_answer':captcha.json['captcha_code']});self.assertEqual(reset.status_code,200,reset.text)
  self.assertEqual(self.c.post('/api/employee/login',json={'email':'worker100@example.com','password':'Reset123!'}).status_code,200)

 def test_admin_can_create_active_employee_credentials(self):
  response=self.c.post('/api/admin/employee-accounts',json={'name':'Direct Staff','employee_id':'ST-DIRECT','email':'direct.staff@example.com','phone':'9000000001','workforce_role':'STAFF','password':'Direct123!','pin':'456789'},headers=self.headers(self.admin))
  self.assertEqual(response.status_code,201,response.text);self.assertTrue(response.json['credentials_created'])
  login=self.c.post('/api/employee/login',json={'email':'direct.staff@example.com','password':'Direct123!'})
  self.assertEqual(login.status_code,200,login.text);self.assertEqual(login.json['employee']['workforce_role'],'STAFF')
  accounts=self.c.get('/api/admin/employee-accounts',headers=self.headers(self.admin)).json['employees'];account_id=next(item['id'] for item in accounts if item['email']=='direct.staff@example.com')
  removed=self.c.delete(f'/api/admin/employee-accounts/{account_id}',headers=self.headers(self.admin));self.assertEqual(removed.status_code,200,removed.text)
  self.assertEqual(self.c.post('/api/employee/login',json={'email':'direct.staff@example.com','password':'Direct123!'}).status_code,401)

 def test_employee_password_reset_captcha_is_required(self):
  captcha=self.c.get('/api/employee/password-reset-captcha');self.assertEqual(captcha.status_code,200,captcha.text);self.assertEqual(len(captcha.json['captcha_code']),6)
  rejected=self.c.post('/api/employee/reset-password',json={'email':'worker100@example.com','password':'Another123!','captcha_id':captcha.json['captcha_id'],'captcha_answer':'WRONG1'})
  self.assertEqual(rejected.status_code,403,rejected.text)

 def test_admin_can_regenerate_pending_invitation(self):
  payload={'name':'Pending Worker','employee_id':'W-PENDING','email':'pending@example.com','workforce_role':'WORKER'}
  first=self.c.post('/api/admin/employee-accounts',json=payload,headers=self.headers(self.admin));self.assertEqual(first.status_code,201,first.text)
  second=self.c.post('/api/admin/employee-accounts',json=payload,headers=self.headers(self.admin));self.assertEqual(second.status_code,200,second.text);self.assertTrue(second.json['regenerated'])
  self.assertNotEqual(first.json['invite_token'],second.json['invite_token'])
  old_activation=self.c.post('/api/employee/activate',json={'invite_token':first.json['invite_token'],'contact':'pending@example.com','password':'Testing123!','pin':'123456'})
  self.assertEqual(old_activation.status_code,400)
  new_activation=self.c.post('/api/employee/activate',json={'invite_token':second.json['invite_token'],'contact':'pending@example.com','password':'Testing123!'})
  self.assertEqual(new_activation.status_code,200,new_activation.text)

if __name__=='__main__':unittest.main()
