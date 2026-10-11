
/* ===== Source component: 32-msme-bs-owned-authentication.js ===== */
/* MSME-BS login design backed by this project's own authentication API. */
(function(){
const screen=document.querySelector('#login-screen');if(!screen)return;
const landing=document.createElement('section');
landing.className='msme-landing';
landing.innerHTML=`<div class="landing-copy"><div class="landing-header"><div class="landing-logo"><svg viewBox="0 0 120 76" role="img" aria-label="MSME M logo"><path d="M12 61 35 15"/><path d="M35 15 59 61"/><path d="M59 61 83 15"/><path d="M83 15 108 61"/></svg><span><b>MSME</b><small>Track · Manage · Grow</small></span></div><button type="button" class="landing-login">Login</button></div><div class="landing-title"><h1><span>MSME</span><i>MULTI SKILL</i><i>PLANNER</i></h1><em></em><p>A smart workforce management system for Indian MSMEs to plan, manage and optimize employee skills, attendance and efficiency.</p></div><button type="button" class="landing-enter">Create Your Workspace <span>→</span></button><p class="landing-assurance">✓ Secure company workspace • Your company data stays private</p><div class="landing-benefits"><span><b>♙</b>Manage<br>Workforce</span><span><b>▥</b>Track<br>Attendance</span><span><b>⚙</b>Grow<br>Together</span></div></div><p class="landing-progress">PEOPLE&nbsp;&nbsp; | &nbsp;&nbsp;PRODUCTIVITY&nbsp;&nbsp; | &nbsp;&nbsp;PROGRESS</p><div class="landing-visual" aria-hidden="true"><div class="landing-sync">● REAL-TIME SYNC</div><div class="landing-glass landing-people">♟♟</div><div class="landing-glass landing-calendar">▦</div><div class="landing-glass landing-chart">↗<i></i><i></i><i></i><i></i></div><div class="landing-glass landing-check">✓</div><div class="landing-desk"></div><div class="landing-laptop"><div><svg viewBox="0 0 120 76"><path d="M12 61 35 15"/><path d="M35 15 59 61"/><path d="M59 61 83 15"/><path d="M83 15 108 61"/></svg></div><i></i></div><div class="landing-pot"><i></i><i></i><i></i><b></b></div><div class="landing-mug">Ideas<br>Build<br>Business</div><div class="landing-tag">PEOPLE &nbsp; | &nbsp; PRODUCTIVITY &nbsp; | &nbsp; PROGRESS</div></div>`;
screen.parentNode.insertBefore(landing,screen);
landing.querySelector('.landing-login').textContent='Go to Workspace';
const landingActions=document.createElement('div');
landingActions.className='landing-actions';
const landingTrialButton=landing.querySelector('.landing-enter');
landingTrialButton.parentNode.insertBefore(landingActions,landingTrialButton);
landingActions.append(landing.querySelector('.landing-login'),landingTrialButton);
const inviteOnArrival=Boolean(window.MSME_EMPLOYEE_INVITE||new URLSearchParams(location.search).get('employee_invite'));
const returningSession=Boolean(sessionStorage.getItem('msme-admin-auth')||sessionStorage.getItem('msme-employee-token'));
let sessionRestoreOverlay=null;
if(!inviteOnArrival&&!returningSession){
 screen.classList.add('entry-hidden');
}else{
 landing.classList.add('hidden');
 if(returningSession&&!inviteOnArrival){
  screen.classList.add('entry-hidden');
  sessionRestoreOverlay=document.createElement('div');
  sessionRestoreOverlay.className='session-restore-overlay';
  sessionRestoreOverlay.innerHTML='<div class="session-restore-card"><span></span><b>Opening your workspace…</b><small>Restoring your secure session</small></div>';
  document.body.appendChild(sessionRestoreOverlay);
 }else screen.classList.remove('entry-hidden');
}
function openLandingAuth(nextTab){landing.classList.add('hidden');screen.classList.remove('entry-hidden');mode='workspace';tab=nextTab;screen.querySelectorAll('[data-access]').forEach(x=>x.classList.toggle('active',x.dataset.access==='workspace'));screen.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab===nextTab));show()}
landing.querySelector('.landing-enter').addEventListener('click',()=>openLandingAuth('signup'));
landing.querySelector('.landing-login').addEventListener('click',()=>openLandingAuth('signin'));
screen.innerHTML=`<button type="button" class="back-to-workspace">← Back to Workspace</button><div class="login-art"><div class="os-logo"><svg class="msme-mark" viewBox="0 0 120 76" role="img" aria-label="MSME M logo"><defs><linearGradient id="msme-pink" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff49cf"/><stop offset=".58" stop-color="#d22df0"/><stop offset="1" stop-color="#6848ff"/></linearGradient><linearGradient id="msme-fold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5b2be5"/><stop offset=".52" stop-color="#253eea"/><stop offset="1" stop-color="#087fff"/></linearGradient><linearGradient id="msme-cyan" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#18d4e8"/><stop offset=".52" stop-color="#0a9ef2"/><stop offset="1" stop-color="#4350ff"/></linearGradient><linearGradient id="msme-blue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#165df7"/><stop offset="1" stop-color="#4f3dff"/></linearGradient></defs><path d="M12 61 35 15" fill="none" stroke="url(#msme-pink)" stroke-width="19" stroke-linecap="round"/><path d="M35 15 59 61" fill="none" stroke="url(#msme-fold)" stroke-width="19" stroke-linecap="round"/><path d="M59 61 83 15" fill="none" stroke="url(#msme-cyan)" stroke-width="19" stroke-linecap="round"/><path d="M83 15 108 61" fill="none" stroke="url(#msme-blue)" stroke-width="19" stroke-linecap="round"/></svg><span class="msme-logo-copy"><b>MSME</b><small>Track · Manage · Grow</small></span></div><div class="art-copy"><h2>MSME<br><i>MULTI SKILL</i><br><i>PLANNER</i></h2><span></span><p>A smart workforce management system for Indian MSMEs to plan, manage and optimize employee skills, attendance and efficiency.</p></div><div class="login-benefits"><span><b>♙</b>Manage<br>Workforce</span><span><b>◷</b>Track<br>Attendance</span><span><b>✦</b>Grow<br>Together</span></div></div><div class="login-side"><div class="login-card"><button type="button" class="back-to-signin" hidden>← Back to Sign In</button><p class="eyebrow">WELCOME BACK</p><h1>Welcome to your workspace</h1><p class="login-copy">Sign in or create a private MSME account.</p><div class="access-switch"><button data-access="workspace" class="active">Workspace - Admin</button><button data-access="worker">Workspace - E / S / W / TW</button></div><div id="owned-auth-panel"></div><div class="auth-tabs"><button data-tab="signin" class="active">← Back to sign in</button><button data-tab="signup">Create profile</button></div></div><div class="login-scene" aria-hidden="true"><div class="scene-user">●</div><div class="scene-checklist"><i></i><i></i><i></i></div><div class="scene-plant"><i></i><i></i><i></i><b></b></div><div class="scene-shelf"><span></span><span></span><span></span></div><div class="scene-laptop"><div class="laptop-screen"><svg viewBox="0 0 120 76"><path d="M12 61 35 15"/><path d="M35 15 59 61"/><path d="M59 61 83 15"/><path d="M83 15 108 61"/></svg></div><div class="laptop-base"></div></div><div class="scene-plaque">SKILLS<br>PEOPLE<br>GROWTH</div></div></div>`;
function applyRibbonMark(svg,prefix){
 if(!svg)return;
 const namespace='http://www.w3.org/2000/svg',defs=document.createElementNS(namespace,'defs');
 defs.innerHTML=`<linearGradient id="${prefix}-pink" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#9b45ff"/><stop offset=".55" stop-color="#dd3df1"/><stop offset="1" stop-color="#ff63e4"/></linearGradient><linearGradient id="${prefix}-violet" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d949ee"/><stop offset=".52" stop-color="#713cf0"/><stop offset="1" stop-color="#3c45f4"/></linearGradient><linearGradient id="${prefix}-cyan" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#149fe9"/><stop offset=".52" stop-color="#18c9ed"/><stop offset="1" stop-color="#24d7ef"/></linearGradient><linearGradient id="${prefix}-blue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#15c5ec"/><stop offset=".5" stop-color="#246cf3"/><stop offset="1" stop-color="#4939ef"/></linearGradient>`;
 svg.prepend(defs);
 const gradients=['pink','violet','cyan','blue'];
 const ribbonPaths=['M20 61 39 15','M39 15 59 61','M59 61 79 15','M79 15 100 61'];
 svg.querySelectorAll('path').forEach((path,index)=>{
  path.setAttribute('d',ribbonPaths[index]);
  path.style.setProperty('fill','none','important');
  path.style.setProperty('stroke',`url(#${prefix}-${gradients[index]})`,'important');
  path.style.setProperty('stroke-width','24','important');
  path.style.setProperty('stroke-linecap','round','important');
  path.style.setProperty('stroke-linejoin','round','important');
 });
 svg.classList.add('ribbon-msme-mark');
}
applyRibbonMark(landing.querySelector('.landing-logo svg'),'landing-ribbon');
applyRibbonMark(screen.querySelector('.os-logo .msme-mark'),'login-ribbon');
const panel=screen.querySelector('#owned-auth-panel'),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));let mode='workspace',tab='signin',captcha={},signup={};
screen.querySelector('.login-copy').textContent='Existing customers can sign in. New companies can create a private workspace.';
const trialTabButton=screen.querySelector('[data-tab="signup"]');
if(trialTabButton)trialTabButton.textContent='Create Your Workspace';
screen.querySelector('.back-to-workspace').addEventListener('click',()=>{screen.classList.add('entry-hidden');landing.classList.remove('hidden')});
screen.querySelector('.back-to-signin').addEventListener('click',()=>{tab='signin';screen.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab==='signin'));show()});
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
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),45000);
  let response;
  try{response=await fetch(base+path,{...options,signal:controller.signal})}
  catch(error){if(error?.name==='AbortError')throw Error('The employee server took too long to respond. Please try again.');throw error}
  finally{clearTimeout(timeout)}
  let result={};try{result=await response.json()}catch(_){}
  if(!response.ok)throw Error(result.error||'Employee request failed.');
  return result;
}
async function newCaptcha(){captcha=await request('/api/auth/captcha');const n=panel.querySelector('[data-captcha-code]');if(n)n.textContent=captcha.captcha_code}
function mailIcon(){return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 6.5h17v11h-17z"/><path d="m4.5 7.5 7.5 6 7.5-6"/></svg>`}
function lockIcon(){return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2"/></svg>`}
function eye(){return `<button type="button" data-eye aria-label="Show password"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg></button>`}
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
  try{
    if(window.MSMEWorkspaceDatabase)await window.MSMEWorkspaceDatabase.load(email);
  }catch(error){
    console.error('MSME database sync unavailable; refusing to replace saved data with a browser fallback.',error);
    sessionStorage.removeItem('msme-admin-auth');
    throw Error('Your saved company database could not be loaded. No demo data was opened or saved. Check the Render database connection and try again.');
  }
  const savedView=sessionStorage.getItem('msme-active-view');
  const safeViews=['dashboard','reminders','temporary','workers','staff','entrepreneurs','coverage','attendance','payroll','training','contractors','exemployees','recycle'];
  view=safeViews.includes(savedView)?savedView:'dashboard';
  document.querySelector('#login-screen')?.classList.add('hidden');
  document.querySelector('#app-shell')?.classList.add('visible');
  sessionRestoreOverlay?.remove();
  sessionRestoreOverlay=null;
  await new Promise(resolve=>requestAnimationFrame(resolve));
  try{
    if(typeof loadTenant==='function')loadTenant(a);
    if(typeof refreshAdmin==='function')refreshAdmin();
    if(typeof render==='function')render();
  }catch(error){
    console.error('MSME dashboard startup failed',error);
    sessionRestoreOverlay?.remove();
    sessionRestoreOverlay=null;
    document.querySelector('#login-screen')?.classList.remove('entry-hidden');
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
 if(!entered||!entered.includes('employee_invite='))return;
 try{
  const query=entered.includes('?')?entered.slice(entered.indexOf('?')+1):entered;
  const params=new URLSearchParams(query);
  const token=params.get('employee_invite');
  if(!token)throw Error('Invitation token is missing.');
  input.value=token;
  const email=params.get('employee_email');
  if(email&&form.elements.contact)form.elements.contact.value=email;
 }catch(_){message('Enter a valid invitation link or token.',true)}
}
function bindEmployeeAccess(){
 bind();
 const login=panel.querySelector('#owned-employee-signin');
 if(login)login.onsubmit=async event=>{event.preventDefault();const button=login.querySelector('button[type="submit"]');button.disabled=true;button.textContent='Signing in…';message('');try{const result=await employeeRequest('/api/employee/login',Object.fromEntries(new FormData(login)));sessionStorage.setItem('msme-employee-token',result.access_token);await window.MSMEEmployeePortal?.open()}catch(error){message(error.message,true);button.disabled=false;button.textContent='Sign in'}};
 const activation=panel.querySelector('#owned-employee-activate');
 if(activation){
  activation.elements.invite_token.addEventListener('change',()=>normalizeEmployeeInvitation(activation));
  activation.elements.invite_token.addEventListener('paste',()=>setTimeout(()=>normalizeEmployeeInvitation(activation),0));
  activation.onsubmit=async event=>{event.preventDefault();normalizeEmployeeInvitation(activation);const fields=Object.fromEntries(new FormData(activation)),button=activation.querySelector('button[type="submit"]');if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(fields.contact||'').trim()))return message('Enter the email address used for this invitation.',true);button.disabled=true;button.textContent='Creating account…';try{const created=await employeeRequest('/api/employee/activate',fields);sessionStorage.setItem('msme-employee-token',created.access_token);alert('Account created successfully.');await window.MSMEEmployeePortal?.open()}catch(error){message(error.message,true);button.disabled=false;button.textContent='Create account'}};
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
 screen.querySelector('.back-to-signin').hidden=tab==='signin';
 if(mode==='worker'){
  if(tab==='signin')panel.innerHTML=`<form class="auth-form" id="owned-employee-signin"><h2>Workforce sign in</h2><p>Workers, Staff, Temporary Workers and Entrepreneurs use credentials issued by their administrator.</p><label>PHONE NUMBER / EMAIL<span class="input-icon-wrap">${mailIcon()}<input name="email" type="text" required autocomplete="username" placeholder="Enter registered email"></span></label><label>PASSWORD<span class="password-wrap input-icon-wrap">${lockIcon()}<input name="password" type="password" required autocomplete="current-password">${eye()}</span></label><button class="forgot" type="button" data-employee-forgot>Forgot password?</button><p data-message></p><button class="primary" type="submit">Sign in</button></form>`;
  else {const query=employeeInviteParams();panel.innerHTML=`<form class="auth-form" id="owned-employee-activate"><h2>Create employee account</h2><p>Open the invitation link to fill this form automatically, or paste the copied invitation link/token manually below.</p><label>INVITATION LINK OR TOKEN<input name="invite_token" value="${esc(query.get('employee_invite')||'')}" required autocomplete="off" placeholder="Paste the complete invitation link or token"></label><label>EMAIL ADDRESS<input name="contact" type="email" value="${esc(query.get('employee_email')||'')}" required placeholder="Enter the email address on your invitation"></label><label>CREATE PASSWORD<span class="password-wrap"><input name="password" type="password" minlength="8" required>${eye()}</span></label><p data-message></p><button class="primary" type="submit">Create account</button></form>`;}
  bindEmployeeAccess();panel.querySelector('[data-employee-forgot]')?.addEventListener('click',employeeForgotPassword);return
 }
 if(tab==='signin'){const remembered=localStorage.getItem('msme-last-login-email')||'';panel.innerHTML=`<form class="auth-form" id="owned-signin"><label>EMAIL<span class="input-icon-wrap">${mailIcon()}<input type="email" name="email" value="${esc(remembered)}" required autocomplete="username"></span></label><label>PASSWORD<span class="password-wrap input-icon-wrap">${lockIcon()}<input type="password" name="password" required autocomplete="current-password">${eye()}</span></label><button type="button" class="forgot" data-forgot>Forgot password?</button><p data-message></p><button type="button" class="primary" id="owned-signin-submit">Sign in</button></form>`;bind();return}
 signup={};panel.innerHTML=`<form class="auth-form" id="owned-signup">${progress(0)}<label>EMAIL<input type="email" name="email" required></label><label>CREATE PASSWORD<span class="password-wrap"><input type="password" name="password" minlength="8" required>${eye()}</span></label><label>CONFIRM PASSWORD<span class="password-wrap"><input type="password" name="confirm" minlength="8" required>${eye()}</span></label><label>CAPTCHA VERIFICATION<div class="captcha-box"><strong data-captcha-code>Loading…</strong><button type="button" class="secondary" data-refresh>↻ New code</button></div><input name="captcha_answer" maxlength="6" autocomplete="off" placeholder="Enter the six-character code" required></label><p data-message></p><button class="primary">Continue to company details</button></form>`;bind();newCaptcha().catch(e=>message(e.message,true));
}
const onboardingWorkforce=[
 ['Workers','Production, trade and field workers'],
 ['Employees','General company employees'],
 ['Staff','Office and support staff'],
 ['Manager','Team and department managers'],
 ['HR','Human resources team'],
 ['Owner','Business owners'],
 ['Entrepreneur','Entrepreneurs and founders'],
];
const onboardingShifts=[
 {name:'Day Shift',key:'day',start:'09:00',end:'18:00'},
 {name:'Night Shift',key:'night',start:'18:00',end:'06:00'},
 {name:'Rotational Shift',key:'rotational',start:'09:00',end:'18:00'},
];
function onboardingChecked(values,value){return Array.isArray(values)&&values.includes(value)?' checked':''}
function onboardingSelected(value,expected){return value===expected?' selected':''}
function savedShift(name){return (Array.isArray(signup.shifts)?signup.shifts:[]).find(item=>item&&item.type===name)||{}}
function companyOnboardingFields(){
 const selectedShifts=Array.isArray(signup.shift_types)&&signup.shift_types.length?signup.shift_types:['Day Shift'];
 const workforce=Array.isArray(signup.workforce_categories)?signup.workforce_categories:[];
 const workforceCards=onboardingWorkforce.map(([name,description])=>`<label class="onboarding-choice"><input type="checkbox" name="workforce_categories" value="${name}"${onboardingChecked(workforce,name)}><span><b>${name}</b><small>${description}</small></span></label>`).join('');
 const shiftCards=onboardingShifts.map(shift=>`<label class="onboarding-choice shift-choice"><input type="checkbox" name="shift_types" value="${shift.name}" data-shift-option="${shift.key}"${onboardingChecked(selectedShifts,shift.name)}><span><b>${shift.name}</b><small>Set this shift's working hours</small></span></label>`).join('');
 const timingCards=onboardingShifts.map(shift=>{const saved=savedShift(shift.name),active=selectedShifts.includes(shift.name);return `<section class="shift-timing-card" data-shift-timing="${shift.key}"${active?'':' hidden'}><div><b>${shift.name}</b><small>Choose the start and end time.</small></div><div class="shift-time-inputs"><label>START TIME (AM / PM)<input type="time" name="shift_${shift.key}_start" value="${esc(saved.start||shift.start)}"${active?'':' disabled'} required></label><label>END TIME (AM / PM)<input type="time" name="shift_${shift.key}_end" value="${esc(saved.end||shift.end)}"${active?'':' disabled'} required></label></div></section>`}).join('');
 return `<label class="full onboarding-field">COMPANY NAME<input name="company" value="${esc(signup.company)}" autocomplete="organization" required></label>
 <label class="full onboarding-field">BUSINESS CATEGORY<input name="business_category" value="${esc(signup.business_category)}" list="business-category-options" placeholder="Example: Manufacturing, Software, Retail" required><datalist id="business-category-options"><option value="Manufacturing"><option value="Software / IT"><option value="Construction"><option value="Retail"><option value="Healthcare"><option value="Logistics"><option value="Professional services"><option value="Other"></datalist></label>
 <fieldset class="onboarding-section full"><legend>WHO WORKS IN YOUR COMPANY?</legend><p>Select every workforce category used by your company.</p><div class="onboarding-choice-grid">${workforceCards}</div></fieldset>
 <fieldset class="onboarding-section full"><legend>HOW MANY SHIFTS?</legend><p>Select one or more shift types. Each selected shift has its own timing.</p><div class="onboarding-choice-grid shift-choice-grid">${shiftCards}</div></fieldset>
 <div class="shift-timing-list full" data-shift-timing-list>${timingCards}</div>`
}
function addressOnboardingFields(){return `<label class="full onboarding-field">COMPANY ADDRESS<textarea name="company_address" rows="3" placeholder="Building, street and area" autocomplete="street-address" required>${esc(signup.company_address||'')}</textarea></label>
 <button type="button" class="current-location-button full" data-current-location><span>◎</span><b>Use current location</b><small>Allow location access to fill the address automatically.</small></button><p class="location-status full" data-location-status aria-live="polite"></p>
 <input type="hidden" name="latitude" value="${esc(signup.latitude)}"><input type="hidden" name="longitude" value="${esc(signup.longitude)}">
 <label class="full onboarding-field">PINCODE<input name="pincode" value="${esc(signup.pincode)}" inputmode="numeric" autocomplete="postal-code" required></label>
 <label class="full onboarding-field">CITY<input name="city" value="${esc(signup.city)}" autocomplete="address-level2" required></label>
 <label class="full onboarding-field">STATE<input name="state" value="${esc(signup.state)}" autocomplete="address-level1" required></label>
 <label class="full onboarding-field">COUNTRY<input name="country" value="${esc(signup.country||'India')}" autocomplete="country-name" required></label>`}
function administratorOnboardingFields(){const role=signup.role||'Owner';return `<label class="full onboarding-field">ADMIN NAME<input name="name" value="${esc(signup.name)}" autocomplete="name" required></label>
 <label class="full onboarding-field">ADMIN EMAIL<input type="email" name="admin_email" value="${esc(signup.admin_email||signup.email)}" autocomplete="email" required></label>
 <label class="full onboarding-field">ADMIN ROLE<select name="role" required><option${onboardingSelected(role,'Owner')}>Owner</option><option${onboardingSelected(role,'Administrator')}>Administrator</option><option${onboardingSelected(role,'HR')}>HR</option><option${onboardingSelected(role,'Manager')}>Manager</option></select></label>`}
function collectOnboarding(form,step,validate=true){
 const data=Object.fromEntries(new FormData(form));
 if(step===1){
  data.workforce_categories=[...form.querySelectorAll('input[name="workforce_categories"]:checked')].map(input=>input.value);
  data.shift_types=[...form.querySelectorAll('input[name="shift_types"]:checked')].map(input=>input.value);
  data.shifts=data.shift_types.map(type=>{const shift=onboardingShifts.find(item=>item.name===type),start=form.elements[`shift_${shift.key}_start`]?.value||shift.start,end=form.elements[`shift_${shift.key}_end`]?.value||shift.end;return{type,start,end}});
  if(validate&&!data.workforce_categories.length)throw Error('Select at least one workforce category.');
  if(validate&&!data.shift_types.length)throw Error('Select at least one company shift.');
  const primary=data.shifts[0];
  if(primary){data.shift_start=primary.start;data.shift_end=primary.end}
 }
 if(step===2)data.address=[data.company_address,data.city,data.state,data.pincode,data.country].filter(Boolean).join(', ');
 return data
}
function bindCompanyOnboarding(form){
 const syncShifts=()=>form.querySelectorAll('[data-shift-option]').forEach(option=>{const timing=form.querySelector(`[data-shift-timing="${option.dataset.shiftOption}"]`);if(!timing)return;timing.hidden=!option.checked;timing.querySelectorAll('input').forEach(input=>input.disabled=!option.checked)});
 form.querySelectorAll('[data-shift-option]').forEach(option=>option.addEventListener('change',syncShifts));
 syncShifts();
}
function bindCurrentLocation(form){
 const button=form.querySelector('[data-current-location]'),status=form.querySelector('[data-location-status]');
 if(!button)return;
 button.addEventListener('click',()=>{
  if(!navigator.geolocation){status.textContent='Current location is not supported in this browser.';status.className='location-status error';return}
  button.disabled=true;status.textContent='Finding your current location…';status.className='location-status loading';
  navigator.geolocation.getCurrentPosition(async position=>{
   const latitude=position.coords.latitude.toFixed(6),longitude=position.coords.longitude.toFixed(6);
   form.elements.latitude.value=latitude;form.elements.longitude.value=longitude;
   try{
    const response=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`,{headers:{Accept:'application/json'}});
    if(!response.ok)throw Error('Address lookup failed.');
    const result=await response.json(),address=result.address||{};
    form.elements.company_address.value=[address.house_number,address.road,address.suburb||address.neighbourhood].filter(Boolean).join(', ')||result.display_name||'';
    form.elements.pincode.value=address.postcode||'';
    form.elements.city.value=address.city||address.town||address.village||address.county||'';
    form.elements.state.value=address.state||'';
    form.elements.country.value=address.country||'India';
    status.textContent='Current location added. Please check the address before continuing.';status.className='location-status success';
   }catch(_){status.textContent=`Location found (${latitude}, ${longitude}). Please complete the address fields.`;status.className='location-status error'}
   button.disabled=false;
  },error=>{status.textContent=error.code===1?'Location permission was not allowed. Enter the address manually.':'Your location could not be found. Enter the address manually.';status.className='location-status error';button.disabled=false},{enableHighAccuracy:true,timeout:12000,maximumAge:60000});
 });
}
function onboarding(step){
 let fields,title;
 if(step===1){title='Company details';fields=companyOnboardingFields()}
 else if(step===2){title='Company address';fields=addressOnboardingFields()}
 else{title='Administrator details';fields=administratorOnboardingFields()}
 panel.innerHTML=`<form class="auth-form onboarding-form">${progress(step)}<div class="onboarding-heading"><h2>${title}</h2><p>Complete your private MSME workspace information.</p></div><div class="onboarding-grid">${fields}</div><p data-message></p><div class="auth-actions"><button type="button" class="secondary" data-back>Back</button><button class="primary">${step===3?'Complete account setup':'Continue'}</button></div></form>`;
 bind();
 const form=panel.querySelector('form');
 if(step===1)bindCompanyOnboarding(form);
 if(step===2)bindCurrentLocation(form);
 form.querySelector('[data-back]').onclick=()=>{if(step===1)return show();Object.assign(signup,collectOnboarding(form,step,false));onboarding(step-1)};
 form.onsubmit=async event=>{event.preventDefault();try{Object.assign(signup,collectOnboarding(form,step,true))}catch(error){return message(error.message,true)}if(step<3)return onboarding(step+1);signup.email=signup.admin_email||signup.email;try{const response=await request('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...signup,captcha_id:captcha.captcha_id})});localStorage.setItem('msme-last-login-email',signup.email);enter(response.account,signup.password)}catch(error){message(error.message,true)}};
}
function reset(){panel.innerHTML=`<form class="auth-form"><button type="button" class="forgot" data-return>← Back to sign in</button><h2>Reset password</h2><label>EMAIL<input type="email" name="email" required></label><label>NEW PASSWORD<span class="password-wrap"><input type="password" name="password" minlength="8" required>${eye()}</span></label><label>CAPTCHA<div class="captcha-box"><strong data-captcha-code>Loading…</strong><button type="button" class="secondary" data-refresh>↻ New code</button></div><input name="captcha_answer" maxlength="6" required></label><p data-message></p><button class="primary">Change password</button></form>`;bind();newCaptcha();panel.querySelector('form').onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));try{await request('/api/auth/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...d,captcha_id:captcha.captcha_id})});tab='signin';show()}catch(x){message(x.message,true)}}}
function bind(){panel.querySelectorAll('[data-eye]').forEach(b=>b.onclick=()=>{const i=b.parentElement.querySelector('input');i.type=i.type==='password'?'text':'password';b.setAttribute('aria-label',i.type==='password'?'Show password':'Hide password');b.classList.toggle('visible',i.type!=='password')});panel.querySelector('[data-refresh]')?.addEventListener('click',()=>newCaptcha());panel.querySelector('[data-forgot]')?.addEventListener('click',reset);panel.querySelector('[data-return]')?.addEventListener('click',show);panel.querySelector('[data-open-worker]')?.addEventListener('click',()=>window.MSMEEmployeePortal?.open());const f=panel.querySelector('#owned-signin');if(f){f.onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(f)),button=f.querySelector('#owned-signin-submit');if(button?.disabled)return;if(button){button.disabled=true;button.textContent='Signing in…'}message('Checking your account…');try{const r=await request('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});localStorage.setItem('msme-last-login-email',d.email);await enter(r.account,d.password)}catch(x){const employeeBase=String(window.MSME_EMPLOYEE_API_URL||'').replace(/\/$/,'');if(employeeBase&&/incorrect email or password/i.test(String(x.message||''))){try{const employee=await employeeRequest('/api/employee/login',{email:d.email,password:d.password});sessionStorage.setItem('msme-employee-token',employee.access_token);await window.MSMEEmployeePortal?.open();return}catch(_){}}message(x.message,true);if(button){button.disabled=false;button.textContent='Sign in'}}};f.querySelector('#owned-signin-submit')?.addEventListener('click',()=>f.requestSubmit());f.querySelectorAll('input').forEach(input=>input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();f.requestSubmit()}}))}const s=panel.querySelector('#owned-signup');if(s)s.onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(s));if(d.password!==d.confirm)return message('Passwords do not match.',true);signup=d;onboarding(1)}}
screen.querySelector('.access-switch').onclick=e=>{const b=e.target.closest('[data-access]');if(!b)return;mode=b.dataset.access;const signupButton=screen.querySelector('[data-tab="signup"]');if(signupButton)signupButton.textContent=mode==='worker'?'Create employee account':'Create Your Workspace';screen.querySelectorAll('[data-access]').forEach(x=>x.classList.toggle('active',x===b));show()};screen.querySelector('.auth-tabs').onclick=e=>{const b=e.target.closest('[data-tab]');if(!b)return;tab=b.dataset.tab;screen.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));show()};if(employeeInviteParams().get('employee_invite')){mode='worker';tab='signup';const signupButton=screen.querySelector('[data-tab="signup"]');if(signupButton)signupButton.textContent='Create employee account';screen.querySelectorAll('[data-access]').forEach(x=>x.classList.toggle('active',x.dataset.access==='worker'));screen.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab==='signup'))}show();
document.addEventListener('click',event=>{const navigation=event.target.closest('[data-view]');if(navigation)sessionStorage.setItem('msme-active-view',navigation.dataset.view)});
const restoredEmail=sessionStorage.getItem('msme-admin-auth');
const restoredAccount=tenantAccounts.find(account=>String(account.email||'').toLowerCase()===String(restoredEmail||'').toLowerCase());
if(restoredAccount)setTimeout(()=>enter(restoredAccount),0);
else if(restoredEmail){sessionStorage.removeItem('msme-admin-auth');sessionRestoreOverlay?.remove();sessionRestoreOverlay=null;screen.classList.remove('entry-hidden');}
window.addEventListener('msme-employee-session-expired',event=>{sessionRestoreOverlay?.remove();sessionRestoreOverlay=null;mode='worker';tab='signin';screen.querySelectorAll('[data-access]').forEach(x=>x.classList.toggle('active',x.dataset.access==='worker'));screen.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab==='signin'));document.querySelector('#app-shell')?.classList.remove('visible');screen.classList.remove('entry-hidden','hidden');show();const detail=event.detail?.message;if(detail)message(detail,true)});
if(!restoredEmail&&sessionStorage.getItem('msme-employee-token'))setTimeout(()=>window.MSMEEmployeePortal?.open().then(()=>{sessionRestoreOverlay?.remove();sessionRestoreOverlay=null}).catch(()=>{}),0);
})();
