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

The public build uses only Streamlit's exposed port and needs no Flask sidecar, localhost address, or proxy. It can run without secrets in browser-local development mode; hosted Google sign-in and real email OTP require the Supabase and Google secrets below.

## Google sign-in and real email OTP

Hosted authentication uses Supabase Auth. Create a Supabase project, then add these four values in **Streamlit Community Cloud → App settings → Secrets**:

```toml
SUPABASE_URL = "https://YOUR_PROJECT.supabase.co"
SUPABASE_PUBLISHABLE_KEY = "sb_publishable_YOUR_KEY"
GOOGLE_CLIENT_ID = "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com"
PUBLIC_APP_URL = "https://YOUR_APP.streamlit.app"
```

In Supabase:

1. Open **Authentication → URL Configuration** and set the Site URL to the public Streamlit URL.
2. Open **Authentication → Email Templates → Magic Link** and make the message contain `{{ .Token }}` so Supabase sends a six-digit OTP instead of only a link.
3. Enable the Google provider and enter the Google Web Client ID and Client Secret.
4. Copy Supabase's Google callback URL into the Google Cloud OAuth client's authorized redirect URIs.

In Google Cloud, add the public Streamlit origin (for example, `https://YOUR_APP.streamlit.app`) under **Authorized JavaScript origins**. The same Google Web Client ID must be placed in Streamlit Secrets.

After saving secrets, reboot the Streamlit app. The Google button will become active and email registration/reset codes will be delivered by Supabase. Without these secrets, the app intentionally falls back to browser-local development authentication.

The shareable link is the value shown under the app name in Streamlit Community Cloud and is also the `PUBLIC_APP_URL` value above. Copy that complete `https://...streamlit.app` address to share the project.
