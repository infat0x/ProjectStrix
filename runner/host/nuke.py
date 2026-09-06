#!/usr/bin/env python3
"""
Project Strix — Host Cleanup & Uninstallation Script
Completely removes Strix PM2 services, PostgreSQL database, and temporary directories.
"""

import os
import sys
import subprocess

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

def print_error(msg):
    print(f"{Colors.FAIL}✖ {msg}{Colors.ENDC}")

def get_project_root():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    if os.path.exists(os.path.join(current_dir, "strix-dashboard")):
        return current_dir
    if os.path.exists(os.path.join(current_dir, "..", "strix-dashboard")):
        return os.path.abspath(os.path.join(current_dir, ".."))
    return os.path.abspath(os.path.join(current_dir, "..", ".."))

def run_cmd(cmd, fail_on_error=False, shell=True):
    try:
        result = subprocess.run(
            cmd,
            shell=shell,
            executable="/bin/bash" if shell else None,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True
        )
        if result.returncode != 0 and fail_on_error:
            print_error(f"Command failed: {cmd}")
            print(result.stdout)
            sys.exit(result.returncode)
        return result.returncode, result.stdout
    except Exception as e:
        if fail_on_error:
            print_error(f"Exception while running command: {cmd}\n{e}")
            sys.exit(1)
        return 1, str(e)

def check_root():
    if os.geteuid() != 0:
        print_error("This script must be run as root (use sudo).")
        sys.exit(1)

def confirm_clean():
    print(f"{Colors.FAIL}{Colors.BOLD}WARNING! WARNING! WARNING!{Colors.ENDC}")
    print(f"{Colors.WARNING}This script will completely remove Strix and all its components from this server.{Colors.ENDC}")
    print("The following will be DELETED permanently:")
    print(" - The Next.js PM2 Background Service (strix-dashboard)")
    print(" - The PostgreSQL Database ('strix') and all user/scan data")
    print(" - The PostgreSQL User ('strix_user')")
    print(" - The Strix Core Python CLI tool and /root/.strix")
    print(" - The temporary scanning folders (/tmp/strix_runs)")
    print(" - The node_modules and .next cache inside strix-dashboard")
    print("\nAre you absolutely sure you want to proceed? Type 'YES' to confirm.")
    
    confirm = input("Type YES: ")
    if confirm != "YES":
        print("Cleanup aborted. Nothing was changed.")
        sys.exit(0)

def stop_and_remove_services():
    print_step("Stopping and removing PM2 services...")
    run_cmd("pm2 delete strix-dashboard")
    run_cmd("pm2 save")
    run_cmd("fuser -k 48080/tcp")
    print_success("Services stopped.")

def remove_database():
    print_step("Dropping PostgreSQL Database and User...")
    run_cmd("sudo -u postgres psql -c 'DROP DATABASE IF EXISTS strix;'")
    run_cmd("sudo -u postgres psql -c 'DROP USER IF EXISTS strix_user;'")
    print_success("Database removed.")

def remove_strix_core():
    print_step("Uninstalling Strix Core...")
    run_cmd("rm -f /usr/local/bin/strix")
    run_cmd("rm -f ~/.local/bin/strix")
    run_cmd("rm -rf ~/.strix")
    print_success("Strix Core uninstalled.")

def clean_local_files():
    print_step("Cleaning local workspace files...")
    run_cmd("rm -rf /tmp/strix_runs")
    
    dashboard_dir = os.path.join(get_project_root(), "strix-dashboard")
    if os.path.exists(dashboard_dir):
        run_cmd(f"cd {dashboard_dir} && rm -rf node_modules .next")
        
    print_success("Cache and temporary files cleaned.")

def main():
    print(f"\n{Colors.FAIL}{Colors.BOLD}=== STRIX HOST CLEANUP ==={Colors.ENDC}\n")
    check_root()
    confirm_clean()
    
    stop_and_remove_services()
    remove_database()
    remove_strix_core()
    clean_local_files()
    
    print(f"\n{Colors.OKGREEN}{Colors.BOLD}🎉 CLEANUP COMPLETE!{Colors.ENDC}")
    print("Strix has been successfully removed from this server.")
    print("You can now safely delete this project directory if you wish:")
    print(f"rm -rf {get_project_root()}\n")

if __name__ == "__main__":
    main()
