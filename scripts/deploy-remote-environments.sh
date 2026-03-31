#!/usr/bin/env bash
################################################################################
# Remote Environment Deployment - Dev/Staging/Prod
# Multi-TLD Infrastructure with CapEx/OpEx Optimization
#
# Environments:
#   - dev.rooz.live (StarlingX STX)
#   - staging.rooz.live (AWS + Hivelocity)
#   - prod.rooz.live (Multi-cloud: AWS + Hivelocity + Hetzner)
#
# Usage:
#   bash scripts/deploy-remote-environments.sh <env> [options]
#
# Examples:
#   bash scripts/deploy-remote-environments.sh dev --full
#   bash scripts/deploy-remote-environments.sh staging --api-only
#   bash scripts/deploy-remote-environments.sh prod --blue-green
################################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $*"; }
success() { echo -e "${GREEN}✓${NC} $*"; }
error() { echo -e "${RED}✗${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }
info() { echo -e "${CYAN}ℹ${NC} $*"; }

# Configuration
ENVIRONMENT="${1:-dev}"
DEPLOY_MODE="${2:---full}"  # --full, --api-only, --frontend-only, --blue-green
BACKUP_ENABLED="${BACKUP_ENABLED:-true}"
HEALTH_CHECK_TIMEOUT=120
ROLLBACK_ON_FAILURE="${ROLLBACK_ON_FAILURE:-true}"

# Load environment-specific configs
load_environment_config() {
    local env=$1
    
    case "$env" in
        dev)
            export DEPLOY_HOST="stx.rooz.live"
            export DEPLOY_USER="ubuntu"
            export DEPLOY_PORT="2222"
            export DEPLOY_KEY="$HOME/pem/yolife_stx.pem"
            export DEPLOY_PATH="/opt/agentic-flow-dev"
            export API_PORT="3001"
            export FRONTEND_PORT="3000"
            export DATABASE_TIER="shared"
            export INSTANCE_SIZE="small"
            export PROVIDER="stx"
            ;;
        staging)
            export DEPLOY_HOST="staging.rooz.live"
            export DEPLOY_USER="ubuntu"
            export DEPLOY_PORT="22"
            export DEPLOY_KEY="$HOME/pem/aws_gitlab.pem"
            export DEPLOY_PATH="/opt/agentic-flow-staging"
            export API_PORT="3001"
            export FRONTEND_PORT="3000"
            export DATABASE_TIER="dedicated"
            export INSTANCE_SIZE="medium"
            export PROVIDER="aws"
            export SECONDARY_HOST="hive.rooz.live"  # Load balancing
            ;;
        prod)
            export DEPLOY_HOST="prod.rooz.live"
            export DEPLOY_USER="ubuntu"
            export DEPLOY_PORT="22"
            export DEPLOY_KEY="$HOME/pem/aws_gitlab.pem"
            export DEPLOY_PATH="/opt/agentic-flow-prod"
            export API_PORT="3001"
            export FRONTEND_PORT="443"  # HTTPS
            export DATABASE_TIER="ha-cluster"
            export INSTANCE_SIZE="large"
            export PROVIDER="multi-cloud"
            export LOAD_BALANCER="true"
            export CDN_ENABLED="true"
            export BACKUP_RETENTION="90d"
            ;;
        *)
            error "Unknown environment: $env"
            error "Valid environments: dev, staging, prod"
            exit 1
            ;;
    esac
    
    success "Configuration loaded for environment: $env"
    cat <<EOF
  Host: $DEPLOY_HOST
  Path: $DEPLOY_PATH
  API Port: $API_PORT
  Frontend Port: $FRONTEND_PORT
  Provider: $PROVIDER
  Instance Size: $INSTANCE_SIZE
  Database Tier: $DATABASE_TIER
EOF
}

################################################################################
# Pre-Deployment Checks
################################################################################

