
/* ===== Source component: 21-overview-role-overflows.js ===== */
/* Version 22 - Overview role overflows and categorized important updates. */

const dashboardBeforeRoleOverflows = window.dashboard;

function currentMonthUpdatesV22() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const matchesMonth = value => value && Number(String(value).slice(5, 7)) === currentMonth;
  const displayDate = value => {
    const recurringDate = `${now.getFullYear()}-${String(value).slice(5, 10)}`;
    const date = new Date(`${recurringDate}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', weekday: 'short'
    });
  };

  const birthdays = [];
  const anniversaries = [];
  people.forEach(person => {
    [
      ['dob', `${person.name} birthday`],
      ['father_birthday', `${person.name} – father's birthday`],
      ['mother_birthday', `${person.name} – mother's birthday`],
      ['spouse_birthday', `${person.name} – spouse's birthday`]
    ].forEach(([field, label]) => {
      if (matchesMonth(person[field])) birthdays.push({ label, date: displayDate(person[field]) });
    });
    [
      ['wedding_anniversary', `${person.name} – wedding anniversary`],
      ['parents_anniversary', `${person.name} – parents' anniversary`],
      ['special_date', `${person.name} – special family date`]
    ].forEach(([field, label]) => {
      if (matchesMonth(person[field])) anniversaries.push({ label, date: displayDate(person[field]) });
    });
  });

  const festivals = festivalCalendar
    .filter(item => matchesMonth(item[0]))
    .map(item => ({ label: item[1], date: displayDate(item[0]) }));
  return { birthdays, anniversaries, festivals };
}

function updateSectorV22(title, icon, items, emptyText) {
  return `<section class="update-sector"><div class="update-sector-title"><span>${icon}</span><b>${title}</b>
    <em>${items.length}</em></div>${items.map(item => `<div class="health-line">
      <span>${esc(item.label)}</span><b>${esc(item.date)}</b></div>`).join('') ||
      `<p class="update-empty">${emptyText}</p>`}</section>`;
}

window.dashboard = function dashboardWithRoleOverflows() {
  dashboardBeforeRoleOverflows();

  const metrics = document.querySelector('#view-root .metrics');
  if (metrics && !metrics.querySelector('[data-temporary-overview-card]')) {
    const total = temporaryWorkers.length;
    const present = temporaryWorkers.filter(person => person.status === 'Present').length;
    const leave = temporaryWorkers.filter(person => person.status === 'On leave').length;
    const absent = temporaryWorkers.filter(person => person.status === 'Absent').length;
    metrics.insertAdjacentHTML('beforeend', `<article class="metric-group" data-temporary-overview-card="true"><div class="metric-head"><span class="metric-icon">◷</span><div><b>Temporary Workers</b><small>Live workforce snapshot</small></div></div><div class="metric-body"><div class="metric"><b>${total}</b><span>Total</span></div><div class="metric"><b>${present}</b><span>Present</span></div><div class="metric"><b>${leave}</b><span>On leave</span></div><div class="metric"><b>${absent}</b><span>Absent</span></div></div></article>`);
    metrics.classList.add('four-role-overview');
  }

  const roleNames = ['Worker', 'Staff', 'Entrepreneur', 'Temporary Worker'];
  document.querySelectorAll('#view-root .metric-group').forEach((cardElement, index) => {
    const roleName = roleNames[index];
    if (!roleName) return;
    cardElement.dataset.overflowRole = roleName;
    cardElement.setAttribute('role', 'button');
    cardElement.setAttribute('tabindex', '0');
    cardElement.setAttribute('aria-label', `Open ${roleName} overflow`);
    cardElement.insertAdjacentHTML('beforeend', `<button class="overview-overflow-button" type="button">
      Open ${roleName} overflow →</button>`);
  });

  const updates = currentMonthUpdatesV22();
  const importantBlock = document.querySelector('#view-root .important-block');
  if (importantBlock) {
    importantBlock.innerHTML = `<div class="important-updates-title">
      <b>Important updates – ${new Date().toLocaleString('en', { month: 'long' })}</b>
      <small>Birthdays, anniversaries and festivals</small></div>
      <div class="important-update-sectors">
        ${updateSectorV22('Birthdays', '🎂', updates.birthdays, 'No birthdays this month.')}
        ${updateSectorV22('Anniversaries', '♡', updates.anniversaries, 'No anniversaries this month.')}
        ${updateSectorV22('Festivals', '✦', updates.festivals, 'No festivals this month.')}
      </div>`;
  }
};

function individualMonthStatsV22(person) {
  const prefix = new Date().toISOString().slice(0, 7);
  const records = attendanceLog
    .filter(day => day.date.startsWith(prefix))
    .map(day => day.records.find(record => record.id === person.id))
    .filter(Boolean);
  return {
    present: records.filter(record => record.status === 'Present').length,
    absent: records.filter(record => record.status === 'Absent').length,
    leave: records.filter(record => record.status === 'On leave').length,
    stored: records.length
  };
}

