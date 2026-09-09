
/* ===== Source component: 11-overview-attendance-health.js ===== */
function dashboard(){const present=people.filter(p=>p.status==='Present').length,total=people.length,pct=total?Math.round(present/total*100):0,temp=temporaryWorkers.filter(p=>elapsed(p)>=170),dates=events().slice(0,4),leave=people.filter(p=>p.status==='On leave').length,abs=people.filter(p=>p.status==='Absent').length;root.innerHTML=`<div class="page-heading"><div><div class="eyebrow">ADMIN CONTROL CENTRE</div><h1>Good morning, ${esc(admin.name)}.</h1><p>Workforce status, important dates and forward planning.</p></div></div><div class="metrics">${card('Worker','◉','workers')}${card('Staff','◇','staff')}${card('Entrepreneur','♔','entrepreneurs')}</div><div class="notification-bar"><b>Notification bar</b><span>Temporary workers: ${temp.length?temp.map(p=>`${esc(p.name)} · ${esc(tempNote(p))}`).join(' | '):'No temporary-worker deadline requires action today.'}</span><button data-view="reminders">View all notifications →</button></div><section class="panel health"><div class="panel-header"><h2>Attendance health</h2><button class="text-button" data-view="attendance">Attendance calendar →</button></div><div class="health-line"><b>${present} / ${total} on duty</b><span>${pct}%</span></div><div class="progress"><i style="width:${pct}%"></i></div><div class="health-line"><span>On leave</span><b>${leave}</b></div><div class="health-line"><span>Absent</span><b>${abs}</b></div><div class="important-block"><b>Important dates</b>${dates.map(e=>`<div class="health-line"><span>${esc(e.l)} · ${esc(e.p.name)}</span><b>${dl(e.d)}</b></div>`).join('')||'<div class="health-line"><span>No upcoming dates</span></div>'}</div></section><h2 class="section-title">Festival calendar - ${festivalYear}</h2><section class="panel"><div class="calendar-grid">${Array.from({length:12},(_,i)=>new Date(festivalYear,i,1).toLocaleString('en',{month:'long'})).map((m,i)=>`<div class="calendar-month"><b>${m} ${festivalYear}</b>${festivalCalendar.filter(f=>+f[0].slice(5,7)===i+1).map(f=>`<span>${esc(f[0].split('-').reverse().join('-'))} · ${esc(f[1])}</span>`).join('')||'<small>No festival</small>'}</div>`).join('')}</div></section>`}


/* ===== Source component: 12-overview-labels.js ===== */
/* Final overview label adjustment for the Python edition. */
const updateImportantLabel = () => {
  document.querySelectorAll('.important-block b').forEach((item) => {
    if (item.textContent.trim() === 'Important dates') item.textContent = 'Important updates';
  });
};
new MutationObserver(updateImportantLabel).observe(document.getElementById('view-root'), { childList: true, subtree: true });
updateImportantLabel();


/* ===== Source component: 13-work-hours-calculation.js ===== */
function minsValue(v){let n=minutes(v);return n===null?0:n}function totalTime(p){let work=minsValue(p.logout_time)-minsValue(p.login_time);if(work<0)work+=1440;let half=minsValue(p.halftime_end)-minsValue(p.halftime_start);if(half<0)half+=1440;let ot=minsValue(p.overtime_end)-minsValue(p.overtime_start);if(ot<0)ot+=1440;let total=Math.max(0,work-half+ot);return `${Math.floor(total/60)}h ${total%60}m`}
function roleDashboard(r){const a=group(r);root.innerHTML=`<div class="page-heading"><div><div class="eyebrow">${r.toUpperCase()} OPERATIONS</div><h1>${r} dashboard.</h1><p>Enter 12-hour timings manually; the final total is calculated automatically.</p></div><button class="primary" id="add-person">+ Add ${r}</button></div><div class="table-wrap"><table><thead><tr><th>NAME</th><th>PRESENT / ABSENT</th><th>SHIFT</th><th>LOGIN / LOGOUT</th><th>HALF TIME</th><th>OVERTIME</th><th>WORK TIME</th><th>FINAL TOTAL</th><th></th></tr></thead><tbody>${a.map(p=>`<tr><td><b>${esc(p.name)}</b><small style="display:block">${esc(p.id)}</small></td><td><select class="attendance-select" data-attendance="${esc(p.id)}"><option ${p.status==='Present'?'selected':''}>Present</option><option ${p.status==='Absent'?'selected':''}>Absent</option><option ${p.status==='On leave'?'selected':''}>On leave</option></select></td><td>${esc(p.shift||'09:00 AM - 06:00 PM')}</td><td>${timeBox(p,'login_time')}${timeBox(p,'logout_time')}</td><td>${timeBox(p,'halftime_start')}${timeBox(p,'halftime_end')}</td><td>${timeBox(p,'overtime_start')}${timeBox(p,'overtime_end')}</td><td>${hours(p.login_time,p.logout_time)}</td><td><b>${totalTime(p)}</b><small style="display:block">Work - half + OT</small></td><td><button class="action" data-id="${esc(p.id)}">Edit</button></td></tr>`).join('')}</tbody></table></div>`}
const refreshUpdateLabel=()=>document.querySelectorAll('.important-block b').forEach(x=>{if(x.textContent.trim()==='Important dates')x.textContent='Important updates'});new MutationObserver(refreshUpdateLabel).observe(document.getElementById('view-root'),{childList:true,subtree:true});refreshUpdateLabel();


