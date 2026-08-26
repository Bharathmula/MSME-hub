/* Version 20 - simplified timing controls for every role. */

const attendanceCalendarBeforeRosterEditRemoval = window.attendanceCalendar;
const editorBeforeWorkingSectionRemoval = window.editor;

function clockOnly(value, fallback) {
  const formatted = show12(value || fallback);
  return formatted === '-' ? '' : formatted.replace(/\s*(AM|PM)$/i, '');
}

function selectedOvertimeHours(person) {
  const value = Number(person.overtime_hours || 1);
  return Math.min(5, Math.max(1, value));
}

function finalHoursWithSlider(person) {
  const login = minutes(person.login_time);
  const logout = minutes(person.logout_time);
  if (login === null || logout === null) return '-';

  let workMinutes = logout - login;
  if (workMinutes < 0) workMinutes += 1440;

  const halfStart = minutes(person.halftime_start);
  const halfEnd = minutes(person.halftime_end);
  let halfMinutes = 0;
  if (halfStart !== null && halfEnd !== null) {
    halfMinutes = halfEnd - halfStart;
    if (halfMinutes < 0) halfMinutes += 1440;
  }

  const total = Math.max(0, workMinutes - halfMinutes + selectedOvertimeHours(person) * 60);
  return `${Math.floor(total / 60)}h ${total % 60}m`;
}

function fixedPeriodInput(person, field, period, fallback) {
  return `<label class="fixed-time-control">
    <input class="time-entry" value="${esc(clockOnly(person[field], fallback))}"
      placeholder="${esc(clockOnly(fallback, fallback))}"
      data-fixed-time-id="${esc(person.id)}" data-fixed-time-field="${field}"
      data-fixed-period="${period}">
    <b>${period}</b>
  </label>`;
}

function overtimeSlider(person) {
  const overtimeHours = selectedOvertimeHours(person);
  const overtimePeriod = person.overtime_period === 'AM' ? 'AM' : 'PM';
  return `<div class="overtime-slider-control">
    <input type="range" min="1" max="5" step="1" value="${overtimeHours}"
      data-overtime-hours="${esc(person.id)}">
    <output data-overtime-output="${esc(person.id)}">${overtimeHours} hr</output>
    <select data-overtime-period="${esc(person.id)}">
      <option ${overtimePeriod === 'AM' ? 'selected' : ''}>AM</option>
      <option ${overtimePeriod === 'PM' ? 'selected' : ''}>PM</option>
    </select>
  </div>`;
}

window.roleDashboard = function roleDashboardWithFixedPeriods(roleName) {
  const rolePeople = group(roleName);
  root.innerHTML = `<div class="page-heading"><div>
    <div class="eyebrow">${roleName.toUpperCase()} OPERATIONS</div>
    <h1>${roleName} dashboard.</h1>
    <p>Login is fixed to AM, logout is fixed to PM, and overtime is selected manually.</p>
  </div><button class="primary" id="add-person">+ Add ${roleName}</button></div>
  <div class="table-wrap"><table><thead><tr>
    <th>NAME</th><th>ATTENDANCE</th><th>SHIFT</th><th>LOGIN (AM)</th>
    <th>LOGOUT (PM)</th><th>HALF TIME</th><th>OVERTIME 1–5 HR</th>
    <th>TODAY WORK</th><th>FINAL TOTAL</th><th>EDIT</th>
  </tr></thead><tbody>${rolePeople.map(person => `<tr>
    <td><b>${esc(person.name)}</b><small class="record-id">${esc(person.id)}</small></td>
    <td><select class="attendance-select" data-attendance="${esc(person.id)}">
      <option ${person.status === 'Present' ? 'selected' : ''}>Present</option>
      <option ${person.status === 'Absent' ? 'selected' : ''}>Absent</option>
      <option ${person.status === 'On leave' ? 'selected' : ''}>On leave</option>
    </select></td>
    <td>${esc(person.shift || '09:00 AM - 06:00 PM')}</td>
    <td>${fixedPeriodInput(person, 'login_time', 'AM', '09:00 AM')}</td>
    <td>${fixedPeriodInput(person, 'logout_time', 'PM', '06:00 PM')}</td>
    <td>${timeBox(person, 'halftime_start')}${timeBox(person, 'halftime_end')}</td>
    <td>${overtimeSlider(person)}</td>
    <td>${hours(person.login_time, person.logout_time)}</td>
    <td><b>${finalHoursWithSlider(person)}</b></td>
    <td><button class="action" data-id="${esc(person.id)}">Edit</button></td>
  </tr>`).join('')}</tbody></table></div>`;
};

