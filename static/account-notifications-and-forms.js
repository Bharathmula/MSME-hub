
/* ===== Source component: 26-login-captcha-authentication.js ===== */
/* Browser-local authentication with CAPTCHA verification. */
(function(){
const panel=document.querySelector('.login-panel');if(!panel)return;panel.classList.add('auth-v27');
panel.innerHTML=`<div id="forgot-form" hidden></div><input id="login-password" type="hidden"><div class="auth-heading"><div><p class="eyebrow login-badge">▣ &nbsp; ENTREPRENEUR ACCESS</p><h1>Welcome to your workspace</h1><p class="login-copy">Sign in or create a private MSME account.</p></div></div><div class="auth-grid"><section class="auth-card active" id="signup-card"><h2>Sign up / Sign in</h2><div class="signin-pane" id="signin-pane"><form id="login-form-v27"><label>EMAIL<input type="email" id="login-email-v27" required></label><label>PASSWORD<div class="password-box"><input type="password" id="login-password-v27" required><button class="password-eye" type="button" data-eye="login-password-v27">◉</button></div></label><p class="auth-message" id="login-message-v27"></p><button class="auth-button">Sign in</button><button class="auth-link" id="open-forgot-v27" type="button">Forgot password?</button></form><div class="auth-divider">NEW ENTREPRENEUR</div><button class="auth-button secondary" id="open-create-v27" type="button">Create account</button></div><div class="forgot-form-v27" id="forgot-pane-v27"><button class="auth-link" id="close-forgot-v27" type="button">← Back to sign in</button><h3>Reset password</h3><label>ACCOUNT EMAIL<input type="email" id="reset-email-v27"></label><div class="captcha-box"><strong id="reset-captcha-question"></strong><button class="auth-link" id="refresh-reset-captcha" type="button">New CAPTCHA</button></div><label>ENTER CAPTCHA<input id="reset-captcha-answer" maxlength="6" autocomplete="off"></label><button class="auth-button secondary" id="reset-verify-captcha" type="button">Continue</button><div class="auth-step" id="reset-step-password"><label>NEW PASSWORD<div class="password-box"><input type="password" id="reset-password-v27" minlength="8"><button class="password-eye" type="button" data-eye="reset-password-v27">◉</button></div></label><button class="auth-button" id="reset-save-v27" type="button">Save new password</button></div><p class="auth-message" id="reset-message-v27"></p></div></section><section class="auth-card auth-card-hidden" id="create-card"><button class="auth-link auth-back" id="back-to-signin-v27" type="button">← Back to sign in</button><h2>Create account</h2><small>Complete the CAPTCHA to continue</small><form id="create-form-v27"><label>ENTREPRENEUR NAME<input id="create-name-v27" required></label><label>COMPANY NAME<input id="create-company-v27" required></label><label>EMAIL<input type="email" id="create-email-v27" required></label><label>COUNTRY / REGION<select id="create-country-v27"><option>India</option><option>United Arab Emirates</option><option>United States</option><option>United Kingdom</option><option>Singapore</option><option>Australia</option><option>Canada</option><option>Germany</option><option>France</option><option>Japan</option><option>Other</option></select></label><div class="captcha-box"><strong id="create-captcha-question"></strong><button class="auth-link" id="refresh-create-captcha" type="button">New CAPTCHA</button></div><label>ENTER CAPTCHA<input id="create-captcha-answer" maxlength="6" autocomplete="off" required></label><button class="auth-button secondary" id="create-verify-captcha" type="button">Verify CAPTCHA</button><div class="auth-step" id="create-step-password"><label>CREATE PASSWORD<div class="password-box"><input type="password" id="create-password-v27" minlength="8"><button class="password-eye" type="button" data-eye="create-password-v27">◉</button></div></label><label>CONFIRM PASSWORD<div class="password-box"><input type="password" id="create-confirm-v27" minlength="8"><button class="password-eye" type="button" data-eye="create-confirm-v27">◉</button></div></label><button class="auth-button">Create my account</button></div><p class="auth-message" id="create-message-v27"></p></form></section></div>`;
const q=s=>document.querySelector(s);let ca=0,ra=0,cv=false,rv=false;
const msg=(id,t,c='')=>{q(id).textContent=t;q(id).className='auth-message '+c};
async function api(url,body){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),d=await r.json();if(!r.ok)throw Error(d.error);if(d.access_token)sessionStorage.setItem('msme-admin-api-token',d.access_token);return d}
function make(id){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',values=crypto.getRandomValues(new Uint32Array(6));const code=[...values].map(v=>chars[v%chars.length]).join('');q(id).textContent=code;return code}
function newCreate(){cv=false;ca=make('#create-captcha-question');q('#create-captcha-answer').value='';q('#create-step-password').classList.remove('visible')}
function newReset(){rv=false;ra=make('#reset-captcha-question');q('#reset-captcha-answer').value='';q('#reset-step-password').classList.remove('visible')}
function enter(p,password=''){const email=String(p.email).toLowerCase();let a=tenantAccounts.find(x=>String(x.email).toLowerCase()===email);if(!a){a={...p,password};tenantAccounts.push(a)}else Object.assign(a,p,password?{password}:{});localStorage.setItem('msme-accounts',JSON.stringify(tenantAccounts));admin=a;sessionStorage.setItem('msme-admin-auth',email);open()}
document.querySelectorAll('[data-eye]').forEach(b=>b.onclick=()=>{const i=q('#'+b.dataset.eye),show=i.type==='password';i.type=show?'text':'password';b.textContent=show?'◌':'◉';b.setAttribute('aria-label',show?'Hide password':'Show password');i.focus()});
q('#login-form-v27').onsubmit=async e=>{e.preventDefault();try{const d=await api('/api/auth/login',{email:q('#login-email-v27').value,password:q('#login-password-v27').value});enter(d.account,q('#login-password-v27').value)}catch(x){msg('#login-message-v27',x.message,'error')}};
q('#open-create-v27').onclick=()=>{q('#signup-card').classList.add('auth-card-hidden');q('#create-card').classList.remove('auth-card-hidden');newCreate()};q('#back-to-signin-v27').onclick=()=>{q('#create-card').classList.add('auth-card-hidden');q('#signup-card').classList.remove('auth-card-hidden')};q('#open-forgot-v27').onclick=()=>{q('#signin-pane').classList.add('hidden');q('#forgot-pane-v27').classList.add('visible');newReset()};q('#close-forgot-v27').onclick=()=>{q('#signin-pane').classList.remove('hidden');q('#forgot-pane-v27').classList.remove('visible')};q('#refresh-create-captcha').onclick=newCreate;q('#refresh-reset-captcha').onclick=newReset;
q('#create-verify-captcha').onclick=()=>{if(q('#create-captcha-answer').value.trim().toUpperCase()!==ca){msg('#create-message-v27','Incorrect CAPTCHA. Try again.','error');newCreate();return}cv=true;q('#create-step-password').classList.add('visible');msg('#create-message-v27','CAPTCHA verified.','success')};
q('#create-form-v27').onsubmit=async e=>{e.preventDefault();if(!cv)return msg('#create-message-v27','Verify the CAPTCHA first.','error');const p=q('#create-password-v27').value;if(p!==q('#create-confirm-v27').value)return msg('#create-message-v27','Passwords do not match.','error');try{const d=await api('/api/auth/register',{name:q('#create-name-v27').value,company:q('#create-company-v27').value,email:q('#create-email-v27').value,country:q('#create-country-v27').value,password:p});enter(d.account,p)}catch(x){msg('#create-message-v27',x.message,'error')}};
q('#reset-verify-captcha').onclick=()=>{if(q('#reset-captcha-answer').value.trim().toUpperCase()!==ra){msg('#reset-message-v27','Incorrect CAPTCHA. Try again.','error');newReset();return}rv=true;q('#reset-step-password').classList.add('visible');msg('#reset-message-v27','CAPTCHA verified.','success')};q('#reset-save-v27').onclick=async()=>{if(!rv)return;try{await api('/api/auth/reset-password',{email:q('#reset-email-v27').value,password:q('#reset-password-v27').value});msg('#reset-message-v27','Password updated.','success')}catch(x){msg('#reset-message-v27',x.message,'error')}};newCreate();newReset();
})();


