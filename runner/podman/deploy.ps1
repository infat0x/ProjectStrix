# Project Strix -- 1-Click Podman Deployment (WSL2)
$ErrorActionPreference = "Stop"

$ScriptDir = $PSScriptRoot
if (-not $ScriptDir) {
    $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}
$RootDir = (Resolve-Path "$ScriptDir\..\..").Path

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "            PROJECT STRIX -- PODMAN DEPLOYMENT (WSL2)             " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

# 1. Check WSL2
if (-not (Get-Command wsl -ErrorAction SilentlyContinue)) {
    Write-Error "WSL2 is required to run Project Strix in Podman.`nPlease install WSL2 using: wsl --install"
    exit 1
}

# 2. Convert Windows root path to clean WSL path
$Normalized = $RootDir.Replace("\", "/")
$DriveLetter = $Normalized.Substring(0, 1).ToLower()
$WslPath = "/mnt/$DriveLetter" + $Normalized.Substring(2)

Write-Host "[+] Forwarding deployment directly into WSL2 Podman..." -ForegroundColor Green
Write-Host "[+] Project Root (WSL2): $WslPath" -ForegroundColor DarkGray
Write-Host ""

# 3. Execute inside WSL2 with live streaming output
wsl bash -c "cd '$WslPath' && python3 runner/podman/deploy.py"
exit $LASTEXITCODE

