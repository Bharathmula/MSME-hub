
/* ===== Source component: dashboard-feature-extensions.js ===== */
/*
  YOUR EDITABLE JAVASCRIPT
  ------------------------
  This file loads after every project feature file. Put interface overrides
  or additional browser behavior here, save it, and refresh the dashboard.

  Example:
  document.title = 'My MSME Planner';
*/

/*
  SIDEBAR WORKFORCE TOTALS
  ------------------------
  Keep every workforce count visible immediately after login and after any
  record is saved, moved or deleted. This file loads last, so the wrapper also
  covers the final render() function supplied by the versioned feature files.
*/
function updateWorkspaceSidebarCounts() {
  const activePeople = typeof people !== 'undefined' && Array.isArray(people) ? people : [];
  const temporaryPeople = typeof temporaryWorkers !== 'undefined' && Array.isArray(temporaryWorkers)
    ? temporaryWorkers
    : [];

  const totals = {
    'worker-count': activePeople.filter(person => person.role === 'Worker').length,
    'staff-count': activePeople.filter(person => person.role === 'Staff').length,
    'entrepreneur-count': activePeople.filter(person => person.role === 'Entrepreneur').length,
    'temporary-worker-count': temporaryPeople.length
  };

  Object.entries(totals).forEach(([elementId, total]) => {
    const badge = document.getElementById(elementId);
    if (badge) badge.textContent = String(total);
  });
}

const renderBeforeSidebarCounts = window.render;
window.render = function renderWithSidebarCounts(...args) {
  const result = renderBeforeSidebarCounts.apply(this, args);
  updateWorkspaceSidebarCounts();
  return result;
};

/* Handles an already authenticated session that opens while earlier scripts
   are still loading, before this final override is registered. */
updateWorkspaceSidebarCounts();

/*
  EX-EMPLOYEE BULK SELECTION
  --------------------------
  Adds Select All and Delete Selected without replacing the existing Edit,
  Restore and individual Delete actions.
*/
function selectedExEmployeeIds() {
  return [...document.querySelectorAll('[data-select-ex-employee]:checked')]
    .map(input => input.dataset.selectExEmployee);
}

function refreshExEmployeeBulkControls() {
  const selectedIds = selectedExEmployeeIds();
  const allBoxes = [...document.querySelectorAll('[data-select-ex-employee]')];
  const selectAll = document.getElementById('select-all-ex-employees');
  const selectedCount = document.getElementById('ex-employee-selected-count');
  const deleteButton = document.getElementById('delete-selected-ex-employees');

  if (selectedCount) selectedCount.textContent = `${selectedIds.length} selected`;
  if (deleteButton) deleteButton.disabled = selectedIds.length === 0;
  if (selectAll) {
    selectAll.checked = allBoxes.length > 0 && selectedIds.length === allBoxes.length;
    selectAll.indeterminate = selectedIds.length > 0 && selectedIds.length < allBoxes.length;
  }
}

function addExEmployeeBulkControls() {
  const tableWrap = document.querySelector('#view-root .table-wrap');
  const table = tableWrap?.querySelector('table');
  if (!tableWrap || !table || document.getElementById('select-all-ex-employees')) return;

  tableWrap.insertAdjacentHTML('beforebegin', `<section class="ex-employee-bulk-toolbar">
    <label class="ex-employee-select-all"><input type="checkbox" id="select-all-ex-employees"> Select all ex-employees</label>
    <strong id="ex-employee-selected-count">0 selected</strong>
    <button id="delete-selected-ex-employees" type="button" disabled>Delete selected</button>
  </section>`);

  table.querySelector('thead tr')?.insertAdjacentHTML('afterbegin', '<th>SELECT</th>');
  const actionHeading = table.querySelector('thead tr th:last-child');
  actionHeading?.insertAdjacentHTML('beforebegin', '<th>REASON FOR LEAVING</th><th>LEFT ON</th>');
  table.querySelectorAll('tbody tr').forEach(row => {
    const recordButton = row.querySelector('[data-ex]');
    if (recordButton) {
      const person = exPeople.find(item => item.id === recordButton.dataset.ex);
      const actionCell = recordButton.closest('td');
      actionCell?.insertAdjacentHTML('beforebegin', `<td>${esc(person?.exit_reason || person?.exit_note || 'Not entered')}</td>
        <td>${person?.exit_date ? esc(new Date(`${person.exit_date}T00:00:00`).toLocaleDateString('en-IN')) : 'Not entered'}</td>`);
      row.insertAdjacentHTML('afterbegin', `<td><label class="ex-employee-row-select">
        <input type="checkbox" data-select-ex-employee="${recordButton.dataset.ex}"> Select
      </label></td>`);
    } else {
      const emptyCell = row.querySelector('td.empty');
      if (emptyCell) emptyCell.colSpan = 8;
    }
  });

  refreshExEmployeeBulkControls();
}

const exBeforeBulkSelection = window.ex;
window.ex = function exWithBulkSelection(...args) {
  const result = exBeforeBulkSelection.apply(this, args);
  addExEmployeeBulkControls();
  return result;
};

document.addEventListener('change', event => {
  if (event.target.matches('#select-all-ex-employees')) {
    document.querySelectorAll('[data-select-ex-employee]').forEach(input => {
      input.checked = event.target.checked;
    });
    refreshExEmployeeBulkControls();
    return;
  }
  if (event.target.matches('[data-select-ex-employee]')) refreshExEmployeeBulkControls();
});

document.addEventListener('click', event => {
  const deleteButton = event.target.closest('#delete-selected-ex-employees');
  if (!deleteButton) return;

  const selectedIds = selectedExEmployeeIds();
  if (!selectedIds.length) return;
  const selectedNames = exPeople
    .filter(person => selectedIds.includes(person.id))
    .map(person => person.name)
    .join(', ');

  if (!confirm(`Move ${selectedIds.length} selected ex-employee record(s) to the Recycle Bin: ${selectedNames}?`)) return;
  recycleRecords(exPeople
    .filter(person => selectedIds.includes(person.id))
    .map(person => ({ source: 'Ex-Employee', record: person })));
  exPeople = exPeople.filter(person => !selectedIds.includes(person.id));
  save();
  render();
});

/*
  RECYCLE BIN
  -----------
  Deleted workforce records are kept per entrepreneur and grouped by their
  original section. They can be restored or permanently deleted in bulk.
*/
let recycleBin = [];
const recycleCategories = [
  ['Worker', 'Workers'],
  ['Staff', 'Staff'],
  ['Entrepreneur', 'Entrepreneurs'],
  ['Temporary Worker', 'Temporary Workers'],
  ['Ex-Employee', 'Ex-Employees']
];

function recycleStorageKey() {
  return tenantKey('recycle-bin');
}

function loadRecycleBin() {
  recycleBin = read(recycleStorageKey(), []);
  if (!Array.isArray(recycleBin)) recycleBin = [];
}

const loadTenantBeforeRecycleBin = window.loadTenant;
window.loadTenant = function loadTenantWithRecycleBin(...args) {
  const result = loadTenantBeforeRecycleBin.apply(this, args);
  loadRecycleBin();
  return result;
};

const saveBeforeRecycleBin = window.save;
window.save = function saveWithRecycleBin(...args) {
  const result = saveBeforeRecycleBin.apply(this, args);
  localStorage.setItem(recycleStorageKey(), JSON.stringify(recycleBin));
  return result;
};

