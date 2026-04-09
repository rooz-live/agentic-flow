#!/bin/bash
# StarlingX SSH Probe - Week 1 P1 Action
# Test SSH connectivity and collect baseline metrics

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $*"; }
error() { echo -e "${RED}[✗]${NC} $*"; }
info() { echo -e "${BLUE}[INFO]${NC} $*"; }

# Environment check
if [[ -z "${YOLIFE_STX_HOST:-}" ]]; then
    # Try to extract from SSH config
    STX_HOST=$(grep -A 2 "^Host stx-ubuntu" ~/.ssh/config | grep "HostName" | awk '{print $2}')
    if [[ -z "$STX_HOST" ]]; then
        error "YOLIFE_STX_HOST not set and not found in SSH config"
        echo "Required environment variables:"
        echo "  export YOLIFE_STX_HOST=\"your.stx.hostname.com\""
        echo "  export YOLIFE_STX_PORTS=\"2222,22\""
        echo "  export YOLIFE_STX_KEY=\"\$HOME/.ssh/starlingx_key\""
        echo ""
        echo "Or ensure 'stx-ubuntu' entry exists in ~/.ssh/config"
        exit 1
    fi
    warn "Using hostname from SSH config: $STX_HOST"
else
    STX_HOST="${YOLIFE_STX_HOST}"
fi

STX_KEY="${YOLIFE_STX_KEY:-$HOME/.ssh/starlingx_key}"
STX_USER="${YOLIFE_STX_USER:-ubuntu}"

echo "═══════════════════════════════════════════"
echo "  StarlingX SSH Probe"
echo "═══════════════════════════════════════════"
echo

info "Target: ${STX_USER}@${STX_HOST}"
info "Key: ${STX_KEY}"
echo

# Test 1: Key exists
if [[ -f "$STX_KEY" ]]; then
    log "SSH key found: $STX_KEY"
    KEY_PERMS=$(stat -f "%Lp" "$STX_KEY" 2>/dev/null || stat -c "%a" "$STX_KEY" 2>/dev/null)
    if [[ "$KEY_PERMS" == "600" ]] || [[ "$KEY_PERMS" == "400" ]]; then
        log "Key permissions correct: $KEY_PERMS"
    else
        warn "Key permissions: $KEY_PERMS (should be 600 or 400)"
    fi
else
    error "SSH key not found: $STX_KEY"
    exit 1
fi
echo

# Test 2: Network connectivity (try both ports)
PORTS="${YOLIFE_STX_PORTS:-2222,22}"
IFS=',' read -ra PORT_ARRAY <<< "$PORTS"

CONNECTED_PORT=""
for port in "${PORT_ARRAY[@]}"; do
    info "Testing port $port..."
    if timeout 5 bash -c "cat < /dev/null > /dev/tcp/${STX_HOST}/${port}" 2>/dev/null; then
        log "Port $port is reachable"
        CONNECTED_PORT=$port
        break
    else
        warn "Port $port not reachable"
    fi
done

if [[ -z "$CONNECTED_PORT" ]]; then
    error "No ports accessible"
    exit 1
fi
echo

# Test 3: SSH authentication
info "Testing SSH authentication on port $CONNECTED_PORT..."
if ssh -i "$STX_KEY" \
    -o ConnectTimeout=10 \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -p "$CONNECTED_PORT" \
    "${STX_USER}@${STX_HOST}" \
    "echo 'SSH connection successful'" 2>/dev/null | grep -q "successful"; then
    log "SSH authentication successful"
else
    error "SSH authentication failed"
    exit 1
fi
echo

# Test 4: Collect baseline metrics
info "Collecting baseline metrics..."
METRICS=$(ssh -i "$STX_KEY" \
    -o ConnectTimeout=10 \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -p "$CONNECTED_PORT" \
    "${STX_USER}@${STX_HOST}" << 'REMOTE_EOF'
#!/bin/bash
echo "=== System Info ==="
uname -a
echo
echo "=== Uptime ==="
uptime
echo
echo "=== Memory ==="
free -h 2>/dev/null || vm_stat
echo
echo "=== Disk ==="
df -h / 2>/dev/null || df -h
echo
echo "=== K8s Check ==="
kubectl version --short 2>/dev/null || echo "kubectl not available"
echo
echo "=== Docker Check ==="
docker --version 2>/dev/null || echo "docker not available"
REMOTE_EOF
)

echo "$METRICS"
echo

# Test 5: Check for StarlingX specific markers
info "Checking for StarlingX markers..."
STX_CHECK=$(ssh -i "$STX_KEY" \
    -o ConnectTimeout=10 \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -p "$CONNECTED_PORT" \
    "${STX_USER}@${STX_HOST}" \
    "ls -la /etc/platform 2>/dev/null && echo 'StarlingX platform detected' || echo 'No StarlingX markers found'" 2>/dev/null)

echo "$STX_CHECK"
echo

# Summary
echo "═══════════════════════════════════════════"
echo "  Probe Summary"
echo "═══════════════════════════════════════════"
log "SSH connectivity: ✓"
log "Authentication: ✓"
log "Port: $CONNECTED_PORT"
log "Metrics collected: ✓"
echo

info "Next steps:"
echo "1. Review metrics above"
echo "2. Run health check: ./scripts/stx/stx_health_extended.py"
echo "3. Document in /tmp/stx-production-plan.md"
echo "4. Continue to P2: Inventory scan"
