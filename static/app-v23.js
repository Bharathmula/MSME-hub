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
