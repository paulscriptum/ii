import subprocess
import sys
import time
import traceback

try:
    print("Installing paramiko...")
    result = subprocess.run(
        [sys.executable, "-m", "pip", "install", "paramiko"],
        capture_output=True, text=True, timeout=60
    )
    print("pip stdout:", result.stdout[-200:] if result.stdout else "empty")
    print("pip stderr:", result.stderr[-200:] if result.stderr else "empty")
    print("pip returncode:", result.returncode)
except Exception as e:
    print("pip install failed:", e)
    traceback.print_exc()
    sys.exit(1)

try:
    import paramiko
    print("paramiko imported successfully")
except Exception as e:
    print("Failed to import paramiko:", e)
    traceback.print_exc()
    sys.exit(1)

try:
    print("Connecting...")
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect("217.25.94.44", username="root", password="eQR^o3^3WkG4Ki", timeout=15)
    print("Connected!")

    def run(cmd):
        si, so, se = c.exec_command(cmd, timeout=20)
        return so.read().decode("utf-8", errors="replace").strip()

    print("\n[1] OpenClaw files:")
    print(run("ls -la /root/.openclaw/"))

    print("\n[2] All files:")
    print(run("find /root/.openclaw -maxdepth 3 -type f 2>/dev/null"))

    print("\n[3] Auth files:")
    print(run("find /root/.openclaw -name 'auth*' 2>/dev/null"))

    print("\n[4] State:")
    print(run("cat /root/.openclaw/state.json 2>/dev/null || echo 'no state.json'"))

    print("\n[5] Token grep:")
    print(run("grep -rh 'token' /root/.openclaw/ 2>/dev/null | head -10 || echo 'no tokens found'"))

    print("\n[6] Logs with auth:")
    print(run("docker logs openclaw-gateway 2>&1 | grep -iE 'token|auth|key' | tail -10"))

    # Open port
    print("\n[7] Updating docker-compose...")
    run("sed -i 's/127.0.0.1:18789/0.0.0.0:18789/g' /root/docker-compose.yml")
    print(run("cat /root/docker-compose.yml"))

    # Restart
    print("\n[8] Restarting...")
    print(run("cd /root && docker compose down 2>&1"))
    time.sleep(3)
    print(run("cd /root && docker compose up -d 2>&1"))
    time.sleep(6)

    print("\n[9] Status:")
    print(run("docker ps"))
    print(run("ss -tlnp | grep 18789"))

    print("\n[10] Logs:")
    print(run("docker logs openclaw-gateway 2>&1 | tail -15"))

    print("\n[11] Gateway response:")
    print(run("curl -sI http://127.0.0.1:18789/ 2>/dev/null | head -10"))

    c.close()
    print("\nDONE!")

except Exception as e:
    print("ERROR:", e)
    traceback.print_exc()
