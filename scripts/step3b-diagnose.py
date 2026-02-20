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

print("[1] Docker containers:")
print(run("docker ps -a"))

print("\n[2] Port listening on host:")
print(run("ss -tlnp | grep 18789"))

print("\n[3] Full docker-compose.yml:")
print(run("cat /root/docker-compose.yml"))

print("\n[4] OpenClaw config (gateway section):")
print(run("cat /root/openclaw.json | head -40"))

print("\n[5] curl test from inside server:")
print(run("curl -s -m 5 http://127.0.0.1:18789/ || echo 'curl failed'"))

print("\n[6] curl test from 0.0.0.0:")
print(run("curl -s -m 5 http://0.0.0.0:18789/ || echo 'curl failed'"))

print("\n[7] Container logs (last 15 lines):")
print(run("docker logs $(docker ps -q | head -1) 2>&1 | tail -15"))

print("\n[8] iptables rules for 18789:")
print(run("iptables -L -n | grep 18789 || echo 'no iptables rules'"))

print("\n[9] ufw status:")
print(run("ufw status 2>/dev/null || echo 'ufw not installed'"))

c.close()
print("\nDiagnosis complete!")
