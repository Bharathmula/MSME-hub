/* Company-specific workforce modules selected during workspace creation. */
(function () {
  const catalog = [
    { choice: 'Employees', role: 'Employee', view: 'employees', label: 'Employees', singular: 'Employee', icon: '◎', count: 'employee-count', prefix: 'EMP', api: 'EMPLOYEE' },
    { choice: 'Workers', role: 'Worker', view: 'workers', label: 'Workers', singular: 'Worker', icon: '◉', count: 'worker-count', prefix: 'WR', api: 'WORKER' },
    { choice: 'Staff', role: 'Staff', view: 'staff', label: 'Staff', singular: 'Staff', icon: '◈', count: 'staff-count', prefix: 'ST', api: 'STAFF' },
    { choice: 'Manager', role: 'Manager', view: 'managers', label: 'Managers', singular: 'Manager', icon: '◆', count: 'manager-count', prefix: 'MG', api: 'MANAGER' },
    { choice: 'HR', role: 'HR', view: 'hr', label: 'HR', singular: 'HR', icon: '◇', count: 'hr-count', prefix: 'HR', api: 'HR' },
    { choice: 'Owner', role: 'Owner', view: 'owners', label: 'Owners', singular: 'Owner', icon: '♛', count: 'owner-count', prefix: 'OW', api: 'OWNER' },
    { choice: 'Entrepreneur', role: 'Entrepreneur', view: 'entrepreneurs', label: 'Entrepreneurs', singular: 'Entrepreneur', icon: '♔', count: 'entrepreneur-count', prefix: 'EN', api: 'ENTREPRENEUR' },
    { choice: 'Temporary Workers', role: 'Temporary Worker', view: 'temporary', label: 'Temporary Workers', singular: 'Temporary Worker', icon: '◷', count: 'temporary-worker-count', prefix: 'TW', api: 'TEMPORARY', temporary: true },
  ];
  const legacyChoices = new Set(['Workers', 'Staff', 'Entrepreneur', 'Temporary Workers']);

  function accountChoices() {
    const values = typeof admin !== 'undefined' && Array.isArray(admin.workforce_types)
      ? admin.workforce_types.map(value => String(value).trim()).filter(Boolean)
      : [];
    return values.length ? new Set(values) : legacyChoices;
  }

  function activeCategories() {
    const choices = accountChoices();
    return catalog.filter(item => choices.has(item.choice));
  }

  function categoryForView(viewName) {
    return catalog.find(item => item.view === viewName);
  }

  function visiblePeople() {
    const roles = new Set(activeCategories().filter(item => !item.temporary).map(item => item.role));
    return (Array.isArray(people) ? people : []).filter(person => roles.has(person.role));
  }

  function recordsFor(category) {
    return category.temporary
      ? (Array.isArray(temporaryWorkers) ? temporaryWorkers : [])
      : (Array.isArray(people) ? people : []).filter(person => person.role === category.role);
  }

  function updateNavigation() {
    const enabled = new Set(activeCategories().map(item => item.view));
    catalog.forEach(category => {
      const button = document.querySelector(`.nav-link[data-view="${category.view}"]`);
      if (button) button.hidden = !enabled.has(category.view);
    });
    const coverage = document.querySelector('.nav-link[data-view="coverage"]');
    if (coverage) coverage.hidden = !enabled.has('workers');
  }

  function updateCounts() {
    catalog.forEach(category => {
      const element = document.getElementById(category.count);
      if (element) element.textContent = String(recordsFor(category).length);
    });
  }

  function attendanceConfiguration() {
    let settings = {};
    try { settings = JSON.parse(localStorage.getItem(tenantKey('attendance-integration-settings')) || '{}'); }
    catch (_) { settings = {}; }
    const hasStoredModes = Array.isArray(settings.modes);
    const storedModes = hasStoredModes ? settings.modes : [];
    const mode = [...storedModes].reverse().find(value => ['face', 'biometric', 'spreadsheet'].includes(value))
      || (!hasStoredModes ? admin.attendance_authentication || 'face' : '');
    const labels = {
      face: 'Face Authentication',
      biometric: 'Biometric Authentication',
      spreadsheet: 'CSV File Authentication',
    };
    return { mode, label: labels[mode] || 'Not selected', manualEnabled: settings.manual_enabled !== false };
  }

  function applyAttendanceConfigurationSummary() {
    const viewRoot = document.querySelector('#view-root');
    if (!viewRoot || viewRoot.querySelector('[data-attendance-configuration-summary]')) return;
    const heading = viewRoot.querySelector('.page-heading');
    if (!heading) return;
    const configuration = attendanceConfiguration();
    heading.insertAdjacentHTML('afterend', `<section class="panel overview-authentication-summary" data-attendance-configuration-summary>
      <div><span>SELECTED AUTHENTICATION</span><b>${esc(configuration.label)}</b><small>Primary attendance integration</small></div>
      <div><span>MANUAL ADMIN ATTENDANCE</span><b class="${configuration.manualEnabled ? 'enabled' : 'disabled'}">${configuration.manualEnabled ? 'ON' : 'OFF'}</b><small>Administrator-only permission</small></div>
      <button type="button" class="secondary" data-view="settings">Open attendance settings →</button>
    </section>`);
  }

  function overviewCard(category) {
    const records = recordsFor(category);
    const total = records.length;
    const present = records.filter(person => person.status === 'Present').length;
    const leave = records.filter(person => person.status === 'On leave').length;
    const absent = records.filter(person => person.status === 'Absent').length;
    return `<article class="metric-group" data-configured-role="${esc(category.role)}" data-overflow-role="${esc(category.role)}" tabindex="0" role="button" aria-label="Open individual ${esc(category.label)} accounts">
      <div class="metric-head"><span class="metric-icon">${category.icon}</span><div><b>${esc(category.label)}</b><small>Live workforce snapshot</small></div></div>
      <div class="metric-body"><div class="metric"><b>${total}</b><span>Total</span></div><div class="metric"><b>${present}</b><span>Present</span></div><div class="metric"><b>${leave}</b><span>On leave</span></div><div class="metric"><b>${absent}</b><span>Absent</span></div></div>
      <button class="overview-overflow-button" type="button" data-overflow-role="${esc(category.role)}">Open individual accounts →</button>
    </article>`;
  }

  function healthSector(category) {
    const records = recordsFor(category);
    const present = records.filter(person => person.status === 'Present').length;
    const leave = records.filter(person => person.status === 'On leave').length;
    const absent = records.filter(person => person.status === 'Absent').length;
    const percentage = records.length ? Math.round(present / records.length * 100) : 0;
    return `<article class="role-attendance-sector ${category.view}-attendance" data-overflow-role="${esc(category.role)}" tabindex="0" role="button" aria-label="Open individual ${esc(category.label)} accounts">
      <div class="role-attendance-head"><div><span>${esc(category.singular)}</span><b>${percentage}% present today</b></div>
        <button type="button" data-overflow-role="${esc(category.role)}">Open individual accounts →</button></div>
      <div class="role-attendance-progress-row"><div class="role-attendance-progress" role="progressbar" aria-label="${esc(category.label)} total present" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percentage}"><i style="width:${percentage}%"></i></div>
        <div class="role-attendance-progress-counts"><span><b>${present}</b> Present</span><span><b>${leave}</b> On leave</span><span><b>${absent}</b> Absent</span></div></div>
      <div class="role-attendance-values"><div><b>${records.length}</b><span>Total people</span></div><div><b>${present}</b><span>Total present</span></div><div><b>${leave}</b><span>On leave:</span></div><div><b>${absent}</b><span>Absent:</span></div></div>
    </article>`;
  }

  function applyOverviewCategories() {
    if (typeof view !== 'undefined' && view !== 'dashboard') return;
    const active = activeCategories();
    applyAttendanceConfigurationSummary();
    const metrics = document.querySelector('#view-root .metrics');
    if (metrics) {
      metrics.classList.remove('four-role-overview');
      metrics.classList.add('configured-workforce-metrics');
      metrics.innerHTML = active.map(overviewCard).join('');
    }
    const overviewGrid = document.querySelector('#view-root .attendance-overview-grid');
    if (overviewGrid && typeof attendanceOverviewCard === 'function') {
      overviewGrid.classList.add('configured-workforce-grid');
      overviewGrid.innerHTML = active.map(category => attendanceOverviewCard(category.label, recordsFor(category), category.view)).join('');
      [...overviewGrid.children].forEach((card, index) => {
        const category = active[index];
        if (!category) return;
        card.dataset.overflowRole = category.role;
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `Open individual ${category.label} accounts`);
      });
    }
    const healthGrid = document.querySelector('#view-root .attendance-health-role-dashboard');
    if (healthGrid) healthGrid.innerHTML = active.map(healthSector).join('');
  }

  function applyAttendanceCategories() {
    const container = document.querySelector('#view-root .calendar-role-sections');
    if (!container || typeof calendarRoleSectionV21 !== 'function') return;
    const saved = attendanceLog.find(item => item.date === calendarDay);
    const record = typeof combinedAttendanceRecordV21 === 'function' ? combinedAttendanceRecordV21(calendarDay, saved) : saved;
    container.innerHTML = activeCategories().map(category => {
      if (category.temporary && typeof calendarTemporarySectionV21 === 'function') return calendarTemporarySectionV21(record);
      return calendarRoleSectionV21(category.label, category.role, record);
    }).join('');
  }

  function withConfiguredCollections(callback) {
    const originalPeople = people;
    const originalTemporary = temporaryWorkers;
    const active = activeCategories();
    people = visiblePeople();
    if (!active.some(category => category.temporary)) temporaryWorkers = [];
    try { return callback(); }
    finally { people = originalPeople; temporaryWorkers = originalTemporary; }
  }

  window.MSMEConfiguredWorkforce = {
    catalog,
    active: activeCategories,
    people: visiblePeople,
    roleForView(viewName) { return categoryForView(viewName)?.role || ''; },
  };

  ['Employee', 'Manager', 'HR', 'Owner'].forEach(roleName => {
    window.MSMEWorkforceDashboards?.register(roleName, {
      label: roleName,
      eyebrow: `${roleName.toUpperCase()} AUTOMATIC ATTENDANCE`,
      records: () => people.filter(person => person.role === roleName),
    });
  });

  role = function configuredRole(viewName) {
    return categoryForView(viewName)?.role || activeCategories().find(category => !category.temporary)?.role || 'Worker';
  };

  add = function addConfiguredPerson(roleName) {
    const category = catalog.find(item => item.role === roleName && !item.temporary) || activeCategories().find(item => !item.temporary);
    if (!category) return;
    const selectedShift = Array.isArray(admin.shifts) && admin.shifts.length ? admin.shifts[0] : { start: admin.shift_start || '09:00', end: admin.shift_end || '18:00' };
    const clock = value => new Date(`2000-01-01T${value}:00`).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const person = fix({ id: `${category.prefix}-${Math.floor(1000 + Math.random() * 8999)}`, name: `New ${category.singular.toLowerCase()}`, role: category.role, dept: 'Unassigned', status: 'Not checked in', shift: `${clock(selectedShift.start)} - ${clock(selectedShift.end)}`, skills: [] });
    people.push(person);
    save();
    editor(person.id);
  };

  const dashboardBase = dashboard;
  dashboard = function configuredDashboard(...args) {
    const result = withConfiguredCollections(() => dashboardBase.apply(this, args));
    applyOverviewCategories();
    setTimeout(applyOverviewCategories, 0);
    return result;
  };

  if (typeof enhanceOverviewDashboard === 'function') {
    const overviewEnhancementBase = enhanceOverviewDashboard;
    enhanceOverviewDashboard = function configuredOverviewEnhancement(...args) {
      const result = withConfiguredCollections(() => overviewEnhancementBase.apply(this, args));
      applyOverviewCategories();
      return result;
    };
  }

  const attendanceCalendarBase = attendanceCalendar;
  attendanceCalendar = function configuredAttendanceCalendar(...args) {
    const result = withConfiguredCollections(() => attendanceCalendarBase.apply(this, args));
    applyAttendanceCategories();
    return result;
  };

  const renderBase = render;
  render = function configuredRender(...args) {
    updateNavigation();
    const category = categoryForView(view);
    if (category && !activeCategories().some(item => item.view === category.view)) view = 'dashboard';
    const activeCategory = categoryForView(view);
    if (activeCategory) {
      document.querySelectorAll('.nav-link').forEach(button => button.classList.toggle('active', button.dataset.view === view));
      if (activeCategory.temporary) temporaryDashboard();
      else roleDashboard(activeCategory.role);
      updateCounts();
      return;
    }
    const result = renderBase.apply(this, args);
    updateNavigation();
    updateCounts();
    applyOverviewCategories();
    return result;
  };

  updateNavigation();
  updateCounts();
})();
