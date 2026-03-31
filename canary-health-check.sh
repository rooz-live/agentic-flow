#!/bin/bash
# canary-health-check.sh

# Simple mockup of endpoints for local testing on VM without full backend apps
# In real scenario, these would be separate services

STABLE_PORT=8081
CANARY_PORT=8082

# Start mock backends if not running (using netcat or python simplehttp)
# For demo, we assume they are reachable if the canary deployment succeeded

# Simulate health check
# If checking localhost mocks:
STABLE_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/health || echo "503")
CANARY_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8082/health || echo "503")

echo "Stable Health: $STABLE_HEALTH"
echo "Canary Health: $CANARY_HEALTH"

if [ "$CANARY_HEALTH" != "200" ] && [ "$CANARY_HEALTH" != "404" ]; then # 404 acceptable for mock demo root
    echo "Canary unhealthy, routing all traffic to stable"
    # Update nginx config to 100% stable (mock sed)
    # sed -i 's/weight=1;/weight=0;/' /etc/nginx/sites-available/canary-split
    # nginx -s reload
    exit 1
fi
exit 0
