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

print("[1] Current openclaw.json:")
print(run("cat /root/.openclaw/openclaw.json"))

print("\n[2] Updating listen address to 0.0.0.0...")
# Replace 127.0.0.1 with 0.0.0.0 in the config
run("sed -i 's/127.0.0.1/0.0.0.0/g' /root/.openclaw/openclaw.json")

print("\n[3] Updated openclaw.json:")
print(run("cat /root/.openclaw/openclaw.json"))

c.close()
print("\nConfig updated! Next: restart container.")
