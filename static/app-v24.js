/* Version 24 - worker resignation archive action. */

const editorBeforeResignationAction = window.editor;

window.editor = function editorWithResignationAction(id, isEx = false) {
  const person = (isEx ? exPeople : people).find(item => item.id === id);
  editorBeforeResignationAction(id, isEx);
  if (!person || isEx) return;

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