/* ===== Source component: 14-attendance-save-and-month-updates.js ===== */
function saveSelectedDay(){const records=people.map(p=>({id:p.id,name:p.name,role:p.role,status:p.status||'Present',login:p.login_time||'',logout:p.logout_time||'',work:hours(p.login_time,p.logout_time),half:hours(p.halftime_start,p.halftime_end),overtime:hours(p.overtime_start,p.overtime_end)}));const i=attendanceLog.findIndex(x=>x.date===calendarDay);if(i<0)attendanceLog.push({date:calendarDay,records});else attendanceLog[i]={date:calendarDay,records};save();render()}
function attendanceCalendar(){let d=new Date(calendarDay+'T00:00:00'),y=d.getFullYear(),m=d.getMonth(),last=new Date(y,m+1,0).getDate(),first=new Date(y,m,1).getDay(),record=attendanceLog.find(x=>x.date===calendarDay);root.innerHTML=`<div class="page-heading"><div><div class="eyebrow">DAILY ATTENDANCE REGISTER</div><h1>Attendance calendar.</h1><p>Select a date, set attendance in role dashboards, then save that day's record.</p></div><div><button class="secondary" id="save-day-attendance">Save day attendance</button> <button class="primary" id="download-attendance">⇩ Download sheet</button></div></div><section class="panel"><div class="panel-header"><h2>${d.toLocaleString('en',{month:'long',year:'numeric'})}</h2><input type="month" id="attendance-month" value="${calendarDay.slice(0,7)}"></div><div class="attendance-calendar">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x=>`<b>${x}</b>`).join('')}${'<i></i>'.repeat(first)}${Array.from({length:last},(_,i)=>{let day=String(i+1).padStart(2,'0'),key=calendarDay.slice(0,8)+day,entry=attendanceLog.find(x=>x.date===key);return `<button class="attendance-day ${key===calendarDay?'selected':''}" data-attendance-date="${key}"><b>${i+1}</b><small>${entry?entry.records.filter(x=>x.status==='Present').length+' present':'Not saved'}</small></button>`}).join('')}</div></section><section class="panel" style="margin-top:16px"><div class="panel-header"><h2>Attendance roster - ${d.toLocaleDateString('en-IN')}</h2><span class="tag neutral">${record?'Saved':'Not saved'}</span></div><div class="table-wrap"><table><thead><tr><th>NAME</th><th>ROLE</th><th>STATUS</th><th>LOGIN / LOGOUT</th><th>TODAY WORK HOURS</th><th>HALF DAY</th><th>OVERTIME</th></tr></thead><tbody>${people.map(p=>{let x=record?.records.find(q=>q.id===p.id)||{};return `<tr><td>${esc(p.name)}</td><td>${esc(p.role)}</td><td>${esc(x.status||'Not saved')}</td><td>${show12(x.login)} - ${show12(x.logout)}</td><td>${esc(x.work||'-')}</td><td>${esc(x.half||'-')}</td><td>${esc(x.overtime||'-')}</td></tr>`}).join('')}</tbody></table></div></section>`}
function monthUpdates(){const now=new Date(),month=now.getMonth()+1;const family=[];people.forEach(p=>[['dob','Birthday'],['spouse_birthday','Anniversary / birthday'],['wedding_anniversary','Wedding anniversary']].forEach(([k,label])=>{if(p[k]&&+p[k].slice(5,7)===month)family.push(`${label}: ${p.name} (${p[k].split('-').reverse().join('-')})`)}));const fest=festivalCalendar.filter(f=>+f[0].slice(5,7)===month).map(f=>`${new Date(f[0]+'T00:00:00').toLocaleDateString('en',{weekday:'long'})}, ${f[0].split('-').reverse().join('-')} - ${f[1]}`);return [...family,...fest]}
function dashboard(){const present=people.filter(p=>p.status==='Present').length,total=people.length,pct=total?Math.round(present/total*100):0,leave=people.filter(p=>p.status==='On leave').length,abs=people.filter(p=>p.status==='Absent').length,updates=monthUpdates();root.innerHTML=`<div class="page-heading"><div><div class="eyebrow">ADMIN CONTROL CENTRE</div><h1>Good morning, ${esc(admin.name)}.</h1></div></div><div class="metrics">${card('Worker','◉','workers')}${card('Staff','◇','staff')}${card('Entrepreneur','♔','entrepreneurs')}</div><section class="panel health health-blue"><div class="panel-header"><h2>Attendance health</h2><button class="text-button" data-view="attendance">Attendance calendar →</button></div><div class="health-line"><b>Total present: ${present} people</b><span>${present} / ${total}</span></div><div class="progress"><i style="width:${pct}%"></i></div><div class="health-line"><span>On leave</span><b>${leave} people</b></div><div class="health-line"><span>Absent</span><b>${abs} people</b></div><div class="important-block"><b>Important updates - current month</b>${updates.map(x=>`<div class="health-line"><span>${esc(x)}</span></div>`).join('')||'<div class="health-line"><span>No birthday, anniversary or festival update this month.</span></div>'}</div></section><h2 class="section-title">Festival calendar - ${festivalYear}</h2><section class="panel"><div class="calendar-grid">${Array.from({length:12},(_,i)=>new Date(festivalYear,i,1).toLocaleString('en',{month:'long'})).map((m,i)=>`<div class="calendar-month"><b>${m} ${festivalYear}</b>${festivalCalendar.filter(f=>+f[0].slice(5,7)===i+1).map(f=>`<span>${esc(f[0].split('-').reverse().join('-'))} · ${esc(new Date(f[0]+'T00:00:00').toLocaleDateString('en',{weekday:'short'}))} · ${esc(f[1])}</span>`).join('')||'<small>No festival</small>'}</div>`).join('')}</div></section>`}
function roleDashboard(r){const a=group(r);root.innerHTML=`<div class="page-heading"><div><div class="eyebrow">${r.toUpperCase()} OPERATIONS</div><h1>${r} dashboard.</h1><p>12-hour time entry and individual daily total calculation.</p></div><button class="primary" id="add-person">+ Add ${r}</button></div><div class="table-wrap"><table><thead><tr><th>NAME</th><th>ATTENDANCE</th><th>SHIFT</th><th>LOGIN / LOGOUT</th><th>HALF TIME</th><th>OVERTIME</th><th>TODAY WORK HOURS</th><th>HALF DAY</th><th>OVERTIME TOTAL</th><th>FINAL TOTAL</th></tr></thead><tbody>${a.map(p=>`<tr><td>${esc(p.name)}</td><td><select class="attendance-select" data-attendance="${esc(p.id)}"><option ${p.status==='Present'?'selected':''}>Present</option><option ${p.status==='Absent'?'selected':''}>Absent</option><option ${p.status==='On leave'?'selected':''}>On leave</option></select></td><td>${esc(p.shift||'09:00 AM - 06:00 PM')}</td><td>${timeBox(p,'login_time')}${timeBox(p,'logout_time')}</td><td>${timeBox(p,'halftime_start')}${timeBox(p,'halftime_end')}</td><td>${timeBox(p,'overtime_start')}${timeBox(p,'overtime_end')}</td><td>${hours(p.login_time,p.logout_time)}</td><td>${hours(p.halftime_start,p.halftime_end)}</td><td>${hours(p.overtime_start,p.overtime_end)}</td><td><b>${totalTime(p)}</b></td></tr>`).join('')}</tbody></table></div>`}
document.addEventListener('click',e=>{if(e.target.closest('#save-day-attendance'))saveSelectedDay()});


