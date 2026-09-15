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


if __name__ == "__main__":
    unittest.main()
