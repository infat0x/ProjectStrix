@echo off
REM Project Strix — 1-Click Podman Deployment (Windows Batch)
setlocal

cd /d "%~dp0\.."

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    python runner\deploy_podman.py
    exit /b %ERRORLEVEL%
)

where python3 >nul 2>nul
if %ERRORLEVEL% equ 0 (
    python3 runner\deploy_podman.py
    exit /b %ERRORLEVEL%
)

where wsl >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [*] Python not detected on Windows PATH. Forwarding to WSL2...
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy_podman.ps1"
    exit /b %ERRORLEVEL%
)

echo [!] Error: Python or WSL2 is required to deploy Strix on Windows.
pause
exit /b 1
