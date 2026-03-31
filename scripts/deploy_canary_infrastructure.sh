#!/bin/bash
set -e

# Deploy Canary Infrastructure
# Usage: ./scripts/deploy_canary_infrastructure.sh

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Deploying Canary Infrastructure ===${NC}"

# Configuration
STABLE_BACKEND="stable-backend.example.com"
CANARY_BACKEND="canary-backend.example.com"
LOAD_BALANCER_IP="192.168.2.2"  # Ubuntu test VM IP

# 1. Install and configure Nginx for traffic splitting
echo -e "${YELLOW}Installing Nginx...${NC}"
multipass exec ubuntu-test -- sudo apt install -y nginx

# 2. Create traffic splitting configuration
echo -e "${YELLOW}Configuring traffic splitting...${NC}"
multipass exec ubuntu-test -- sudo tee /etc/nginx/sites-available/canary-split << 'EOF'
upstream backend {
    server 127.0.0.1:8080 weight=9;  # Stable backend
    server 127.0.0.1:8081 weight=1;  # Canary backend
}

server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Canary identification
        add_header X-Backend-Server $upstream_addr always;
        add_header X-Canary-Version $upstream_addr always;
    }
    
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# 3. Enable the site
multipass exec ubuntu-test -- sudo ln -sf /etc/nginx/sites-available/canary-split /etc/nginx/sites-enabled/
multipass exec ubuntu-test -- sudo rm -f /etc/nginx/sites-enabled/default

# 4. Test Nginx configuration
multipass exec ubuntu-test -- sudo nginx -t

# 5. Restart Nginx
echo -e "${YELLOW}Restarting Nginx...${NC}"
multipass exec ubuntu-test -- sudo systemctl restart nginx
multipass exec ubuntu-test -- sudo systemctl enable nginx

# 6. Create mock backend services for testing
echo -e "${YELLOW}Creating mock backend services...${NC}"

# Stable backend service
multipass exec ubuntu-test -- sudo tee /etc/systemd/system/stable-backend.service << 'EOF'
[Unit]
Description=Stable Backend Service
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 -m http.server 8080
WorkingDirectory=/home/ubuntu/stable-backend
Restart=always
User=ubuntu

[Install]
WantedBy=multi-user.target
EOF

# Canary backend service
multipass exec ubuntu-test -- sudo tee /etc/systemd/system/canary-backend.service << 'EOF'
[Unit]
Description=Canary Backend Service
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 -m http.server 8081
WorkingDirectory=/home/ubuntu/canary-backend
Restart=always
User=ubuntu

[Install]
WantedBy=multi-user.target
EOF

# 7. Create backend directories and content
multipass exec ubuntu-test -- mkdir -p /home/ubuntu/stable-backend
multipass exec ubuntu-test -- mkdir -p /home/ubuntu/canary-backend

# Stable backend content
multipass exec ubuntu-test -- sudo tee /home/ubuntu/stable-backend/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Stable Backend</title>
</head>
<body>
    <h1>Stable Backend v1.0</h1>
    <p>Containerd version: v1.6.32 (legacy)</p>
    <p>Status: PRODUCTION</p>
</body>
</html>
EOF

# Canary backend content
multipass exec ubuntu-test -- sudo tee /home/ubuntu/canary-backend/index.html << 'EOF'
<!DOCTYPE html>
<head>
    <title>Canary Backend</title>
</head>
<body>
    <h1>Canary Backend v2.0</h1>
    <p>Containerd version: v2.2.1 (NEW!)</p>
    <p>Status: CANARY</p>
</body>
</html>
EOF

# 8. Start backend services
echo -e "${YELLOW}Starting backend services...${NC}"
multipass exec ubuntu-test -- sudo systemctl daemon-reload
multipass exec ubuntu-test -- sudo systemctl start stable-backend
multipass exec ubuntu-test -- sudo systemctl start canary-backend
multipass exec ubuntu-test -- sudo systemctl enable stable-backend
multipass exec ubuntu-test -- sudo systemctl enable canary-backend

# 9. Create health check script
echo -e "${YELLOW}Creating health check script...${NC}"
multipass exec ubuntu-test -- sudo tee /usr/local/bin/canary-health-check.sh << 'EOF'
#!/bin/bash

STABLE_PORT=8080
CANARY_PORT=8081
LOG_FILE="/var/log/canary-health.log"

check_service() {
    local port=$1
    local name=$2
    
    if curl -s -f "http://localhost:$port" > /dev/null; then
        echo "$(date): $name is healthy" >> $LOG_FILE
        return 0
    else
        echo "$(date): $name is unhealthy" >> $LOG_FILE
        return 1
    fi
}