/* ===== Source component: 15-role-dashboard-time-entry.js ===== */
function roleDashboard(r){const a=group(r);root.innerHTML=`<div class="page-heading"><div><div class="eyebrow">${r.toUpperCase()} OPERATIONS</div><h1>${r} dashboard.</h1><p>12-hour time entry and individual daily total calculation.</p></div><button class="primary" id="add-person">+ Add ${r}</button></div><div class="table-wrap"><table><thead><tr><th>NAME</th><th>ATTENDANCE</th><th>SHIFT</th><th>LOGIN / LOGOUT</th><th>HALF TIME</th><th>OVERTIME</th><th>TODAY WORK HOURS</th><th>HALF DAY</th><th>OVERTIME TOTAL</th><th>FINAL TOTAL</th><th>EDIT</th></tr></thead><tbody>${a.map(p=>`<tr><td>${esc(p.name)}</td><td><select class="attendance-select" data-attendance="${esc(p.id)}"><option ${p.status==='Present'?'selected':''}>Present</option><option ${p.status==='Absent'?'selected':''}>Absent</option><option ${p.status==='On leave'?'selected':''}>On leave</option></select></td><td>${esc(p.shift||'09:00 AM - 06:00 PM')}</td><td>${timeBox(p,'login_time')}${timeBox(p,'logout_time')}</td><td>${timeBox(p,'halftime_start')}${timeBox(p,'halftime_end')}</td><td>${timeBox(p,'overtime_start')}${timeBox(p,'overtime_end')}</td><td>${hours(p.login_time,p.logout_time)}</td><td>${hours(p.halftime_start,p.halftime_end)}</td><td>${hours(p.overtime_start,p.overtime_end)}</td><td><b>${totalTime(p)}</b></td><td><button class="action" data-id="${esc(p.id)}">Edit</button></td></tr>`).join('')}</tbody></table></div>`}


