/* Version 31 - visible form controls and enhanced native date pickers. */

function addMissingFamilyDatesV31(scope) {
  const forms = [];
  if (scope.matches?.('form')) forms.push(scope);
  forms.push(...scope.querySelectorAll?.('form') || []);
  forms.forEach(form => {
    if (!form.matches('#full-form') || form.elements.parents_anniversary) return;
    const familySection = [...form.querySelectorAll('.form-section')]
      .find(section => /family details/i.test(section.textContent));
    const familyGrid = familySection?.nextElementSibling;
    if (!familyGrid?.classList.contains('form-grid')) return;
    familyGrid.insertAdjacentHTML('beforeend', `<label>Parents' anniversary
      <input type="date" name="parents_anniversary"></label>
      <label>Special family date<input type="date" name="special_date"></label>`);
  });
}

function enhanceDateInputsV31(scope = document) {
  addMissingFamilyDatesV31(scope);
  const dateInputs = [];
  if (scope.matches?.('input[type="date"]')) dateInputs.push(scope);
  dateInputs.push(...scope.querySelectorAll?.('input[type="date"]:not([data-date-enhanced])') || []);
  dateInputs.forEach(input => {
    if (input.dataset.dateEnhanced) return;
    input.dataset.dateEnhanced = 'true';
    input.min = input.min || '1900-01-01';
    input.max = input.max || '2100-12-31';
    input.title = 'Select day, month and year';
    input.setAttribute('aria-description', 'Use the calendar button to select day, month and year');
    const fieldName = String(input.name || input.id || '').toLowerCase();
    if (/dob|birthday|anniversary/.test(fieldName)) input.max = new Date().toISOString().slice(0, 10);
    if (!input.nextElementSibling?.classList.contains('date-picker-help')) {
      input.insertAdjacentHTML('afterend', '<small class="date-picker-help">Select day / month / year</small>');
    }
  });
}

const formDateObserverV31 = new MutationObserver(mutations => {
  mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
    if (node.nodeType === Node.ELEMENT_NODE) enhanceDateInputsV31(node);
  }));
});
formDateObserverV31.observe(document.body, { childList: true, subtree: true });
enhanceDateInputsV31();

/* Run synchronously after every workforce editor opens as well as through the
   observer. This guarantees newly inserted family-date fields are available
   before the user starts entering data. */
const editorBeforeDateEnhancementV31 = window.editor;
window.editor = function editorWithDateEnhancementV31(...args) {
  editorBeforeDateEnhancementV31(...args);
  enhanceDateInputsV31(document.getElementById('modal-root'));
  const [personId, isEx = false] = args;
  const person = (isEx ? exPeople : people).find(item => item.id === personId);
  const form = document.querySelector('#modal-root form');
  ['parents_anniversary', 'special_date'].forEach(field => {
    const input = form?.elements.namedItem(field);
    if (input && person?.[field]) input.value = person[field];
  });
};
