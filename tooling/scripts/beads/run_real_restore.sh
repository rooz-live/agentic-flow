#!/bin/bash
echo "Moving tarball..."
sudo mv /tmp/1764376317_2025_11_29_18.5.3-ee_gitlab_backup.tar /var/lib/docker/volumes/gitlab_backups/

echo "Fixing ownership..."
sudo docker exec gitlab-web-1 chown git:git /var/opt/gitlab/backups/1764376317_2025_11_29_18.5.3-ee_gitlab_backup.tar

echo "Stopping connections..."
sudo docker exec gitlab-web-1 gitlab-ctl stop puma
sudo docker exec gitlab-web-1 gitlab-ctl stop sidekiq

echo "Restoring REAL AWS payload..."
sudo docker exec gitlab-web-1 sh -c 'yes yes | gitlab-backup restore BACKUP=1764376317_2025_11_29_18.5.3-ee force=yes'

echo "Reconfiguring..."
sudo docker exec gitlab-web-1 gitlab-ctl reconfigure
sudo docker exec gitlab-web-1 gitlab-ctl restart