/* ===== Source component: 16-attendance-edit-delete-and-restore.js ===== */
var deletedAttendance=[];
function loadTenant(a){admin={...a};const legacy=a.email==='manager@msme.com';people=read(tenantKey('people'),legacy?read('msme-people',people):[]).map(fix);exPeople=read(tenantKey('ex'),legacy?read('msme-ex-people',exPeople):[]).map(fix);temporaryWorkers=read(tenantKey('temporary'),[]).map(fix);festivalCalendar=read(tenantKey('festivals'),defaultFestivals);attendanceLog=read(tenantKey('attendance'),[]);deletedAttendance=read(tenantKey('deleted-attendance'),[]);contractors=read(tenantKey('contractors'),[])}
function save(){localStorage.setItem(tenantKey('people'),JSON.stringify(people));localStorage.setItem(tenantKey('ex'),JSON.stringify(exPeople));localStorage.setItem(tenantKey('temporary'),JSON.stringify(temporaryWorkers));localStorage.setItem(tenantKey('festivals'),JSON.stringify(festivalCalendar));localStorage.setItem(tenantKey('attendance'),JSON.stringify(attendanceLog));localStorage.setItem(tenantKey('deleted-attendance'),JSON.stringify(deletedAttendance));localStorage.setItem(tenantKey('contractors'),JSON.stringify(contractors));localStorage.setItem('msme-accounts',JSON.stringify(tenantAccounts))}
function editRoster(){const day=attendanceLog.find(x=>x.date===calendarDay);if(!day){alert('Save this day first, then you can edit it.');return}$('#modal-root').innerHTML=`<div class="modal-backdrop"><form class="modal" id="roster-edit"><div class="modal-head"><div><div class="eyebrow">EDIT ATTENDANCE ROSTER</div><h2>${calendarDay}</h2><p style="margin:0;color:var(--muted);font-size:12px">Edit status and timings, then save the changes permanently.</p></div><button class="close" type="button" data-close>×</button></div><div class="table-wrap"><table><thead><tr><th>NAME</th><th>STATUS</th><th>LOGIN</th><th>LOGOUT</th><th>HALF TIME</th><th>OVERTIME</th></tr></thead><tbody>${day.records.map(r=>`<tr><td>${esc(r.name)}</td><td><select name="status-${esc(r.id)}"><option ${r.status==='Present'?'selected':''}>Present</option><option ${r.status==='Absent'?'selected':''}>Absent</option><option ${r.status==='On leave'?'selected':''}>On leave</option></select></td><td><input name="login-${esc(r.id)}" value="${esc(r.login||'')}"></td><td><input name="logout-${esc(r.id)}" value="${esc(r.logout||'')}"></td><td><input name="half-${esc(r.id)}" value="${esc(r.half||'')}"></td><td><input name="overtime-${esc(r.id)}" value="${esc(r.overtime||'')}"></td></tr>`).join('')}</tbody></table></div><div class="modal-actions"><button class="secondary" type="button" data-close>Cancel</button><button class="primary">Save attendance changes</button></div></form></div>`;document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$('#modal-root').innerHTML='');$('#roster-edit').onsubmit=e=>{e.preventDefault();const d=new FormData(e.target);day.records.forEach(r=>{r.status=d.get(`status-${r.id}`);r.login=d.get(`login-${r.id}`);r.logout=d.get(`logout-${r.id}`);r.half=d.get(`half-${r.id}`);r.overtime=d.get(`overtime-${r.id}`);r.work=hours(r.login,r.logout)});save();$('#modal-root').innerHTML='';render()}}
function deleteSelectedDay(){const i=attendanceLog.findIndex(x=>x.date===calendarDay);if(i<0){alert('This date has no saved attendance record.');return}if(!confirm(`Delete saved attendance for ${calendarDay}? You can restore it later.`))return;deletedAttendance.push(attendanceLog[i]);attendanceLog.splice(i,1);save();render()}
function restoreDay(){if(!deletedAttendance.length){alert('There are no deleted attendance days to restore.');return}$('#modal-root').innerHTML=`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><div><div class="eyebrow">RESTORE ATTENDANCE</div><h2>Deleted attendance dates</h2></div><button class="close" id="close-restore">×</button></div>${deletedAttendance.map(d=>`<div class="notice"><span class="notice-icon">↺</span><div><strong>${esc(d.date)}</strong><span>${d.records.length} employee records</span></div><button class="text-button" data-restore-day="${esc(d.date)}">Restore →</button></div>`).join('')}</div></div>`;$('#close-restore').onclick=()=>$('#modal-root').innerHTML=''}
function attendanceCalendar(){let d=new Date(calendarDay+'T00:00:00'),y=d.getFullYear(),m=d.getMonth(),last=new Date(y,m+1,0).getDate(),first=new Date(y,m,1).getDay(),record=attendanceLog.find(x=>x.date===calendarDay);root.innerHTML=`<div class="page-heading"><div><div class="eyebrow">DAILY ATTENDANCE REGISTER</div><h1>Attendance calendar.</h1><p>Saved day-by-day records remain after refresh and can be edited, deleted, or restored.</p></div><div><button class="secondary" id="edit-roster">Edit roster</button> <button class="secondary" id="delete-day">Delete day</button> <button class="secondary" id="restore-day">Restore day</button> <button class="primary" id="save-day-attendance">Save day attendance</button></div></div><section class="panel"><div class="panel-header"><h2>${d.toLocaleString('en',{month:'long',year:'numeric'})}</h2><input type="month" id="attendance-month" value="${calendarDay.slice(0,7)}"></div><div class="attendance-calendar">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x=>`<b>${x}</b>`).join('')}${'<i></i>'.repeat(first)}${Array.from({length:last},(_,i)=>{let day=String(i+1).padStart(2,'0'),key=calendarDay.slice(0,8)+day,entry=attendanceLog.find(x=>x.date===key);return `<button class="attendance-day ${key===calendarDay?'selected':''}" data-attendance-date="${key}"><b>${i+1}</b><small>${entry?'Saved · '+entry.records.filter(x=>x.status==='Present').length+' present':'Not saved'}</small></button>`}).join('')}</div></section><section class="panel" style="margin-top:16px"><div class="panel-header"><h2>Attendance roster - ${d.toLocaleDateString('en-IN')}</h2><span class="tag ${record?'complete':'warning'}">${record?'Saved permanently':'Not saved'}</span></div><div class="table-wrap"><table><thead><tr><th>NAME</th><th>ROLE</th><th>STATUS</th><th>LOGIN / LOGOUT</th><th>WORK</th><th>HALF</th><th>OVERTIME</th></tr></thead><tbody>${people.map(p=>{let x=record?.records.find(q=>q.id===p.id)||{};return `<tr><td>${esc(p.name)}</td><td>${esc(p.role)}</td><td>${esc(x.status||'Not saved')}</td><td>${show12(x.login)} - ${show12(x.logout)}</td><td>${esc(x.work||'-')}</td><td>${esc(x.half||'-')}</td><td>${esc(x.overtime||'-')}</td></tr>`}).join('')}</tbody></table></div></section>`}
document.addEventListener('click',e=>{if(e.target.closest('#edit-roster'))editRoster();if(e.target.closest('#delete-day'))deleteSelectedDay();if(e.target.closest('#restore-day'))restoreDay();const r=e.target.closest('[data-restore-day]');if(r){const i=deletedAttendance.findIndex(x=>x.date===r.dataset.restoreDay);attendanceLog.push(deletedAttendance[i]);deletedAttendance.splice(i,1);save();$('#modal-root').innerHTML='';calendarDay=r.dataset.restoreDay;render()}});


