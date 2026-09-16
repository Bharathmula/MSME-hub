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
        self.assertIn("data-bulk-invite-role", portal)
        self.assertIn("Active accounts are not changed", portal)


if __name__ == "__main__":
    unittest.main()
