# MSME Hub Streamlit Project

This is a public-host-compatible Streamlit edition of the authoritative MSME project. The original HTML, CSS, JavaScript, navigation, forms, and calendar are bundled directly into the Streamlit page. It does not depend on a localhost iframe or a second server port.

## Run from the Desktop

1. Install Python 3.10 or newer if it is not already available as `py` or `python`.
2. Double-click `run-streamlit.bat`.
3. Wait while the private `.runtime` environment is created and dependencies are installed on the first run.
4. Your browser opens at `http://localhost:8501`.
5. Create an administrator account in the application, then sign in with that account.

There is no default administrator login; every administrator must create an account first. In this public-ready edition, accounts and workspace data are stored privately in each visitor's browser. They persist when that visitor returns in the same browser, but they are not shared between devices.

## Manual command

```powershell
python -m venv .runtime
.\.runtime\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m streamlit run streamlit_app.py
```

## Public deployment on Streamlit Community Cloud

1. Upload this project to a GitHub repository.
2. Open `share.streamlit.io` and select **Create app**.
3. Choose the repository and branch.
4. Set the main file path to `streamlit_app.py`.
5. Deploy and share the generated public HTTPS link.

The public build uses only Streamlit's exposed port. No Flask sidecar, localhost address, proxy, environment variable, or secret is required. The displayed verification code is intentionally a browser-local development code; connect an external email service and shared database before using the application for production-sensitive or cross-device records.
