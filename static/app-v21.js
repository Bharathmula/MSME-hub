/* Version 21 - unified role and calendar attendance timing. */

const GRACE_TIME = '09:15 AM';
const HALF_BREAK_MINUTES = 30;

function selectedOvertimeHoursV21(person) {
  const value = Number(person.overtime_hours ?? 0);
  return Math.min(5, Math.max(0, Number.isFinite(value) ? value : 0));
}

function durationTextV21(totalMinutes) {
  if (!Number.isFinite(totalMinutes)) return '-';
  const safe = Math.max(0, Math.round(totalMinutes));
  return `${Math.floor(safe / 60)}h ${safe % 60}m`;
}

function attendanceCalculationV21(person) {
  if ((person.status || 'Present') !== 'Present') {
    return { elapsed: 0, breakMinutes: 0, work: 0, overtime: 0, total: 0, late: '-' };
  }

  const login = minutes(person.login_time || '09:00 AM');
  const logout = minutes(person.logout_time || '06:00 PM');
  const overtime = selectedOvertimeHoursV21(person) * 60;
  const hasHalfTime = Boolean(person.halftime_time || person.halftime_start || '01:00 PM');
  const breakMinutes = hasHalfTime ? HALF_BREAK_MINUTES : 0;

  if (login === null || logout === null) {
    return { elapsed: null, breakMinutes, work: null, overtime, total: null, late: '-' };
  }

  let elapsed = logout - login;
  if (elapsed < 0) elapsed += 1440;
  const work = Math.max(0, elapsed - breakMinutes);
  const grace = minutes(GRACE_TIME);
  const lateMinutes = Math.max(0, login - grace);

  return {
    elapsed,
    breakMinutes,
    work,
    overtime,
    total: work + overtime,
    late: lateMinutes ? `${lateMinutes}m late` : 'Within grace'
  };
}

function halfTimeControlV21(person) {
  const saved = person.halftime_time || person.halftime_start || '';
  const periodMatch = String(saved).match(/\b(AM|PM)\b/i);
  const period = person.halftime_period || periodMatch?.[1]?.toUpperCase() || 'PM';
  const clock = clockOnly(saved, '01:00 PM');
  return `<label class="half-time-control">
    <input class="time-entry" value="${esc(clock)}" placeholder="01:00"
      data-half-time-id="${esc(person.id)}">
    <select data-half-period="${esc(person.id)}" aria-label="Half-time AM or PM">
      <option ${period === 'AM' ? 'selected' : ''}>AM</option>
      <option ${period === 'PM' ? 'selected' : ''}>PM</option>
    </select>
    <small>30m break</small>
  </label>`;
}

function overtimeSliderV21(person) {
  const overtimeHours = selectedOvertimeHoursV21(person);
  const overtimePeriod = person.overtime_period === 'AM' ? 'AM' : 'PM';
  return `<div class="overtime-slider-control">
    <input type="range" min="0" max="5" step="1" value="${overtimeHours}"
      data-overtime-hours="${esc(person.id)}">
    <output data-overtime-output="${esc(person.id)}">${overtimeHours} hr</output>
    <select data-overtime-period="${esc(person.id)}" aria-label="Overtime AM or PM">
      <option ${overtimePeriod === 'AM' ? 'selected' : ''}>AM</option>
      <option ${overtimePeriod === 'PM' ? 'selected' : ''}>PM</option>
    </select>
  </div>`;
}

