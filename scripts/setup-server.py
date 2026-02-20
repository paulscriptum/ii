import subprocess
import sys

SERVER = "217.25.94.44"
PASSWORD = "eQR^o3^3WkG4Ki"

def run_ssh(cmd, timeout=30):
    """Run command on remote server via sshpass"""
    full_cmd = [
        "sshpass", "-p", PASSWORD,
        "ssh", "-o", "StrictHostKeyChecking=no",
        "-o", "ConnectTimeout=10",
        f"root@{SERVER}",
        cmd
    ]
    try:
        result = subprocess.run(full_cmd, capture_output=True, text=True, timeout=timeout)
        print(f"CMD: {cmd}")
        if result.stdout.strip():
            print(f"OUT: {result.stdout.strip()}")
        if result.stderr.strip():
            print(f"ERR: {result.stderr.strip()}")
        print()
        return result.stdout.strip()
    except subprocess.TimeoutExpired:
        print(f"CMD: {cmd} => TIMEOUT")
        return ""
    except FileNotFoundError:
        print("sshpass not found, trying with expect...")
        return run_ssh_expect(cmd, timeout)

def run_ssh_expect(cmd, timeout=30):
    """Fallback using expect"""
    expect_script = f'''
spawn ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@{SERVER} "{cmd}"
expect {{
    "password:" {{
        send "{PASSWORD}\\r"
        expect eof
    }}
    eof
}}
'''
    try:
        result = subprocess.run(
            ["expect", "-c", expect_script],
            capture_output=True, text=True, timeout=timeout
        )
        output = result.stdout.strip()
        print(f"CMD: {cmd}")
        if output:
            print(f"OUT: {output}")
        print()
        return output
    except (FileNotFoundError, subprocess.TimeoutExpired) as e:
        print(f"CMD: {cmd} => FAIL: {e}")
        return ""

# Step 1: Check what's running
print("=" * 60)
print("STEP 1: Checking server status")
print("=" * 60)

run_ssh("docker ps -a 2>/dev/null || echo 'Docker not available'")
run_ssh("ss -tlnp | grep -E '8080|18789|1080' || echo 'No OpenClaw ports found'")
run_ssh("cat /etc/os-release | head -3")

# Step 2: Find OpenClaw config
print("=" * 60)
print("STEP 2: Finding OpenClaw configuration")
print("=" * 60)

run_ssh("find / -maxdepth 5 -name 'config.yml' -o -name 'config.yaml' -o -name '.env' 2>/dev/null | grep -i claw || echo 'No config found via name'")
run_ssh("find / -maxdepth 4 -name 'docker-compose*' 2>/dev/null | head -10")
run_ssh("docker inspect $(docker ps -q 2>/dev/null | head -1) 2>/dev/null | head -50 || echo 'No containers'")

# Step 3: Check if OpenClaw is running and its config
print("=" * 60)
print("STEP 3: OpenClaw details")
print("=" * 60)

run_ssh("docker ps --format '{{.Names}} {{.Ports}} {{.Image}}' 2>/dev/null")
run_ssh("docker logs $(docker ps -q 2>/dev/null | head -1) 2>/dev/null | tail -30 || echo 'No logs'")

print("=" * 60)
print("DONE - Check output above")
print("=" * 60)
