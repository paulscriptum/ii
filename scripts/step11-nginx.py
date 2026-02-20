import subprocess, sys
subprocess.check_call([sys.executable, "-m", "pip", "install", "paramiko", "-q"],
                      stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("217.25.94.44", username="root", password="eQR^o3^3WkG4Ki", timeout=15)

def run(cmd):
    si, so, se = c.exec_command(cmd, timeout=60)
    o = so.read().decode("utf-8", errors="replace").strip()
    e = se.read().decode("utf-8", errors="replace").strip()
    if e:
        return o + "\n[STDERR] " + e
    return o

print("[1] Installing nginx...")
print(run("apt-get update -qq && apt-get install -y -qq nginx 2>&1 | tail -3"))

nginx_conf = """
server {
    listen 18800;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:18789;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
"""

escaped = nginx_conf.replace("'", "'\\''")
run(f"echo '{escaped}' > /etc/nginx/sites-available/openclaw")
run("ln -sf /etc/nginx/sites-available/openclaw /etc/nginx/sites-enabled/openclaw")
run("rm -f /etc/nginx/sites-enabled/default")

print("\n[2] Testing nginx config:")
print(run("nginx -t 2>&1"))

print("\n[3] Restarting nginx:")
print(run("systemctl restart nginx 2>&1"))

print("\n[4] Nginx status:")
print(run("systemctl is-active nginx"))

print("\n[5] Port 18800 listening:")
print(run("ss -tlnp | grep 18800"))

print("\n[6] HTTP test via nginx:")
print(run("curl -s -m 5 http://0.0.0.0:18800/__openclaw__/canvas/ | head -3"))

c.close()
print("\nNginx proxy configured!")
