/* Shared component runtime and diagnostics for the side-panel sections. */
(() => {
  const registry = new Map();
  const errors = [];
  let mounted = null;

  const check = (name, pass, detail = '') => ({ name, pass: Boolean(pass), detail });
  const activeView = () => document.querySelector('#side-nav .nav-link.active')?.dataset.view
    || (typeof view !== 'undefined' ? view : 'dashboard');

  function captureError(source, error) {
    errors.push({ source, message: error?.message || String(error), time: new Date().toISOString() });
    if (errors.length > 30) errors.shift();
  }

  function componentContext(component) {
    return {
      component,
      root: document.getElementById('view-root'),
      modalRoot: document.getElementById('modal-root'),
      check
    };
  }

  function mountCurrent() {
    const next = activeView();
    const component = registry.get(next);
    const root = document.getElementById('view-root');
    if (!root || !component) return;
    if (mounted && mounted !== next) {
      const previous = registry.get(mounted);
      try { previous?.unmount?.(componentContext(previous)); } catch (error) { captureError(`${mounted}:unmount`, error); }
    }
    mounted = next;
    root.dataset.component = component.id;
    try { component.mount?.(componentContext(component)); } catch (error) { captureError(`${next}:mount`, error); }
  }

  function run(viewName = activeView()) {
    const component = registry.get(viewName);
    if (!component) return { view: viewName, ok: false, error: 'Component is not registered.' };
    let checks = [];
    try { checks = component.diagnose?.(componentContext(component)) || []; }
    catch (error) { captureError(`${viewName}:diagnose`, error); checks = [check('Diagnostics executed', false, error.message)]; }
    return {
      view: viewName,
      component: component.id,
      label: component.label,
      ok: checks.every(item => item.pass),
      checks
    };
  }

  function register(component) {
    if (!component?.id || !component?.view) throw new Error('A component requires id and view.');
    registry.set(component.view, component);
    document.documentElement.dataset.registeredComponents = String(registry.size);
    document.documentElement.dataset.componentViews = [...registry.keys()].join(',');
    mountCurrent();
  }

  window.addEventListener('error', event => captureError('window', event.error || event.message));
  window.addEventListener('unhandledrejection', event => captureError('promise', event.reason));

  const viewRoot = document.getElementById('view-root');
  if (viewRoot) new MutationObserver(mountCurrent).observe(viewRoot, { childList: true });
  document.getElementById('side-nav')?.addEventListener('click', () => queueMicrotask(mountCurrent));

  window.MSMEComponents = Object.freeze({ register, check });
  window.MSMEDebug = Object.freeze({
    current: () => activeView(),
    list: () => [...registry.values()].map(item => ({ id: item.id, view: item.view, label: item.label })),
    run,
    status: () => ({ current: activeView(), mounted, registered: registry.size, diagnostic: run(), recentErrors: [...errors] }),
    errors: () => [...errors],
    help: () => 'Use MSMEDebug.status(), MSMEDebug.run("workers"), MSMEDebug.list(), or MSMEDebug.errors().'
  });
})();
