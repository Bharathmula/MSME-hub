"""Public-host-compatible Streamlit shell for the preserved MSME frontend."""
from __future__ import annotations

import re
from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"


def bundled_application() -> str:
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
    adapter = (STATIC_DIR / "public-adapter.js").read_text(encoding="utf-8").replace("</script>", "<\\/script>")
    first_script = html.find("<script src=")
    html = html[:first_script] + f"<script data-source='public-adapter.js'>\n{adapter}\n</script>\n" + html[first_script:]
    return re.sub(r'<script src="([^"]+)"></script>', inline_js, html)


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
components.html(bundled_application(), height=900, scrolling=True)
