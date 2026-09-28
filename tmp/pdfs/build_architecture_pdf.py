from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "output" / "pdf" / "MSME-Architecture-Guide.pdf"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

PAGE_W, PAGE_H = A4
MARGIN = 34
BLACK = colors.HexColor("#111111")
MUTED = colors.HexColor("#575757")
GREEN = colors.HexColor("#1F8A3B")
GREEN_BG = colors.HexColor("#EEFAF0")
RED = colors.HexColor("#D93C2B")
RED_BG = colors.HexColor("#FFF1EF")
BLUE = colors.HexColor("#1768AC")
BLUE_BG = colors.HexColor("#EEF6FC")
PURPLE = colors.HexColor("#7639B8")
PURPLE_BG = colors.HexColor("#F7F0FC")
YELLOW = colors.HexColor("#C99A00")
YELLOW_BG = colors.HexColor("#FFF9D9")
GRAY_BG = colors.HexColor("#F4F4F4")


def wrap(text, font, size, width):
    words = text.split()
    lines, line = [], ""
    for word in words:
        trial = f"{line} {word}".strip()
        if stringWidth(trial, font, size) <= width:
            line = trial
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def text_block(c, text, x, y, width, font="Helvetica", size=8.4, leading=11, color=BLACK):
    c.setFillColor(color)
    c.setFont(font, size)
    for line in wrap(text, font, size, width):
        c.drawString(x, y, line)
        y -= leading
    return y


def page_header(c, title, section, subtitle=None):
    c.setFillColor(BLACK)
    c.setFont("Helvetica-Bold", 20)
    y = PAGE_H - 44
    for line in title.split("\n"):
        c.drawString(MARGIN, y, line)
        y -= 21
    badge_w = 150
    c.setFillColor(BLACK)
    c.rect(PAGE_W - MARGIN - badge_w, PAGE_H - 52, badge_w, 18, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Courier-Bold", 7)
    c.drawCentredString(PAGE_W - MARGIN - badge_w / 2, PAGE_H - 46, section)
    if subtitle:
        c.setFillColor(MUTED)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(MARGIN, y - 2, subtitle.upper())
        y -= 17
    c.setStrokeColor(BLACK)
    c.setLineWidth(1.4)
    c.line(MARGIN, y, PAGE_W - MARGIN, y)
    return y - 18


def section_title(c, number, title, y):
    c.setFillColor(BLACK)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(MARGIN, y, f"{number}. {title.upper()}")
    c.setLineWidth(1)
    c.line(MARGIN, y - 7, PAGE_W - MARGIN, y - 7)
    return y - 23


def card(c, x, y_top, w, h, title, body, border, bg, label=None):
    c.setFillColor(bg)
    c.setStrokeColor(border)
    c.setLineWidth(1.4)
    c.rect(x, y_top - h, w, h, fill=1, stroke=1)
    ty = y_top - 20
    if label:
        lw = min(w - 24, stringWidth(label, "Helvetica-Bold", 6.5) + 16)
        c.setFillColor(border)
        c.rect(x + 10, ty - 2, lw, 14, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 6.5)
        c.drawCentredString(x + 10 + lw / 2, ty + 2, label)
        ty -= 22
    c.setFillColor(border)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(x + 12, ty, title)
    ty -= 16
    text_block(c, body, x + 12, ty, w - 24, size=7.3, leading=9.5, color=BLACK)


def note(c, y, label, body, border=YELLOW, bg=YELLOW_BG):
    h = 50
    c.setFillColor(bg)
    c.setStrokeColor(border)
    c.setLineWidth(1.2)
    c.rect(MARGIN, y - h, PAGE_W - 2 * MARGIN, h, fill=1, stroke=1)
    c.setFillColor(border)
    c.rect(MARGIN + 9, y - 21, 65, 14, fill=1, stroke=0)
    c.setFillColor(BLACK)
    c.setFont("Helvetica-Bold", 6.5)
    c.drawCentredString(MARGIN + 41.5, y - 17, label)
    text_block(c, body, MARGIN + 84, y - 15, PAGE_W - 2 * MARGIN - 95, size=7.5, leading=9.5)
    return y - h - 12


def flow_box(c, x, y, w, h, title, subtitle, border=BLACK, bg=colors.white):
    c.setFillColor(bg)
    c.setStrokeColor(border)
    c.setLineWidth(1.1)
    c.rect(x, y - h, w, h, fill=1, stroke=1)
    c.setFillColor(BLACK)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(x + w / 2, y - 16, title)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 6.7)
    c.drawCentredString(x + w / 2, y - 29, subtitle)


