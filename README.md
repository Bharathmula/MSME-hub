# MSME Hub Streamlit Project

This is a separate Streamlit-hosted edition of the authoritative MSME project. The original HTML, CSS, JavaScript, navigation, forms, calendar, and Flask JSON backend are preserved. Streamlit starts the backend as an internal companion service and displays the unchanged application in a full-width frame.

## Run from the Desktop

1. Install Python 3.10 or newer if it is not already available as `py` or `python`.
2. Double-click `run-streamlit.bat`.
3. Wait while the private `.runtime` environment is created and dependencies are installed on the first run.
4. Your browser opens at `http://localhost:8501`.
5. Create an administrator account in the application, then sign in with that account.

Data is stored in this project's `data` folder and browser local storage. There is no default administrator login; every administrator must create an account first.

## Manual command

```powershell
python -m venv .runtime
.\.runtime\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m streamlit run streamlit_app.py
```

## Later public deployment

The repository already has `requirements.txt`, `streamlit_app.py`, and `.streamlit/config.toml`. Before internet deployment, set a strong `MSME_SECRET_KEY`, configure the SMTP variables from `.env.example`, and place the Flask companion service behind the same public HTTPS origin (or move its API routes to a managed HTTPS API). Set `MSME_BACKEND_PORT` only for local port conflicts. Do not publish development OTPs or the default password.

Because Streamlit Community Cloud exposes one public service port, the companion backend needs a same-origin reverse proxy or separate HTTPS deployment before public use. Local Desktop operation needs no proxy.
