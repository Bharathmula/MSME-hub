(function () {
  const root = document.getElementById('employee-portal-root');
  const apiBase = () => String(window.MSME_EMPLOYEE_API_URL || '').replace(/\/$/, '');
  const authToken = () => sessionStorage.getItem('msme-employee-token') || '';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);

  let dashboard = null;
  let currentPage = 'overview';
  let cameraStream = null;
  let capturedFace = '';

  async function request(path, options = {}, token = authToken()) {
    const headers = new Headers(options.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(`${apiBase()}${path}`, { ...options, headers });
    let body = {};
    try { body = await response.json(); } catch (_error) {}
    if (!response.ok) throw Error(body.error || 'Request failed.');
    return body;
  }

  function stopCamera() {
    cameraStream?.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }

  function closePortal() {
    stopCamera();
    root.style.display = 'none';
    root.innerHTML = '';
  }

  function roleLabel(role) {
    if (role === 'TEMPORARY') return 'Temporary Worker';
    return role.charAt(0) + role.slice(1).toLowerCase();
  }

  function duration(minutes = 0) {
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  function dateTime(value) {
    if (!value) return '—';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? esc(value) : parsed.toLocaleString('en-IN');
  }

  function loginFrame(content) {
    stopCamera();
    root.style.display = 'block';
    root.innerHTML = `<main class="ep-login-shell">
      <div class="ep-head"><b>MSME Employee Attendance</b><button class="ep-secondary" id="ep-close" type="button">Close</button></div>
      ${content}
    </main>`;
    root.querySelector('#ep-close').onclick = closePortal;
  }

  function employeeLogin() {
    loginFrame(`<section class="ep-card ep-login-card">
      <p class="ep-eyebrow">WORKFORCE ACCESS</p><h1>Employee login</h1>
      <p>Workers, Staff and Temporary Workers use credentials issued by their administrator.</p>
      <form id="ep-login">
        <label>Email<input class="ep-input" name="email" type="email" required autocomplete="username"></label>
        <label>Password<input class="ep-input" name="password" type="password" required autocomplete="current-password"></label>
        <p id="ep-message" class="ep-error"></p><button class="ep-primary">Sign in</button>
      </form><hr><h2>Activate invitation</h2>
      <form id="ep-activate">
        <label>Invitation token<input class="ep-input" name="invite_token" required></label>
        <label>Phone number / email<input class="ep-input" name="contact" required></label>
        <label>Create password<input class="ep-input" name="password" type="password" minlength="8" required></label>
        <label>Create 6-digit attendance PIN<input class="ep-input" name="pin" inputmode="numeric" pattern="[0-9]{6}" required></label>
        <button class="ep-secondary">Activate account</button>
      </form>
    </section>`);

    root.querySelector('#ep-login').onsubmit = async event => {
      event.preventDefault();
      try {
        const result = await request('/api/employee/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(Object.fromEntries(new FormData(event.target)))
        }, '');
        sessionStorage.setItem('msme-employee-token', result.access_token);
        currentPage = 'overview';
        await loadDashboard();
      } catch (error) {
        root.querySelector('#ep-message').textContent = error.message;
      }
    };

    root.querySelector('#ep-activate').onsubmit = async event => {
      event.preventDefault();
      try {
        await request('/api/employee/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(Object.fromEntries(new FormData(event.target)))
        }, '');
        alert('Account activated. Sign in now.');
        employeeLogin();
      } catch (error) { alert(error.message); }
    };
  }

  function profileAvatar(employee) {
    if (employee.profile_photo_data) {
      return `<img class="ep-avatar-photo" src="${employee.profile_photo_data}" alt="Profile photo">`;
    }
    const initials = employee.name.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();
    return `<span class="ep-avatar-fallback">${esc(initials)}</span>`;
  }

  function employeeShell(content) {
    const employee = dashboard.employee;
    root.style.display = 'block';
    root.innerHTML = `<div class="ep-app">
      <aside class="ep-sidebar">
        <div class="ep-brand">MSME <b>HUB</b></div>
        <div class="ep-person">${profileAvatar(employee)}<strong>${esc(employee.name)}</strong><small>${esc(roleLabel(employee.workforce_role))}</small></div>
        <nav>
          <button data-ep-page="overview" class="${currentPage === 'overview' ? 'active' : ''}">▦ Overview</button>
          <button data-ep-page="attendance" class="${currentPage === 'attendance' ? 'active' : ''}">◷ Attendance</button>
          <button data-ep-page="profile" class="${currentPage === 'profile' ? 'active' : ''}">◉ Profile</button>
          <button data-ep-page="account" class="${currentPage === 'account' ? 'active' : ''}">⚙ Account controls</button>
        </nav>
        <button class="ep-sidebar-logout" id="ep-logout">↗ Log out</button>
      </aside>
      <main class="ep-main">
        <header class="ep-topbar"><div><small>${esc(roleLabel(employee.workforce_role))} dashboard</small><b>${esc(employee.employee_id)}</b></div><button class="ep-secondary" id="ep-close" type="button">Close</button></header>
        ${content}
      </main>
    </div>`;
    root.querySelector('#ep-close').onclick = closePortal;
    root.querySelector('#ep-logout').onclick = () => {
      stopCamera();
      sessionStorage.removeItem('msme-employee-token');
      sessionStorage.removeItem('msme-employee-page');
      employeeLogin();
    };
    root.querySelectorAll('[data-ep-page]').forEach(button => {
      button.onclick = () => {
        stopCamera();
        currentPage = button.dataset.epPage;
        sessionStorage.setItem('msme-employee-page', currentPage);
        renderPage();
      };
    });
  }

  function renderOverview() {
    const today = dashboard.today;
    const action = dashboard.next_action;
    employeeShell(`<section class="ep-page-heading"><p class="ep-eyebrow">TODAY</p><h1>${action === 'CHECK_IN' ? 'Ready to check in?' : 'Ready to check out?'}</h1><p>Capture a current live face photo and enter your private attendance PIN.</p></section>
      <div class="ep-overview-grid">
        <section class="ep-card"><h2>Attendance status</h2><div class="ep-status ${(today?.status || 'not-started').toLowerCase()}">${esc(today?.status || 'NOT STARTED')}</div>
          <dl class="ep-details"><div><dt>Check-in</dt><dd>${dateTime(today?.check_in_at)}</dd></div><div><dt>Check-out</dt><dd>${dateTime(today?.check_out_at)}</dd></div><div><dt>Total time</dt><dd>${duration(today?.worked_minutes || 0)}</dd></div></dl>
        </section>
        <section class="ep-card ep-camera-card"><h2>${esc(action.replace('_', ' '))} face capture</h2>
          <div class="ep-camera-stage"><video id="ep-camera" autoplay playsinline></video><canvas id="ep-canvas" hidden></canvas><img id="ep-face-preview" alt="Captured face" hidden><span id="ep-camera-placeholder">Camera preview</span></div>
          <div class="ep-camera-actions"><button class="ep-secondary" id="ep-start-camera" type="button">Start camera</button><button class="ep-secondary" id="ep-capture-face" type="button" disabled>Capture face</button></div>
          <form id="ep-attendance"><label>Attendance PIN<input class="ep-input" name="pin" inputmode="numeric" pattern="[0-9]{6}" required></label><p id="ep-attendance-message" class="ep-error"></p><button class="ep-primary" id="ep-attendance-submit" disabled>${esc(action.replace('_', ' '))}</button></form>
        </section>
      </div>`);
    bindCamera();
  }

  function renderAttendance() {
    const rows = dashboard.history.map(item => `<tr><td>${esc(item.work_date)}</td><td>${dateTime(item.check_in_at)}</td><td>${dateTime(item.check_out_at)}</td><td>${duration(item.worked_minutes || 0)}</td><td><span class="ep-table-status">${esc(item.status)}</span></td></tr>`).join('');
    employeeShell(`<section class="ep-page-heading"><p class="ep-eyebrow">MY RECORDS</p><h1>Attendance</h1><p>Check-in, check-out and total working time are calculated automatically.</p></section><section class="ep-card"><div class="ep-table-wrap"><table><thead><tr><th>Date</th><th>Check-in</th><th>Check-out</th><th>Total time</th><th>Status</th></tr></thead><tbody>${rows || '<tr><td colspan="5">No attendance recorded.</td></tr>'}</tbody></table></div></section>`);
  }

  function renderProfile() {
    const employee = dashboard.employee;
    const photo = employee.profile_photo_data
      ? `<img class="ep-profile-photo" src="${employee.profile_photo_data}" alt="Profile photo">`
      : '<div class="ep-profile-photo ep-empty-photo">No photo</div>';
    employeeShell(`<section class="ep-page-heading"><p class="ep-eyebrow">READ-ONLY DETAILS</p><h1>My profile</h1><p>Your administrator controls these details. You can only add or replace your profile photo.</p></section>
      <section class="ep-card ep-profile-layout"><div class="ep-photo-column">${photo}<label class="ep-upload">Add photo to profile<input id="ep-profile-file" type="file" accept="image/*"></label><p id="ep-profile-message"></p></div>
        <dl class="ep-profile-details"><div><dt>Full name</dt><dd>${esc(employee.name)}</dd></div><div><dt>Employee ID</dt><dd>${esc(employee.employee_id)}</dd></div><div><dt>Role</dt><dd>${esc(roleLabel(employee.workforce_role))}</dd></div><div><dt>Phone number</dt><dd>${esc(employee.phone || 'Not provided')}</dd></div><div><dt>Email</dt><dd>${esc(employee.email)}</dd></div><div><dt>Company account</dt><dd>${esc(employee.tenant_email || 'MSME Hub')}</dd></div><div><dt>Account status</dt><dd>${esc(employee.status)}</dd></div><div><dt>Face attendance</dt><dd>${dashboard.biometric_ready ? 'Enabled' : 'Not enabled'}</dd></div></dl>
      </section>`);
    bindProfilePhoto();
  }

  function renderAccountControls() {
    employeeShell(`<section class="ep-page-heading"><p class="ep-eyebrow">SECURITY</p><h1>Account controls</h1><p>Change your password or private attendance PIN. Your current password is required.</p></section>
      <section class="ep-card"><form id="ep-account-controls" class="ep-account-form">
        <label>Current password<input class="ep-input" name="current_password" type="password" required autocomplete="current-password"></label>
        <label>New password (optional)<input class="ep-input" name="new_password" type="password" minlength="8" autocomplete="new-password"></label>
        <label>New 6-digit attendance PIN (optional)<input class="ep-input" name="new_pin" inputmode="numeric" pattern="[0-9]{6}" maxlength="6"></label>
        <p id="ep-account-message"></p><button class="ep-primary">Save account controls</button>
      </form></section>`);
    root.querySelector('#ep-account-controls').onsubmit = async event => {
      event.preventDefault();
      const message = root.querySelector('#ep-account-message');
      try {
        await request('/api/employee/account-controls', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(event.target))) });
        event.target.reset();
        message.className = 'ep-success';
        message.textContent = 'Account controls saved.';
      } catch (error) { message.className = 'ep-error'; message.textContent = error.message; }
    };
  }

  async function startCamera() {
    const message = root.querySelector('#ep-attendance-message');
    try {
      stopCamera();
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      const video = root.querySelector('#ep-camera');
      video.srcObject = cameraStream;
      video.hidden = false;
      root.querySelector('#ep-face-preview').hidden = true;
      root.querySelector('#ep-camera-placeholder').hidden = true;
      root.querySelector('#ep-capture-face').disabled = false;
      message.textContent = '';
    } catch (_error) {
      message.textContent = 'Camera access is required. Allow camera permission and try again.';
    }
  }

  function captureCameraFrame() {
    const video = root.querySelector('#ep-camera');
    if (!cameraStream || !video.videoWidth) return;
    const canvas = root.querySelector('#ep-canvas');
    canvas.width = 480;
    canvas.height = Math.round(480 * video.videoHeight / video.videoWidth);
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    capturedFace = canvas.toDataURL('image/jpeg', 0.78);
    const preview = root.querySelector('#ep-face-preview');
    preview.src = capturedFace;
    preview.hidden = false;
    video.hidden = true;
    root.querySelector('#ep-attendance-submit').disabled = false;
    root.querySelector('#ep-capture-face').textContent = 'Retake face';
    stopCamera();
  }

  function bindCamera() {
    capturedFace = '';
    root.querySelector('#ep-start-camera').onclick = startCamera;
    root.querySelector('#ep-capture-face').onclick = async () => {
      if (cameraStream) captureCameraFrame();
      else await startCamera();
    };
    root.querySelector('#ep-attendance').onsubmit = async event => {
      event.preventDefault();
      const message = root.querySelector('#ep-attendance-message');
      if (!capturedFace) {
        message.textContent = 'Capture your current face before continuing.';
        return;
      }
      try {
        await request('/api/employee/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
          body: JSON.stringify({ pin: new FormData(event.target).get('pin'), device_identifier: navigator.userAgent, face_capture: capturedFace })
        });
        currentPage = 'overview';
        await loadDashboard();
      } catch (error) { message.textContent = error.message; }
    };
  }

  function bindProfilePhoto() {
    root.querySelector('#ep-profile-file').onchange = event => {
      const file = event.target.files?.[0];
      const message = root.querySelector('#ep-profile-message');
      if (!file) return;
      if (!file.type.startsWith('image/') || file.size > 1100000) {
        message.textContent = 'Choose an image smaller than 1 MB.';
        return;
      }
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          await request('/api/employee/profile-photo', {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profile_photo: reader.result })
          });
          await loadDashboard('profile');
        } catch (error) { message.textContent = error.message; }
      };
      reader.readAsDataURL(file);
    };
  }

  function renderPage() {
    if (currentPage === 'attendance') renderAttendance();
    else if (currentPage === 'profile') renderProfile();
    else if (currentPage === 'account') renderAccountControls();
    else renderOverview();
  }

  async function loadDashboard(page = currentPage) {
    try {
      dashboard = await request('/api/employee/dashboard');
      currentPage = page;
      renderPage();
    } catch (_error) {
      sessionStorage.removeItem('msme-employee-token');
      employeeLogin();
    }
  }

  function openEmployee() {
    if (!apiBase()) {
      alert('Employee API URL is not configured. Add MSME_EMPLOYEE_API_URL to Streamlit secrets.');
      return;
    }
    authToken() ? loadDashboard() : employeeLogin();
  }

  function employeeAccessGroups(employees) {
    const groups = [
      ['TEMPORARY', 'Temporary Worker Access'],
      ['WORKER', 'Worker Access'],
      ['STAFF', 'Staff Access']
    ];
    return `<div class="employee-access-groups">${groups.map(([role, title]) => {
      const records = employees.filter(employee => employee.workforce_role === role);
      const rows = records.map(employee => `<div class="ep-row"><div><b>${esc(employee.name)}</b><small>${esc(employee.employee_id)} · ${esc(employee.email)} · ${esc(employee.status)}</small></div><span><button class="secondary ea-credentials" data-account-id="${employee.id}">Set credentials</button> <button class="secondary ea-status" data-account-id="${employee.id}" data-next-status="${employee.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED'}">${employee.status === 'SUSPENDED' ? 'Restore' : 'Suspend'}</button></span></div>`).join('');
      return `<section class="panel employee-access-group"><div class="panel-header"><h2>${title}</h2><span class="tag neutral">${records.length} account${records.length === 1 ? '' : 's'}</span></div>${rows || '<p class="empty">No accounts in this section.</p>'}</section>`;
    }).join('')}</div>`;
  }

  async function adminView() {
    const page = document.querySelector('#view-root');
    if (!page || document.body.dataset.employeeAccess !== 'yes') return;
    page.innerHTML = `<div class="page-heading"><div><p class="eyebrow">EMPLOYEE LOGIN SETUP</p><h1>Employee Login Setup</h1><p>Create employee access invitations for Workers, Staff and Temporary Workers.</p></div></div>
      <section class="panel"><form id="ea-create" class="form-grid"><label>NAME<input name="name" required></label><label>EMPLOYEE ID<input name="employee_id" required></label><label>EMAIL<input name="email" type="email" required></label><label>ROLE<select name="workforce_role"><option>WORKER</option><option>STAFF</option><option>TEMPORARY</option></select></label><button class="primary">Create invitation</button></form><p id="ea-message"></p></section>
      <section class="panel"><h2>Employee accounts</h2><div class="employee-access-list" id="ea-list">Loading…</div></section>`;
    const adminToken = sessionStorage.getItem('msme-admin-api-token') || '';
    try {
      const result = await request('/api/admin/employee-accounts', {}, adminToken);
      page.querySelector('#ea-list').innerHTML = employeeAccessGroups(result.employees);
      page.querySelectorAll('.ea-status').forEach(button => button.onclick = async event => {
        event.stopPropagation();
        await request(`/api/admin/employee-accounts/${button.dataset.accountId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: button.dataset.nextStatus, reason: 'Administrator action' }) }, adminToken);
        adminView();
      });
      page.querySelectorAll('.ea-credentials').forEach(button => button.onclick = async event => {
        event.stopPropagation();
        const password = prompt('Enter a new login password (minimum 8 characters):');
        if (password === null) return;
        const pin = prompt('Enter a new 6-digit attendance PIN:');
        if (pin === null) return;
        try {
          await request(`/api/admin/employee-accounts/${button.dataset.accountId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password, pin }) }, adminToken);
          alert('Employee credentials saved. The employee can sign in now.');
          adminView();
        } catch (error) { alert(error.message); }
      });
    } catch (error) {
      page.querySelector('#ea-list').innerHTML = `<p class="login-error">${esc(error.message)}</p>`;
    }
    page.querySelector('#ea-create').onsubmit = async event => {
      event.preventDefault();
      try {
        const result = await request('/api/admin/employee-accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(event.target))) }, adminToken);
        page.querySelector('#ea-message').textContent = result.credentials_created
          ? 'Active employee login created. The employee can sign in now.'
          : `Invitation token (valid 48 hours): ${result.invite_token}`;
        event.target.reset();
      } catch (error) { page.querySelector('#ea-message').textContent = error.message; }
    };
  }

  document.addEventListener('click', event => {
    const navigation = event.target.closest('[data-view]');
    if (!navigation) return;
    if (navigation.dataset.view === 'employeeaccess') {
      document.body.dataset.employeeAccess = 'yes';
      setTimeout(adminView, 0);
    } else delete document.body.dataset.employeeAccess;
  });

  window.MSMEEmployeePortal = {
    open: openEmployee,
    title: 'Employee login and attendance dashboard'
  };

  if (authToken() && apiBase()) {
    setTimeout(() => loadDashboard(sessionStorage.getItem('msme-employee-page') || 'overview'), 0);
  }
})();
