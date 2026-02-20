import subprocess, sys
subprocess.check_call([sys.executable, "-m", "pip", "install", "paramiko", "-q"],
                      stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("217.25.94.44", username="root", password="eQR^o3^3WkG4Ki", timeout=15)

def run(cmd):
    si, so, se = c.exec_command(cmd, timeout=30)
    return so.read().decode("utf-8", errors="replace").strip()

print("[1] Before:")
print(run("grep -n '18789' /root/docker-compose.yml"))

print("\n[2] Updating...")
run("sed -i 's/127.0.0.1:18789/0.0.0.0:18789/g' /root/docker-compose.yml")

print("\n[3] After:")
print(run("grep -n '18789' /root/docker-compose.yml"))

c.close()
print("\nConfig updated!")
