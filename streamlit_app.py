"""Public-host-compatible Streamlit shell for the preserved MSME frontend."""
from __future__ import annotations

import re
import json
import os
import socket
import threading
from pathlib import Path

import streamlit as st

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"


@st.cache_resource
def start_local_employee_api() -> str:
    """Start the employee API inside the Streamlit process for one-command local use."""
    configured = str(os.environ.get("MSME_EMPLOYEE_API_URL", "")).rstrip("/")
    if configured:
        return configured

    host = "127.0.0.1"
    port = int(os.environ.get("MSME_PORT", "5051"))
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
        if probe.connect_ex((host, port)) == 0:
            return f"http://{host}:{port}"

    from werkzeug.serving import make_server
    from backend import app as employee_api

    server = make_server(host, port, employee_api, threaded=True)
    thread = threading.Thread(target=server.serve_forever, name="msme-employee-api", daemon=True)
    thread.start()
    return f"http://{host}:{port}"


def bundled_application() -> str:
    """Inline every asset so public visitors never depend on localhost."""
    html = (STATIC_DIR / "index.html").read_text(encoding="utf-8")
    try:
        configured_api_url = str(st.secrets.get("MSME_EMPLOYEE_API_URL", ""))
    except Exception:
        configured_api_url = ""

    configured_api_url = configured_api_url or os.environ.get(
        "MSME_EMPLOYEE_API_URL",
        "",
    )

    # The preserved application runs inside a Streamlit srcdoc iframe. Query
    # parameters live on the outer Streamlit page, so pass employee invitation
    # values into the embedded application explicitly.
    invite_token = str(st.query_params.get("employee_invite", ""))
    invite_email = str(st.query_params.get("employee_email", ""))

    try:
        request_host = str(st.context.headers.get("Host", "")).lower()
    except Exception:
        request_host = ""

    is_streamlit_public_host = request_host.endswith(".streamlit.app")
    application_url = (
        f"{'https' if is_streamlit_public_host else 'http'}://{request_host}/"
        if request_host
        else ""
    )
    api_url = configured_api_url or (
        "" if is_streamlit_public_host else LOCAL_EMPLOYEE_API_URL
    )

    html = html.replace(
        "<head>",
        (
            "<head><script>"
            f"window.MSME_EMPLOYEE_API_URL={json.dumps(api_url.rstrip('/'))};"
            f"window.MSME_APPLICATION_URL={json.dumps(application_url)};"
            f"window.MSME_EMPLOYEE_INVITE={json.dumps(invite_token)};"
            f"window.MSME_EMPLOYEE_EMAIL={json.dumps(invite_email)};"
            "if(window.MSME_EMPLOYEE_API_URL){fetch(window.MSME_EMPLOYEE_API_URL+'/api/health',{cache:'no-store'}).catch(()=>{});}"
            "</script>"
        ),
        1,
    )

    def inline_css(match: re.Match[str]) -> str:
        name = match.group(1)
        return f"<style data-source='{name}'>\n{(STATIC_DIR / name).read_text(encoding='utf-8')}\n</style>"

    def inline_js(match: re.Match[str]) -> str:
        name = match.group(1)
        source = (STATIC_DIR / name).read_text(encoding="utf-8").replace("</script>", "<\\/script>")
        return f"<script data-source='{name}'>\n{source}\n</script>"

    html = re.sub(r'<link rel="stylesheet" href="([^"]+)"\s*/?>', inline_css, html)
    # Inline only the local script tags that came from index.html. External
    # scripts are injected afterwards so their URLs are never opened as files.
    html = re.sub(r'<script src="([^"]+)"></script>', inline_js, html)
    adapter = (STATIC_DIR / "public-adapter.js").read_text(encoding="utf-8").replace("</script>", "<\\/script>")
    first_script = html.find("<script data-source=")
    html = html[:first_script] + f"<script data-source='public-adapter.js'>\n{adapter}\n</script>\n" + html[first_script:]
    return html


st.set_page_config(
    page_title="MSME Hub Streamlit Project",
    page_icon="M",
    layout="wide",
    initial_sidebar_state="collapsed",
)
LOCAL_EMPLOYEE_API_URL = start_local_employee_api()
st.markdown(
    """
    <style>
      #MainMenu, header, footer, [data-testid="stSidebar"] {display:none !important}
      html, body, .stApp, [data-testid="stAppViewContainer"], [data-testid="stMain"], .main {
        width:100% !important;
        height:100vh !important;
        min-height:0 !important;
        overflow:hidden !important;
        background:#020b20 !important;
        padding:0 !important;
        margin:0 !important;
      }
      .block-container {
        width:100% !important;
        height:100vh !important;
        min-height:0 !important;
        overflow:hidden !important;
        padding:0 !important;
        margin:0 !important;
        max-width:none !important;
      }
      [data-testid="stElementContainer"] {
        width:100% !important;
        min-height:0 !important;
        padding:0 !important;
        margin:0 !important;
      }
      [data-testid="stIFrame"] {
        width:100% !important;
        height:100vh !important;
        min-height:100vh !important;
        overflow:hidden !important;
        padding:0 !important;
        margin:0 !important;
      }
      iframe {display:block;border:0;width:100% !important;height:100vh !important;overflow:hidden !important;}
    </style>
    """,
    unsafe_allow_html=True,
)
st.iframe(bundled_application(), height=720)