def footer(c, page_num):
    c.setFillColor(colors.HexColor("#777777"))
    c.setFont("Courier", 6.5)
    c.drawString(MARGIN, 20, "MSME MULTI SKILL PLANNER - ARCHITECTURE & OPERATIONS")
    c.setFont("Helvetica-Bold", 7)
    c.drawRightString(PAGE_W - MARGIN, 20, f"Page {page_num} of 6")


def page_one(c):
    y = page_header(c, "HOW FRONTEND & BACKEND\nCOMMUNICATE", "SECTION 01 / ARCHITECTURE", "A beginner-friendly guide to project structure, APIs, Git and deployment")
    y = section_title(c, 1, "Project Structure Fundamentals", y)
    y = text_block(c, "The MSME application is one repository with strict boundaries between browser code, server logic and persistent storage. This separation improves security, maintenance, testing and deployment reliability.", MARGIN, y, PAGE_W - 2 * MARGIN, size=8.2, leading=11) - 10
    gap = 10
    w = (PAGE_W - 2 * MARGIN - gap) / 2
    card(c, MARGIN, y, w, 148, "Monolithic confusion", "UI files, API rules, secrets and database operations live together. A browser change can accidentally affect server behavior, paths become unclear, and sensitive database access is easier to expose.", RED, RED_BG, "MESSY / ANTI-PATTERN")
    card(c, MARGIN + w + gap, y, w, 148, "Separated MSME architecture", "frontend/ contains Streamlit and browser assets. backend/ contains Flask, authentication, employee services and migrations. tests/, docs/ and scripts/ have clear ownership.", GREEN, GREEN_BG, "CLEAN / BEST PRACTICE")
    y -= 165
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(BLACK)
    c.drawString(MARGIN, y, "Core application responsibilities")
    y -= 12
    rows = [
        ("FRONTEND", "frontend/", "UI, interactions, browser state and HTTPS requests."),
        ("API LAYER", "backend/app.py", "Authentication, authorization, validation and responses."),
        ("SERVICES", "backend/*", "Company workspaces, employees, attendance and subscriptions."),
        ("DATABASE", "Neon PostgreSQL", "Permanent company-isolated records and attendance photos."),
    ]
    for i, (name, loc, resp) in enumerate(rows):
        h = 36
        c.setFillColor(GRAY_BG if i % 2 == 0 else colors.white)
        c.rect(MARGIN, y - h, PAGE_W - 2 * MARGIN, h, fill=1, stroke=0)
        c.setFillColor(BLACK)
        c.setFont("Helvetica-Bold", 7)
        c.drawString(MARGIN + 8, y - 21, name)
        c.setFont("Courier", 7)
        c.drawString(MARGIN + 122, y - 21, loc)
        text_block(c, resp, MARGIN + 255, y - 15, PAGE_W - MARGIN - (MARGIN + 263), size=6.8, leading=8)
        y -= h
    y -= 14
    y = note(c, y, "KEY CONCEPT", "Structure matters because browser code is public, backend code is trusted, and only the backend may hold database credentials or access Neon.")
    footer(c, 1)


