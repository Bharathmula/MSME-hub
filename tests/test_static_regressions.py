import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


class StaticRegressionTests(unittest.TestCase):
    def test_dashboard_greeting_uses_one_india_time_source(self):
        greeting = (ROOT / "static" / "sections" / "dashboard-greeting.js").read_text(
            encoding="utf-8"
        )
        overview = (ROOT / "static" / "overview-payroll-and-training.js").read_text(
            encoding="utf-8"
        )

        self.assertIn('timeZone: "Asia/Kolkata"', greeting)
        self.assertIn("greetingForHour(indiaHour())", greeting)
        self.assertNotIn("greetingForHour(new Date().getHours())", greeting)
        self.assertIn("const hour = indiaHour(date);", overview)

    def test_dashboard_does_not_use_competing_subtree_observers(self):
        greeting = (ROOT / "static" / "sections" / "dashboard-greeting.js").read_text(
            encoding="utf-8"
        )
        controls = (ROOT / "static" / "dashboard-attendance-controls.js").read_text(
            encoding="utf-8"
        )
        overview = (ROOT / "static" / "overview-payroll-and-training.js").read_text(
            encoding="utf-8"
        )

        self.assertNotIn("new MutationObserver(updateGreeting)", greeting)
        self.assertNotIn("new MutationObserver(updateImportantLabel)", controls)
        self.assertNotIn("new MutationObserver(refreshUpdateLabel)", controls)
        self.assertNotIn("new MutationObserver(refreshAdminGreeting)", overview)
        self.assertNotIn("new MutationObserver(refreshOperationsEnhancements)", overview)
        self.assertIn("refreshOperationsEnhancements();", overview)

    def test_new_profiles_require_check_in_and_entrepreneurs_have_no_attendance(self):
        forms = (ROOT / "static" / "account-notifications-and-forms.js").read_text(
            encoding="utf-8"
        )
        controls = (ROOT / "static" / "dashboard-attendance-controls.js").read_text(
            encoding="utf-8"
        )
        advanced_calendar = (ROOT / "static" / "workforce-operations.js").read_text(
            encoding="utf-8"
        )
        entrepreneur = (ROOT / "static" / "sections" / "entrepreneur-dashboard.js").read_text(
            encoding="utf-8"
        )

        self.assertIn("status: 'Not checked in'", forms)
        self.assertIn("person.role !== 'Entrepreneur'", controls)
        self.assertNotIn("calendarRoleSectionV21('Entrepreneurs'", advanced_calendar)
        self.assertIn("attendance: false", entrepreneur)

    def test_employee_login_waits_for_dashboard_and_has_category_invitations(self):
        login = (ROOT / "static" / "owned-authentication-login.js").read_text(
            encoding="utf-8"
        )
        portal = (ROOT / "static" / "employee-portal" / "employee-portal.js").read_text(
            encoding="utf-8"
        )

        self.assertIn("await window.MSMEEmployeePortal?.open()", login)
        self.assertIn("The employee server took too long to respond", login)
        self.assertIn('id="ea-create"', portal)
        self.assertIn("Create invitation", portal)
        self.assertIn("data-copy-invitation", portal)
        self.assertNotIn("data-bulk-invite-role", portal)

    def test_postgres_photo_patterns_escape_percent_placeholders(self):
        routes = (ROOT / "employee_portal" / "routes.py").read_text(encoding="utf-8")
        self.assertNotIn("LIKE 'data:image/%'", routes)
        self.assertGreaterEqual(routes.count("LIKE 'data:image/%%'"), 6)

    def test_attendance_capture_is_single_submission_and_backend_action_guarded(self):
        portal = (ROOT / "static" / "employee-portal" / "employee-portal.js").read_text(encoding="utf-8")
        routes = (ROOT / "employee_portal" / "routes.py").read_text(encoding="utf-8")
        self.assertIn("if (attendanceSubmitting) return", portal)
        self.assertIn("'Idempotency-Key': attendanceCaptureId", portal)
        self.assertIn("expected_action: action", portal)
        self.assertIn("expected_action!=action", routes)

    def test_public_page_prewarms_employee_api_without_blocking_render(self):
        streamlit = (ROOT / "streamlit_app.py").read_text(encoding="utf-8")
        self.assertIn("/api/health", streamlit)
        self.assertIn(".catch(()=>{})", streamlit)

    def test_workspace_sync_retries_unsent_browser_edits_after_refresh(self):
        sync = (ROOT / "static" / "workspace-database-sync.js").read_text(
            encoding="utf-8"
        )
        self.assertIn("msme-workspace-pending-", sync)
        self.assertIn("msme-workspace-revision-", sync)
        self.assertIn("if (pending)", sync)
        self.assertIn("expected_updated_at: serverUpdatedAt", sync)

    def test_orphaned_employee_accounts_are_reconciled_without_deletion(self):
        backend = (ROOT / "backend.py").read_text(encoding="utf-8")
        self.assertIn("def reconcile_employee_accounts", backend)
        self.assertIn("if exists:", backend)
        self.assertNotIn("DELETE FROM employee_accounts", backend)


if __name__ == "__main__":
    unittest.main()