pre_deployment_checks() {
    log "Running pre-deployment checks..."
    
    # Check SSH connectivity
    if ! ssh -i "$DEPLOY_KEY" -p "$DEPLOY_PORT" -o ConnectTimeout=10 "$DEPLOY_USER@$DEPLOY_HOST" "echo 'SSH OK'" 2>/dev/null; then
        error "SSH connection failed to $DEPLOY_HOST"
        return 1
    fi
    success "SSH connectivity verified"
    
    # Check Git status
    if [[ -n "$(git status --porcelain)" ]]; then
        warn "Uncommitted changes detected"
        if [ "$ENVIRONMENT" = "prod" ]; then
            error "Cannot deploy to production with uncommitted changes"
            return 1
        fi
    fi
    success "Git status clean"
    
    # Check Node.js version
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        error "Node.js 18+ required (current: $node_version)"
        return 1
    fi
    success "Node.js version: v$node_version"
    
    # Check dependencies
    if [ ! -d "node_modules" ]; then
        warn "node_modules not found, installing..."
        npm ci
    fi
    success "Dependencies installed"
    
    # Run tests for staging/prod
    if [[ "$ENVIRONMENT" != "dev" ]]; then
        log "Running test suite..."
        if ! npm test --silent; then
            error "Tests failed"
            return 1
        fi
        success "All tests passed"
    fi
    
    # Check disk space on remote
    local available_space=$(ssh -i "$DEPLOY_KEY" -p "$DEPLOY_PORT" "$DEPLOY_USER@$DEPLOY_HOST" \
        "df -h $DEPLOY_PATH 2>/dev/null | tail -1 | awk '{print \$4}' || echo '0G'")
    info "Available disk space: $available_space"
    
    success "Pre-deployment checks passed"
}

################################################################################
# Build Phase
################################################################################

build_application() {
    log "Building application for $ENVIRONMENT..."
    
    # Set environment variables
    export NODE_ENV=$ENVIRONMENT
    export NEXT_PUBLIC_API_URL="https://api.$ENVIRONMENT.rooz.live"
    export NEXT_PUBLIC_WS_URL="wss://api.$ENVIRONMENT.rooz.live/ws"
    
    # Clean previous build
    rm -rf .next dist build
    
    # Build frontend
    if [[ "$DEPLOY_MODE" != "--api-only" ]]; then
        log "Building frontend..."
        npm run build
        success "Frontend built"
    fi
    
    # Build API
    if [[ "$DEPLOY_MODE" != "--frontend-only" ]]; then
        log "Building API server..."
        npx tsc --project tsconfig.server.json
        success "API server built"
    fi
    
    # Generate deployment manifest
    cat > deployment-manifest.json <<EOF
{
  "environment": "$ENVIRONMENT",
  "version": "$(git describe --tags --always)",
  "commit": "$(git rev-parse HEAD)",
  "branch": "$(git branch --show-current)",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "deployed_by": "$(whoami)",
  "build_id": "$(date +%s)"
}
EOF
    
    success "Build completed"
}

################################################################################
# Backup Current Deployment
################################################################################

backup_current_deployment() {
    if [ "$BACKUP_ENABLED" != "true" ]; then
        return 0
    fi
    
    log "Creating backup of current deployment..."
    
    local backup_name="backup-$(date +%Y%m%d-%H%M%S)"
    local backup_path="/opt/backups/agentic-flow/$backup_name"
    
    ssh -i "$DEPLOY_KEY" -p "$DEPLOY_PORT" "$DEPLOY_USER@$DEPLOY_HOST" <<EOF
        mkdir -p "$backup_path"
        
        # Backup application files
        if [ -d "$DEPLOY_PATH" ]; then
            rsync -a "$DEPLOY_PATH/" "$backup_path/"
            echo "✓ Application files backed up"
        fi
        
        # Backup database (if applicable)
        if [ -f "$DEPLOY_PATH/data/production.db" ]; then
            cp "$DEPLOY_PATH/data/production.db" "$backup_path/"
            echo "✓ Database backed up"
        fi
        
        # Backup nginx config
        if [ -f "/etc/nginx/sites-available/agentic-flow" ]; then
            cp "/etc/nginx/sites-available/agentic-flow" "$backup_path/"
            echo "✓ Nginx config backed up"
        fi
        
        # Create backup metadata
        cat > "$backup_path/backup-metadata.json" <<METADATA
{
  "backup_time": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "$ENVIRONMENT",
  "deployment_path": "$DEPLOY_PATH",
  "backed_up_by": "$(whoami)"
}
METADATA
        
        echo "$backup_path"
EOF
    
    success "Backup created: $backup_name"
    echo "$backup_name" > /tmp/last_backup_name
}

################################################################################
# Deploy Application
################################################################################

