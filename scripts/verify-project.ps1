$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot

try {
    Write-Host "Checking JavaScript syntax..." -ForegroundColor Cyan
    node --check frontend/static/owned-authentication-login.js
    if ($LASTEXITCODE -ne 0) { throw "JavaScript syntax check failed." }

    Write-Host "Running static regression tests..." -ForegroundColor Cyan
    python -m unittest tests.test_static_regressions -v
    if ($LASTEXITCODE -ne 0) { throw "Static regression tests failed." }

    Write-Host "Running employee portal tests..." -ForegroundColor Cyan
    python -m unittest tests.test_employee_portal -v
    if ($LASTEXITCODE -ne 0) { throw "Employee portal tests failed." }

    Write-Host "Checking Git whitespace..." -ForegroundColor Cyan
    git diff --check
    if ($LASTEXITCODE -ne 0) { throw "Git whitespace check failed." }

    Write-Host "Verification completed successfully." -ForegroundColor Green
} finally {
    Pop-Location
}

