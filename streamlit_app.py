"""Streamlit hosting shell for the preserved MSME web application."""
from __future__ import annotations

import os
import socket
import threading
import time

import streamlit as st
from werkzeug.serving import make_server

from backend import app as web_app


BACKEND_HOST = "127.0.0.1"
BACKEND_PORT = int(os.environ.get("MSME_BACKEND_PORT", "5051"))


class BackendServer(threading.Thread):
    daemon = True

    def __init__(self) -> None:
        super().__init__(name="msme-backend")
        self.server = make_server(BACKEND_HOST, BACKEND_PORT, web_app, threaded=True)

    def run(self) -> None:
        self.server.serve_forever()


@st.cache_resource
def start_backend() -> BackendServer:
    server = BackendServer()
    server.start()
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        try:
            with socket.create_connection((BACKEND_HOST, BACKEND_PORT), timeout=0.2):
                return server
        except OSError:
            time.sleep(0.05)
    raise RuntimeError("The MSME application backend did not start.")


st.set_page_config(
    page_title="MSME Hub Streamlit Project",
    page_icon="M",
    layout="wide",
    initial_sidebar_state="collapsed",
)
start_backend()

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
st.iframe(
    f"http://{BACKEND_HOST}:{BACKEND_PORT}/",
    height=900,
)
