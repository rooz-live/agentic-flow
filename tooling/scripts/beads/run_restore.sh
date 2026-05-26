#!/bin/bash
sudo docker exec gitlab-web-1 gitlab-ctl stop puma
sudo docker exec gitlab-web-1 gitlab-ctl stop sidekiq

# Force the restore, piping yes to any potential prompts just in case force=yes misses one
sudo docker exec gitlab-web-1 sh -c 'yes yes | gitlab-backup restore BACKUP=sovereignty_1777470387 force=yes'

sudo docker exec gitlab-web-1 gitlab-ctl reconfigure
sudo docker exec gitlab-web-1 gitlab-ctl restart
