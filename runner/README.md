# Project Strix — Runner Orchestration Directory

This directory contains automated installation, deployment, and management tools for Project Strix, organized cleanly by deployment target.

---

## 📁 Directory Structure

```
runner/
├── host/                      # Bare-metal / Native Linux Host Deployment
│   ├── deploy.py              # Idempotent Linux native installer & PM2 runner
│   ├── nuke.py                # Complete uninstaller & host environment wipe
│   └── backup.sh              # Compressed PostgreSQL database backup script
│
└── podman/                    # Containerized Deployment (Podman & Docker)
    ├── deploy.py              # Cross-platform 1-click deployer (Linux, Windows, WSL2)
    ├── deploy.sh              # Bash shortcut
    ├── deploy.ps1             # Windows PowerShell launcher
    └── deploy.bat             # Windows Command Prompt / Double-click launcher
```

---

## 🚀 Quick Usage

### 1. Podman / Container Deployment (Recommended)
- **Linux / VPS**:
  ```bash
  python3 runner/podman/deploy.py
  # or: bash runner/podman/deploy.sh
  ```
- **Windows (PowerShell)**:
  ```powershell
  .\runner\podman\deploy.ps1
  ```
- **Windows (Command Prompt / Double-Click)**:
  ```cmd
  runner\podman\deploy.bat
  ```

### 2. Native Linux Host Deployment (Ubuntu/Debian Bare-metal)
- **Deploy**:
  ```bash
  sudo python3 runner/host/deploy.py
  ```
- **Backup Database**:
  ```bash
  bash runner/host/backup.sh
  ```
- **Clean / Uninstall**:
  ```bash
  sudo python3 runner/host/nuke.py
  ```
