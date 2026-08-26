/* Version 28 - grouped login notifications and consistent overtime range. */

function loginNoticeSectionV28(title, icon, items, emptyText) {
  return `<section class="login-notice-section">
    <div class="login-notice-section-title"><span>${icon}</span><b>${title}</b><em>${items.length}</em></div>
    <div class="login-notice-section-body">${items.length ? items.join('') : `<p class="login-notice-empty">${emptyText}</p>`}</div>
  </section>`;
}

window.loginNotifications = function groupedLoginNotificationsV28() {
  const birthdays = events()
    .filter(item => /birthday/i.test(String(item.l || '')))
    .slice(0, 8)
    .map(item => `<div class="login-notice-row"><span class="login-notice-icon">🎂</span><div>
      <strong>${esc(item.l)} · ${esc(item.p.name)}</strong><small>${esc(dl(item.d))}</small></div></div>`);

  const temporaryReminders = temporaryWorkers
    .filter(person => elapsed(person) >= 170)
    .map(person => `<div class="login-notice-row"><span class="login-notice-icon">◷</span><div>
      <strong>${esc(person.name)}</strong><small>Day ${elapsed(person)} of 180 · ${esc(tempNote(person))}</small></div></div>`);

  const incompleteProfiles = incomplete().map(person => `<div class="login-notice-row">
    <span class="login-notice-icon">!</span><div><strong>${esc(person.name || person.id)}</strong>
    <small>Important profile information is incomplete.</small></div></div>`);

  document.getElementById('modal-root').innerHTML = `<div class="modal-backdrop login-notice-backdrop">
    <div class="modal login-notice-modal"><div class="login-notice-head"><div>
      <div class="eyebrow">LOGIN NOTIFICATIONS</div><h2>Important updates</h2>
      <p>Review today’s workforce reminders.</p></div>
      <button class="close login-notice-close" id="close-login-notice" aria-label="Close notifications">×</button></div>
      <div class="login-notice-grid">
        ${loginNoticeSectionV28('Birthdays', '🎂', birthdays, 'No upcoming birthday reminders.')}
        ${loginNoticeSectionV28('Temporary worker day reminders', '◷', temporaryReminders, 'No temporary worker deadline reminders.')}
        ${loginNoticeSectionV28('Incomplete information', '!', incompleteProfiles, 'All important profile information is complete.')}
      </div>
    </div></div>`;
  document.getElementById('close-login-notice').onclick = () => {
    document.getElementById('modal-root').innerHTML = '';
  };
};

if (document.getElementById('app-shell').classList.contains('visible')) render();
