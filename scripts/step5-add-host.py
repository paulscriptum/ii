import subprocess, sys, json
subprocess.check_call([sys.executable, "-m", "pip", "install", "paramiko", "-q"],
                      stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("217.25.94.44", username="root", password="eQR^o3^3WkG4Ki", timeout=15)

def run(cmd):
    si, so, se = c.exec_command(cmd, timeout=30)
    return so.read().decode("utf-8", errors="replace").strip()

# Read current config
raw = run("cat /root/.openclaw/openclaw.json")
print("[1] Current config:")
print(raw)

config = json.loads(raw)

# Add host: 0.0.0.0 to gateway section
config["gateway"]["host"] = "0.0.0.0"
config["gateway"]["port"] = 18789

new_config = json.dumps(config, indent=2)
print("\n[2] New config:")
print(new_config)

# Write back (escape for shell)
escaped = new_config.replace("'", "'\\''")
run(f"echo '{escaped}' > /root/.openclaw/openclaw.json")

# Verify
print("\n[3] Verify written:")
print(run("cat /root/.openclaw/openclaw.json"))

c.close()
print("\nConfig updated with host: 0.0.0.0!")
