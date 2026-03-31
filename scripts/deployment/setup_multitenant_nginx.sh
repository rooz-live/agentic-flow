#!/bin/bash
# Multi-Tenant Domain Routing Setup for StarlingX
# Configures nginx reverse proxy for interface.tag.ooo ecosystem

set -e

DOMAINS=(
    "app.interface.tag.ooo:5000"
    "billing.interface.tag.ooo:8080"
    "blog.interface.tag.ooo:8081"
    "dev.interface.tag.ooo:8082"
    "forum.interface.tag.ooo:8083"
    "starlingx.interface.tag.ooo:8084"
)

STX_HOST="stx-aio-0.corp.interface.tag.ooo"
SSH_KEY="pem/stx-aio-0.pem"
SSH_USER="sysadmin"

echo "=========================================="
echo "Multi-Tenant Nginx Setup for StarlingX"
echo "=========================================="

# Function to check SSH connectivity
check_ssh() {
    echo "Checking SSH connectivity to $STX_HOST..."
    if ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=no \
        -o ServerAliveInterval=60 -o ServerAliveCountMax=3 \
        "$SSH_USER@$STX_HOST" "echo 'SSH connection successful'" >/dev/null 2>&1; then
        echo "✅ SSH connection established"
        return 0
    else
        echo "❌ SSH connection failed"
        return 1
    fi
}

# Function to install nginx and certbot on StarlingX
install_nginx_certbot() {
    echo ""
    echo "Installing nginx and certbot on $STX_HOST..."
    
    ssh -i "$SSH_KEY" -o ServerAliveInterval=60 -o ServerAliveCountMax=3 \
        "$SSH_USER@$STX_HOST" << 'ENDSSH'
        set -e
        
        # Update package lists
        sudo apt-get update -qq
        
        # Install nginx
        if ! command -v nginx &> /dev/null; then
            echo "Installing nginx..."
            sudo apt-get install -y nginx
        else
            echo "✅ nginx already installed"
        fi
        
        # Install certbot for Let's Encrypt SSL
        if ! command -v certbot &> /dev/null; then
            echo "Installing certbot..."
            sudo apt-get install -y certbot python3-certbot-nginx
        else
            echo "✅ certbot already installed"
        fi
        
        # Enable and start nginx
        sudo systemctl enable nginx
        sudo systemctl start nginx
        
        echo "✅ nginx and certbot installed"
ENDSSH
}

# Function to create nginx config for a domain
create_nginx_config() {
    local domain=$1
    local port=$2
    
    echo ""
    echo "Creating nginx config for $domain -> localhost:$port..."
    
    ssh -i "$SSH_KEY" -o ServerAliveInterval=60 -o ServerAliveCountMax=3 \
        "$SSH_USER@$STX_HOST" << ENDSSH
        set -e
        
        # Create nginx site config
        sudo tee /etc/nginx/sites-available/$domain > /dev/null << 'NGINX_CONF'
server {
    listen 80;
    server_name $domain;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Logging
    access_log /var/log/nginx/${domain}_access.log;
    error_log /var/log/nginx/${domain}_error.log;
    
    # Proxy to backend
    location / {
        proxy_pass http://localhost:$port;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
NGINX_CONF

        # Enable site
        sudo ln -sf /etc/nginx/sites-available/$domain /etc/nginx/sites-enabled/$domain
        
        echo "✅ Created config for $domain"
ENDSSH
}

# Function to obtain SSL certificates
obtain_ssl_certs() {
    local domain=$1
    
    echo ""
    echo "Obtaining SSL certificate for $domain..."
    
    ssh -i "$SSH_KEY" -o ServerAliveInterval=60 -o ServerAliveCountMax=3 \
        "$SSH_USER@$STX_HOST" << ENDSSH
        set -e
        
        # Check if certificate already exists
        if sudo test -d /etc/letsencrypt/live/$domain; then
            echo "✅ Certificate already exists for $domain"
        else
            echo "Obtaining new certificate for $domain..."
            sudo certbot --nginx -d $domain --non-interactive --agree-tos \
                --email admin@interface.tag.ooo --redirect
            echo "✅ Certificate obtained for $domain"
        fi
ENDSSH
}

# Function to reload nginx
reload_nginx() {
    echo ""
    echo "Testing and reloading nginx configuration..."
    
    ssh -i "$SSH_KEY" -o ServerAliveInterval=60 -o ServerAliveCountMax=3 \
        "$SSH_USER@$STX_HOST" << 'ENDSSH'
        set -e
        
        # Test configuration
        sudo nginx -t
        
        # Reload nginx
        sudo systemctl reload nginx
        
        echo "✅ Nginx configuration reloaded"
ENDSSH
}

# Main execution
main() {
    # Check SSH connectivity
    if ! check_ssh; then
        echo ""
        echo "❌ Cannot connect to $STX_HOST"
        echo "Please ensure:"
        echo "  1. SSH key exists at $SSH_KEY"
        echo "  2. Host is reachable"
        echo "  3. User $SSH_USER has access"
        exit 1
    fi
    
    # Install nginx and certbot
    install_nginx_certbot
    
    # Create nginx configs for each domain
    for domain_port in "${DOMAINS[@]}"; do
        domain="${domain_port%%:*}"
        port="${domain_port##*:}"
        create_nginx_config "$domain" "$port"
    done
    
    # Reload nginx
    reload_nginx
    
    # Obtain SSL certificates (manual step, requires DNS to be configured)
    echo ""
    echo "=========================================="
    echo "SSL Certificate Setup (Manual)"
    echo "=========================================="
    echo ""
    echo "⚠️  Before obtaining SSL certificates, ensure DNS A records are configured:"
    echo ""
    for domain_port in "${DOMAINS[@]}"; do
        domain="${domain_port%%:*}"
        echo "  $domain -> $(dig +short $STX_HOST | head -1 || echo 'IP_ADDRESS')"
    done
    echo ""
    read -p "Have you configured DNS records? (y/N): " confirm
    
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        for domain_port in "${DOMAINS[@]}"; do
            domain="${domain_port%%:*}"
            obtain_ssl_certs "$domain"
        done
    else
        echo ""
        echo "Skipping SSL certificate setup."
        echo "To obtain certificates later, run:"
        echo "  ssh -i $SSH_KEY $SSH_USER@$STX_HOST"
        echo "  sudo certbot --nginx -d <domain> --non-interactive --agree-tos --email admin@interface.tag.ooo --redirect"
    fi
    
    echo ""
    echo "=========================================="
    echo "✅ Multi-Tenant Nginx Setup Complete"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo "  1. Deploy backend services on ports: 5000, 8080-8084"
    echo "  2. Test domains with: curl -I https://<domain>/health"
    echo "  3. Run health monitor: python3 scripts/monitoring/site_health_monitor.py"
}

# Run main function
main "$@"
