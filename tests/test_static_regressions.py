import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


class StaticRegressionTests(unittest.TestCase):
    def test_shared_workforce_dashboards_sort_by_natural_id(self):
        shared = (
            ROOT / "static" / "sections" / "workforce-dashboard-shared.js"
        ).read_text(encoding="utf-8")

        self.assertIn("function workforceIdOrder", shared)
        self.assertIn(
            "[...configuration.records()].sort(workforceIdOrder)", shared
        )

    def test_login_screen_does_not_flash_before_welcome_screen(self):
        index = (ROOT / "static" / "index.html").read_text(encoding="utf-8")
        authentication = (ROOT / "static" / "owned-authentication-login.js").read_text(
            encoding="utf-8"
        )
        self.assertIn('class="login-screen entry-hidden"', index)
        self.assertIn("screen.classList.remove('entry-hidden')", authentication)

    def test_workforce_groups_are_sorted_by_natural_employee_id(self):
        application = (ROOT / "static" / "application-core-and-profiles.js").read_text(
            encoding="utf-8"
        )
        self.assertIn("function compareWorkforceIds", application)
        self.assertIn(".sort(compareWorkforceIds)", application)

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

    def test_new_profiles_require_check_in_and_entrepreneurs_have_attendance(self):
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
        self.assertNotIn("person.role !== 'Entrepreneur'", controls)
        self.assertIn("calendarRoleSectionV21('Entrepreneurs'", advanced_calendar)
        self.assertIn("attendance: true", entrepreneur)

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

    def test_automatic_attendance_refresh_keeps_operations_overview(self):
        controls = (ROOT / "static" / "dashboard-attendance-controls.js").read_text(
            encoding="utf-8"
        )
        dashboard_refresh = controls.split(
            "else if (typeof view !== 'undefined' && view === 'dashboard')",
            1,
        )[1].split("}", 1)[0]
        self.assertIn("dashboard();", dashboard_refresh)
        self.assertIn("refreshAdminGreeting();", dashboard_refresh)
        self.assertIn("refreshUpdateLabel();", dashboard_refresh)
        self.assertIn("refreshOperationsEnhancements();", dashboard_refresh)

    def test_settings_has_company_attendance_integrations_and_reports(self):
        index = (ROOT / "static" / "index.html").read_text(encoding="utf-8")
        settings = (ROOT / "static" / "settings-attendance-integrations-and-reports.js").read_text(encoding="utf-8")
        sync = (ROOT / "static" / "workspace-database-sync.js").read_text(encoding="utf-8")

        self.assertIn('data-view="settings"', index)
        self.assertIn("Attendance Integration", settings)
        self.assertIn("Shift Timings", settings)
        self.assertIn("save-company-shift", settings)
        self.assertIn("Biometric", settings)
        self.assertIn("Face Authentication", settings)
        self.assertIn("CSV Report / Excel Sheet", settings)
        self.assertIn("Late comers", settings)
        self.assertIn("Early left", settings)
        self.assertIn("data-attendance-mode", settings)
        self.assertIn("aria-pressed", settings)
        self.assertIn("}, 5000);", settings)
        self.assertNotIn('type="checkbox" data-attendance-mode', settings)
        self.assertIn('"attendance-integration-settings"', sync)
        self.assertIn('"attendance-import-history"', sync)

    def test_settings_opens_collapsed_and_trial_note_is_removed(self):
        settings = (ROOT / "static" / "settings-attendance-integrations-and-reports.js").read_text(encoding="utf-8")
        self.assertIn("let settingsTab = null", settings)
        self.assertIn("if (!settingsWasOpen) settingsTab = null", settings)
        self.assertNotIn("After the trial:", settings)

    def test_new_day_resets_live_presence_before_attendance_sync(self):
        controls = (ROOT / "static" / "dashboard-attendance-controls.js").read_text(encoding="utf-8")
        self.assertIn("person.status = record?.status || 'Absent'", controls)
        self.assertIn("syncAutomaticAttendanceV21(today, true)", controls)
        self.assertIn("timeZone: 'Asia/Kolkata'", controls)
        self.assertIn("syncAutomaticAttendanceV21(indiaAttendanceDateV37(), true)", controls)
        self.assertNotIn("saveAttendanceDateV21(new Date().toISOString().slice(0, 10))", controls)

    def test_welcome_separates_existing_workspace_and_new_trial(self):
        authentication = (ROOT / "static" / "owned-authentication-login.js").read_text(encoding="utf-8")
        styles = (ROOT / "static" / "owned-authentication.css").read_text(encoding="utf-8")
        self.assertIn("Go to Workspace", authentication)
        self.assertIn("Start 30-Day Free Trial", authentication)
        self.assertIn("openLandingAuth('signin')", authentication)
        self.assertIn("openLandingAuth('signup')", authentication)
        self.assertIn("Existing customers can sign in", authentication)
        self.assertIn("landingActions.className='landing-actions'", authentication)
        self.assertIn('<span>MSME</span><i>MULTI SKILL</i><i>PLANNER</i>', authentication)
        self.assertNotIn('class="landing-empowerment"', authentication)
        self.assertNotIn('class="landing-global"', authentication)
        self.assertIn("PRODUCTIVITY", authentication)
        self.assertIn('class="back-to-workspace"', authentication)
        self.assertIn('class="back-to-signin"', authentication)
        self.assertIn("screen.querySelector('.back-to-signin').hidden=tab==='signin'", authentication)
        self.assertIn(".landing-actions .landing-login{display:inline-flex", styles)
        self.assertIn('url("assets/msme-welcome-hero.png")', styles)
        self.assertIn("Final shared hero treatment", styles)
        self.assertIn("#login-screen{isolation:isolate;background-image:", styles)
        self.assertIn("Center authentication and remove the separate decorative login illustration", styles)
        self.assertIn("#login-screen .login-art,#login-screen .login-scene{display:none!important}", styles)
        self.assertIn(".msme-landing{overflow-x:hidden;overflow-y:auto", styles)
        self.assertIn("Restore the original MSME branding copy", styles)
        self.assertIn("#login-screen .login-art>.os-logo{display:flex!important", styles)
        self.assertIn("linear-gradient(90deg,#9b5cff", styles)
        self.assertIn("Login branding is intentionally limited", styles)
        self.assertIn("#login-screen .login-art>.art-copy{display:none!important}", styles)
        self.assertIn("#login-screen .login-art .login-benefits{display:flex;flex-direction:column", styles)
        self.assertIn("Slight welcome-page travel and refined hero typography", styles)
        self.assertIn(".msme-landing .landing-copy{min-height:106vh", styles)
        self.assertIn(".landing-global{display:none!important}", styles)
        self.assertTrue((ROOT / "static" / "assets" / "msme-welcome-hero.png").is_file())

    def test_streamlit_inlines_css_background_images_for_srcdoc(self):
        streamlit = (ROOT / "streamlit_app.py").read_text(encoding="utf-8")
        self.assertIn("def inline_local_asset", streamlit)
        self.assertIn("base64.b64encode(asset_path.read_bytes())", streamlit)
        self.assertIn('url("data:{mime_type};base64,{encoded}")', streamlit)


if __name__ == "__main__":
    unittest.main()
