# Ubuntu / Debian Deployment

Deploying Project Strix on a fresh Ubuntu or Debian server is exceptionally straightforward. We have engineered a robust, **self-healing auto-deployer** (`runner/host/deploy.py`) that manages the entire lifecycle of the installation.

## Step 1: Clone the Repository

SSH into your server and clone the project:

```bash
git clone https://github.com/infat0x/ProjectStrix.git
cd ProjectStrix
```

## Step 2: Run the Auto-Deployer

Execute the deployment script with root privileges (required for installing system packages and databases):

```bash
sudo python3 runner/host/deploy.py
```

### What happens under the hood?

Unlike typical installation scripts that blindly run commands, `runner/host/deploy.py` is an intelligent orchestrator:

1. **System Dependencies & Self-Healing:**
   - It checks for missing packages (Node.js, PM2, Python libs).
   - If it detects a broken `dpkg` state (e.g., from a previously interrupted installation), it automatically runs `dpkg --configure -a` to fix the system before proceeding.
   
2. **PostgreSQL Configuration:**
   - The script installs PostgreSQL.
   - **Crucial Fix:** On many minimal cloud environments (like Hetzner or DigitalOcean), PostgreSQL installations silently fail due to missing OS `locales`. If the script detects that Postgres is broken, it will automatically install `locales`, generate `en_US.UTF-8`, purge the broken Postgres install, and reinstall it from scratch.
   - It then forces PostgreSQL to listen on `127.0.0.1` and updates `pg_hba.conf` to allow Prisma ORM connections.

3. **Dashboard Compilation:**
   - Automatically injects the correct `DATABASE_URL` into your `.env` file.
   - Installs NPM dependencies and runs Prisma migrations (`db push`).
   - Compiles the Next.js production build (`npm run build`).

4. **Service Launch:**
   - Uses PM2 to daemonize the application, ensuring it runs 24/7 on port `48080`.

## Step 3: Access the Dashboard

Once the script completes with the `🎉 ALL DONE!` message, you can access your platform at:

```
http://<your-server-ip>:48080
```

## Post-Installation Commands

To manage your Strix instance in the future, save these PM2 commands:

- **View Live Logs:** `sudo pm2 logs strix-dashboard`
- **Check Status:** `sudo pm2 status`
- **Restart Application:** `sudo pm2 restart strix-dashboard`
- **Stop Application:** `sudo pm2 stop strix-dashboard`
