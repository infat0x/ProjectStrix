#!/usr/bin/env python3
"""
Project Strix — Automated 1-Click Podman Deployment Orchestrator
Idempotent, self-healing deployment for containerized Strix (Podman + Compose).
Execution scripts live in runner/podman/; container configurations live in podman/.
Full cross-platform support: Linux VPS/Bare-metal, Windows host, and WSL2.
"""

import os
import sys
import subprocess
import secrets
import re
import time

# --- Terminal Colors ---
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_step(msg):
    print(f"\n{Colors.OKBLUE}{Colors.BOLD}==>{Colors.ENDC} {Colors.BOLD}{msg}{Colors.ENDC}")

def print_success(msg):
    print(f"{Colors.OKGREEN}✔ {msg}{Colors.ENDC}")

def print_warn(msg):
    print(f"{Colors.WARNING}⚠ {msg}{Colors.ENDC}")

def print_error(msg):
    print(f"{Colors.FAIL}✖ {msg}{Colors.ENDC}")

def get_runner_dir():
    """Return this script's directory (runner/podman)."""
    return os.path.dirname(os.path.abspath(__file__))

def get_project_root():
    """Dynamically determine the root ProjectStrix directory."""
    current_dir = get_runner_dir()
    if os.path.exists(os.path.join(current_dir, "strix-dashboard")):
        return current_dir
    if os.path.exists(os.path.join(current_dir, "..", "strix-dashboard")):
        return os.path.abspath(os.path.join(current_dir, ".."))
    return os.path.abspath(os.path.join(current_dir, "..", ".."))

def get_podman_config_dir():
    """Return the dedicated podman/ configuration directory."""
    return os.path.join(get_project_root(), "podman")

def is_wsl():
    """Detect if running inside Windows Subsystem for Linux (WSL)."""
    if os.path.exists("/proc/version"):
        try:
            with open("/proc/version", "r") as f:
                content = f.read().lower()
                return "microsoft" in content or "wsl" in content
        except Exception:
            pass
    return False

def run_cmd(cmd, fail_on_error=True, shell=True, env=None, capture_output=True):
    """Run a shell command and return its exit code and stdout."""
    try:
        result = subprocess.run(
            cmd,
            shell=shell,
            executable="/bin/bash" if shell and os.name != 'nt' else None,
            env=env,
            stdout=subprocess.PIPE if capture_output else None,
            stderr=subprocess.STDOUT if capture_output else None,
            text=True
        )
        if result.returncode != 0 and fail_on_error:
            print_error(f"Command failed: {cmd}")
            if result.stdout:
                print(result.stdout)
            sys.exit(result.returncode)
        return result.returncode, result.stdout or ""
    except Exception as e:
        if fail_on_error:
            print_error(f"Exception executing {cmd}: {e}")
            sys.exit(1)
        return 1, str(e)

def handle_windows_host(project_root):
    """If executed on Windows host, check for native podman or bridge into WSL2."""
    code, out = run_cmd("podman --version", fail_on_error=False)
    if code == 0:
        print_success(f"Native Windows Podman detected: {out.strip()}")
        # Check if podman machine is running
        code_m, out_m = run_cmd("podman machine list", fail_on_error=False)
        if code_m == 0 and "default" in out_m and "running" not in out_m.lower():
            print_step("Starting Podman machine...")
            run_cmd("podman machine start", fail_on_error=False)
        return False  # Continue on Windows host with native podman

    # Native podman not on Windows PATH, test WSL2
    print_warn("Podman CLI not found in Windows PATH. Checking for WSL2...")
    code_wsl, _ = run_cmd("wsl --status", fail_on_error=False)
    if code_wsl == 0:
        print_success("WSL2 subsystem is active! Bridging deployment into WSL2 automatically...")
        norm_path = project_root.replace("\\", "/")
        code_p, wsl_path_out = run_cmd(f'wsl wslpath -a "{norm_path}"', fail_on_error=False)
        wsl_dir = wsl_path_out.strip() if code_p == 0 else ""
        if not wsl_dir:
            drive_letter = norm_path[0].lower()
            rest = norm_path[2:]
            wsl_dir = f"/mnt/{drive_letter}{rest}"

        # Ensure Podman & tools are present in WSL
        code_wp, _ = run_cmd("wsl podman --version", fail_on_error=False)
        if code_wp != 0:
            print_step("Installing Podman and dependencies inside WSL2...")
            run_cmd("wsl -u root apt-get update && wsl -u root apt-get install -y podman podman-compose python3", fail_on_error=False)

        print_step(f"Executing deployment in WSL2 at {wsl_dir}...")
        bridge_cmd = f'wsl bash -c "cd {wsl_dir} && python3 runner/podman/deploy.py"'
        exit_code = subprocess.call(bridge_cmd, shell=True)
        sys.exit(exit_code)

    print_error("Neither Podman for Windows nor WSL2 was found.")
    print("Please install Podman Desktop (https://podman-desktop.io) or WSL2 (wsl --install).")
    sys.exit(1)

