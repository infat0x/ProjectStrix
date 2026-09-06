# Production Dockerfile for Project Strix (Dashboard + AI Pentest Engine)
# Build Context: Project Root (..)
FROM node:20-bookworm-slim

# 1. System packages: Python 3, venv, git, curl, ca-certificates, postgresql-client
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    git \
    ca-certificates \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# 2. Install official Strix CLI pentesting agent
RUN curl -sSL https://strix.ai/install | bash || true
ENV PATH="/root/.strix/bin:/root/.local/bin:/usr/local/bin:${PATH}"

# Ensure symlink for strix executable if present
RUN if [ -f /root/.strix/bin/strix ]; then ln -sf /root/.strix/bin/strix /usr/local/bin/strix; fi

WORKDIR /app

# 3. Cache dependencies
COPY strix-dashboard/package*.json ./
RUN npm install --legacy-peer-deps

# 4. Copy Prisma schema and generate client
COPY strix-dashboard/prisma ./prisma
COPY strix-dashboard/prisma.config.ts ./prisma.config.ts
ENV DATABASE_URL="postgresql://dummy:dummy@127.0.0.1:5432/dummy"
RUN npx prisma generate

# 5. Copy application source code
COPY strix-dashboard/ ./

# 6. Build Next.js for production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# 7. Create directory for scan runs and logs
RUN mkdir -p /tmp/strix_runs && chmod 777 /tmp/strix_runs

# 8. Entrypoint script for self-healing DB migration and startup
RUN cat <<'EOF' > /app/entrypoint.sh
#!/bin/sh
set -e

echo "==> [Strix Podman Container] Checking PostgreSQL database connection..."
MAX_RETRIES=30
COUNT=0

until npx prisma db push --accept-data-loss; do
  COUNT=$((COUNT + 1))
  if [ $COUNT -ge $MAX_RETRIES ]; then
    echo "==> [ERROR] Could not connect to PostgreSQL after $MAX_RETRIES attempts. Exiting."
    exit 1
  fi
  echo "==> Database not ready yet (attempt $COUNT/$MAX_RETRIES)... retrying in 2 seconds"
  sleep 2
done

echo "==> [Strix Podman Container] Database migrations applied successfully."
echo "==> [Strix Podman Container] Starting Project Strix Dashboard on port ${PORT:-48080}..."
exec npm run start -- -p "${PORT:-48080}" -H 0.0.0.0
EOF

RUN sed -i 's/\r$//' /app/entrypoint.sh && chmod +x /app/entrypoint.sh

EXPOSE 48080
ENV PORT=48080
ENV INSECURE_HTTP=true

ENTRYPOINT ["/app/entrypoint.sh"]