function timingRowV21(person, savedRecord = null, editable = true, serialNumber = 1) {
  const source = savedRecord ? {
    ...person,
    status: savedRecord.status,
    shift: savedRecord.shift || person.shift,
    login_time: savedRecord.login || person.login_time || '09:00 AM',
    logout_time: savedRecord.logout || person.logout_time || '06:00 PM',
    halftime_time: savedRecord.half_time || person.halftime_time || person.halftime_start || '01:00 PM',
    halftime_period: savedRecord.half_period || person.halftime_period || 'PM',
    overtime_hours: savedRecord.overtime_hours ?? (Number.parseFloat(savedRecord.overtime) || 0),
    overtime_period: savedRecord.overtime_period || String(savedRecord.overtime || '').match(/\b(AM|PM)\b/)?.[1] || 'PM'
  } : person;
  const calculation = attendanceCalculationV21(source);
  const halfDisplay = source.halftime_time
    ? show12(source.halftime_time)
    : (savedRecord?.half || '-');

  return `<tr>
    <td><b>${serialNumber}</b></td>
    <td><b>${esc(person.name)}</b><small class="record-id">${esc(person.id)}</small></td>
    <td>${editable ? `<select class="attendance-select" data-attendance="${esc(person.id)}">
      <option ${source.status === 'Present' ? 'selected' : ''}>Present</option>
      <option ${source.status === 'Absent' ? 'selected' : ''}>Absent</option>
      <option ${source.status === 'On leave' ? 'selected' : ''}>On leave</option>
    </select>` : esc(source.status || 'Not saved')}</td>
    <td>${esc(source.shift || '09:00 AM - 06:00 PM')}</td>
    <td><b>${GRACE_TIME}</b><small class="record-id">15 minutes</small></td>
    <td>${editable ? fixedPeriodInput(person, 'login_time', 'AM', '09:00 AM') : show12(source.login_time)}</td>
    <td>${editable ? fixedPeriodInput(person, 'logout_time', 'PM', '06:00 PM') : show12(source.logout_time)}</td>
    <td>${editable ? halfTimeControlV21(person) : `${esc(halfDisplay)}<small class="record-id">${source.halftime_time ? '30m break' : '-'}</small>`}</td>
    <td>${editable ? overtimeSliderV21(person) : `${selectedOvertimeHoursV21(source)} hr ${esc(source.overtime_period || 'PM')}`}</td>
    <td>${durationTextV21(calculation.work)}</td>
    <td>${durationTextV21(calculation.breakMinutes)}</td>
    <td>${durationTextV21(calculation.overtime)}</td>
    <td><b>${durationTextV21(calculation.total)}</b><small class="record-id">${esc(calculation.late)}</small></td>
    ${editable ? `<td><div class="row-actions">
      <button class="action save-person-button" data-save-person="${esc(person.id)}">Save</button></div></td>` : ''}
  </tr>`;
}

function attendanceTableV21(personList, record, editable = false) {
  return `<div class="table-wrap unified-attendance-table"><table><thead><tr>
    <th>S.NO</th><th>NAME</th><th>ATTENDANCE</th><th>SHIFT</th><th>GRACE PERIOD</th>
    <th>LOGIN (AM)</th><th>LOGOUT (PM)</th><th>HALF TIME</th><th>OVERTIME 0–5 HR</th>
    <th>WORKING HOURS</th><th>BREAK</th><th>OVERTIME</th><th>FINAL TOTAL</th>
    ${editable ? '<th>ACTIONS</th>' : ''}
  </tr></thead><tbody>${personList.map((person, index) => {
    const saved = record?.records?.find(item => item.id === person.id) || null;
    return timingRowV21(person, saved, editable, index + 1);
  }).join('')}</tbody></table></div>`;
}

window.roleDashboard = function roleDashboardWithUnifiedTiming(roleName) {
  const rolePeople = group(roleName);
  root.innerHTML = `<div class="page-heading"><div>
    <div class="eyebrow">${roleName.toUpperCase()} OPERATIONS</div>
    <h1>${roleName} dashboard.</h1>
    <p>Grace is 09:15 AM. Enter login, logout and half time manually; totals calculate automatically.</p>
  </div><button class="primary" id="add-person">+ Add ${roleName}</button></div>
  ${attendanceTableV21(rolePeople, null, true)}`;
};

function calendarRoleSectionV21(title, roleName, record) {
  const rolePeople = group(roleName);
  return `<section class="panel attendance-role-section">
    <div class="panel-header"><div><div class="eyebrow">${roleName.toUpperCase()} ATTENDANCE</div>
      <h2>${title}</h2></div><span class="tag neutral">${record ? 'Saved record' : 'Not saved'}</span></div>
    ${attendanceTableV21(rolePeople, record, false)}
  </section>`;
}

window.attendanceCalendar = function attendanceCalendarWithRoleSections() {
  const date = new Date(`${calendarDay}T00:00:00`);
  const year = date.getFullYear();
  const month = date.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const record = attendanceLog.find(item => item.date === calendarDay);
  const monthPrefix = calendarDay.slice(0, 8);

  root.innerHTML = `<div class="page-heading"><div><div class="eyebrow">DAILY ATTENDANCE REGISTER</div>
    <h1>Attendance calendar.</h1><p>Select a saved date to review complete Worker, Staff and Entrepreneur timing records.</p>
    </div><div><button class="secondary" id="delete-day">Delete day</button>
    <button class="secondary" id="restore-day">Restore day</button>
    <button class="secondary" id="save-day-attendance">Save day attendance</button>
    <button class="primary" id="download-attendance">⇩ Download everyone’s attendance</button></div></div>
    <section class="panel attendance-calendar-panel"><div class="panel-header"><h2>${date.toLocaleString('en', { month: 'long', year: 'numeric' })}</h2>
      <input type="month" id="attendance-month" value="${calendarDay.slice(0, 7)}"></div>
      <div class="attendance-calendar">${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day => `<b>${day}</b>`).join('')}
      ${'<i></i>'.repeat(firstDay)}${Array.from({ length: lastDay }, (_, index) => {
        const day = String(index + 1).padStart(2, '0');
        const key = `${monthPrefix}${day}`;
        const entry = attendanceLog.find(item => item.date === key);
        const present = entry?.records?.filter(item => item.status === 'Present').length || 0;
        return `<button class="attendance-day ${key === calendarDay ? 'selected' : ''}" data-attendance-date="${key}">
          <b>${index + 1}</b><small>${entry ? `${present} present` : 'Not saved'}</small></button>`;
      }).join('')}</div></section>
    <div class="calendar-role-sections">
      ${calendarRoleSectionV21('Workers', 'Worker', record)}
      ${calendarRoleSectionV21('Staff', 'Staff', record)}
      ${calendarRoleSectionV21('Entrepreneurs', 'Entrepreneur', record)}
    </div>`;
};

