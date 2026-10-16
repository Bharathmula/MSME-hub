
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

const workforceIconV44 = kind => {
  const paths = {
    people: '<circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><circle cx="12" cy="6" r="3.2"/><path d="M3 19c0-3 2-5 5-5m13 5c0-3-2-5-5-5m-9 5c0-4 2-6 5-6s5 2 5 6"/>',
    worker: '<path d="M4 13h16M6 13v-1a6 6 0 0 1 12 0v1M9 11V7m6 4V7M5 16h14v3H5z"/>',
    briefcase: '<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M9 7V4h6v3M3 12h18M10 12v2h4v-2"/>',
    crown: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8z"/><path d="M6 19h12"/>',
    owner: '<circle cx="10" cy="8" r="3"/><path d="M4 19c0-4 2-6 6-6 2 0 3 .4 4 1.1M18 13l.8 1.8 2 .2-1.5 1.4.4 2-1.7-1-1.7 1 .4-2-1.5-1.4 2-.2L18 13z"/>',
    rocket: '<path d="M14 4c3-1 5-1 6-1 0 1 0 3-1 6l-6 6-4-4 5-7z"/><path d="M9 11l-4 1-2 3 5 1m5-1 1 5 3-2 1-4M8 16l-2 3"/><circle cx="16" cy="7" r="1.5"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[kind] || paths.people}</svg>`;
};

const workforceMetricIconV44 = kind => {
  const paths = {
    people: '<circle cx="9" cy="8" r="3"/><circle cx="16" cy="9" r="2.4"/><path d="M3.5 19c0-4 2-6 5.5-6s5.5 2 5.5 6m0-5c3 0 5 1.7 5 5"/>',
    person: '<circle cx="12" cy="7.5" r="3.2"/><path d="M5.5 20c0-4.6 2.4-7 6.5-7s6.5 2.4 6.5 7"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3.5 2"/>',
    absent: '<circle cx="12" cy="12" r="8"/><path d="M8.5 12h7"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[kind] || paths.person}</svg>`;
};

const workforceCategoryDefinitionsV43 = [
  { saved: 'Temporary Workers', role: 'Temporary Worker', title: 'Temporary Workers', singular: 'Temporary Worker', icon: workforceIconV44('people'), growth: 12, view: 'temporary' },
  { saved: 'Employees', role: 'Employee', title: 'Employees', singular: 'Employee', icon: workforceIconV44('people'), growth: 8, view: '' },
  { saved: 'Workers', role: 'Worker', title: 'Workers', singular: 'Worker', icon: workforceIconV44('worker'), growth: 15, view: 'workers' },
  { saved: 'Staff', role: 'Staff', title: 'Staff', singular: 'Staff', icon: workforceIconV44('briefcase'), growth: 5, view: 'staff' },
  { saved: 'Manager', role: 'Manager', title: 'Managers', singular: 'Manager', icon: workforceIconV44('crown'), growth: 7, view: '' },
  { saved: 'HR', role: 'HR', title: 'HR', singular: 'HR', icon: workforceIconV44('people'), growth: 9, view: '' },
  { saved: 'Owner', role: 'Owner', title: 'Owners', singular: 'Owner', icon: workforceIconV44('owner'), growth: 4, view: '' },
  { saved: 'Entrepreneur', role: 'Entrepreneur', title: 'Entrepreneurs', singular: 'Entrepreneur', icon: workforceIconV44('rocket'), growth: 11, view: 'entrepreneurs' }
];

function enabledWorkforceCategoriesV43() {
  const selected = Array.isArray(admin?.workforce_categories)
    ? admin.workforce_categories.map(value => String(value || '').trim()).filter(Boolean)
    : [];
  if (!selected.length) {
    return workforceCategoryDefinitionsV43.filter(category =>
      ['Temporary Workers', 'Workers', 'Staff', 'Entrepreneur'].includes(category.saved));
  }
  const selectedSet = new Set(selected.map(value => value.toLowerCase()));
  return workforceCategoryDefinitionsV43.filter(category => selectedSet.has(category.saved.toLowerCase()));
}

function workforceCategoryPeopleV43(categoryOrRole) {
  const category = typeof categoryOrRole === 'string'
    ? workforceCategoryDefinitionsV43.find(item => item.role === categoryOrRole || item.saved === categoryOrRole)
    : categoryOrRole;
  if (!category) return [];
  if (category.role === 'Temporary Worker') return [...temporaryWorkers].sort(compareWorkforceIds);
  return group(category.role);
}

function workforceCategoryClassV43(category) {
  return category.role.toLowerCase().replaceAll(' ', '-');
}

function workforceMetricCardV43(category) {
  const records = workforceCategoryPeopleV43(category);
  const present = records.filter(person => person.status === 'Present').length;
  const leave = records.filter(person => person.status === 'On leave').length;
  const absent = records.filter(person => person.status === 'Absent').length;
  return `<article class="metric-group overview-metric-${workforceCategoryClassV43(category)}" data-overflow-role="${esc(category.role)}" role="button" tabindex="0" aria-label="Open ${esc(category.title)} individual records">
    <div class="metric-scene" aria-hidden="true"></div>
    <div class="metric-card-content"><div class="metric-head"><span class="metric-icon">${category.icon}</span><div><b>${esc(category.title)}</b><small>Live workforce snapshot</small></div><em class="metric-growth">↗ +${category.growth}%</em></div>
    <div class="metric-body"><div class="metric"><span class="metric-state-icon">${workforceMetricIconV44('people')}</span><b>${records.length}</b><span>Total</span></div><div class="metric"><span class="metric-state-icon">${workforceMetricIconV44('person')}</span><b>${present}</b><span>Present</span></div><div class="metric"><span class="metric-state-icon">${workforceMetricIconV44('clock')}</span><b>${leave}</b><span>On leave</span></div><div class="metric"><span class="metric-state-icon">${workforceMetricIconV44('absent')}</span><b>${absent}</b><span>Absent</span></div></div>
    <button class="overview-overflow-button" type="button"><span>Open ${esc(category.singular)} records</span><i aria-hidden="true">›</i></button></div></article>`;
}

function syncWorkforceCategoryNavigationV43() {
  const enabled = enabledWorkforceCategoriesV43();
  const enabledRoles = new Set(enabled.map(category => category.role));
  const fixedViews = { temporary: 'Temporary Worker', workers: 'Worker', staff: 'Staff', entrepreneurs: 'Entrepreneur' };
  Object.entries(fixedViews).forEach(([viewName, roleName]) => {
    const button = document.querySelector(`#side-nav [data-view="${viewName}"]`);
    if (button) button.hidden = !enabledRoles.has(roleName);
  });
  document.querySelectorAll('#side-nav [data-dynamic-workforce-category]').forEach(button => button.remove());
  const anchor = document.querySelector('#side-nav [data-view="entrepreneurs"]');
  if (!anchor) return;
  let insertionPoint = anchor;
  enabled.filter(category => !category.view).forEach(category => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nav-link';
    button.dataset.dynamicWorkforceCategory = category.role;
    button.dataset.workforceOverflowRole = category.role;
    button.innerHTML = `<span>${category.icon}</span> ${esc(category.title)} <em>${workforceCategoryPeopleV43(category).length}</em>`;
    insertionPoint.insertAdjacentElement('afterend', button);
    insertionPoint = button;
  });
}

window.dashboard = function dashboardWithRoleOverflows() {
  dashboardBeforeRoleOverflows();

  const metrics = document.querySelector('#view-root .metrics');
  if (metrics) {
    metrics.innerHTML = enabledWorkforceCategoriesV43().map(workforceMetricCardV43).join('');
    metrics.classList.add('four-role-overview', 'dynamic-workforce-metrics');
  }
  syncWorkforceCategoryNavigationV43();

  if (metrics && !document.querySelector('[data-week-off-overview]')) {
    const assignments = readWeekOffAssignmentsV42();
    const month = new Date().toISOString().slice(0, 7);
    const assignedDays = Object.entries(assignments)
      .filter(([date, ids]) => date.startsWith(month) && Array.isArray(ids) && ids.length)
      .length;
    metrics.insertAdjacentHTML('afterend', `<button type="button" class="week-off-overview-card" data-week-off-overview>
      <span class="week-off-icon" aria-hidden="true">▦</span><span><small>WORKFORCE SCHEDULE</small><b>Week Off</b>
      <em>Assign weekly offs to one person, selected people, or everyone.</em></span><strong>${assignedDays} assigned day${assignedDays === 1 ? '' : 's'} →</strong>
    </button>`);
  }

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

async function hydrateMonthlyPresentV35(rolePeople) {
  const month = new Date().toISOString().slice(0, 7);
  await Promise.allSettled(rolePeople.map(async person => {
    const payload = await adminAttendanceRequestV33(`/api/admin/employee-attendance-month?employee_id=${encodeURIComponent(person.id)}&month=${encodeURIComponent(month)}`);
    const records = Array.isArray(payload.attendance) ? payload.attendance : [];
    const button = document.querySelector(`[data-person-attendance="${CSS.escape(String(person.id))}"]`);
    if (!button) return;
    const value = button.querySelector('b');
    if (value) value.textContent = String(records.length);
    else button.innerHTML = `<span>Monthly present</span><b>${records.length}</b>`;
    button.title = `${records.length} permanently stored present day${records.length === 1 ? '' : 's'} in ${month}`;
    button.dataset.databaseCount = 'true';
  }));
}

async function adminAttendanceRequestV33(path) {
  const base = String(window.MSME_EMPLOYEE_API_URL || '').replace(/\/$/, '');
  const token = sessionStorage.getItem('msme-admin-api-token') || '';
  if (!base || !token) throw Error('The employee attendance service is not connected.');
  const response = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Error(payload.error || `Attendance request failed (HTTP ${response.status}).`);
  }
  return payload;
}

function attendanceVarianceV38(shiftValue, actualValue, kind, grace = 15) {
  const parseClock = value => {
    if (!value) return null;
    const raw = String(value).trim(), asDate = new Date(raw);
    if (/\d{4}-\d{2}-\d{2}T/.test(raw) && !Number.isNaN(asDate.getTime())) return asDate.getHours() * 60 + asDate.getMinutes();
    const match = raw.match(/(\d{1,2}):(\d{2})(?:\s*([AP]M))?/i);
    if (!match) return null;
    let hour = Number(match[1]); const minute = Number(match[2]); const period = String(match[3] || '').toUpperCase();
    if (period === 'PM' && hour < 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    return hour * 60 + minute;
  };
  const parts = String(shiftValue || '09:00 AM - 06:00 PM').split(/\s+-\s+/);
  const actual = parseClock(actualValue), expected = parseClock(parts[kind === 'early' ? 1 : 0]);
  if (actual === null || expected === null) return { minutes: 0, display: '—', active: false };
  const difference = kind === 'late' ? Math.max(0, actual - expected - Number(grace || 0)) : Math.max(0, expected - actual);
  const duration = `${Math.floor(difference / 60) ? `${Math.floor(difference / 60)}h ` : ''}${difference % 60}m`;
  return { minutes: difference, display: difference ? `${duration} ${kind}` : (kind === 'late' ? 'On time' : 'Full shift'), active: difference > 0 };
}

function adminAttendancePhotoPanelV33(detail, date, person = {}) {
  const shift = detail?.attendance;
  const status = shift ? (shift.status === 'COMPLETED' ? 'Present' : 'Checked in') : 'Absent';
  const total = shift?.work_display || (shift?.status === 'COMPLETED' ? durationTextV21(shift.worked_minutes || 0) : (shift ? 'In progress' : '—'));
  const displayTime = value => {
    if (!value) return '—';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? show12(value) : parsed.toLocaleString('en-IN');
  };
  const photo = (title, source) => `<figure><figcaption>${title}</figcaption>${source
    ? `<img src="${esc(source)}" alt="${title} for ${esc(date)}">`
    : `<span>No ${title.toLowerCase()}</span>`}</figure>`;
  const grace = Number(String(person.grace_period || person.grace || '15').match(/\d+/)?.[0] || 15);
  const late = attendanceVarianceV38(person.shift, shift?.check_in_at, 'late', grace);
  const early = attendanceVarianceV38(person.shift, shift?.check_out_at, 'early', 0);
  return `<div class="admin-person-day-summary"><div><span>Date</span><b>${esc(date)}</b></div><div><span>Status</span><b>${status}</b></div><div><span>Check-in</span><b>${displayTime(shift?.check_in_at)}</b></div><div><span>Check-out</span><b>${displayTime(shift?.check_out_at)}</b></div><div><span>Working hours</span><b>${total}</b></div><div class="attendance-variance-box ${late.active?'warning':'ok'}"><span>Late join</span><b>${esc(late.display)}</b></div><div class="attendance-variance-box ${early.active?'warning':'ok'}"><span>Early left</span><b>${esc(early.display)}</b></div></div><div class="admin-attendance-photos">${photo('Check-in photo',detail?.check_in_photo)}${photo('Check-out photo',detail?.check_out_photo)}</div>`;
}

function localIndividualAttendanceV34(person, monthValue) {
  const days = new Map(attendanceLog
    .filter(day => String(day.date || '').startsWith(`${monthValue}-`))
    .map(day => [day.date, [...(day.records || [])]]));
  if (typeof automaticAttendanceDraftsV21 !== 'undefined') {
    automaticAttendanceDraftsV21.forEach((records, date) => {
      if (!String(date).startsWith(`${monthValue}-`)) return;
      const combined = days.get(date) || [];
      records.forEach(record => {
        const index = combined.findIndex(item => item.id === record.id);
        if (index < 0) combined.push(record);
        else if (combined[index].source !== 'Manual attendance') combined[index] = { ...combined[index], ...record };
      });
      days.set(date, combined);
    });
  }
  return [...days.entries()].map(([date, records]) => {
    const record = records.find(item => item.id === person.id);
    if (!record || record.status !== 'Present') return null;
    return {
      work_date: date,
      status: record.logout ? 'COMPLETED' : 'OPEN',
      check_in_at: record.login || '',
      check_out_at: record.logout || '',
      work_display: record.logout ? (record.work || record.total || '—') : 'In progress',
      local_record: true,
    };
  }).filter(Boolean);
}

function renderIndividualAttendanceCalendarV34(person, monthValue, records, warning = '') {
  const modalRoot = document.getElementById('modal-root');
  const [year, monthNumber] = monthValue.split('-').map(Number);
  const monthIndex = monthNumber - 1;
  const firstDay = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const today = new Date().toISOString().slice(0, 10);
  const byDate = new Map(records.map(item => [item.work_date, item]));
  const days = Array.from({length:lastDay},(_,index)=>{const date=`${monthValue}-${String(index+1).padStart(2,'0')}`,record=byDate.get(date),state=record?'present':date<today?'absent':'future';return `<button type="button" class="attendance-day admin-person-attendance-day ${state}" data-admin-attendance-date="${date}" ${record?'':'data-no-record="yes"'}><span class="calendar-date-number">${index+1}</span><small>${record?(record.status==='COMPLETED'?'Present':'Checked in'):(date<today?'Absent':'—')}</small>${date===today?'<span class="today-check">TODAY</span>':''}</button>`}).join('');
  const current = new Date(year, monthIndex, 1);
  const monthKey = value => `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}`;
  const previous = monthKey(new Date(year, monthIndex - 1, 1));
  const next = monthKey(new Date(year, monthIndex + 1, 1));
  const monthOptions=Array.from({length:12},(_,index)=>`<option value="${index+1}" ${index===monthIndex?'selected':''}>${new Date(2000,index,1).toLocaleString('en-IN',{month:'long'})}</option>`).join('');
  const yearOptions=Array.from({length:11},(_,index)=>year-5+index).map(value=>`<option ${value===year?'selected':''}>${value}</option>`).join('');
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal individual-attendance-modal"><div class="modal-head"><div><div class="eyebrow">INDIVIDUAL ATTENDANCE</div><h2>${esc(person.name)}</h2><p>Click a blue present date to display its check-in and check-out photos.</p></div><button class="close" type="button" data-close>×</button></div><div class="advanced-calendar-toolbar individual-month-toolbar"><button class="calendar-nav-button" type="button" data-person-month="${previous}">‹</button><div class="calendar-title-block"><small>SELECTED MONTH</small><h3>${current.toLocaleString('en-IN',{month:'long',year:'numeric'})}</h3></div><button class="calendar-nav-button" type="button" data-person-month="${next}">›</button><div class="calendar-month-year-picker"><label>Month<select id="individual-attendance-month">${monthOptions}</select></label><label>Year<select id="individual-attendance-year">${yearOptions}</select></label><button type="button" class="calendar-today-button" id="individual-attendance-today">Today</button></div></div><div class="admin-person-weekdays">${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day=>`<b>${day}</b>`).join('')}</div><div class="attendance-calendar admin-person-calendar">${'<i></i>'.repeat(firstDay)}${days}</div><div class="calendar-legend admin-person-calendar-legend"><span class="present">Blue · Present</span><span class="absent">Red · Absent</span><b>${warning?esc(warning):'Attendance database connected'}</b></div><section class="admin-person-selected-day" id="admin-person-selected-day"><p>Select a date to view attendance and photos.</p></section></section></div>`;
  const panel=modalRoot.querySelector('.individual-attendance-modal');
  panel.querySelector('[data-close]').onclick=()=>{modalRoot.innerHTML=''};
  panel.querySelectorAll('[data-person-month]').forEach(button=>button.onclick=()=>openIndividualAttendanceCalendarV33(person,button.dataset.personMonth));
  const changeMonth=()=>{const selectedYear=Number(panel.querySelector('#individual-attendance-year').value),selectedMonth=Number(panel.querySelector('#individual-attendance-month').value);openIndividualAttendanceCalendarV33(person,`${selectedYear}-${String(selectedMonth).padStart(2,'0')}`)};
  panel.querySelector('#individual-attendance-month').onchange=changeMonth;
  panel.querySelector('#individual-attendance-year').onchange=changeMonth;
  panel.querySelector('#individual-attendance-today').onclick=()=>openIndividualAttendanceCalendarV33(person,new Date().toISOString().slice(0,7));
  panel.querySelectorAll('[data-admin-attendance-date]').forEach(button=>button.onclick=async()=>{const date=button.dataset.adminAttendanceDate,selected=panel.querySelector('#admin-person-selected-day'),localRecord=byDate.get(date);if(button.dataset.noRecord==='yes'){selected.innerHTML=adminAttendancePhotoPanelV33({attendance:null},date,person);return}selected.innerHTML=adminAttendancePhotoPanelV33({attendance:localRecord},date,person)+'<p>Loading permanently saved photos…</p>';try{const detail=await adminAttendanceRequestV33(`/api/admin/employee-attendance-detail?employee_id=${encodeURIComponent(person.id)}&date=${encodeURIComponent(date)}`);selected.innerHTML=adminAttendancePhotoPanelV33(detail,date,person)}catch(error){selected.insertAdjacentHTML('beforeend',`<p class="login-error">Photos unavailable: ${esc(error.message)} Confirm that Render successfully deployed this Git commit and that DATABASE_URL is configured.</p>`)}});
  const automaticDate = monthValue === today.slice(0,7)
    ? today
    : [...byDate.keys()].sort().reverse()[0];
  const automaticButton = automaticDate
    ? panel.querySelector(`[data-admin-attendance-date="${automaticDate}"]`)
    : null;
  if (automaticButton) {
    automaticButton.classList.add('selected');
    setTimeout(() => automaticButton.click(), 0);
  }
}

async function openIndividualAttendanceCalendarV33(person, monthValue = new Date().toISOString().slice(0, 7)) {
  const localRecords=localIndividualAttendanceV34(person,monthValue);
  renderIndividualAttendanceCalendarV34(person,monthValue,localRecords,'Loading permanent database records…');
  try {
    const payload=await adminAttendanceRequestV33(`/api/admin/employee-attendance-month?employee_id=${encodeURIComponent(person.id)}&month=${encodeURIComponent(monthValue)}`);
    if(!document.querySelector('.individual-attendance-modal'))return;
    const merged=new Map(localRecords.map(item=>[item.work_date,item]));
    payload.attendance.forEach(item=>merged.set(item.work_date,item));
    renderIndividualAttendanceCalendarV34(person,monthValue,[...merged.values()]);
  } catch (error) {
    if(document.querySelector('.individual-attendance-modal'))renderIndividualAttendanceCalendarV34(person,monthValue,localRecords,`Permanent photo service unavailable: ${error.message}`);
  }
}

function openIndividualStatusDaysV39(person, status, monthValue = new Date().toISOString().slice(0, 7)) {
  const modalRoot = document.getElementById('modal-root');
  const [year, monthNumber] = monthValue.split('-').map(Number);
  const selectedMonth = new Date(year, monthNumber - 1, 1);
  const monthKey = value => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
  const previous = monthKey(new Date(year, monthNumber - 2, 1));
  const next = monthKey(new Date(year, monthNumber, 1));
  const records = (Array.isArray(attendanceLog) ? attendanceLog : [])
    .filter(day => String(day.date || '').startsWith(`${monthValue}-`))
    .map(day => ({ date: day.date, record: (day.records || []).find(item => item.id === person.id) }))
    .filter(item => item.record && item.record.status === status)
    .sort((left, right) => right.date.localeCompare(left.date));
  const label = status === 'On leave' ? 'leave' : status.toLowerCase();
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal individual-status-days-modal">
    <div class="modal-head"><div><div class="eyebrow">MONTHLY ${esc(label.toUpperCase())} DAYS</div><h2>${esc(person.name)}</h2>
      <p>Only ${esc(label)} attendance days for the selected month are shown.</p></div><button class="close" type="button" data-close>×</button></div>
    <div class="individual-status-month-nav"><button type="button" class="secondary" data-status-month="${previous}">← Previous</button>
      <b>${esc(selectedMonth.toLocaleString('en-IN', { month: 'long', year: 'numeric' }))}</b>
      <button type="button" class="secondary" data-status-month="${next}">Next →</button></div>
    <div class="table-wrap"><table><thead><tr><th>DATE</th><th>STATUS</th><th>CHECK-IN</th><th>CHECK-OUT</th><th>WORK TOTAL</th><th>SOURCE</th></tr></thead>
      <tbody>${records.map(item => `<tr><td><b>${esc(item.date)}</b></td><td><span class="tag ${cls(item.record.status)}">${esc(item.record.status)}</span></td><td>${esc(item.record.login || item.record.login_time || '—')}</td><td>${esc(item.record.logout || item.record.logout_time || '—')}</td><td>${esc(item.record.work || item.record.total || '—')}</td><td>${esc(item.record.source || 'Saved attendance')}</td></tr>`).join('') || `<tr><td colspan="6" class="empty">No ${esc(label)} days were saved for this month.</td></tr>`}</tbody></table></div>
  </section></div>`;
  modalRoot.querySelector('[data-close]').onclick = () => { modalRoot.innerHTML = ''; };
  modalRoot.querySelectorAll('[data-status-month]').forEach(button => {
    button.onclick = () => openIndividualStatusDaysV39(person, status, button.dataset.statusMonth);
  });
}

function openIndividualShiftDetailsV42(person) {
  const modalRoot = document.getElementById('modal-root');
  const companyShifts = Array.isArray(admin.shifts) ? admin.shifts : [];
  const assigned = person.shift || `${admin.shift_start || '09:00'} - ${admin.shift_end || '18:00'}`;
  const rows = companyShifts.map(shift => `<tr><td><b>${esc(shift.type || 'Company shift')}</b></td><td>${esc(shift.start || '—')}</td><td>${esc(shift.end || '—')}</td></tr>`).join('');
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal individual-shift-modal">
    <div class="modal-head"><div><div class="eyebrow">ASSIGNED SHIFT TIMINGS</div><h2>${esc(person.name)}</h2>
      <p>The assigned shift and the company's available shift timings are shown below.</p></div><button class="close" type="button" data-close>×</button></div>
    <div class="individual-shift-summary"><span>ASSIGNED SHIFT</span><b>${esc(assigned)}</b><small>Grace period: ${esc(person.grace_period || 'Not set')}</small></div>
    <div class="table-wrap"><table><thead><tr><th>COMPANY SHIFT</th><th>START</th><th>END</th></tr></thead><tbody>
      ${rows || `<tr><td colspan="3" class="empty">No additional company shift templates are configured.</td></tr>`}
    </tbody></table></div></section></div>`;
  modalRoot.querySelector('[data-close]').onclick = () => { modalRoot.innerHTML = ''; };
}

function weekOffKeyV42() {
  return typeof tenantKey === 'function' ? tenantKey('week-off-assignments') : 'msme-week-off-assignments';
}

function readWeekOffAssignmentsV42() {
  try {
    const value = JSON.parse(localStorage.getItem(weekOffKeyV42()) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch (_) {
    return {};
  }
}

function weekOffMonthKeyV42(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function openWeekOffCalendarV42(monthValue = new Date().toISOString().slice(0, 7), selectedDate = '') {
  const modalRoot = document.getElementById('modal-root');
  const assignments = readWeekOffAssignmentsV42();
  const [year, monthNumber] = monthValue.split('-').map(Number);
  const first = new Date(year, monthNumber - 1, 1);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const leading = first.getDay();
  const defaultDate = selectedDate || `${monthValue}-${String(new Date().getDate()).padStart(2, '0')}`;
  const activeDate = defaultDate.startsWith(`${monthValue}-`) ? defaultDate : `${monthValue}-01`;
  const allPeople = [...people, ...temporaryWorkers].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  const selectedIds = new Set(Array.isArray(assignments[activeDate]) ? assignments[activeDate] : []);
  const dateCells = [
    ...Array.from({ length: leading }, () => '<span class="week-off-day empty" aria-hidden="true"></span>'),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const date = `${monthValue}-${String(day).padStart(2, '0')}`;
      const total = Array.isArray(assignments[date]) ? assignments[date].length : 0;
      return `<button type="button" class="week-off-day ${date === activeDate ? 'selected' : ''} ${total ? 'assigned' : ''}" data-week-off-date="${date}"><b>${day}</b>${total ? `<small>${total} off</small>` : ''}</button>`;
    }),
  ].join('');
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal week-off-calendar-modal">
    <div class="modal-head"><div><div class="eyebrow">WEEK OFF CALENDAR</div><h2>Assign workforce week off</h2>
      <p>Choose a date, then select one person, multiple people, or everyone.</p></div><button class="close" type="button" data-close>×</button></div>
    <div class="week-off-toolbar"><button type="button" class="secondary" data-week-off-month="${weekOffMonthKeyV42(new Date(year, monthNumber - 2, 1))}">← Previous</button>
      <input type="month" id="week-off-month" value="${monthValue}" aria-label="Week off month"><button type="button" class="secondary" data-week-off-month="${weekOffMonthKeyV42(new Date(year, monthNumber, 1))}">Next →</button></div>
    <div class="week-off-layout"><div><div class="week-off-weekdays">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => `<span>${day}</span>`).join('')}</div>
      <div class="week-off-calendar-grid">${dateCells}</div></div>
      <div class="week-off-people"><div class="week-off-selected-date"><span>SELECTED DATE</span><b>${esc(activeDate)}</b></div>
        <div class="week-off-bulk-actions"><button type="button" class="secondary" data-week-off-select-all>Select everyone</button><button type="button" class="secondary" data-week-off-clear>Clear</button></div>
        <div class="week-off-person-list">${allPeople.map(person => `<label><input type="checkbox" data-week-off-person value="${esc(person.id)}" ${selectedIds.has(person.id) ? 'checked' : ''}><span><b>${esc(person.name)}</b><small>${esc(person.id)} · ${esc(person.role || 'Temporary Worker')}</small></span></label>`).join('') || '<p class="empty">No workforce profiles are available.</p>'}</div>
        <button type="button" class="primary" data-save-week-off="${activeDate}">Save week off</button><p class="week-off-save-status" aria-live="polite"></p>
      </div></div></section></div>`;
  modalRoot.querySelector('[data-close]').onclick = () => { modalRoot.innerHTML = ''; };
  modalRoot.querySelector('#week-off-month').onchange = event => openWeekOffCalendarV42(event.target.value);
  modalRoot.querySelectorAll('[data-week-off-month]').forEach(button => button.onclick = () => openWeekOffCalendarV42(button.dataset.weekOffMonth));
  modalRoot.querySelectorAll('[data-week-off-date]').forEach(button => button.onclick = () => openWeekOffCalendarV42(monthValue, button.dataset.weekOffDate));
  modalRoot.querySelector('[data-week-off-select-all]').onclick = () => modalRoot.querySelectorAll('[data-week-off-person]').forEach(input => { input.checked = true; });
  modalRoot.querySelector('[data-week-off-clear]').onclick = () => modalRoot.querySelectorAll('[data-week-off-person]').forEach(input => { input.checked = false; });
  modalRoot.querySelector('[data-save-week-off]').onclick = event => {
    const date = event.currentTarget.dataset.saveWeekOff;
    const ids = [...modalRoot.querySelectorAll('[data-week-off-person]:checked')].map(input => input.value);
    if (ids.length) assignments[date] = ids;
    else delete assignments[date];
    localStorage.setItem(weekOffKeyV42(), JSON.stringify(assignments));
    const status = modalRoot.querySelector('.week-off-save-status');
    status.textContent = ids.length ? `Week off saved for ${ids.length} profile${ids.length === 1 ? '' : 's'}.` : 'Week off assignment removed for this date.';
    window.setTimeout(() => openWeekOffCalendarV42(monthValue, date), 450);
  };
}

function roleOverflowV22(roleName) {
  const category = workforceCategoryDefinitionsV43.find(item => item.role === roleName);
  const rolePeople = category ? workforceCategoryPeopleV43(category) : group(roleName);
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
        const currentWorkTotal = person.login_time && !person.logout_time
          ? 'In progress'
          : durationTextV21(calculation.total);
        return `<article class="overflow-person-card" data-person-card-id="${esc(person.id)}">
          <div class="overflow-person-head"><span class="avatar">${ini(person.name)}</span><div>
            <h3>${esc(person.name)}</h3><small>${esc(person.id)} · ${esc(person.dept || 'Department not entered')}</small></div>
            <span class="tag ${cls(person.status || 'Absent')}">${esc(person.status || 'Absent')}</span></div>
          <div class="overflow-person-details">
            <button type="button" class="overflow-stat-box clickable" data-person-shift="${esc(person.id)}"><span>Shift</span><b>${esc(person.shift || '09:00 AM - 06:00 PM')}</b></button>
            <div class="overflow-stat-box"><span>Current work total</span><b>${currentWorkTotal}</b></div>
            <button type="button" class="overflow-stat-box clickable" data-person-attendance="${esc(person.id)}"><span>Monthly present</span><b>${stats.present}</b></button>
            <button type="button" class="overflow-stat-box clickable" data-person-status="Absent" data-person-id="${esc(person.id)}"><span>Monthly absent</span><b>${stats.absent}</b></button>
            <button type="button" class="overflow-stat-box clickable" data-person-status="On leave" data-person-id="${esc(person.id)}"><span>Monthly leave</span><b>${stats.leave}</b></button>
            <div class="overflow-stat-box"><span>Days stored</span><b>${stats.stored}</b></div>
          </div>
          <div class="overflow-skills"><span>Skills</span><div class="skills">${(person.skills || []).slice(0, 5)
            .map(skill => `<span class="skill">${esc(skill)}</span>`).join('') || '<small>No skills entered</small>'}</div></div>
          <button class="primary overflow-open-profile" type="button" data-view-complete-profile="${esc(person.id)}">View complete details →</button>
        </article>`;
      }).join('') || `<p class="empty">No ${singular} profiles are stored.</p>`}</div>
    </section>`;
  hydrateMonthlyPresentV35(rolePeople);
}

function addWorkforceCategoryPersonV43(roleName) {
  if (roleName === 'Temporary Worker') {
    tempEditor();
    return;
  }
  if (['Worker', 'Staff', 'Entrepreneur'].includes(roleName)) {
    add(roleName);
    return;
  }
  const prefixes = { Employee: 'EM', Manager: 'MG', HR: 'HR', Owner: 'OW' };
  const start = admin.shift_start || '09:00';
  const end = admin.shift_end || '18:00';
  const clock = value => new Date(`2000-01-01T${value}:00`).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const person = fix({
    id: `${prefixes[roleName] || 'PF'}-${Math.floor(1000 + Math.random() * 8999)}`,
    name: `New ${roleName.toLowerCase()}`,
    role: roleName,
    dept: 'Unassigned',
    status: 'Not checked in',
    shift: `${clock(start)} - ${clock(end)}`,
    skills: []
  });
  people.push(person);
  save();
  editor(person.id);
}

document.addEventListener('click', event => {
  const roleCard = event.target.closest('#view-root .metric-group[data-overflow-role], [data-workforce-overflow-role]');
  const weekOffButton = event.target.closest('[data-week-off-overview]');
  const attendanceButton = event.target.closest('[data-person-attendance]');
  const shiftButton = event.target.closest('[data-person-shift]');
  const statusButton = event.target.closest('[data-person-status]');
  const profileButton = event.target.closest('[data-view-complete-profile]');
  const backButton = event.target.closest('#back-to-overview');
  if (!roleCard && !weekOffButton && !attendanceButton && !shiftButton && !statusButton && !profileButton && !backButton) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  if (attendanceButton) {
    const person = [...people, ...temporaryWorkers].find(item => item.id === attendanceButton.dataset.personAttendance);
    if (person) openIndividualAttendanceCalendarV33(person);
    return;
  }
  if (weekOffButton) {
    openWeekOffCalendarV42();
    return;
  }
  if (shiftButton) {
    const person = [...people, ...temporaryWorkers].find(item => item.id === shiftButton.dataset.personShift);
    if (person) openIndividualShiftDetailsV42(person);
    return;
  }
  if (statusButton) {
    const person = [...people, ...temporaryWorkers].find(item => item.id === statusButton.dataset.personId);
    if (person) openIndividualStatusDaysV39(person, statusButton.dataset.personStatus);
    return;
  }
  if (profileButton) {
    editor(profileButton.dataset.viewCompleteProfile);
    return;
  }
  if (roleCard) roleOverflowV22(roleCard.dataset.overflowRole || roleCard.dataset.workforceOverflowRole);
  if (backButton) {
    view = 'dashboard';
    render();
  }
}, true);

document.addEventListener('keydown', event => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const target = event.target.closest('[data-overflow-role]');
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
      role: 'Worker', name: '', dept: 'Temporary workforce', status: 'Not checked in',
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
    addWorkforceCategoryPersonV43(roleName);
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

  const firstGrid = document.querySelector('#modal-root .form-grid');
  if (firstGrid && !firstGrid.querySelector('[name="id"]')) {
    firstGrid.insertAdjacentHTML('afterbegin', `<label>${esc(person.role)} ID<span class="required">*</span><input name="id" value="${esc(person.id)}" required></label>`);
  }

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
  manualAttendanceEnabledV21 = typeof manualAttendancePreferenceV41 === 'function'
    && manualAttendancePreferenceV41();
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
      <div class="manual-attendance-switch ${manualAttendanceEnabledV21 ? 'manual-mode-on' : 'manual-mode-off'}"><span><b>Manual attendance: ${manualAttendanceEnabledV21 ? 'ON' : 'OFF'}</b><small>Use manual attendance with Face, Biometric, CSV or any other attendance source. This preference is saved for your company.</small></span>
        <label class="enter-manually-button" title="Turn manual attendance on or off"><input type="checkbox" id="manual-attendance-toggle" ${manualAttendanceEnabledV21 ? 'checked' : ''}><i></i><b>Enter manually: ${manualAttendanceEnabledV21 ? 'ON' : 'OFF'}</b></label></div>
    </section>
    <div class="calendar-role-sections">
      ${enabledWorkforceCategoriesV43().map(category => category.role === 'Temporary Worker'
        ? calendarTemporarySectionV21(record)
        : calendarRoleSectionV21(category.title, category.role, record)).join('')}
    </div>`;
  if (typeof syncAutomaticAttendanceV21 === 'function') syncAutomaticAttendanceV21(calendarDay);
};

function openAttendanceDownloadRangeV25() {
  const selected = new Date(`${calendarDay}T00:00:00`);
  const start = `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}-01`;
  const end = localDateKeyV25(new Date(selected.getFullYear(), selected.getMonth() + 1, 0));
  document.getElementById('modal-root').innerHTML = `<div class="modal-backdrop"><form class="modal range-download-modal"
    id="attendance-range-form"><div class="modal-head"><div><div class="eyebrow">ATTENDANCE EXPORT</div>
    <h2>Choose the download period</h2><p>Select one date to another date. All saved Worker, Staff and Temporary Worker
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