def page_two(c):
    y = page_header(c, "REPOSITORIES & COMMUNICATION", "SECTION 02 / DEPLOYMENT & APIS")
    y = section_title(c, 2, "Repository and Cloud Deployment", y)
    y = text_block(c, "This project uses a clean monorepo. Frontend and backend share one Git commit but deploy as independent services.", MARGIN, y, PAGE_W - 2 * MARGIN) - 13
    flow_box(c, MARGIN + 10, y, 205, 42, "FRONTEND CODEBASE", "frontend/app.py + frontend/static/", BLUE, BLUE_BG)
    flow_box(c, PAGE_W - MARGIN - 215, y, 205, 42, "BACKEND CODEBASE", "backend/app.py + backend services", PURPLE, PURPLE_BG)
    y -= 58
    flow_box(c, MARGIN + 10, y, 205, 42, "STREAMLIT CLOUD", "Public interface and browser bundle", BLUE, colors.white)
    flow_box(c, PAGE_W - MARGIN - 215, y, 205, 42, "RENDER", "Flask API: backend.app:app", PURPLE, colors.white)
    c.setFillColor(BLACK); c.setFont("Helvetica-Bold", 13); c.drawCentredString(PAGE_W / 2, y - 25, "HTTPS / JSON")
    y -= 70
    y = section_title(c, 3, "The Request-Response Lifecycle", y)
    box_w = 108; box_h = 50; start_x = MARGIN
    labels = [("USER", "Browser action"), ("FRONTEND", "Sends HTTPS"), ("RENDER API", "Validates + processes"), ("NEON", "Persists data")]
    for i, (title, sub) in enumerate(labels):
        x = start_x + i * (box_w + 18)
        flow_box(c, x, y, box_w, box_h, title, sub, YELLOW if i == 2 else BLACK, YELLOW_BG if i == 2 else colors.white)
        if i < 3:
            c.setFillColor(GREEN); c.setFont("Helvetica-Bold", 12); c.drawString(x + box_w + 4, y - 29, ">")
    y -= 68
    steps = [
        "1. User action: an administrator or employee submits an action.",
        "2. HTTPS request: JavaScript calls the configured Render API endpoint.",
        "3. Authentication: Flask verifies token, role and company identity.",
        "4. Database query: the backend reads or writes company-scoped Neon rows.",
        "5. JSON response: Render returns structured status and data.",
        "6. UI update: the browser refreshes only the affected view.",
    ]
    for step in steps:
        y = text_block(c, step, MARGIN + 8, y, PAGE_W - 2 * MARGIN - 16, size=7.5, leading=10) - 2
    y -= 7
    c.setFillColor(GRAY_BG); c.setStrokeColor(BLACK); c.rect(MARGIN, y - 58, PAGE_W - 2 * MARGIN, 58, fill=1, stroke=1)
    c.setFont("Courier-Bold", 7); c.setFillColor(GREEN); c.drawString(MARGIN + 10, y - 16, "GET /api/employee/dashboard")
    c.setFillColor(BLACK); c.drawString(MARGIN + 10, y - 31, "Authorization: Bearer <employee-access-token>")
    c.setFillColor(BLUE); c.drawString(MARGIN + 10, y - 46, '{"status":"success","company":"isolated tenant","data":{...}}')
    y -= 73
    note(c, y, "IMPORTANT RULE", "The frontend cannot read backend source files or Neon tables. It can only use explicit authenticated API endpoints.")
    footer(c, 2)


def page_three(c):
    y = page_header(c, "DATA ISOLATION & API OWNERSHIP", "SECTION 03 / SECURITY")
    y = section_title(c, 4, "Company-Wise Permanent Storage", y)
    y = text_block(c, "Every manager workspace and employee account is tied to an authenticated company identity. Code cleanup must never modify production records, attendance events, photos, subscriptions or backups.", MARGIN, y, PAGE_W - 2 * MARGIN) - 12
    cards = [
        ("MANAGER ACCOUNT", "Hashed credentials, company profile, shift settings and subscription identity.", BLUE, BLUE_BG),
        ("WORKSPACE", "Workers, staff, entrepreneurs, temporary workers, payroll, training and settings.", GREEN, GREEN_BG),
        ("EMPLOYEE ACCESS", "Invitations, login sessions, roles, profile details and account controls.", PURPLE, PURPLE_BG),
        ("ATTENDANCE", "Check-in, check-out, working time, method and permanent photo data.", RED, RED_BG),
    ]
    w = (PAGE_W - 2 * MARGIN - 12) / 2
    for i, item in enumerate(cards):
        row, col = divmod(i, 2)
        card(c, MARGIN + col * (w + 12), y - row * 112, w, 98, item[0], item[1], item[2], item[3])
    y -= 235
    y = section_title(c, 5, "API Ownership", y)
    card(c, MARGIN, y, w, 146, "Authentication and workspace API", "backend/app.py owns CAPTCHA, registration, login, password reset, administrator updates, workspace load/save, subscriptions, backups, health and CSV export.", BLUE, BLUE_BG)
    card(c, MARGIN + w + 12, y, w, 146, "Employee portal API", "backend/employee_portal/routes.py owns employee activation, login/logout, dashboard, profile updates, attendance, photos, invitation links and administrator attendance views.", PURPLE, PURPLE_BG)
    y -= 162
    y = note(c, y, "DATA SAFETY", "Never replace a failed Neon response with empty or demo data. Never edit a deployed migration. Add a new numbered migration for every schema change.", RED, RED_BG)
    y = note(c, y, "PERSISTENCE", "Render must use DATABASE_URL. Without it, a temporary filesystem database can disappear after a restart or redeployment.", YELLOW, YELLOW_BG)
    footer(c, 3)