function roleOverflowV22(roleName) {
  const rolePeople = group(roleName);
  const present = rolePeople.filter(person => person.status === 'Present').length;
  const absent = rolePeople.filter(person => person.status === 'Absent').length;
  const leave = rolePeople.filter(person => person.status === 'On leave').length;
  const singular = roleName.toLowerCase();

  root.innerHTML = `<div class="page-heading"><div><div class="eyebrow">${roleName.toUpperCase()} OVERFLOW</div>
    <h1>${roleName} workforce overview.</h1>
    <p>Every ${singular}, current status, skills and individual monthly attendance totals.</p></div>
    <div class="overflow-page-actions"><button class="primary" data-overflow-add="${esc(roleName)}">+ Add ${roleName}</button>
      <button class="secondary" id="back-to-overview">← Back to Overview</button></div></div>
    <div class="work-dashboard overflow-totals">
      <section class="panel"><b>${rolePeople.length}</b><span>Total ${roleName === 'Entrepreneur' ? 'entrepreneurs' : `${singular}s`}</span></section>
      <section class="panel"><b>${present}</b><span>Present today</span></section>
      <section class="panel"><b>${leave}</b><span>On leave today</span></section>
      <section class="panel"><b>${absent}</b><span>Absent today</span></section>
    </div>
    <section class="panel overflow-directory"><div class="panel-header"><div><div class="eyebrow">INDIVIDUAL RECORDS</div>
      <h2>All ${roleName === 'Entrepreneur' ? 'entrepreneurs' : `${singular}s`}</h2></div>
      <span class="tag neutral">${rolePeople.length} profiles</span></div>
      <div class="overflow-person-grid">${rolePeople.map(person => {
        const stats = individualMonthStatsV22(person);
        const calculation = attendanceCalculationV21(person);
        return `<article class="overflow-person-card" data-overflow-profile="${esc(person.id)}" tabindex="0" role="button"
          aria-label="Open complete profile for ${esc(person.name)}">
          <div class="overflow-person-head"><span class="avatar">${ini(person.name)}</span><div>
            <h3>${esc(person.name)}</h3><small>${esc(person.id)} · ${esc(person.dept || 'Department not entered')}</small></div>
            <span class="tag ${cls(person.status || 'Absent')}">${esc(person.status || 'Absent')}</span></div>
          <div class="overflow-person-details">
            <div><span>Shift</span><b>${esc(person.shift || '09:00 AM - 06:00 PM')}</b></div>
            <div><span>Current work total</span><b>${durationTextV21(calculation.total)}</b></div>
            <div><span>Monthly present</span><b>${stats.present}</b></div>
            <div><span>Monthly absent</span><b>${stats.absent}</b></div>
            <div><span>Monthly leave</span><b>${stats.leave}</b></div>
            <div><span>Days stored</span><b>${stats.stored}</b></div>
          </div>
          <div class="overflow-skills"><span>Skills</span><div class="skills">${(person.skills || []).slice(0, 5)
            .map(skill => `<span class="skill">${esc(skill)}</span>`).join('') || '<small>No skills entered</small>'}</div></div>
          <button class="primary overflow-open-profile" type="button">View complete details →</button>
        </article>`;
      }).join('') || `<p class="empty">No ${singular} profiles are stored.</p>`}</div>
    </section>`;
}

document.addEventListener('click', event => {
  const roleCard = event.target.closest('#view-root .metric-group[data-overflow-role]');
  const profileCard = event.target.closest('[data-overflow-profile]');
  const backButton = event.target.closest('#back-to-overview');
  if (!roleCard && !profileCard && !backButton) return;

  /* Bulk-selection controls inside a profile card must not open its editor. */
  if (profileCard && event.target.closest('input, label, [data-bulk-action]')) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  if (roleCard) roleOverflowV22(roleCard.dataset.overflowRole);
  if (profileCard) editor(profileCard.dataset.overflowProfile);
  if (backButton) {
    view = 'dashboard';
    render();
  }
}, true);

document.addEventListener('keydown', event => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const target = event.target.closest('[data-overflow-role], [data-overflow-profile]');
  if (!target) return;
  event.preventDefault();
  target.click();
});

if (document.getElementById('app-shell').classList.contains('visible')) render();


/* ===== Source component: 22-temporary-worker-timing.js ===== */
/* Version 23 - temporary worker parity and duration-based half time. */

function fixedPeriodInput(person, field, period) {
  const value = person[field] ? clockOnly(person[field], person[field]) : '';
  return `<label class="fixed-time-control">
    <input class="time-entry" value="${esc(value)}" placeholder="Enter time"
      data-fixed-time-id="${esc(person.id)}" data-fixed-time-field="${field}"
      data-fixed-period="${period}">
    <b>${period}</b>
  </label>`;
}

