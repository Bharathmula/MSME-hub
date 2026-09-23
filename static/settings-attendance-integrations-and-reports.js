/* Company-level attendance integrations, historical imports and reports. */
(function () {
  let settingsTab = 'integration';
  let reportType = 'monthly';
  let reportDate = new Date().toISOString().slice(0, 10);

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
    return {
      modes: ['face'],
      provider: '',
      endpoint: '',
      deviceId: '',
      syncInterval: '15',
      ...readJson(settingsKey(), {}),
    };
  }

  function saveIntegrationSettings(value) {
    localStorage.setItem(settingsKey(), JSON.stringify(value));
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
        <button type="button" class="settings-mode-select ${selected ? 'selected' : ''}" data-attendance-mode="${mode}" aria-pressed="${selected}">${selected ? 'Selected' : 'Select'}</button>
      </article>`;
    };
    return `<section class="panel">
      <div class="panel-header"><div><h2>Attendance Integration</h2><p>Choose one or more attendance sources for this company.</p></div><span class="tag complete">Company settings</span></div>
      <div class="settings-mode-grid">
        ${modeCard('biometric', 'Biometric', 'Connect a fingerprint, card or device provider through its API or scheduled export.')}
        ${modeCard('face', 'Face Authentication', 'Use the existing face check-in and check-out workflow in this application.')}
        ${modeCard('manual', 'Manual', 'Allow authorised admins to enter or correct attendance in Attendance Calendar.')}
        ${modeCard('spreadsheet', 'CSV Report / Excel Sheet', 'Import past attendance exported from Excel or another attendance system.')}
      </div>
      <div class="settings-form-grid" id="biometric-connection-fields">
        <label>BIOMETRIC SOFTWARE / PROVIDER<input id="biometric-provider" value="${esc(current.provider)}" placeholder="Example: eSSL, ZKTeco, Matrix"></label>
        <label>API OR SYNC ENDPOINT<input id="biometric-endpoint" value="${esc(current.endpoint)}" placeholder="https://provider.example/api"></label>
        <label>DEVICE / SITE ID<input id="biometric-device-id" value="${esc(current.deviceId)}" placeholder="Device or branch identifier"></label>
        <label>SYNC INTERVAL<select id="biometric-sync-interval">${['5','15','30','60'].map(value => `<option value="${value}" ${current.syncInterval === value ? 'selected' : ''}>Every ${value} minutes</option>`).join('')}</select></label>
      </div>
      <div class="settings-note"><b>Biometric connection note:</b> the admin can use biometric together with face and manual attendance. Each device vendor must provide an API, SDK or CSV export. Saving this form prepares the company configuration; provider credentials should be configured securely on the Render backend, not placed in the browser.</div>
      <div class="settings-actions"><button class="primary" id="save-attendance-settings">Save attendance settings</button><span id="settings-save-status"></span></div>
    </section>
    <section class="panel settings-import-box">
      <div class="panel-header"><div><h2>Import past attendance</h2><p>Upload a CSV exported from Excel. Existing matching employee/date rows are updated; other rows are added.</p></div></div>
      <label>CSV / EXCEL-EXPORTED SHEET<input type="file" id="attendance-import-file" accept=".csv,.xlsx,.xls,text/csv"></label>
      <div class="settings-actions"><button class="secondary" id="download-attendance-template">Download template</button><button class="primary" id="import-attendance-sheet">Import past data</button></div>
      <p class="settings-import-status" id="attendance-import-status"></p>
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
      <div class="table-wrap"><table><thead><tr><th>DATE</th><th>NAME</th><th>ROLE</th><th>STATUS</th><th>CHECK-IN</th><th>CHECK-OUT</th><th>WORKING HOURS</th></tr></thead><tbody>
        ${rows.map(row => `<tr><td>${esc(row.date)}</td><td>${esc(row.name || '-')}</td><td>${esc(row.role || '-')}</td><td>${esc(row.status || '-')}</td><td>${esc(row.login || '-')}</td><td>${esc(row.logout || '-')}</td><td>${esc(row.total || row.work || '-')}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">No attendance records match this report.</td></tr>'}
      </tbody></table></div>
    </section>`;
  }

  function settingsPage() {
    root.innerHTML = `<div class="page-heading"><div><div class="eyebrow">COMPANY CONFIGURATION</div><h1>Settings.</h1><p>Manage attendance sources, historical imports and operational reports.</p></div></div>
      <div class="settings-tabs"><button data-settings-tab="integration" class="${settingsTab === 'integration' ? 'active' : ''}">Attendance Integration</button><button data-settings-tab="reports" class="${settingsTab === 'reports' ? 'active' : ''}">Reports</button></div>
      ${settingsTab === 'integration' ? integrationPanel() : reportsPanel()}`;
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
    const modeButton = event.target.closest('[data-attendance-mode]');
    if (modeButton) {
      const selected = !modeButton.classList.contains('selected');
      modeButton.classList.toggle('selected', selected);
      modeButton.closest('[data-mode-card]')?.classList.toggle('selected', selected);
      modeButton.setAttribute('aria-pressed', String(selected));
      modeButton.textContent = selected ? 'Selected' : 'Select';
      return;
    }
    const tab = event.target.closest('[data-settings-tab]');
    if (tab) {
      settingsTab = tab.dataset.settingsTab;
      settingsPage();
      return;
    }
    if (event.target.closest('#save-attendance-settings')) {
      const modes = [...document.querySelectorAll('[data-attendance-mode].selected')].map(button => button.dataset.attendanceMode);
      saveIntegrationSettings({
        modes,
        provider: document.querySelector('#biometric-provider')?.value.trim() || '',
        endpoint: document.querySelector('#biometric-endpoint')?.value.trim() || '',
        deviceId: document.querySelector('#biometric-device-id')?.value.trim() || '',
        syncInterval: document.querySelector('#biometric-sync-interval')?.value || '15',
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
  });

  const previousRender = window.render;
  window.render = function renderWithSettings(...args) {
    if (typeof view !== 'undefined' && view === 'settings') {
      settingsPage();
      return;
    }
    return previousRender.apply(this, args);
  };
})();
