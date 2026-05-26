import subprocess
import time

def run(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True)

print("Monitoring 18.8.7 Migration...")
while True:
    out = run("sudo docker exec gitlab-web-1 gitlab-ctl status")
    if "run: puma:" in out.stdout and "run: sidekiq:" in out.stdout:
        print("18.8.7 Puma is ONLINE. Reconfigure complete.")
        break
    time.sleep(10)

print("Waiting 30 seconds for background migrations to settle...")
time.sleep(30)

print("Modifying docker-compose.yml to 18.11.2-ee.0...")
run("sed -i 's/18.8.7-ee.0/18.11.2-ee.0/g' /home/ubuntu/infrastructure/hivelocity/gitlab/docker-compose.yml")

print("Pulling 18.11.2-ee.0...")
run("cd /home/ubuntu/infrastructure/hivelocity/gitlab && sudo docker compose pull web")

print("Booting 18.11.2-ee.0...")
run("cd /home/ubuntu/infrastructure/hivelocity/gitlab && sudo docker compose up -d")

print("Monitoring 18.11.2 Migration...")
while True:
    out = run("sudo docker exec gitlab-web-1 gitlab-ctl status")
    if "run: puma:" in out.stdout and "run: sidekiq:" in out.stdout:
        print("18.11.2 Puma is ONLINE. Reconfigure complete.")
        break
    time.sleep(10)

print("Upgrade Sequence 100% Complete.")
