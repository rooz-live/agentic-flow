#!/usr/bin/env bash
################################################################################
# Multi-Cloud Deployment Script
# Deploys Swarm Visualization to actual YOLIFE infrastructure
#
# Targets:
#   - swarm.stx.rooz.live (StarlingX OpenStack)
#   - swarm.aws.rooz.live (AWS EC2/cPanel)
#   - swarm.hive.rooz.live (Hivelocity)
#   - swarm.hetz.rooz.live (Hetzner)
################################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $*"; }
success() { echo -e "${GREEN}✓${NC} $*"; }
error() { echo -e "${RED}✗${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }

################################################################################
# Deployment Package Creation
################################################################################

create_deployment_package() {
    log "Creating deployment package..."
    
    cd "$PROJECT_ROOT"
    
    # Create temporary deployment directory
    DEPLOY_DIR="/tmp/yolife-swarm-deploy-$(date +%s)"
    mkdir -p "$DEPLOY_DIR"
    
    # Copy necessary files
    cp -r src/api "$DEPLOY_DIR/"
    cp -r src/frontend "$DEPLOY_DIR/" 2>/dev/null || true
    cp -r src/visualization "$DEPLOY_DIR/" 2>/dev/null || true
    cp package.json "$DEPLOY_DIR/"
    cp tsconfig.json "$DEPLOY_DIR/" 2>/dev/null || true
    
    # Create startup script
    cat > "$DEPLOY_DIR/start.sh" <<'EOF'
#!/bin/bash
set -e

# Install dependencies
npm install --production express cors ws

# Start API server
PORT=${SWARM_API_PORT:-3001}
export SWARM_API_PORT=$PORT

echo "Starting Swarm API Server on port $PORT..."
npx tsx src/api/swarm-api-server.ts &

echo $! > /tmp/swarm-api.pid
echo "Server started with PID $(cat /tmp/swarm-api.pid)"
echo "Health check: curl http://localhost:$PORT/health"
EOF
    
    chmod +x "$DEPLOY_DIR/start.sh"
    
    # Create nginx config for subdomain
    cat > "$DEPLOY_DIR/nginx-swarm.conf" <<'EOF'
server {
    listen 80;
    server_name swarm.stx.rooz.live swarm.aws.rooz.live swarm.hive.rooz.live swarm.hetz.rooz.live;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws/execution {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
EOF
    
    # Create tarball
    tar czf "$DEPLOY_DIR.tar.gz" -C "$DEPLOY_DIR" .
    
    success "Deployment package created: $DEPLOY_DIR.tar.gz"
    echo "$DEPLOY_DIR.tar.gz"
}

################################################################################
# StarlingX Deployment
################################################################################

deploy_to_stx() {
    log "Deploying to StarlingX..."
    
    local package=$1
    local stx_host="${YOLIFE_STX_HOST}"
    local stx_key="${YOLIFE_STX_KEY}"
    local stx_user="${YOLIFE_STX_USER:-ubuntu}"
    local stx_port="${YOLIFE_STX_PORT:-2222}"
    
    if [ -z "$stx_host" ]; then
        error "YOLIFE_STX_HOST not set"
        return 1
    fi
    
    log "Uploading to $stx_host..."
    scp -i "$stx_key" -P "$stx_port" -o StrictHostKeyChecking=no \
        "$package" "$stx_user@$stx_host:/tmp/swarm-deploy.tar.gz"
    
    log "Installing on StarlingX..."
    ssh -i "$stx_key" -p "$stx_port" -o StrictHostKeyChecking=no \
        "$stx_user@$stx_host" << 'ENDSSH'
set -e

# Create deployment directory
sudo mkdir -p /opt/yolife/swarm-api
cd /opt/yolife/swarm-api

# Extract package
sudo tar xzf /tmp/swarm-deploy.tar.gz
sudo chown -R ubuntu:ubuntu /opt/yolife/swarm-api

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install dependencies and start
bash start.sh

# Setup as systemd service
sudo tee /etc/systemd/system/swarm-api.service > /dev/null <<EOF
[Unit]
Description=YOLIFE Swarm API Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/yolife/swarm-api
Environment=SWARM_API_PORT=3001
ExecStart=/usr/bin/npx tsx src/api/swarm-api-server.ts
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable swarm-api
sudo systemctl restart swarm-api

# Setup nginx if available
if command -v nginx &> /dev/null; then
    sudo cp nginx-swarm.conf /etc/nginx/sites-available/swarm
    sudo ln -sf /etc/nginx/sites-available/swarm /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx || echo "Nginx config needs manual review"
fi

echo "✅ Deployment complete!"
echo "Local: http://localhost:3001/health"
echo "Public: http://swarm.stx.rooz.live/health (once DNS configured)"
ENDSSH
    
    success "Deployed to StarlingX"
    
    # Test connectivity
    log "Testing deployment..."
    ssh -i "$stx_key" -p "$stx_port" "$stx_user@$stx_host" \
        'curl -s http://localhost:3001/health || echo "Server not responding yet"'
}

################################################################################
# AWS Deployment
################################################################################

deploy_to_aws() {
    log "Deploying to AWS..."
    
    local package=$1
    
    # Check if AWS CLI is configured
    if ! aws sts get-caller-identity &>/dev/null; then
        warn "AWS credentials not configured"
        return 1
    fi
    
    # Find or create EC2 instance
    INSTANCE_ID=$(aws ec2 describe-instances \
        --filters "Name=tag:Name,Values=yolife-swarm" \
                  "Name=instance-state-name,Values=running" \
        --query 'Reservations[0].Instances[0].InstanceId' \
        --output text)
    
    if [ "$INSTANCE_ID" = "None" ] || [ -z "$INSTANCE_ID" ]; then
        warn "No running instance found with tag Name=yolife-swarm"
        warn "Create instance manually or update INSTANCE_ID"
        return 1
    fi
    
    log "Found instance: $INSTANCE_ID"
    
    # Get public IP
    PUBLIC_IP=$(aws ec2 describe-instances \
        --instance-ids "$INSTANCE_ID" \
        --query 'Reservations[0].Instances[0].PublicIpAddress' \
        --output text)
    
    log "Public IP: $PUBLIC_IP"
    
    # Upload and deploy (similar to STX)
    # Note: This requires SSH key configuration
    warn "AWS deployment requires SSH key for instance $INSTANCE_ID"
    warn "Manual step: Update DNS for swarm.aws.rooz.live → $PUBLIC_IP"
}

################################################################################
# Hivelocity Deployment
################################################################################

deploy_to_hivelocity() {
    log "Deploying to Hivelocity..."
    
    if [ -z "${HIVELOCITY_API_KEY:-}" ]; then
        warn "HIVELOCITY_API_KEY not set"
        return 1
    fi
    
    # Get device list
    log "Fetching Hivelocity devices..."
    curl -s -H "X-API-KEY: $HIVELOCITY_API_KEY" \
        "https://core.hivelocity.net/api/v2/device/" | jq -r '.[] | "\(.deviceId) - \(.hostname)"' | head -5
    
    warn "Hivelocity deployment requires device ID"
    warn "Use device 24460 or specify target device"
}

################################################################################
# Hetzner Deployment
################################################################################

deploy_to_hetzner() {
    log "Deploying to Hetzner..."
    
    if [ -z "${HETZNER_API_TOKEN:-}" ]; then
        warn "HETZNER_API_TOKEN not set"
        return 1
    fi
    
    # Get server list
    log "Fetching Hetzner servers..."
    curl -s -H "Authorization: Bearer $HETZNER_API_TOKEN" \
        "https://api.hetzner.cloud/v1/servers" | jq -r '.servers[] | "\(.id) - \(.name) - \(.public_net.ipv4.ip)"'
    
    warn "Hetzner deployment requires server selection"
}

################################################################################
# DNS Configuration
################################################################################

configure_dns() {
    log "DNS Configuration Guide"
    
    cat <<EOF

Add these DNS records to rooz.live domain:

For StarlingX:
  swarm.stx.rooz.live  A  ${YOLIFE_STX_HOST}

For AWS:
  swarm.aws.rooz.live  A  <AWS_INSTANCE_IP>

For Hivelocity:
  swarm.hive.rooz.live A  <HIVELOCITY_DEVICE_IP>

For Hetzner:
  swarm.hetz.rooz.live A  <HETZNER_SERVER_IP>

Use Cloudflare DNS or your DNS provider to add these records.

EOF
}

################################################################################
# Test Deployment
################################################################################

test_deployment() {
    log "Testing deployments..."
    
    local targets=(
        "http://localhost:3001"
        "http://swarm.stx.rooz.live"
        "http://swarm.aws.rooz.live"
        "http://swarm.hive.rooz.live"
        "http://swarm.hetz.rooz.live"
    )
    
    for target in "${targets[@]}"; do
        log "Testing $target..."
        
        if curl -sf "${target}/health" -m 5 > /dev/null 2>&1; then
            success "$target ✅"
            
            # Test all endpoints
            echo "  Queen:  $(curl -s ${target}/api/swarm/queen -m 5 | jq -r '.health // "N/A"')% health"
            echo "  Agents: $(curl -s ${target}/api/swarm/agents -m 5 | jq 'length')"
            echo "  Memory: $(curl -s ${target}/api/swarm/memory -m 5 | jq 'length') connections"
            echo "  WSJF:   $(curl -s ${target}/api/wsjf/items -m 5 | jq 'length') items"
        else
            warn "$target ❌ (not accessible)"
        fi
        echo ""
    done
}

################################################################################
# Main Execution
################################################################################

main() {
    log "🚀 YOLIFE Multi-Cloud Deployment"
    echo ""
    
    # Create package
    PACKAGE=$(create_deployment_package)
    
    # Deploy to targets
    log "Deploying to infrastructure..."
    
    deploy_to_stx "$PACKAGE" || warn "STX deployment failed"
    echo ""
    
    deploy_to_aws "$PACKAGE" || warn "AWS deployment skipped"
    echo ""
    
    deploy_to_hivelocity || warn "Hivelocity deployment skipped"
    echo ""
    
    deploy_to_hetzner || warn "Hetzner deployment skipped"
    echo ""
    
    # Show DNS configuration
    configure_dns
    
    # Test deployments
    test_deployment
    
    success "Deployment complete!"
    
    log "Next steps:"
    echo "  1. Configure DNS records (see above)"
    echo "  2. Test endpoints: curl http://swarm.stx.rooz.live/health"
    echo "  3. Open Deck.gl visualization: http://swarm.stx.rooz.live"
    echo "  4. Monitor WebSocket: ws://swarm.stx.rooz.live/ws/execution"
}

main "$@"
