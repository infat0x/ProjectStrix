# Containerized Deployment (Podman & Docker)

Project Strix provides first-class support for isolated, rootless container deployment using **Podman** and **Podman Compose** (as well as Docker Compose).

This encapsulates the Next.js frontend/backend, the embedded background scheduler, the Python Strix AI core, and the PostgreSQL database into secure, containerized environments.

---

## ⚡ 1-Click Automated Deployment (Recommended)

We provide an idempotent, self-healing Python orchestrator script that mirrors the native host deployer:
1. Verifies and auto-installs Podman and Compose tools.
2. **Zero-Touch Environment Resolution**: Automatically generates cryptographically secure database passwords, `SESSION_SECRET`, and `SCHEDULER_SECRET` into `podman/.env` (reusing existing secrets if present). No manual `.env` editing is required.
3. Builds the production multi-stage image (including Node.js 20, Python 3, and the Strix CLI).
4. Synchronizes database schemas and starts the stack on port `48080`.

### Run on Linux / VPS:
```bash
python3 runner/podman/deploy.py
# or: bash runner/podman/deploy.sh
# or: npm run deploy:podman
```

### Run on Windows (PowerShell / Command Prompt / WSL2):
The script automatically detects Windows and seamlessly bridges to WSL2 (or native Podman Desktop):
```powershell
# In PowerShell:
.\runner\podman\deploy.ps1

# Or in Command Prompt:
runner\podman\deploy.bat

# Or directly in WSL2 (Ubuntu):
python3 runner/podman/deploy.py
```
> [!NOTE]
> When running inside WSL2, Podman container ports are automatically mapped to your Windows host, meaning you can immediately open `http://localhost:48080` in your Windows browser!

---

## 🛠 Manual Deployment (Podman Compose / Docker Compose)

If you prefer to manage the compose lifecycle manually:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/infat0x/ProjectStrix.git
   cd ProjectStrix
   ```

2. **Configure environment variables**:
   Copy the example environment configuration:
   ```bash
   cd podman
   cp .env.podman.example .env.podman
   ```
   Edit `.env.podman` with your own secure random secrets for `POSTGRES_PASSWORD`, `SESSION_SECRET`, and `SCHEDULER_SECRET`.

3. **Start the containers**:
   Using Podman Compose (from inside `podman/`):
   ```bash
   podman-compose up -d --build
   ```
   Or using Docker Compose:
   ```bash
   docker compose up -d --build
   ```

4. **Access the Dashboard**:
   The dashboard will be live at:
   ```
   http://<your-server-ip>:48080
   ```

---

## 📋 Useful Management Commands

| Action | Podman Command |
| :--- | :--- |
| **Wake Up Stopped Stack (After Reboot)** | `sudo podman start strix-postgres strix-dashboard` |
| **List All Containers (Including Exited)** | `sudo podman ps -a` |
| **List Actively Running Containers** | `sudo podman ps` |
| **View Live Dashboard Logs** | `sudo podman logs -f strix-dashboard` |
| **View Database Logs** | `sudo podman logs -f strix-postgres` |
| **Restart Running Stack** | `sudo podman-compose restart` |
| **Stop Stack (Preserving Database)** | `sudo podman-compose down` |
| **Rebuild & Start (Preserving Database)** | `sudo podman-compose up -d --build` |
| **Inspect Persistent Volumes** | `sudo podman volume ls` |

> [!WARNING]
> Never run `podman-compose down -v` unless you intend to completely delete the PostgreSQL database volume (`strix-db-data`).