/* ===== Source component: 27-login-notifications.js ===== */
/* Version 28 - grouped login notifications and consistent overtime range. */

function loginNoticeSectionV28(title, icon, items, emptyText) {
  return `<section class="login-notice-section">
    <div class="login-notice-section-title"><span>${icon}</span><b>${title}</b><em>${items.length}</em></div>
    <div class="login-notice-section-body">${items.length ? items.join('') : `<p class="login-notice-empty">${emptyText}</p>`}</div>
  </section>`;
}

window.loginNotifications = function groupedLoginNotificationsV28() {
  const birthdays = events()
    .filter(item => /birthday/i.test(String(item.l || '')))
    .slice(0, 8)
    .map(item => `<div class="login-notice-row"><span class="login-notice-icon">🎂</span><div>
      <strong>${esc(item.l)} · ${esc(item.p.name)}</strong><small>${esc(dl(item.d))}</small></div></div>`);

  const temporaryReminders = temporaryWorkers
    .filter(person => elapsed(person) >= 170)
    .map(person => `<div class="login-notice-row"><span class="login-notice-icon">◷</span><div>
      <strong>${esc(person.name)}</strong><small>Day ${elapsed(person)} of 180 · ${esc(tempNote(person))}</small></div></div>`);

  const incompleteProfiles = incomplete().map(person => `<div class="login-notice-row">
    <span class="login-notice-icon">!</span><div><strong>${esc(person.name || person.id)}</strong>
    <small>Important profile information is incomplete.</small></div></div>`);

  document.getElementById('modal-root').innerHTML = `<div class="modal-backdrop login-notice-backdrop">
    <div class="modal login-notice-modal"><div class="login-notice-head"><div>
      <div class="eyebrow">LOGIN NOTIFICATIONS</div><h2>Important updates</h2>
      <p>Review today’s workforce reminders.</p></div>
      <button class="close login-notice-close" id="close-login-notice" aria-label="Close notifications">×</button></div>
      <div class="login-notice-grid">
        ${loginNoticeSectionV28('Birthdays', '🎂', birthdays, 'No upcoming birthday reminders.')}
        ${loginNoticeSectionV28('Temporary worker day reminders', '◷', temporaryReminders, 'No temporary worker deadline reminders.')}
        ${loginNoticeSectionV28('Incomplete information', '!', incompleteProfiles, 'All important profile information is complete.')}
      </div>
    </div></div>`;
  document.getElementById('close-login-notice').onclick = () => {
    document.getElementById('modal-root').innerHTML = '';
  };
};

