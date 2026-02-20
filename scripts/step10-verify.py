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

print("[1] Container status:")
print(run("docker ps"))

print("\n[2] Logs:")
print(run("docker logs openclaw-gateway 2>&1 | tail -12"))

print("\n[3] Port listening:")
print(run("ss -tlnp | grep 18789"))

print("\n[4] HTTP test:")
print(run("curl -s -m 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:18789/__openclaw__/canvas/"))

c.close()
