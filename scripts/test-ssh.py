import subprocess, sys
print("Python version:", sys.version)
print("Installing paramiko...")
subprocess.check_call([sys.executable, "-m", "pip", "install", "paramiko", "-q"],
                      stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
import paramiko
print("Paramiko OK")
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("217.25.94.44", username="root", password="eQR^o3^3WkG4Ki", timeout=15)
print("Connected!")
si, so, se = c.exec_command("echo hello", timeout=10)
print("Output:", so.read().decode().strip())
c.close()
print("Done")
