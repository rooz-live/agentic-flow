#!/usr/bin/env bash
set -euo pipefail

# Deploy Agent Skills Discovery (Cloudflare RFC)
# Publishes index.json + SKILL.md files to /.well-known/agent-skills/ on the server
# Ref: https://github.com/cloudflare/agent-skills-discovery-rfc

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SSH_HOST="${CPANEL_SSH_HOST:-rooz-aws}"
WEBROOT="/home/tag/public_html"
SKILLS_DIR="$WEBROOT/.well-known/agent-skills"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}Deploying Agent Skills Discovery to $SSH_HOST...${NC}"

# Validate index.json
echo "  Validating index.json..."
python3 -c "import json; json.load(open('$SCRIPT_DIR/index.json'))" || { echo "Invalid JSON"; exit 1; }

# Create remote directory structure
echo "  Creating remote directories..."
ssh -o ConnectTimeout=10 -o BatchMode=yes "$SSH_HOST" "sudo mkdir -p $SKILLS_DIR"

# Upload index.json
echo "  Uploading index.json..."
scp -o ConnectTimeout=10 "$SCRIPT_DIR/index.json" "/tmp/agent-skills-index.json"
ssh -o ConnectTimeout=10 -o BatchMode=yes "$SSH_HOST" \
    "sudo mv /tmp/agent-skills-index.json $SKILLS_DIR/index.json && sudo chown tag:tag $SKILLS_DIR/index.json"

# Generate and upload SKILL.md for each skill
echo "  Generating SKILL.md files..."

generate_skill() {
    local name="$1" desc="$2" playbook="$3" script="$4"
    cat <<SKILL_EOF
---
name: $name
description: $desc
---

# $name

$desc

## Quick Start

\`\`\`bash
# Via Ansible playbook
cd scripts/infra/ansible
ansible-playbook playbooks/$playbook

# Via shell script
scripts/infra/$script
\`\`\`

## Requirements
- SSH access to target server (configured in ~/.ssh/config)
- Ansible 2.20+ (for playbook execution)
- Credentials sourced from scripts/infra/credentials/.env.cpanel
SKILL_EOF
}

declare -A SKILLS=(
    ["cpanel-health-check"]="Check cPanel server health|cpanel-health.yml|cpanel/cpanel-ssl-manager.sh check all"
    ["cpanel-firewall-audit"]="Audit CSF firewall rules|cpanel-firewall.yml|whm/whm-firewall-check.sh"
    ["cpanel-ssl-management"]="Manage SSL certificates|cpanel-ssl-renew.yml|cpanel/cpanel-ssl-manager.sh"
    ["cpanel-dns-management"]="Manage DNS records|cpanel-health.yml|cpanel/cpanel-dns-zone.sh"
    ["stx-health-check"]="Check StarlingX health|stx-health.yml|stx/stx-ssh-probe.sh"
    ["nginx-proxy-management"]="Deploy Nginx proxy configs|cpanel-health.yml|nginx/setup_multitenant_nginx.sh"
    ["macos-dev-environment"]="Verify macOS dev environment|macos-dev-env.yml|security/scan-local.sh"
    ["security-scanning"]="Run security scans|macos-dev-env.yml|security/scan-local.sh"
)

for skill_name in "${!SKILLS[@]}"; do
    IFS='|' read -r desc playbook script <<< "${SKILLS[$skill_name]}"
    skill_dir="$SKILLS_DIR/$skill_name"

    ssh -o ConnectTimeout=10 -o BatchMode=yes "$SSH_HOST" "sudo mkdir -p $skill_dir"

    generate_skill "$skill_name" "$desc" "$playbook" "$script" > "/tmp/SKILL-$skill_name.md"
    scp -o ConnectTimeout=10 "/tmp/SKILL-$skill_name.md" "/tmp/skill-upload.md"
    ssh -o ConnectTimeout=10 -o BatchMode=yes "$SSH_HOST" \
        "sudo mv /tmp/skill-upload.md $skill_dir/SKILL.md && sudo chown tag:tag $skill_dir/SKILL.md"

    echo "  ✓ $skill_name"
    rm -f "/tmp/SKILL-$skill_name.md"
done

# Update digests in index.json
echo "  Updating digests..."
ssh -o ConnectTimeout=10 -o BatchMode=yes "$SSH_HOST" "
    for dir in $SKILLS_DIR/*/; do
        skill=\$(basename \$dir)
        digest=\$(sha256sum \$dir/SKILL.md 2>/dev/null | cut -d' ' -f1)
        [ -n \"\$digest\" ] && sudo sed -i \"s|\\(\\\"name\\\": \\\"\$skill\\\".*digest\\\": \\\"\\)sha256:pending\\\"|\\1sha256:\$digest\\\"|\" $SKILLS_DIR/index.json
    done
"

# Verify
echo ""
echo -e "${GREEN}Verifying deployment...${NC}"
STATUS=$(curl -so /dev/null -w "%{http_code}" --connect-timeout 5 "https://yo.tag.ooo/.well-known/agent-skills/index.json" 2>/dev/null)
echo -e "  https://yo.tag.ooo/.well-known/agent-skills/index.json: ${GREEN}$STATUS${NC}"
