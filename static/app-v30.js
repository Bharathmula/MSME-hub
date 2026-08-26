/* Version 30 - bulk selection in Worker, Staff and Entrepreneur overflows. */

const roleOverflowBeforeBulkV30 = window.roleOverflowV22;
let bulkOverflowRoleV30 = '';

function selectedOverflowIdsV30() {
  return [...document.querySelectorAll('[data-bulk-person]:checked')].map(input => input.dataset.bulkPerson);
}

function refreshBulkControlsV30() {
  const selected = selectedOverflowIdsV30();
  const allBoxes = [...document.querySelectorAll('[data-bulk-person]')];
  const count = document.getElementById('bulk-selected-count');
  const selectAll = document.getElementById('bulk-select-all');
  if (count) count.textContent = `${selected.length} selected`;
  if (selectAll) {
    selectAll.checked = allBoxes.length > 0 && selected.length === allBoxes.length;
    selectAll.indeterminate = selected.length > 0 && selected.length < allBoxes.length;
  }
  document.querySelectorAll('[data-bulk-action]').forEach(button => {
    button.disabled = selected.length === 0;
  });
}

function addBulkControlsV30(roleName) {
  bulkOverflowRoleV30 = roleName;
  const directory = document.querySelector('.overflow-directory');
  if (!directory) return;
  directory.insertAdjacentHTML('beforebegin', `<section class="bulk-overflow-toolbar">
    <label class="bulk-select-all"><input type="checkbox" id="bulk-select-all"> Select all ${esc(roleName === 'Entrepreneur' ? 'entrepreneurs' : `${roleName.toLowerCase()}s`)}</label>
    <strong id="bulk-selected-count">0 selected</strong>
    <div class="bulk-overflow-actions">
      <button class="bulk-move-button" type="button" data-bulk-action="archive" disabled>Move selected to Ex-Employees</button>
      <button class="bulk-delete-button" type="button" data-bulk-action="delete" disabled>Delete selected</button>
    </div>
  </section>`);

  document.querySelectorAll('.overflow-person-card').forEach(card => {
    const id = card.dataset.overflowProfile;
    card.insertAdjacentHTML('afterbegin', `<label class="bulk-person-select" title="Select this profile">
      <input type="checkbox" data-bulk-person="${esc(id)}"> <span>Select</span></label>`);
  });
  refreshBulkControlsV30();
}

window.roleOverflowV22 = function roleOverflowWithBulkSelectionV30(roleName) {
  roleOverflowBeforeBulkV30(roleName);
  addBulkControlsV30(roleName);
};

document.addEventListener('change', event => {
  if (event.target.matches('[data-bulk-person]')) {
    refreshBulkControlsV30();
    return;
  }
  if (event.target.matches('#bulk-select-all')) {
    document.querySelectorAll('[data-bulk-person]').forEach(input => {
      input.checked = event.target.checked;
    });
    refreshBulkControlsV30();
  }
}, true);

document.addEventListener('click', event => {
  const action = event.target.closest('[data-bulk-action]');
  if (!action) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const ids = selectedOverflowIdsV30();
  if (!ids.length) return;
  const selectedPeople = people.filter(person => ids.includes(person.id));

  if (action.dataset.bulkAction === 'archive') {
    if (!confirm(`Move ${selectedPeople.length} selected ${bulkOverflowRoleV30.toLowerCase()} profile(s) to Ex-Employees?`)) return;
    people = people.filter(person => !ids.includes(person.id));
    exPeople.push(...selectedPeople.map(person => ({
      ...person,
      exit_reason: person.exit_reason || `Bulk moved from active ${person.role.toLowerCase()} records`,
      exit_note: person.exit_note || person.exit_reason || `Bulk moved from active ${person.role.toLowerCase()} records`,
      exit_date: person.exit_date || new Date().toISOString().slice(0, 10)
    })));
  }

  if (action.dataset.bulkAction === 'delete') {
    if (!confirm(`Move ${selectedPeople.length} selected ${bulkOverflowRoleV30.toLowerCase()} profile(s) to the Recycle Bin?`)) return;
    if (typeof window.recycleRecords === 'function') {
      window.recycleRecords(selectedPeople.map(person => ({ source: person.role, record: person })));
    }
    people = people.filter(person => !ids.includes(person.id));
  }

  save();
  roleOverflowV22(bulkOverflowRoleV30);
}, true);
