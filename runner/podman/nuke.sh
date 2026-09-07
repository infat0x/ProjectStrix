#!/usr/bin/env bash
# Project Strix — Complete Podman Purge & System Cleanup Script

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "\n${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}${BOLD}║       PROJECT STRIX -- COMPLETE PODMAN PURGE & CLEANUP           ║${NC}"
echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════════╝${NC}\n"

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}✖ This script must be run as root (use sudo).${NC}"
  echo -e "Usage: sudo bash runner/podman/nuke.sh"
  exit 1
fi

SUDO_USER_NAME="${SUDO_USER:-$USER}"
SUDO_USER_HOME=$(eval echo "~$SUDO_USER_NAME")

echo -e "${YELLOW}==> 1. Stopping & removing all Podman containers (Root & User)...${NC}"
# Stop and remove root containers
if command -v podman >/dev/null 2>&1; then
  podman stop -a 2>/dev/null || true
  podman rm -a -f 2>/dev/null || true
  podman pod rm -a -f 2>/dev/null || true
  podman volume prune -f 2>/dev/null || true
  podman system prune -a -f --volumes 2>/dev/null || true
fi

# Stop and remove non-root user containers if any
if [ -n "$SUDO_USER_NAME" ] && [ "$SUDO_USER_NAME" != "root" ]; then
  sudo -u "$SUDO_USER_NAME" podman stop -a 2>/dev/null || true
  sudo -u "$SUDO_USER_NAME" podman rm -a -f 2>/dev/null || true
  sudo -u "$SUDO_USER_NAME" podman pod rm -a -f 2>/dev/null || true
  sudo -u "$SUDO_USER_NAME" podman volume prune -f 2>/dev/null || true
  sudo -u "$SUDO_USER_NAME" podman system prune -a -f --volumes 2>/dev/null || true
fi
echo -e "${GREEN}✔ All containers, pods, images, and volumes removed.${NC}"

echo -e "\n${YELLOW}==> 2. Disabling and stopping Podman systemd services...${NC}"
systemctl stop podman podman.socket 2>/dev/null || true
systemctl disable podman podman.socket 2>/dev/null || true
echo -e "${GREEN}✔ Podman services stopped and disabled.${NC}"

echo -e "\n${YELLOW}==> 3. Purging Podman packages via apt...${NC}"
export DEBIAN_FRONTEND=noninteractive
apt-get purge -y podman podman-docker podman-compose containernetworking-plugins slirp4netns 2>/dev/null || true
apt-get autoremove -y 2>/dev/null || true
echo -e "${GREEN}✔ Podman packages purged.${NC}"

echo -e "\n${YELLOW}==> 4. Removing storage registries, caches, and configuration files...${NC}"
rm -rf /var/lib/containers /etc/containers /run/podman /run/user/*/podman
rm -rf "$SUDO_USER_HOME/.local/share/containers" "$SUDO_USER_HOME/.config/containers"
rm -rf /root/.local/share/containers /root/.config/containers
echo -e "${GREEN}✔ Storage directories and registries cleaned.${NC}"

echo -e "\n${GREEN}${BOLD}🎉 SUCCESS: Podman and all associated containers/volumes have been completely purged from WSL!${NC}\n"
