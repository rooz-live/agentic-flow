#!/usr/bin/env bash
# Sovereign Swarm: Edge HAProxy SNI Router Sync
# Manages strict K8s subaltern routing while preserving cPanel root domain sovereignty

set -euo pipefail

log_info() { echo -e "\n[INFO] $*"; }
log_success() { echo -e "✅ $*"; }

# 1. Define the explicit subdomains designated for Kubernetes (AI Slop/Subaltern apps)
# Anything NOT in this exact list will safely fall through to cPanel.
K8S_SUBDOMAINS=(
    "ai.rooz.live"
    "ai.tag.vote"
    "ai.yo.life"
    "ai.720.chat"
    "ai.tag.ooo"
    "ai.decisioncall.com"
    "ai.epic.cab"
    "ai.eudmusic.com"
    "ai.yoservice.com"
    "app.interface.tag.ooo"
)

# Convert the bash array into a space-separated string for HAProxy
K8S_DOMAINS_STR="${K8S_SUBDOMAINS[*]}"

log_info "Synchronizing Edge Routing Rules to StarlingX HAProxy..."
log_info "Target Subaltern K8s Domains: $K8S_DOMAINS_STR"

# 2. Deploy a Python script dynamically to StarlingX that surgically updates HAProxy
# We use Python natively on StarlingX because it's much safer than raw sed across multiple lines
cat << 'EOF' > /tmp/haproxy_patch.py
import re
import sys

config_path = "/etc/haproxy/haproxy.cfg"
domains = sys.argv[1]

with open(config_path, "r") as f:
    content = f.read()

# Replace the HTTP front ACL (Exact match using hdr(host) instead of hdr_end)
http_pattern = re.compile(r'acl is_k8s hdr(?:_end)?\(host\) -i [^\n]+')
content = http_pattern.sub(f'acl is_k8s hdr(host) -i {domains}', content)

# Replace the HTTPS front ACL (Exact match using req_ssl_sni -i instead of -m end)
https_pattern = re.compile(r'acl is_k8s req_ssl_sni(?: -m end)? -i [^\n]+')
content = https_pattern.sub(f'acl is_k8s req_ssl_sni -i {domains}', content)

with open(config_path, "w") as f:
    f.write(content)

print("HAProxy configuration surgically updated.")
EOF

# 3. Ship and execute over the SSH alias
log_info "Transmitting mutation to Edge Gateway (stx)..."
scp /tmp/haproxy_patch.py stx:/tmp/haproxy_patch.py
ssh stx "sudo python3 /tmp/haproxy_patch.py '$K8S_DOMAINS_STR' && sudo systemctl restart haproxy"

# Cleanup
rm /tmp/haproxy_patch.py
ssh stx "rm /tmp/haproxy_patch.py"

log_success "Edge Router fully synchronized. All root domains are now 100% sovereign to cPanel."
log_success "Kubernetes is restricted exactly to subaltern domains."
