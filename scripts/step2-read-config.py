import subprocess, sys
subprocess.check_call([sys.executable, "-m", "pip", "install", "paramiko", "-q"],
                      stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("217.25.94.44", username="root", password="eQR^o3^3WkG4Ki", timeout=15)

def run(cmd):
    si, so, se = c.exec_command(cmd, timeout=20)
    return so.read().decode("utf-8", errors="replace").strip()

print("[1] openclaw.json:")
print(run("cat /root/.openclaw/openclaw.json"))

print("\n[2] AGENTS.md (first 50 lines):")
print(run("head -50 /root/.openclaw/workspace/AGENTS.md"))

print("\n[3] agents directory:")
print(run("find /root/.openclaw/agents -type f 2>/dev/null"))

print("\n[4] workspace-state.json:")
print(run("cat /root/.openclaw/workspace/.openclaw/workspace-state.json 2>/dev/null"))

print("\n[5] cron/jobs.json:")
print(run("cat /root/.openclaw/cron/jobs.json 2>/dev/null"))

print("\n[6] logs audit:")
print(run("tail -5 /root/.openclaw/logs/config-audit.jsonl 2>/dev/null"))

c.close()
print("\nDone!")
