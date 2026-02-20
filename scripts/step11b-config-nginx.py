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

# Write nginx config for OpenClaw proxy on port 18800
nginx_conf = r"""server {
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

# Write using heredoc to avoid shell escaping issues
run("cat > /etc/nginx/sites-available/openclaw << 'NGINXEOF'\n" + nginx_conf + "NGINXEOF")
run("ln -sf /etc/nginx/sites-available/openclaw /etc/nginx/sites-enabled/openclaw")
run("rm -f /etc/nginx/sites-enabled/default")

print("[1] Nginx config:")
print(run("cat /etc/nginx/sites-available/openclaw"))

print("\n[2] Testing config:")
print(run("nginx -t 2>&1"))

print("\n[3] Restarting nginx:")
print(run("systemctl restart nginx 2>&1"))
print(run("systemctl is-active nginx"))

print("\n[4] Port 18800:")
print(run("ss -tlnp | grep 18800"))

print("\n[5] HTTP test via nginx proxy:")
print(run("curl -s -m 5 http://0.0.0.0:18800/__openclaw__/canvas/ | head -3"))

c.close()
print("\nDone!")
