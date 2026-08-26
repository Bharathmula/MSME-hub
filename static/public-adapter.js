/* Public Streamlit transport for authentication requests. */
(function(){
const nativeFetch=window.fetch.bind(window),KEY='msme-public-auth-v1',OTP='msme-public-otp-v1';
const email=v=>String(v||'').trim().toLowerCase();
const list=()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v:[]}catch(_){return[]}};
const save=v=>localStorage.setItem(KEY,JSON.stringify(v));
const response=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json'}});
const body=o=>{try{return JSON.parse(o?.body||'{}')}catch(_){return{}}};
const hash=async v=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(v))))].map(x=>x.toString(16).padStart(2,'0')).join('');
const publicAccount=a=>({name:a.name||'',phone:a.phone||'',email:a.email,country:a.country||'',email_updates:!!a.email_updates,provider:a.provider||'email'});
const valid=e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const token=(e,p)=>btoa(`${p}|${e}|${Date.now()}`);
const tokenValid=(t,e,p)=>{try{const v=atob(t).split('|');return v[0]===p&&v[1]===e&&Date.now()-Number(v[2])<600000}catch(_){return false}};
window.fetch=async function(input,options={}){
 const raw=typeof input==='string'?input:input.url,path=raw.startsWith('/api/')?raw.split('?')[0]:'';if(!path)return nativeFetch(input,options);const p=body(options);
 if(path==='/api/auth/config')return response({google_client_id:'',email_delivery:'development'});
 if(path==='/api/auth/send-otp'){
  const e=email(p.email),purpose=p.purpose,a=list(),exists=a.some(x=>x.email===e);
  if(!valid(e)||!['register','reset','change_email'].includes(purpose))return response({error:'Enter a valid email and request type.'},400);
  if(purpose==='register'&&exists)return response({error:'An account with this email already exists.'},409);
  if(purpose==='reset'&&!exists)return response({error:'No account was found for this email.'},404);
  if(purpose==='change_email'&&exists)return response({error:'An account with this email already exists.'},409);
  const code=String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,'0');sessionStorage.setItem(OTP,JSON.stringify({e,purpose,code,expires:Date.now()+600000,attempts:0}));
  return response({ok:true,delivery:'development',dev_otp:code,message:'Use the verification code shown below.'});
 }
 if(path==='/api/auth/verify-otp'){
  let r;try{r=JSON.parse(sessionStorage.getItem(OTP)||'null')}catch(_){r=null}const e=email(p.email);
  if(!r||r.e!==e||r.purpose!==p.purpose||Date.now()>r.expires)return response({error:'The verification code has expired. Request a new code.'},400);
  if(++r.attempts>5){sessionStorage.removeItem(OTP);return response({error:'Too many incorrect attempts. Request a new code.'},429)}sessionStorage.setItem(OTP,JSON.stringify(r));
  if(String(p.otp||'').trim()!==r.code)return response({error:'Incorrect verification code.'},400);sessionStorage.removeItem(OTP);return response({ok:true,verification_token:token(e,p.purpose)});
 }
 if(path==='/api/auth/register'){
  const e=email(p.email),password=String(p.password||''),a=list();if(!tokenValid(p.verification_token,e,'register'))return response({error:'Verify this email before creating the account.'},403);
  if(password.length<8)return response({error:'Password must contain at least 8 characters.'},400);if(a.some(x=>x.email===e))return response({error:'An account with this email already exists.'},409);
  const account={name:String(p.name||e.split('@')[0]).trim(),phone:'',email:e,password_hash:await hash(password),country:p.country||'India',email_updates:!!p.email_updates,provider:'email'};a.push(account);save(a);return response({ok:true,account:publicAccount(account)});
 }
 if(path==='/api/auth/login'){
  const e=email(p.email),a=list(),account=a.find(x=>x.email===e);if(!account||account.password_hash!==await hash(p.password||''))return response({error:'Incorrect email or password. Create an account first if you have not registered.'},401);return response({ok:true,account:publicAccount(account)});
 }
 if(path==='/api/auth/reset-password'){
  const e=email(p.email),password=String(p.password||''),a=list(),account=a.find(x=>x.email===e);if(!account)return response({error:'No account was found for this email.'},404);
  if(!tokenValid(p.verification_token,e,'reset'))return response({error:'Verify this email before changing the password.'},403);if(password.length<8)return response({error:'Password must contain at least 8 characters.'},400);account.password_hash=await hash(password);save(a);return response({ok:true});
 }
 if(path==='/api/auth/update-admin'){
  const current=email(p.current_email),next=email(p.new_email),a=list(),account=a.find(x=>x.email===current);if(!account||account.password_hash!==await hash(p.current_password||''))return response({error:'Current password is incorrect.'},401);
  if(!valid(next))return response({error:'Enter a valid new administrator email address.'},400);if(next!==current&&!tokenValid(p.verification_token,next,'change_email'))return response({error:'Verify the new email before saving changes.'},403);
  account.name=String(p.name||account.name).trim();account.phone=String(p.phone||account.phone||'').trim();account.email=next;if(p.new_password)account.password_hash=await hash(p.new_password);save(a);return response({ok:true,account:publicAccount(account)});
 }
 if(path==='/api/auth/google')return response({error:'Google sign-up is not configured on this deployment.'},503);
 return response({error:'Unsupported public API request.'},404);
};
})();
