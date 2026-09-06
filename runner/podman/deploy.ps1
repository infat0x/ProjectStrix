# Project Strix — 1-Click Podman Deployment for Windows / WSL2
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent (Split-Path -Parent $ScriptDir)
Set-Location $RootDir

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "       PROJECT STRIX — PODMAN DEPLOYMENT (WINDOWS / WSL2)        " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

# 1. Check if Python is available on Windows
$PythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $PythonCmd) {
    $PythonCmd = Get-Command python3 -ErrorAction SilentlyContinue
}

if ($PythonCmd) {
    & $PythonCmd.Source "runner/podman/deploy.py"
    exit $LASTEXITCODE
}

# 2. If Python is not on Windows, bridge directly to WSL
$WslCmd = Get-Command wsl -ErrorAction SilentlyContinue
if ($WslCmd) {
    Write-Host "[+] Python not found on Windows host. Bridging directly to WSL2..." -ForegroundColor Green
    $NormalizedPath = $RootDir.Replace("\", "/")
    $WslPath = (wsl wslpath -a "$NormalizedPath").Trim()
    
    # Ensure dependencies in WSL
    wsl -u root bash -c "command -v podman >/dev/null 2>&1 || (apt-get update && apt-get install -y podman podman-compose python3)"
    
    # Run deploy.py inside WSL
    wsl bash -c "cd '$WslPath' && python3 runner/podman/deploy.py"
    exit $LASTEXITCODE
}

Write-Error "Neither Python nor WSL2 was found on this system. Please install Python or WSL2 to proceed."
exit 1
