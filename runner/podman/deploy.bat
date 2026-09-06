@echo off
REM Project Strix -- 1-Click Podman Deployment (Windows Batch)
setlocal
set PYTHONUNBUFFERED=1

cd /d "%~dp0\..\.."

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    python runner\podman\deploy.py
    exit /b %ERRORLEVEL%
)

where python3 >nul 2>nul
if %ERRORLEVEL% equ 0 (
    python3 runner\podman\deploy.py
    exit /b %ERRORLEVEL%
)

where wsl >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [*] Python not detected on Windows PATH. Forwarding to WSL2...
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy.ps1"
    exit /b %ERRORLEVEL%
)

echo [!] Error: Python or WSL2 is required to deploy Strix on Windows.
pause
exit /b 1
