#!/bin/bash
echo "Fixing ownership..."
sudo docker exec gitlab-web-1 chown git:git /var/opt/gitlab/backups/sovereignty_1777470387_gitlab_backup.tar

echo "Stopping connections..."
sudo docker exec gitlab-web-1 gitlab-ctl stop puma
sudo docker exec gitlab-web-1 gitlab-ctl stop sidekiq

echo "Restoring..."
sudo docker exec gitlab-web-1 sh -c 'yes yes | gitlab-backup restore BACKUP=sovereignty_1777470387 force=yes'

echo "Reconfiguring..."
sudo docker exec gitlab-web-1 gitlab-ctl reconfigure
sudo docker exec gitlab-web-1 gitlab-ctl restart
