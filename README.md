# MSME Hub Streamlit Project

This is a public-host-compatible Streamlit edition of the authoritative MSME project. The original HTML, CSS, JavaScript, navigation, forms, and calendar are bundled directly into the Streamlit page. It does not depend on a localhost iframe or a second server port.

## Run from the Desktop

1. Install Python 3.10 or newer if it is not already available as `py` or `python`.
2. Double-click `run-streamlit.bat`.
3. Wait while the private `.runtime` environment is created and dependencies are installed on the first run.
4. Your browser opens at `http://localhost:8501`.
5. Create an administrator account by completing the CAPTCHA, then sign in.

Accounts and workspace data are stored privately in each visitor's browser. They persist when that visitor returns in the same browser, but they are not shared between devices. CAPTCHA prevents accidental or simple automated submissions, but it does not verify ownership of the entered email address.

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

The public build uses only Streamlit's exposed port and needs no Flask sidecar, localhost address, proxy, Supabase project, Google OAuth configuration, or Streamlit secrets. Account creation, password reset, and administrator email changes use CAPTCHA and browser-local storage.

The shareable link is shown under the app name in Streamlit Community Cloud. Copy that complete `https://...streamlit.app` address to share the project.
