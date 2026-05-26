import subprocess
import time

def run(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True)

print("Monitoring 18.11.2 Migration...")
while True:
    out = run("sudo docker exec gitlab-web-1 gitlab-ctl status")
    if "run: puma:" in out.stdout and "run: sidekiq:" in out.stdout:
        print("18.11.2 Puma is ONLINE. Reconfigure complete.")
        break
    time.sleep(10)

print("Upgrade Sequence 100% Complete.")
