#!/bin/bash
set -euo pipefail

# Agentic Flow - Domain Deployment Script
# Deploy to: stx-aio-0.corp.interface.tag.ooo

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Configuration
DEPLOY_USER="agentic-flow"
DEPLOY_PATH="/opt/agentic-flow"
STX_HOST="${STX_HOST:-stx-aio-0.corp.interface.tag.ooo}"
AWS_HOST="${AWS_HOST:-}"
DOMAINS=("decisioncall.com" "analytics.interface.tag.ooo" "half.masslessmassive.com" "multi.masslessmassive.com")

echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║           Agentic Flow - Multitenant Deployment                  ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# Check SSH connectivity
if ! ssh -o ConnectTimeout=5 "$STX_HOST" "echo 'Connected'" 2>/dev/null; then
    echo "❌ Cannot connect to $STX_HOST"
    echo "   Set up SSH access with: ssh-copy-id $STX_HOST"
    exit 1
fi

echo "✓ Connected to $STX_HOST"

# 1. Create deployment user and directories
echo ""
echo "[1/7] Creating deployment user and directories..."
ssh "$STX_HOST" "sudo bash" <<'EOF'
    # Create user if not exists
    if ! id agentic-flow &>/dev/null; then
        useradd -m -s /bin/bash agentic-flow
        echo "Created user: agentic-flow"
    fi
    
    # Create directories
    mkdir -p /opt/agentic-flow/{scripts,templates,static,.goalie}
    mkdir -p /var/log/agentic-flow
    chown -R agentic-flow:agentic-flow /opt/agentic-flow /var/log/agentic-flow
    echo "✓ Directories created"
EOF

# 2. Upload application files
echo ""
echo "[2/7] Uploading application files..."
rsync -avz --exclude='.git' --exclude='*.pyc' --exclude='__pycache__' \
    "$PROJECT_ROOT/" "$STX_HOST:$DEPLOY_PATH/"

ssh "$STX_HOST" "sudo chown -R agentic-flow:agentic-flow $DEPLOY_PATH"
echo "✓ Files uploaded"

# 3. Set up Python virtual environment
echo ""
echo "[3/7] Setting up Python environment..."
ssh "$STX_HOST" "sudo su - agentic-flow" <<'EOF'
    cd /opt/agentic-flow
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install flask flask-socketio gunicorn eventlet
    pip install requests psutil pandas plotly pyyaml
    echo "✓ Python environment ready"
EOF

# 4. Install and configure Nginx
echo ""
echo "[4/7] Configuring Nginx..."
ssh "$STX_HOST" "sudo bash" <<EOF
    # Install Nginx if not present
    if ! command -v nginx &>/dev/null; then
        apt-get update && apt-get install -y nginx
    fi
    
    # Copy Nginx config
    cp $DEPLOY_PATH/scripts/deploy/nginx_config.conf /etc/nginx/sites-available/agentic-flow
    ln -sf /etc/nginx/sites-available/agentic-flow /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Test config
    nginx -t
    echo "✓ Nginx configured"
EOF

# 5. Set up SSL certificates
echo ""
echo "[5/7] Setting up SSL certificates..."
echo "Manual step required: Run certbot for each domain:"
for domain in "${DOMAINS[@]}"; do
    echo "  sudo certbot --nginx -d $domain"
done
read -p "Press Enter after SSL certificates are configured..."

# 6. Install systemd service
echo ""
echo "[6/7] Installing systemd service..."
ssh "$STX_HOST" "sudo bash" <<'EOF'
    cp /opt/agentic-flow/scripts/deploy/systemd_dashboard.service /etc/systemd/system/agentic-flow.service
    
    # Generate secure secret key
    SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
    sed -i "s/<REPLACE_WITH_SECURE_KEY>/$SECRET_KEY/" /etc/systemd/system/agentic-flow.service
    
    systemctl daemon-reload
    systemctl enable agentic-flow.service
    systemctl start agentic-flow.service
    
    echo "✓ Service installed and started"
EOF

# 7. Reload Nginx
echo ""
echo "[7/7] Reloading Nginx..."
ssh "$STX_HOST" "sudo systemctl reload nginx"
echo "✓ Nginx reloaded"

# Verify deployment
echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                    Deployment Complete                            ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""
echo "Access your dashboards:"
for domain in "${DOMAINS[@]}"; do
    echo "  • https://$domain"
done
echo ""
echo "Check status:"
echo "  ssh $STX_HOST 'sudo systemctl status agentic-flow'"
echo "  ssh $STX_HOST 'sudo tail -f /var/log/agentic-flow/error.log'"
