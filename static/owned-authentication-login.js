
/* ===== Source component: 32-msme-bs-owned-authentication.js ===== */
/* MSME-BS login design backed by this project's own authentication API. */
(function(){
const screen=document.querySelector('#login-screen');if(!screen)return;
screen.innerHTML=`<div class="login-art"><div class="os-logo">▥ &nbsp; MSME OS</div><div class="art-copy"><h2>MSME<br><i>MULTI SKILL</i><br><i>PLANNER</i></h2><span></span><p>A smart workforce management system for Indian MSMEs to plan, manage and optimize employee skills, attendance and efficiency.</p></div></div><div class="login-side"><div class="login-card"><p class="eyebrow">WELCOME BACK</p><h1>Welcome to your workspace</h1><p class="login-copy">Sign in or create a private MSME account.</p><div class="access-switch"><button data-access="workspace" class="active">Workspace</button><button data-access="worker">Worker / staff</button></div><div class="auth-tabs"><button data-tab="signin" class="active">Sign in</button><button data-tab="signup">Create profile</button></div><div id="owned-auth-panel"></div></div></div>`;
const panel=screen.querySelector('#owned-auth-panel'),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));let mode='workspace',tab='signin',captcha={},signup={};
function employeeInviteParams(){
 const params=new URLSearchParams();
 try{new URLSearchParams(window.parent.location.search||location.search).forEach((value,key)=>params.set(key,value))}catch(_){new URLSearchParams(location.search).forEach((value,key)=>params.set(key,value))}
 if(!params.get('employee_invite')&&window.MSME_EMPLOYEE_INVITE)params.set('employee_invite',window.MSME_EMPLOYEE_INVITE);
 if(!params.get('employee_email')&&window.MSME_EMPLOYEE_EMAIL)params.set('employee_email',window.MSME_EMPLOYEE_EMAIL);
 return params
}
async function request(path,options={}){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
  try{
    const r=await fetch(path,{...options,signal:controller.signal});let d={};
    try{d=await r.json()}catch(_){}
    if(!r.ok)throw Error(d.error||'Request failed.');
    if(d.access_token)sessionStorage.setItem('msme-admin-api-token',d.access_token);
    return d;
  }catch(error){
    if(error?.name==='AbortError')throw Error('Sign in timed out. Check that the MSME Hub server is running, then try again.');
    throw error;
  }finally{clearTimeout(timeout)}
}
async function employeeRequest(path,payload={},method='POST'){
  const base=String(window.MSME_EMPLOYEE_API_URL||'').replace(/\/$/,'');
  if(!base)throw Error('Employee access is not configured on this host.');
  const options={method,headers:{'Content-Type':'application/json'}};
  if(method!=='GET')options.body=JSON.stringify(payload);
  const response=await fetch(base+path,options);
  let result={};try{result=await response.json()}catch(_){}
  if(!response.ok)throw Error(result.error||'Employee request failed.');
  return result;
}
async function newCaptcha(){captcha=await request('/api/auth/captcha');const n=panel.querySelector('[data-captcha-code]');if(n)n.textContent=captcha.captcha_code}
function eye(){return `<button type="button" data-eye aria-label="Show password">◉</button>`}
function message(text,error=false){const n=panel.querySelector('[data-message]');if(n){n.textContent=text;n.className='auth-message '+(error?'error':'success')}}
async function enter(account,password=''){
  const email=String(account.email||'').toLowerCase();
  let a=tenantAccounts.find(x=>String(x.email).toLowerCase()===email);
  if(!a){
    a={...account,password};
    tenantAccounts.push(a);
  }else{
    Object.assign(a,account,password?{password}:{});
  }
  try{localStorage.setItem('msme-accounts',JSON.stringify(tenantAccounts))}catch(_){}
  admin=a;
  sessionStorage.setItem('msme-admin-auth',email);
  const savedView=sessionStorage.getItem('msme-active-view');
  const safeViews=['dashboard','reminders','temporary','workers','staff','entrepreneurs','coverage','attendance','payroll','training','contractors','exemployees','recycle'];
  view=safeViews.includes(savedView)?savedView:'dashboard';
  document.querySelector('#login-screen')?.classList.add('hidden');
  document.querySelector('#app-shell')?.classList.add('visible');
  await new Promise(resolve=>requestAnimationFrame(resolve));
  try{
    if(typeof loadTenant==='function')loadTenant(a);
    if(typeof refreshAdmin==='function')refreshAdmin();
    if(typeof render==='function')render();
  }catch(error){
    console.error('MSME dashboard startup failed',error);
    document.querySelector('#login-screen')?.classList.remove('hidden');
    document.querySelector('#app-shell')?.classList.remove('visible');
    throw Error(`Dashboard could not open: ${error?.message||'unknown browser error'}`);
  }
}
window.MSMEOwnedAuthEnter=enter;
function progress(step){return `<div class="onboarding-progress">${['Account','Company','Address','Administrator'].map((x,i)=>`<span class="${i===step?'active':''} ${i<step?'complete':''}"><b>${i+1}</b>${x}</span>`).join('')}</div>`}
function normalizeEmployeeInvitation(form){
 const input=form?.elements?.invite_token;
 if(!input)return;
 const entered=String(input.value||'').trim();
 if(!/^https?:\/\//i.test(entered))return;
 try{
  const invitation=new URL(entered);
  input.value=invitation.searchParams.get('employee_invite')||'';
  const email=invitation.searchParams.get('employee_email');
  if(email&&form.elements.contact)form.elements.contact.value=email;
 }catch(_){message('Enter a valid invitation link or token.',true)}
}
function bindEmployeeAccess(){
 bind();
 const login=panel.querySelector('#owned-employee-signin');
 if(login)login.onsubmit=async event=>{event.preventDefault();const button=login.querySelector('button[type="submit"]');button.disabled=true;button.textContent='Signing in…';try{const result=await employeeRequest('/api/employee/login',Object.fromEntries(new FormData(login)));sessionStorage.setItem('msme-employee-token',result.access_token);window.MSMEEmployeePortal?.open()}catch(error){message(error.message,true);button.disabled=false;button.textContent='Sign in'}};
 const activation=panel.querySelector('#owned-employee-activate');
 if(activation){
  activation.elements.invite_token.addEventListener('change',()=>normalizeEmployeeInvitation(activation));
  activation.elements.invite_token.addEventListener('paste',()=>setTimeout(()=>normalizeEmployeeInvitation(activation),0));
  activation.onsubmit=async event=>{event.preventDefault();normalizeEmployeeInvitation(activation);const fields=Object.fromEntries(new FormData(activation)),button=activation.querySelector('button[type="submit"]');if(!String(fields.contact||'').trim().toLowerCase().endsWith('@gmail.com'))return message('Enter the @gmail.com address used for this invitation.',true);button.disabled=true;button.textContent='Creating account…';try{const created=await employeeRequest('/api/employee/activate',fields);sessionStorage.setItem('msme-employee-token',created.access_token);alert('Account created successfully.');window.MSMEEmployeePortal?.open()}catch(error){message(error.message,true);button.disabled=false;button.textContent='Create account'}};
 }
}
function employeeForgotPassword(){
 let employeeCaptcha={};
 panel.innerHTML=`<form class="auth-form" id="owned-employee-reset"><button type="button" class="forgot" data-employee-forgot-back>← Back to sign in</button><h2>Reset employee password</h2><label>REGISTERED EMAIL<input type="email" name="email" required autocomplete="username"></label><label>NEW PASSWORD<span class="password-wrap"><input type="password" name="password" minlength="8" required autocomplete="new-password">${eye()}</span></label><label>CONFIRM PASSWORD<span class="password-wrap"><input type="password" name="confirm_password" minlength="8" required autocomplete="new-password">${eye()}</span></label><label>CAPTCHA<div class="captcha-box"><strong data-employee-captcha>Loading…</strong><button type="button" class="secondary" data-employee-captcha-refresh>↻ New code</button></div><input name="captcha_answer" maxlength="6" autocomplete="off" required placeholder="Enter the six-character code"></label><p data-message></p><button class="primary" type="submit">Reset password</button></form>`;
 bind();
 const loadEmployeeCaptcha=async()=>{try{employeeCaptcha=await employeeRequest('/api/employee/password-reset-captcha',{},'GET');panel.querySelector('[data-employee-captcha]').textContent=employeeCaptcha.captcha_code}catch(error){message(error.message,true)}};
 panel.querySelector('[data-employee-forgot-back]').onclick=()=>{tab='signin';show()};
 panel.querySelector('[data-employee-captcha-refresh]').onclick=loadEmployeeCaptcha;
 panel.querySelector('#owned-employee-reset').onsubmit=async event=>{event.preventDefault();const fields=Object.fromEntries(new FormData(event.currentTarget));if(fields.password!==fields.confirm_password)return message('Passwords do not match.',true);const button=event.currentTarget.querySelector('button[type="submit"]');button.disabled=true;button.textContent='Resetting…';try{await employeeRequest('/api/employee/reset-password',{email:fields.email,password:fields.password,captcha_answer:fields.captcha_answer,captcha_id:employeeCaptcha.captcha_id});tab='signin';show();message('Password reset successfully. Sign in with your new password.')}catch(error){message(error.message,true);button.disabled=false;button.textContent='Reset password';loadEmployeeCaptcha()}};
 loadEmployeeCaptcha();
}
function show(){
 if(mode==='worker'){
  if(tab==='signin')panel.innerHTML=`<form class="auth-form" id="owned-employee-signin"><h2>Employee / Staff sign in</h2><p>Workers, Staff and Temporary Workers use credentials issued by their administrator.</p><label>PHONE NUMBER / EMAIL<input name="email" type="text" required autocomplete="username" placeholder="Enter registered email"></label><label>PASSWORD<span class="password-wrap"><input name="password" type="password" required autocomplete="current-password">${eye()}</span></label><button class="forgot" type="button" data-employee-forgot>Forgot password?</button><p data-message></p><button class="primary" type="submit">Sign in</button></form>`;
  else {const query=employeeInviteParams();panel.innerHTML=`<form class="auth-form" id="owned-employee-activate"><h2>Create employee account</h2><p>Open the invitation link to fill this form automatically, or paste the copied invitation link/token manually below.</p><label>INVITATION LINK OR TOKEN<input name="invite_token" value="${esc(query.get('employee_invite')||'')}" required autocomplete="off" placeholder="Paste the complete invitation link or token"></label><label>GMAIL ADDRESS<input name="contact" type="email" value="${esc(query.get('employee_email')||'')}" required pattern="[^@\\s]+@gmail\\.com" placeholder="Enter the @gmail.com address on your invitation"></label><label>CREATE PASSWORD<span class="password-wrap"><input name="password" type="password" minlength="8" required>${eye()}</span></label><p data-message></p><button class="primary" type="submit">Create account</button></form>`;}
  bindEmployeeAccess();panel.querySelector('[data-employee-forgot]')?.addEventListener('click',employeeForgotPassword);return
 }
 if(tab==='signin'){const remembered=localStorage.getItem('msme-last-login-email')||'';panel.innerHTML=`<form class="auth-form" id="owned-signin"><label>EMAIL<input type="email" name="email" value="${esc(remembered)}" required autocomplete="username"></label><label>PASSWORD<span class="password-wrap"><input type="password" name="password" required autocomplete="current-password">${eye()}</span></label><button type="button" class="forgot" data-forgot>Forgot password?</button><p data-message></p><button type="button" class="primary" id="owned-signin-submit">Sign in</button></form>`;bind();return}
 signup={};panel.innerHTML=`<form class="auth-form" id="owned-signup">${progress(0)}<label>EMAIL<input type="email" name="email" required></label><label>CREATE PASSWORD<span class="password-wrap"><input type="password" name="password" minlength="8" required>${eye()}</span></label><label>CONFIRM PASSWORD<span class="password-wrap"><input type="password" name="confirm" minlength="8" required>${eye()}</span></label><label>CAPTCHA VERIFICATION<div class="captcha-box"><strong data-captcha-code>Loading…</strong><button type="button" class="secondary" data-refresh>↻ New code</button></div><input name="captcha_answer" maxlength="6" autocomplete="off" placeholder="Enter the six-character code" required></label><p data-message></p><button class="primary">Continue to company details</button></form>`;bind();newCaptcha().catch(e=>message(e.message,true));
}
function onboarding(step){let fields,title;if(step===1){title='Company details';fields=`<label class="full">COMPANY NAME<input name="company" value="${esc(signup.company)}" required></label><label>STAFF COUNT<input type="number" min="0" name="staff_count" value="${esc(signup.staff_count)}" required></label><label>BUSINESS CATEGORY<input name="business_category" value="${esc(signup.business_category)}" required></label>`}else if(step===2){title='Company address';fields=`<label>COUNTRY<input name="country" value="${esc(signup.country||'India')}" required></label><label>PINCODE<input name="pincode" value="${esc(signup.pincode)}" required></label><label>STATE<input name="state" value="${esc(signup.state)}" required></label><label>CITY<input name="city" value="${esc(signup.city)}" required></label>`}else{title='Administrator details';fields=`<label>YOUR NAME<input name="name" value="${esc(signup.name)}" required></label><label>EMAIL ID<input type="email" name="admin_email" value="${esc(signup.email)}" required></label><label>SELECT ROLE<select name="role"><option>Owner</option><option>Manager</option><option>HR / Admin</option></select></label><label>HOW DID YOU HEAR ABOUT US?<select name="heard_from"><option>Friend</option><option>Family</option><option>Facebook</option><option>Instagram</option><option>Other</option></select></label>`}panel.innerHTML=`<form class="auth-form onboarding-form">${progress(step)}<div class="onboarding-heading"><h2>${title}</h2><p>Complete your private MSME workspace information.</p></div><div class="onboarding-grid">${fields}</div><p data-message></p><div class="auth-actions"><button type="button" class="secondary" data-back>Back</button><button class="primary">${step===3?'Complete account setup':'Continue'}</button></div></form>`;bind();panel.querySelector('form').onsubmit=async e=>{e.preventDefault();Object.assign(signup,Object.fromEntries(new FormData(e.currentTarget)));if(step<3)return onboarding(step+1);signup.email=signup.admin_email||signup.email;signup.address=[signup.city,signup.state,signup.pincode].filter(Boolean).join(', ');try{const d=await request('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...signup,captcha_id:captcha.captcha_id})});localStorage.setItem('msme-last-login-email',signup.email);enter(d.account,signup.password)}catch(x){message(x.message,true)}}}
function reset(){panel.innerHTML=`<form class="auth-form"><button type="button" class="forgot" data-return>← Back to sign in</button><h2>Reset password</h2><label>EMAIL<input type="email" name="email" required></label><label>NEW PASSWORD<span class="password-wrap"><input type="password" name="password" minlength="8" required>${eye()}</span></label><label>CAPTCHA<div class="captcha-box"><strong data-captcha-code>Loading…</strong><button type="button" class="secondary" data-refresh>↻ New code</button></div><input name="captcha_answer" maxlength="6" required></label><p data-message></p><button class="primary">Change password</button></form>`;bind();newCaptcha();panel.querySelector('form').onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));try{await request('/api/auth/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...d,captcha_id:captcha.captcha_id})});tab='signin';show()}catch(x){message(x.message,true)}}}
function bind(){panel.querySelectorAll('[data-eye]').forEach(b=>b.onclick=()=>{const i=b.parentElement.querySelector('input');i.type=i.type==='password'?'text':'password';b.textContent=i.type==='password'?'◉':'◌'});panel.querySelector('[data-refresh]')?.addEventListener('click',()=>newCaptcha());panel.querySelector('[data-forgot]')?.addEventListener('click',reset);panel.querySelector('[data-return]')?.addEventListener('click',show);panel.querySelector('[data-open-worker]')?.addEventListener('click',()=>window.MSMEEmployeePortal?.open());panel.querySelector('[data-back]')?.addEventListener('click',()=>{if(panel.querySelector('.onboarding-progress .active b')?.textContent==='2')show();else onboarding(Number(panel.querySelector('.onboarding-progress .active b')?.textContent||2)-2)});const f=panel.querySelector('#owned-signin');if(f){f.onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(f)),button=f.querySelector('#owned-signin-submit');if(button?.disabled)return;if(button){button.disabled=true;button.textContent='Signing in…'}message('Checking your account…');try{const r=await request('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});localStorage.setItem('msme-last-login-email',d.email);await enter(r.account,d.password)}catch(x){message(x.message,true);if(button){button.disabled=false;button.textContent='Sign in'}}};f.querySelector('#owned-signin-submit')?.addEventListener('click',()=>f.requestSubmit());f.querySelectorAll('input').forEach(input=>input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();f.requestSubmit()}}))}const s=panel.querySelector('#owned-signup');if(s)s.onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(s));if(d.password!==d.confirm)return message('Passwords do not match.',true);signup=d;onboarding(1)}}
screen.querySelector('.access-switch').onclick=e=>{const b=e.target.closest('[data-access]');if(!b)return;mode=b.dataset.access;screen.querySelectorAll('[data-access]').forEach(x=>x.classList.toggle('active',x===b));show()};screen.querySelector('.auth-tabs').onclick=e=>{const b=e.target.closest('[data-tab]');if(!b)return;tab=b.dataset.tab;screen.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));show()};if(employeeInviteParams().get('employee_invite')){mode='worker';tab='signup';screen.querySelectorAll('[data-access]').forEach(x=>x.classList.toggle('active',x.dataset.access==='worker'));screen.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab==='signup'))}show();
document.addEventListener('click',event=>{const navigation=event.target.closest('[data-view]');if(navigation)sessionStorage.setItem('msme-active-view',navigation.dataset.view)});
const restoredEmail=sessionStorage.getItem('msme-admin-auth');
const restoredAccount=tenantAccounts.find(account=>String(account.email||'').toLowerCase()===String(restoredEmail||'').toLowerCase());
if(restoredAccount)setTimeout(()=>enter(restoredAccount),0);
window.addEventListener('msme-employee-session-expired',()=>{mode='worker';tab='signin';screen.querySelectorAll('[data-access]').forEach(x=>x.classList.toggle('active',x.dataset.access==='worker'));screen.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab==='signin'));document.querySelector('#app-shell')?.classList.remove('visible');screen.classList.remove('hidden');show();message('Your employee session expired. Sign in again.',true)});
})();