/* ===== Source component: 17-attendance-save-confirmation.js ===== */
function saveSelectedDay(){const records=people.map(p=>({id:p.id,name:p.name,role:p.role,status:p.status||'Present',login:p.login_time||'',logout:p.logout_time||'',work:hours(p.login_time,p.logout_time),half:hours(p.halftime_start,p.halftime_end),overtime:hours(p.overtime_start,p.overtime_end)}));const i=attendanceLog.findIndex(x=>x.date===calendarDay);if(i<0)attendanceLog.push({date:calendarDay,records});else attendanceLog[i]={date:calendarDay,records};save();render();setTimeout(()=>alert(`Attendance for ${calendarDay} has been saved permanently. Select this date again anytime to view or edit its record.`),50)}


/* ===== Source component: 18-festival-calendar-controls.js ===== */
/* Version 19 - Festival and attendance calendar controls. */

const loadTenantBeforeCalendarFix = window.loadTenant;
const dashboardBeforeCalendarControls = window.dashboard;
const attendanceCalendarBeforeDownload = window.attendanceCalendar;

function ensureFestivalData() {
  if (!Array.isArray(festivalCalendar) || festivalCalendar.length === 0) {
    const selectedYear = Number(festivalYear) || new Date().getFullYear();
    festivalCalendar = defaultFestivals.map(([date, name]) => [
      `${selectedYear}${date.slice(4)}`,
      name
    ]);
  }

  if (!Number.isFinite(Number(festivalYear))) {
    festivalYear = new Date().getFullYear();
  }

  const storedYear = Number(String(festivalCalendar[0]?.[0] || '').slice(0, 4));
  if (Number.isFinite(storedYear)) festivalYear = storedYear;
}