# Check both services
STABLE_HEALTHY=0
CANARY_HEALTHY=0

check_service $STABLE_PORT "stable" && STABLE_HEALTHY=1
check_service $CANARY_PORT "canary" && CANARY_HEALTHY=1

# Log traffic distribution
echo "$(date): Traffic distribution - Stable: 90%, Canary: 10%" >> $LOG_FILE

# Exit with error if both are unhealthy
if [ $STABLE_HEALTHY -eq 0 ] && [ $CANARY_HEALTHY -eq 0 ]; then
    exit 1
fi

exit 0
EOF

multipass exec ubuntu-test -- sudo chmod +x /usr/local/bin/canary-health-check.sh

# 10. Create monitoring script
echo -e "${YELLOW}Creating monitoring script...${NC}"
multipass exec ubuntu-test -- sudo tee /usr/local/bin/canary-monitor.sh << 'EOF'
#!/bin/bash

LOG_FILE="/var/log/canary-monitor.log"
METRICS_FILE="/var/log/canary-metrics.json"

# Test traffic distribution
echo "$(date): Testing traffic distribution..." >> $LOG_FILE

for i in {1..10}; do
    RESPONSE=$(curl -s http://localhost/ | grep -o "Backend v[0-9]\.[0-9]")
    echo "$(date): Request $i: $RESPONSE" >> $LOG_FILE
    sleep 0.1
done

# Calculate distribution
STABLE_COUNT=$(curl -s http://localhost/ | grep -c "v1.0" || echo 0)
CANARY_COUNT=$(curl -s http://localhost/ | grep -c "v2.0" || echo 0)

# Create metrics JSON
cat > $METRICS_FILE << METRICS_EOF
{
  "timestamp": "$(date -Iseconds)",
  "stable_requests": $STABLE_COUNT,
  "canary_requests": $CANARY_COUNT,
  "total_requests": $((STABLE_COUNT + CANARY_COUNT)),
  "canary_percentage": $(echo "scale=2; $CANARY_COUNT * 100 / ($STABLE_COUNT + $CANARY_COUNT)" | bc 2>/dev/null || echo 0)
}
METRICS_EOF

echo "$(date): Metrics saved to $METRICS_FILE" >> $LOG_FILE
EOF

multipass exec ubuntu-test -- sudo chmod +x /usr/local/bin/canary-monitor.sh

# 11. Create systemd timer for health checks
echo -e "${YELLOW}Setting up health check timer...${NC}"
multipass exec ubuntu-test -- sudo tee /etc/systemd/system/canary-health.timer << 'EOF'
[Unit]
Description=Canary Health Check Timer
Requires=canary-health.service

[Timer]
OnCalendar=*:*:0/5
Persistent=true

[Install]
WantedBy=timers.target
EOF

multipass exec ubuntu-test -- sudo tee /etc/systemd/system/canary-health.service << 'EOF'
[Unit]
Description=Canary Health Check Service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/canary-health-check.sh
EOF

multipass exec ubuntu-test -- sudo systemctl daemon-reload
multipass exec ubuntu-test -- sudo systemctl enable canary-health.timer
multipass exec ubuntu-test -- sudo systemctl start canary-health.timer

# 12. Test the setup
echo -e "${GREEN}=== Testing Canary Setup ===${NC}"
echo "Testing Nginx configuration..."
multipass exec ubuntu-test -- curl -s http://localhost/health

echo -e "\nTesting backend services..."
echo "Stable backend:"
multipass exec ubuntu-test -- curl -s http://localhost:8080

echo -e "\nCanary backend:"
multipass exec ubuntu-test -- curl -s http://localhost:8081

echo -e "\nTesting traffic distribution (10 requests):"
for i in {1..10}; do
    multipass exec ubuntu-test -- curl -s http://localhost/ | grep -o "Backend v[0-9]\.[0-9]"
done

# 13. Display status
echo -e "\n${GREEN}=== Service Status ===${NC}"
multipass exec ubuntu-test -- sudo systemctl status nginx --no-pager -l
multipass exec ubuntu-test -- sudo systemctl status stable-backend --no-pager -l
multipass exec ubuntu-test -- sudo systemctl status canary-backend --no-pager -l

# 14. Show logs
echo -e "\n${BLUE}=== Recent Logs ===${NC}"
multipass exec ubuntu-test -- sudo tail -10 /var/log/nginx/access.log

echo -e "\n${GREEN}✅ Canary infrastructure deployed successfully!${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Monitor health: sudo journalctl -u canary-health -f"
echo "2. View metrics: cat /var/log/canary-metrics.json"
echo "3. Test manually: curl -H 'X-Debug: 1' http://localhost/"
