@echo off
setlocal
cd /d "%~dp0"

if not exist ".runtime\Scripts\python.exe" (
  echo The Python runtime is not ready. Run run-msme-hub.bat first.
  pause
  exit /b 1
)

if not defined MSME_SECRET_KEY set "MSME_SECRET_KEY=msme-local-development-secret-change-for-production"
set "MSME_ALLOWED_ORIGINS=http://localhost:8501,http://127.0.0.1:8501"
set "MSME_EMPLOYEE_DB=%CD%\data\employee_portal.db"
set "MSME_PORT=5051"

echo Employee backend: http://127.0.0.1:5051
".runtime\Scripts\python.exe" backend.py

echo.
echo The employee backend stopped or could not start.
pause
