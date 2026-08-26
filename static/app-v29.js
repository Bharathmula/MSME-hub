/* Version 29 - save-only profile creation. */

window.add = function openUnsavedProfileDraftV29(roleName) {
  const prefix = roleName === 'Worker' ? 'WR' : roleName === 'Staff' ? 'ST' : 'EN';
  const draft = fix({
    id: `${prefix}-${Math.floor(1000 + Math.random() * 8999)}`,
    name: '', role: roleName, dept: '', status: 'Present', skills: []
  });

  /* Insert the draft only while constructing the existing detailed form. */
  people.push(draft);
  editor(draft.id);
  people = people.filter(person => person !== draft);

  const form = document.querySelector('#modal-root form');
  if (!form) return;
  const originalSubmit = form.onsubmit;
  const archiveButton = form.querySelector('#archive');
  const archiveNote = archiveButton?.previousElementSibling;
  archiveButton?.remove();
  if (archiveNote?.classList.contains('resignation-note')) archiveNote.remove();
  const heading = form.querySelector('h2');
  if (heading) heading.textContent = `New ${roleName}`;
  const saveButton = form.querySelector('.modal-actions .primary');
  if (saveButton) saveButton.textContent = `Save new ${roleName}`;

  form.onsubmit = event => {
    if (!people.includes(draft)) people.push(draft);
    try {
      originalSubmit(event);
    } catch (error) {
      people = people.filter(person => person !== draft);
      throw error;
    }
  };
};
