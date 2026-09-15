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


if __name__ == "__main__":
    unittest.main()
