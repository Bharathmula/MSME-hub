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
  let attendanceCalendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let selectedAttendanceDate = new Date().toISOString().slice(0, 10);
  const defaultGlobalSearchHandler = document.getElementById('global-search')?.oninput || null;

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

  function employeeInvitationUrl(inviteToken, employeeEmail) {
    let source = document.referrer || window.location.href;
    try {
      const url = new URL(source);
      if (url.hostname.endsWith('.streamlit.app')) url.pathname = '/';
      url.search = '';
      url.hash = '';
      url.searchParams.set('employee_invite', inviteToken);
      url.searchParams.set('employee_email', employeeEmail);
      return url.toString();
    } catch (_error) { return ''; }
  }

  function invitationShareButtons(invitationUrl, employeeName, employeeEmail) {
    const subject = 'Your MSME Hub employee invitation';
    const message = `Hello ${employeeName},\n\nUse this secure invitation to create your MSME Hub employee account:\n${invitationUrl}\n\nThis invitation is valid for 48 hours.`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    const mailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(employeeEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    const whatsappIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a9.7 9.7 0 0 0-8.4 14.6L2 22l5.5-1.5A9.8 9.8 0 1 0 12 2Zm0 17.8c-1.5 0-3-.4-4.2-1.2l-.3-.2-3.2.9.9-3.1-.2-.3A7.8 7.8 0 1 1 12 19.8Zm4.3-5.8c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.6.1l-.7.9c-.1.2-.3.2-.5.1-1.4-.7-2.4-1.3-3.3-2.9-.2-.3.2-.5.6-1 .1-.2.1-.4 0-.5l-.7-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.8.8-1.1 1.9-.7 3 1 2.9 3.5 5.1 6.5 5.9 1.1.3 2.1.2 2.9-.2.9-.4 1.4-1.4 1.4-2.1 0-.3-.1-.5-.3-.6Z"/></svg>`;
    const mailIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 5h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm9 7.2L20.4 7H3.6L12 12.2ZM3 17h18V9.2l-8.5 5.2a1 1 0 0 1-1 0L3 9.2V17Z"/></svg>`;
    return `<div class="ea-share-actions"><b>Invitation created (valid 48 hours).</b><p>Choose how you want to send it:</p><a class="secondary ea-share-button ea-whatsapp" href="${esc(whatsappUrl)}" target="_blank" rel="noopener">${whatsappIcon}<span>Send via WhatsApp</span></a><a class="secondary ea-share-button ea-mail" href="${esc(mailUrl)}" target="_blank" rel="noopener">${mailIcon}<span>Send via Gmail</span></a></div>`;
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
      </form><hr><h2>Create employee account</h2>
      <form id="ep-activate">
        <label>Invitation token<input class="ep-input" name="invite_token" required></label>
        <label>Phone number / email<input class="ep-input" name="contact" required></label>
        <label>Create password<input class="ep-input" name="password" type="password" minlength="8" required></label>
        <button class="ep-secondary">Create account</button>
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
        alert('Account created successfully. Sign in now.');
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
        <header class="ep-topbar"><div><small>${esc(roleLabel(employee.workforce_role))} dashboard</small><b>${esc(employee.employee_id)}</b></div></header>
        ${content}
      </main>
    </div>`;
    root.querySelector('#ep-logout').onclick = () => {
      stopCamera();
      sessionStorage.removeItem('msme-employee-token');
      sessionStorage.removeItem('msme-employee-page');
      root.style.display = 'none';
      root.innerHTML = '';
      window.dispatchEvent(new CustomEvent('msme-employee-session-expired'));
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
    employeeShell(`<section class="ep-page-heading"><p class="ep-eyebrow">TODAY</p><h1>${action === 'CHECK_IN' ? 'Ready to check in?' : 'Ready to check out?'}</h1><p>Capture a current live face photo to record your attendance.</p></section>
      <div class="ep-overview-grid">
        <section class="ep-card"><h2>Attendance status</h2><div class="ep-status ${(today?.status || 'not-started').toLowerCase()}">${esc(today?.status || 'NOT STARTED')}</div>
          <dl class="ep-details"><div><dt>Check-in</dt><dd>${dateTime(today?.check_in_at)}</dd></div><div><dt>Check-out</dt><dd>${dateTime(today?.check_out_at)}</dd></div><div><dt>Total time</dt><dd>${duration(today?.worked_minutes || 0)}</dd></div></dl>
        </section>
        <section class="ep-card ep-camera-card"><h2>${esc(action.replace('_', ' '))} face capture</h2>
          <div class="ep-camera-stage"><video id="ep-camera" autoplay playsinline></video><canvas id="ep-canvas" hidden></canvas><img id="ep-face-preview" alt="Captured face" hidden><span id="ep-camera-placeholder">Camera preview</span></div>
          <div class="ep-camera-actions"><button class="ep-secondary" id="ep-start-camera" type="button">Start camera</button><button class="ep-secondary" id="ep-capture-face" type="button" disabled>Capture face</button></div>
          <form id="ep-attendance"><p id="ep-attendance-message" class="ep-error"></p><button class="ep-primary" id="ep-attendance-submit" disabled>${esc(action.replace('_', ' '))}</button></form>
        </section>
      </div>`);
    bindCamera();
  }

  function renderAttendance() {
    const rows = dashboard.history.map(item => `<tr><td>${esc(item.work_date)}</td><td>${dateTime(item.check_in_at)}</td><td>${dateTime(item.check_out_at)}</td><td>${duration(item.worked_minutes || 0)}</td><td><span class="ep-table-status">${esc(item.status)}</span></td></tr>`).join('');
    const monthStart = new Date(attendanceCalendarMonth);
    const year = monthStart.getFullYear(), month = monthStart.getMonth(), days = new Date(year, month + 1, 0).getDate(), offset = (monthStart.getDay() + 6) % 7;
    const monthOptions = Array.from({length: 12}, (_, index) => `<option value="${index}" ${index === month ? 'selected' : ''}>${new Date(2000, index, 1).toLocaleString('en-IN', {month:'long'})}</option>`).join('');
    const yearOptions = Array.from({length: 11}, (_, index) => year - 5 + index).map(optionYear => `<option value="${optionYear}" ${optionYear === year ? 'selected' : ''}>${optionYear}</option>`).join('');
    const byDate = new Map(dashboard.history.map(item => [item.work_date, item]));
    const todayKey = new Date().toISOString().slice(0, 10);
    const calendar = `${'<i></i>'.repeat(offset)}${Array.from({length:days},(_,index)=>{const day=index+1,key=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`,record=byDate.get(key),isPast=key<todayKey,status=record?(record.status==='COMPLETED'?'present':'checked-in'):(isPast?'absent':'future'),label=record?(record.status==='COMPLETED'?'Present':'Checked in'):(isPast?'Absent':'—');return `<button type="button" class="ep-calendar-day attendance-day ${status} ${key===selectedAttendanceDate?'selected':''} ${key===todayKey?'today-date':''}" data-ep-attendance-date="${key}"><span class="calendar-date-number">${day}</span><small>${label}</small>${key===todayKey?'<span class="today-check">TODAY</span>':''}</button>`}).join('')}`;
    const selected = byDate.get(selectedAttendanceDate);
    const selectedStatus = selected ? (selected.status === 'COMPLETED' ? 'Present' : 'Checked in') : (selectedAttendanceDate < todayKey ? 'Absent' : 'No attendance recorded');
    const selectedDetails = `<div class="ep-selected-day"><div><span>Selected date</span><b>${esc(selectedAttendanceDate)}</b></div><div><span>Status</span><b class="${selectedStatus==='Present'?'present-text':selectedStatus==='Absent'?'absent-text':''}">${esc(selectedStatus)}</b></div><div><span>Check-in</span><b>${dateTime(selected?.check_in_at)}</b></div><div><span>Check-out</span><b>${dateTime(selected?.check_out_at)}</b></div><div><span>Total time</span><b>${duration(selected?.worked_minutes || 0)}</b></div></div>`;
    employeeShell(`<section class="ep-page-heading"><p class="ep-eyebrow">MY RECORDS</p><h1>Attendance</h1><p>Choose a month and click a date to see that day's attendance below the calendar.</p></section><section class="ep-card ep-personal-calendar attendance-calendar-panel advanced-calendar-panel"><div class="advanced-calendar-toolbar"><button type="button" class="calendar-nav-button" id="ep-calendar-previous" aria-label="Previous month">‹</button><div class="calendar-title-block"><small>SELECTED MONTH</small><h2>${monthStart.toLocaleString('en-IN',{month:'long',year:'numeric'})}</h2></div><button type="button" class="calendar-nav-button" id="ep-calendar-next" aria-label="Next month">›</button><div class="calendar-month-year-picker"><label>Month<select id="ep-calendar-month">${monthOptions}</select></label><label>Year<select id="ep-calendar-year">${yearOptions}</select></label><button type="button" id="ep-calendar-today" class="calendar-today-button">Today</button></div></div><div class="ep-calendar-weekdays">${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day=>`<b>${day}</b>`).join('')}</div><div class="ep-calendar-grid attendance-calendar">${calendar}</div><div class="calendar-legend"><span><i class="legend-today">✓</i> Today</span><span><i class="ep-legend-present"></i> Present</span><span><i class="ep-legend-absent"></i> Absent</span><b>Click a date for details</b></div>${selectedDetails}</section><section class="ep-card"><div class="ep-table-wrap"><table><thead><tr><th>Date</th><th>Check-in</th><th>Check-out</th><th>Total time</th><th>Status</th></tr></thead><tbody>${rows || '<tr><td colspan="5">No attendance recorded.</td></tr>'}</tbody></table></div></section>`);
    root.querySelector('#ep-calendar-previous').onclick=()=>{attendanceCalendarMonth=new Date(year,month-1,1);selectedAttendanceDate=`${attendanceCalendarMonth.getFullYear()}-${String(attendanceCalendarMonth.getMonth()+1).padStart(2,'0')}-01`;renderAttendance()};
    root.querySelector('#ep-calendar-next').onclick=()=>{attendanceCalendarMonth=new Date(year,month+1,1);selectedAttendanceDate=`${attendanceCalendarMonth.getFullYear()}-${String(attendanceCalendarMonth.getMonth()+1).padStart(2,'0')}-01`;renderAttendance()};
    const changeCalendarMonth=()=>{const nextYear=Number(root.querySelector('#ep-calendar-year').value),nextMonth=Number(root.querySelector('#ep-calendar-month').value);attendanceCalendarMonth=new Date(nextYear,nextMonth,1);selectedAttendanceDate=`${nextYear}-${String(nextMonth+1).padStart(2,'0')}-01`;renderAttendance()};
    root.querySelector('#ep-calendar-month').onchange=changeCalendarMonth;
    root.querySelector('#ep-calendar-year').onchange=changeCalendarMonth;
    root.querySelector('#ep-calendar-today').onclick=()=>{attendanceCalendarMonth=new Date();selectedAttendanceDate=new Date().toISOString().slice(0,10);renderAttendance()};
    root.querySelectorAll('[data-ep-attendance-date]').forEach(button=>button.onclick=()=>{selectedAttendanceDate=button.dataset.epAttendanceDate;renderAttendance()});
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
      const captureButton = root.querySelector('#ep-capture-face');
      captureButton.disabled = false;
      captureButton.textContent = 'Capture face';
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
    root.querySelector('#ep-capture-face').textContent = 'Retake';
    const message = root.querySelector('#ep-attendance-message');
    message.className = 'ep-success';
    message.textContent = 'Captured';
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
        const action = dashboard.next_action;
        await request('/api/employee/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
          body: JSON.stringify({ device_identifier: navigator.userAgent, face_capture: capturedFace })
        });
        alert(`${action === 'CHECK_IN' ? 'Check-in' : 'Check-out'} captured successfully.`);
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
      root.style.display = 'none';
      root.innerHTML = '';
      window.dispatchEvent(new CustomEvent('msme-employee-session-expired'));
    }
  }

  function openEmployee() {
    if (!apiBase()) {
      alert('Employee API URL is not configured. Add MSME_EMPLOYEE_API_URL to Streamlit secrets.');
      return;
    }
    if (authToken()) loadDashboard();
    else window.dispatchEvent(new CustomEvent('msme-employee-session-expired'));
  }

  function employeeAccessGroups(employees) {
    const groups = [
      ['TEMPORARY', 'Temporary Worker Access'],
      ['WORKER', 'Worker Access'],
      ['STAFF', 'Staff Access']
    ];
    return `<div class="employee-access-groups">${groups.map(([role, title]) => {
      const records = employees.filter(employee => employee.workforce_role === role);
      const rows = records.map(employee => `<div class="ep-row"><div><b>${esc(employee.name)}</b><small>${esc(employee.employee_id)} · ${esc(employee.email)} · ${esc(employee.status)}</small></div><span class="ea-account-actions"><button class="secondary ea-reset-password" data-account-id="${employee.id}">Password reset link</button><button class="secondary ea-status" data-account-id="${employee.id}" data-next-status="${employee.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED'}">${employee.status === 'SUSPENDED' ? 'Restore' : 'Suspend'}</button></span></div>`).join('');
      return `<section class="panel employee-access-group"><div class="panel-header"><h2>${title}</h2><span class="tag neutral">${records.length} account${records.length === 1 ? '' : 's'}</span></div>${rows || '<p class="empty">No accounts in this section.</p>'}</section>`;
    }).join('')}</div>`;
  }

  function existingWorkforceProfiles() {
    return [
      ...people.filter(person => ['Worker', 'Staff'].includes(person.role)),
      ...temporaryWorkers.map(person => ({ ...person, role: 'Temporary Worker' })),
    ];
  }

  function employeeRoleValue(person) {
    return person.role === 'Temporary Worker' ? 'TEMPORARY' : String(person.role || '').toUpperCase();
  }

  function fillEmployeeInvitationForm(person) {
    const form = document.querySelector('#ea-create');
    if (!form || !person) return;
    form.elements.name.value = person.name || '';
    form.elements.email.value = person.email || '';
    form.elements.employee_id.value = person.id || '';
    form.elements.workforce_role.value = employeeRoleValue(person);
    document.querySelector('#ea-selected-profile').textContent = `${person.name} · ${person.id} · ${person.role} · ${person.email || 'No email saved'}`;
  }

  function workforceInvitationColumns(profiles) {
    const groups = [
      ['WORKER', 'Workers'],
      ['STAFF', 'Staff'],
      ['TEMPORARY', 'Temporary Workers']
    ];
    return groups.map(([role, title]) => {
      const records = profiles.filter(person => employeeRoleValue(person) === role);
      const names = records.map(person => `<option value="${esc(person.id)}">${esc(person.name)} · ${esc(person.id)}</option>`).join('');
      const emails = records.filter(person => person.email).map(person => `<option value="${esc(person.id)}">${esc(person.email)} · ${esc(person.name)}</option>`).join('');
      return `<section class="ea-workforce-column">
        <h3>${title}</h3>
        <label>NAME<select class="ea-person-selector"><option value="">Select ${title.toLowerCase()} name ↓</option>${names}</select></label>
        <label>EMAIL<select class="ea-person-selector"><option value="">Select ${title.toLowerCase()} email ↓</option>${emails}</select></label>
      </section>`;
    }).join('');
  }

  function employeeSearchResults(query) {
    const results = document.querySelector('#ea-profile-results');
    if (!results) return;
    const normalized = String(query || '').trim().toLowerCase();
    const profiles = existingWorkforceProfiles().filter(person => !normalized || JSON.stringify(person).toLowerCase().includes(normalized));
    results.innerHTML = profiles.map(person => `<button type="button" class="ea-profile-result" data-ea-profile-id="${esc(person.id)}"><b>${esc(person.name)}</b><span>${esc(person.id)} · ${esc(person.email || 'No email')} · ${esc(person.role)}</span><i>Use this profile →</i></button>`).join('') || '<p class="empty">No existing worker, staff or temporary-worker profile matches this search.</p>';
    results.querySelectorAll('[data-ea-profile-id]').forEach(button => button.onclick = () => fillEmployeeInvitationForm(existingWorkforceProfiles().find(person => person.id === button.dataset.eaProfileId)));
  }

  async function adminView() {
    const page = document.querySelector('#view-root');
    if (!page || document.body.dataset.employeeAccess !== 'yes') return;
    if (!apiBase()) {
      page.innerHTML = `<div class="page-heading"><div><p class="eyebrow">EMPLOYEE LOGIN SETUP</p><h1>Employee Login Setup</h1></div></div><section class="panel"><h2>Public employee service is not connected</h2><p>Employee accounts and attendance require the public Python backend. Deploy <b>backend.py</b>, then add its HTTPS address to Streamlit secrets as <b>MSME_EMPLOYEE_API_URL</b>.</p><p>This replaces the unclear “Unsupported request” message. Clerk is not required.</p></section>`;
      return;
    }
    const profiles = existingWorkforceProfiles();
    page.innerHTML = `<div class="page-heading"><div><p class="eyebrow">EMPLOYEE LOGIN SETUP</p><h1>Employee Login Setup</h1><p>Select an existing Worker, Staff or Temporary Worker. Their saved details will fill automatically.</p></div></div>
      <section class="panel"><form id="ea-create"><div class="ea-workforce-columns">${workforceInvitationColumns(profiles)}</div><input type="hidden" name="name" required><input type="hidden" name="email" required><input type="hidden" name="employee_id" required><input type="hidden" name="workforce_role" required><p id="ea-selected-profile">No employee selected.</p><button class="primary">Create invitation</button></form><p id="ea-message"></p></section>
      <section class="panel"><h2>Employee accounts</h2><div class="employee-access-list" id="ea-list">Loading…</div></section>`;
    page.querySelectorAll('.ea-person-selector').forEach(select => select.onchange = event => {
      if (!event.target.value) return;
      page.querySelectorAll('.ea-person-selector').forEach(other => { if (other !== event.target) other.value = ''; });
      fillEmployeeInvitationForm(existingWorkforceProfiles().find(person => person.id === event.target.value));
    });
    const adminToken = sessionStorage.getItem('msme-admin-api-token') || '';
    try {
      const result = await request('/api/admin/employee-accounts', {}, adminToken);
      page.querySelector('#ea-list').innerHTML = employeeAccessGroups(result.employees);
      page.querySelectorAll('.ea-status').forEach(button => button.onclick = async event => {
        event.stopPropagation();
        await request(`/api/admin/employee-accounts/${button.dataset.accountId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: button.dataset.nextStatus, reason: 'Administrator action' }) }, adminToken);
        adminView();
      });
      page.querySelectorAll('.ea-reset-password').forEach(button => button.onclick = async event => {
        event.stopPropagation();
        try {
          const reset = await request(`/api/admin/employee-accounts/${button.dataset.accountId}/password-reset`, { method: 'POST' }, adminToken);
          const employee = reset.employee;
          const invitationUrl = employeeInvitationUrl(reset.invite_token, employee.email);
          page.querySelector('#ea-message').innerHTML = invitationShareButtons(invitationUrl, employee.name, employee.email).replace('Invitation created', 'Password reset link created');
          page.querySelector('#ea-message').scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (error) { page.querySelector('#ea-message').textContent = error.message; }
      });
    } catch (error) {
      page.querySelector('#ea-list').innerHTML = `<p class="login-error">${esc(error.message)}</p>`;
    }
    page.querySelector('#ea-create').onsubmit = async event => {
      event.preventDefault();
      try {
        const fields = Object.fromEntries(new FormData(event.target));
        const result = await request('/api/admin/employee-accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) }, adminToken);
        const invitationUrl = employeeInvitationUrl(result.invite_token, fields.email);
        page.querySelector('#ea-message').innerHTML = result.credentials_created
          ? 'Active employee login created. The employee can sign in now.'
          : invitationShareButtons(invitationUrl, fields.name, fields.email);
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
    } else {
      delete document.body.dataset.employeeAccess;
      const globalSearch = document.getElementById('global-search');
      if (globalSearch) globalSearch.oninput = defaultGlobalSearchHandler;
    }
  });

  window.MSMEEmployeePortal = {
    open: openEmployee,
    title: 'Employee login and attendance dashboard'
  };

  if (authToken() && apiBase() && document.querySelector('#login-screen')?.classList.contains('hidden')) {
    setTimeout(() => loadDashboard(sessionStorage.getItem('msme-employee-page') || 'overview'), 0);
  }
})();
