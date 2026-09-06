# Configuration

If you used the `runner/host/deploy.py` script, initial configuration is completely handled for you. However, you may need to tweak environment variables for advanced setups (like changing the server port or externalizing the database).

## The `.env` File

All critical backend configuration is stored in the `strix-dashboard/.env` file. 

### Database Connection
```env
# Example Prisma connection string
DATABASE_URL="postgresql://strix_user:strix_password_123@127.0.0.1:5432/strix?schema=public"
```
If you are moving the PostgreSQL database to a separate server (e.g., AWS RDS), update the host (`127.0.0.1`), port (`5432`), user, and password here. After changing the URL, you must restart the application and run Prisma migrations:
```bash
cd strix-dashboard
npx prisma db push
sudo pm2 restart strix-dashboard
```

### Security Secrets
```env
# Used to sign stateless session cookies
JWT_SECRET="your-super-secure-secret-key-change-in-production"
```
In a true production environment, you should replace the `JWT_SECRET` with a cryptographically secure random string (e.g., generated via `openssl rand -hex 32`). If you change this value, all currently logged-in users will be immediately logged out.

## Changing the UI Port

By default, the `runner/host/deploy.py` script launches the Strix Next.js Dashboard on port `48080` via PM2. 

If you want to change this (for example, to standard HTTP port 80), you can modify the PM2 start command:

1. Stop the current process:
   ```bash
   sudo pm2 delete strix-dashboard
   ```
2. Start it on the new port (e.g., 80):
   ```bash
   cd ~/ProjectStrix/strix-dashboard
   sudo pm2 start "npm run dev -- -H 0.0.0.0 -p 80" --name "strix-dashboard"
   sudo pm2 save
   ```

*Note: Ports below 1024 require `sudo` privileges to bind.*
