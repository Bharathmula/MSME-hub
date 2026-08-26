"""Public-host-compatible Streamlit shell for the preserved MSME frontend."""
from __future__ import annotations

import re
import json
from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"


def bundled_application(public_config: dict[str, str]) -> str:
    """Inline every asset so public visitors never depend on localhost."""
    html = (STATIC_DIR / "index.html").read_text(encoding="utf-8")

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
    config_script = f"<script>window.MSME_CONFIG={json.dumps(public_config)};</script>\n"
    supabase_script = '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>\n'
    first_script = html.find("<script data-source=")
    html = html[:first_script] + config_script + supabase_script + f"<script data-source='public-adapter.js'>\n{adapter}\n</script>\n" + html[first_script:]
    return html


st.set_page_config(
    page_title="MSME Hub Streamlit Project",
    page_icon="M",
    layout="wide",
    initial_sidebar_state="collapsed",
)
st.markdown(
    """
    <style>
      #MainMenu, header, footer, [data-testid="stSidebar"] {display:none !important}
      .stApp, [data-testid="stAppViewContainer"], .main {background:#fff;padding:0 !important}
      .block-container, [data-testid="stElementContainer"] {padding:0 !important;margin:0 !important;max-width:none !important}
      iframe {display:block;border:0;width:100%;}
    </style>
    """,
    unsafe_allow_html=True,
)
def secret(name: str) -> str:
    try:
        return str(st.secrets.get(name, ""))
    except Exception:
        return ""


components.html(bundled_application({
    "supabase_url": secret("SUPABASE_URL"),
    "supabase_publishable_key": secret("SUPABASE_PUBLISHABLE_KEY"),
    "google_client_id": secret("GOOGLE_CLIENT_ID"),
    "public_app_url": secret("PUBLIC_APP_URL"),
}), height=900, scrolling=True)