def page_four(c):
    y = page_header(c, "REAL-WORLD OPERATIONS & GIT", "SECTION 04 / DEPLOYMENT, CORS & GIT")
    y = section_title(c, 6, "Server Failure Scenarios", y)
    w = (PAGE_W - 2 * MARGIN - 12) / 2
    card(c, MARGIN, y, w, 110, "Streamlit unavailable", "The interface cannot load. Render and Neon may remain healthy, and stored records remain unchanged.", GREEN, GREEN_BG, "FRONTEND FAILURE")
    card(c, MARGIN + w + 12, y, w, 110, "Render or Neon unavailable", "API-backed actions fail safely. The UI must display an error and must not overwrite the company workspace with empty data.", RED, RED_BG, "BACKEND FAILURE")
    y -= 128
    y = section_title(c, 7, "CORS and Environment Variables", y)
    y = text_block(c, "CORS permits the approved Streamlit origin to call Render. It is a browser security boundary, not authentication. Tokens and role checks remain mandatory.", MARGIN, y, PAGE_W - 2 * MARGIN) - 10
    envs = [
        ("DATABASE_URL", "Render", "Neon PostgreSQL connection string"),
        ("MSME_SECRET_KEY", "Render", "Signs sessions and invitations"),
        ("MSME_ALLOWED_ORIGINS", "Render", "Approved Streamlit web origin"),
        ("MSME_EMPLOYEE_API_URL", "Streamlit", "Public Render API address"),
        ("MSME_SMTP_*", "Render", "Optional email delivery settings"),
    ]
    for i, (key, host, purpose) in enumerate(envs):
        c.setFillColor(GRAY_BG if i % 2 == 0 else colors.white); c.rect(MARGIN, y - 28, PAGE_W - 2 * MARGIN, 28, fill=1, stroke=0)
        c.setFillColor(BLUE); c.setFont("Courier-Bold", 7); c.drawString(MARGIN + 8, y - 17, key)
        c.setFillColor(BLACK); c.setFont("Helvetica-Bold", 7); c.drawString(MARGIN + 168, y - 17, host)
        c.setFont("Helvetica", 7); c.drawString(MARGIN + 245, y - 17, purpose)
        y -= 28
    y -= 15
    y = section_title(c, 8, "Git Branching Model", y)
    c.setFillColor(GRAY_BG); c.setStrokeColor(BLACK); c.rect(MARGIN, y - 82, PAGE_W - 2 * MARGIN, 82, fill=1, stroke=1)
    branch_text = ["main                 Production code", "feature/login-ui     Isolated interface work", "feature/attendance   Isolated attendance work", "fix/database-sync    Verified persistence fix"]
    c.setFont("Courier", 8); c.setFillColor(BLACK)
    for i, line in enumerate(branch_text): c.drawString(MARGIN + 14, y - 18 - i * 15, line)
    y -= 98
    note(c, y, "SECURITY WARNING", "Never commit DATABASE_URL, SMTP passwords, signing secrets, employee exports or real .env files. Public JavaScript bundles are visible to every visitor.", RED, RED_BG)
    footer(c, 4)


