/*
 * Shared automatic workforce dashboard.
 *
 * Manual attendance belongs only to Attendance Calendar. Worker, Staff,
 * Entrepreneur and Temporary Worker dashboards call this renderer to display
 * attendance, face-capture and salary results calculated from saved records.
 */
(function () {
  const roleConfigurations = {};

  function text(value, fallback = "—") {
    const normalized = String(value ?? "").trim();
    return normalized || fallback;
  }

  function durationMinutes(value) {
    const raw = String(value || "").toLowerCase();
    const hours = Number(raw.match(/([\d.]+)\s*h/)?.[1] || 0);
    const minutes = Number(raw.match(/([\d.]+)\s*m/)?.[1] || 0);
    return Math.round(hours * 60 + minutes);
  }

  function money(value) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  }

  function currentMonthPrefix() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  function todayDateKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  function currentDateTimeCard() {
    const now = new Date();
    return `<time class="workforce-current-date"><span>Today</span><b>${esc(now.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }))}</b><small>${esc(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))}</small></time>`;
  }

  function recordsFor(person, monthPrefix) {
    return (Array.isArray(attendanceLog) ? attendanceLog : [])
      .filter((day) => String(day.date || "").startsWith(monthPrefix))
      .flatMap((day) =>
        (day.records || [])
          .filter((record) => record.id === person.id)
          .map((record) => ({ ...record, attendance_date: day.date })),
      );
  }

  function todayRecord(person) {
    const today = todayDateKey();
    const day = (Array.isArray(attendanceLog) ? attendanceLog : []).find(
      (entry) => entry.date === today,
    );
    const combined = typeof combinedAttendanceRecordV21 === "function"
      ? combinedAttendanceRecordV21(today, day)
      : day;
    return combined?.records?.find((record) => record.id === person.id) || {};
  }

  function salarySummary(person, monthPrefix) {
    const monthlyRecords = recordsFor(person, monthPrefix);
    const presentRecords = monthlyRecords.filter(
      (record) => record.status === "Present",
    );
    const workedMinutes = presentRecords.reduce(
      (total, record) => total + durationMinutes(record.work),
      0,
    );
    const overtimeMinutes = presentRecords.reduce(
      (total, record) => total + durationMinutes(record.overtime),
      0,
    );
    const monthlySalary = Number(person.monthly_salary || 0);
    const dailyRate = Number(person.daily_rate || 0);
    const estimatedSalary = dailyRate > 0
      ? dailyRate * presentRecords.length
      : monthlySalary > 0
        ? monthlySalary * Math.min(workedMinutes / (26 * 8 * 60), 1)
        : 0;

    return {
      estimatedSalary,
      monthlySalary,
      overtimeMinutes,
      presentDays: presentRecords.length,
    };
  }

  function faceStatus(record) {
    const captured = Boolean(
      record.face_captured ||
      record.face_verified ||
      record.checkin_photo ||
      record.checkout_photo,
    );
    return captured
      ? '<span class="face-status captured">Captured</span>'
      : '<span class="face-status missing">Not captured</span>';
  }

  function workforceRows(records) {
    const monthPrefix = currentMonthPrefix();

    return records.map((person) => {
      const today = todayRecord(person);
      const salary = salarySummary(person, monthPrefix);
      const totalTime = text(today.work);
      const overtime = text(today.overtime, "0h 0m");

      return `
        <tr>
          <td><b>${todayDateKey()}</b><small>Today</small></td>
          <td>
            <b>${esc(person.name)}</b>
            <small>${esc(person.id)}</small>
          </td>
          <td>${esc(text(person.phone))}</td>
          <td>${esc(text(person.shift, "09:00 AM - 06:00 PM"))}</td>
          <td>${esc(text(today.login || today.login_time))}</td>
          <td>${esc(text(today.logout || today.logout_time))}</td>
          <td>${faceStatus(today)}</td>
          <td>${esc(totalTime)}</td>
          <td>${esc(overtime)}</td>
          <td>
            <b>${money(salary.estimatedSalary)}</b>
            <small>${salary.presentDays} present day(s)</small>
          </td>
          <td>${money(salary.monthlySalary)}</td>
          <td><button class="secondary workforce-shift-edit" data-workforce-id="${esc(person.id)}">Edit shift</button></td>
        </tr>
      `;
    }).join("");
  }

  function openShiftEditor(person, configuration) {
    const modalRoot = document.getElementById('modal-root');
    modalRoot.innerHTML = `<div class="modal-backdrop"><form class="modal" id="workforce-shift-form"><div class="modal-head"><div><div class="eyebrow">EDIT SHIFT TIMINGS</div><h2>${esc(person.name)}</h2><p>Update the shift, then use Save dashboard to store it permanently.</p></div><button class="close" type="button" data-close>×</button></div><div class="form-grid"><label class="full">SHIFT TIMINGS<input name="shift" value="${esc(person.shift || '09:00 AM - 06:00 PM')}" required></label></div><div class="modal-actions"><button class="secondary" type="button" data-close>Cancel</button><button class="primary">Apply shift</button></div></form></div>`;
    modalRoot.querySelectorAll('[data-close]').forEach(button => button.onclick = () => { modalRoot.innerHTML = ''; });
    modalRoot.querySelector('#workforce-shift-form').onsubmit = event => {
      event.preventDefault();
      person.shift = new FormData(event.target).get('shift').trim();
      modalRoot.innerHTML = '';
      renderDashboard(configuration);
    };
  }

  function renderDashboard(configuration) {
    const records = configuration.records();
    const label = configuration.label;

    root.innerHTML = `
      <div class="page-heading">
        <div>
          <div class="eyebrow">${esc(configuration.eyebrow)}</div>
          <h1>${esc(label)} dashboard.</h1>
          <p>
            Attendance and salary are calculated automatically from records
            saved in Attendance Calendar. There are no manual attendance controls here.
          </p>
        </div>
        ${currentDateTimeCard()}
      </div>

      <section class="panel automatic-workforce-note">
        <b>Automatic attendance view</b>
        <span>To enter or correct attendance, open Attendance Calendar.</span>
        <button class="text-button" data-view="attendance">Open Attendance Calendar →</button>
      </section>

      <div class="table-wrap automatic-workforce-table">
        <table>
          <thead>
            <tr>
              <th>DATE</th>
              <th>NAME</th>
              <th>PHONE NO.</th>
              <th>SHIFT TIMINGS</th>
              <th>CHECK-IN TIME</th>
              <th>CHECK-OUT TIME</th>
              <th>FACE CAPTURED</th>
              <th>TOTAL TIME</th>
              <th>OVERTIME</th>
              <th>TOTAL SALARY</th>
              <th>MONTHLY SALARY</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            ${workforceRows(records) || `
              <tr>
                <td colspan="12" class="empty">No ${esc(label.toLowerCase())} records.</td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
      <div class="workforce-dashboard-actions"><button class="primary" id="save-workforce-dashboard">Save dashboard</button><span id="workforce-save-message"></span></div>
    `;

    root.querySelectorAll('.workforce-shift-edit').forEach(button => {
      button.onclick = () => {
        const person = records.find(item => item.id === button.dataset.workforceId);
        if (!person) return;
        openShiftEditor(person, configuration);
      };
    });
    root.querySelector('#save-workforce-dashboard').onclick = () => {
      const today = todayDateKey();
      const automatic = typeof automaticAttendanceDraftsV21 !== 'undefined'
        ? (automaticAttendanceDraftsV21.get(today) || [])
        : [];
      if (automatic.length) {
        const shifted = automatic.map(record => {
          const person = records.find(item => item.id === record.id);
          return { ...record, shift: person?.shift || record.shift || '09:00 AM - 06:00 PM' };
        });
        const index = attendanceLog.findIndex(day => day.date === today);
        if (index < 0) attendanceLog.push({ date: today, records: shifted });
        else {
          const retained = attendanceLog[index].records.filter(record => !shifted.some(item => item.id === record.id));
          attendanceLog[index] = { date: today, records: [...retained, ...shifted] };
        }
      }
      save();
      root.querySelector('#workforce-save-message').textContent = 'Saved permanently.';
    };

    if (typeof syncAutomaticAttendanceV21 === 'function') {
      syncAutomaticAttendanceV21(todayDateKey());
    }
  }

  window.MSMEWorkforceDashboards = {
    register(role, configuration) {
      roleConfigurations[role] = configuration;
    },
    render(role) {
      const configuration = roleConfigurations[role];
      if (configuration) renderDashboard(configuration);
    },
  };

  window.roleDashboard = function automaticRoleDashboard(roleName) {
    window.MSMEWorkforceDashboards.render(roleName);
  };

  window.temporaryDashboard = function automaticTemporaryDashboard() {
    window.MSMEWorkforceDashboards.render("Temporary Worker");
  };
})();
