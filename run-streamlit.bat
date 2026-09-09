@echo off
setlocal
cd /d "%~dp0"
if exist ".runtime\Scripts\python.exe" goto :runtime_ready
set "PYTHON_CMD="
where py >nul 2>nul && set "PYTHON_CMD=py"
if not defined PYTHON_CMD where python >nul 2>nul && set "PYTHON_CMD=python"
if not defined PYTHON_CMD goto :no_python
%PYTHON_CMD% -m venv .runtime
if errorlevel 1 goto :error
:runtime_ready
call ".runtime\Scripts\activate.bat"
python -m streamlit run streamlit_app.py
exit /b 0
:no_python
echo.
echo Python was not found. Install Python 3.10 or newer from python.org, then run this file again.
pause
exit /b 1
:error
echo.
echo Setup failed. Confirm Python 3.10 or newer is installed and try again.
pause
exit /b 1
