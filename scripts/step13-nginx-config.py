import subprocess
subprocess.check_call(["pip", "install", "paramiko", "-q"])

import paramiko

HOST = "217.25.94.44"
USER = "root"
PASS = "eQR^o3^3WkG4Ki"

NGINX_CONF = """
server {
    listen 18800;
    listen [::]:18800;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:18789;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
"""

NGINX_MAIN = """
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 768;
}

http {
    sendfile on;
    tcp_nopush on;
    types_hash_max_size 2048;
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;
    gzip on;
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
"""

def run(ssh, cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
    out = stdout.read().decode()
    err = stderr.read().decode()
    return out, err

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=10)

# Write nginx main config
sftp = ssh.open_sftp()
with sftp.file("/etc/nginx/nginx.conf", "w") as f:
    f.write(NGINX_MAIN)
print("[1] Wrote nginx.conf")

# Write site config
with sftp.file("/etc/nginx/sites-available/openclaw", "w") as f:
    f.write(NGINX_CONF)
print("[2] Wrote sites-available/openclaw")
sftp.close()

# Enable site and remove default
run(ssh, "ln -sf /etc/nginx/sites-available/openclaw /etc/nginx/sites-enabled/openclaw")
run(ssh, "rm -f /etc/nginx/sites-enabled/default")
print("[3] Enabled openclaw site")

# Test config
out, err = run(ssh, "nginx -t 2>&1")
print(f"[4] nginx -t: {out}{err}")

# Start nginx
out, err = run(ssh, "systemctl enable nginx && systemctl restart nginx 2>&1")
print(f"[5] nginx restart: {out}{err}")

out, err = run(ssh, "systemctl status nginx 2>&1 | head -10")
print(f"[6] nginx status:\n{out}")

# Test locally
out, err = run(ssh, "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:18800/ 2>&1")
print(f"[7] Local test http://127.0.0.1:18800 -> HTTP {out}")

ssh.close()
print("\nDone!")
