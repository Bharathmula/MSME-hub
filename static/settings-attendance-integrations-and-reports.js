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
  let shiftEditorOpen = false;
  let shiftEditorType = 'Day Shift';
  let shiftEditorStart = '09:00';
  let shiftEditorEnd = '18:00';
  let shiftSaveMessage = '';
  let companySettingsEditing = false;
  let companySaveMessage = '';

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
    const selectedModes = [...new Set(storedModes)];
    return {
      modes: selectedModes,
      provider: '',
      softwareUrl: '',
      endpoint: '',
      deviceId: '',
      branchId: '',
      apiUsername: '',
      secretReference: '',
      syncInterval: '15',
      ...stored,
      modes: selectedModes,
    };
  }

  function saveIntegrationSettings(value) {
    localStorage.setItem(settingsKey(), JSON.stringify(value));
    if (typeof save === 'function') save();
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
        ${modeCard('manual', 'Manual', 'Allow any signed-in dashboard user with Attendance Calendar access to enter or correct attendance.')}
        ${modeCard('spreadsheet', 'CSV Report / Excel Sheet', 'Import past attendance exported from Excel or another attendance system.')}
      </div>
      <p class="settings-import-status" id="attendance-mode-status">${esc(modeSelectionMessage)}</p>
      ${detail}
      ${!detail ? '<p class="settings-selection-help">You can use one or more attendance sources. Manual attendance is an independent preference and can remain on with Face, Biometric or CSV attendance.</p>' : ''}
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

  function displayClock(value) {
    const parsed = String(value || '').match(/^(\d{2}):(\d{2})$/);
    if (!parsed) return 'Not set';
    const date = new Date(`2000-01-01T${value}:00`);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  function configuredShifts() {
    const saved = Array.isArray(admin.shifts) ? admin.shifts : [];
    const valid = saved.filter(shift => shift && shift.type && shift.start && shift.end).map(shift => ({
      type: String(shift.type),
      start: String(shift.start).slice(0, 5),
      end: String(shift.end).slice(0, 5),
    }));
    if (valid.length) return valid;
    return [{
      type: Array.isArray(admin.shift_types) && admin.shift_types[0] ? admin.shift_types[0] : 'Day Shift',
      start: String(admin.shift_start || '09:00').slice(0, 5),
      end: String(admin.shift_end || '18:00').slice(0, 5),
    }];
  }

  function shiftTimingDescription(start, end) {
    const startMinutes = parseClockMinutes(start);
    const endMinutes = parseClockMinutes(end);
    if (startMinutes === null || endMinutes === null) return 'Custom working hours';
    if (endMinutes <= startMinutes) return 'Overnight working hours';
    if (startMinutes >= 300 && startMinutes < 720) return 'Morning to evening working hours';
    if (startMinutes >= 720 && startMinutes < 1020) return 'Afternoon to evening working hours';
    return 'Custom working hours';
  }

  function setClock24(prefix, value) {
    const selected = clockParts24(value, '09:00');
    const hour = document.querySelector(`#${prefix}-hour`);
    const minute = document.querySelector(`#${prefix}-minute`);
    const period = document.querySelector(`#${prefix}-period`);
    if (hour) hour.value = selected.hour;
    if (minute) minute.value = selected.minute;
    if (period) period.value = selected.period;
  }

  function updateShiftEditorHeading() {
    const heading = document.querySelector('#shift-editor-heading');
    if (!heading) return;
    const type = document.querySelector('#company-shift-type')?.value || 'Shift';
    const start = selectedClock24('company-shift-start');
    const end = selectedClock24('company-shift-end');
    heading.textContent = `${type}: ${displayClock(start)} – ${displayClock(end)}`;
    const description = document.querySelector('#shift-editor-description');
    if (description) description.textContent = shiftTimingDescription(start, end);
  }

  function persistCompanyAccount(fields) {
    Object.assign(admin, fields);
    const email = String(admin.email || '').toLowerCase();
    const accountIndex = tenantAccounts.findIndex(item => String(item.email || '').toLowerCase() === email);
    if (accountIndex >= 0) tenantAccounts[accountIndex] = { ...tenantAccounts[accountIndex], ...admin };
    else tenantAccounts.push({ ...admin });
    localStorage.setItem('msme-accounts', JSON.stringify(tenantAccounts));
    if (typeof save === 'function') save();
  }

  function workforceCount(category) {
    const normalized = String(category || '').toLowerCase().replace(/s$/, '');
    if (normalized === 'temporary worker') return temporaryWorkers.length;
    return people.filter(person => String(person.role || '').toLowerCase().replace(/s$/, '') === normalized).length;
  }

  function companyIndustryTemplates() {
    if (typeof businessIndustryTemplates !== 'undefined') return businessIndustryTemplates;
    return {
      'Manufacturing': { subcategories: ['Automotive','Electronics','Food processing','Pharmaceuticals','Textiles and apparel','Metal fabrication','Other manufacturing'], roles: [] },
      'Software / IT': { subcategories: ['Software development','IT services','SaaS product company','Cybersecurity','Data and AI','BPO and technical support'], roles: [] },
      'Construction': { subcategories: ['Residential construction','Commercial construction','Civil infrastructure','Electrical contracting','Plumbing and HVAC','Interior and fit-out'], roles: [] },
      'Retail': { subcategories: ['Grocery and supermarket','Fashion and apparel','Electronics retail','Pharmacy retail','E-commerce','Wholesale and distribution'], roles: [] },
      'Healthcare': { subcategories: ['Hospital','Clinic','Diagnostic centre','Pharmacy','Home healthcare','Medical equipment'], roles: [] },
      'Logistics': { subcategories: ['Road transport','Warehousing','Courier and delivery','Freight forwarding','Cold-chain logistics','Fleet services'], roles: [] },
      'Professional services': { subcategories: ['Accounting and audit','Consulting','Legal services','Marketing agency','Architecture and design','Recruitment services'], roles: [] },
      'Other': { subcategories: ['Other / Custom'], roles: [] },
    };
  }

  function companyWorkforceChoices() {
    if (typeof onboardingWorkforce !== 'undefined') return onboardingWorkforce;
    return [['Temporary Workers','Seasonal and short-term workers'],['Employees','General company employees'],['Workers','Production, trade and field workers'],['Staff','Office and support staff'],['Manager','Team and department managers'],['HR','Human resources team'],['Owner','Business owners'],['Entrepreneur','Entrepreneurs and founders']];
  }

  function companySettingsEditForm(categories, roles) {
    const templates = companyIndustryTemplates();
    const category = admin.business_category || 'Other';
    const template = templates[category] || templates.Other || { subcategories: [], roles: [] };
    const workforce = new Set(categories);
    const selectedRoles = new Set(roles);
    const check = value => workforce.has(value) ? ' checked' : '';
    const roleCheck = value => selectedRoles.has(value) ? ' checked' : '';
    return `<form id="company-settings-form" class="company-settings-form">
      <div class="company-detail-section"><h3>Company details</h3><div class="company-edit-grid">
        <label>COMPANY NAME<input name="company" value="${esc(admin.company || '')}" required></label>
        <label>REGISTERED STAFF COUNT<input type="number" min="0" name="staff_count" value="${esc(admin.staff_count || '')}"></label>
        <label>BUSINESS CATEGORY<select name="business_category" id="company-settings-category">${Object.keys(templates).map(value => `<option value="${esc(value)}" ${value === category ? 'selected' : ''}>${esc(value)}</option>`).join('')}</select></label>
        <label>BUSINESS SUBCATEGORY<select name="business_subcategory" id="company-settings-subcategory">${template.subcategories.map(value => `<option value="${esc(value)}" ${value === admin.business_subcategory ? 'selected' : ''}>${esc(value)}</option>`).join('')}<option value="Other / Custom" ${admin.business_subcategory === 'Other / Custom' ? 'selected' : ''}>Other / Custom</option></select></label>
      </div></div>
      <div class="company-detail-section"><h3>Who works in your company</h3><p class="company-edit-help">These are workforce categories only. Changing them does not change login permissions or employee records.</p>
        <div class="company-workforce-edit-grid">${companyWorkforceChoices().map(([name, description]) => `<label><input type="checkbox" name="workforce_categories" value="${esc(name)}"${check(name)}><span><b>${esc(name)}</b><small>${esc(description)}</small></span></label>`).join('')}</div>
      </div>
      <div class="company-detail-section"><h3>Business roles and operations</h3><p class="company-edit-help">Select the detailed roles that apply to this company.</p>
        <div class="company-role-edit-grid" id="company-settings-industry-roles">${(template.roles || []).map(role => `<label><input type="checkbox" name="industry_roles" value="${esc(role)}"${roleCheck(role)}><span>${esc(role)}</span></label>`).join('') || roles.map(role => `<label><input type="checkbox" name="industry_roles" value="${esc(role)}" checked><span>${esc(role)}</span></label>`).join('') || '<p>No suggested roles for this category.</p>'}</div>
      </div>
      <div class="company-detail-section"><h3>Company address</h3><div class="company-edit-grid">
        <label>BUILDING / DOOR / PLOT NUMBER<input name="address_number" value="${esc(admin.address_number || '')}"></label>
        <label class="full">COMPANY ADDRESS<textarea name="company_address" rows="3">${esc(admin.company_address || '')}</textarea></label>
        <label>PINCODE<input name="pincode" value="${esc(admin.pincode || '')}"></label><label>CITY<input name="city" value="${esc(admin.city || '')}"></label>
        <label>STATE<input name="state" value="${esc(admin.state || '')}"></label><label>COUNTRY<input name="country" value="${esc(admin.country || 'India')}"></label>
      </div></div>
      <div class="company-detail-section"><h3>Administrator details</h3><div class="company-edit-grid">
        <label>ADMINISTRATOR NAME<input name="name" value="${esc(admin.name || '')}" required></label><label>PHONE<input name="phone" value="${esc(admin.phone || '')}"></label>
        <label>ADMIN ROLE<select name="role">${['Owner','Entrepreneur','Admin','HR','Manager'].map(value => `<option ${value === admin.role ? 'selected' : ''}>${value}</option>`).join('')}</select></label><label>LOGIN EMAIL<input value="${esc(admin.email || '')}" disabled></label>
      </div></div>
      <div class="settings-note"><b>Safe editing:</b> employee profiles, passwords, attendance, payroll records and login permissions are not changed by this form.</div>
      <div class="company-settings-save-bar"><button type="button" class="secondary" id="cancel-company-settings">Cancel</button><button type="button" class="primary" id="save-company-settings">Save company details</button></div>
    </form>`;
  }

  function companySettingsPanel() {
    const registeredCategories = Array.isArray(admin.workforce_categories) ? admin.workforce_categories.filter(Boolean) : [];
    const inferredCategories = [...new Set([
      ...people.map(person => person.role).filter(Boolean),
      ...(temporaryWorkers.length ? ['Temporary Workers'] : []),
    ])];
    const categories = registeredCategories.length ? registeredCategories : inferredCategories;
    const roles = Array.isArray(admin.industry_roles) ? admin.industry_roles.filter(Boolean) : [];
    const address = admin.address || [admin.address_number, admin.company_address, admin.city, admin.state, admin.pincode, admin.country].filter(Boolean).join(', ');
    const detail = (label, value) => `<div class="company-detail-card"><span>${label}</span><b>${esc(value || 'Not provided')}</b></div>`;
    return `<section class="panel settings-company-panel">
      <div class="panel-header"><div><h2>Company Settings</h2><p>Registration details for this company workspace.</p></div><span class="tag complete">Company profile</span></div>
      ${companySettingsEditing ? companySettingsEditForm(categories, roles) : `
      <div class="company-detail-section"><h3>Company details</h3><div class="company-detail-grid">
        ${detail('Company name', admin.company)}${detail('Business category', admin.business_category)}${detail('Business subcategory', admin.business_subcategory)}${detail('Registered staff count', admin.staff_count)}
      </div></div>
      <div class="company-detail-section"><h3>Administrator</h3><div class="company-detail-grid">
        ${detail('Administrator name', admin.name)}${detail('Email', admin.email)}${detail('Role', admin.role)}${detail('Phone', admin.phone)}
      </div></div>
      <div class="company-detail-section"><h3>Company address</h3><div class="company-detail-grid">
        ${detail('Full address', address)}${detail('City', admin.city)}${detail('State', admin.state)}${detail('Country', admin.country)}${detail('Pincode', admin.pincode)}${detail('Location coordinates', admin.latitude && admin.longitude ? `${admin.latitude}, ${admin.longitude}` : '')}
      </div></div>
      <div class="company-detail-section"><h3>Who works in your company</h3>
        <div class="company-category-grid">${categories.map(category => `<article><span>${esc(category)}</span><b>${workforceCount(category)}</b><small>Current profile${workforceCount(category) === 1 ? '' : 's'}</small></article>`).join('') || '<p class="settings-empty-detail">No workforce categories were selected during registration.</p>'}</div>
      </div>
      <div class="company-detail-section"><h3>${esc(admin.business_category || 'Business')} roles and operations</h3>
        <div class="company-chip-list">${roles.map(role => `<span>${esc(role)}</span>`).join('') || '<span>No industry-specific roles were selected during registration.</span>'}</div>
      </div>
      <div class="settings-note"><b>Data source:</b> these details come from this company's original registration and saved workspace. Employee profiles and login permissions are not changed here.</div>
      ${companySaveMessage ? `<p class="company-save-message">${esc(companySaveMessage)}</p>` : ''}
      <div class="company-settings-save-bar"><button type="button" class="primary" id="edit-company-settings">Edit company details</button></div>`}
    </section>`;
  }

  function companyShiftPanel() {
    const shifts = configuredShifts();
    const editor = shiftEditorOpen ? `<div class="company-shift-editor">
      <div class="company-shift-editor-heading"><div><span>SHIFT BEING ADDED</span><h3 id="shift-editor-heading">${esc(shiftEditorType)}: ${displayClock(shiftEditorStart)} – ${displayClock(shiftEditorEnd)}</h3><p id="shift-editor-description">${shiftTimingDescription(shiftEditorStart, shiftEditorEnd)}</p></div></div>
      <label class="shift-type-field">WHICH SHIFT?<select id="company-shift-type">${['Day Shift','Night Shift','Rotational Shift'].map(type => `<option ${type === shiftEditorType ? 'selected' : ''}>${type}</option>`).join('')}</select></label>
      <div class="shift-clock-grid">${clockSelector('company-shift-start', 'SHIFT START', shiftEditorStart, '09:00')}${clockSelector('company-shift-end', 'SHIFT END', shiftEditorEnd, '18:00')}</div>
      <div class="settings-actions"><button class="primary" id="save-company-shift">Save shift timing</button><button class="secondary" id="cancel-company-shift">Cancel</button></div>
    </div>` : '';
    return `<section class="panel settings-shift-panel">
      <div class="panel-header"><div><h2>Shift Timings</h2><p>Add Day, Night or Rotational shift timings for this company.</p></div><button class="primary" id="add-company-shift">+ Add shift timing</button></div>
      <div class="company-shift-list">${shifts.map(shift => `<article><div><span>${esc(shiftTimingDescription(shift.start, shift.end))}</span><h3>${esc(shift.type)}</h3><p>${displayClock(shift.start)} – ${displayClock(shift.end)}</p></div><button class="secondary" data-edit-company-shift="${esc(shift.type)}">Edit</button></article>`).join('')}</div>
      ${editor}
      <div class="settings-note"><b>Shift templates:</b> these timings become available for company workforce profiles. Existing employee attendance and assigned shifts are preserved.</div>
      <p class="settings-import-status" id="shift-save-status">${esc(shiftSaveMessage)}</p>
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

  function settingsPage() {
    if (!settingsTab) settingsTab = 'company';
    root.innerHTML = `<div class="settings-page"><div class="page-heading"><div><div class="eyebrow">COMPANY CONFIGURATION</div><h1>Settings.</h1><p>Review company details, shifts, attendance sources, billing and reports.</p></div></div>
      <div class="settings-tabs"><button data-settings-tab="company" class="${settingsTab === 'company' ? 'active' : ''}">Company Settings</button><button data-settings-tab="subscription" class="${settingsTab === 'subscription' ? 'active' : ''}">Subscription & Billing</button><button data-settings-tab="integration" class="${settingsTab === 'integration' ? 'active' : ''}">Attendance Integration</button><button data-settings-tab="reports" class="${settingsTab === 'reports' ? 'active' : ''}">Reports</button><button data-settings-tab="shift" class="${settingsTab === 'shift' ? 'active' : ''}">Shift Timings</button></div>
      ${settingsTab === 'company' ? companySettingsPanel() : settingsTab === 'subscription' ? subscriptionPanel() : settingsTab === 'integration' ? integrationPanel() : settingsTab === 'reports' ? reportsPanel() : settingsTab === 'shift' ? companyShiftPanel() : ''}</div>`;
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
      const modes = selected
        ? [...new Set([...current.modes, mode])]
        : current.modes.filter(item => item !== mode);
      saveIntegrationSettings({ ...current, modes });
      modeSelectionMessage = selected
        ? `${modeButton.closest('[data-mode-card]')?.querySelector('b')?.textContent || 'Attendance method'} turned on.`
        : `${modeButton.closest('[data-mode-card]')?.querySelector('b')?.textContent || 'Attendance method'} turned off.`;
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
    if (event.target.closest('#edit-company-settings')) {
      companySettingsEditing = true;
      companySaveMessage = '';
      settingsPage();
      return;
    }
    if (event.target.closest('#cancel-company-settings')) {
      companySettingsEditing = false;
      settingsPage();
      return;
    }
    if (event.target.closest('#save-company-settings')) {
      const form = document.querySelector('#company-settings-form');
      if (!form || !form.reportValidity()) return;
      const values = Object.fromEntries(new FormData(form));
      const workforceCategories = [...form.querySelectorAll('[name="workforce_categories"]:checked')].map(input => input.value);
      const industryRoles = [...form.querySelectorAll('[name="industry_roles"]:checked')].map(input => input.value);
      if (!workforceCategories.length) {
        window.alert('Select at least one workforce category used by your company.');
        return;
      }
      const fields = {
        company: String(values.company || '').trim(),
        staff_count: String(values.staff_count || '').trim(),
        business_category: String(values.business_category || '').trim(),
        business_subcategory: String(values.business_subcategory || '').trim(),
        workforce_categories: workforceCategories,
        industry_roles: industryRoles,
        address_number: String(values.address_number || '').trim(),
        company_address: String(values.company_address || '').trim(),
        pincode: String(values.pincode || '').trim(),
        city: String(values.city || '').trim(),
        state: String(values.state || '').trim(),
        country: String(values.country || '').trim(),
        name: String(values.name || '').trim(),
        phone: String(values.phone || '').trim(),
        role: String(values.role || '').trim(),
      };
      fields.address = [fields.address_number, fields.company_address, fields.city, fields.state, fields.pincode, fields.country].filter(Boolean).join(', ');
      persistCompanyAccount(fields);
      companySettingsEditing = false;
      companySaveMessage = 'Company details saved for this workspace.';
      settingsPage();
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
    if (event.target.closest('#add-company-shift')) {
      const shifts = configuredShifts();
      const missingType = ['Day Shift','Night Shift','Rotational Shift'].find(type => !shifts.some(shift => shift.type === type));
      shiftEditorType = missingType || 'Day Shift';
      const presets = {
        'Day Shift': ['09:00','18:00'],
        'Night Shift': ['21:00','06:00'],
        'Rotational Shift': ['06:00','14:00'],
      };
      [shiftEditorStart, shiftEditorEnd] = presets[shiftEditorType];
      shiftEditorOpen = true;
      shiftSaveMessage = '';
      settingsPage();
      return;
    }
    const editShift = event.target.closest('[data-edit-company-shift]');
    if (editShift) {
      const shift = configuredShifts().find(item => item.type === editShift.dataset.editCompanyShift);
      if (shift) {
        shiftEditorType = shift.type;
        shiftEditorStart = shift.start;
        shiftEditorEnd = shift.end;
        shiftEditorOpen = true;
        shiftSaveMessage = '';
        settingsPage();
      }
      return;
    }
    if (event.target.closest('#cancel-company-shift')) {
      shiftEditorOpen = false;
      settingsPage();
      return;
    }
    if (event.target.closest('#save-company-shift')) {
      const type = document.querySelector('#company-shift-type')?.value || 'Day Shift';
      const start = selectedClock24('company-shift-start');
      const end = selectedClock24('company-shift-end');
      const status = document.querySelector('#shift-save-status');
      if (!start || !end || start === end) {
        if (status) status.textContent = 'Enter different start and end times.';
        return;
      }
      const shifts = configuredShifts();
      const existingIndex = shifts.findIndex(shift => shift.type === type);
      const nextShift = { type, start, end };
      if (existingIndex >= 0) shifts[existingIndex] = nextShift;
      else shifts.push(nextShift);
      const primary = shifts[0];
      persistCompanyAccount({
        shifts,
        shift_types: shifts.map(shift => shift.type),
        shift_start: primary.start,
        shift_end: primary.end,
      });
      shiftEditorOpen = false;
      shiftEditorType = type;
      shiftEditorStart = start;
      shiftEditorEnd = end;
      shiftSaveMessage = `${type} saved: ${displayClock(start)} – ${displayClock(end)}.`;
      settingsPage();
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
    if (event.target.matches('#settings-report-type')) {
      reportType = event.target.value;
      settingsPage();
    }
    if (event.target.matches('#settings-report-date')) {
      reportDate = event.target.value;
      settingsPage();
    }
    if (event.target.matches('#company-shift-type')) {
      const presets = {
        'Day Shift': ['09:00','18:00'],
        'Night Shift': ['21:00','06:00'],
        'Rotational Shift': ['06:00','14:00'],
      };
      const [start, end] = presets[event.target.value] || presets['Day Shift'];
      setClock24('company-shift-start', start);
      setClock24('company-shift-end', end);
      updateShiftEditorHeading();
    }
    if (event.target.matches('#company-settings-category')) {
      const template = companyIndustryTemplates()[event.target.value] || { subcategories: [], roles: [] };
      const subcategory = document.querySelector('#company-settings-subcategory');
      if (subcategory) subcategory.innerHTML = `${template.subcategories.map(value => `<option value="${esc(value)}">${esc(value)}</option>`).join('')}<option value="Other / Custom">Other / Custom</option>`;
      const roles = document.querySelector('#company-settings-industry-roles');
      if (roles) roles.innerHTML = (template.roles || []).map(role => `<label><input type="checkbox" name="industry_roles" value="${esc(role)}"><span>${esc(role)}</span></label>`).join('') || '<p>No suggested roles for this category.</p>';
    }
    if (event.target.matches('[id^="company-shift-start-"], [id^="company-shift-end-"]')) updateShiftEditorHeading();
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
