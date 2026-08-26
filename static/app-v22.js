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

  const roleNames = ['Worker', 'Staff', 'Entrepreneur'];
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