function selectedHalfBreakV23(person) {
  const legacyBreak = person.halftime_time || person.halftime_start ? 30 : 30;
  const value = Number(person.half_break_minutes ?? legacyBreak);
  return [30, 60, 120, 180].includes(value) ? value : 30;
}

function halfTimeControlV21(person) {
  const selected = selectedHalfBreakV23(person);
  return `<label class="half-duration-control">
    <select data-half-duration="${esc(person.id)}" aria-label="Half-time duration">
      <option value="30" ${selected === 30 ? 'selected' : ''}>30 mins</option>
      <option value="60" ${selected === 60 ? 'selected' : ''}>1 hr</option>
      <option value="120" ${selected === 120 ? 'selected' : ''}>2 hrs</option>
      <option value="180" ${selected === 180 ? 'selected' : ''}>3 hrs</option>
    </select>
  </label>`;
}

function attendanceCalculationV21(person) {
  if ((person.status || 'Present') !== 'Present') {
    return { elapsed: 0, breakMinutes: 0, work: 0, overtime: 0, total: 0, late: '-' };
  }
  const login = minutes(person.login_time);
  const logout = minutes(person.logout_time);
  const overtime = selectedOvertimeHoursV21(person) * 60;
  const breakMinutes = selectedHalfBreakV23(person);
  if (login === null || logout === null) {
    return { elapsed: null, breakMinutes, work: null, overtime, total: null, late: '-' };
  }
  let elapsed = logout - login;
  if (elapsed < 0) elapsed += 1440;
  const work = Math.max(0, elapsed - breakMinutes);
  const lateMinutes = Math.max(0, login - minutes(GRACE_TIME));
  return {
    elapsed, breakMinutes, work, overtime, total: work + overtime,
    late: lateMinutes ? `${lateMinutes}m late` : 'Within grace'
  };
}

function attendanceRecordsForTodayV21() {
  return people.map(person => {
    const calculation = attendanceCalculationV21(person);
    return {
      id: person.id, name: person.name, role: person.role,
      status: person.status || 'Present',
      shift: person.shift || '09:00 AM - 06:00 PM', grace: GRACE_TIME,
      login: person.login_time || '', logout: person.logout_time || '',
      half_break_minutes: selectedHalfBreakV23(person),
      half: durationTextV21(calculation.breakMinutes),
      overtime_hours: selectedOvertimeHoursV21(person),
      overtime_period: person.overtime_period || 'PM',
      overtime: `${selectedOvertimeHoursV21(person)}h ${person.overtime_period || 'PM'}`,
      work: durationTextV21(calculation.work), total: durationTextV21(calculation.total), late: calculation.late
    };
  });
}

function tempFixedPeriodV23(person, field, period) {
  const value = person[field] ? clockOnly(person[field], person[field]) : '';
  return `<label class="fixed-time-control"><input class="time-entry" value="${esc(value)}" placeholder="Enter time"
    data-temp-fixed-id="${esc(person.id)}" data-temp-fixed-field="${field}" data-temp-fixed-period="${period}">
    <b>${period}</b></label>`;
}

function tempHalfDurationV23(person) {
  const selected = selectedHalfBreakV23(person);
  return `<select class="half-duration-select" data-temp-half-duration="${esc(person.id)}" aria-label="Temporary worker half-time duration">
    <option value="30" ${selected === 30 ? 'selected' : ''}>30 mins</option>
    <option value="60" ${selected === 60 ? 'selected' : ''}>1 hr</option>
    <option value="120" ${selected === 120 ? 'selected' : ''}>2 hrs</option>
    <option value="180" ${selected === 180 ? 'selected' : ''}>3 hrs</option>
  </select>`;
}

function tempOvertimeV23(person) {
  const overtime = selectedOvertimeHoursV21(person);
  const period = person.overtime_period === 'AM' ? 'AM' : 'PM';
  return `<div class="overtime-slider-control"><input type="range" min="0" max="5" step="1" value="${overtime}"
    data-temp-overtime-hours="${esc(person.id)}"><output data-temp-overtime-output="${esc(person.id)}">${overtime} hr</output>
    <select data-temp-overtime-period="${esc(person.id)}" aria-label="Temporary worker overtime AM or PM">
      <option ${period === 'AM' ? 'selected' : ''}>AM</option><option ${period === 'PM' ? 'selected' : ''}>PM</option>
    </select></div>`;
}

