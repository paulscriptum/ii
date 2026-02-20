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

print("[1] All files in .openclaw dir:")
print(run("ls -la /root/.openclaw/"))

print("\n[2] Find all config files:")
print(run("find /root/.openclaw -name '*.json' -o -name '*.yml' -o -name '*.yaml' -o -name '*.toml' -o -name 'config*' 2>/dev/null"))

print("\n[3] Check for settings/config files:")
print(run("find /root/.openclaw -maxdepth 2 -type f 2>/dev/null"))

print("\n[4] Check inside container for config:")
print(run("docker exec openclaw-gateway ls -la /home/node/.openclaw/"))

print("\n[5] Container env vars:")
print(run("docker exec openclaw-gateway env | sort"))

print("\n[6] Container config files:")
print(run("docker exec openclaw-gateway find /home/node/.openclaw -maxdepth 2 -type f 2>/dev/null"))

print("\n[7] Check for gateway.json or settings:")
print(run("docker exec openclaw-gateway cat /home/node/.openclaw/settings.json 2>/dev/null || echo 'no settings.json'"))
print(run("docker exec openclaw-gateway cat /home/node/.openclaw/gateway.json 2>/dev/null || echo 'no gateway.json'"))
print(run("docker exec openclaw-gateway cat /home/node/.openclaw/config.json 2>/dev/null || echo 'no config.json'"))

c.close()
