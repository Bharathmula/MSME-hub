/* Company-specific workforce modules selected during workspace creation. */
(function () {
  const catalog = [
    { choice: 'Temporary Workers', role: 'Temporary Worker', view: 'temporary', label: 'Temporary Workers', singular: 'Temporary Worker', icon: '◷', count: 'temporary-worker-count', prefix: 'TW', api: 'TEMPORARY', temporary: true },
    { choice: 'Employees', role: 'Employee', view: 'employees', label: 'Employees', singular: 'Employee', icon: '◎', count: 'employee-count', prefix: 'EMP', api: 'EMPLOYEE' },
    { choice: 'Workers', role: 'Worker', view: 'workers', label: 'Workers', singular: 'Worker', icon: '◉', count: 'worker-count', prefix: 'WR', api: 'WORKER' },
    { choice: 'Staff', role: 'Staff', view: 'staff', label: 'Staff', singular: 'Staff', icon: '◈', count: 'staff-count', prefix: 'ST', api: 'STAFF' },
    { choice: 'Manager', role: 'Manager', view: 'managers', label: 'Managers', singular: 'Manager', icon: '◆', count: 'manager-count', prefix: 'MG', api: 'MANAGER' },
    { choice: 'HR', role: 'HR', view: 'hr', label: 'HR', singular: 'HR', icon: '◇', count: 'hr-count', prefix: 'HR', api: 'HR' },
    { choice: 'Owner', role: 'Owner', view: 'owners', label: 'Owners', singular: 'Owner', icon: '♛', count: 'owner-count', prefix: 'OW', api: 'OWNER' },
    { choice: 'Entrepreneur', role: 'Entrepreneur', view: 'entrepreneurs', label: 'Entrepreneurs', singular: 'Entrepreneur', icon: '♔', count: 'entrepreneur-count', prefix: 'EN', api: 'ENTREPRENEUR' },
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
    const counts = typeof attendanceStatusCounts === 'function'
      ? attendanceStatusCounts(records)
      : { total: records.length, present: 0, approved_leave: 0, no_checkin: 0, missed_checkout: 0, absent: 0, not_due: 0 };
    const percentage = counts.total ? Math.round(counts.present / counts.total * 100) : 0;
    const attention = counts.no_checkin + counts.missed_checkout + counts.absent;
    const chips = (typeof attendanceOperationalStatusesV43 !== 'undefined' ? attendanceOperationalStatusesV43 : [])
      .map(status => `<span class="attendance-health-chip ${status.code}"><b>${counts[status.code] || 0}</b>${esc(status.label)}</span>`).join('');
    return `<article class="role-attendance-sector ${category.view}-attendance" data-attendance-insights-role="${esc(category.view)}" tabindex="0" role="button" aria-label="Open ${esc(category.label)} attendance insights">
      <div class="role-attendance-head"><div><span>${esc(category.singular)}</span><b>${percentage}% present today</b></div>
        <button type="button" data-attendance-insights-role="${esc(category.view)}">Open attendance insights →</button></div>
      <div class="role-attendance-progress-row"><div class="role-attendance-progress" role="progressbar" aria-label="${esc(category.label)} total present" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percentage}"><i style="width:${percentage}%"></i></div>
        <div class="role-attendance-progress-counts"><span><b>${counts.present}</b> Present</span><span><b>${counts.approved_leave}</b> Approved leave</span><span><b>${attention}</b> Needs attention</span></div></div>
      <div class="attendance-health-statuses">${chips}</div>
    </article>`;
  }

  let attendanceInsightsState = {
    role: 'all',
    status: 'all',
    date: typeof indiaAttendanceDateV37 === 'function' ? indiaAttendanceDateV37() : new Date().toISOString().slice(0, 10),
  };

  function attendanceInsightRows() {
    const categories = activeCategories();
    const scopedCategories = categories.filter(category => attendanceInsightsState.role === 'all' || category.view === attendanceInsightsState.role);
    return scopedCategories.flatMap(category => recordsFor(category).map(person => ({
      category,
      person,
      state: attendanceOperationalStateV43(person, attendanceInsightsState.date),
    })));
  }

  function downloadAttendanceInsightsReport() {
    const rows = attendanceInsightRows().filter(item => attendanceInsightsState.status === 'all' || item.state.code === attendanceInsightsState.status);
    const csvCell = value => {
      const text = String(value ?? '');
      const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${safe.replaceAll('"', '""')}"`;
    };
    const dayNote = attendanceLog.find(item => item.date === attendanceInsightsState.date)?.note || '';
    const report = [['Date', 'Name', 'ID', 'Category', 'Status', 'Shift', 'Check-in', 'Check-out', 'Source', 'Person note', 'Day note']];
    rows.forEach(({ category, person, state }) => report.push([
      attendanceInsightsState.date,
      person.name,
      person.id,
      category.label,
      state.label,
      person.shift || `${admin.shift_start || '09:00'} - ${admin.shift_end || '18:00'}`,
      state.login ? (typeof show12 === 'function' ? show12(state.login) : state.login) : '',
      state.logout ? (typeof show12 === 'function' ? show12(state.logout) : state.logout) : '',
      state.source,
      state.record?.attendance_note || '',
      dayNote,
    ]));
    const csv = report.map(row => row.map(csvCell).join(',')).join('\n');
    const fileUrl = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    const category = attendanceInsightsState.role === 'all' ? 'all-workforce' : attendanceInsightsState.role;
    const status = attendanceInsightsState.status === 'all' ? 'all-statuses' : attendanceInsightsState.status;
    link.href = fileUrl;
    link.download = `msme-${category}-${status}-${attendanceInsightsState.date}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
  }

  function attendanceInsightsPage() {
    const categories = activeCategories();
    const allRows = attendanceInsightRows();
    const rows = allRows.filter(item => attendanceInsightsState.status === 'all' || item.state.code === attendanceInsightsState.status);
    const roleLabel = attendanceInsightsState.role === 'all'
      ? 'All workforce categories'
      : categories.find(category => category.view === attendanceInsightsState.role)?.label || 'Selected workforce';
    const selectedStatus = attendanceOperationalStatusesV43.find(status => status.code === attendanceInsightsState.status);
    const statusLabel = selectedStatus?.label || 'Every attendance status';
    const counts = { total: allRows.length };
    attendanceOperationalStatusesV43.forEach(status => { counts[status.code] = allRows.filter(item => item.state.code === status.code).length; });
    const summary = attendanceOperationalStatusesV43.map(status => `<button type="button" class="attendance-insight-metric ${status.code} ${attendanceInsightsState.status === status.code ? 'active' : ''}" data-attendance-insight-filter-status="${status.code}"><span>${esc(status.label)}</span><b>${counts[status.code]}</b><small>View matching records</small></button>`).join('');
    const roleOptions = [`<option value="all">All workforce categories</option>`, ...categories.map(category => `<option value="${esc(category.view)}" ${attendanceInsightsState.role === category.view ? 'selected' : ''}>${esc(category.label)}</option>`)].join('');
    const statusOptions = [`<option value="all">Every attendance status</option>`, ...attendanceOperationalStatusesV43.map(status => `<option value="${status.code}" ${attendanceInsightsState.status === status.code ? 'selected' : ''}>${esc(status.label)}</option>`)].join('');
    const body = rows.map(({ category, person, state }) => `<tr>
      <td><div class="cell-person"><span class="avatar">${ini(person.name)}</span><div><b>${esc(person.name)}</b><small>${esc(person.id)}</small></div></div></td>
      <td>${esc(category.label)}</td><td><span class="attendance-insight-status ${state.code}">${esc(state.label)}</span></td>
      <td>${esc(person.shift || `${admin.shift_start || '09:00'} - ${admin.shift_end || '18:00'}`)}</td>
      <td>${esc(state.login ? (typeof show12 === 'function' ? show12(state.login) : state.login) : '—')}</td>
      <td>${esc(state.logout ? (typeof show12 === 'function' ? show12(state.logout) : state.logout) : '—')}</td>
      <td>${esc(state.source)}</td><td><button class="action" type="button" data-attendance-insights-profile="${esc(person.id)}">Open profile</button></td>
    </tr>`).join('') || '<tr><td colspan="8" class="empty">No attendance records match these filters.</td></tr>';

    root.innerHTML = `<div class="page-heading attendance-insights-heading"><div><div class="eyebrow">ATTENDANCE CONTROL CENTRE</div><h1>${esc(roleLabel)}</h1><p>${esc(statusLabel)} for ${esc(attendanceInsightsState.date)}. Statuses use each person’s shift and grace period.</p></div><div class="attendance-insights-actions"><button class="secondary" type="button" data-attendance-insights-back>← Overview</button><button class="primary" type="button" data-attendance-insights-download>⇩ Download report</button></div></div>
      <section class="attendance-insight-metrics">${summary}</section>
      <section class="panel attendance-insights-panel"><div class="panel-header"><div><h2>Attendance records</h2><p>Open a profile only when personal details are required.</p></div><div class="attendance-insight-filters"><label>DATE<input type="date" data-attendance-insights-date value="${esc(attendanceInsightsState.date)}"></label><label>CATEGORY<select data-attendance-insights-category>${roleOptions}</select></label><label>STATUS<select data-attendance-insights-status>${statusOptions}</select></label></div></div>
      <div class="attendance-insight-guidance"><span><b>Not checked in</b> The employee has not checked in and the shift grace period is still open.</span><span><b>No check-in after grace</b> No attendance was received after the allowed grace period.</span><span><b>Missed check-out</b> A check-in exists but checkout is missing after shift end.</span></div>
      <div class="table-wrap"><table class="attendance-insights-table"><thead><tr><th>PERSON</th><th>CATEGORY</th><th>STATUS</th><th>SHIFT</th><th>CHECK-IN</th><th>CHECK-OUT</th><th>SOURCE</th><th></th></tr></thead><tbody>${body}</tbody></table></div></section>`;
    document.querySelectorAll('.nav-link').forEach(button => button.classList.remove('active'));
  }

  function applyOverviewCategories() {
    if (typeof view !== 'undefined' && view !== 'dashboard') return;
    const active = activeCategories();
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
        delete card.dataset.overflowRole;
        card.dataset.attendanceInsightsRole = category.view;
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `Open ${category.label} attendance insights`);
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
    if (view === 'attendance-insights') {
      attendanceInsightsPage();
      updateCounts();
      return;
    }
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

  document.addEventListener('click', event => {
    const insightTarget = event.target.closest('[data-attendance-insights-role]');
    const statusMetric = event.target.closest('[data-attendance-insight-filter-status]');
    const profileButton = event.target.closest('[data-attendance-insights-profile]');
    const backButton = event.target.closest('[data-attendance-insights-back]');
    const downloadButton = event.target.closest('[data-attendance-insights-download]');
    if (!insightTarget && !statusMetric && !profileButton && !backButton && !downloadButton) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (insightTarget) {
      attendanceInsightsState.role = insightTarget.dataset.attendanceInsightsRole || 'all';
      attendanceInsightsState.status = insightTarget.dataset.attendanceInsightsStatus || 'all';
      attendanceInsightsState.date = typeof indiaAttendanceDateV37 === 'function' ? indiaAttendanceDateV37() : new Date().toISOString().slice(0, 10);
      view = 'attendance-insights';
      render();
      return;
    }
    if (statusMetric) {
      attendanceInsightsState.status = attendanceInsightsState.status === statusMetric.dataset.attendanceInsightFilterStatus
        ? 'all'
        : statusMetric.dataset.attendanceInsightFilterStatus;
      attendanceInsightsPage();
      return;
    }
    if (profileButton) {
      const id = profileButton.dataset.attendanceInsightsProfile;
      if (temporaryWorkers.some(person => person.id === id) && typeof tempEditor === 'function') tempEditor(id);
      else editor(id);
      return;
    }
    if (downloadButton) {
      downloadAttendanceInsightsReport();
      return;
    }
    if (backButton) { view = 'dashboard'; render(); }
  }, true);

  document.addEventListener('change', event => {
    if (view !== 'attendance-insights') return;
    if (event.target.matches('[data-attendance-insights-date]')) attendanceInsightsState.date = event.target.value;
    else if (event.target.matches('[data-attendance-insights-category]')) attendanceInsightsState.role = event.target.value;
    else if (event.target.matches('[data-attendance-insights-status]')) attendanceInsightsState.status = event.target.value;
    else return;
    attendanceInsightsPage();
  });

  document.addEventListener('keydown', event => {
    if (!['Enter', ' '].includes(event.key)) return;
    const target = event.target.closest('[data-attendance-insights-role]');
    if (!target || event.target.closest('button')) return;
    event.preventDefault();
    target.click();
  });

  updateNavigation();
  updateCounts();
})();
