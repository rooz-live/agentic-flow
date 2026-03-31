#!/bin/bash
# Secure OpenStack openrc for STX AIO instance.
# WARNING: Edit OS_PASSWORD before use. Run `chmod 600 stx_openrc.sh` after editing.
# Add to .gitignore: stx_openrc.sh
# Usage on remote: scp stx_openrc.sh root@23.92.79.2:2222:~/-i ~/pem/stx-aio-0.pem
# Then ssh -i ~/pem/stx-aio-0.pem -p 2222 root@23.92.79.2 'chmod 600 ~/stx_openrc.sh && source ~/stx_openrc.sh && openstack quota show'

export OS_AUTH_URL=http://stx-aio-0.corp.interface.tag.ooo:5000/v3
export OS_IDENTITY_API_VERSION=3
export OS_IMAGE_API_VERSION=2
export OS_USERNAME=admin
export OS_PASSWORD="YOUR_SECURE_ADMIN_PASSWORD_HERE"
export OS_PROJECT_NAME=admin
export OS_USER_DOMAIN_NAME=Default
export OS_PROJECT_DOMAIN_NAME=Default
export OS_REGION_NAME=RegionOne

echo "OpenStack environment variables sourced successfully."