def check_and_install_podman():
    """Verify podman is available; attempt self-healing install if running on Linux/WSL."""
    print_step("Checking Podman installation...")
    code, out = run_cmd("podman --version", fail_on_error=False)
    if code == 0:
        print_success(f"Podman detected: {out.strip()}")
        return

    print_warn("Podman not found. Attempting automatic package installation...")

    # Linux / WSL automated package installation
    if os.path.exists("/etc/debian_version"):
        print("Detected Debian/Ubuntu/WSL. Installing podman, podman-compose and python3-pip...")
        run_cmd("export DEBIAN_FRONTEND=noninteractive && apt-get update -y && apt-get install -y podman podman-compose python3-pip", fail_on_error=True)
    elif os.path.exists("/etc/redhat-release") or os.path.exists("/etc/fedora-release"):
        print("Detected RHEL/Fedora/CentOS. Installing podman and podman-compose...")
        run_cmd("dnf install -y podman podman-compose python3-pip || yum install -y podman podman-compose python3-pip", fail_on_error=True)
    else:
        print_error("Unsupported distribution for auto-install. Please install Podman manually.")
        sys.exit(1)

    print_success("Podman installed successfully.")

def get_compose_command():
    """Detect whether podman-compose, podman compose, or docker-compose is available."""
    print_step("Detecting Compose engine...")
    
    # 1. Test podman-compose
    code, _ = run_cmd("podman-compose --version", fail_on_error=False)
    if code == 0:
        print_success("Using 'podman-compose'.")
        return "podman-compose"

    # 2. Test podman compose (native v4/v5 plugin)
    code, _ = run_cmd("podman compose --version", fail_on_error=False)
    if code == 0:
        print_success("Using 'podman compose'.")
        return "podman compose"

    # 3. Attempt auto-install of podman-compose via pip
    print_warn("podman-compose not found. Installing via pip...")
    code, _ = run_cmd("pip3 install --user podman-compose || pip install --user podman-compose || pip3 install podman-compose", fail_on_error=False)
    
    # Ensure ~/.local/bin is in PATH
    home = os.environ.get("HOME", "/root")
    os.environ["PATH"] = f"{home}/.local/bin:/usr/local/bin:{os.environ.get('PATH', '')}"

    code, _ = run_cmd("podman-compose --version", fail_on_error=False)
    if code == 0:
        print_success("Installed and using 'podman-compose'.")
        return "podman-compose"

    # 4. Fallback to docker-compose / docker compose
    code, _ = run_cmd("docker-compose --version", fail_on_error=False)
    if code == 0:
        print_warn("Using 'docker-compose' as fallback.")
        return "docker-compose"

    code, _ = run_cmd("docker compose version", fail_on_error=False)
    if code == 0:
        print_warn("Using 'docker compose' as fallback.")
        return "docker compose"

    print_error("Neither podman-compose nor docker-compose could be found or installed.")
    print("Install it via: pip3 install podman-compose")
    sys.exit(1)

def ensure_env_file(config_dir):
    """Generate cryptographically secure secrets in podman/.env.podman if not already set."""
    print_step("Configuring environment variables...")
    env_path = os.path.join(config_dir, ".env.podman")
    
    # Check for legacy .env.podman in project root and migrate if present
    root_env_path = os.path.join(get_project_root(), ".env.podman")
    if not os.path.exists(env_path) and os.path.exists(root_env_path):
        try:
            import shutil
            shutil.copyfile(root_env_path, env_path)
            print_success("Migrated existing root .env.podman into podman/.env.podman")
        except Exception:
            pass

    env_vars = {}
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env_vars[k.strip()] = v.strip().strip('"').strip("'")

    needs_save = False
    
    if "POSTGRES_USER" not in env_vars:
        env_vars["POSTGRES_USER"] = "strix_user"
        needs_save = True

    if "POSTGRES_PASSWORD" not in env_vars or env_vars["POSTGRES_PASSWORD"].startswith("replace_"):
        env_vars["POSTGRES_PASSWORD"] = secrets.token_urlsafe(24)
        needs_save = True

    if "POSTGRES_DB" not in env_vars:
        env_vars["POSTGRES_DB"] = "strix"
        needs_save = True

    if "SESSION_SECRET" not in env_vars or env_vars["SESSION_SECRET"].startswith("replace_"):
        env_vars["SESSION_SECRET"] = secrets.token_hex(32)
        needs_save = True

    if "SCHEDULER_SECRET" not in env_vars or env_vars["SCHEDULER_SECRET"].startswith("replace_"):
        env_vars["SCHEDULER_SECRET"] = secrets.token_hex(32)
        needs_save = True

    if "PORT" not in env_vars:
        env_vars["PORT"] = "48080"
        needs_save = True

    if "INSECURE_HTTP" not in env_vars:
        env_vars["INSECURE_HTTP"] = "true"
        needs_save = True

    if needs_save or not os.path.exists(env_path):
        with open(env_path, "w") as f:
            f.write("# Project Strix — Podman Auto-Generated Secrets\n")
            for k, v in env_vars.items():
                f.write(f"{k}={v}\n")
        print_success("Created/updated podman/.env.podman with fresh cryptographically secure credentials.")
    else:
        print_success("Using existing configuration from podman/.env.podman.")

    return env_vars

