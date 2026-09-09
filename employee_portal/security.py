from functools import wraps
from flask import current_app,g,jsonify,request
from itsdangerous import BadSignature,SignatureExpired,URLSafeTimedSerializer

def signer(): return URLSafeTimedSerializer(current_app.config['SECRET_KEY'],salt='msme-employee-access-v1')
def token(email,role,tenant,employee_account_id=None): return signer().dumps({'email':email.lower(),'role':role,'tenant':tenant.lower(),'employee_account_id':employee_account_id})
def require(*roles):
 def decorate(fn):
  @wraps(fn)
  def guarded(*a,**kw):
   header=request.headers.get('Authorization','')
   try: identity=signer().loads(header[7:] if header.startswith('Bearer ') else '',max_age=28800)
   except (BadSignature,SignatureExpired): return jsonify({'error':'Sign in is required or the session expired.'}),401
   if identity.get('role') not in roles:return jsonify({'error':'You do not have permission for this action.'}),403
   g.employee_identity=identity;return fn(*a,**kw)
  return guarded
 return decorate
