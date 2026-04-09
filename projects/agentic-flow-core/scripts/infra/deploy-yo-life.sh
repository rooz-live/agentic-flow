#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════════
# yo.life Unified Deployment Script
# Supports: Caddy (WSJF 9.33), Nginx+Certbot (WSJF 5.2), K8s (WSJF 1.8)
# ════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ════════════════════════════════════════════════════════════════════════════
# Configuration
# ════════════════════════════════════════════════════════════════════════════

DOMAIN="${DOMAIN:-yo.life}"
DEPLOY_MODE="${DEPLOY_MODE:-caddy}"  # caddy, nginx, k8s
VPS_IP="${VPS_IP:-}"
APP_PORT="${APP_PORT:-3000}"
DEPLOY_USER="${DEPLOY_USER:-yolife}"
REPO_URL="${REPO_URL:-https://github.com/yourusername/agentic-flow-core.git}"
HOSTBILL_ENABLED="${HOSTBILL_ENABLED:-false}"
STX_ENABLED="${STX_ENABLED:-false}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ════════════════════════════════════════════════════════════════════════════
# Utility Functions
# ════════════════════════════════════════════════════════════════════════════

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
    fi
}

detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$ID
        VER=$VERSION_ID
    else
        log_error "Cannot detect OS"
    fi
    log_info "Detected OS: $OS $VER"
}

# ════════════════════════════════════════════════════════════════════════════
# Deployment Mode Selection
# ════════════════════════════════════════════════════════════════════════════

show_menu() {
    cat << EOF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 yo.life Deployment Menu (WSJF-Optimized)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Select Deployment Strategy:

1. 🎯 Caddy (WSJF 9.33) - Recommended
   ✓ Auto HTTPS, Zero Config SSL
   ✓ Modern, Fast, Simple
   ✓ Best for: Quick production deployment

2. 🔧 Nginx + Certbot (WSJF 5.2) - Enterprise
   ✓ Production Standard
   ✓ Advanced Tuning
   ✓ Best for: High-traffic, custom configs

3. ☸️  Kubernetes (WSJF 1.8) - Overkill
   ⚠️  Complex, High Overhead
   ✓ Best for: Multi-service orchestration

4. 🏢 HostBill Integration
   ✓ Billing + Client Management
   ✓ Best for: Service providers

5. 🌟 StarlingX (STX) Deployment
   ✓ Edge + Cloud Infrastructure
   ✓ Best for: Distributed systems

0. Exit

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
    read -rp "Enter choice [0-5]: " choice
    echo "$choice"
}

# ════════════════════════════════════════════════════════════════════════════
# 1. CADDY DEPLOYMENT (WSJF 9.33 - HIGHEST PRIORITY)
# ════════════════════════════════════════════════════════════════════════════

