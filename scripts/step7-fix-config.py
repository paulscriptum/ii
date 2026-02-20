import subprocess, sys, json
subprocess.check_call([sys.executable, "-m", "pip", "install", "paramiko", "-q"],
                      stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("217.25.94.44", username="root", password="eQR^o3^3WkG4Ki", timeout=15)

def run(cmd):
    si, so, se = c.exec_command(cmd, timeout=30)
    o = so.read().decode("utf-8", errors="replace").strip()
    return o

# Restore valid config without host/port
config = {
    "commands": {
        "native": "auto",
        "nativeSkills": "auto"
    },
    "gateway": {
        "auth": {
            "mode": "token",
            "token": "9b0dd3b6cff44e7c0fbcb637f6179b9643979eaedefb10da"
        }
    },
    "meta": {
        "lastTouchedVersion": "2026.2.15",
        "lastTouchedAt": "2026-02-20T16:35:40.089Z"
    }
}

new_config = json.dumps(config, indent=2)
escaped = new_config.replace("'", "'\\''")
run(f"echo '{escaped}' > /root/.openclaw/openclaw.json")

print("[1] Restored config:")
print(run("cat /root/.openclaw/openclaw.json"))

# Try using OPENCLAW_HOST env var in docker-compose
print("\n[2] Checking docker help for host binding...")
print(run("docker exec openclaw-gateway openclaw --help 2>&1 | head -30 || echo 'container not running'"))

# Let's try adding OPENCLAW_GATEWAY_HOST env var
print("\n[3] Checking env var approach...")
print(run("cat /root/docker-compose.yml"))

c.close()
print("\nConfig restored!")
