@echo off
REM Project Strix -- 1-Click Podman Deployment (WSL2)
setlocal

cd /d "%~dp0\..\.."

where wsl >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [!] Error: WSL2 is required to run Project Strix in Podman.
    echo Please install WSL2 via: wsl --install
    pause
    exit /b 1
)

echo [*] Bridging deployment directly into WSL2 Podman...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy.ps1"
exit /b %ERRORLEVEL%