if (document.getElementById('app-shell').classList.contains('visible')) render();


/* ===== Source component: 28-profile-creation-save.js ===== */
/* Version 29 - save-only profile creation. */

window.add = function openUnsavedProfileDraftV29(roleName) {
  const prefix = roleName === 'Worker' ? 'WR' : roleName === 'Staff' ? 'ST' : 'EN';
  const draft = fix({
    id: `${prefix}-${Math.floor(1000 + Math.random() * 8999)}`,
    name: '', role: roleName, dept: '', status: 'Present', skills: []
  });

  /* Insert the draft only while constructing the existing detailed form. */
  people.push(draft);
  editor(draft.id);
  people = people.filter(person => person !== draft);

  const form = document.querySelector('#modal-root form');
  if (!form) return;
  const originalSubmit = form.onsubmit;
  const archiveButton = form.querySelector('#archive');
  const archiveNote = archiveButton?.previousElementSibling;
  archiveButton?.remove();
  if (archiveNote?.classList.contains('resignation-note')) archiveNote.remove();
  const heading = form.querySelector('h2');
  if (heading) heading.textContent = `New ${roleName}`;
  const saveButton = form.querySelector('.modal-actions .primary');
  if (saveButton) saveButton.textContent = `Save new ${roleName}`;

  form.onsubmit = event => {
    if (!people.includes(draft)) people.push(draft);
    try {
      originalSubmit(event);
    } catch (error) {
      people = people.filter(person => person !== draft);
      throw error;
    }
  };
};


