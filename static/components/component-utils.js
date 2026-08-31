/* Reusable factories used by the independent side-panel components. */
(() => {
  function standard({ id, view, label, heading, required = [] }) {
    MSMEComponents.register({
      id, view, label,
      mount({ root }) { root.dataset.sectionReady = id; },
      unmount({ root }) { delete root.dataset.sectionReady; },
      diagnose({ root, check }) {
        const text = root?.querySelector('.page-heading .eyebrow')?.textContent.trim().toUpperCase() || '';
        return [
          check('View root exists', root),
          check('Correct heading rendered', !heading || text.includes(heading), text || 'No heading'),
          ...required.map(({ name, selector, minimum = 1 }) => {
            const count = document.querySelectorAll(selector).length;
            return check(name, count >= minimum, `${count} found; ${minimum} required`);
          })
        ];
      }
    });
  }

  function roster({ id, view, label, heading, records, rowSelector, addSelector }) {
    MSMEComponents.register({
      id, view, label,
      mount({ root }) { root.dataset.sectionReady = id; },
      unmount({ root }) { delete root.dataset.sectionReady; },
      diagnose({ root, check }) {
        const expected = records().length;
        const rows = root?.querySelectorAll(rowSelector).length || 0;
        const headingText = root?.querySelector('.page-heading .eyebrow')?.textContent.trim().toUpperCase() || '';
        return [
          check('Correct roster rendered', headingText.includes(heading), headingText || 'No heading'),
          check('Add control available', root?.querySelector(addSelector), addSelector),
          check('Rendered records match stored records', rows === expected, `${rows} rendered / ${expected} stored`),
          check('Table available', root?.querySelector('.table-wrap table'))
        ];
      }
    });
  }

  window.MSMEComponentFactories = Object.freeze({ standard, roster });
})();
