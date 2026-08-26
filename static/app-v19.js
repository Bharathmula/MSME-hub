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
    festivalHeading.innerHTML = `Festival calendar - ${festivalYear}
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