deploy_caddy() {
    log_info "Starting Caddy deployment (WSJF 9.33)..."
    
    # Install Caddy
    log_info "Installing Caddy..."
    apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | \
        gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | \
        tee /etc/apt/sources.list.d/caddy-stable.list
    apt update
    apt install -y caddy
    
    # Deploy application
    setup_application
    
    # Configure Caddy
    log_info "Configuring Caddy with auto HTTPS..."
    cat > /etc/caddy/Caddyfile << EOF
# yo.life Caddy Configuration (Auto HTTPS)
${DOMAIN}, www.${DOMAIN} {
    # Automatic HTTPS with Let's Encrypt
    tls admin@${DOMAIN}
    
    # Reverse proxy to Node.js app
    reverse_proxy localhost:${APP_PORT} {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
    
    # Security headers
    header {
        X-Frame-Options SAMEORIGIN
        X-Content-Type-Options nosniff
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
    }
    
    # WebSocket support (for agentic-flow real-time)
    @websocket {
        header Connection *Upgrade*
        header Upgrade websocket
    }
    handle @websocket {
        reverse_proxy localhost:${APP_PORT}
    }
    
    # Rate limiting
    rate_limit {
        zone dynamic {
            key {remote_host}
            events 100
            window 1m
        }
    }
    
    # Logging
    log {
        output file /var/log/caddy/yo.life.log {
            roll_size 100mb
            roll_keep 14
        }
    }
    
    # Health check endpoint
    handle /health {
        respond "healthy" 200
    }
}

# Redirect www to non-www (optional)
www.${DOMAIN} {
    redir https://${DOMAIN}{uri} permanent
}
EOF
    
    # Start Caddy
    systemctl enable caddy
    systemctl restart caddy
    
    log_success "Caddy deployed successfully!"
    log_info "Site: https://${DOMAIN}"
    log_info "Auto HTTPS: ✓ Enabled (Let's Encrypt)"
}

# ════════════════════════════════════════════════════════════════════════════
# 2. NGINX + CERTBOT DEPLOYMENT (WSJF 5.2)
# ════════════════════════════════════════════════════════════════════════════

deploy_nginx() {
    log_info "Starting Nginx + Certbot deployment (WSJF 5.2)..."
    
    # Install dependencies
    apt update
    apt install -y nginx certbot python3-certbot-nginx
    
    # Deploy application
    setup_application
    
    # Configure Nginx
    log_info "Configuring Nginx reverse proxy..."
    cat > /etc/nginx/sites-available/${DOMAIN} << 'EOF'
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=yolife_limit:10m rate=10r/s;
limit_conn_zone $binary_remote_addr zone=yolife_conn:10m;

# Upstream Node.js application
upstream yo_life_backend {
    least_conn;
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# HTTP → HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name yo.life www.yo.life;
    
    # Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Redirect all HTTP to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yo.life www.yo.life;
    
    # SSL certificates (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/yo.life/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yo.life/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/yo.life/chain.pem;
    
    # SSL configuration (Mozilla Intermediate)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Rate limiting
    limit_req zone=yolife_limit burst=20 nodelay;
    limit_conn yolife_conn 10;
    
    # Logging
    access_log /var/log/nginx/yo.life.access.log;
    error_log /var/log/nginx/yo.life.error.log warn;
    
    # Proxy to Node.js app
    location / {
        proxy_pass http://yo_life_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffering off;
        proxy_request_buffering off;
    }
    
    # WebSocket support
    location /ws {
        proxy_pass http://yo_life_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
    
    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # Static assets caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
    
    # Enable site
    ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/
    nginx -t
    systemctl restart nginx
    
    # Get SSL certificate
    log_info "Obtaining Let's Encrypt SSL certificate..."
    certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} \
        --non-interactive --agree-tos \
        --email admin@${DOMAIN} \
        --redirect
    
    log_success "Nginx + Certbot deployed successfully!"
    log_info "Site: https://${DOMAIN}"
}

# ════════════════════════════════════════════════════════════════════════════
# 3. KUBERNETES DEPLOYMENT (WSJF 1.8 - LOWEST PRIORITY)
# ════════════════════════════════════════════════════════════════════════════

deploy_kubernetes() {
    log_warn "K8s deployment has WSJF 1.8 (overkill for yo.life)"
    log_info "Deploying to Kubernetes cluster..."
    
    # Deploy application
    setup_application
    
    # Create K8s manifests
    mkdir -p /tmp/yo-life-k8s
    
    # Deployment
    cat > /tmp/yo-life-k8s/deployment.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: yo-life
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: yo-life
  template:
    metadata:
      labels:
        app: yo-life
    spec:
      containers:
      - name: yo-life
        image: node:18-alpine
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: production
        - name: PORT
          value: "3000"
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: yo-life-service
spec:
  selector:
    app: yo-life
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: yo-life-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - ${DOMAIN}
    secretName: yo-life-tls
  rules:
  - host: ${DOMAIN}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: yo-life-service
            port:
              number: 80
EOF
    
    kubectl apply -f /tmp/yo-life-k8s/deployment.yaml
    log_success "K8s deployment applied"
}

# ════════════════════════════════════════════════════════════════════════════
# Application Setup (Common)
# ════════════════════════════════════════════════════════════════════════════

setup_application() {
    log_info "Setting up yo.life application..."
    
    # Create deployment user
    if ! id -u ${DEPLOY_USER} > /dev/null 2>&1; then
        useradd -m -s /bin/bash ${DEPLOY_USER}
        log_success "Created user: ${DEPLOY_USER}"
    fi
    
    # Install Node.js
    log_info "Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
    
    # Clone/update repository
    APP_DIR="/home/${DEPLOY_USER}/agentic-flow-core"
    if [[ ! -d "$APP_DIR" ]]; then
        su - ${DEPLOY_USER} -c "git clone ${REPO_URL} ${APP_DIR}"
    else
        su - ${DEPLOY_USER} -c "cd ${APP_DIR} && git pull"
    fi
    
    # Install dependencies
    log_info "Installing npm dependencies..."
    su - ${DEPLOY_USER} -c "cd ${APP_DIR} && npm install"
    
    # Build production bundle
    log_info "Building production bundle..."
    su - ${DEPLOY_USER} -c "cd ${APP_DIR} && npm run build"
    
    # Setup PM2
    log_info "Configuring PM2 process manager..."
    npm install -g pm2
    
    cat > ${APP_DIR}/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'yo-life',
    script: './src/web/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: ${APP_PORT},
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
    },
    max_memory_restart: '500M',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF
    
    # Start application
    su - ${DEPLOY_USER} -c "cd ${APP_DIR} && pm2 start ecosystem.config.js"
    su - ${DEPLOY_USER} -c "pm2 save"
    pm2 startup systemd -u ${DEPLOY_USER} --hp /home/${DEPLOY_USER}
    
    log_success "Application running on port ${APP_PORT}"
}

# ════════════════════════════════════════════════════════════════════════════
# 4. HOSTBILL INTEGRATION
# ════════════════════════════════════════════════════════════════════════════

deploy_hostbill() {
    log_info "Deploying HostBill integration..."
    
    # Install prerequisites
    apt install -y apache2 php php-mysql php-curl php-mbstring php-xml php-zip mysql-server
    
    # Download HostBill
    cd /tmp
    wget https://hostbillapp.com/downloads/hostbill-latest.zip
    unzip hostbill-latest.zip -d /var/www/hostbill
    chown -R www-data:www-data /var/www/hostbill
    
    # Configure Apache
    cat > /etc/apache2/sites-available/hostbill.conf << EOF
<VirtualHost *:80>
    ServerName billing.${DOMAIN}
    DocumentRoot /var/www/hostbill
    
    <Directory /var/www/hostbill>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
EOF
    
    a2ensite hostbill
    systemctl restart apache2
    
    log_success "HostBill deployed at http://billing.${DOMAIN}"
}

# ════════════════════════════════════════════════════════════════════════════
# 5. STARLINGX (STX) DEPLOYMENT
# ════════════════════════════════════════════════════════════════════════════

deploy_starlingx() {
    log_info "Deploying StarlingX (STX) infrastructure..."
    
    # Install OpenStack CLI
    apt install -y python3-pip
    pip3 install python-openstackclient
    
    # Configure STX environment
    log_info "Configure STX credentials in /etc/starlingx/openrc"
    
    log_warn "STX deployment requires manual configuration"
    log_info "Docs: https://docs.starlingx.io"
}

# ════════════════════════════════════════════════════════════════════════════
# Security Hardening
# ════════════════════════════════════════════════════════════════════════════

setup_firewall() {
    log_info "Configuring UFW firewall..."
    
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow 22/tcp comment 'SSH'
    ufw allow 80/tcp comment 'HTTP'
    ufw allow 443/tcp comment 'HTTPS'
    ufw --force enable
    
    log_success "Firewall configured"
}

setup_fail2ban() {
    log_info "Installing fail2ban..."
    
    apt install -y fail2ban
    
    cat > /etc/fail2ban/jail.local << EOF
[sshd]
enabled = true
maxretry = 3
bantime = 3600

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/*error.log
maxretry = 5
bantime = 600
EOF
    
    systemctl restart fail2ban
    log_success "fail2ban configured"
}

# ════════════════════════════════════════════════════════════════════════════
# Main Execution
# ════════════════════════════════════════════════════════════════════════════

main() {
    check_root
    detect_os
    
    choice=$(show_menu)
    
    case $choice in
        1)
            deploy_caddy
            setup_firewall
            setup_fail2ban
            ;;
        2)
            deploy_nginx
            setup_firewall
            setup_fail2ban
            ;;
        3)
            deploy_kubernetes
            ;;
        4)
            deploy_hostbill
            ;;
        5)
            deploy_starlingx
            ;;
        0)
            log_info "Exiting..."
            exit 0
            ;;
        *)
            log_error "Invalid choice"
            ;;
    esac
    
    log_success "Deployment complete!"
    log_info "Next steps:"
    log_info "1. Verify site: https://${DOMAIN}"
    log_info "2. Check logs: journalctl -u caddy (or nginx)"
    log_info "3. Monitor app: pm2 monit"
}

main "$@"