def page_five(c):
    y = page_header(c, "ARCHITECTURE SUMMARY &\nINTERVIEW GUIDE", "SECTION 05 / CHEAT SHEET")
    y = section_title(c, 9, "System Architecture Cheat Sheet", y)
    bw = 145; gap = 18; x = MARGIN + 5
    flow_box(c, x, y, bw, 55, "FRONTEND", "Streamlit + browser JavaScript", BLUE, BLUE_BG)
    c.setFont("Helvetica-Bold", 14); c.setFillColor(BLACK); c.drawString(x + bw + 4, y - 34, ">")
    flow_box(c, x + bw + gap, y, bw, 55, "API LAYER", "Render + Flask + HTTPS", YELLOW, YELLOW_BG)
    c.drawString(x + 2 * bw + gap + 4, y - 34, ">")
    flow_box(c, x + 2 * (bw + gap), y, bw, 55, "BACKEND DATA", "Business rules + Neon", GREEN, GREEN_BG)
    y -= 76
    rows = [
        ("GitHub repository", "Stores and versions frontend, backend, tests and documentation."),
        ("Git branch", "Isolates a specific feature or fix from production main."),
        ("Deployment host", "Streamlit serves UI; Render serves the Flask API."),
        ("API endpoint", "A controlled URL where authenticated requests are processed."),
        ("HTTP / HTTPS", "Carries JSON requests and responses across the network."),
        ("Neon", "Stores permanent relational company and attendance records."),
    ]
    for i, (term, definition) in enumerate(rows):
        c.setFillColor(GRAY_BG if i % 2 == 0 else colors.white); c.rect(MARGIN, y - 32, PAGE_W - 2 * MARGIN, 32, fill=1, stroke=0)
        c.setFillColor(BLACK); c.setFont("Helvetica-Bold", 7); c.drawString(MARGIN + 8, y - 19, term)
        c.setFont("Helvetica", 7); c.drawString(MARGIN + 145, y - 19, definition)
        y -= 32
    y -= 16
    y = section_title(c, 10, "Technical Interview Questions and Answers", y)
    qa = [
        ("Q1: Where is the frontend application located?", "In frontend/app.py and frontend/static/. The root streamlit_app.py remains a compatibility entry point for Streamlit Cloud."),
        ("Q2: Where is the backend application located?", "In backend/app.py, with authentication, employee services and migrations separated inside backend/."),
        ("Q3: How do frontend and backend communicate?", "Through asynchronous HTTPS API requests that exchange JSON and authenticated access tokens."),
    ]
    for q, a in qa:
        c.setFillColor(BLACK); c.setFont("Helvetica-Bold", 8); c.drawString(MARGIN, y, q); y -= 12
        c.setFillColor(GREEN); c.setFont("Helvetica-Bold", 7); c.drawString(MARGIN, y, "Answer:")
        y = text_block(c, a, MARGIN + 42, y, PAGE_W - 2 * MARGIN - 42, size=7.2, leading=9) - 12
    footer(c, 5)


def page_six(c):
    y = page_header(c, "INTERVIEW GUIDE & RELEASE CHECK", "SECTION 06 / VERIFICATION")
    y = section_title(c, 11, "Technical Interview Questions and Answers", y)
    qa = [
        ("Q4: What happens if the backend goes down?", "The interface shell may load, but login and database-backed actions fail safely. Existing Neon records remain unchanged."),
        ("Q5: Why use Git branches during development?", "Branches isolate features, bug fixes and testing so unverified work does not break the stable main branch."),
        ("Q6: What is CORS and why is it necessary?", "CORS controls which browser origins may call Render. It prevents unapproved cross-origin calls but does not replace authentication."),
    ]
    for q, a in qa:
        c.setFillColor(BLACK); c.setFont("Helvetica-Bold", 9); c.drawString(MARGIN, y, q); y -= 14
        c.setFillColor(GREEN); c.setFont("Helvetica-Bold", 7.5); c.drawString(MARGIN, y, "Answer:")
        y = text_block(c, a, MARGIN + 46, y, PAGE_W - 2 * MARGIN - 46, size=7.8, leading=10) - 16
    y = section_title(c, 12, "Verified Project Status", y)
    checks = [
        "Frontend structure: frontend/app.py and frontend/static/",
        "Backend structure: backend/app.py and separated service packages",
        "Render entry point: gunicorn backend.app:app",
        "Backend health smoke test: HTTP 200, schema version 13",
        "Streamlit smoke test: HTTP 200",
        "Frontend regression tests: 13 passed",
        "Backend persistence and isolation tests: 14 passed",
        "Neon connection behavior: DATABASE_URL remains backend-only",
        "Production records: not modified during restructuring or verification",
    ]
    for i, check in enumerate(checks):
        c.setFillColor(GREEN_BG if i % 2 == 0 else colors.white); c.rect(MARGIN, y - 27, PAGE_W - 2 * MARGIN, 27, fill=1, stroke=0)
        c.setFillColor(GREEN); c.setFont("Helvetica-Bold", 9); c.drawString(MARGIN + 10, y - 17, "OK")
        c.setFillColor(BLACK); c.setFont("Helvetica", 7.5); c.drawString(MARGIN + 42, y - 17, check)
        y -= 27
    y -= 18
    note(c, y, "FINAL RULE", "Organize. Isolate. Authenticate. Verify. Deploy. Never let code cleanup modify production company data.", GREEN, GREEN_BG)
    footer(c, 6)


def build():
    c = canvas.Canvas(str(OUTPUT), pagesize=A4)
    c.setTitle("MSME Multi Skill Planner - Architecture and Operations Guide")
    for page in (page_one, page_two, page_three, page_four, page_five, page_six):
        page(c)
        c.showPage()
    c.save()
    print(OUTPUT)


if __name__ == "__main__":
    build()