window.loadTenant = function loadTenantWithFestivalDefaults(account) {
  loadTenantBeforeCalendarFix(account);
  ensureFestivalData();
};

window.dashboard = function dashboardWithCalendarControls() {
  ensureFestivalData();
  dashboardBeforeCalendarControls();

  const festivalHeading = [...document.querySelectorAll('#view-root .section-title')]
    .find(heading => heading.textContent.includes('Festival calendar'));

  if (festivalHeading) {
    festivalHeading.innerHTML = `Yearly holidays and festival calendar - ${festivalYear}
      <button class="text-button" id="previous-festival-year">← Previous year</button>
      <button class="text-button" id="next-festival-year">Next year →</button>
      <button class="text-button" id="edit-calendar">Edit calendar</button>`;
  }
};

window.attendanceCalendar = function attendanceCalendarWithDownload() {
  attendanceCalendarBeforeDownload();

  const actionArea = document.querySelector('#view-root .page-heading > div:last-child');
  if (actionArea && !document.getElementById('download-attendance')) {
    const downloadButton = document.createElement('button');
    downloadButton.id = 'download-attendance';
    downloadButton.className = 'primary';
    downloadButton.textContent = '⇩ Download everyone’s attendance';
    actionArea.append(' ', downloadButton);
  }
};

