import subprocess, sys
subprocess.check_call([sys.executable, "-m", "pip", "install", "paramiko", "-q"],
                      stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("217.25.94.44", username="root", password="eQR^o3^3WkG4Ki", timeout=15)

def run(cmd):
    si, so, se = c.exec_command(cmd, timeout=120)
    o = so.read().decode("utf-8", errors="replace").strip()
    return o

# Check if nginx already installed
result = run("which nginx 2>/dev/null || echo 'not found'")
print("[1] nginx:", result)

if "not found" in result:
    print("\n[2] Installing nginx (this may take a moment)...")
    print(run("DEBIAN_FRONTEND=noninteractive apt-get install -y nginx 2>&1 | tail -5"))
else:
    print("\n[2] nginx already installed!")

print("\n[3] nginx version:")
print(run("nginx -v 2>&1"))

c.close()
