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

# Recreate nginx config dir and set up properly
print("[1] Reinstalling nginx config...")
print(run("apt-get install --reinstall -y nginx-common 2>&1 | tail -3"))

print("\n[2] Check /etc/nginx now:")
print(run("ls -la /etc/nginx/ 2>/dev/null || echo 'still no /etc/nginx'"))

c.close()