window.recycleRecords = function recycleRecords(items) {
  const deletedAt = new Date().toISOString();
  items.forEach(({ source, record }) => {
    if (!record) return;
    recycleBin.push({
      recycle_id: `BIN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      source,
      deleted_at: deletedAt,
      record: JSON.parse(JSON.stringify(record))
    });
  });
  localStorage.setItem(recycleStorageKey(), JSON.stringify(recycleBin));
};

function recycleSelection(category) {
  return [...document.querySelectorAll(`[data-recycle-select="${CSS.escape(category)}"]:checked`)]
    .map(input => input.value);
}

function refreshRecycleControls(category) {
  const selected = recycleSelection(category);
  const boxes = [...document.querySelectorAll(`[data-recycle-select="${CSS.escape(category)}"]`)];
  const selectAll = document.querySelector(`[data-recycle-select-all="${CSS.escape(category)}"]`);
  const count = document.querySelector(`[data-recycle-selected-count="${CSS.escape(category)}"]`);
  if (selectAll) {
    selectAll.checked = boxes.length > 0 && selected.length === boxes.length;
    selectAll.indeterminate = selected.length > 0 && selected.length < boxes.length;
  }
  if (count) count.textContent = `${selected.length} selected`;
  document.querySelectorAll(`[data-recycle-action][data-category="${CSS.escape(category)}"]`).forEach(button => {
    button.disabled = selected.length === 0;
  });
}

function recycleBinPage() {
  const sections = recycleCategories.map(([category, label]) => {
    const items = recycleBin.filter(item => item.source === category);
    return `<section class="panel recycle-sector">
      <div class="recycle-sector-head"><div><h2>${esc(label)}</h2><p>${items.length} deleted record${items.length === 1 ? '' : 's'}</p></div>
        <label><input type="checkbox" data-recycle-select-all="${esc(category)}"> Select all</label></div>
      <div class="recycle-toolbar"><strong data-recycle-selected-count="${esc(category)}">0 selected</strong>
        <button class="secondary" data-recycle-action="restore" data-category="${esc(category)}" disabled>Restore selected</button>
        <button class="recycle-delete" data-recycle-action="delete" data-category="${esc(category)}" disabled>Delete permanently</button></div>
      <div class="recycle-list">${items.map(item => `<label class="recycle-record">
        <input type="checkbox" data-recycle-select="${esc(category)}" value="${esc(item.recycle_id)}">
        <span class="avatar">${ini(item.record.name || 'NA')}</span><span><b>${esc(item.record.name || 'Unnamed record')}</b>
        <small>${esc(item.record.id || '-')} · ${esc(item.record.dept || item.record.designation || 'No department')}<br>Deleted ${new Date(item.deleted_at).toLocaleString('en-IN')}</small></span></label>`).join('') || '<p class="empty">No deleted records in this section.</p>'}</div>
    </section>`;
  }).join('');

  root.innerHTML = `<div class="page-heading"><div><div class="eyebrow">RECYCLE BIN</div>
    <h1>Deleted workforce records.</h1><p>Restore records to their original section or permanently delete selected records.</p></div></div>
    <div class="recycle-grid">${sections}</div>`;
}

function restoreRecycleItems(ids) {
  const restoring = recycleBin.filter(item => ids.includes(item.recycle_id));
  restoring.forEach(item => {
    const record = fix(JSON.parse(JSON.stringify(item.record)));
    if (item.source === 'Ex-Employee') exPeople.push(record);
    else if (item.source === 'Temporary Worker') temporaryWorkers.push(record);
    else people.push(record);
  });
  recycleBin = recycleBin.filter(item => !ids.includes(item.recycle_id));
  save();
  render();
}

function permanentDeleteDialog(ids, category) {
  const names = recycleBin.filter(item => ids.includes(item.recycle_id)).map(item => item.record.name).join(', ');
  document.getElementById('modal-root').innerHTML = `<div class="modal-backdrop recycle-confirm-backdrop">
    <section class="modal recycle-confirm"><div class="modal-head"><div><div class="eyebrow">PERMANENT DELETE</div>
    <h2>Delete permanently?</h2><p>This action cannot be undone.</p></div></div>
    <p>Delete ${ids.length} selected ${esc(category.toLowerCase())} record(s): <b>${esc(names)}</b>?</p>
    <div class="modal-actions"><button class="secondary" type="button" id="cancel-recycle-delete">No, keep records</button>
    <button class="recycle-delete" type="button" id="confirm-recycle-delete">Yes, delete permanently</button></div></section></div>`;
  document.getElementById('cancel-recycle-delete').onclick = () => { document.getElementById('modal-root').innerHTML = ''; };
  document.getElementById('confirm-recycle-delete').onclick = () => {
    recycleBin = recycleBin.filter(item => !ids.includes(item.recycle_id));
    save();
    document.getElementById('modal-root').innerHTML = '';
    render();
  };
}

/* Render the Recycle Bin as a first-class workspace page. */
const renderBeforeRecycleBin = window.render;
window.render = function renderWithRecycleBin(...args) {
  if (view === 'recycle') {
    document.querySelectorAll('.nav-link').forEach(button => button.classList.toggle('active', button.dataset.view === view));
    updateWorkspaceSidebarCounts();
    const count = document.getElementById('recycle-count');
    if (count) count.textContent = String(recycleBin.length);
    recycleBinPage();
    return;
  }
  const result = renderBeforeRecycleBin.apply(this, args);
  const count = document.getElementById('recycle-count');
  if (count) count.textContent = String(recycleBin.length);
  return result;
};

/* Add a delete action to temporary workers; editing and conversion remain unchanged. */
const temporaryDashboardBeforeRecycleBin = window.temporaryDashboard;
window.temporaryDashboard = function temporaryDashboardWithRecycleDelete(...args) {
  temporaryDashboardBeforeRecycleBin.apply(this, args);
  document.querySelectorAll('#view-root [data-temp]').forEach(editButton => {
    if (!editButton.parentElement.querySelector('[data-delete-temporary]')) {
      editButton.insertAdjacentHTML('afterend', ` <button class="action recycle-row-delete" data-delete-temporary="${esc(editButton.dataset.temp)}">Delete</button>`);
    }
  });
};

document.addEventListener('change', event => {
  const selectAll = event.target.closest('[data-recycle-select-all]');
  if (selectAll) {
    const category = selectAll.dataset.recycleSelectAll;
    document.querySelectorAll(`[data-recycle-select="${CSS.escape(category)}"]`).forEach(input => { input.checked = selectAll.checked; });
    refreshRecycleControls(category);
    return;
  }
  const selected = event.target.closest('[data-recycle-select]');
  if (selected) refreshRecycleControls(selected.dataset.recycleSelect);
});

document.addEventListener('click', event => {
  const action = event.target.closest('[data-recycle-action]');
  if (!action) return;
  const category = action.dataset.category;
  const ids = recycleSelection(category);
  if (!ids.length) return;
  if (action.dataset.recycleAction === 'restore') restoreRecycleItems(ids);
  else permanentDeleteDialog(ids, category);
});

/* Capture legacy delete buttons before the older permanent-delete listener. */
document.addEventListener('click', event => {
  const exDelete = event.target.closest('[data-delete]');
  const tempDelete = event.target.closest('[data-delete-temporary]');
  if (!exDelete && !tempDelete) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (exDelete) {
    const person = exPeople.find(item => item.id === exDelete.dataset.delete);
    if (!person || !confirm(`Move ${person.name} to the Recycle Bin?`)) return;
    recycleRecords([{ source: 'Ex-Employee', record: person }]);
    exPeople = exPeople.filter(item => item.id !== person.id);
  } else {
    const person = temporaryWorkers.find(item => item.id === tempDelete.dataset.deleteTemporary);
    if (!person || !confirm(`Move ${person.name} to the Recycle Bin?`)) return;
    recycleRecords([{ source: 'Temporary Worker', record: person }]);
    temporaryWorkers = temporaryWorkers.filter(item => item.id !== person.id);
  }
  save();
  render();
}, true);

/* Initialize the remembered tenant when this last-loaded customization starts. */
if (document.getElementById('app-shell').classList.contains('visible')) {
  loadRecycleBin();
  const recycleCount = document.getElementById('recycle-count');
  if (recycleCount) recycleCount.textContent = String(recycleBin.length);
}

/*
  OTP-PROTECTED ADMIN EMAIL
  -------------------------
  A changed administrator email is saved only after the OTP sent to the new
  address is verified. The tenant's browser records move to the new login key.
*/
function migrateTenantStorage(oldEmail, newEmail) {
  if (oldEmail === newEmail) return;
  const oldPrefix = `msme-tenant-${encodeURIComponent(oldEmail)}-`;
  const newPrefix = `msme-tenant-${encodeURIComponent(newEmail)}-`;
  const moves = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(oldPrefix)) moves.push([key, `${newPrefix}${key.slice(oldPrefix.length)}`]);
  }
  moves.forEach(([oldKey, newKey]) => {
    localStorage.setItem(newKey, localStorage.getItem(oldKey));
    localStorage.removeItem(oldKey);
  });
}

async function adminApi(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({ error: 'Unexpected server response.' }));
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

window.adminPanel = function otpProtectedAdminPanel() {
  const originalEmail = String(admin.email || '').trim().toLowerCase();
  let emailVerificationToken = '';
  document.getElementById('modal-root').innerHTML = `<div class="modal-backdrop"><form class="modal admin-otp-form" id="admin-form">
    <div class="modal-head"><div><div class="eyebrow">ADMIN ACCESS</div><h2>Account controls</h2>
      <p>Update administrator details. A new login email must be verified by OTP.</p></div>
      <button class="close" type="button" data-admin-close>×</button></div>
    <div class="form-section">Administrator details</div><div class="form-grid">
      <label>Admin name<input name="name" value="${esc(admin.name || '')}" required></label>
      <label>Admin number<input name="phone" value="${esc(admin.phone || '')}" required></label>
      <label class="full">Admin email<input type="email" name="email" id="admin-email-otp" value="${esc(originalEmail)}" required></label>
    </div>
    <section class="admin-email-verification" id="admin-email-verification" hidden>
      <div><b>Verify the new login email</b><p>Send and enter the OTP before saving this email change.</p></div>
      <button class="secondary" type="button" id="send-admin-email-otp">Send OTP</button>
      <label>6-digit OTP<input id="admin-email-otp-code" inputmode="numeric" maxlength="6" placeholder="Enter OTP"></label>
      <button class="secondary" type="button" id="verify-admin-email-otp">Verify OTP</button>
      <p class="admin-otp-message" id="admin-otp-message"></p>
    </section>
    <div class="form-section">Password confirmation</div><div class="form-grid">
      <label>Current password<div class="admin-password-field"><input type="password" id="admin-current-password" name="current_password" required>
        <button class="admin-password-eye" type="button" data-admin-eye="admin-current-password" aria-label="Show current password">◉</button></div></label>
      <label>New password <small>(minimum 8 characters)</small><div class="admin-password-field">
        <input type="password" id="admin-new-password" name="new_password" minlength="8" required>
        <button class="admin-password-eye" type="button" data-admin-eye="admin-new-password" aria-label="Show new password">◉</button></div></label>
    </div><p class="login-error" id="admin-error"></p>
    <div class="modal-actions"><button class="secondary" type="button" data-admin-close>Cancel</button>
      <button class="primary" id="save-admin-changes">Save admin changes</button></div></form></div>`;

  const form = document.getElementById('admin-form');
  const emailInput = document.getElementById('admin-email-otp');
  const verification = document.getElementById('admin-email-verification');
  const otpMessage = document.getElementById('admin-otp-message');
  const otpInput = document.getElementById('admin-email-otp-code');
  const currentPasswordInput = document.getElementById('admin-current-password');
  const newPasswordInput = document.getElementById('admin-new-password');
  const showMessage = (text, type = '') => {
    otpMessage.textContent = text;
    otpMessage.className = `admin-otp-message ${type}`;
  };
  const refreshEmailState = () => {
    const changed = emailInput.value.trim().toLowerCase() !== originalEmail;
    verification.hidden = !changed;
    if (!changed) emailVerificationToken = '';
    const waitingForOtp = changed && !emailVerificationToken;
    currentPasswordInput.disabled = waitingForOtp;
    newPasswordInput.disabled = waitingForOtp;
  };
  document.querySelectorAll('[data-admin-close]').forEach(button => {
    button.onclick = () => { document.getElementById('modal-root').innerHTML = ''; };
  });
  emailInput.addEventListener('input', () => {
    emailVerificationToken = '';
    showMessage('');
    refreshEmailState();
  });

  document.getElementById('send-admin-email-otp').onclick = async () => {
    const newEmail = emailInput.value.trim().toLowerCase();
    showMessage('Sending verification code…');
    try {
      const data = await adminApi('/api/auth/send-otp', { email: newEmail, purpose: 'change_email' });
      showMessage(data.dev_otp ? `Development OTP: ${data.dev_otp}` : data.message, data.dev_otp ? 'dev-code' : 'success');
    } catch (error) {
      showMessage(error.message, 'error');
    }
  };
  const verifyAdminEmailOtp = async () => {
    try {
      const data = await adminApi('/api/auth/verify-otp', {
        email: emailInput.value.trim().toLowerCase(),
        purpose: 'change_email',
        otp: otpInput.value
      });
      emailVerificationToken = data.verification_token;
      refreshEmailState();
      showMessage('Email verified. Enter your current password.', 'success');
      currentPasswordInput.focus();
    } catch (error) {
      emailVerificationToken = '';
      refreshEmailState();
      showMessage(error.message, 'error');
      otpInput.focus();
    }
  };
  document.getElementById('verify-admin-email-otp').onclick = verifyAdminEmailOtp;

  otpInput.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    verifyAdminEmailOtp();
  });

  currentPasswordInput.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    newPasswordInput.focus();
  });

  document.querySelectorAll('[data-admin-eye]').forEach(button => {
    button.onclick = () => {
      const input = document.getElementById(button.dataset.adminEye);
      const reveal = input.type === 'password';
      input.type = reveal ? 'text' : 'password';
      button.textContent = reveal ? '◌' : '◉';
      button.setAttribute('aria-label', `${reveal ? 'Hide' : 'Show'} ${input === currentPasswordInput ? 'current' : 'new'} password`);
      input.focus();
    };
  });

  form.onsubmit = async event => {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(form));
    const newEmail = String(fields.email || '').trim().toLowerCase();
    const errorBox = document.getElementById('admin-error');
    if (newEmail !== originalEmail && !emailVerificationToken) {
      errorBox.textContent = 'Send and verify the OTP for the new email before saving.';
      return;
    }
    errorBox.textContent = 'Saving verified account changes…';
    try {
      const data = await adminApi('/api/auth/update-admin', {
        current_email: originalEmail,
        new_email: newEmail,
        current_password: fields.current_password,
        new_password: fields.new_password,
        name: fields.name,
        phone: fields.phone,
        verification_token: emailVerificationToken
      });
      migrateTenantStorage(originalEmail, newEmail);
      const localAccount = tenantAccounts.find(account => String(account.email || '').toLowerCase() === originalEmail);
      if (localAccount) Object.assign(localAccount, data.account, { password: fields.new_password || localAccount.password });
      else tenantAccounts.push({ ...data.account, password: fields.new_password || fields.current_password });
      admin = { ...(localAccount || tenantAccounts[tenantAccounts.length - 1]), ...data.account };
      sessionStorage.setItem('msme-admin-auth', newEmail);
      localStorage.setItem('msme-last-login-email', newEmail);
      localStorage.setItem('msme-accounts', JSON.stringify(tenantAccounts));
      loadRecycleBin();
      save();
      const loginEmail = document.getElementById('login-email-v27');
      if (loginEmail) loginEmail.value = newEmail;
      const credentialText = document.getElementById('credential-text');
      if (credentialText) credentialText.textContent = `${newEmail} • Use your current password`;
      refreshAdmin();
      document.getElementById('modal-root').innerHTML = '';
      render();
    } catch (error) {
      errorBox.textContent = error.message;
    }
  };
  refreshEmailState();
};

/* The original click handler captured the older function reference. */
document.getElementById('admin-access').onclick = () => window.adminPanel();

/* Replace administrator-email OTP with a browser-local CAPTCHA. */
const otpAdminPanel = window.adminPanel;
window.adminPanel = function captchaProtectedAdminPanel() {
  otpAdminPanel();
  const form = document.getElementById('admin-form');
  const emailInput = document.getElementById('admin-email-otp');
  const verification = document.getElementById('admin-email-verification');
  const originalEmail = String(admin.email || '').trim().toLowerCase();
  const currentPasswordInput = document.getElementById('admin-current-password');
  const newPasswordInput = document.getElementById('admin-new-password');
  let verified = false;
  let answer = 0;
  const unlockPasswordFields = () => {
    currentPasswordInput.disabled = false;
    currentPasswordInput.required = true;
    newPasswordInput.disabled = false;
    newPasswordInput.required = false;
  };
  verification.innerHTML = `<div><b>Confirm account change</b><p>Complete the CAPTCHA before saving a new login email.</p></div><div class="captcha-box"><strong id="admin-captcha-question"></strong><button class="secondary" type="button" id="refresh-admin-captcha">New CAPTCHA</button></div><label>CAPTCHA ANSWER<input id="admin-captcha-answer" inputmode="numeric"></label><button class="secondary" type="button" id="verify-admin-captcha">Verify CAPTCHA</button><p class="admin-otp-message" id="admin-captcha-message"></p>`;
  const renew = () => { const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',values=crypto.getRandomValues(new Uint32Array(6));answer=[...values].map(value=>chars[value%chars.length]).join('');verified=false;document.getElementById('admin-captcha-question').textContent=answer;document.getElementById('admin-captcha-answer').value=''; };
  emailInput.oninput = () => { verification.hidden=emailInput.value.trim().toLowerCase()===originalEmail;renew();unlockPasswordFields(); };
  document.getElementById('refresh-admin-captcha').onclick=renew;
  document.getElementById('verify-admin-captcha').onclick=()=>{const box=document.getElementById('admin-captcha-message');verified=document.getElementById('admin-captcha-answer').value.trim().toUpperCase()===answer;box.textContent=verified?'CAPTCHA verified.':'Incorrect CAPTCHA. Try again.';box.className=`admin-otp-message ${verified?'success':'error'}`;if(!verified)renew();unlockPasswordFields();};
  form.onsubmit=async event=>{event.preventDefault();const fields=Object.fromEntries(new FormData(form)),newEmail=String(fields.email||'').trim().toLowerCase(),errorBox=document.getElementById('admin-error');if(newEmail!==originalEmail&&!verified){errorBox.textContent='Verify the CAPTCHA before changing the email.';return}try{const data=await adminApi('/api/auth/update-admin',{current_email:originalEmail,new_email:newEmail,current_password:fields.current_password,new_password:fields.new_password,name:fields.name,phone:fields.phone});migrateTenantStorage(originalEmail,newEmail);const local=tenantAccounts.find(a=>String(a.email||'').toLowerCase()===originalEmail);if(local)Object.assign(local,data.account,{password:fields.new_password||local.password});admin={...(local||data.account),...data.account};sessionStorage.setItem('msme-admin-auth',newEmail);localStorage.setItem('msme-accounts',JSON.stringify(tenantAccounts));save();refreshAdmin();document.getElementById('modal-root').innerHTML='';render()}catch(error){errorBox.textContent=error.message}};
  renew();
  unlockPasswordFields();
};
document.getElementById('admin-access').onclick = () => window.adminPanel();

const rememberedLoginEmail = localStorage.getItem('msme-last-login-email');
if (rememberedLoginEmail) {
  const loginEmail = document.getElementById('login-email-v27');
  const credentialText = document.getElementById('credential-text');
  if (loginEmail) loginEmail.value = rememberedLoginEmail;
  if (credentialText) credentialText.textContent = `${rememberedLoginEmail} • Use your current password`;
}

/*
  MANUAL-ONLY DAILY ATTENDANCE
  ----------------------------
  Opening the workspace and changing timing fields must never create a dated
  attendance record. A date is stored only when the user explicitly selects a
  status and presses Save attendance in the Attendance Calendar.
*/
window.logToday = function keepAttendanceAsDraftOnly() {
  save();
};

function manualAttendanceDateKey() {
  if (typeof view !== 'undefined' && view === 'attendance' && typeof calendarDay !== 'undefined') {
    return calendarDay;
  }
  return typeof localDateKeyV25 === 'function'
    ? localDateKeyV25()
    : new Date().toISOString().slice(0, 10);
}

function addNotEnteredAttendanceOption(select, entered) {
  if (!select || select.querySelector('option[value=""]')) return;
  const option = document.createElement('option');
  option.value = '';
  option.textContent = 'Not entered';
  select.prepend(option);
  if (!entered) select.value = '';
}

function showManualAttendancePlaceholders() {
  const today = manualAttendanceDateKey();
  document.querySelectorAll('[data-attendance]').forEach(select => {
    const person = people.find(item => item.id === select.dataset.attendance);
    addNotEnteredAttendanceOption(select, person?.attendance_entered_date === today);
  });
  document.querySelectorAll('[data-temp-attendance]').forEach(select => {
    const person = temporaryWorkers.find(item => item.id === select.dataset.tempAttendance);
    addNotEnteredAttendanceOption(select, person?.attendance_entered_date === today);
  });
}

const manualRoleDashboardBase = window.roleDashboard;
window.roleDashboard = function roleDashboardWithManualAttendance(...args) {
  const result = manualRoleDashboardBase.apply(this, args);
  showManualAttendancePlaceholders();
  return result;
};

const manualTemporaryDashboardBase = window.temporaryDashboard;
window.temporaryDashboard = function temporaryDashboardWithManualAttendance(...args) {
  const result = manualTemporaryDashboardBase.apply(this, args);
  showManualAttendancePlaceholders();
  return result;
};

document.addEventListener('change', event => {
  const regular = event.target.closest?.('[data-attendance]');
  const temporary = event.target.closest?.('[data-temp-attendance]');
  const person = regular
    ? [...people, ...temporaryWorkers].find(item => item.id === regular.dataset.attendance)
    : temporary
      ? temporaryWorkers.find(item => item.id === temporary.dataset.tempAttendance)
      : null;
  if (!person) return;
  person.attendance_entered_date = event.target.value ? manualAttendanceDateKey() : '';
  save();
  render();
});

function manualAttendanceRecord(person) {
  const calculation = typeof attendanceCalculationV21 === 'function'
    ? attendanceCalculationV21(person)
    : null;
  return {
    id: person.id,
    name: person.name,
    role: person.role,
    source: 'Manual attendance',
    status: person.status,
    shift: person.shift || '09:00 AM - 06:00 PM',
    grace: typeof GRACE_TIME !== 'undefined' ? GRACE_TIME : '09:15 AM',
    login: person.login_time || '',
    logout: person.logout_time || '',
    half_time: person.halftime_time || person.halftime_start || '',
    half_period: person.halftime_period || '',
    half: calculation ? durationTextV21(calculation.breakMinutes) : hours(person.halftime_start, person.halftime_end),
    overtime_hours: person.overtime_hours || 0,
    overtime_period: person.overtime_period || '',
    overtime: calculation ? durationTextV21(calculation.overtime) : hours(person.overtime_start, person.overtime_end),
    work: calculation ? durationTextV21(calculation.work) : hours(person.login_time, person.logout_time),
    total: calculation ? durationTextV21(calculation.total) : '',
    late: calculation ? calculation.late : '-'
  };
}

window.saveSelectedDay = function saveOnlyManuallyEnteredAttendance() {
  const manuallyEntered = [...people, ...temporaryWorkers]
    .filter(person => person.attendance_entered_date === calendarDay && person.status)
    .map(manualAttendanceRecord);
  const automatic = typeof automaticAttendanceDraftsV21 !== 'undefined'
    ? (automaticAttendanceDraftsV21.get(calendarDay) || [])
    : [];
  const records = [...automatic];
  manuallyEntered.forEach(record => {
    const index = records.findIndex(item => item.id === record.id);
    if (index < 0) records.push(record); else records[index] = record;
  });
  if (!records.length) {
    alert(`No automatic or manual attendance is available for ${calendarDay}.`);
    return;
  }
  const index = attendanceLog.findIndex(day => day.date === calendarDay);
  if (index < 0) attendanceLog.push({ date: calendarDay, records });
  else attendanceLog[index] = { date: calendarDay, records };
  save();
  render();
  const saveType = manuallyEntered.length && automatic.length
    ? 'Automatic attendance and manual overrides'
    : manuallyEntered.length ? 'Manual attendance' : 'Automatic attendance';
  setTimeout(() => alert(`${saveType} for ${calendarDay} has been saved.`), 50);
};

/*
  OVERVIEW DATE, ROLE ATTENDANCE AND HABITUAL-LEAVE HISTORY
  ---------------------------------------------------------
  These panels are calculated from the live workforce and saved attendance log.
*/
function overviewDateText() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });
}

function roleAttendanceSnapshot(roleName) {
  const list = people.filter(person => person.role === roleName);
  const present = list.filter(person => person.status === 'Present').length;
  const leave = list.filter(person => person.status === 'On leave').length;
  const absent = list.filter(person => person.status === 'Absent').length;
  return { total: list.length, present, leave, absent, percentage: list.length ? Math.round(present / list.length * 100) : 0 };
}

function attendanceSector(roleName, viewName, className) {
  const stats = roleAttendanceSnapshot(roleName);
  return `<article class="role-attendance-sector ${className}">
    <div class="role-attendance-head"><div><span>${esc(roleName)}</span><b>${stats.percentage}% present today</b></div>
      <button type="button" data-view="${viewName}">Open dashboard →</button></div>
    <div class="role-attendance-progress-row">
      <div class="role-attendance-progress" role="progressbar" aria-label="${esc(roleName)} total present"
        aria-valuemin="0" aria-valuemax="100" aria-valuenow="${stats.percentage}">
        <i style="width:${stats.percentage}%"></i>
      </div>
      <div class="role-attendance-progress-counts" aria-label="${esc(roleName)} attendance counts">
        <span><b>${stats.present}</b> Present</span><span><b>${stats.leave}</b> On leave</span><span><b>${stats.absent}</b> Absent</span>
      </div>
    </div>
    <div class="role-attendance-values"><div><b>${stats.total}</b><span>Total people</span></div>
      <div><b>${stats.present}</b><span>Total present</span></div><div><b>${stats.leave}</b><span>On leave:</span></div>
      <div><b>${stats.absent}</b><span>Absent:</span></div></div></article>`;
}

/* Add inclusive 2026 festival dates to both new and already-created
   entrepreneur workspaces without removing any calendar edits. */
const inclusiveFestivalAdditions = {
  2026: [
    ['2026-03-21', 'Eid-ul-Fitr (Ramzan Eid)'],
    ['2026-04-03', 'Good Friday'],
    ['2026-04-05', 'Easter Sunday'],
    ['2026-05-27', 'Eid-ul-Zuha (Bakrid)'],
    ['2026-06-26', 'Muharram'],
    ['2026-08-26', 'Milad-un-Nabi / Id-e-Milad'],
    ['2026-12-25', 'Christmas Day']
  ]
};

/* Fixed-date holidays are generated for every selected calendar year. Festival
   entries already saved by the administrator remain untouched. */
const annualHolidayTemplates = [
  ['01-01', "New Year's Day"],
  ['01-26', 'Republic Day'],
  ['05-01', 'May Day'],
  ['08-15', 'Independence Day'],
  ['10-02', 'Gandhi Jayanti'],
  ['12-25', 'Christmas Day']
];

function ensureInclusiveFestivalCalendar() {
  const selectedYear = Number(festivalYear) || new Date().getFullYear();
  const annualHolidays = annualHolidayTemplates.map(([monthDay, name]) => [`${selectedYear}-${monthDay}`, name]);
  const additions = [...annualHolidays, ...(inclusiveFestivalAdditions[selectedYear] || [])];
  if (!additions.length || !Array.isArray(festivalCalendar)) return;
  let changed = false;
  additions.forEach(([date, name]) => {
    const matchingDate = festivalCalendar.find(item => item[0] === date);
    const matchingName = festivalCalendar.find(item => String(item[1] || '').toLowerCase() === name.toLowerCase());
    if (matchingDate) {
      const existingName = String(matchingDate[1] || '').toLowerCase();
      if (date === '2026-12-25' && existingName === 'christmas') {
        matchingDate[1] = name;
        changed = true;
      }
      return;
    }
    if (!matchingName) {
      festivalCalendar.push([date, name]);
      changed = true;
    }
  });
  if (!changed) return;
  festivalCalendar.sort((left, right) => left[0].localeCompare(right[0]));
  if (typeof yearlyFestivals !== 'undefined' && yearlyFestivals) yearlyFestivals[festivalYear] = festivalCalendar;
  save();
}

function habitualLeaveRecords(periodMonths = 1) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (periodMonths - 1), 1);
  const habitualPeople = people.filter(person => person.absence_type === 'Habitual leave');
  return habitualPeople.map(person => {
    const dates = attendanceLog
      .filter(day => new Date(`${day.date}T00:00:00`) >= start && new Date(`${day.date}T00:00:00`) <= now)
      .filter(day => {
        const record = day.records.find(item => item.id === person.id);
        return record && (record.status === 'Absent' || record.status === 'On leave');
      })
      .map(day => day.date)
      .sort((a, b) => b.localeCompare(a));
    return { person, dates };
  }).sort((a, b) => b.dates.length - a.dates.length);
}

function renderHabitualLeaveRows(periodMonths = 1) {
  const target = document.getElementById('habitual-leave-records');
  if (!target) return;
  const records = habitualLeaveRecords(periodMonths);
  target.innerHTML = records.length ? records.map(({ person, dates }) => `<div class="habitual-leave-row">
    <div><b>${esc(person.name)}</b><span>${esc(person.role)} · ${esc(person.dept || 'Department not entered')}</span></div>
    <strong>${dates.length} habitual leave / absence day${dates.length === 1 ? '' : 's'}</strong>
    <small>${dates.length ? dates.slice(0, 6).map(date => esc(new Date(`${date}T00:00:00`).toLocaleDateString('en-IN'))).join(' · ') : 'No saved leave dates in this period'}</small>
  </div>`).join('') : '<p class="empty">No employee is currently classified under Habitual leave.</p>';
}

const dashboardBeforeAttendanceEnhancements = window.dashboard;
function greetingForCurrentTime(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
}
window.dashboard = function dashboardWithDateAndAttendanceSectors(...args) {
  ensureInclusiveFestivalCalendar();
  const result = dashboardBeforeAttendanceEnhancements.apply(this, args);
  const heading = document.querySelector('#view-root .page-heading');
  const greeting = heading?.querySelector('h1');
  if (greeting) greeting.textContent = `${greetingForCurrentTime()}, ${admin.name}.`;
  if (heading && !document.getElementById('overview-current-date')) {
    heading.insertAdjacentHTML('beforeend', `<time class="overview-current-date" id="overview-current-date" datetime="${new Date().toISOString().slice(0, 10)}">
      <span>Today</span>
      <b>${esc(overviewDateText())}</b>
      <small>${esc(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }))}</small>
    </time>`);
  }
  const festivalHeading = [...document.querySelectorAll('#view-root .section-title')]
    .find(item => item.textContent.toLowerCase().includes('festival calendar'));
  if (festivalHeading?.firstChild) {
    festivalHeading.firstChild.textContent = `Yearly holidays and festival calendar - ${festivalYear} `;
  }
  return result;
};

document.addEventListener('change', event => {
  if (event.target.matches('#habitual-leave-period')) renderHabitualLeaveRows(Number(event.target.value));
});

/* Keep the displayed Overview date correct if the page remains open overnight. */
setInterval(() => {
  const date = document.getElementById('overview-current-date');
  if (date) {
    date.dateTime = new Date().toISOString().slice(0, 10);
    const value = date.querySelector('b');
    if (value) value.textContent = overviewDateText();
    const clock = date.querySelector('small');
    if (clock) {
      clock.textContent = new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }
}, 60_000);

/*
  EX-EMPLOYEE EXIT DETAILS
  ------------------------
  Reason and exit date are captured before archival and remain editable later.
*/
const editorBeforeExitDetails = window.editor;
window.editor = function editorWithExitDetails(personId, isEx = false) {
  const person = (isEx ? exPeople : people).find(item => item.id === personId);
  editorBeforeExitDetails(personId, isEx);
  if (!person) return;
  const form = document.querySelector('#modal-root form');
  const actions = form?.querySelector('.modal-actions');
  if (!form || !actions || form.elements.exit_reason) return;
  if (!isEx && !form.elements.absence_type) {
    actions.insertAdjacentHTML('beforebegin', `<div class="form-section">Leave classification</div>
      <div class="form-grid leave-classification-grid"><label>Leave category<select name="absence_type">
        <option value="">Not classified</option><option ${person.absence_type === 'Habitual leave' ? 'selected' : ''}>Habitual leave</option>
        <option ${person.absence_type === 'Accidental leave' ? 'selected' : ''}>Accidental leave</option>
        <option ${person.absence_type === 'Planned leave' ? 'selected' : ''}>Planned leave</option></select></label>
        <label>Leave / absence note<input name="leave" value="${esc(person.leave || '')}" placeholder="Enter leave details"></label></div>`);
  }
  const exitDateValue = person.exit_date || (isEx ? new Date().toISOString().slice(0, 10) : '');
  const requiredWhenEditingArchive = isEx ? 'required' : '';
  actions.insertAdjacentHTML('beforebegin', `<div class="form-section">Employment exit details</div>
    <div class="form-grid exit-details-grid"><label class="full">Reason for leaving${isEx ? '<span class="required">*</span>' : ' <small>(required when moving to Ex-Employees)</small>'}
      <textarea name="exit_reason" ${requiredWhenEditingArchive} placeholder="Example: Resigned, retirement, contract completed or personal reason">${esc(person.exit_reason || person.exit_note || '')}</textarea></label>
      <label>Date left${isEx ? '<span class="required">*</span>' : ''}<input type="date" name="exit_date" value="${esc(exitDateValue)}" ${requiredWhenEditingArchive}></label></div>`);

  const reasonInput = form.elements.exit_reason;
  const dateInput = form.elements.exit_date;
  reasonInput.addEventListener('input', () => { person.exit_reason = reasonInput.value; });
  dateInput.addEventListener('input', () => { person.exit_date = dateInput.value; });

  const archiveButton = form.querySelector('#archive');
  if (archiveButton && !isEx) {
    archiveButton.onclick = () => {
      if (!reasonInput.value.trim() || !dateInput.value) {
        reasonInput.reportValidity();
        dateInput.reportValidity();
        return;
      }
      if (!confirm(`Move ${person.name} to Ex-Employees?`)) return;
      person.exit_reason = reasonInput.value.trim();
      person.exit_note = person.exit_reason;
      person.exit_date = dateInput.value;
      people = people.filter(item => item.id !== person.id);
      exPeople.push({ ...person });
      save();
      document.getElementById('modal-root').innerHTML = '';
      render();
    };
  }
};

/*
  RELIGION IN EVERY WORKFORCE FORM
  --------------------------------
  Worker, Staff, Entrepreneur and Temporary Worker forms all pass through the
  shared editor. This final wrapper guarantees a visible, editable selection
  while preserving any religion value already saved in a profile.
*/
function religionOptions(currentValue = '') {
  const standardValues = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other', 'Prefer not to say'];
  const values = currentValue && !standardValues.includes(currentValue)
    ? [currentValue, ...standardValues]
    : standardValues;
  return `<option value="">Select religion</option>${values.map(value =>
    `<option value="${esc(value)}" ${value === currentValue ? 'selected' : ''}>${esc(value)}</option>`
  ).join('')}`;
}

function ensureReligionFormControl(person) {
  const form = document.querySelector('#modal-root form');
  if (!form || !person) return;
  let control = form.elements.namedItem('religion');
  if (!control) {
    const firstGrid = form.querySelector('.form-grid');
    if (!firstGrid) return;
    const gender = form.elements.namedItem('gender')?.closest('label');
    const markup = `<label class="religion-form-field">Religion
      <select name="religion">${religionOptions(person.religion || '')}</select></label>`;
    if (gender) gender.insertAdjacentHTML('afterend', markup);
    else firstGrid.insertAdjacentHTML('beforeend', markup);
    return;
  }
  if (control.tagName === 'SELECT') return;
  const label = control.closest('label');
  if (!label) return;
  label.classList.add('religion-form-field');
  control.outerHTML = `<select name="religion">${religionOptions(person.religion || control.value || '')}</select>`;
}

const editorBeforeReligionField = window.editor;
window.editor = function editorWithReligionField(personId, isEx = false) {
  const person = (isEx ? exPeople : people).find(item => item.id === personId);
  editorBeforeReligionField(personId, isEx);
  ensureReligionFormControl(person);
};

/* Final safeguards: older versioned scripts sometimes call their original
   lexical dashboard/editor functions, bypassing window-level wrappers. */
function indiaHour(date = new Date()) {
  try {
    const part = new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Kolkata'
    }).formatToParts(date).find(item => item.type === 'hour');
    return Number(part?.value || 0) % 24;
  } catch (_error) {
    return date.getHours();
  }
}

function greetingForIndiaTime(date = new Date()) {
  const hour = indiaHour(date);
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
}

function refreshAdminGreeting() {
  const block = [...document.querySelectorAll('#view-root .page-heading')]
    .find(item => item.querySelector('.eyebrow')?.textContent.trim().toUpperCase() === 'ADMIN CONTROL CENTRE');
  const heading = block?.querySelector('h1');
  if (!heading) return;
  const adminName = typeof admin !== 'undefined' && admin?.name ? admin.name : 'Admin';
  const expected = `${greetingForIndiaTime()}, ${adminName}.`;
  if (heading.textContent !== expected) heading.textContent = expected;
}

function modalWorkforceRecord(form) {
  const eyebrow = form.querySelector('.eyebrow')?.textContent.trim().toUpperCase() || '';
  if (!/(WORKER|STAFF|ENTREPRENEUR)/.test(eyebrow)) return null;
  const enteredName = form.elements.namedItem('name')?.value?.trim() || '';
  const isTemporary = eyebrow.includes('TEMPORARY');
  const source = isTemporary
    ? (typeof temporaryWorkers !== 'undefined' ? temporaryWorkers : [])
    : [...(typeof people !== 'undefined' ? people : []), ...(typeof exPeople !== 'undefined' ? exPeople : [])];
  const expectedRole = eyebrow.includes('ENTREPRENEUR') ? 'Entrepreneur' : eyebrow.includes('STAFF') ? 'Staff' : 'Worker';
  return source.find(person => person.name === enteredName &&
    (isTemporary || !person.role || person.role === expectedRole)) || { religion: '' };
}

function normalizeReligionInOpenWorkforceForm() {
  const form = document.querySelector('#modal-root form');
  if (!form) return;
  const person = modalWorkforceRecord(form);
  if (!person) return;
  let control = form.elements.namedItem('religion');
  if (!control) {
    const grid = form.querySelector('.form-grid');
    if (!grid) return;
    const genderLabel = form.elements.namedItem('gender')?.closest('label');
    const markup = `<label class="religion-form-field" data-religion-control="true">Religion
      <select name="religion">${religionOptions(person.religion || '')}</select></label>`;
    if (genderLabel) genderLabel.insertAdjacentHTML('afterend', markup);
    else grid.insertAdjacentHTML('beforeend', markup);
    control = form.elements.namedItem('religion');
  } else if (control.tagName !== 'SELECT') {
    const currentValue = person.religion || control.value || '';
    const label = control.closest('label');
    if (!label) return;
    label.classList.add('religion-form-field');
    label.dataset.religionControl = 'true';
    control.outerHTML = `<select name="religion">${religionOptions(currentValue)}</select>`;
    control = form.elements.namedItem('religion');
  }
  const label = control?.closest('label');
  label?.classList.add('religion-form-field');
  if (label) label.dataset.religionControl = 'true';
}

function installFinalRenderSafeguards() {
  const viewRoot = document.getElementById('view-root');
  const modalRoot = document.getElementById('modal-root');
  if (viewRoot && !viewRoot.dataset.finalSafeguards) {
    viewRoot.dataset.finalSafeguards = 'true';
    new MutationObserver(refreshAdminGreeting).observe(viewRoot, { childList: true, subtree: true });
  }
  if (modalRoot && !modalRoot.dataset.finalSafeguards) {
    modalRoot.dataset.finalSafeguards = 'true';
    new MutationObserver(normalizeReligionInOpenWorkforceForm)
      .observe(modalRoot, { childList: true, subtree: true });
  }
  refreshAdminGreeting();
  normalizeReligionInOpenWorkforceForm();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installFinalRenderSafeguards, { once: true });
} else {
  installFinalRenderSafeguards();
}
setInterval(refreshAdminGreeting, 60_000);

/* CONTRACT DEADLINES AND OVERVIEW OPERATIONS */
function indiaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-IN', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Kolkata'
  }).formatToParts(date);
  const value = type => parts.find(part => part.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function dateKeyToUtc(dateKey) {
  const [year, month, day] = String(dateKey || '').split('-').map(Number);
  return year && month && day ? Date.UTC(year, month - 1, day) : NaN;
}

function daysFromToday(dateKey) {
  const end = dateKeyToUtc(dateKey);
  const today = dateKeyToUtc(indiaDateKey());
  return Number.isFinite(end) ? Math.round((end - today) / 86_400_000) : null;
}

function readableContractDate(dateKey) {
  const value = dateKeyToUtc(dateKey);
  return Number.isFinite(value)
    ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
    : 'Not entered';
}

function contractorDeadlineState(contractor) {
  const remaining = daysFromToday(contractor?.contract_end);
  if (remaining === null) return { className: 'not-entered', label: 'End date not entered', remaining };
  if (remaining < 0) return { className: 'overdue', label: `Overdue by ${Math.abs(remaining)} day${Math.abs(remaining) === 1 ? '' : 's'}`, remaining };
  if (remaining === 0) return { className: 'due-today', label: 'Contract ends today', remaining };
  if (remaining <= 30) return { className: 'due-soon', label: `${remaining} day${remaining === 1 ? '' : 's'} remaining`, remaining };
  return { className: 'active', label: `${remaining} days remaining`, remaining };
}

function enhanceContractorPage() {
  const page = document.querySelector('#view-root');
  const eyebrow = page?.querySelector('.page-heading .eyebrow')?.textContent.trim().toUpperCase();
  if (eyebrow !== 'CONTRACTOR REGISTER') return;
  const table = page.querySelector('.table-wrap table');
  if (!table || table.dataset.deadlinesAdded) return;
  table.dataset.deadlinesAdded = 'true';
  const headerRow = table.querySelector('thead tr');
  const notesHeading = [...(headerRow?.children || [])].find(cell => cell.textContent.trim().toUpperCase() === 'NOTES');
  notesHeading?.insertAdjacentHTML('beforebegin', '<th>CONTRACT ENDS / DEADLINE</th>');
  table.querySelectorAll('tbody tr').forEach(row => {
    const id = row.querySelector('[data-contractor]')?.dataset.contractor;
    const contractor = typeof contractors !== 'undefined' ? contractors.find(item => item.id === id) : null;
    if (!contractor) {
      const empty = row.querySelector('td.empty');
      if (empty) empty.colSpan = 7;
      return;
    }
    const actionCell = row.querySelector('[data-contractor]')?.closest('td');
    const notesCell = actionCell?.previousElementSibling;
    const state = contractorDeadlineState(contractor);
    notesCell?.insertAdjacentHTML('beforebegin', `<td class="contract-deadline-cell"><b>${esc(readableContractDate(contractor.contract_end))}</b><span class="contract-deadline-state ${state.className}">${esc(state.label)}</span></td>`);
  });
}

function enhanceContractorForm() {
  const form = document.querySelector('#modal-root #contractor-form');
  if (!form || form.elements.namedItem('contract_end')) return;
  const name = form.elements.namedItem('name')?.value || '';
  const contractName = form.elements.namedItem('contract')?.value || '';
  const contractor = typeof contractors !== 'undefined'
    ? contractors.find(item => item.name === name && item.contract === contractName) || contractors[contractors.length - 1]
    : null;
  const markup = `<label>Contract end date / deadline<span class="required">*</span><input type="date" name="contract_end" value="${esc(contractor?.contract_end || '')}" required><small>The dashboard will flag the contract after this date.</small></label>`;
  const notes = form.elements.namedItem('notes')?.closest('label');
  if (notes) notes.insertAdjacentHTML('beforebegin', markup);
  else form.querySelector('.form-grid')?.insertAdjacentHTML('beforeend', markup);
}

function attendanceStatusCounts(records) {
  const list = Array.isArray(records) ? records : [];
  const uncertain = new Set(['On leave', 'Not sure', 'Not sure absent', 'Pending']);
  return {
    total: list.length,
    present: list.filter(item => item.status === 'Present').length,
    unsure: list.filter(item => uncertain.has(item.status)).length,
    absent: list.filter(item => item.status === 'Absent').length
  };
}

function attendanceOverviewCard(title, records, viewName) {
  const counts = attendanceStatusCounts(records);
  return `<article class="attendance-overview-card overview-role-${esc(viewName)}"><div class="attendance-overview-head"><h3>${esc(title)}</h3></div><p>${counts.total} total record${counts.total === 1 ? '' : 's'}</p><div class="attendance-color-counts"><span class="attendance-color present"><i></i><b>${counts.present}</b> Present</span><span class="attendance-color unsure"><i></i><b>${counts.unsure}</b> Not sure / on leave</span><span class="attendance-color absent"><i></i><b>${counts.absent}</b> Sure absent</span></div></article>`;
}

function overviewDeadlineRow(name, detail, className) {
  return `<div class="overview-deadline-row ${className}"><div><b>${esc(name)}</b><span>${esc(detail)}</span></div></div>`;
}

function upcomingAnnualDateDays(dateValue, maximumDays = 7) {
  const match = String(dateValue || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const today = indiaDateKey();
  const year = Number(today.slice(0, 4));
  const monthDay = `${match[2]}-${match[3]}`;
  const candidates = [`${year}-${monthDay}`, `${year + 1}-${monthDay}`];
  const result = candidates.map(daysFromToday).find(days => days >= 1 && days <= maximumDays);
  return Number.isFinite(result) ? result : null;
}

function recentAbsenceDays(personId, periodDays = 60) {
  const today = dateKeyToUtc(indiaDateKey());
  return (Array.isArray(attendanceLog) ? attendanceLog : []).filter(day => {
    const value = dateKeyToUtc(day.date);
    if (!Number.isFinite(value) || value > today || value < today - periodDays * 86_400_000) return false;
    const record = Array.isArray(day.records) ? day.records.find(item => item.id === personId) : null;
    return record && (record.status === 'Absent' || record.status === 'On leave');
  }).length;
}

function estimatedAbsenceRisk(person) {
  let score = 0;
  const reasons = [];
  const birthdayDays = upcomingAnnualDateDays(person.dob);
  if (birthdayDays !== null) {
    score += 25;
    reasons.push(`birthday in ${birthdayDays} day${birthdayDays === 1 ? '' : 's'}`);
  }
  const familyDates = [
    ['father_birthday', "father's birthday"], ['father_dob', "father's birthday"],
    ['mother_birthday', "mother's birthday"], ['mother_dob', "mother's birthday"],
    ['spouse_birthday', "spouse's birthday"], ['spouse_dob', "spouse's birthday"],
    ['wedding_anniversary', 'wedding anniversary'], ['parents_anniversary', "parents' anniversary"],
    ['special_date', 'family special date']
  ];
  const usedLabels = new Set();
  familyDates.forEach(([field, label]) => {
    const days = upcomingAnnualDateDays(person[field]);
    if (days === null || usedLabels.has(label)) return;
    usedLabels.add(label);
    score += 20;
    reasons.push(`${label} in ${days} day${days === 1 ? '' : 's'}`);
  });
  if (String(person.medical_history || '').trim() || String(person.family_medical_history || '').trim()) {
    score += 15;
    reasons.push('medical-history planning indicator');
  }
  if (person.absence_type === 'Habitual leave') {
    score += 25;
    reasons.push('classified as habitual leave');
  }
  const recent = recentAbsenceDays(person.id);
  if (recent >= 3) {
    score += 25;
    reasons.push(`${recent} leave/absence days in the last 60 days`);
  } else if (recent > 0) {
    score += 10;
    reasons.push(`${recent} leave/absence day${recent === 1 ? '' : 's'} in the last 60 days`);
  }
  return {
    person, score: Math.min(score, 100), reasons,
    level: score >= 60 ? 'high' : score >= 35 ? 'medium' : 'watch'
  };
}

function nextWeekAbsenceEstimates(records) {
  return records.map(estimatedAbsenceRisk)
    .filter(item => item.score >= 20)
    .sort((left, right) => right.score - left.score || left.person.name.localeCompare(right.person.name));
}

function absenceEstimatePanel(records) {
  const estimates = nextWeekAbsenceEstimates(records);
  return `<section class="absence-estimate-panel">
    <div class="overview-subsection-head"><div><span>PLANNING ESTIMATE</span><h3>Estimated next-week absence risk</h3></div><small>Not a confirmed absence</small></div>
    <p class="absence-estimate-note">Calculated from upcoming birthdays, important family dates, medical-history indicators, habitual-leave classification and saved attendance history.</p>
    <div class="absence-estimate-list">${estimates.length ? estimates.map(item => `<article class="absence-estimate-row ${item.level}">
      <div><b>${esc(item.person.name)}</b><span>${esc(item.person.role || 'Temporary Worker')} · ${esc(item.reasons.join(' · '))}</span></div>
      <strong>${item.score}% <small>${item.level} risk</small></strong>
    </article>`).join('') : '<p class="overflow-empty">No elevated next-week absence risk was identified from the available records.</p>'}</div>
  </section>`;
}

function enhanceOverviewDashboard() {
  const page = document.querySelector('#view-root');
  const eyebrow = page?.querySelector('.page-heading .eyebrow')?.textContent.trim().toUpperCase();
  if (eyebrow !== 'ADMIN CONTROL CENTRE') return;
  const health = page.querySelector('.health');
  page.querySelectorAll('.habitual-leave-panel:not(.overview-habitual-leave)').forEach(panel => panel.remove());
  const activePeople = typeof people !== 'undefined' ? people : [];
  const temporary = typeof temporaryWorkers !== 'undefined' ? temporaryWorkers : [];
  const contractorRecords = typeof contractors !== 'undefined' ? contractors : [];
  const temporaryOverflow = temporary.filter(person => elapsed(person) >= 180);
  const contractorOverflow = contractorRecords.filter(item => {
    const remaining = daysFromToday(item.contract_end);
    return remaining !== null && remaining < 0;
  });
  const workerRecords = activePeople.filter(person => person.role === 'Worker');
  const staffRecords = activePeople.filter(person => person.role === 'Staff');
  const entrepreneurRecords = activePeople.filter(person => person.role === 'Entrepreneur');
  const riskRecords = [...activePeople, ...temporary.filter(person => !activePeople.some(item => item.id === person.id))];
  if (health && !health.querySelector('.attendance-health-role-dashboard')) {
    health.querySelector('.panel-header')?.insertAdjacentHTML('afterend', `
      <div class="attendance-health-role-heading"><div><span>TODAY</span><b>Total attendance by workforce</b></div></div>
      <div class="role-attendance-dashboard attendance-health-role-dashboard">${attendanceSector('Worker', 'workers', 'worker-attendance')}${attendanceSector('Staff', 'staff', 'staff-attendance')}${attendanceSector('Entrepreneur', 'entrepreneurs', 'entrepreneur-attendance')}</div>
    `);
  }
  if (document.getElementById('operations-overview')) return;
  const section = `<section class="operations-overview" id="operations-overview">
    <div class="operations-overview-heading"><div><span>OVERVIEW</span><h2>Attendance status and deadline overflow</h2></div><div class="attendance-overview-legend"><span class="present"><i></i>Present</span><span class="unsure"><i></i>Not sure</span><span class="absent"><i></i>Sure absent</span></div></div>
    <div class="attendance-overview-grid">${attendanceOverviewCard('Employees / Workers', workerRecords, 'workers')}${attendanceOverviewCard('Staff', staffRecords, 'staff')}${attendanceOverviewCard('Entrepreneurs', entrepreneurRecords, 'entrepreneurs')}${attendanceOverviewCard('Temporary workers', temporary, 'temporary')}</div>
    <div class="overflow-overview-grid">
      <article class="overflow-overview-card temporary-overflow"><div class="overflow-card-head"><h3>Temporary worker overflow</h3><strong>${temporaryOverflow.length}</strong></div>${temporaryOverflow.length ? temporaryOverflow.map(person => { const extra = Math.max(0, elapsed(person) - 180); return overviewDeadlineRow(person.name, `${extra} day${extra === 1 ? '' : 's'} beyond 180-day limit`, 'temporary'); }).join('') : '<p class="overflow-empty">No temporary worker has crossed the 180-day limit.</p>'}</article>
      <article class="overflow-overview-card contractor-overflow"><div class="overflow-card-head"><h3>Contractor overflow</h3><strong>${contractorOverflow.length}</strong></div>${contractorOverflow.length ? contractorOverflow.map(contractor => overviewDeadlineRow(contractor.name || contractor.contract, contractorDeadlineState(contractor).label, 'contractor')).join('') : '<p class="overflow-empty">No contractor has crossed the contract end date.</p>'}</article>
    </div>
    ${absenceEstimatePanel(riskRecords)}
    <section class="habitual-leave-panel overview-habitual-leave">
      <div class="panel-header"><div><h3>Habitual leave records</h3><p>Calculated from permanently saved attendance dates.</p></div>
      <label>Period<select id="habitual-leave-period"><option value="1">Current month</option><option value="3">Last 3 months</option></select></label></div>
      <div id="habitual-leave-records"></div>
    </section>
  </section>`;
  const metrics = page.querySelector('.metrics');
  if (metrics) metrics.insertAdjacentHTML('afterend', section);
  else page.querySelector('.page-heading')?.insertAdjacentHTML('afterend', section);
  renderHabitualLeaveRows(1);
}

function refreshOperationsEnhancements() {
  enhanceOverviewDashboard();
  enhanceContractorPage();
  enhanceContractorForm();
}

function installOperationsEnhancements() {
  const viewRoot = document.getElementById('view-root');
  const modalRoot = document.getElementById('modal-root');
  if (viewRoot && !viewRoot.dataset.operationsEnhancements) {
    viewRoot.dataset.operationsEnhancements = 'true';
    new MutationObserver(refreshOperationsEnhancements).observe(viewRoot, { childList: true, subtree: true });
  }
  if (modalRoot && !modalRoot.dataset.contractDeadlineEnhancement) {
    modalRoot.dataset.contractDeadlineEnhancement = 'true';
    new MutationObserver(enhanceContractorForm).observe(modalRoot, { childList: true, subtree: true });
  }
  refreshOperationsEnhancements();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installOperationsEnhancements, { once: true });
} else {
  installOperationsEnhancements();
}


/* ===== Source component: 31-payroll-training-and-profile-updates.js ===== */
/* MSME-BS compatible features adapted to the existing Streamlit dashboard. */
(() => {
  const previousRender = window.render;
  const previousEditor = window.editor;
  const previousTemporaryEditor = window.tempEditor;
  const trainingLevels = ['Started', 'Learning', 'High learning', 'Learned'];
  const levelProgress = { Started: 25, Learning: 50, 'High learning': 80, Learned: 100 };
  let trainingRecords = [];

  function trainingKey() {
    return typeof tenantKey === 'function' ? tenantKey('training-records') : 'msme-training-records';
  }

  function loadTrainingRecords() {
    try {
      const value = JSON.parse(localStorage.getItem(trainingKey()) || '[]');
      trainingRecords = Array.isArray(value) ? value : [];
    } catch (_) {
      trainingRecords = [];
    }
  }

  function saveTrainingRecords() {
    localStorage.setItem(trainingKey(), JSON.stringify(trainingRecords));
  }

  function allPayrollPeople() {
    return [
      ...(Array.isArray(people) ? people : []),
      ...(Array.isArray(temporaryWorkers) ? temporaryWorkers.map(person => ({ ...person, payroll_role: 'Temporary Worker' })) : [])
    ];
  }

  function parseDuration(value) {
    const match = String(value || '').match(/(\d+)h\s*(\d+)m/i);
    return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
  }

  function csvCell(value) {
    return `"${String(value ?? '').replaceAll('"', '""')}"`;
  }

  function shellForFeature(feature) {
    document.querySelectorAll('.nav-link').forEach(button => {
      button.classList.toggle('active', button.dataset.view === feature);
    });
  }

  function payrollRow(person, monthPrefix) {
    const records = (Array.isArray(attendanceLog) ? attendanceLog : [])
      .filter(day => String(day.date || '').startsWith(monthPrefix))
      .flatMap(day => (day.records || []).filter(record => record.id === person.id && record.status === 'Present'));
    const minutes = records.reduce((sum, record) => sum + parseDuration(record.total || record.work), 0);
    const dailyRate = Number(person.daily_rate || 0);
    const monthlySalary = Number(person.monthly_salary || 0);
    const pay = dailyRate
      ? dailyRate * records.length
      : monthlySalary
        ? monthlySalary * (minutes / (8 * 60 * 26))
        : 0;
    return {
      id: person.id,
      name: person.name || 'Unnamed',
      role: person.payroll_role || person.role || 'Worker',
      days: records.length,
      minutes,
      monthlySalary,
      dailyRate,
      rate: dailyRate ? `₹${dailyRate}/day` : monthlySalary ? `₹${monthlySalary}/month` : 'Set salary in profile',
      pay
    };
  }

  function payrollPage() {
    shellForFeature('payroll');
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const rows = allPayrollPeople().map(person => payrollRow(person, monthPrefix));
    const payrollSections = [
      ['Worker', 'Workers'], ['Staff', 'Staff'], ['Temporary Worker', 'Temporary Workers'], ['Entrepreneur', 'Entrepreneurs']
    ].map(([role, title]) => {
      const roleRows = rows.filter(row => row.role === role);
      const totalPay = roleRows.reduce((total, row) => total + row.pay, 0);
      return `<section class="panel payroll-panel payroll-role-section"><div class="panel-header"><div><span class="eyebrow">${title.toUpperCase()}</span><h2>${title} monthly salary</h2></div><div class="payroll-role-total"><small>${roleRows.length} people</small><b>₹${totalPay.toFixed(2)}</b></div></div><div class="table-wrap"><table><thead><tr><th>NAME</th><th>PRESENT DAYS</th><th>WORKED HOURS</th><th>MONTHLY SALARY</th><th>DAILY RATE</th><th>CALCULATED MONTHLY PAY</th><th>EDIT</th></tr></thead><tbody>${roleRows.map(row => `<tr><td><b>${esc(row.name)}</b></td><td>${row.days}</td><td>${Math.floor(row.minutes / 60)}h ${row.minutes % 60}m</td><td>₹${row.monthlySalary.toFixed(2)}</td><td>₹${row.dailyRate.toFixed(2)}</td><td><b>₹${row.pay.toFixed(2)}</b></td><td><button class="action" data-edit-payroll-salary="${esc(row.id)}">Edit salary</button></td></tr>`).join('') || '<tr><td colspan="7" class="empty">No records in this section.</td></tr>'}</tbody></table></div></section>`;
    }).join('');
    root.innerHTML = `<div class="page-heading"><div><div class="eyebrow">PAYROLL</div>
      <h1>Monthly salary calculation.</h1><p>Calculated from saved attendance and each person's salary rate.</p></div>
      <button class="primary" id="download-payroll">⇩ Download payroll CSV</button></div>
      <section class="payroll-month-banner"><span>PAYROLL MONTH</span><b>${now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</b><strong>${rows.length} people</strong></section>${payrollSections}`;
    document.getElementById('download-payroll').onclick = () => {
      const content = [
        'Name,Role,Present days,Worked hours,Rate,Calculated pay',
        ...rows.map(row => [row.name, row.role, row.days, `${Math.floor(row.minutes / 60)}h ${row.minutes % 60}m`, row.rate, row.pay.toFixed(2)].map(csvCell).join(','))
      ].join('\n');
      const anchor = document.createElement('a');
      anchor.href = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
      anchor.download = `payroll-${monthPrefix}.csv`;
      anchor.click();
      URL.revokeObjectURL(anchor.href);
    };
    document.querySelectorAll('[data-edit-payroll-salary]').forEach(button => button.onclick = () => {
      const person = allPayrollPeople().find(item => item.id === button.dataset.editPayrollSalary);
      const source = (Array.isArray(people) ? people : []).find(item => item.id === person?.id)
        || (Array.isArray(temporaryWorkers) ? temporaryWorkers : []).find(item => item.id === person?.id);
      if (!source) return;
      document.getElementById('modal-root').innerHTML = `<div class="modal-backdrop"><form class="modal" id="payroll-salary-form"><div class="modal-head"><div><div class="eyebrow">MONTHLY SALARY</div><h2>${esc(source.name)}</h2><p>Enter either a monthly salary or daily rate.</p></div><button class="close" type="button" data-close>×</button></div><div class="form-grid"><label>Monthly salary (₹)<input type="number" min="0" step="0.01" name="monthly_salary" value="${Number(source.monthly_salary || 0)}"></label><label>Daily rate (₹)<input type="number" min="0" step="0.01" name="daily_rate" value="${Number(source.daily_rate || 0)}"></label></div><div class="modal-actions"><button class="secondary" type="button" data-close>Cancel</button><button class="primary">Save salary</button></div></form></div>`;
      document.querySelectorAll('[data-close]').forEach(close => close.onclick = () => { document.getElementById('modal-root').innerHTML = ''; });
      document.getElementById('payroll-salary-form').onsubmit = event => {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(event.currentTarget));
        source.monthly_salary = Number(values.monthly_salary || 0);
        source.daily_rate = Number(values.daily_rate || 0);
        save();
        document.getElementById('modal-root').innerHTML = '';
        payrollPage();
      };
    });
  }

  function trainingPerson(id) {
    return (Array.isArray(people) ? people : []).find(person => person.id === id);
  }

  function trainingCard(record) {
    const person = trainingPerson(record.person_id);
    const mentor = trainingPerson(record.mentor_id);
    const synced = ['High learning', 'Learned'].includes(record.level);
    return `<article class="training-card"><div class="training-card-head"><div><h3>${esc(record.skill_name || 'Training skill')}</h3>
      <p>${esc(person?.name || 'Employee not found')} · ${esc(person?.role || 'Worker / Staff')}</p></div>
      <span class="training-level">${esc(record.level)}</span></div><div class="training-card-body">
      <div class="training-details"><div><span>MENTOR</span><b>${esc(mentor?.name || 'Not assigned')}</b></div>
      <div><span>TRAINING PERIOD</span><b>${esc(record.start_date || 'Not set')} – ${esc(record.target_date || 'Not set')}</b></div></div>
      <div class="training-progress"><i style="width:${levelProgress[record.level] || 0}%"></i></div>
      <div class="training-skill-status">${synced ? '✓ Included in the employee skill inventory.' : 'Skill is added at High learning or Learned.'}</div>
      ${record.notes ? `<p class="training-notes">${esc(record.notes)}</p>` : ''}<div class="training-actions">
      <button class="action" data-edit-training="${esc(record.id)}">Edit</button>
      <button class="danger-button" data-delete-training="${esc(record.id)}">Delete</button></div></div></article>`;
  }

  function trainingPage() {
    shellForFeature('training');
    loadTrainingRecords();
    const active = trainingRecords.filter(record => ['Started', 'Learning'].includes(record.level)).length;
    const advanced = trainingRecords.filter(record => ['High learning', 'Learned'].includes(record.level)).length;
    const peopleCount = new Set(trainingRecords.map(record => record.person_id)).size;
    root.innerHTML = `<div class="page-heading"><div><div class="eyebrow">SKILL DEVELOPMENT</div><h1>Training.</h1>
      <p>Track workers, staff, mentors, learning levels and automatic skill progress.</p></div>
      <button class="primary" id="add-training">+ Add training</button></div>
      <div class="work-dashboard training-summary"><section class="panel"><b>${trainingRecords.length}</b><span>Total records</span></section>
      <section class="panel"><b>${active}</b><span>Currently learning</span></section><section class="panel"><b>${advanced}</b><span>Advanced / learned</span></section>
      <section class="panel"><b>${peopleCount}</b><span>People in training</span></section></div>
      <section class="panel training-directory"><div class="panel-header"><div><div class="eyebrow">CONNECTED TRAINING RECORDS</div>
      <h2>Worker and staff development</h2></div><span class="training-sync-note">High learning and learned skills are automatically added to the profile.</span></div>
      <div class="training-card-grid">${trainingRecords.slice().sort((a, b) => String(b.start_date || '').localeCompare(String(a.start_date || ''))).map(trainingCard).join('') || '<p class="empty">No training records yet.</p>'}</div></section>`;
    document.getElementById('add-training').onclick = () => openTrainingEditor();
  }

  function syncTrainingSkill(record) {
    if (!['High learning', 'Learned'].includes(record.level)) return;
    const person = trainingPerson(record.person_id);
    if (!person || !String(record.skill_name || '').trim()) return;
    if (!Array.isArray(person.skills)) person.skills = [];
    const exists = person.skills.some(skill => String(skill).trim().toLowerCase() === String(record.skill_name).trim().toLowerCase());
    if (!exists) person.skills.push(String(record.skill_name).trim());
  }

  function openTrainingEditor(id = '') {
    const existing = trainingRecords.find(record => record.id === id);
    const record = existing || {
      id: `TR-${Date.now().toString(36).toUpperCase()}`,
      person_id: '', mentor_id: '', skill_name: '', level: 'Started',
      start_date: new Date().toISOString().slice(0, 10), target_date: '', notes: ''
    };
    const trainees = (Array.isArray(people) ? people : []).filter(person => ['Worker', 'Staff'].includes(person.role));
    const mentors = Array.isArray(people) ? people : [];
    document.getElementById('modal-root').innerHTML = `<div class="modal-backdrop"><form class="modal small" id="training-form">
      <div class="modal-head"><div><div class="eyebrow">SKILL DEVELOPMENT</div><h2>${existing ? 'Edit' : 'Add'} training</h2></div>
      <button type="button" class="close" data-close>×</button></div><div class="form-grid">
      <label>WORKER / STAFF <span class="required">*</span><select name="person_id" required><option value="">Select worker or staff</option>
      ${trainees.map(person => `<option value="${esc(person.id)}" ${record.person_id === person.id ? 'selected' : ''}>${esc(person.name || person.id)} · ${esc(person.role)}</option>`).join('')}</select></label>
      <label>MENTOR <span class="required">*</span><select name="mentor_id" required><option value="">Select mentor</option>
      ${mentors.map(person => `<option value="${esc(person.id)}" ${record.mentor_id === person.id ? 'selected' : ''}>${esc(person.name || person.id)} · ${esc(person.role)}</option>`).join('')}</select></label>
      <label>TRAINING / SKILL <span class="required">*</span><input name="skill_name" value="${esc(record.skill_name)}" required></label>
      <label>TRAINING LEVEL <span class="required">*</span><select name="level">${trainingLevels.map(level => `<option ${record.level === level ? 'selected' : ''}>${level}</option>`).join('')}</select></label>
      <label>START DATE<input type="date" name="start_date" value="${esc(record.start_date)}"></label>
      <label>TARGET DATE<input type="date" name="target_date" value="${esc(record.target_date)}"></label>
      <label class="full">TRAINING NOTES<textarea name="notes">${esc(record.notes)}</textarea></label></div>
      <p class="training-form-note">High learning or Learned automatically adds the training skill to the selected profile.</p>
      <div class="modal-actions"><button class="secondary" type="button" data-close>Cancel</button><button class="primary">Save training</button></div></form></div>`;
    document.querySelectorAll('#modal-root [data-close]').forEach(button => button.onclick = () => { document.getElementById('modal-root').innerHTML = ''; });
    document.getElementById('training-form').onsubmit = event => {
      event.preventDefault();
      Object.assign(record, Object.fromEntries(new FormData(event.currentTarget)));
      if (!existing) trainingRecords.push(record);
      syncTrainingSkill(record);
      saveTrainingRecords();
      save();
      document.getElementById('modal-root').innerHTML = '';
      trainingPage();
    };
  }

  function addProfileField(grid, label, name, type, value = '') {
    if (!grid || grid.querySelector(`[name="${name}"]`)) return;
    grid.insertAdjacentHTML('beforeend', `<label>${label}<input type="${type}" name="${name}" value="${esc(value || '')}"></label>`);
  }

  function addProfileSelect(grid, label, name, value = '') {
    if (!grid || grid.querySelector(`[name="${name}"]`)) return;
    grid.insertAdjacentHTML('beforeend', `<label>${label}<select name="${name}"><option ${!value ? 'selected' : ''}></option><option ${value === 'No' ? 'selected' : ''}>No</option><option ${value === 'Yes' ? 'selected' : ''}>Yes</option></select></label>`);
  }

  function enhanceProfileFields(personId) {
    const form = document.querySelector('#modal-root form');
    if (!form || form.dataset.msmeBsFields === 'yes') return;
    const person = [...allPayrollPeople(), ...(Array.isArray(exPeople) ? exPeople : [])].find(item => item.id === personId) || {};
    const sections = [...form.querySelectorAll('.form-section')];
    const workGrid = sections.find(section => /work|employment|attendance/i.test(section.textContent))?.nextElementSibling;
    const familyGrid = sections.find(section => /family/i.test(section.textContent))?.nextElementSibling;
    addProfileField(workGrid, 'Monthly salary (₹)', 'monthly_salary', 'number', person.monthly_salary);
    addProfileField(workGrid, 'Daily rate (₹, optional)', 'daily_rate', 'number', person.daily_rate);
    addProfileSelect(familyGrid, 'Father is deceased', 'father_deceased', person.father_deceased);
    addProfileField(familyGrid, "Father's death anniversary", 'father_death_anniversary', 'date', person.father_death_anniversary);
    addProfileSelect(familyGrid, 'Mother is deceased', 'mother_deceased', person.mother_deceased);
    addProfileField(familyGrid, "Mother's death anniversary", 'mother_death_anniversary', 'date', person.mother_death_anniversary);
    ['father', 'mother'].forEach(parent => {
      const deceased = form.querySelector(`[name="${parent}_deceased"]`);
      const anniversary = form.querySelector(`[name="${parent}_death_anniversary"]`)?.closest('label');
      if (!deceased || !anniversary) return;
      const update = () => {
        const visible = deceased.value === 'Yes';
        anniversary.hidden = !visible;
        anniversary.querySelector('input').required = visible;
      };
      deceased.addEventListener('change', update);
      update();
    });
    form.dataset.msmeBsFields = 'yes';
  }

  window.editor = function editorWithMsmeBsProfileFields(...args) {
    const result = previousEditor.apply(this, args);
    queueMicrotask(() => enhanceProfileFields(args[0]));
    return result;
  };

  if (typeof previousTemporaryEditor === 'function') {
    window.tempEditor = function temporaryEditorWithMsmeBsProfileFields(...args) {
      const result = previousTemporaryEditor.apply(this, args);
      queueMicrotask(() => enhanceProfileFields(args[0]));
      return result;
    };
  }

  function visibilityKey() {
    return typeof tenantKey === 'function' ? tenantKey('dashboard-visibility') : 'msme-dashboard-visibility';
  }

  function dashboardVisibility() {
    try { return { entrepreneur: true, contractor: true, ...JSON.parse(localStorage.getItem(visibilityKey()) || '{}') }; }
    catch (_) { return { entrepreneur: true, contractor: true }; }
  }

  function applyDashboardVisibility(settings) {
    const matches = [];
    document.querySelectorAll('#view-root [data-overflow-role="Entrepreneur"], #view-root .attendance-overview-card, #view-root .attendance-sector').forEach(element => {
      if (/entrepreneur/i.test(element.textContent)) matches.push([element, settings.entrepreneur]);
    });
    document.querySelectorAll('#view-root .contractor-overflow').forEach(element => matches.push([element, settings.contractor]));
    matches.forEach(([element, visible]) => element.classList.toggle('dashboard-section-muted', !visible));
  }

  function installDashboardVisibility() {
    if (view !== 'dashboard') return;
    const heading = document.querySelector('#view-root .page-heading');
    if (!heading || heading.querySelector('.dashboard-visibility-controls')) return;
    const settings = dashboardVisibility();
    heading.insertAdjacentHTML('beforeend', `<div class="dashboard-visibility-controls"><b>Overview cards</b>
      <label><input type="checkbox" data-dashboard-visibility="entrepreneur" ${settings.entrepreneur ? 'checked' : ''}> Entrepreneur</label>
      <label><input type="checkbox" data-dashboard-visibility="contractor" ${settings.contractor ? 'checked' : ''}> Contractors</label></div>`);
    heading.querySelectorAll('[data-dashboard-visibility]').forEach(input => input.onchange = () => {
      settings[input.dataset.dashboardVisibility] = input.checked;
      localStorage.setItem(visibilityKey(), JSON.stringify(settings));
      applyDashboardVisibility(settings);
    });
    applyDashboardVisibility(settings);
  }

  window.render = function renderWithPayrollAndTraining(...args) {
    if (view === 'payroll') return payrollPage();
    if (view === 'training') return trainingPage();
    const result = previousRender.apply(this, args);
    if (view === 'dashboard') setTimeout(installDashboardVisibility, 0);
    return result;
  };

  document.addEventListener('click', event => {
    const edit = event.target.closest('[data-edit-training]');
    const remove = event.target.closest('[data-delete-training]');
    if (edit) openTrainingEditor(edit.dataset.editTraining);
    if (remove && confirm('Delete this training record?')) {
      trainingRecords = trainingRecords.filter(record => record.id !== remove.dataset.deleteTraining);
      saveTrainingRecords();
      trainingPage();
    }
  });

  function contextSearchTable(query) {
    const normalized = query.trim().toLowerCase();
    const matches = records => records.filter(record => JSON.stringify(record).toLowerCase().includes(normalized));
    const heading = label => `<div class="page-heading"><div><div class="eyebrow">${esc(String(view).toUpperCase())} SEARCH</div><h1>${esc(label)}</h1><p>Results are displayed using the active sidebar section.</p></div></div>`;
    if (view === 'payroll') {
      const now = new Date();
      const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const rows = matches(allPayrollPeople()).map(person => payrollRow(person, prefix));
      root.innerHTML = `${heading(`${rows.length} payroll result${rows.length === 1 ? '' : 's'}`)}<section class="panel payroll-panel"><div class="table-wrap"><table><thead><tr><th>NAME</th><th>ROLE</th><th>MONTHLY SALARY</th><th>DAILY RATE</th><th>PRESENT DAYS</th><th>CALCULATED PAY</th></tr></thead><tbody>${rows.map(row => `<tr><td><b>${esc(row.name)}</b></td><td>${esc(row.role)}</td><td>₹${row.monthlySalary.toFixed(2)}</td><td>₹${row.dailyRate.toFixed(2)}</td><td>${row.days}</td><td><b>₹${row.pay.toFixed(2)}</b></td></tr>`).join('') || '<tr><td colspan="6" class="empty">No payroll matches.</td></tr>'}</tbody></table></div></section>`;
      return;
    }
    if (view === 'attendance') {
      const rows = matches(attendanceLog.flatMap(day => (day.records || []).map(record => ({ ...record, date: day.date }))));
      root.innerHTML = `${heading(`${rows.length} attendance result${rows.length === 1 ? '' : 's'}`)}<section class="panel"><div class="table-wrap"><table><thead><tr><th>DATE</th><th>NAME</th><th>ROLE</th><th>STATUS</th><th>CHECK-IN</th><th>CHECK-OUT</th><th>TOTAL</th></tr></thead><tbody>${rows.map(row => `<tr><td>${esc(row.date)}</td><td><b>${esc(row.name)}</b></td><td>${esc(row.role)}</td><td>${esc(row.status)}</td><td>${esc(row.login || '-')}</td><td>${esc(row.logout || '-')}</td><td>${esc(row.total || row.work || '-')}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">No attendance matches.</td></tr>'}</tbody></table></div></section>`;
      return;
    }
    const roleViews = { workers: 'Worker', staff: 'Staff', entrepreneurs: 'Entrepreneur' };
    let source = roleViews[view] ? people.filter(person => person.role === roleViews[view])
      : view === 'temporary' ? temporaryWorkers
      : view === 'exemployees' ? exPeople
      : view === 'contractors' ? contractors
      : view === 'training' ? trainingRecords
      : people;
    const rows = matches(source);
    root.innerHTML = `${heading(`${rows.length} ${esc(view)} result${rows.length === 1 ? '' : 's'}`)}<section class="panel"><div class="table-wrap"><table><thead><tr><th>NAME</th><th>ID</th><th>ROLE / TYPE</th><th>PHONE</th><th>DEPARTMENT</th><th>STATUS</th></tr></thead><tbody>${rows.map(row => `<tr><td><b>${esc(row.name || row.skill_name || row.contract || 'Record')}</b></td><td>${esc(row.id || row.person_id || '-')}</td><td>${esc(row.role || row.workforce_role || row.designation || '-')}</td><td>${esc(row.phone || '-')}</td><td>${esc(row.dept || row.department || '-')}</td><td>${esc(row.status || row.level || '-')}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">No matching records in this section.</td></tr>'}</tbody></table></div></section>`;
  }

  const contextSearch = document.getElementById('global-search');
  if (contextSearch) contextSearch.oninput = event => {
    const query = event.target.value;
    if (!query.trim()) render(); else contextSearchTable(query);
  };
  document.getElementById('side-nav')?.addEventListener('click', () => {
    if (contextSearch) contextSearch.value = '';
  });

  loadTrainingRecords();
})();
