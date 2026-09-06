# Containerized Deployment (Podman & Docker)

Project Strix provides first-class support for isolated, rootless container deployment using **Podman** and **Podman Compose** (as well as Docker Compose).

This encapsulates the Next.js frontend/backend, the embedded background scheduler, the Python Strix AI core, and the PostgreSQL database into secure, containerized environments.

---

## ⚡ 1-Click Automated Deployment (Recommended)

We provide an idempotent, self-healing Python orchestrator script that:
1. Verifies/installs Podman and Compose tools.
2. Automatically generates cryptographically secure passwords and JWT secrets in `.env.podman`.
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
   cp .env.podman.example .env.podman
   ```
   Edit `.env.podman` with your own secure random secrets for `POSTGRES_PASSWORD`, `SESSION_SECRET`, and `SCHEDULER_SECRET`.

3. **Start the containers**:
   Using Podman Compose:
   ```bash
   podman-compose -f podman-compose.yml --env-file .env.podman up -d --build
   ```
   Or using Docker Compose:
   ```bash
   docker compose -f podman-compose.yml --env-file .env.podman up -d --build
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
| **View Live Dashboard Logs** | `podman logs -f strix-dashboard` |
| **View Database Logs** | `podman logs -f strix-postgres` |
| **List Running Containers** | `podman ps` |
| **Restart Stack** | `podman-compose -f podman-compose.yml restart` |
| **Stop Stack** | `podman-compose -f podman-compose.yml down` |
| **View Persistent Volume Data** | `podman volume ls` |
