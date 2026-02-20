import subprocess
import sys

# First install paramiko
subprocess.check_call([sys.executable, "-m", "pip", "install", "paramiko", "-q"])

import paramiko
import time

SERVER = "217.25.94.44"
PASSWORD = "eQR^o3^3WkG4Ki"
USERNAME = "root"

def ssh_exec(client, cmd, timeout=15):
    """Execute a command and return output"""
    print(f"\n>>> {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out:
        print(out)
    if err and err != out:
        print(f"[stderr] {err}")
    return out

try:
    print(f"Connecting to {SERVER}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(SERVER, username=USERNAME, password=PASSWORD, timeout=15)
    print("Connected!\n")

    # Step 1: System info
    print("=" * 60)
    print("SYSTEM INFO")
    print("=" * 60)
    ssh_exec(client, "uname -a")
    ssh_exec(client, "cat /etc/os-release | head -3")

    # Step 2: Docker status
    print("\n" + "=" * 60)
    print("DOCKER STATUS")
    print("=" * 60)
    docker_ps = ssh_exec(client, "docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}' 2>/dev/null || echo 'Docker not installed'")

    # Step 3: Find OpenClaw
    print("\n" + "=" * 60)
    print("FINDING OPENCLAW")
    print("=" * 60)
    ssh_exec(client, "find / -maxdepth 4 -name 'docker-compose*' 2>/dev/null | head -10")
    ssh_exec(client, "find / -maxdepth 5 \\( -name 'config.yml' -o -name 'config.yaml' \\) 2>/dev/null | head -10")
    ssh_exec(client, "find / -maxdepth 4 -type d -name '*claw*' -o -type d -name '*openclaw*' 2>/dev/null | head -10")

    # Step 4: Network ports
    print("\n" + "=" * 60)
    print("LISTENING PORTS")
    print("=" * 60)
    ssh_exec(client, "ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null")

    # Step 5: Docker compose files content
    print("\n" + "=" * 60)
    print("DOCKER COMPOSE CONTENTS")
    print("=" * 60)
    compose_files = ssh_exec(client, "find / -maxdepth 4 -name 'docker-compose*' 2>/dev/null | head -5")
    if compose_files:
        for f in compose_files.split('\n'):
            f = f.strip()
            if f:
                print(f"\n--- {f} ---")
                ssh_exec(client, f"cat '{f}'")

    # Step 6: Docker container details
    print("\n" + "=" * 60)
    print("CONTAINER DETAILS")
    print("=" * 60)
    containers = ssh_exec(client, "docker ps -q 2>/dev/null")
    if containers:
        for cid in containers.split('\n')[:5]:
            cid = cid.strip()
            if cid:
                ssh_exec(client, f"docker inspect {cid} --format '{{{{.Name}}}} {{{{.Config.Image}}}} Ports: {{{{.NetworkSettings.Ports}}}}'")
                ssh_exec(client, f"docker logs {cid} 2>&1 | tail -20")

    client.close()
    print("\n\nDONE!")

except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
