@echo off
setlocal
cd /d "%~dp0"

if not exist ".runtime\Scripts\python.exe" (
  where py >nul 2>nul || goto :no_python
  py -m venv .runtime || goto :error
)

".runtime\Scripts\python.exe" -m pip install -r requirements.txt || goto :error
echo Starting MSME Hub at http://localhost:8501
echo The employee service starts automatically. Keep this one window open.
start "" "http://localhost:8501"
call "%~dp0run-streamlit.bat"
exit /b %errorlevel%

:no_python
echo Python was not found. Install Python 3.10 or newer.
pause
exit /b 1

:error
echo Project setup failed. Review the error above.
pause
exit /b 1
