/* Company-level attendance integrations, historical imports and reports. */
(function () {
  let settingsTab = null;
  let settingsWasOpen = false;
  let subscriptionState = null;
  let subscriptionPlans = [];
  let selectedPlan = null;
  let selectedBillingCycle = 'monthly';
  let subscriptionLoading = false;
  let reportType = 'monthly';
  let reportDate = new Date().toISOString().slice(0, 10);
  let integrationDetailPage = null;
  let modeSelectionMessage = '';

  function settingsKey() {
    return tenantKey('attendance-integration-settings');
  }

  function importHistoryKey() {
    return tenantKey('attendance-import-history');
  }

  function readJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch (_) {
      return fallback;
    }
  }

  function integrationSettings() {
    const stored = readJson(settingsKey(), {});
    const storedModes = Array.isArray(stored.modes) ? stored.modes.filter(Boolean) : ['face'];
    const selectedMode = storedModes.length ? storedModes[storedModes.length - 1] : null;
    return {
      modes: selectedMode ? [selectedMode] : [],
      provider: '',
      softwareUrl: '',
      endpoint: '',
      deviceId: '',
      branchId: '',
      apiUsername: '',
      secretReference: '',
      syncInterval: '15',
      ...stored,
      modes: selectedMode ? [selectedMode] : [],
    };
  }

  function saveIntegrationSettings(value) {
    localStorage.setItem(settingsKey(), JSON.stringify(value));
  }

  function updateEmployeeLoginSetupVisibility() {
    const enabled = integrationSettings().modes.includes('face');
    const navigation = document.querySelector('.nav-link[data-view="employeeaccess"]');
    if (navigation) {
      navigation.hidden = false;
      navigation.disabled = !enabled;
      navigation.classList.toggle('employee-setup-disabled', !enabled);
      navigation.setAttribute('aria-disabled', String(!enabled));
      navigation.title = enabled ? 'Open Employee Login Setup' : 'Turn on Face Authentication in Settings to enable Employee Login Setup';
    }
    return enabled;
  }

  function allAttendanceRows() {
    return (Array.isArray(attendanceLog) ? attendanceLog : []).flatMap(day =>
      (day.records || []).map(record => ({ ...record, date: day.date })),
    );
  }

  function normalizedStatus(value) {
    const status = String(value || '').trim().toLowerCase();
    if (status === 'present' || status === 'p') return 'Present';
    if (status === 'leave' || status === 'on leave' || status === 'l') return 'On leave';
    return 'Absent';
  }

  function parseClockMinutes(value) {
    const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
    if (!match) return null;
    let hour = Number(match[1]);
    const minute = Number(match[2]);
    if (match[3]) {
      hour %= 12;
      if (match[3].toUpperCase() === 'PM') hour += 12;
    }
    return hour * 60 + minute;
  }

  function shiftBounds(record) {
    const shift = String(record.shift || '09:00 AM - 06:00 PM').split(/\s+-\s+/);
    return [parseClockMinutes(shift[0]), parseClockMinutes(shift[1])];
  }

  function csvCells(line) {
    const values = [];
    let value = '';
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"' && quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === ',' && !quoted) {
        values.push(value.trim());
        value = '';
      } else {
        value += char;
      }
    }
    values.push(value.trim());
    return values;
  }

  function importCsv(text, filename) {
    const lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) throw new Error('The sheet must contain a header and at least one attendance row.');
    const headers = csvCells(lines[0]).map(value => value.toLowerCase().replace(/[^a-z0-9]+/g, '_'));
    const required = ['date', 'name', 'status'];
    if (required.some(field => !headers.includes(field))) {
      throw new Error('Required columns: Date, Name and Status. Optional: ID, Role, Check In, Check Out, Shift, Work.');
    }
    const rows = lines.slice(1).map(line => {
      const cells = csvCells(line);
      return Object.fromEntries(headers.map((header, index) => [header, cells[index] || '']));
    });
    let imported = 0;
    rows.forEach(row => {
      const date = String(row.date || '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
      const record = {
        id: row.id || row.employee_id || '',
        name: row.name,
        role: row.role || 'Worker',
        status: normalizedStatus(row.status),
        shift: row.shift || '09:00 AM - 06:00 PM',
        login: row.check_in || row.checkin || row.login || '',
        logout: row.check_out || row.checkout || row.logout || '',
        work: row.work || row.working_hours || '',
        source: 'Spreadsheet import',
      };
      let day = attendanceLog.find(item => item.date === date);
      if (!day) {
        day = { date, records: [] };
        attendanceLog.push(day);
      }
      const index = day.records.findIndex(item =>
        (record.id && item.id === record.id) ||
        (!record.id && String(item.name || '').toLowerCase() === record.name.toLowerCase()),
      );
      if (index >= 0) day.records[index] = { ...day.records[index], ...record };
      else day.records.push(record);
      imported += 1;
    });
    if (!imported) throw new Error('No rows had a valid YYYY-MM-DD date.');
    const history = readJson(importHistoryKey(), []);
    history.unshift({ filename, rows: imported, importedAt: new Date().toISOString() });
    localStorage.setItem(importHistoryKey(), JSON.stringify(history.slice(0, 30)));
    save();
    return imported;
  }

  function integrationPanel() {
    const current = integrationSettings();
    const modeCard = (mode, title, description) => {
      const selected = current.modes.includes(mode);
      return `<article class="settings-mode-card ${selected ? 'selected' : ''}" data-mode-card="${mode}">
        <span><b>${title}</b><small>${description}</small></span>
        <div class="settings-mode-actions">${selected && ['biometric','spreadsheet'].includes(mode) ? `<button type="button" class="settings-mode-open" data-open-integration-detail="${mode}">Open setup</button>` : ''}<button type="button" class="settings-mode-select ${selected ? 'selected' : ''}" data-attendance-mode="${mode}" aria-pressed="${selected}">${selected ? 'Turn off' : 'Select'}</button></div>
      </article>`;
    };
    const biometricPage = `<section class="settings-detail-page" data-integration-detail="biometric">
      <div class="settings-detail-heading"><button type="button" class="settings-back-button" data-close-integration-detail>← Attendance options</button><div><h2>Biometric Software Connection</h2><p>Enter the connection information supplied by the biometric software provider.</p></div></div>
      <div class="settings-form-grid">
        <label>BIOMETRIC SOFTWARE / PROVIDER<input id="biometric-provider" value="${esc(current.provider)}" placeholder="Example: BioMax Smart Office Suite"></label>
        <label>SOFTWARE PORTAL URL<input type="url" id="biometric-software-url" value="${esc(current.softwareUrl)}" placeholder="https://attendance.company.com"></label>
        <label>API OR SYNC ENDPOINT<input type="url" id="biometric-endpoint" value="${esc(current.endpoint)}" placeholder="https://provider.example/api/attendance"></label>
        <label>DEVICE / SITE ID<input id="biometric-device-id" value="${esc(current.deviceId)}" placeholder="Device serial number or site ID"></label>
        <label>BRANCH / LOCATION ID<input id="biometric-branch-id" value="${esc(current.branchId)}" placeholder="Factory or branch identifier"></label>
        <label>API USERNAME<input id="biometric-api-username" value="${esc(current.apiUsername)}" autocomplete="off" placeholder="Integration username"></label>
        <label>CREDENTIAL SECRET NAME<input id="biometric-secret-reference" value="${esc(current.secretReference)}" autocomplete="off" placeholder="Example: BIOMAX_API_TOKEN"></label>
        <label>SYNC INTERVAL<select id="biometric-sync-interval">${['5','15','30','60'].map(value => `<option value="${value}" ${current.syncInterval === value ? 'selected' : ''}>Every ${value} minutes</option>`).join('')}</select></label>
      </div>
      <div class="settings-note"><b>Security:</b> do not enter the actual biometric password or API token in this browser. Store it in Render as a secret environment variable and enter only its variable name above.</div>
      <div class="settings-actions"><button class="primary" id="save-attendance-settings">Save biometric settings</button><span id="settings-save-status"></span></div>
    </section>`;
    const spreadsheetPage = `<section class="settings-detail-page settings-import-box" data-integration-detail="spreadsheet">
      <div class="settings-detail-heading"><button type="button" class="settings-back-button" data-close-integration-detail>← Attendance options</button><div><h2>CSV Report / Excel Sheet</h2><p>Upload previous attendance exported from Excel or another attendance system.</p></div></div>
      <div class="settings-upload-guide"><b>Required columns</b><span>Date, Name and Status</span><b>Optional columns</b><span>ID, Role, Check In, Check Out, Shift and Working Hours</span></div>
      <label>CSV FILE<input type="file" id="attendance-import-file" accept=".csv,text/csv"></label>
      <div class="settings-actions"><button class="secondary" id="download-attendance-template">Download CSV template</button><button class="primary" id="import-attendance-sheet">Import past data</button></div>
      <p class="settings-import-status" id="attendance-import-status"></p>
    </section>`;
    const detail = integrationDetailPage === 'biometric' && current.modes.includes('biometric')
      ? biometricPage
      : integrationDetailPage === 'spreadsheet' && current.modes.includes('spreadsheet') ? spreadsheetPage : '';
    return `<section class="panel settings-integration-panel">
      <div class="panel-header"><div><h2>Attendance Integration</h2><p>Choose one or more attendance sources for this company.</p></div><span class="tag complete">Company settings</span></div>
      <div class="settings-mode-grid">
        ${modeCard('biometric', 'Biometric', 'Connect a fingerprint, card or device provider through its API or scheduled export.')}
        ${modeCard('face', 'Face Authentication', 'Use the existing face check-in and check-out workflow in this application.')}
        ${modeCard('manual', 'Manual', 'Allow authorised admins to enter or correct attendance in Attendance Calendar.')}
        ${modeCard('spreadsheet', 'CSV Report / Excel Sheet', 'Import past attendance exported from Excel or another attendance system.')}
      </div>
      <p class="settings-import-status" id="attendance-mode-status">${esc(modeSelectionMessage)}</p>
      ${detail}
      ${!detail ? '<p class="settings-selection-help">Select Biometric or CSV Report / Excel Sheet to open its setup page. Face Authentication opens Employee Login Setup and controls its sidebar visibility.</p>' : ''}
    </section>`;
  }

  function clockParts24(value, fallback) {
    const [hourValue, minuteValue] = String(value || fallback).slice(0, 5).split(':').map(Number);
    const period = hourValue >= 12 ? 'PM' : 'AM';
    const hour = hourValue % 12 || 12;
    return { hour: String(hour).padStart(2, '0'), minute: String(minuteValue || 0).padStart(2, '0'), period };
  }

  function clockSelector(prefix, label, value, fallback) {
    const selected = clockParts24(value, fallback);
    const hours = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'));
    const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));
    return `<fieldset class="shift-clock-field"><legend>${label}</legend>
      <label>HOUR<select id="${prefix}-hour">${hours.map(hour => `<option ${hour === selected.hour ? 'selected' : ''}>${hour}</option>`).join('')}</select></label>
      <label>MINUTE<select id="${prefix}-minute">${minutes.map(minute => `<option ${minute === selected.minute ? 'selected' : ''}>${minute}</option>`).join('')}</select></label>
      <label>AM / PM<select id="${prefix}-period"><option ${selected.period === 'AM' ? 'selected' : ''}>AM</option><option ${selected.period === 'PM' ? 'selected' : ''}>PM</option></select></label>
    </fieldset>`;
  }

  function selectedClock24(prefix) {
    let hour = Number(document.querySelector(`#${prefix}-hour`)?.value || 0);
    const minute = document.querySelector(`#${prefix}-minute`)?.value || '00';
    const period = document.querySelector(`#${prefix}-period`)?.value || 'AM';
    if (period === 'PM' && hour < 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${minute}`;
  }

  function companyShiftPanel() {
    const start = String(admin.shift_start || '09:00').slice(0, 5);
    const end = String(admin.shift_end || '18:00').slice(0, 5);
    return `<section class="panel settings-shift-panel">
      <div class="panel-header"><div><h2>Shift Timings</h2><p>Set the standard company shift in 12-hour AM/PM format.</p></div><span class="tag complete">Company-wide</span></div>
      <div class="shift-clock-grid">${clockSelector('company-shift-start', 'SHIFT START', start, '09:00')}${clockSelector('company-shift-end', 'SHIFT END', end, '18:00')}</div>
      <div class="settings-note"><b>Company shift:</b> saving applies the timing to every existing workforce profile and becomes the default for newly created employees.</div>
      <div class="settings-actions"><button class="primary" id="save-company-shift">Save shift timings</button><span id="shift-save-status"></span></div>
    </section>`;
  }

  function filteredReportRows() {
    const all = allAttendanceRows();
    const chosen = new Date(`${reportDate}T00:00:00`);
    let rows = all;
    if (reportType === 'daily') rows = all.filter(row => row.date === reportDate);
    if (reportType === 'weekly') {
      const start = new Date(chosen);
      start.setDate(chosen.getDate() - 6);
      const startKey = start.toISOString().slice(0, 10);
      rows = all.filter(row => row.date >= startKey && row.date <= reportDate);
    }
    if (reportType === 'monthly') rows = all.filter(row => row.date.startsWith(reportDate.slice(0, 7)));
    if (reportType === 'late') rows = all.filter(row => {
      const [start] = shiftBounds(row);
      const login = parseClockMinutes(row.login);
      return row.status === 'Present' && login !== null && start !== null && login > start;
    });
    if (reportType === 'early') rows = all.filter(row => {
      const [, end] = shiftBounds(row);
      const logout = parseClockMinutes(row.logout);
      return row.status === 'Present' && logout !== null && end !== null && logout < end;
    });
    if (reportType === 'absent') rows = all.filter(row => normalizedStatus(row.status) === 'Absent');
    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }

  function reportVariance(row, kind) {
    const [start, end] = shiftBounds(row);
    const actual = parseClockMinutes(kind === 'late' ? row.login : row.logout);
    const expected = kind === 'late' ? start : end;
    if (actual === null || expected === null) return '—';
    const difference = kind === 'late' ? Math.max(0, actual - expected) : Math.max(0, expected - actual);
    if (!difference) return kind === 'late' ? 'On time' : 'Full shift';
    return `${Math.floor(difference / 60) ? `${Math.floor(difference / 60)}h ` : ''}${difference % 60}m ${kind}`;
  }

  function reportsPanel() {
    const rows = filteredReportRows();
    const present = rows.filter(row => normalizedStatus(row.status) === 'Present').length;
    const absent = rows.filter(row => normalizedStatus(row.status) === 'Absent').length;
    const leave = rows.filter(row => normalizedStatus(row.status) === 'On leave').length;
    return `<section class="panel">
      <div class="panel-header"><div><h2>Attendance Reports</h2><p>Review company attendance by period or exception.</p></div><button class="primary" id="download-settings-report">Download report</button></div>
      <div class="report-controls">
        <label>REPORT TYPE<select id="settings-report-type">
          <option value="monthly" ${reportType === 'monthly' ? 'selected' : ''}>Monthly report</option>
          <option value="daily" ${reportType === 'daily' ? 'selected' : ''}>Daily report</option>
          <option value="weekly" ${reportType === 'weekly' ? 'selected' : ''}>Weekly report</option>
          <option value="late" ${reportType === 'late' ? 'selected' : ''}>Late comers</option>
          <option value="early" ${reportType === 'early' ? 'selected' : ''}>Early left</option>
          <option value="absent" ${reportType === 'absent' ? 'selected' : ''}>Absentees</option>
        </select></label>
        <label>REFERENCE DATE<input type="date" id="settings-report-date" value="${reportDate}"></label>
      </div>
      <div class="report-summary-grid">
        <div class="report-summary-card"><b>${rows.length}</b><span>Records in report</span></div>
        <div class="report-summary-card"><b>${present}</b><span>Present</span></div>
        <div class="report-summary-card"><b>${absent}</b><span>Absent</span></div>
        <div class="report-summary-card"><b>${leave}</b><span>On leave</span></div>
      </div>
      <div class="table-wrap"><table><thead><tr><th>DATE</th><th>NAME</th><th>ROLE</th><th>STATUS</th><th>CHECK-IN</th><th>CHECK-OUT</th><th>LATE JOIN</th><th>EARLY LEFT</th><th>WORKING HOURS</th></tr></thead><tbody>
        ${rows.map(row => `<tr><td>${esc(row.date)}</td><td>${esc(row.name || '-')}</td><td>${esc(row.role || '-')}</td><td>${esc(row.status || '-')}</td><td>${esc(row.login || '-')}</td><td>${esc(row.logout || '-')}</td><td>${esc(reportVariance(row, 'late'))}</td><td>${esc(reportVariance(row, 'early'))}</td><td>${esc(row.total || row.work || '-')}</td></tr>`).join('') || '<tr><td colspan="9" class="empty">No attendance records match this report.</td></tr>'}
      </tbody></table></div>
    </section>`;
  }

  function companyDetailsPanel() {
    const workforceChoices = ['Workers','Employees','Staff','Manager','HR','Owner','Entrepreneur','Temporary Workers'];
    const selectedWorkforce = new Set(Array.isArray(admin.workforce_types) && admin.workforce_types.length
      ? admin.workforce_types
      : ['Workers','Staff','Entrepreneur','Temporary Workers']);
    const selectedShiftTypes = new Set(Array.isArray(admin.shift_types) && admin.shift_types.length ? admin.shift_types : ['day']);
    const existingShifts = new Map((Array.isArray(admin.shifts) ? admin.shifts : []).map(item => [item.type, item]));
    const shiftChoices = [['day','Day shift'],['night','Night shift'],['rotational','Rotational shift']];
    const shiftRows = shiftChoices.map(([type,label]) => {
      const shift = existingShifts.get(type) || { start: type === 'night' ? '18:00' : '09:00', end: type === 'night' ? '06:00' : '18:00' };
      return `<div class="company-shift-settings-row ${selectedShiftTypes.has(type) ? '' : 'hidden'}" data-company-shift-row="${type}"><b>${label}</b><label>START<input type="time" data-company-shift-start="${type}" value="${esc(shift.start)}"></label><label>END<input type="time" data-company-shift-end="${type}" value="${esc(shift.end)}"></label></div>`;
    }).join('');
    return `<section class="panel settings-company-details-panel">
      <div class="panel-header"><div><h2>Company Details</h2><p>Edit the company structure used by Overview, Attendance Calendar and workforce dashboards.</p></div><span class="tag complete">Permanent settings</span></div>
      <div class="settings-form-grid">
        <label>COMPANY NAME<input id="settings-company-name" value="${esc(admin.company || '')}" required></label>
        <label>BUSINESS CATEGORY<input id="settings-business-category" value="${esc(admin.business_category || '')}" required></label>
        <label>ADMINISTRATOR NAME<input id="settings-admin-name" value="${esc(admin.name || '')}" required></label>
        <label>ADMINISTRATOR ROLE<select id="settings-admin-role">${['Owner','Manager','HR / Admin','Entrepreneur'].map(role => `<option ${admin.role === role ? 'selected' : ''}>${role}</option>`).join('')}</select></label>
        <label class="full">COMPANY ADDRESS<textarea id="settings-company-address" rows="3">${esc(admin.company_address || admin.address || '')}</textarea></label>
        <label>PINCODE<input id="settings-company-pincode" value="${esc(admin.pincode || '')}"></label>
        <label>CITY<input id="settings-company-city" value="${esc(admin.city || '')}"></label>
        <label>STATE<input id="settings-company-state" value="${esc(admin.state || '')}"></label>
        <label>COUNTRY<input id="settings-company-country" value="${esc(admin.country || 'India')}"></label>
      </div>
      <div class="onboarding-field-group"><b>WHO WORKS IN YOUR COMPANY?</b><small>Select only the categories the company needs. Temporary Workers can be enabled independently.</small><div class="settings-choice-grid">${workforceChoices.map(choice => `<label><input type="checkbox" data-company-workforce value="${choice}" ${selectedWorkforce.has(choice) ? 'checked' : ''}><span>${choice}</span></label>`).join('')}</div></div>
      <div class="onboarding-field-group"><b>COMPANY SHIFTS</b><small>Select one or more shifts and enter each timing.</small><div class="settings-choice-grid">${shiftChoices.map(([value,label]) => `<label><input type="checkbox" data-company-shift-type value="${value}" ${selectedShiftTypes.has(value) ? 'checked' : ''}><span>${label}</span></label>`).join('')}</div></div>
      <div class="company-shift-settings-list">${shiftRows}</div>
      <div class="settings-actions"><button class="primary" id="save-company-details">Save company details</button><span id="company-details-save-status"></span></div>
    </section>`;
  }

  function settingsPage() {
    root.innerHTML = `<div class="settings-page"><div class="page-heading"><div><div class="eyebrow">COMPANY CONFIGURATION</div><h1>Settings.</h1><p>Manage attendance sources, historical imports and operational reports.</p></div></div>
      <div class="settings-tabs"><button data-settings-tab="company" class="${settingsTab === 'company' ? 'active' : ''}">Company Details</button><button data-settings-tab="subscription" class="${settingsTab === 'subscription' ? 'active' : ''}">Subscription & Billing</button><button data-settings-tab="integration" class="${settingsTab === 'integration' ? 'active' : ''}">Attendance Integration</button><button data-settings-tab="reports" class="${settingsTab === 'reports' ? 'active' : ''}">Reports</button><button data-settings-tab="shift" class="${settingsTab === 'shift' ? 'active' : ''}">Shift Timings</button></div>
      ${settingsTab === 'company' ? companyDetailsPanel() : settingsTab === 'subscription' ? subscriptionPanel() : settingsTab === 'integration' ? integrationPanel() : settingsTab === 'reports' ? reportsPanel() : settingsTab === 'shift' ? companyShiftPanel() : ''}</div>`;
    if (settingsTab === 'subscription' && !subscriptionState && !subscriptionLoading) loadSubscription();
  }

  function subscriptionPanel() {
    if (!subscriptionState) return `<section class="panel"><p class="empty">Loading company subscription…</p></section>`;
    const item = subscriptionState;
    const percent = Math.min(100, Math.round((item.employee_count / item.employee_limit) * 100));
    const end = item.trial_ends_at ? new Date(item.trial_ends_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';
    const currentCode = String(item.plan_code || 'TRIAL').toUpperCase();
    if (!selectedPlan) selectedPlan = currentCode;
    const trialPlan = { code: 'TRIAL', name: '30-Day Trial', monthly_price: 0, annual_price: 0, employee_limit: item.employee_limit || 10 };
    const plans = [trialPlan, ...subscriptionPlans];
    const features = {
      TRIAL: ['10 employee accounts', 'Face and manual attendance', 'Basic dashboard and reports', '30 days with no credit card'],
      PLUS: ['25 employee accounts', 'Attendance and payroll', 'CSV import and reports', '90-day photo retention'],
      GROWTH: ['50 employee accounts', 'Attendance and payroll', 'Advanced attendance reports', '180-day photo retention'],
      PRO: ['100 employee accounts', 'Integration-ready attendance settings', 'Advanced reports and exports', 'One-year photo retention'],
      ULTRA: ['300 employee accounts', 'Priority onboarding and support', 'API integration support', 'Custom retention options'],
      CUSTOM: ['Custom employee and branch limits', 'Custom storage and retention', 'Dedicated integrations', 'Custom onboarding and support'],
    };
    const planCards = plans.map(plan => {
      const code = String(plan.code).toUpperCase();
      const custom = code === 'CUSTOM';
      const current = code === currentCode;
      const selected = code === selectedPlan;
      const yearly = selectedBillingCycle === 'yearly';
      const amount = yearly ? plan.annual_price : plan.monthly_price;
      const normalAnnual = Number(plan.monthly_price || 0) * 12;
      const annualSaving = yearly && plan.annual_price ? Math.max(0, normalAnnual - Number(plan.annual_price)) : 0;
      const price = custom ? '<span class="plan-contact-price">Custom pricing</span>' : `<span class="plan-currency">₹</span>${amount}<small>/ ${yearly ? 'year' : 'month'}</small>${annualSaving ? `<em class="annual-saving">Save ₹${annualSaving} yearly</em>` : ''}`;
      return `<article class="subscription-price-card ${selected ? 'selected' : ''} ${current ? 'current' : ''}" data-plan-card="${code}">
        <div class="plan-card-top"><h3>${esc(plan.name)}</h3>${current ? '<span class="plan-current-badge">CURRENT PLAN</span>' : selected ? '<span class="plan-selected-badge">SELECTED</span>' : ''}</div>
        <h4>${custom ? 'Built for your company' : code === 'TRIAL' ? 'Explore MSME Planner' : `MSME ${esc(plan.name)}`}</h4>
        <p class="plan-description">${custom ? 'A tailored package for large workforces and specialised operational requirements.' : code === 'TRIAL' ? 'Start managing your workforce and attendance before choosing a paid plan.' : `More workforce capacity and tools for growing MSMEs.`}</p>
        <div class="plan-price">${price}</div>
        <button class="plan-select-button" data-upgrade-plan="${code}">${current ? 'Your current plan' : custom ? 'Request Custom Plan' : `Select ${esc(plan.name)}`}</button>
        <div class="plan-feature-heading">${code === 'TRIAL' ? 'Start with the essentials:' : 'Everything included:'}</div>
        <ul class="plan-features">${(features[code] || []).map(feature => `<li><span>✓</span>${esc(feature)}</li>`).join('')}</ul>
      </article>`;
    }).join('');
    return `<section class="panel subscription-panel">
      <div class="panel-header"><div><div class="eyebrow">CURRENT PLAN</div><h2>${esc(item.plan_name)}</h2><p>Your active company subscription and usage are shown below.</p></div><span class="tag ${item.read_only ? 'urgent' : 'complete'}">${esc(item.status.toUpperCase())}</span></div>
      <div class="subscription-metrics">
        <article><b>${item.days_remaining}</b><span>Days remaining</span></article>
        <article><b>${item.employee_count} / ${item.employee_limit}</b><span>Employee accounts</span></article>
        <article><b>${esc(end)}</b><span>Trial expiry date</span></article>
      </div>
      <div class="subscription-progress"><i style="width:${percent}%"></i></div>
      <p>${item.read_only ? 'The trial has expired. Your saved company and employee data remains safe in read-only mode.' : 'Your company received this 30-day trial automatically. No payment method is required during the trial.'}</p>
      <div class="subscription-plan-heading"><h3 class="subscription-options-title">Choose a plan</h3><div class="billing-cycle-switch"><button data-billing-cycle="monthly" class="${selectedBillingCycle === 'monthly' ? 'active' : ''}">Monthly</button><button data-billing-cycle="yearly" class="${selectedBillingCycle === 'yearly' ? 'active' : ''}">Yearly <span>Save more</span></button></div></div>
      <div class="subscription-options">${planCards || '<p>Plan options are loading…</p>'}</div>
      <p class="settings-import-status" id="subscription-action-status"></p>
    </section>`;
  }

  async function loadSubscription() {
    subscriptionLoading = true;
    try {
      const token = sessionStorage.getItem('msme-admin-api-token') || '';
      const [currentResponse, plansResponse] = await Promise.all([
        fetch('/api/subscription/current', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/subscription/plans'),
      ]);
      const data = await currentResponse.json();
      const plansData = await plansResponse.json();
      if (!currentResponse.ok) throw new Error(data.error || 'Subscription could not be loaded.');
      subscriptionState = data.subscription;
      subscriptionPlans = plansData.plans || [];
      selectedPlan = String(subscriptionState.plan_code || 'TRIAL').toUpperCase();
    } catch (error) {
      subscriptionState = { plan_name: 'Unavailable', status: error.message, days_remaining: 0, employee_count: 0, employee_limit: 10, read_only: false };
    } finally {
      subscriptionLoading = false;
      if (settingsTab === 'subscription') settingsPage();
    }
  }

  function downloadCsv(filename, rows) {
    const csv = rows.map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  document.addEventListener('click', async event => {
    const billingCycle = event.target.closest('[data-billing-cycle]');
    if (billingCycle) {
      selectedBillingCycle = billingCycle.dataset.billingCycle;
      settingsPage();
      return;
    }
    const upgrade = event.target.closest('[data-upgrade-plan]');
    if (upgrade) {
      selectedPlan = upgrade.dataset.upgradePlan;
      settingsPage();
      const status = document.querySelector('#subscription-action-status');
      if (status) status.textContent = selectedPlan === String(subscriptionState?.plan_code || 'TRIAL').toUpperCase()
        ? 'Your current plan is selected.'
        : selectedPlan === 'CUSTOM'
        ? 'Custom Plan selected. Contact the MSME platform administrator to configure employee limits, storage, integrations and pricing.'
        : `${selectedPlan} selected. Online checkout will be available after Razorpay subscriptions and payment webhooks are configured.`;
      return;
    }
    const planCard = event.target.closest('[data-plan-card]');
    if (planCard) {
      selectedPlan = planCard.dataset.planCard;
      settingsPage();
      return;
    }
    const openIntegrationDetail = event.target.closest('[data-open-integration-detail]');
    if (openIntegrationDetail) {
      integrationDetailPage = openIntegrationDetail.dataset.openIntegrationDetail;
      settingsPage();
      return;
    }
    const modeButton = event.target.closest('[data-attendance-mode]');
    if (modeButton) {
      const current = integrationSettings();
      const mode = modeButton.dataset.attendanceMode;
      const selected = !current.modes.includes(mode);
      if (selected && current.modes.length) {
        const labels = { biometric: 'Biometric', face: 'Face Authentication', manual: 'Manual', spreadsheet: 'CSV Report / Excel Sheet' };
        modeSelectionMessage = `Turn off ${labels[current.modes[0]] || 'the selected attendance method'} before selecting ${labels[mode] || mode}.`;
        settingsPage();
        return;
      }
      const modes = selected ? [mode] : [];
      saveIntegrationSettings({ ...current, modes });
      modeSelectionMessage = selected ? `${modeButton.closest('[data-mode-card]')?.querySelector('b')?.textContent || 'Attendance method'} selected.` : 'Attendance method turned off. You can now select another method.';
      updateEmployeeLoginSetupVisibility();
      if (selected && mode === 'face') {
        document.querySelector('.nav-link[data-view="employeeaccess"]')?.click();
        return;
      }
      if (selected && mode === 'manual') {
        document.querySelector('.nav-link[data-view="attendance"]')?.click();
        return;
      }
      if (selected && (mode === 'biometric' || mode === 'spreadsheet')) integrationDetailPage = mode;
      if (!selected && integrationDetailPage === mode) integrationDetailPage = null;
      settingsPage();
      return;
    }
    if (event.target.closest('[data-close-integration-detail]')) {
      integrationDetailPage = null;
      settingsPage();
      return;
    }
    const tab = event.target.closest('[data-settings-tab]');
    if (tab) {
      settingsTab = tab.dataset.settingsTab;
      settingsPage();
      return;
    }
    if (event.target.closest('#save-company-details')) {
      const status = document.querySelector('#company-details-save-status');
      const workforceTypes = [...document.querySelectorAll('[data-company-workforce]:checked')].map(input => input.value);
      const shiftTypes = [...document.querySelectorAll('[data-company-shift-type]:checked')].map(input => input.value);
      if (!workforceTypes.length || !shiftTypes.length) {
        if (status) status.textContent = 'Select at least one workforce category and one shift.';
        return;
      }
      const shifts = shiftTypes.map(type => ({
        type,
        start: document.querySelector(`[data-company-shift-start="${type}"]`)?.value || '',
        end: document.querySelector(`[data-company-shift-end="${type}"]`)?.value || '',
      }));
      const payload = {
        company: document.querySelector('#settings-company-name')?.value.trim(),
        business_category: document.querySelector('#settings-business-category')?.value.trim(),
        name: document.querySelector('#settings-admin-name')?.value.trim(),
        role: document.querySelector('#settings-admin-role')?.value,
        company_address: document.querySelector('#settings-company-address')?.value.trim(),
        pincode: document.querySelector('#settings-company-pincode')?.value.trim(),
        city: document.querySelector('#settings-company-city')?.value.trim(),
        state: document.querySelector('#settings-company-state')?.value.trim(),
        country: document.querySelector('#settings-company-country')?.value.trim(),
        workforce_types: workforceTypes,
        shift_types: shiftTypes,
        shifts,
      };
      try {
        if (status) status.textContent = 'Saving…';
        const token = sessionStorage.getItem('msme-admin-api-token') || '';
        const response = await fetch('/api/auth/update-company', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Company details could not be saved.');
        Object.assign(admin, result.account || payload);
        const accountIndex = tenantAccounts.findIndex(item => String(item.email || '').toLowerCase() === String(admin.email || '').toLowerCase());
        if (accountIndex >= 0) tenantAccounts[accountIndex] = { ...tenantAccounts[accountIndex], ...admin };
        else tenantAccounts.push({ ...admin });
        localStorage.setItem('msme-accounts', JSON.stringify(tenantAccounts));
        await window.MSMEWorkspaceDatabase?.load(admin.email);
        if (status) status.textContent = 'Company details saved permanently.';
        render();
      } catch (error) {
        if (status) status.textContent = error.message;
      }
      return;
    }
    if (event.target.closest('#save-attendance-settings')) {
      const current = integrationSettings();
      saveIntegrationSettings({
        ...current,
        provider: document.querySelector('#biometric-provider')?.value.trim() || current.provider,
        softwareUrl: document.querySelector('#biometric-software-url')?.value.trim() || current.softwareUrl,
        endpoint: document.querySelector('#biometric-endpoint')?.value.trim() || current.endpoint,
        deviceId: document.querySelector('#biometric-device-id')?.value.trim() || current.deviceId,
        branchId: document.querySelector('#biometric-branch-id')?.value.trim() || current.branchId,
        apiUsername: document.querySelector('#biometric-api-username')?.value.trim() || current.apiUsername,
        secretReference: document.querySelector('#biometric-secret-reference')?.value.trim() || current.secretReference,
        syncInterval: document.querySelector('#biometric-sync-interval')?.value || current.syncInterval,
      });
      const status = document.querySelector('#settings-save-status');
      if (status) {
        status.textContent = 'Attendance settings saved permanently for this company.';
        window.setTimeout(() => {
          if (status.isConnected) status.textContent = '';
        }, 5000);
      }
      return;
    }
    if (event.target.closest('#save-company-shift')) {
      const start = selectedClock24('company-shift-start');
      const end = selectedClock24('company-shift-end');
      const status = document.querySelector('#shift-save-status');
      if (!start || !end || start === end) {
        if (status) status.textContent = 'Enter different start and end times.';
        return;
      }
      const display = value => new Date(`2000-01-01T${value}:00`).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      const shift = `${display(start)} - ${display(end)}`;
      admin.shift_start = start;
      admin.shift_end = end;
      const accountIndex = tenantAccounts.findIndex(item => String(item.email || '').toLowerCase() === String(admin.email || '').toLowerCase());
      if (accountIndex >= 0) tenantAccounts[accountIndex] = { ...tenantAccounts[accountIndex], shift_start: start, shift_end: end };
      else tenantAccounts.push({ ...admin });
      localStorage.setItem('msme-accounts', JSON.stringify(tenantAccounts));
      [...people, ...temporaryWorkers].forEach(person => { person.shift = shift; });
      save();
      if (status) {
        status.textContent = `Shift saved permanently: ${shift}`;
        window.setTimeout(() => { if (status.isConnected) status.textContent = ''; }, 5000);
      }
      return;
    }
    if (event.target.closest('#download-attendance-template')) {
      downloadCsv('msme-attendance-import-template.csv', [['Date','ID','Name','Role','Status','Check In','Check Out','Shift','Working Hours'],['2026-09-01','WR-001','Example Worker','Worker','Present','09:00 AM','06:00 PM','09:00 AM - 06:00 PM','9h 0m']]);
      return;
    }
    if (event.target.closest('#import-attendance-sheet')) {
      const file = document.querySelector('#attendance-import-file')?.files?.[0];
      const status = document.querySelector('#attendance-import-status');
      if (!file) {
        status.textContent = 'Choose a file first.';
        return;
      }
      if (!file.name.toLowerCase().endsWith('.csv')) {
        status.textContent = 'Open the Excel sheet and use Save As → CSV UTF-8, then upload that CSV here.';
        return;
      }
      try {
        const count = importCsv(await file.text(), file.name);
        status.textContent = `${count} attendance rows imported and saved permanently.`;
      } catch (error) {
        status.textContent = error.message;
      }
      return;
    }
    if (event.target.closest('#download-settings-report')) {
      const rows = filteredReportRows();
      downloadCsv(`msme-${reportType}-attendance-${reportDate}.csv`, [
        ['Date','Name','Role','Status','Check In','Check Out','Working Hours'],
        ...rows.map(row => [row.date,row.name,row.role,row.status,row.login,row.logout,row.total || row.work || '']),
      ]);
    }
  });

  document.addEventListener('change', event => {
    if (event.target.matches('[data-company-shift-type]')) {
      const row = document.querySelector(`[data-company-shift-row="${event.target.value}"]`);
      if (row) row.classList.toggle('hidden', !event.target.checked);
    }
    if (event.target.matches('#settings-report-type')) {
      reportType = event.target.value;
      settingsPage();
    }
    if (event.target.matches('#settings-report-date')) {
      reportDate = event.target.value;
      settingsPage();
    }
  });

  const previousRender = window.render;
  window.render = function renderWithSettings(...args) {
    const faceEnabled = updateEmployeeLoginSetupVisibility();
    if (typeof view !== 'undefined' && view === 'employeeaccess' && !faceEnabled) {
      view = 'settings';
      settingsTab = 'integration';
    }
    if (typeof view !== 'undefined' && view === 'settings') {
      if (!settingsWasOpen) settingsTab = null;
      settingsWasOpen = true;
      settingsPage();
      return;
    }
    settingsWasOpen = false;
    return previousRender.apply(this, args);
  };
  updateEmployeeLoginSetupVisibility();
})();
