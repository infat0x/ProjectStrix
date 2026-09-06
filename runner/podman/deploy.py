#!/usr/bin/env python3
"""
Project Strix — Automated 1-Click Podman Deployment Orchestrator
Idempotent, self-healing deployment for containerized Strix (Podman + Compose).
Execution scripts live in runner/podman/; container configurations live in podman/.
Automatically handles .env generation and secrets resolution (zero manual configuration).
Full cross-platform support: Linux VPS/Bare-metal, Windows host, and WSL2.
"""

import os
import sys
import subprocess
import secrets
import re
import time

# Ensure UTF-8 output on Windows consoles to prevent UnicodeEncodeError
if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# --- Terminal Colors & Symbols ---
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

CHECK_ICON = "[+]" if sys.platform == "win32" and (getattr(sys.stdout, "encoding", "") or "").lower() not in ("utf-8", "utf8") else "✔"
CROSS_ICON = "[X]" if sys.platform == "win32" and (getattr(sys.stdout, "encoding", "") or "").lower() not in ("utf-8", "utf8") else "✖"
WARN_ICON  = "[!]" if sys.platform == "win32" and (getattr(sys.stdout, "encoding", "") or "").lower() not in ("utf-8", "utf8") else "⚠"

def print_step(msg):
    print(f"\n{Colors.OKBLUE}{Colors.BOLD}==>{Colors.ENDC} {Colors.BOLD}{msg}{Colors.ENDC}")

def print_success(msg):
    print(f"{Colors.OKGREEN}{CHECK_ICON} {msg}{Colors.ENDC}")

def print_warn(msg):
    print(f"{Colors.WARNING}{WARN_ICON} {msg}{Colors.ENDC}")

def print_error(msg):
    print(f"{Colors.FAIL}{CROSS_ICON} {msg}{Colors.ENDC}")

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
    """Bridge deployment directly into WSL2 Podman (no Windows Podman Desktop required)."""
    code_wsl, _ = run_cmd("wsl --status", fail_on_error=False)
    if code_wsl != 0:
        print_error("WSL2 subsystem was not detected on Windows.")
        print("Please enable/install WSL2: wsl --install")
        sys.exit(1)

    norm_path = project_root.replace("\\", "/")
    drive = norm_path[0].lower()
    wsl_dir = f"/mnt/{drive}{norm_path[2:]}"
    print_success(f"Forwarding deployment directly into WSL2 Podman ({wsl_dir})...")
    exit_code = subprocess.call(["wsl", "bash", "-c", f"cd '{wsl_dir}' && python3 runner/podman/deploy.py"])
    sys.exit(exit_code)

