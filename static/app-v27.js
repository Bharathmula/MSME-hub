/* Server-backed authentication and account creation. */
(function(){
  const panel=document.querySelector('.login-panel');
  if(!panel)return;
  panel.classList.add('auth-v27');
  panel.innerHTML=`
    <div id="forgot-form" hidden></div><input id="login-password" type="hidden">
    <div class="auth-heading"><div><p class="eyebrow login-badge">▣ &nbsp; ENTREPRENEUR ACCESS</p><h1>Welcome to your workspace</h1><p class="login-copy">Sign in or create a private MSME account.</p></div></div>
    <div class="auth-grid">
      <section class="auth-card active" id="signup-card">
        <button class="auth-card-title" type="button" data-focus-card="signup-card"><h2>Sign up / Sign in</h2><small>Access an existing workspace</small></button>
        <div class="signin-pane" id="signin-pane">
          <div class="google-slot" id="google-signup-button"><button class="google-placeholder" type="button" disabled>G &nbsp; Continue with Google</button></div>
          <p class="auth-note" id="google-note">Loading Google sign-up…</p>
          <div class="auth-divider">OR SIGN IN WITH EMAIL</div>
          <form id="login-form-v27">
            <label>EMAIL<input type="email" id="login-email-v27" placeholder="Enter your registered email" required></label>
            <label>PASSWORD<div class="password-box"><input type="password" id="login-password-v27" placeholder="Enter password" required><button class="password-eye" type="button" data-eye="login-password-v27" aria-label="Show password">◉</button></div></label>
            <p class="auth-message" id="login-message-v27"></p>
            <button class="auth-button" type="submit">Sign in</button>
            <button class="auth-link" id="open-forgot-v27" type="button">Forgot password?</button>
          </form>
          <div class="auth-divider">NEW ENTREPRENEUR</div>
          <button class="auth-button secondary" id="open-create-v27" type="button">Create account</button>
        </div>
        <div class="forgot-form-v27" id="forgot-pane-v27">
          <button class="auth-link" id="close-forgot-v27" type="button">← Back to sign in</button>
          <h3>Reset password</h3>
          <div class="auth-step visible" id="reset-step-email"><label>ACCOUNT EMAIL<input type="email" id="reset-email-v27" required></label><button class="auth-button secondary" id="reset-send-v27" type="button">Send OTP to email</button></div>
          <div class="auth-step" id="reset-step-otp"><label>6-DIGIT OTP<input id="reset-otp-v27" inputmode="numeric" maxlength="6"></label><button class="auth-button secondary" id="reset-verify-v27" type="button">Verify OTP</button></div>
          <div class="auth-step" id="reset-step-password"><label>NEW PASSWORD<div class="password-box"><input type="password" id="reset-password-v27" minlength="8"><button class="password-eye" type="button" data-eye="reset-password-v27">◉</button></div></label><button class="auth-button" id="reset-save-v27" type="button">Save new password</button></div>
          <p class="auth-message" id="reset-message-v27"></p>
        </div>
        <div class="credentials compact"><b>ACCOUNT REQUIRED</b><p>Create an account before signing in.</p></div>
      </section>
      <section class="auth-card auth-card-hidden" id="create-card">
        <button class="auth-link auth-back" id="back-to-signin-v27" type="button">← Back to sign in</button>
        <div class="auth-card-title"><h2>Create account</h2><small>Email verification keeps each workspace private</small></div>
        <form id="create-form-v27">
          <div class="auth-step visible" id="create-step-details">
            <label>ENTREPRENEUR NAME<input id="create-name-v27" required></label>
            <div class="auth-actions-row"><label>EMAIL<input type="email" id="create-email-v27" required></label><button class="auth-button secondary" id="create-send-v27" type="button">Send OTP</button></div>
            <label>COUNTRY / REGION<select id="create-country-v27"><option>India</option><option>United Arab Emirates</option><option>United States</option><option>United Kingdom</option><option>Singapore</option><option>Australia</option><option>Canada</option><option>Germany</option><option>France</option><option>Japan</option><option>Other</option></select></label>
            <label class="auth-check"><input type="checkbox" id="create-updates-v27"> Email me product news and application updates. I can unsubscribe later.</label>
          </div>
          <div class="auth-step" id="create-step-otp"><label>ENTER OTP SENT TO YOUR EMAIL<input id="create-otp-v27" inputmode="numeric" maxlength="6"></label><button class="auth-button secondary" id="create-verify-v27" type="button">Verify email</button></div>
          <div class="auth-step" id="create-step-password"><label>CREATE PASSWORD<div class="password-box"><input type="password" id="create-password-v27" minlength="8"><button class="password-eye" type="button" data-eye="create-password-v27">◉</button></div></label><label>CONFIRM PASSWORD<input type="password" id="create-confirm-v27" minlength="8"></label><button class="auth-button" type="submit">Create my account</button></div>
          <p class="auth-message" id="create-message-v27"></p>
        </form>
      </section>
    </div>`;

  const q=s=>document.querySelector(s);
  let createToken='',resetToken='';
  function message(id,text,type=''){const el=q(id);el.textContent=text;el.className='auth-message '+type}
  async function api(url,body){const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json().catch(()=>({error:'Unexpected server response.'}));if(!response.ok)throw new Error(data.error||'Request failed.');return data}
  function activate(card){document.querySelectorAll('.auth-card').forEach(x=>x.classList.toggle('active',x.id===card));q('#'+card).scrollIntoView({behavior:'smooth',block:'nearest'})}
  document.querySelectorAll('[data-focus-card]').forEach(button=>button.onclick=()=>activate(button.dataset.focusCard));
  document.querySelectorAll('[data-eye]').forEach(button=>button.onclick=()=>{const input=q('#'+button.dataset.eye);input.type=input.type==='password'?'text':'password';button.textContent=input.type==='password'?'◉':'◌'});

  function enterWorkspace(profile,password=''){
    const email=String(profile.email||'').toLowerCase();
    let account=tenantAccounts.find(a=>String(a.email||'').toLowerCase()===email);
    if(!account){account={name:profile.name||email.split('@')[0],phone:'',email,password:password||'Google account',country:profile.country||'',email_updates:!!profile.email_updates};tenantAccounts.push(account)}
    else Object.assign(account,{name:profile.name||account.name,country:profile.country||account.country,email_updates:profile.email_updates??account.email_updates,...(password?{password}:{})});
    localStorage.setItem('msme-accounts',JSON.stringify(tenantAccounts));admin=account;sessionStorage.setItem('msme-admin-auth',email);open();
  }

  q('#login-form-v27').onsubmit=async e=>{e.preventDefault();const email=q('#login-email-v27').value.trim().toLowerCase(),password=q('#login-password-v27').value;message('#login-message-v27','Signing in…');try{const data=await api('/api/auth/login',{email,password});enterWorkspace(data.account,password)}catch(error){message('#login-message-v27',error.message,'error')}};
  q('#open-create-v27').onclick=()=>{q('#signup-card').classList.add('auth-card-hidden');q('#create-card').classList.remove('auth-card-hidden');activate('create-card');q('#create-name-v27').focus()};
  q('#back-to-signin-v27').onclick=()=>{q('#create-card').classList.add('auth-card-hidden');q('#signup-card').classList.remove('auth-card-hidden');activate('signup-card')};
  q('#open-forgot-v27').onclick=()=>{q('#signin-pane').classList.add('hidden');q('#forgot-pane-v27').classList.add('visible');q('#reset-email-v27').value=q('#login-email-v27').value};
  q('#close-forgot-v27').onclick=()=>{q('#signin-pane').classList.remove('hidden');q('#forgot-pane-v27').classList.remove('visible')};

  q('#create-send-v27').onclick=async()=>{const email=q('#create-email-v27').value.trim();if(!q('#create-name-v27').value.trim()||!email){message('#create-message-v27','Enter your name and email first.','error');return}try{const data=await api('/api/auth/send-otp',{email,purpose:'register'});q('#create-step-otp').classList.add('visible');message('#create-message-v27',data.dev_otp?`Development OTP: ${data.dev_otp}`:data.message,data.dev_otp?'dev-code':'success')}catch(e){message('#create-message-v27',e.message,'error')}};
  q('#create-verify-v27').onclick=async()=>{try{const data=await api('/api/auth/verify-otp',{email:q('#create-email-v27').value,purpose:'register',otp:q('#create-otp-v27').value});createToken=data.verification_token;q('#create-step-password').classList.add('visible');message('#create-message-v27','Email verified. Create your password.','success')}catch(e){message('#create-message-v27',e.message,'error')}};
  q('#create-form-v27').onsubmit=async e=>{e.preventDefault();const password=q('#create-password-v27').value;if(password!==q('#create-confirm-v27').value){message('#create-message-v27','Passwords do not match.','error');return}try{const data=await api('/api/auth/register',{name:q('#create-name-v27').value,email:q('#create-email-v27').value,country:q('#create-country-v27').value,email_updates:q('#create-updates-v27').checked,password,verification_token:createToken});enterWorkspace(data.account,password)}catch(error){message('#create-message-v27',error.message,'error')}};

  q('#reset-send-v27').onclick=async()=>{try{const data=await api('/api/auth/send-otp',{email:q('#reset-email-v27').value,purpose:'reset'});q('#reset-step-otp').classList.add('visible');message('#reset-message-v27',data.dev_otp?`Development OTP: ${data.dev_otp}`:data.message,data.dev_otp?'dev-code':'success')}catch(e){message('#reset-message-v27',e.message,'error')}};
  q('#reset-verify-v27').onclick=async()=>{try{const data=await api('/api/auth/verify-otp',{email:q('#reset-email-v27').value,purpose:'reset',otp:q('#reset-otp-v27').value});resetToken=data.verification_token;q('#reset-step-password').classList.add('visible');message('#reset-message-v27','OTP verified. Enter a new password.','success')}catch(e){message('#reset-message-v27',e.message,'error')}};
  q('#reset-save-v27').onclick=async()=>{const email=q('#reset-email-v27').value.trim().toLowerCase(),password=q('#reset-password-v27').value;try{await api('/api/auth/reset-password',{email,password,verification_token:resetToken});const account=tenantAccounts.find(a=>String(a.email||'').toLowerCase()===email);if(account){account.password=password;localStorage.setItem('msme-accounts',JSON.stringify(tenantAccounts))}message('#reset-message-v27','Password updated. You can now sign in.','success')}catch(e){message('#reset-message-v27',e.message,'error')}};

  async function loadGoogle(){try{const config=await fetch('/api/auth/config').then(r=>r.json());if(!config.google_client_id){q('#google-note').textContent='Google sign-up is ready after adding your Google Client ID in the server settings.';return}const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.onload=()=>{q('#google-signup-button').innerHTML='';google.accounts.id.initialize({client_id:config.google_client_id,callback:async result=>{try{const data=await api('/api/auth/google',{credential:result.credential});enterWorkspace(data.account)}catch(e){message('#login-message-v27',e.message,'error')}}});google.accounts.id.renderButton(q('#google-signup-button'),{theme:'outline',size:'large',width:330,text:'continue_with'});q('#google-note').textContent='Use Google to create or access your workspace.'};document.head.appendChild(script)}catch(e){q('#google-note').textContent='Google sign-up configuration could not be loaded.'}}
  loadGoogle();
})();