/* ===== Source component: 29-overflow-bulk-selection.js ===== */
/* Version 30 - bulk selection in Worker, Staff and Entrepreneur overflows. */

const roleOverflowBeforeBulkV30 = window.roleOverflowV22;
let bulkOverflowRoleV30 = '';

function selectedOverflowIdsV30() {
  return [...document.querySelectorAll('[data-bulk-person]:checked')].map(input => input.dataset.bulkPerson);
}

function refreshBulkControlsV30() {
  const selected = selectedOverflowIdsV30();
  const allBoxes = [...document.querySelectorAll('[data-bulk-person]')];
  const count = document.getElementById('bulk-selected-count');
  const selectAll = document.getElementById('bulk-select-all');
  if (count) count.textContent = `${selected.length} selected`;
  if (selectAll) {
    selectAll.checked = allBoxes.length > 0 && selected.length === allBoxes.length;
    selectAll.indeterminate = selected.length > 0 && selected.length < allBoxes.length;
  }
  document.querySelectorAll('[data-bulk-action]').forEach(button => {
    button.disabled = selected.length === 0;
  });
}

function addBulkControlsV30(roleName) {
  bulkOverflowRoleV30 = roleName;
  const directory = document.querySelector('.overflow-directory');
  if (!directory) return;
  directory.insertAdjacentHTML('beforebegin', `<section class="bulk-overflow-toolbar">
    <label class="bulk-select-all"><input type="checkbox" id="bulk-select-all"> Select all ${esc(roleName === 'Entrepreneur' ? 'entrepreneurs' : `${roleName.toLowerCase()}s`)}</label>
    <strong id="bulk-selected-count">0 selected</strong>
    <div class="bulk-overflow-actions">
      <button class="bulk-move-button" type="button" data-bulk-action="archive" disabled>Move selected to Ex-Employees</button>
      <button class="bulk-delete-button" type="button" data-bulk-action="delete" disabled>Delete selected</button>
    </div>
  </section>`);

  document.querySelectorAll('.overflow-person-card').forEach(card => {
    const id = card.dataset.overflowProfile;
    card.insertAdjacentHTML('afterbegin', `<label class="bulk-person-select" title="Select this profile">
      <input type="checkbox" data-bulk-person="${esc(id)}"> <span>Select</span></label>`);
  });
  refreshBulkControlsV30();
}

window.roleOverflowV22 = function roleOverflowWithBulkSelectionV30(roleName) {
  roleOverflowBeforeBulkV30(roleName);
  addBulkControlsV30(roleName);
};

document.addEventListener('change', event => {
  if (event.target.matches('[data-bulk-person]')) {
    refreshBulkControlsV30();
    return;
  }
  if (event.target.matches('#bulk-select-all')) {
    document.querySelectorAll('[data-bulk-person]').forEach(input => {
      input.checked = event.target.checked;
    });
    refreshBulkControlsV30();
  }
}, true);