window.temporaryDashboard = function temporaryDashboardWithWorkerTiming() {
  const reminders = temporaryWorkers.filter(person => elapsed(person) >= 170);
  root.innerHTML = `<div class="page-heading"><div><div class="eyebrow">TEMPORARY WORKFORCE</div>
    <h1>Temporary worker operations.</h1><p>The same attendance and timing controls as permanent Workers, with a 180-day deadline.</p></div>
    <button class="primary" id="add-temporary">+ Add temporary worker</button></div>
    ${reminders.map(person => `<div class="temporary-banner"><b>${esc(person.name)}</b> — ${esc(tempNote(person))}</div>`).join('')}
    <div class="table-wrap unified-attendance-table"><table class="temporary-timing-table"><thead><tr>
      <th>S.NO</th><th>NAME</th><th>ATTENDANCE</th><th>SHIFT</th><th>GRACE PERIOD</th><th>LOGIN (AM)</th><th>LOGOUT (PM)</th>
      <th>HALF TIME</th><th>OVERTIME 0–5 HR</th><th>WORKING HOURS</th><th>BREAK</th><th>OVERTIME</th>
      <th>FINAL TOTAL</th><th>DEADLINE</th><th>ACTIONS</th></tr></thead><tbody>
      ${temporaryWorkers.map((person, index) => {
        const calculation = attendanceCalculationV21(person);
        return `<tr><td><b>${index + 1}</b></td><td><b>${esc(person.name)}</b><small class="record-id">${esc(person.id)}</small></td>
          <td><select class="attendance-select" data-temp-attendance="${esc(person.id)}">
            <option ${person.status === 'Present' ? 'selected' : ''}>Present</option>
            <option ${person.status === 'Absent' ? 'selected' : ''}>Absent</option>
            <option ${person.status === 'On leave' ? 'selected' : ''}>On leave</option></select></td>
          <td>${esc(person.shift || '09:00 AM - 06:00 PM')}</td><td><b>${GRACE_TIME}</b><small class="record-id">15 minutes</small></td>
          <td>${tempFixedPeriodV23(person, 'login_time', 'AM')}</td><td>${tempFixedPeriodV23(person, 'logout_time', 'PM')}</td>
          <td>${tempHalfDurationV23(person)}</td><td>${tempOvertimeV23(person)}</td>
          <td>${durationTextV21(calculation.work)}</td><td>${durationTextV21(calculation.breakMinutes)}</td>
          <td>${durationTextV21(calculation.overtime)}</td><td><b>${durationTextV21(calculation.total)}</b>
            <small class="record-id">${esc(calculation.late)}</small></td>
          <td>${elapsed(person)}/180 days${tempNote(person) ? `<small class="record-id warning-text">${esc(tempNote(person))}</small>` : ''}</td>
          <td><div class="row-actions"><button class="action" data-temp="${esc(person.id)}">Edit</button>
            <button class="action save-person-button" data-save-temp="${esc(person.id)}">Save</button>
            <button class="action" data-permanent="${esc(person.id)}">Make permanent</button></div></td></tr>`;
      }).join('') || '<tr><td colspan="15" class="empty">No temporary workers.</td></tr>'}
    </tbody></table></div>`;
};

window.tempEditor = function fullTemporaryWorkerEditor(id) {
  let person = temporaryWorkers.find(item => item.id === id);
  const isNew = !person;
  if (!person) {
    person = fix({
      id: `TW-${Math.floor(1000 + Math.random() * 8999)}`,
      role: 'Worker', name: '', dept: 'Temporary workforce', status: 'Present',
      temporary_start: new Date().toISOString().slice(0, 10), skills: []
    });
  }

  people.push(person);
  editor(person.id);
  people = people.filter(item => item !== person);

  const form = document.querySelector('#modal-root form');
  if (!form) return;
  form.querySelector('.eyebrow').textContent = 'TEMPORARY WORKER MASTER FORM';
  form.querySelector('h2').textContent = person.name || 'New temporary worker';
  const permanentArchive = form.querySelector('#archive');
  const permanentArchiveNote = permanentArchive?.previousElementSibling;
  permanentArchive?.remove();
  if (permanentArchiveNote?.classList.contains('resignation-note')) permanentArchiveNote.remove();
  const firstGrid = form.querySelector('.form-grid');
  if (firstGrid && !form.elements.temporary_start) {
    firstGrid.insertAdjacentHTML('beforeend', `<label>Temporary start date<span class="required">*</span>
      <input type="date" name="temporary_start" value="${esc(person.temporary_start)}" required></label>`);
  }
  const saveButton = form.querySelector('.modal-actions .primary');
  if (saveButton) saveButton.textContent = 'Save temporary worker';
  const actions = form.querySelector('.modal-actions');
  actions?.insertAdjacentHTML('afterbegin', `<span class="resignation-note">${isNew
    ? 'Save this temporary worker first; then reopen the form to move the profile to Ex-Employees.'
    : 'Use this when the temporary worker resigns. The complete profile will remain available in Ex-Employees.'}</span>
    <button class="secondary resignation-button" type="button" data-temp-form-archive="${esc(person.id)}"
      ${isNew ? 'disabled title="Save the temporary worker first"' : ''}>Move to Ex-Employee</button>`);
  const originalSubmit = form.onsubmit;
  form.onsubmit = event => {
    if (isNew && !temporaryWorkers.includes(person)) temporaryWorkers.push(person);
    originalSubmit(event);
  };
};

