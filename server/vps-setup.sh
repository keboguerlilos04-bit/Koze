#!/usr/bin/env bash
# Koze: installs the Koze server (Chatwoot + Koze files) on a fresh Ubuntu 24.04 VPS.
#
# Copy this folder to the server, then run it in the background so a dropped SSH connection
# does not stop it (see README.md, "Hosting on a VPS"):
#   sudo bash vps-setup.sh [domain]
# Without a domain it uses <public-ip>.sslip.io, a free name that points at the server's IP,
# so HTTPS works before buying a domain. Safe to run again: it keeps the existing .env and data.
set -euo pipefail

SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR=/opt/koze
DOMAIN="${1:-}"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo bash $0 $*" >&2
  exit 1
fi

# ---- Domain ----
if [ -z "$DOMAIN" ]; then
  TOKEN=$(curl -fsS -m 5 -X PUT http://169.254.169.254/latest/api/token \
    -H 'X-aws-ec2-metadata-token-ttl-seconds: 60' || true)
  PUBLIC_IP=$(curl -fsS -m 5 -H "X-aws-ec2-metadata-token: $TOKEN" \
    http://169.254.169.254/latest/meta-data/public-ipv4 || true)
  [ -n "$PUBLIC_IP" ] || PUBLIC_IP=$(curl -fsS -m 10 https://checkip.amazonaws.com | tr -d '[:space:]')
  DOMAIN="${PUBLIC_IP//./-}.sslip.io"
fi
log "Domain: $DOMAIN"

# ---- Swap (Chatwoot asks for at least 1 GB) ----
if ! swapon --show | grep -q /swapfile; then
  log "Creating a 2 GB swap file"
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# ---- Docker ----
if ! command -v docker >/dev/null || ! docker compose version >/dev/null 2>&1; then
  log "Installing Docker"
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -q
  apt-get install -y -q docker.io docker-compose-v2 openssl
  systemctl enable --now docker
fi
usermod -aG docker ubuntu 2>/dev/null || true

# ---- Koze files ----
log "Copying the Koze files to $APP_DIR"
mkdir -p "$APP_DIR"
for f in docker-compose.yaml docker-compose.vps.yaml Caddyfile koze_*.rb; do
  cp "$SRC_DIR"/$f "$APP_DIR"/
done
# Files copied from Windows may carry CRLF line endings.
sed -i 's/\r$//' "$APP_DIR"/*.yaml "$APP_DIR"/Caddyfile "$APP_DIR"/*.rb

# ---- .env (created once, with fresh random passwords) ----
ENV_FILE="$APP_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
  log "Creating $ENV_FILE with new passwords"
  PG_PASS=$(openssl rand -hex 24)
  REDIS_PASS=$(openssl rand -hex 24)
  cat > "$ENV_FILE" <<EOF
# Koze server settings, created by vps-setup.sh. Keep a copy somewhere safe; never commit it.
COMPOSE_FILE=docker-compose.yaml:docker-compose.vps.yaml
KOZE_DOMAIN=$DOMAIN

SECRET_KEY_BASE=$(openssl rand -hex 64)
FRONTEND_URL=https://$DOMAIN
RAILS_ENV=production
NODE_ENV=production
INSTALLATION_ENV=docker
RAILS_LOG_TO_STDOUT=true
LOG_LEVEL=info
DEFAULT_LOCALE=fr
FORCE_SSL=false
ENABLE_ACCOUNT_SIGNUP=api_only
ACTIVE_STORAGE_SERVICE=local

POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USERNAME=koze
POSTGRES_PASSWORD=$PG_PASS
POSTGRES_DATABASE=chatwoot_production
DATABASE_URL=postgres://koze:$PG_PASS@postgres:5432/chatwoot_production

REDIS_PASSWORD=$REDIS_PASS
REDIS_URL=redis://:$REDIS_PASS@redis:6379

# Fill in to send emails (password resets, invitations); see README.md.
MAILER_SENDER_EMAIL=
SMTP_DOMAIN=
SMTP_ADDRESS=
SMTP_PORT=
SMTP_USERNAME=
SMTP_PASSWORD=
EOF
  chmod 600 "$ENV_FILE"
else
  log "Keeping the existing $ENV_FILE"
fi

cd "$APP_DIR"

# ---- Start ----
log "Downloading the images (a few minutes)"
docker compose pull -q

log "Starting PostgreSQL and Redis"
docker compose up -d postgres redis
sleep 10

log "Preparing the database"
docker compose run --rm rails bundle exec rails db:chatwoot_prepare

log "Allowing signup from the app"
docker compose run --rm rails bundle exec rails runner \
  'c = InstallationConfig.find_or_initialize_by(name: "ENABLE_ACCOUNT_SIGNUP"); c.value = "api_only"; c.save!; GlobalConfig.clear_cache'

log "Starting Koze"
docker compose up -d

log "Waiting for HTTPS on https://$DOMAIN"
for _ in $(seq 1 30); do
  if curl -fsS -m 10 -o /dev/null "https://$DOMAIN/api"; then
    log "KOZE IS READY: https://$DOMAIN"
    echo "https://$DOMAIN" > /root/koze-ready
    exit 0
  fi
  sleep 10
done
log "Koze started, but https://$DOMAIN does not answer yet. Check: docker compose -f $APP_DIR/docker-compose.yaml logs caddy rails"
exit 1
