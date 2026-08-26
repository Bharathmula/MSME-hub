/* Version 26 - overtime dropdowns and updated brand treatment. */

function selectedOvertimeHoursV21(person) {
  const value = Number(person.overtime_hours ?? 0);
  return Math.min(5, Math.max(0, Number.isFinite(value) ? value : 0));
}

function overtimeSliderV21(person) {
  const selected = selectedOvertimeHoursV21(person);
  const period = person.overtime_period === 'AM' ? 'AM' : 'PM';
  return `<div class="overtime-dropdown-control">
    <select data-overtime-hours="${esc(person.id)}" aria-label="Overtime hours">
      ${[0, 1, 2, 3, 4, 5].map(hour => `<option value="${hour}" ${selected === hour ? 'selected' : ''}>${hour}hr</option>`).join('')}
    </select>
    <select data-overtime-period="${esc(person.id)}" aria-label="Overtime AM or PM">
      <option ${period === 'AM' ? 'selected' : ''}>AM</option>
      <option ${period === 'PM' ? 'selected' : ''}>PM</option>
    </select>
  </div>`;
}

function tempOvertimeV23(person) {
  const selected = selectedOvertimeHoursV21(person);
  const period = person.overtime_period === 'AM' ? 'AM' : 'PM';
  return `<div class="overtime-dropdown-control">
    <select data-temp-overtime-hours="${esc(person.id)}" aria-label="Temporary worker overtime hours">
      ${[0, 1, 2, 3, 4, 5].map(hour => `<option value="${hour}" ${selected === hour ? 'selected' : ''}>${hour}hr</option>`).join('')}
    </select>
    <select data-temp-overtime-period="${esc(person.id)}" aria-label="Temporary worker overtime AM or PM">
      <option ${period === 'AM' ? 'selected' : ''}>AM</option>
      <option ${period === 'PM' ? 'selected' : ''}>PM</option>
    </select>
  </div>`;
}

if (document.getElementById('app-shell').classList.contains('visible')) render();
