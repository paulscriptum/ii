import subprocess, sys
subprocess.check_call([sys.executable, "-m", "pip", "install", "paramiko", "-q"],
                      stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("217.25.94.44", username="root", password="eQR^o3^3WkG4Ki", timeout=15)
print("Connected!")

def run(cmd):
    si, so, se = c.exec_command(cmd, timeout=20)
    return so.read().decode("utf-8", errors="replace").strip()

print("\n[1] OpenClaw directory:")
print(run("ls -la /root/.openclaw/"))

print("\n[2] All files in .openclaw:")
print(run("find /root/.openclaw -maxdepth 3 -type f 2>/dev/null"))

print("\n[3] Auth files:")
print(run("find /root/.openclaw -name 'auth*' 2>/dev/null"))

print("\n[4] State json:")
print(run("cat /root/.openclaw/state.json 2>/dev/null || echo 'none'"))

print("\n[5] Grep for token in all files:")
print(run("grep -rl 'token' /root/.openclaw/ 2>/dev/null | head -10"))

print("\n[6] Token content from logs:")
print(run("docker logs openclaw-gateway 2>&1 | grep -iE 'token|auth' | tail -10"))

c.close()
print("\nDone!")