function attendanceRecordsForTodayV21() {
  return people.map(person => {
    const calculation = attendanceCalculationV21(person);
    return {
      id: person.id,
      name: person.name,
      role: person.role,
      status: person.status || 'Present',
      shift: person.shift || '09:00 AM - 06:00 PM',
      grace: GRACE_TIME,
      login: person.login_time || '09:00 AM',
      logout: person.logout_time || '06:00 PM',
      half_time: person.halftime_time || person.halftime_start || '01:00 PM',
      half_period: person.halftime_period || 'PM',
      half: durationTextV21(calculation.breakMinutes),
      overtime_hours: selectedOvertimeHoursV21(person),
      overtime_period: person.overtime_period || 'PM',
      overtime: `${selectedOvertimeHoursV21(person)}h ${person.overtime_period || 'PM'}`,
      work: durationTextV21(calculation.work),
      total: durationTextV21(calculation.total),
      late: calculation.late
    };
  });
}

function saveAttendanceDateV21(date) {
  const records = attendanceRecordsForTodayV21();
  const index = attendanceLog.findIndex(day => day.date === date);
  if (index < 0) attendanceLog.push({ date, records });
  else attendanceLog[index] = { date, records };
  save();
}

window.logToday = function logTodayV21() {
  saveAttendanceDateV21(new Date().toISOString().slice(0, 10));
};

window.saveSelectedDay = function saveSelectedDayV21() {
  saveAttendanceDateV21(calendarDay);
  render();
  setTimeout(() => alert(`Attendance for ${calendarDay} has been saved permanently.`), 50);
};

window.downloadSheet = function downloadEveryoneAttendanceV21() {
  const rows = [['Date','Name','Role','Status','Shift','Grace period','Login','Logout','Half time','Break','Overtime','Working hours','Final total','Grace status']];
  attendanceLog.forEach(day => day.records.forEach(record => rows.push([
    day.date, record.name, record.role, record.status, record.shift || '', record.grace || GRACE_TIME,
    show12(record.login), show12(record.logout), record.half_time ? show12(record.half_time) : '',
    record.half || '', record.overtime || '', record.work || '', record.total || '', record.late || ''
  ])));
  const csv = rows.map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
  const fileUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = fileUrl;
  link.download = `msme-complete-attendance-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
};

document.addEventListener('change', event => {
  const halfInput = event.target.closest('[data-half-time-id]');
  const halfPeriod = event.target.closest('[data-half-period]');
  if (!halfInput && !halfPeriod) return;

  event.stopImmediatePropagation();
  const personId = halfInput?.dataset.halfTimeId || halfPeriod?.dataset.halfPeriod;
  const person = people.find(item => item.id === personId);
  if (!person) return;

  const input = document.querySelector(`[data-half-time-id="${personId}"]`);
  const period = document.querySelector(`[data-half-period="${personId}"]`);
  const clock = input?.value.trim().replace(/\s*(AM|PM)$/i, '') || '';
  person.halftime_period = period?.value || 'PM';
  person.halftime_time = clock ? `${clock} ${person.halftime_period}` : '';
  logToday();
  render();
}, true);

document.addEventListener('click', event => {
  const saveButton = event.target.closest('[data-save-person]');
  if (!saveButton) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  const person = people.find(item => item.id === saveButton.dataset.savePerson);
  if (!person) return;

  const today = new Date().toISOString().slice(0, 10);
  const newRecord = attendanceRecordsForTodayV21().find(item => item.id === person.id);
  let day = attendanceLog.find(item => item.date === today);
  if (!day) {
    day = { date: today, records: [] };
    attendanceLog.push(day);
  }
  const recordIndex = day.records.findIndex(item => item.id === person.id);
  if (recordIndex < 0) day.records.push(newRecord);
  else day.records[recordIndex] = newRecord;
  save();

  const originalText = saveButton.textContent;
  saveButton.textContent = 'Saved ✓';
  saveButton.classList.add('saved');
  setTimeout(() => {
    saveButton.textContent = originalText;
    saveButton.classList.remove('saved');
  }, 1400);
}, true);

if (document.getElementById('app-shell').classList.contains('visible')) render();
