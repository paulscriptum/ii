import subprocess, sys, time
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
    return o + ("\n[err] " + e if e else "")

# Step 1: Change port binding from 127.0.0.1 to 0.0.0.0
print("[1] Current docker-compose:")
print(run("cat /root/docker-compose.yml"))

print("\n[2] Updating port binding...")
print(run("sed -i 's/127.0.0.1:18789/0.0.0.0:18789/g' /root/docker-compose.yml"))

print("\n[3] Updated docker-compose:")
print(run("cat /root/docker-compose.yml"))

# Step 2: Restart the container
print("\n[4] Stopping container...")
print(run("cd /root && docker compose down"))
time.sleep(3)

print("\n[5] Starting container...")
print(run("cd /root && docker compose up -d"))
time.sleep(7)

print("\n[6] Container status:")
print(run("docker ps"))

print("\n[7] Port binding:")
print(run("ss -tlnp | grep 18789"))

print("\n[8] Recent logs:")
print(run("docker logs openclaw-gateway 2>&1 | tail -10"))

c.close()
print("\nDone!")
