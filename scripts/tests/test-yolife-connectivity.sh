#!/bin/bash
# Test YOLIFE Multi-Host Connectivity

echo "🌐 Testing YOLIFE Host Connectivity..."
echo "========================================"

SUCCESS=0
FAILED=0

# StarlingX (Primary)
echo ""
echo "1. StarlingX (stx-aio-0.corp.interface.tag.ooo)..."
if ssh -i $HOME/.ssh/starlingx_key -p 2222 -o ConnectTimeout=10 -o StrictHostKeyChecking=no ubuntu@$YOLIFE_STX_HOST "echo 'Connected' && uname -a" 2>/dev/null; then
    echo "   ✅ STX Connection SUCCESS"
    ((SUCCESS++))
else
    echo "   ❌ STX Connection FAILED"
    echo "   Troubleshoot: ssh -i ~/.ssh/starlingx_key -p 2222 ubuntu@$YOLIFE_STX_HOST"
    ((FAILED++))
fi

# cPanel (AWS i-097706d9355b9f1b2)
echo ""
echo "2. cPanel AWS (i-097706d9355b9f1b2)..."
if ssh -i $HOME/pem/rooz.pem -p 2222 -o ConnectTimeout=10 -o StrictHostKeyChecking=no ubuntu@$YOLIFE_CPANEL_HOST "echo 'Connected' && uname -a" 2>/dev/null; then
    echo "   ✅ cPanel Connection SUCCESS"
    ((SUCCESS++))
else
    echo "   ❌ cPanel Connection FAILED"
    echo "   Troubleshoot: ssh -i ~/pem/rooz.pem -p 2222 ubuntu@$YOLIFE_CPANEL_HOST"
    ((FAILED++))
fi

# GitLab (dev.interface.tag.ooo)
echo ""
echo "3. GitLab (dev.interface.tag.ooo)..."
if ssh -i $HOME/pem/rooz.pem -p 2222 -o ConnectTimeout=10 -o StrictHostKeyChecking=no ubuntu@$YOLIFE_GITLAB_HOST "echo 'Connected' && uname -a" 2>/dev/null; then
    echo "   ✅ GitLab Connection SUCCESS"
    ((SUCCESS++))
else
    echo "   ❌ GitLab Connection FAILED"
    echo "   Troubleshoot: ssh -i ~/pem/rooz.pem -p 2222 ubuntu@$YOLIFE_GITLAB_HOST"
    ((FAILED++))
fi

echo ""
echo "========================================"
echo "Results: $SUCCESS successful, $FAILED failed"

if [ $FAILED -eq 0 ]; then
    echo "✅ All hosts reachable - Ready for deployment"
    exit 0
else
    echo "⚠️  Some hosts unreachable - Fix connectivity before deployment"
    echo ""
    echo "Common issues:"
    echo "  1. SSH key permissions: chmod 600 ~/.ssh/starlingx_key ~/pem/rooz.pem"
    echo "  2. Environment variables not set: export YOLIFE_STX_HOST=..."
    echo "  3. Firewall blocking port 2222"
    echo "  4. Host down or IP changed"
    exit 1
fi