document.addEventListener('input', event => {
  const overtime = event.target.closest('[data-temp-overtime-hours]');
  if (!overtime) return;
  const output = document.querySelector(`[data-temp-overtime-output="${overtime.dataset.tempOvertimeHours}"]`);
  if (output) output.textContent = `${overtime.value} hr`;
});

document.addEventListener('change', event => {
  const half = event.target.closest('[data-half-duration]');
  if (half) {
    event.stopImmediatePropagation();
    const person = people.find(item => item.id === half.dataset.halfDuration);
    if (!person) return;
    person.half_break_minutes = Number(half.value);
    logToday();
    render();
    return;
  }

  const fixed = event.target.closest('[data-temp-fixed-id]');
  const tempHalf = event.target.closest('[data-temp-half-duration]');
  const overtime = event.target.closest('[data-temp-overtime-hours]');
  const overtimePeriod = event.target.closest('[data-temp-overtime-period]');
  if (!fixed && !tempHalf && !overtime && !overtimePeriod) return;
  event.stopImmediatePropagation();
  const id = fixed?.dataset.tempFixedId || tempHalf?.dataset.tempHalfDuration ||
    overtime?.dataset.tempOvertimeHours || overtimePeriod?.dataset.tempOvertimePeriod;
  const person = temporaryWorkers.find(item => item.id === id);
  if (!person) return;
  if (fixed) {
    const clock = fixed.value.trim().replace(/\s*(AM|PM)$/i, '');
    person[fixed.dataset.tempFixedField] = clock ? `${clock} ${fixed.dataset.tempFixedPeriod}` : '';
  }
  if (tempHalf) person.half_break_minutes = Number(tempHalf.value);
  if (overtime) person.overtime_hours = Number(overtime.value);
  if (overtimePeriod) person.overtime_period = overtimePeriod.value;
  save();
  render();
}, true);

/* Save typed clock values when the user leaves the field. This also makes the
   manual entry reliable in browsers that do not emit change until much later. */
document.addEventListener('focusout', event => {
  const fixed = event.target.closest('[data-fixed-time-id]');
  const tempFixed = event.target.closest('[data-temp-fixed-id]');
  if (!fixed && !tempFixed) return;
  if (fixed) {
    const person = people.find(item => item.id === fixed.dataset.fixedTimeId);
    if (!person) return;
    const clock = fixed.value.trim().replace(/\s*(AM|PM)$/i, '');
    person[fixed.dataset.fixedTimeField] = clock ? `${clock} ${fixed.dataset.fixedPeriod}` : '';
    logToday();
  }
  if (tempFixed) {
    const person = temporaryWorkers.find(item => item.id === tempFixed.dataset.tempFixedId);
    if (!person) return;
    const clock = tempFixed.value.trim().replace(/\s*(AM|PM)$/i, '');
    person[tempFixed.dataset.tempFixedField] = clock ? `${clock} ${tempFixed.dataset.tempFixedPeriod}` : '';
    save();
  }
  render();
}, true);

document.addEventListener('click', event => {
  const addOverflow = event.target.closest('[data-overflow-add]');
  const saveTemp = event.target.closest('[data-save-temp]');
  const archiveTemp = event.target.closest('[data-temp-form-archive]');
  if (!addOverflow && !saveTemp && !archiveTemp) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (addOverflow) {
    const roleName = addOverflow.dataset.overflowAdd;
    add(roleName);
  }
  if (saveTemp) {
    save();
    saveTemp.textContent = 'Saved ✓';
    saveTemp.classList.add('saved');
    setTimeout(() => { saveTemp.textContent = 'Save'; saveTemp.classList.remove('saved'); }, 1400);
  }
  if (archiveTemp) {
    const person = temporaryWorkers.find(item => item.id === archiveTemp.dataset.tempFormArchive);
    const form = archiveTemp.closest('form');
    const reason = form?.elements.exit_reason?.value.trim();
    const exitDate = form?.elements.exit_date?.value;
    if (!person) return;
    if (!reason || !exitDate) {
      form?.elements.exit_reason?.reportValidity();
      form?.elements.exit_date?.reportValidity();
      return;
    }
    if (!confirm(`Move ${person.name} to Ex-Employees?`)) return;
    person.exit_reason = reason;
    person.exit_note = reason;
    person.exit_date = exitDate;
    temporaryWorkers = temporaryWorkers.filter(item => item.id !== person.id);
    exPeople.push({ ...person, role: 'Temporary Worker', exit_note: person.exit_note || 'Resigned temporary worker' });
    save();
    document.getElementById('modal-root').innerHTML = '';
    render();
  }
}, true);

if (document.getElementById('app-shell').classList.contains('visible')) render();


/* ===== Source component: 23-worker-resignation-archive.js ===== */
/* Version 24 - worker resignation archive action. */

