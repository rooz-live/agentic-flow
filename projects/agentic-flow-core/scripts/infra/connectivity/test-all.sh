#!/bin/bash
# Test connectivity to all YOLIFE deployment targets

set -e

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║          Testing Connectivity to Deployment Targets               ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Export environment variables
export YOLIFE_STX_HOST="${YOLIFE_STX_HOST:-}"
export YOLIFE_STX_KEY="$HOME/.ssh/starlingx_key"
export YOLIFE_CPANEL_HOST="${YOLIFE_CPANEL_HOST:-}"
export YOLIFE_CPANEL_KEY="$HOME/pem/rooz.pem"
export YOLIFE_GITLAB_HOST="${YOLIFE_GITLAB_HOST:-}"
export YOLIFE_GITLAB_KEY="$HOME/pem/rooz.pem"

test_ssh() {
    local name="$1"
    local host="$2"
    local key="$3"
    local ports="$4"
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Testing $name: $host"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [ -z "$host" ]; then
        echo "❌ FAIL: Host not configured (check YOLIFE_${name^^}_HOST env var)"
        return 1
    fi
    
    if [ ! -f "$key" ]; then
        echo "❌ FAIL: Key not found at $key"
        return 1
    fi
    
    echo "   Host: $host"
    echo "   Key:  $key"
    echo "   Ports: $ports"
    echo ""
    
    # Test each port
    IFS=',' read -ra PORT_ARRAY <<< "$ports"
    for port in "${PORT_ARRAY[@]}"; do
        echo "   Testing port $port..."
        if timeout 5 ssh -i "$key" \
            -o ConnectTimeout=5 \
            -o StrictHostKeyChecking=no \
            -o UserKnownHostsFile=/dev/null \
            -o BatchMode=yes \
            -p "$port" \
            ubuntu@"$host" "echo '✅ SSH connection successful'" 2>/dev/null; then
            echo "   ✅ Port $port: SUCCESS"
            
            # Get system info
            echo "   📊 System Info:"
            ssh -i "$key" -o ConnectTimeout=5 -o StrictHostKeyChecking=no -p "$port" ubuntu@"$host" \
                "uname -a; uptime; df -h / | tail -1" 2>/dev/null | sed 's/^/      /'
            return 0
        else
            echo "   ❌ Port $port: FAILED (timeout or auth error)"
        fi
    done
    
    echo "   ❌ FAIL: All ports unreachable"
    return 1
}

# Test 1: StarlingX
if test_ssh "STX" "$YOLIFE_STX_HOST" "$YOLIFE_STX_KEY" "2222,22"; then
    STX_STATUS="✅ OK"
else
    STX_STATUS="❌ FAILED"
fi
echo ""

# Test 2: cPanel
if test_ssh "CPANEL" "$YOLIFE_CPANEL_HOST" "$YOLIFE_CPANEL_KEY" "2222,22"; then
    CPANEL_STATUS="✅ OK"
else
    CPANEL_STATUS="❌ FAILED"
fi
echo ""

# Test 3: GitLab
if test_ssh "GITLAB" "$YOLIFE_GITLAB_HOST" "$YOLIFE_GITLAB_KEY" "2222,22"; then
    GITLAB_STATUS="✅ OK"
else
    GITLAB_STATUS="❌ FAILED"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Connectivity Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   StarlingX:  $STX_STATUS"
echo "   cPanel:     $CPANEL_STATUS"
echo "   GitLab:     $GITLAB_STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Exit with error if any failed
if [[ "$STX_STATUS" == *"FAILED"* ]] || [[ "$CPANEL_STATUS" == *"FAILED"* ]] || [[ "$GITLAB_STATUS" == *"FAILED"* ]]; then
    echo "⚠️  Some targets unreachable. Check:"
    echo "   1. Environment variables are set (YOLIFE_*_HOST)"
    echo "   2. SSH keys have correct permissions (chmod 600)"
    echo "   3. Network connectivity (firewall, VPN, DNS)"
    echo "   4. SSH daemon running on remote hosts"
    exit 1
fi

echo "✅ All targets reachable!"
exit 0
