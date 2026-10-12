/* Accessible mobile navigation drawer for the MG BOOK admin dashboard. */
(function () {
  const sidebar = document.querySelector('.sidebar');
  const toggle = document.querySelector('#mobile-menu-toggle');
  const close = document.querySelector('#mobile-sidebar-close');
  const backdrop = document.querySelector('#mobile-sidebar-backdrop');
  if (!sidebar || !toggle || !close || !backdrop) return;

  function setMobileSidebar(open) {
    const expanded = Boolean(open);
    sidebar.classList.toggle('mobile-open', expanded);
    backdrop.classList.toggle('visible', expanded);
    document.body.classList.toggle('mobile-sidebar-open', expanded);
    toggle.setAttribute('aria-expanded', String(expanded));
    sidebar.setAttribute('aria-hidden', String(!expanded && window.matchMedia('(max-width: 900px)').matches));
    if (expanded) close.focus();
    else if (document.activeElement === close) toggle.focus();
  }

  toggle.addEventListener('click', () => setMobileSidebar(!sidebar.classList.contains('mobile-open')));
  close.addEventListener('click', () => setMobileSidebar(false));
  backdrop.addEventListener('click', () => setMobileSidebar(false));
  sidebar.querySelectorAll('[data-view], #sign-out').forEach(item => {
    item.addEventListener('click', () => setMobileSidebar(false));
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && sidebar.classList.contains('mobile-open')) setMobileSidebar(false);
  });
  window.matchMedia('(min-width: 901px)').addEventListener('change', event => {
    if (event.matches) setMobileSidebar(false);
  });
  sidebar.setAttribute('aria-hidden', String(window.matchMedia('(max-width: 900px)').matches));
})();
