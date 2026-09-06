# Project Strix -- 1-Click Podman Deployment for Windows / WSL2
$ErrorActionPreference = "Stop"
$env:PYTHONUNBUFFERED = "1"

$ScriptDir = $PSScriptRoot
if (-not $ScriptDir) {
    $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}
$RootDir = (Resolve-Path "$ScriptDir\..\..").Path
Set-Location $RootDir

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "       PROJECT STRIX -- PODMAN DEPLOYMENT (WINDOWS / WSL2)        " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

$DeployScript = Join-Path $ScriptDir "deploy.py"

# 1. Check if Python is available on Windows
$PythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $PythonCmd) {
    $PythonCmd = Get-Command python3 -ErrorAction SilentlyContinue
}
if (-not $PythonCmd) {
    $PythonCmd = Get-Command py -ErrorAction SilentlyContinue
}

if ($PythonCmd) {
    & $PythonCmd.Source $DeployScript @args
    exit $LASTEXITCODE
}

# 2. If Python is not on Windows, bridge directly to WSL2
$WslCmd = Get-Command wsl -ErrorAction SilentlyContinue
if ($WslCmd) {
    Write-Host "[+] Python not found on Windows host. Bridging directly to WSL2..." -ForegroundColor Green
    $NormalizedPath = $RootDir.Replace("\", "/")
    $WslPath = (wsl wslpath -a "$NormalizedPath").Trim()
    
    # Run deploy.py inside WSL
    wsl bash -c "cd '$WslPath'; python3 runner/podman/deploy.py"
    exit $LASTEXITCODE
}

Write-Error "Neither Python nor WSL2 was found on this system. Please install Python or WSL2 to proceed."
exit 1

