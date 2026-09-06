#!/bin/bash
# Project Strix — Podman 1-Click Deployment Shortcut (Bash)
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$ROOT_DIR"

if command -v python3 >/dev/null 2>&1; then
    exec python3 runner/podman/deploy.py "$@"
elif command -v python >/dev/null 2>&1; then
    exec python runner/podman/deploy.py "$@"
else
    echo "Error: Python 3 is required to run the automated deployer."
    exit 1
fi
