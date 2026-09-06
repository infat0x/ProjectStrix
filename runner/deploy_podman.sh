#!/bin/bash
# Project Strix — Podman 1-Click Deployment Shortcut
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

if command -v python3 >/dev/null 2>&1; then
    exec python3 runner/deploy_podman.py "$@"
elif command -v python >/dev/null 2>&1; then
    exec python runner/deploy_podman.py "$@"
else
    echo "Error: Python 3 is required to run the automated deployer."
    exit 1
fi