deploy_application() {
    log "Deploying to $ENVIRONMENT..."
    
    # Create deployment directory
    ssh -i "$DEPLOY_KEY" -p "$DEPLOY_PORT" "$DEPLOY_USER@$DEPLOY_HOST" \
        "sudo mkdir -p $DEPLOY_PATH && sudo chown $DEPLOY_USER:$DEPLOY_USER $DEPLOY_PATH"
    
    # Upload files
    log "Uploading application files..."
    rsync -avz --delete \
        -e "ssh -i $DEPLOY_KEY -p $DEPLOY_PORT" \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude '.next' \
        --exclude 'dist' \
        --exclude 'coverage' \
        --exclude '.env.local' \
        ./ "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/"
    
    success "Files uploaded"
    
    # Install dependencies on remote
    log "Installing dependencies on remote..."
    ssh -i "$DEPLOY_KEY" -p "$DEPLOY_PORT" "$DEPLOY_USER@$DEPLOY_HOST" <<EOF
        cd $DEPLOY_PATH
        
        # Install Node.js dependencies
        npm ci --production
        
        # Install Claude Flow v3
        npm install claude-flow@v3alpha
        
        # Create .env file
        cat > .env <<ENVFILE
NODE_ENV=$ENVIRONMENT
API_PORT=$API_PORT
FRONTEND_PORT=$FRONTEND_PORT
DATABASE_URL=file:./data/production.db
SWARM_API_PORT=$API_PORT
ANTHROPIC_API_KEY=\${ANTHROPIC_API_KEY}
AWS_ACCESS_KEY_ID=\${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=\${AWS_SECRET_ACCESS_KEY}
HIVELOCITY_API_KEY=\${HIVELOCITY_API_KEY}
ENVFILE
        
        # Initialize Claude Flow
        npx claude-flow@v3alpha init --force
        npx claude-flow@v3alpha config set --key api.port --value $API_PORT
        npx claude-flow@v3alpha config set --key memory.backend --value hnsw
        
        echo "✓ Dependencies installed"
EOF
    
    success "Dependencies installed on remote"
}

################################################################################
# Configure Services
################################################################################

configure_services() {
    log "Configuring systemd services..."
    
    ssh -i "$DEPLOY_KEY" -p "$DEPLOY_PORT" "$DEPLOY_USER@$DEPLOY_HOST" <<'EOF'
        # API Service
        sudo tee /etc/systemd/system/agentic-flow-api.service > /dev/null <<SERVICE
[Unit]
Description=Agentic Flow API Server
After=network.target

[Service]
Type=simple
User=$DEPLOY_USER
WorkingDirectory=$DEPLOY_PATH
Environment="NODE_ENV=$ENVIRONMENT"
Environment="PORT=$API_PORT"
ExecStart=/usr/bin/node $DEPLOY_PATH/src/api/swarm-api-server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICE

        # Claude Flow Daemon Service
        sudo tee /etc/systemd/system/claude-flow-daemon.service > /dev/null <<SERVICE
[Unit]
Description=Claude Flow Daemon
After=network.target

[Service]
Type=simple
User=$DEPLOY_USER
WorkingDirectory=$DEPLOY_PATH
ExecStart=/usr/bin/npx claude-flow@v3alpha daemon start --memory-backend=hnsw
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICE

        # Reload systemd
        sudo systemctl daemon-reload
        
        echo "✓ Services configured"
EOF
    
    success "Services configured"
}

################################################################################
# Configure Nginx
################################################################################

configure_nginx() {
    log "Configuring Nginx..."
    
    ssh -i "$DEPLOY_KEY" -p "$DEPLOY_PORT" "$DEPLOY_USER@$DEPLOY_HOST" <<EOF
        sudo tee /etc/nginx/sites-available/agentic-flow-$ENVIRONMENT > /dev/null <<'NGINX'
# Agentic Flow - $ENVIRONMENT Environment
upstream api_backend {
    server 127.0.0.1:$API_PORT;
    keepalive 64;
}

upstream ws_backend {
    server 127.0.0.1:$API_PORT;
}

# Rate limiting
limit_req_zone \\\$binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone \\\$binary_remote_addr zone=ws_limit:10m rate=5r/s;

server {
    listen 80;
    listen [::]:80;
    server_name $ENVIRONMENT.rooz.live api.$ENVIRONMENT.rooz.live;
    
    # Redirect to HTTPS
    return 301 https://\\\$server_name\\\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.$ENVIRONMENT.rooz.live;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/$ENVIRONMENT.rooz.live/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$ENVIRONMENT.rooz.live/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # API endpoints
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        proxy_cache_bypass \\\$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # WebSocket endpoint
    location /ws/ {
        limit_req zone=ws_limit burst=10 nodelay;
        
        proxy_pass http://ws_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        
        # WebSocket timeouts
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
    
    # Health check
    location /health {
        access_log off;
        proxy_pass http://api_backend/health;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $ENVIRONMENT.rooz.live;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/$ENVIRONMENT.rooz.live/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$ENVIRONMENT.rooz.live/privkey.pem;
    
    root $DEPLOY_PATH/public;
    index index.html;
    
    # Frontend static files
    location / {
        try_files \\\$uri \\\$uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINX

        # Enable site
        sudo ln -sf /etc/nginx/sites-available/agentic-flow-$ENVIRONMENT /etc/nginx/sites-enabled/
        
        # Test nginx config
        sudo nginx -t
        
        # Reload nginx
        sudo systemctl reload nginx
        
        echo "✓ Nginx configured"
EOF
    
    success "Nginx configured"
}

################################################################################
# SSL Certificates
################################################################################

setup_ssl_certificates() {
    if [ "$ENVIRONMENT" = "dev" ]; then
        warn "Skipping SSL for dev environment"
        return 0
    fi
    
    log "Setting up SSL certificates..."
    
    ssh -i "$DEPLOY_KEY" -p "$DEPLOY_PORT" "$DEPLOY_USER@$DEPLOY_HOST" <<EOF
        # Install certbot if not present
        if ! command -v certbot &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y certbot python3-certbot-nginx
        fi
        
        # Obtain certificate
        sudo certbot certonly --nginx \
            -d $ENVIRONMENT.rooz.live \
            -d api.$ENVIRONMENT.rooz.live \
            --non-interactive \
            --agree-tos \
            --email admin@rooz.live
        
        # Auto-renewal cron job
        if ! sudo crontab -l 2>/dev/null | grep -q "certbot renew"; then
            (sudo crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet") | sudo crontab -
        fi
        
        echo "✓ SSL certificates configured"
EOF
    
    success "SSL certificates configured"
}

################################################################################
# Start Services
################################################################################

start_services() {
    log "Starting services..."
    
    ssh -i "$DEPLOY_KEY" -p "$DEPLOY_PORT" "$DEPLOY_USER@$DEPLOY_HOST" <<EOF
        cd $DEPLOY_PATH
        
        # Start API service
        sudo systemctl enable agentic-flow-api
        sudo systemctl restart agentic-flow-api
        
        # Start Claude Flow daemon
        sudo systemctl enable claude-flow-daemon
        sudo systemctl restart claude-flow-daemon
        
        # Check status
        sleep 5
        
        if sudo systemctl is-active --quiet agentic-flow-api; then
            echo "✓ API service started"
        else
            echo "✗ API service failed to start"
            sudo journalctl -u agentic-flow-api -n 20
            exit 1
        fi
        
        if sudo systemctl is-active --quiet claude-flow-daemon; then
            echo "✓ Claude Flow daemon started"
        else
            echo "✗ Claude Flow daemon failed to start"
            sudo journalctl -u claude-flow-daemon -n 20
            exit 1
        fi
EOF
    
    success "Services started"
}

################################################################################
# Health Checks
################################################################################

health_check() {
    log "Running health checks (timeout: ${HEALTH_CHECK_TIMEOUT}s)..."
    
    local api_url="https://api.$ENVIRONMENT.rooz.live/health"
    local start_time=$(date +%s)
    local healthy=false
    
    while [ $(($(date +%s) - start_time)) -lt $HEALTH_CHECK_TIMEOUT ]; do
        if curl -sf "$api_url" > /dev/null 2>&1; then
            healthy=true
            break
        fi
        sleep 5
    done
    
    if [ "$healthy" = "true" ]; then
        success "Health check passed"
        
        # Detailed health check
        local health_response=$(curl -s "$api_url")
        echo "$health_response" | jq . 2>/dev/null || echo "$health_response"
        
        return 0
    else
        error "Health check failed after ${HEALTH_CHECK_TIMEOUT}s"
        return 1
    fi
}

################################################################################
# Smoke Tests
################################################################################

run_smoke_tests() {
    log "Running smoke tests..."
    
    local api_base="https://api.$ENVIRONMENT.rooz.live"
    local tests_passed=0
    local tests_failed=0
    
    # Test 1: Health endpoint
    if curl -sf "$api_base/health" > /dev/null; then
        success "Health endpoint OK"
        ((tests_passed++))
    else
        error "Health endpoint failed"
        ((tests_failed++))
    fi
    
    # Test 2: Queen status
    if curl -sf "$api_base/api/swarm/queen" > /dev/null; then
        success "Queen status endpoint OK"
        ((tests_passed++))
    else
        error "Queen status endpoint failed"
        ((tests_failed++))
    fi
    
    # Test 3: WebSocket connection
    if wscat -c "wss://api.$ENVIRONMENT.rooz.live/ws/execution" --execute "ping" 2>/dev/null | grep -q "pong"; then
        success "WebSocket connection OK"
        ((tests_passed++))
    else
        warn "WebSocket test skipped (wscat not installed)"
    fi
    
    info "Smoke tests: $tests_passed passed, $tests_failed failed"
    
    if [ $tests_failed -gt 0 ]; then
        return 1
    fi
    return 0
}

################################################################################
# Rollback
################################################################################

rollback_deployment() {
    local backup_name=$(cat /tmp/last_backup_name 2>/dev/null || echo "")
    
    if [ -z "$backup_name" ]; then
        error "No backup found for rollback"
        return 1
    fi
    
    warn "Rolling back to backup: $backup_name"
    
    ssh -i "$DEPLOY_KEY" -p "$DEPLOY_PORT" "$DEPLOY_USER@$DEPLOY_HOST" <<EOF
        local backup_path="/opt/backups/agentic-flow/$backup_name"
        
        if [ ! -d "$backup_path" ]; then
            echo "✗ Backup not found: $backup_path"
            exit 1
        fi
        
        # Stop services
        sudo systemctl stop agentic-flow-api claude-flow-daemon
        
        # Restore files
        rsync -a "$backup_path/" "$DEPLOY_PATH/"
        
        # Restart services
        sudo systemctl start agentic-flow-api claude-flow-daemon
        
        echo "✓ Rollback completed"
EOF
    
    success "Rollback completed"
}

################################################################################
# Post-Deployment Notifications
################################################################################

send_deployment_notification() {
    local status=$1
    local duration=$2
    
    if [ -z "${SLACK_WEBHOOK:-}" ]; then
        return 0
    fi
    
    local color="good"
    local emoji="✅"
    if [ "$status" = "failed" ]; then
        color="danger"
        emoji="❌"
    fi
    
    local commit=$(git rev-parse --short HEAD)
    local version=$(git describe --tags --always)
    
    curl -X POST "$SLACK_WEBHOOK" \
        -H 'Content-Type: application/json' \
        -d "{
            \"attachments\": [{
                \"color\": \"$color\",
                \"title\": \"$emoji Deployment to $ENVIRONMENT\",
                \"text\": \"Status: $status\",
                \"fields\": [
                    {\"title\": \"Environment\", \"value\": \"$ENVIRONMENT\", \"short\": true},
                    {\"title\": \"Version\", \"value\": \"$version\", \"short\": true},
                    {\"title\": \"Commit\", \"value\": \"$commit\", \"short\": true},
                    {\"title\": \"Duration\", \"value\": \"${duration}s\", \"short\": true},
                    {\"title\": \"Deployed By\", \"value\": \"$(whoami)\", \"short\": true},
                    {\"title\": \"URL\", \"value\": \"https://$ENVIRONMENT.rooz.live\", \"short\": true}
                ],
                \"footer\": \"Agentic Flow CI/CD\",
                \"ts\": $(date +%s)
            }]
        }" 2>/dev/null || true
}

################################################################################
# Main Execution
################################################################################

main() {
    local start_time=$(date +%s)
    
    log "🚀 Starting deployment to $ENVIRONMENT"
    echo ""
    
    # Load configuration
    load_environment_config "$ENVIRONMENT"
    echo ""
    
    # Pre-deployment checks
    if ! pre_deployment_checks; then
        error "Pre-deployment checks failed"
        exit 1
    fi
    echo ""
    
    # Build application
    build_application
    echo ""
    
    # Backup current deployment
    backup_current_deployment
    echo ""
    
    # Deploy
    if ! deploy_application; then
        error "Deployment failed"
        if [ "$ROLLBACK_ON_FAILURE" = "true" ]; then
            rollback_deployment
        fi
        exit 1
    fi
    echo ""
    
    # Configure services
    configure_services
    echo ""
    
    # Configure Nginx
    configure_nginx
    echo ""
    
    # Setup SSL
    setup_ssl_certificates
    echo ""
    
    # Start services
    if ! start_services; then
        error "Failed to start services"
        if [ "$ROLLBACK_ON_FAILURE" = "true" ]; then
            rollback_deployment
        fi
        exit 1
    fi
    echo ""
    
    # Health checks
    if ! health_check; then
        error "Health checks failed"
        if [ "$ROLLBACK_ON_FAILURE" = "true" ]; then
            rollback_deployment
        fi
        exit 1
    fi
    echo ""
    
    # Smoke tests
    if ! run_smoke_tests; then
        warn "Some smoke tests failed"
    fi
    echo ""
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    success "Deployment completed in ${duration}s"
    send_deployment_notification "success" "$duration"
    
    info "URLs:"
    info "  Frontend: https://$ENVIRONMENT.rooz.live"
    info "  API: https://api.$ENVIRONMENT.rooz.live"
    info "  Health: https://api.$ENVIRONMENT.rooz.live/health"
}

# Trap errors
trap 'error "Deployment failed at line $LINENO"' ERR

main "$@"
