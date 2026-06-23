#!/bin/bash
set -e

# Ship Python patch to stx
cat << 'EOF' > /tmp/patch_haproxy_api.py
import re
import sys

config_path = "/etc/haproxy/haproxy.cfg"
with open(config_path, "r") as f:
    content = f.read()

old_line = "acl is_mailadmin req_ssl_sni -i mailadmin.bhopti.com billing.tag.ooo store.tag.ooo billing.bhopti.com crm.bhopti.com shop.bhopti.com"
new_line = old_line + " api.interface.tag.ooo"

if old_line in content:
    content = content.replace(old_line, new_line)
    with open(config_path, "w") as f:
        f.write(content)
    print("HAProxy configuration updated successfully.")
else:
    if "api.interface.tag.ooo" in content:
        print("Record already exists in HAProxy configuration.")
    else:
        print("Error: Target line not found in haproxy.cfg.")
        sys.exit(1)
EOF

echo "=== Transmitting HAProxy patch to stx ==="
scp /tmp/patch_haproxy_api.py stx:/tmp/patch_haproxy_api.py

echo "=== Executing patch and restarting HAProxy ==="
ssh stx "sudo python3 /tmp/patch_haproxy_api.py && sudo systemctl restart haproxy"

# Cleanup
rm /tmp/patch_haproxy_api.py
ssh stx "rm /tmp/patch_haproxy_api.py"

echo "Done."