def configure_wsl_podman():
    """Ensure cgroup_manager is set to cgroupfs and user session is clean for rootless WSL2 environments."""
    if not is_wsl():
        return
    try:
        conf_dir = os.path.expanduser("~/.config/containers")
        os.makedirs(conf_dir, exist_ok=True)
        conf_file = os.path.join(conf_dir, "containers.conf")
        content = ""
        if os.path.exists(conf_file):
            with open(conf_file, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
        if "cgroup_manager" not in content:
            with open(conf_file, "a" if content else "w", encoding="utf-8") as f:
                if content and not content.endswith("\n"):
                    f.write("\n")
                f.write("[engine]\ncgroup_manager = \"cgroupfs\"\nevents_logger = \"file\"\n")
            print_success("Configured rootless Podman to use cgroupfs in WSL2.")

        # Ensure unqualified search registries are configured so short image names resolve in Podman
        reg_file = os.path.join(conf_dir, "registries.conf")
        reg_content = ""
        if os.path.exists(reg_file):
            with open(reg_file, "r", encoding="utf-8", errors="ignore") as f:
                reg_content = f.read()
        if "unqualified-search-registries" not in reg_content:
            with open(reg_file, "a" if reg_content else "w", encoding="utf-8") as f:
                if reg_content and not reg_content.endswith("\n"):
                    f.write("\n")
                f.write('unqualified-search-registries = ["docker.io"]\n')
            print_success("Configured unqualified-search-registries in ~/.config/containers/registries.conf.")

        # Clean stale aardvark-dns state & lingering locks if any
        uid = os.getuid() if hasattr(os, "getuid") else 1000
        run_cmd(f"rm -rf /run/user/{uid}/containers/networks/aardvark-dns 2>/dev/null", fail_on_error=False)

        # Check systemd user D-Bus session availability in WSL2
        bus_file = f"/run/user/{uid}/bus"
        if not os.path.exists(bus_file):
            run_cmd("systemctl --user start dbus.socket 2>/dev/null || systemctl --user start dbus.service 2>/dev/null", fail_on_error=False)
            if not os.path.exists(bus_file):
                print_warn("WSL2 user session bus (/run/user/1000/bus) is currently unreachable.")
                print(f"{Colors.WARNING}Stale cgroup locks from a previous session are blocking systemd user services.{Colors.ENDC}")
                print(f"{Colors.BOLD}To fix, run in Windows PowerShell:{Colors.ENDC} {Colors.OKCYAN}wsl --shutdown{Colors.ENDC}")
                print(f"Then reopen your WSL terminal and re-run: {Colors.BOLD}python3 deploy.py{Colors.ENDC}\n")
    except Exception as e:
        print_warn(f"Could not configure ~/.config/containers: {e}")

def check_and_install_podman():
    """Verify podman is available; attempt self-healing install if running on Linux/WSL."""
    configure_wsl_podman()
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

def get_db_password(config_dir):
    """Return a stable DB password — reuse the one already in podman/.env or podman/.env.podman if present,
    otherwise generate a fresh random one. Never use a hardcoded default (mirrors runner/host/deploy.py)."""
    for fname in [".env", ".env.podman"]:
        env_file = os.path.join(config_dir, fname)
        if os.path.exists(env_file):
            try:
                with open(env_file, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                m = re.search(r'POSTGRES_PASSWORD=[\'"]?([^\r\n\'"]+)', content)
                if m and not m.group(1).startswith("replace_"):
                    return m.group(1)
                m2 = re.search(r'postgresql://strix_user:([^@]+)@', content)
                if m2 and not m2.group(1).startswith("replace_"):
                    return m2.group(1)
            except Exception:
                pass
    return secrets.token_urlsafe(24)

def setup_podman_environment(config_dir):
    """Automatically resolve, generate, and synchronize environment variables and secrets for Podman.
    Mirrors the exact self-healing pattern of runner/host/deploy.py (zero manual configuration)."""
    print_step("Setting up Podman Environment Configuration...")
    
    db_pass = get_db_password(config_dir)
    env_file = os.path.join(config_dir, ".env")
    env_podman_file = os.path.join(config_dir, ".env.podman")

    # If host .env exists, optionally reuse existing session secrets for seamless switching
    host_env_file = os.path.join(get_project_root(), "strix-dashboard", ".env")
    inherited_session_secret = None
    inherited_scheduler_secret = None
    if os.path.exists(host_env_file):
        try:
            with open(host_env_file, "r", encoding="utf-8", errors="ignore") as f:
                c = f.read()
            m_sess = re.search(r'SESSION_SECRET=[\'"]?([^\r\n\'"]+)', c)
            if m_sess: inherited_session_secret = m_sess.group(1)
            m_sched = re.search(r'SCHEDULER_SECRET=[\'"]?([^\r\n\'"]+)', c)
            if m_sched: inherited_scheduler_secret = m_sched.group(1)
        except Exception:
            pass

    # Check which file currently exists
    target_file = env_file if os.path.exists(env_file) else (env_podman_file if os.path.exists(env_podman_file) else None)

    if not target_file:
        print("Creating .env file with randomly generated secrets...")
        session_secret = inherited_session_secret or secrets.token_hex(32)
        scheduler_secret = inherited_scheduler_secret or secrets.token_hex(32)
        content = (
            "# Project Strix -- Podman Auto-Generated Secrets\n"
            f"POSTGRES_USER=\"strix_user\"\n"
            f"POSTGRES_PASSWORD=\"{db_pass}\"\n"
            f"POSTGRES_DB=\"strix\"\n"
            f"DATABASE_URL=\"postgresql://strix_user:{db_pass}@strix-db:5432/strix?schema=public\"\n"
            f"SESSION_SECRET=\"{session_secret}\"\n"
            f"SCHEDULER_SECRET=\"{scheduler_secret}\"\n"
            f"INSECURE_HTTP=true\n"
            f"PORT=48080\n"
        )
        with open(env_file, "w", encoding="utf-8") as f:
            f.write(content)
        with open(env_podman_file, "w", encoding="utf-8") as f:
            f.write(content)
        print_success("Created podman/.env with randomly generated cryptographically secure credentials.")
    else:
        with open(target_file, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        # Ensure POSTGRES_USER exists
        if "POSTGRES_USER=" not in content:
            content += 'POSTGRES_USER="strix_user"\n'

        # Ensure POSTGRES_PASSWORD exists
        if "POSTGRES_PASSWORD=" not in content or "replace_" in content:
            content = re.sub(r'POSTGRES_PASSWORD=.*', f'POSTGRES_PASSWORD="{db_pass}"', content)
            if "POSTGRES_PASSWORD=" not in content:
                content += f'POSTGRES_PASSWORD="{db_pass}"\n'

        # Ensure POSTGRES_DB exists
        if "POSTGRES_DB=" not in content:
            content += 'POSTGRES_DB="strix"\n'

        # Ensure DATABASE_URL exists and matches current DB password
        db_url = f'DATABASE_URL="postgresql://strix_user:{db_pass}@strix-db:5432/strix?schema=public"'
        if "DATABASE_URL=" in content:
            content = re.sub(r'DATABASE_URL=.*', db_url, content)
        else:
            content += f"{db_url}\n"

        # Ensure SESSION_SECRET exists (required for auth)
        if "SESSION_SECRET=" not in content or "replace_" in content:
            new_sess = inherited_session_secret or secrets.token_hex(32)
            content = re.sub(r'SESSION_SECRET=.*', f'SESSION_SECRET="{new_sess}"', content)
            if "SESSION_SECRET=" not in content:
                content += f'SESSION_SECRET="{new_sess}"\n'
            print("Generated missing SESSION_SECRET.")

        # Ensure SCHEDULER_SECRET exists (required for scheduled scans)
        if "SCHEDULER_SECRET=" not in content or "replace_" in content:
            new_sched = inherited_scheduler_secret or secrets.token_hex(32)
            content = re.sub(r'SCHEDULER_SECRET=.*', f'SCHEDULER_SECRET="{new_sched}"', content)
            if "SCHEDULER_SECRET=" not in content:
                content += f'SCHEDULER_SECRET="{new_sched}"\n'
            print("Generated missing SCHEDULER_SECRET.")

        # Ensure PORT is set
        if "PORT=" not in content:
            content += "PORT=48080\n"

        # Ensure INSECURE_HTTP is set
        if "INSECURE_HTTP=" not in content:
            content += "INSECURE_HTTP=true\n"

        # Write to both .env (default for compose) and .env.podman
        with open(env_file, "w", encoding="utf-8") as f:
            f.write(content)
        with open(env_podman_file, "w", encoding="utf-8") as f:
            f.write(content)
        print_success("Verified and synchronized Podman environment configuration.")

    # Parse and return dictionary for subprocess environment
    env_vars = {}
    with open(env_file, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env_vars[k.strip()] = v.strip().strip('"').strip("'")
    return env_vars

def deploy_containers(config_dir, compose_cmd, env_vars):
    """Build and deploy containers using the compose file in podman/ with live progress output."""
    print_step("Deploying Strix via Podman Compose...")
    compose_file = os.path.join(config_dir, "podman-compose.yml")

    env = os.environ.copy()
    env.update(env_vars)
    if is_wsl():
        env["PODMAN_CGROUP_MANAGER"] = "cgroupfs"

    # Remove any conflicting/failed containers from earlier attempts
    run_cmd("podman rm -f strix-dashboard strix-postgres 2>/dev/null || true", fail_on_error=False)

    cmd = f"{compose_cmd} -f {compose_file} up -d --build"
    print(f"Executing in {config_dir}: {cmd}")
    print(f"{Colors.OKCYAN}Streaming container build and startup logs in real-time...{Colors.ENDC}\n")

    code, _ = run_cmd(cmd, fail_on_error=True, env=env, capture_output=False)
    print_success("Containers built and started successfully.")

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
    print(f"{Colors.OKCYAN}{Colors.BOLD}║         PROJECT STRIX -- 1-CLICK PODMAN DEPLOYER (WSL2)          ║{Colors.ENDC}")
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
    env_vars = setup_podman_environment(config_dir)
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
