# Securing the Strix Dashboard

Strix handles highly sensitive data. By default, the Dashboard binds to port `48080` over plaintext HTTP. For production deployments, it is **critical** to secure your dashboard.

## 1. Reverse Proxy with Nginx and SSL

The most secure way to host Strix is behind an Nginx reverse proxy using Let's Encrypt for free SSL/HTTPS.

### Nginx Configuration
Install Nginx and set up a server block:
```nginx
server {
    listen 80;
    server_name strix.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name strix.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/strix.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/strix.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:48080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # REQUIRED for Real-Time Logs (SSE)
    location /api/scans/ {
        proxy_pass http://127.0.0.1:48080;
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding on;
    }
}
```

## 2. Firewall (UFW) Restrictions

Never leave port `48080` open to the public internet if you are using Nginx on port `443`.

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS for Nginx
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Deny direct access to the Next.js backend
sudo ufw deny 48080/tcp

# Enable Firewall
sudo ufw enable
```

## 3. Database Security

The `runner/host/deploy.py` script automatically configures PostgreSQL to only listen on `127.0.0.1` and enforces `scram-sha-256` password authentication via `pg_hba.conf`. Do not expose port `5432` to the internet.