window.downloadSheet = function downloadEveryoneAttendance() {
  const csvRows = [
    ['Date', 'Name', 'Role', 'Status', 'Login', 'Logout', 'Work', 'Half Time', 'Overtime']
  ];

  attendanceLog.forEach(day => day.records.forEach(record => {
    csvRows.push([
      day.date,
      record.name,
      record.role,
      record.status,
      show12(record.login),
      show12(record.logout),
      record.work,
      record.half,
      record.overtime
    ]);
  }));

  const csv = csvRows.map(row => row.map(value =>
    `"${String(value ?? '').replaceAll('"', '""')}"`
  ).join(',')).join('\n');

  const file = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const fileUrl = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = fileUrl;
  link.download = `msme-everyone-attendance-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
};

/* Earlier feature steps both listened for the year buttons. Capture the click
   here so one click always changes the calendar by exactly one year. */
document.addEventListener('click', event => {
  const nextButton = event.target.closest('#next-festival-year');
  const previousButton = event.target.closest('#previous-festival-year');
  if (!nextButton && !previousButton) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  switchYear(nextButton ? 1 : -1);
}, true);

/* A remembered login can open the app while earlier scripts are still loading.
   Refresh once here, after every feature file is ready. */
if (document.getElementById('app-shell').classList.contains('visible')) {
  window.loadTenant(admin);
  render();
}


/* ===== Source component: 19-simplified-attendance-time-controls.js ===== */
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
  const person = [...people, ...temporaryWorkers].find(item => item.id === personId);
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

/* Refresh live face-attendance data while an attendance dashboard is open. */
setInterval(() => {
  if (!document.getElementById('app-shell')?.classList.contains('visible')) return;
  if (!['attendance', 'workers', 'staff', 'temporary'].includes(view)) return;
  if (view === 'attendance' && manualAttendanceEnabledV21) return;
  const date = view === 'attendance' ? calendarDay : new Date().toISOString().slice(0, 10);
  syncAutomaticAttendanceV21(date, true);
}, 15000);


/* ===== Source component: 20-unified-workforce-attendance.js ===== */
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
    <td>${esc(typeof view !== 'undefined' && view === 'attendance' ? calendarDay : new Date().toISOString().slice(0, 10))}</td>
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
    <th>S.NO</th><th>DATE</th><th>NAME</th><th>ATTENDANCE</th><th>SHIFT</th><th>GRACE PERIOD</th>
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

let manualAttendanceEnabledV21 = false;
const automaticAttendanceDraftsV21 = new Map();
const automaticAttendanceLoadedV21 = new Set();

function automaticRoleV21(role) {
  return role === 'TEMPORARY' ? 'Temporary Worker' : role.charAt(0) + role.slice(1).toLowerCase();
}

function automaticTimeV21(value) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function combinedAttendanceRecordV21(date, savedRecord) {
  const automatic = automaticAttendanceDraftsV21.get(date) || [];
  if (!automatic.length) return savedRecord;
  const records = [...automatic];
  (savedRecord?.records || []).forEach(record => {
    const index = records.findIndex(item => item.id === record.id);
    if (index < 0) records.push(record);
    else if (record.source === 'Manual attendance') records[index] = { ...records[index], ...record };
  });
  return { date, records, automaticDraft: true };
}

async function syncAutomaticAttendanceV21(date, force = false) {
  if (!force && automaticAttendanceLoadedV21.has(date)) return;
  const base = String(window.MSME_EMPLOYEE_API_URL || '').replace(/\/$/, '');
  const token = sessionStorage.getItem('msme-admin-api-token') || '';
  if (!base || !token) return;
  automaticAttendanceLoadedV21.add(date);
  try {
    const response = await fetch(`${base}/api/admin/employee-attendance?date=${encodeURIComponent(date)}`, { headers: { Authorization: `Bearer ${token}` } });
    const payload = await response.json();
    if (!response.ok) throw Error(payload.error || 'Automatic attendance could not be loaded.');
    automaticAttendanceDraftsV21.set(date, payload.attendance.map(item => {
      const person = [...people, ...temporaryWorkers].find(record => record.id === item.employee_id);
      return ({
      id: item.employee_id, name: item.name, role: automaticRoleV21(item.workforce_role),
      status: item.status === 'COMPLETED' || item.status === 'OPEN' ? 'Present' : 'Absent',
      login: automaticTimeV21(item.check_in_at), logout: automaticTimeV21(item.check_out_at),
      work: durationTextV21(item.worked_minutes || 0), half: '-', overtime: '-', total: durationTextV21(item.worked_minutes || 0),
      shift: person?.shift || '09:00 AM - 06:00 PM', face_captured: true, source: 'Face check-in / check-out'
    });}));
    if (typeof view !== 'undefined' && view === 'attendance' && calendarDay === date) attendanceCalendar();
    else if (typeof view !== 'undefined' && view === 'workers') roleDashboard('Worker');
    else if (typeof view !== 'undefined' && view === 'staff') roleDashboard('Staff');
    else if (typeof view !== 'undefined' && view === 'temporary') temporaryDashboard();
  } catch (error) {
    automaticAttendanceLoadedV21.delete(date);
    console.error(error);
  }
}

function calendarRoleSectionV21(title, roleName, record) {
  const rolePeople = group(roleName);
  return `<section class="panel attendance-role-section">
    <div class="panel-header"><div><div class="eyebrow">${roleName.toUpperCase()} ATTENDANCE</div>
      <h2>${title}</h2></div><span class="tag neutral">${record ? 'Saved record' : 'Not saved'}</span></div>
    ${attendanceTableV21(rolePeople, record, manualAttendanceEnabledV21)}
  </section>`;
}

function calendarTemporarySectionV21(record) {
  return `<section class="panel attendance-role-section">
    <div class="panel-header"><div><div class="eyebrow">TEMPORARY WORKER ATTENDANCE</div>
      <h2>Temporary Workers</h2></div><span class="tag neutral">${record ? 'Saved record' : 'Not saved'}</span></div>
    ${attendanceTableV21(temporaryWorkers, record, manualAttendanceEnabledV21)}
  </section>`;
}

window.attendanceCalendar = function attendanceCalendarWithRoleSections() {
  const date = new Date(`${calendarDay}T00:00:00`);
  const year = date.getFullYear();
  const month = date.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const savedRecord = attendanceLog.find(item => item.date === calendarDay);
  const record = combinedAttendanceRecordV21(calendarDay, savedRecord);
  const monthPrefix = calendarDay.slice(0, 8);

  root.innerHTML = `<div class="page-heading"><div><div class="eyebrow">DAILY ATTENDANCE REGISTER</div>
    <h1>Attendance calendar.</h1><p>Select a date and manually enter each person's status, login, logout, half time and overtime, then save the day.</p>
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
      }).join('')}</div>
      <div class="manual-attendance-switch"><span><b>Enter manually</b><small>Turn on only when you need to override or enter attendance yourself.</small></span><button type="button" id="refresh-automatic-attendance" class="secondary">Refresh automatic attendance</button><label><input type="checkbox" id="manual-attendance-toggle" ${manualAttendanceEnabledV21 ? 'checked' : ''}><i></i><b>${manualAttendanceEnabledV21 ? 'ON' : 'OFF'}</b></label></div></section>
    <div class="calendar-role-sections">
      ${calendarTemporarySectionV21(record)}
      ${calendarRoleSectionV21('Workers', 'Worker', record)}
      ${calendarRoleSectionV21('Staff', 'Staff', record)}
      ${calendarRoleSectionV21('Entrepreneurs', 'Entrepreneur', record)}
    </div>`;
  syncAutomaticAttendanceV21(calendarDay);
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
  const person = [...people, ...temporaryWorkers].find(item => item.id === personId);
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
  const manualToggle = event.target.closest('#manual-attendance-toggle');
  const refreshAutomatic = event.target.closest('#refresh-automatic-attendance');
  if (manualToggle) {
    manualAttendanceEnabledV21 = manualToggle.checked;
    attendanceCalendar();
    return;
  }
  if (refreshAutomatic) {
    automaticAttendanceLoadedV21.delete(calendarDay);
    syncAutomaticAttendanceV21(calendarDay, true);
    return;
  }
  const saveButton = event.target.closest('[data-save-person]');
  if (!saveButton) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  const person = [...people, ...temporaryWorkers].find(item => item.id === saveButton.dataset.savePerson);
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