window.editor = function editorWithoutWorkingTimeSection(id, isEx = false) {
  editorBeforeWorkingSectionRemoval(id, isEx);
  const sections = [...document.querySelectorAll('#full-form .form-section')];
  const workingSection = sections.find(section =>
    section.textContent.includes('Working time, attendance and overtime')
  );
  if (workingSection) {
    workingSection.nextElementSibling?.remove();
    workingSection.remove();
  }
  const remainingSections = [...document.querySelectorAll('#full-form .form-section')];
  remainingSections.forEach((section, index) => {
    section.textContent = section.textContent.replace(/^\d+\./, `${index + 1}.`);
  });
};

window.attendanceCalendar = function attendanceCalendarWithoutEditOption() {
  attendanceCalendarBeforeRosterEditRemoval();
  document.getElementById('edit-roster')?.remove();
  const description = document.querySelector('#view-root .page-heading p');
  if (description) {
    description.textContent = 'Saved day-by-day records remain after refresh and can be downloaded, deleted, or restored.';
  }
};

function attendanceRecordsForToday() {
  return people.map(person => ({
    id: person.id,
    name: person.name,
    role: person.role,
    status: person.status || 'Present',
    login: person.login_time || '',
    logout: person.logout_time || '',
    work: hours(person.login_time, person.logout_time),
    half: hours(person.halftime_start, person.halftime_end),
    overtime: `${selectedOvertimeHours(person)}h ${person.overtime_period || 'PM'}`
  }));
}

window.logToday = function logTodayWithSliderOvertime() {
  const today = new Date().toISOString().slice(0, 10);
  const records = attendanceRecordsForToday();
  const index = attendanceLog.findIndex(day => day.date === today);
  if (index < 0) attendanceLog.push({ date: today, records });
  else attendanceLog[index] = { date: today, records };
  save();
};

window.saveSelectedDay = function saveSelectedDayWithSliderOvertime() {
  const records = attendanceRecordsForToday();
  const index = attendanceLog.findIndex(day => day.date === calendarDay);
  if (index < 0) attendanceLog.push({ date: calendarDay, records });
  else attendanceLog[index] = { date: calendarDay, records };
  save();
  render();
  setTimeout(() => alert(`Attendance for ${calendarDay} has been saved permanently.`), 50);
};

document.addEventListener('input', event => {
  const slider = event.target.closest('[data-overtime-hours]');
  if (!slider) return;
  const output = document.querySelector(`[data-overtime-output="${slider.dataset.overtimeHours}"]`);
  if (output) output.textContent = `${slider.value} hr`;
});

document.addEventListener('change', event => {
  const fixedTime = event.target.closest('[data-fixed-time-id]');
  const hoursSlider = event.target.closest('[data-overtime-hours]');
  const periodSelect = event.target.closest('[data-overtime-period]');
  if (!fixedTime && !hoursSlider && !periodSelect) return;

  const personId = fixedTime?.dataset.fixedTimeId ||
    hoursSlider?.dataset.overtimeHours || periodSelect?.dataset.overtimePeriod;
  const person = people.find(item => item.id === personId);
  if (!person) return;

  if (fixedTime) {
    const clock = fixedTime.value.trim().replace(/\s*(AM|PM)$/i, '');
    person[fixedTime.dataset.fixedTimeField] = clock ? `${clock} ${fixedTime.dataset.fixedPeriod}` : '';
  }
  if (hoursSlider) person.overtime_hours = Number(hoursSlider.value);
  if (periodSelect) person.overtime_period = periodSelect.value;

  logToday();
  render();
}, true);

if (document.getElementById('app-shell').classList.contains('visible')) render();
