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
  const record = attendanceLog.find(item => item.date === calendarDay);
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
        <b>${record ? `Attendance saved for ${calendarDay}` : `No saved attendance for ${calendarDay}`}</b></div>
    </section>
    <div class="calendar-role-sections">
      ${calendarRoleSectionV21('Workers', 'Worker', record)}
      ${calendarRoleSectionV21('Staff', 'Staff', record)}
      ${calendarRoleSectionV21('Entrepreneurs', 'Entrepreneur', record)}
    </div>`;
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