const editorBeforeResignationAction = window.editor;

window.editor = function editorWithResignationAction(id, isEx = false) {
  const person = (isEx ? exPeople : people).find(item => item.id === id);
  editorBeforeResignationAction(id, isEx);
  if (!person || isEx) return;

  const actions = document.querySelector('#modal-root .modal-actions');
  if (!actions) return;
  let archiveButton = document.getElementById('archive');
  if (!archiveButton) {
    actions.insertAdjacentHTML('afterbegin', '<button class="secondary" type="button" id="archive">Move to Ex-Employee</button>');
    archiveButton = document.getElementById('archive');
  }
  archiveButton.textContent = 'Move to Ex-Employee';
  archiveButton.title = `Move this complete ${person.role} profile to Ex-Employees`;
  archiveButton.classList.add('resignation-button');
  archiveButton.insertAdjacentHTML('beforebegin', `<span class="resignation-note">
    Use this when the ${esc(person.role.toLowerCase())} resigns. The complete profile will remain available in Ex-Employees.</span>`);
  archiveButton.onclick = () => {
    if (!confirm(`Move ${person.name} to Ex-Employees?`)) return;
    people = people.filter(item => item.id !== person.id);
    exPeople.push({ ...person, exit_note: person.exit_note || `Resigned ${person.role.toLowerCase()}` });
    save();
    document.getElementById('modal-root').innerHTML = '';
    render();
  };
};

if (document.getElementById('app-shell').classList.contains('visible')) render();


/* ===== Source component: 24-attendance-calendar-downloads.js ===== */
/* Version 25 - advanced attendance calendar navigation and ranged downloads. */