def deploy_containers(config_dir, compose_cmd, env_vars):
    """Build and deploy containers using the compose file in podman/."""
    print_step("Deploying Strix via Podman Compose...")
    compose_file = os.path.join(config_dir, "podman-compose.yml")
    env_file = os.path.join(config_dir, ".env.podman")

    env = os.environ.copy()
    env.update(env_vars)

    cmd = f"{compose_cmd} -f {compose_file} --env-file {env_file} up -d --build"
    print(f"Executing in {config_dir}: {cmd}")
    
    code, out = run_cmd(cmd, fail_on_error=False, env=env)
    if code != 0:
        # Fallback if --env-file flag is not supported by older podman-compose versions
        fallback_cmd = f"{compose_cmd} -f {compose_file} up -d --build"
        print_warn(f"--env-file flag failed. Retrying: {fallback_cmd}")
        run_cmd(fallback_cmd, fail_on_error=True, env=env)

    print_success("Containers started.")

def wait_for_service(port, max_wait_sec=60):
    """Wait for Strix Dashboard HTTP endpoint to respond."""
    print_step("Waiting for Strix Dashboard to be ready...")
    import urllib.request

    url = f"http://127.0.0.1:{port}"
    start_time = time.time()

    while time.time() - start_time < max_wait_sec:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "StrixDeployCheck/1.0"})
            with urllib.request.urlopen(req, timeout=3) as resp:
                if resp.status in (200, 302, 307, 308):
                    print_success(f"Dashboard is responding at {url} (HTTP {resp.status}).")
                    return True
        except Exception:
            pass
        time.sleep(3)
        print(".", end="", flush=True)

    print()
    print_warn(f"Dashboard took longer than {max_wait_sec}s to answer HTTP, but container may still be building/starting.")
    return False

def main():
    print(f"\n{Colors.OKCYAN}{Colors.BOLD}╔══════════════════════════════════════════════════════════════════╗{Colors.ENDC}")
    print(f"{Colors.OKCYAN}{Colors.BOLD}║    PROJECT STRIX — 1-CLICK PODMAN AUTO-DEPLOYER (LINUX/WSL2)     ║{Colors.ENDC}")
    print(f"{Colors.OKCYAN}{Colors.BOLD}╚══════════════════════════════════════════════════════════════════╝{Colors.ENDC}\n")

    project_root = get_project_root()
    config_dir = get_podman_config_dir()
    os.chdir(config_dir)

    # 1. Check OS and Environment
    if os.name == 'nt':
        handle_windows_host(project_root)
        return

    if is_wsl():
        print_success("WSL2 (Windows Subsystem for Linux) detected.")
        print("Note: Ports mapped inside WSL2 will automatically be accessible on your Windows host at http://localhost:48080.\n")

    # 2. Linux / WSL execution
    check_and_install_podman()
    compose_cmd = get_compose_command()
    env_vars = ensure_env_file(config_dir)
    deploy_containers(config_dir, compose_cmd, env_vars)

    port = env_vars.get("PORT", "48080")
    wait_for_service(port)

    print(f"\n{Colors.OKGREEN}{Colors.BOLD}🎉 ALL DONE! Project Strix is running in Podman.{Colors.ENDC}")
    print(f"\n{Colors.OKCYAN}{Colors.BOLD}=== MANAGEMENT & USEFUL COMMANDS ==={Colors.ENDC}")
    print(f"{Colors.BOLD}Dashboard UI:{Colors.ENDC}    http://localhost:{port}")
    print(f"{Colors.BOLD}View Live Logs:{Colors.ENDC}  podman logs -f strix-dashboard")
    print(f"{Colors.BOLD}Database Logs:{Colors.ENDC}   podman logs -f strix-postgres")
    print(f"{Colors.BOLD}Container List:{Colors.ENDC}  podman ps")
    print(f"{Colors.BOLD}Stop App:{Colors.ENDC}        cd podman && {compose_cmd} down")
    print(f"{Colors.BOLD}Restart App:{Colors.ENDC}     cd podman && {compose_cmd} restart\n")

if __name__ == "__main__":
    main()