document.addEventListener('click', event => {
  const action = event.target.closest('[data-bulk-action]');
  if (!action) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const ids = selectedOverflowIdsV30();
  if (!ids.length) return;
  const selectedPeople = people.filter(person => ids.includes(person.id));

  if (action.dataset.bulkAction === 'archive') {
    if (!confirm(`Move ${selectedPeople.length} selected ${bulkOverflowRoleV30.toLowerCase()} profile(s) to Ex-Employees?`)) return;
    people = people.filter(person => !ids.includes(person.id));
    exPeople.push(...selectedPeople.map(person => ({
      ...person,
      exit_reason: person.exit_reason || `Bulk moved from active ${person.role.toLowerCase()} records`,
      exit_note: person.exit_note || person.exit_reason || `Bulk moved from active ${person.role.toLowerCase()} records`,
      exit_date: person.exit_date || new Date().toISOString().slice(0, 10)
    })));
  }

  if (action.dataset.bulkAction === 'delete') {
    if (!confirm(`Move ${selectedPeople.length} selected ${bulkOverflowRoleV30.toLowerCase()} profile(s) to the Recycle Bin?`)) return;
    if (typeof window.recycleRecords === 'function') {
      window.recycleRecords(selectedPeople.map(person => ({ source: person.role, record: person })));
    }
    people = people.filter(person => !ids.includes(person.id));
  }

  save();
  roleOverflowV22(bulkOverflowRoleV30);
}, true);


/* ===== Source component: 30-form-date-pickers.js ===== */
/* Version 31 - visible form controls and enhanced native date pickers. */

function addMissingFamilyDatesV31(scope) {
  const forms = [];
  if (scope.matches?.('form')) forms.push(scope);
  forms.push(...scope.querySelectorAll?.('form') || []);
  forms.forEach(form => {
    if (!form.matches('#full-form') || form.elements.parents_anniversary) return;
    const familySection = [...form.querySelectorAll('.form-section')]
      .find(section => /family details/i.test(section.textContent));
    const familyGrid = familySection?.nextElementSibling;
    if (!familyGrid?.classList.contains('form-grid')) return;
    familyGrid.insertAdjacentHTML('beforeend', `<label>Parents' anniversary
      <input type="date" name="parents_anniversary"></label>
      <label>Special family date<input type="date" name="special_date"></label>`);
  });
}

function enhanceDateInputsV31(scope = document) {
  addMissingFamilyDatesV31(scope);
  const dateInputs = [];
  if (scope.matches?.('input[type="date"]')) dateInputs.push(scope);
  dateInputs.push(...scope.querySelectorAll?.('input[type="date"]:not([data-date-enhanced])') || []);
  dateInputs.forEach(input => {
    if (input.dataset.dateEnhanced) return;
    input.dataset.dateEnhanced = 'true';
    input.min = input.min || '1900-01-01';
    input.max = input.max || '2100-12-31';
    input.title = 'Select day, month and year';
    input.setAttribute('aria-description', 'Use the calendar button to select day, month and year');
    const fieldName = String(input.name || input.id || '').toLowerCase();
    if (/dob|birthday|anniversary/.test(fieldName)) input.max = new Date().toISOString().slice(0, 10);
    if (!input.nextElementSibling?.classList.contains('date-picker-help')) {
      input.insertAdjacentHTML('afterend', '<small class="date-picker-help">Select day / month / year</small>');
    }
  });
}

const formDateObserverV31 = new MutationObserver(mutations => {
  mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
    if (node.nodeType === Node.ELEMENT_NODE) enhanceDateInputsV31(node);
  }));
});
formDateObserverV31.observe(document.body, { childList: true, subtree: true });
enhanceDateInputsV31();

/* Run synchronously after every workforce editor opens as well as through the
   observer. This guarantees newly inserted family-date fields are available
   before the user starts entering data. */
const editorBeforeDateEnhancementV31 = window.editor;
window.editor = function editorWithDateEnhancementV31(...args) {
  editorBeforeDateEnhancementV31(...args);
  enhanceDateInputsV31(document.getElementById('modal-root'));
  const [personId, isEx = false] = args;
  const person = (isEx ? exPeople : people).find(item => item.id === personId);
  const form = document.querySelector('#modal-root form');
  ['parents_anniversary', 'special_date'].forEach(field => {
    const input = form?.elements.namedItem(field);
    if (input && person?.[field]) input.value = person[field];
  });
};