function localDateKeyV25(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function changeAttendanceMonthV25(offset) {
  const current = new Date(`${calendarDay}T00:00:00`);
  current.setDate(1);
  current.setMonth(current.getMonth() + offset);
  calendarDay = localDateKeyV25(current);
  render();
}

function calendarYearOptionsV25(selectedYear) {
  const storedYears = attendanceLog.map(day => Number(day.date.slice(0, 4))).filter(Number.isFinite);
  const currentYear = new Date().getFullYear();
  const minimum = Math.min(currentYear - 5, selectedYear - 2, ...storedYears);
  const maximum = Math.max(currentYear + 10, selectedYear + 5, ...storedYears);
  return Array.from({ length: maximum - minimum + 1 }, (_, index) => minimum + index)
    .map(year => `<option value="${year}" ${year === selectedYear ? 'selected' : ''}>${year}</option>`).join('');
}

window.attendanceCalendar = function advancedAttendanceCalendarV25() {
  const date = new Date(`${calendarDay}T00:00:00`);
  const year = date.getFullYear();
  const month = date.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const savedRecord = attendanceLog.find(item => item.date === calendarDay);
  const record = typeof combinedAttendanceRecordV21 === 'function'
    ? combinedAttendanceRecordV21(calendarDay, savedRecord)
    : savedRecord;
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
  const todayKey = localDateKeyV25();
  const monthNames = Array.from({ length: 12 }, (_, index) =>
    new Date(2000, index, 1).toLocaleString('en', { month: 'long' }));

  root.innerHTML = `<div class="page-heading attendance-page-heading"><div>
      <div class="eyebrow">DAILY ATTENDANCE REGISTER</div><h1>Attendance calendar.</h1>
      <p>Navigate month by month, select a saved date, or download attendance for a custom date range.</p>
    </div><div class="calendar-page-actions">
      <button class="calendar-action-button" id="delete-day">Delete day</button>
      <button class="calendar-action-button" id="restore-day">Restore day</button>
      <button class="calendar-action-button" id="save-day-attendance">Save attendance</button>
      <button class="calendar-action-button strong" id="download-attendance">⇩ Download everyone’s attendance</button>
    </div></div>
    <section class="panel attendance-calendar-panel advanced-calendar-panel">
      <div class="advanced-calendar-toolbar">
        <button class="calendar-nav-button" id="previous-attendance-month" aria-label="Previous month">‹</button>
        <div class="calendar-title-block"><small>SELECTED MONTH</small>
          <h2>${monthNames[month]} ${year}</h2></div>
        <button class="calendar-nav-button" id="next-attendance-month" aria-label="Next month">›</button>
        <div class="calendar-month-year-picker">
          <label>Month<select id="attendance-month-select">${monthNames.map((name, index) =>
            `<option value="${index}" ${index === month ? 'selected' : ''}>${name}</option>`).join('')}</select></label>
          <label>Year<select id="attendance-year-select">${calendarYearOptionsV25(year)}</select></label>
          <button id="attendance-today" class="calendar-today-button">Today</button>
        </div>
      </div>
      <div class="attendance-calendar">${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
        .map(day => `<b>${day}</b>`).join('')}${'<i></i>'.repeat(firstDay)}
        ${Array.from({ length: lastDay }, (_, index) => {
          const day = String(index + 1).padStart(2, '0');
          const key = `${monthPrefix}${day}`;
          const entry = attendanceLog.find(item => item.date === key);
          const present = entry?.records?.filter(item => item.status === 'Present').length || 0;
          const isToday = key === todayKey;
          return `<button class="attendance-day ${key === calendarDay ? 'selected' : ''} ${isToday ? 'today-date' : ''}"
            data-attendance-date="${key}" aria-label="${key}${isToday ? ', today' : ''}">
            <span class="calendar-date-number">${index + 1}</span>
            ${isToday ? '<span class="today-check">✓ Today</span>' : ''}
            <small>${entry ? `${present} present · Saved` : 'Not saved'}</small></button>`;
        }).join('')}</div>
      <div class="calendar-legend"><span><i class="legend-today">✓</i> Today</span>
        <span><i class="legend-selected"></i> Selected date</span>
        <b>${savedRecord ? `Attendance saved for ${calendarDay}` : `No saved attendance for ${calendarDay}`}</b></div>
      <div class="manual-attendance-switch"><span><b>Manual attendance control</b><small>Automatic face attendance is shown by default. Turn this ON only to enter or correct records manually.</small></span>
        <label class="enter-manually-button"><input type="checkbox" id="manual-attendance-toggle" ${manualAttendanceEnabledV21 ? 'checked' : ''}><i></i><b>Enter manually: ${manualAttendanceEnabledV21 ? 'ON' : 'OFF'}</b></label></div>
    </section>
    <div class="calendar-role-sections">
      ${calendarTemporarySectionV21(record)}
      ${calendarRoleSectionV21('Workers', 'Worker', record)}
      ${calendarRoleSectionV21('Staff', 'Staff', record)}
      ${calendarRoleSectionV21('Entrepreneurs', 'Entrepreneur', record)}
    </div>`;
  if (typeof syncAutomaticAttendanceV21 === 'function') syncAutomaticAttendanceV21(calendarDay);
};

function openAttendanceDownloadRangeV25() {
  const selected = new Date(`${calendarDay}T00:00:00`);
  const start = `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}-01`;
  const end = localDateKeyV25(new Date(selected.getFullYear(), selected.getMonth() + 1, 0));
  document.getElementById('modal-root').innerHTML = `<div class="modal-backdrop"><form class="modal range-download-modal"
    id="attendance-range-form"><div class="modal-head"><div><div class="eyebrow">ATTENDANCE EXPORT</div>
    <h2>Choose the download period</h2><p>Select one date to another date. All saved Worker, Staff and Entrepreneur
    attendance inside this period will be downloaded.</p></div><button class="close" type="button" id="close-range-download">×</button></div>
    <div class="download-range-presets"><button type="button" data-range-preset="month">Selected month</button>
      <button type="button" data-range-preset="previous">Previous month</button>
      <button type="button" data-range-preset="year">Selected year</button></div>
    <div class="range-date-grid"><label>FROM DATE<input type="date" id="attendance-range-from" value="${start}" required></label>
      <span class="range-arrow">→</span><label>TO DATE<input type="date" id="attendance-range-to" value="${end}" required></label></div>
    <div class="range-download-summary" id="range-download-summary"></div>
    <div class="modal-actions"><button class="secondary" type="button" id="cancel-range-download">Cancel</button>
      <button class="primary" type="submit">⇩ Download selected attendance</button></div></form></div>`;
  updateRangeSummaryV25();
}

function updateRangeSummaryV25() {
  const from = document.getElementById('attendance-range-from')?.value;
  const to = document.getElementById('attendance-range-to')?.value;
  const summary = document.getElementById('range-download-summary');
  if (!summary || !from || !to) return;
  const days = attendanceLog.filter(day => day.date >= from && day.date <= to);
  const records = days.reduce((total, day) => total + day.records.length, 0);
  summary.innerHTML = from > to
    ? '<b>End date must be on or after the start date.</b>'
    : `<b>${days.length} saved attendance day${days.length === 1 ? '' : 's'}</b><span>${records} individual records will be downloaded.</span>`;
}

function setRangePresetV25(preset) {
  const selected = new Date(`${calendarDay}T00:00:00`);
  let start;
  let end;
  if (preset === 'previous') {
    start = new Date(selected.getFullYear(), selected.getMonth() - 1, 1);
    end = new Date(selected.getFullYear(), selected.getMonth(), 0);
  } else if (preset === 'year') {
    start = new Date(selected.getFullYear(), 0, 1);
    end = new Date(selected.getFullYear(), 11, 31);
  } else {
    start = new Date(selected.getFullYear(), selected.getMonth(), 1);
    end = new Date(selected.getFullYear(), selected.getMonth() + 1, 0);
  }
  document.getElementById('attendance-range-from').value = localDateKeyV25(start);
  document.getElementById('attendance-range-to').value = localDateKeyV25(end);
  updateRangeSummaryV25();
}

function downloadAttendanceRangeV25(from, to) {
  const rows = [['Date','Name','Role','Status','Shift','Grace period','Login','Logout','Half time','Break','Overtime','Working hours','Final total','Grace status']];
  attendanceLog.filter(day => day.date >= from && day.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach(day => day.records.forEach(record => rows.push([
      day.date, record.name, record.role, record.status, record.shift || '', record.grace || GRACE_TIME,
      show12(record.login), show12(record.logout), record.half_time ? show12(record.half_time) : '',
      record.half || '', record.overtime || '', record.work || '', record.total || '', record.late || ''
    ])));
  const csv = rows.map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
  const fileUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = fileUrl;
  link.download = `msme-attendance-${from}-to-${to}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
}

document.addEventListener('click', event => {
  const download = event.target.closest('#download-attendance');
  const previous = event.target.closest('#previous-attendance-month');
  const next = event.target.closest('#next-attendance-month');
  const today = event.target.closest('#attendance-today');
  const closeRange = event.target.closest('#close-range-download, #cancel-range-download');
  const preset = event.target.closest('[data-range-preset]');
  if (!download && !previous && !next && !today && !closeRange && !preset) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (download) openAttendanceDownloadRangeV25();
  if (previous) changeAttendanceMonthV25(-1);
  if (next) changeAttendanceMonthV25(1);
  if (today) { calendarDay = localDateKeyV25(); render(); }
  if (closeRange) document.getElementById('modal-root').innerHTML = '';
  if (preset) setRangePresetV25(preset.dataset.rangePreset);
}, true);

document.addEventListener('change', event => {
  const monthSelect = event.target.closest('#attendance-month-select');
  const yearSelect = event.target.closest('#attendance-year-select');
  const rangeDate = event.target.closest('#attendance-range-from, #attendance-range-to');
  if (!monthSelect && !yearSelect && !rangeDate) return;
  event.stopImmediatePropagation();
  if (rangeDate) { updateRangeSummaryV25(); return; }
  const current = new Date(`${calendarDay}T00:00:00`);
  const month = Number(document.getElementById('attendance-month-select').value);
  const year = Number(document.getElementById('attendance-year-select').value);
  const day = Math.min(current.getDate(), new Date(year, month + 1, 0).getDate());
  calendarDay = localDateKeyV25(new Date(year, month, day));
  render();
}, true);

document.addEventListener('submit', event => {
  if (event.target.id !== 'attendance-range-form') return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const from = document.getElementById('attendance-range-from').value;
  const to = document.getElementById('attendance-range-to').value;
  if (from > to) { updateRangeSummaryV25(); return; }
  downloadAttendanceRangeV25(from, to);
  document.getElementById('modal-root').innerHTML = '';
}, true);

if (document.getElementById('app-shell').classList.contains('visible')) render();


/* ===== Source component: 25-overtime-dropdowns-and-brand.js ===== */
/* Version 26 - overtime dropdowns and updated brand treatment. */

function selectedOvertimeHoursV21(person) {
  const value = Number(person.overtime_hours ?? 0);
  return Math.min(5, Math.max(0, Number.isFinite(value) ? value : 0));
}

function overtimeSliderV21(person) {
  const selected = selectedOvertimeHoursV21(person);
  const period = person.overtime_period === 'AM' ? 'AM' : 'PM';
  return `<div class="overtime-dropdown-control">
    <select data-overtime-hours="${esc(person.id)}" aria-label="Overtime hours">
      ${[0, 1, 2, 3, 4, 5].map(hour => `<option value="${hour}" ${selected === hour ? 'selected' : ''}>${hour}hr</option>`).join('')}
    </select>
    <select data-overtime-period="${esc(person.id)}" aria-label="Overtime AM or PM">
      <option ${period === 'AM' ? 'selected' : ''}>AM</option>
      <option ${period === 'PM' ? 'selected' : ''}>PM</option>
    </select>
  </div>`;
}

function tempOvertimeV23(person) {
  const selected = selectedOvertimeHoursV21(person);
  const period = person.overtime_period === 'AM' ? 'AM' : 'PM';
  return `<div class="overtime-dropdown-control">
    <select data-temp-overtime-hours="${esc(person.id)}" aria-label="Temporary worker overtime hours">
      ${[0, 1, 2, 3, 4, 5].map(hour => `<option value="${hour}" ${selected === hour ? 'selected' : ''}>${hour}hr</option>`).join('')}
    </select>
    <select data-temp-overtime-period="${esc(person.id)}" aria-label="Temporary worker overtime AM or PM">
      <option ${period === 'AM' ? 'selected' : ''}>AM</option>
      <option ${period === 'PM' ? 'selected' : ''}>PM</option>
    </select>
  </div>`;
}

if (document.getElementById('app-shell').classList.contains('visible')) render();
