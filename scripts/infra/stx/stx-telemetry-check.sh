#!/bin/bash
# STX OpenStack Telemetry Verification
# First Principles: Test what exists, don't assume

set -euo pipefail

echo "=== STX OpenStack Telemetry Check ==="
echo "Timestamp: $(date -u +%Y-%%m-%dT%H:%M:%SZ)"

# Check 1: Basic connectivity
echo "1. Checking STX connectivity..."
if ssh -i ~/.ssh/starlingx_key -p 2222 -o ConnectTimeout=10 ubuntu@23.92.79.2 "hostname" 2>/dev/null; then
    echo "   PASS: STX reachable"
else
    echo "   FAIL: STX not reachable"
    exit 1
fi

# Check 2: Disk space (constraint: < 20GB)
echo "2. Checking disk space..."
DISK_AVAIL=$(ssh -i ~/.ssh/starlingx_key -p 2222 ubuntu@23.92.79.2 "df -h / | awk 'NR==2 {print \$4}'" 2>/dev/null || echo "0")
if [[ "$DISK_AVAIL" =~ ^[0-9]+ ]]; then
    DISK_GB=${DISK_AVAIL%G*}
    if [ "$DISK_GB" -lt 20 ]; then
        echo "   WARN: Only ${DISK_AVAIL} available (< 20GB)"
    else
        echo "   PASS: ${DISK_AVAIL} available"
    fi
else
    echo "   FAIL: Could not determine disk space"
fi

# Check 3: OpenStack services
echo "3. Checking OpenStack services..."
SERVICES=$(ssh -i ~/.ssh/starlingx_key -p 2222 ubuntu@23.92.79.2 "sudo systemctl list-units | grep -E 'openstack|neutron|nova|glance' | wc -l" 2>/dev/null || echo "0")
if [ "$SERVICES" -gt 0 ]; then
    echo "   PASS: Found $SERVICES OpenStack services"
else
    echo "   INFO: No OpenStack services detected (may be containerized)"
fi

# Check 4: IPMI telemetry (Milestone 1 requirement)
echo "4. Checking IPMI telemetry access..."
if ssh -i ~/.ssh/starlingx_key -p 2222 ubuntu@23.92.79.2 "which ipmitool" >/dev/null 2>&1; then
    echo "   PASS: ipmitool available"
    # Try a safe, read-only command
    if ssh -i ~/.ssh/starlingx_key -p 2222 ubuntu@23.92.79.2 "sudo ipmitool chassis status" >/dev/null 2>&1; then
        echo "   PASS: IPMI telemetry accessible"
    else
        echo "   WARN: ipmitool present but chassis status failed"
    fi
else
    echo "   FAIL: ipmitool not found"
fi

# Check 5: K8s integration point
echo "5. Checking K8s integration..."
K8S_PODS=$(ssh -i ~/.ssh/starlingx_key -p 2222 ubuntu@23.92.79.2 "sudo crictl pods 2>/dev/null | wc -l" || echo "0")
if [ "$K8S_PODS" -gt 0 ]; then
    echo "   PASS: K8s running with $K8S_PODS pods"
else
    echo "   INFO: K8s not accessible via crictl"
fi

echo "=== Check Complete ==="
