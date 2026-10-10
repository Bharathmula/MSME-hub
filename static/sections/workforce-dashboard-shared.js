/* Shared workforce directory used by every company category dashboard.
 * Attendance belongs to Attendance Calendar and Attendance Control Centre,
 * so category dashboards intentionally show profile information only.
 */
(function () {
  const roleConfigurations = {};

  function text(value, fallback = "—") {
    const normalized = String(value ?? "").trim();
    return normalized || fallback;
  }

  function workforceIdOrder(left, right) {
    return String(left?.id || "").localeCompare(
      String(right?.id || ""),
      "en",
      { numeric: true, sensitivity: "base" },
    );
  }

  function currentDateTimeCard() {
    const now = new Date();
    return `<time class="workforce-current-date"><span>Today</span><b>${esc(now.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }))}</b><small>${esc(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }))}</small></time>`;
  }

  function skillList(person) {
    const skills = Array.isArray(person.skills)
      ? person.skills
      : String(person.skills || '').split(',').map(value => value.trim()).filter(Boolean);
    return skills.length
      ? `<div class="skills">${skills.slice(0, 5).map(skill => `<span class="skill">${esc(skill)}</span>`).join('')}</div>`
      : '<span class="workforce-directory-empty">No skills entered</span>';
  }

  function directoryRows(records, configuration) {
    return records.map(person => `<tr>
      <td><div class="cell-person"><span class="avatar">${ini(person.name)}</span><div><b>${esc(person.name)}</b><small>${esc(text(person.id))}</small></div></div></td>
      <td>${esc(text(person.phone))}</td>
      <td>${esc(text(person.email))}</td>
      <td>${esc(text(person.dept, 'Unassigned'))}</td>
      <td>${esc(text(person.designation, configuration.label))}</td>
      <td>${skillList(person)}</td>
      <td><button class="secondary workforce-directory-open" type="button" data-workforce-profile="${esc(person.id)}">Open details</button></td>
    </tr>`).join('');
  }

  function openProfile(personId, configuration) {
    if (configuration.role === 'Temporary Worker' && typeof tempEditor === 'function') tempEditor(personId);
    else if (typeof editor === 'function') editor(personId);
  }

  function addProfile(configuration) {
    if (configuration.role === 'Temporary Worker' && typeof tempEditor === 'function') tempEditor('');
    else if (typeof add === 'function') add(configuration.role);
  }

  function renderDashboard(configuration) {
    const records = [...configuration.records()].sort(workforceIdOrder);
    const label = configuration.label;
    root.innerHTML = `<div class="page-heading"><div><div class="eyebrow">${esc(label.toUpperCase())} DIRECTORY</div><h1>${esc(label)} dashboard.</h1><p>Manage ${esc(label.toLowerCase())} profiles and workforce details. Attendance records are available in Attendance Calendar and Attendance Control Centre.</p></div>${currentDateTimeCard()}</div>
      <section class="panel workforce-directory-panel"><div class="panel-header"><div><h2>${esc(label)} profiles</h2><p>Personal, department and skill information only.</p></div><button class="primary" type="button" data-workforce-directory-add>+ Add ${esc(label)}</button></div>
      <div class="table-wrap workforce-directory-table"><table><thead><tr><th>NAME</th><th>PHONE NO.</th><th>EMAIL</th><th>DEPARTMENT</th><th>DESIGNATION</th><th>SKILLS</th><th>ACTIONS</th></tr></thead><tbody>${directoryRows(records, configuration) || `<tr><td colspan="7" class="empty">No ${esc(label.toLowerCase())} profiles saved.</td></tr>`}</tbody></table></div></section>`;

    root.querySelectorAll('[data-workforce-profile]').forEach(button => {
      button.onclick = () => openProfile(button.dataset.workforceProfile, configuration);
    });
    root.querySelector('[data-workforce-directory-add]')?.addEventListener('click', () => addProfile(configuration));
  }

  window.MSMEWorkforceDashboards = {
    register(role, configuration) {
      roleConfigurations[role] = { ...configuration, role };
    },
    render(role) {
      const configuration = roleConfigurations[role];
      if (configuration) renderDashboard(configuration);
    },
  };

  window.roleDashboard = function workforceDirectoryDashboard(roleName) {
    window.MSMEWorkforceDashboards.render(roleName);
  };

  window.temporaryDashboard = function temporaryWorkforceDirectoryDashboard() {
    window.MSMEWorkforceDashboards.render("Temporary Worker");
  };
})();
