import subprocess, sys
subprocess.check_call([sys.executable, "-m", "pip", "install", "paramiko", "-q"],
                      stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("217.25.94.44", username="root", password="eQR^o3^3WkG4Ki", timeout=15)

def run(cmd):
    si, so, se = c.exec_command(cmd, timeout=30)
    o = so.read().decode("utf-8", errors="replace").strip()
    e = se.read().decode("utf-8", errors="replace").strip()
    if e:
        return o + "\n[STDERR] " + e
    return o

# Use network_mode: host so container uses host network directly
new_compose = """services:
  openclaw-gateway:
    image: ghcr.io/openclaw/openclaw:2026.2.15
    container_name: openclaw-gateway
    restart: unless-stopped
    network_mode: host
    environment:
      - NODE_OPTIONS=--max-old-space-size=1536
      - OPENCLAW_STATE_DIR=/home/node/.openclaw
    volumes:
      - /root/.openclaw:/home/node/.openclaw
      - /root/.openclaw/workspace:/home/node/.openclaw/workspace
"""

escaped = new_compose.replace("'", "'\\''")
run(f"echo '{escaped}' > /root/docker-compose.yml")

print("[1] New docker-compose.yml:")
print(run("cat /root/docker-compose.yml"))

# Stop old container and start with new config
print("\n[2] Stopping old container...")
print(run("cd /root && docker compose down"))

c.close()
print("\nStopped. Run next script to start.")
