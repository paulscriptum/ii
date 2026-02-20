import subprocess, sys
subprocess.check_call([sys.executable, "-m", "pip", "install", "paramiko", "-q"],
                      stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("217.25.94.44", username="root", password="eQR^o3^3WkG4Ki", timeout=15)

def run(cmd):
    si, so, se = c.exec_command(cmd, timeout=60)
    o = so.read().decode("utf-8", errors="replace").strip()
    e = se.read().decode("utf-8", errors="replace").strip()
    if e:
        return o + "\n[STDERR] " + e
    return o

print("[1] Restarting container...")
print(run("docker restart openclaw-gateway"))

print("\n[2] Waiting 5s then checking status...")
import time
time.sleep(5)

print(run("docker ps"))

print("\n[3] Logs after restart:")
print(run("docker logs openclaw-gateway 2>&1 | tail -10"))

print("\n[4] Testing curl from server:")
print(run("curl -s -m 5 http://0.0.0.0:18789/__openclaw__/canvas/ || echo 'FAIL'"))

c.close()
print("\nDone!")
