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

print("[1] Find nginx files:")
print(run("find / -name 'nginx*' -type f 2>/dev/null | head -20"))

print("\n[2] nginx -V:")
print(run("nginx -V 2>&1 | head -5"))

print("\n[3] ls /etc/nginx:")
print(run("ls -la /etc/nginx/ 2>/dev/null || echo 'no /etc/nginx'"))

print("\n[4] Alternative: use socat or iptables instead")
print("socat:", run("which socat 2>/dev/null || echo 'not found'"))
print("iptables:", run("which iptables 2>/dev/null || echo 'not found'"))

c.close()
