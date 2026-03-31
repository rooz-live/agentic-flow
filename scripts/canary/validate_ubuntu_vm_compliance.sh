#!/bin/bash
# Remote Compliance Validation for Ubuntu 22.04 VM
# Connects via StarlingX to validate CIS Benchmark compliance
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
GOALIE_DIR="$PROJECT_ROOT/.goalie/compliance"

# StarlingX configuration
STARLINGX_HOST="${STARLINGX_HOST:-23.92.79.2}"
STARLINGX_PORT="${STARLINGX_PORT:-2222}"
STARLINGX_USER="${STARLINGX_USER:-sysadmin}"

# Ubuntu VM configuration
UBUNTU_VM_NAME="${UBUNTU_VM_NAME:-ubuntu-test}"
UBUNTU_VM_IP="${UBUNTU_VM_IP:-192.168.2.2}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

mkdir -p "$GOALIE_DIR"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     UBUNTU 22.04 VM COMPLIANCE VALIDATION                    ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
log_info "StarlingX: $STARLINGX_USER@$STARLINGX_HOST:$STARLINGX_PORT"
log_info "Ubuntu VM: $UBUNTU_VM_NAME ($UBUNTU_VM_IP)"
echo ""

# Step 1: Check StarlingX connectivity
log_info "Step 1: Checking StarlingX SSH connectivity..."
if ssh -o ConnectTimeout=10 -o BatchMode=yes -p "$STARLINGX_PORT" "$STARLINGX_USER@$STARLINGX_HOST" "echo 'SSH OK'" 2>/dev/null; then
    log_success "StarlingX SSH connection established"
else
    log_warn "StarlingX requires interactive SSH authentication"
    log_info "Run: ssh -p $STARLINGX_PORT $STARLINGX_USER@$STARLINGX_HOST"
    log_info "Then execute compliance checks manually"
fi

# Step 2: Generate remote validation script
log_info "Step 2: Generating remote validation script..."

cat > /tmp/ubuntu_compliance_check.sh << 'REMOTE_SCRIPT'
#!/bin/bash
# CIS Benchmark Compliance Check for Ubuntu 22.04
# Run this script on the Ubuntu VM

echo "=== Ubuntu 22.04 CIS Benchmark Validation ==="
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "Hostname: $(hostname)"
echo "OS: $(lsb_release -ds 2>/dev/null || cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
echo ""

PASSED=0
FAILED=0
TOTAL=0

check() {
    local id="$1"
    local desc="$2"
    local cmd="$3"
    local severity="$4"
    
    ((TOTAL++))
    if eval "$cmd" >/dev/null 2>&1; then
        echo "[PASS] $id: $desc"
        ((PASSED++))
    else
        echo "[FAIL] $id: $desc (severity: $severity)"
        ((FAILED++))
    fi
}

echo "--- Filesystem ---"
check "CIS-1.1.1" "AIDE installed" "dpkg -l aide 2>/dev/null | grep -q '^ii'" "medium"

echo "--- Services ---"
check "CIS-2.1.1" "No telnet/nis/rsh" "! dpkg -l 2>/dev/null | grep -qE '(telnetd|nis|rsh-server)'" "medium"

echo "--- Network ---"
check "CIS-3.1.1" "IP forwarding disabled" "sysctl net.ipv4.ip_forward 2>/dev/null | grep -q '= 0'" "high"
check "CIS-3.2.1" "Firewall active" "systemctl is-active ufw 2>/dev/null | grep -q active || systemctl is-active firewalld 2>/dev/null | grep -q active" "critical"

echo "--- Access ---"
check "CIS-4.1.1" "/etc/passwd permissions" "stat -c '%a' /etc/passwd 2>/dev/null | grep -qE '^(644|600)$'" "high"
check "CIS-4.2.1" "SSH root login disabled" "grep -qE '^PermitRootLogin\s+no' /etc/ssh/sshd_config 2>/dev/null" "critical"

echo "--- Audit ---"
check "CIS-5.1.1" "auditd enabled" "systemctl is-enabled auditd 2>/dev/null | grep -q enabled" "high"

echo "--- Containerd ---"
check "CONTAINERD-001" "containerd v1.7+" "containerd --version 2>/dev/null | grep -qE 'containerd.io 1\.[7-9]|2\.'" "critical"
check "CONTAINERD-002" "SystemdCgroup enabled" "grep -q 'SystemdCgroup = true' /etc/containerd/config.toml 2>/dev/null" "high"

echo ""
echo "=== COMPLIANCE SUMMARY ==="
SCORE=$((PASSED * 100 / TOTAL))
echo "Total: $TOTAL | Passed: $PASSED | Failed: $FAILED"
echo "Score: ${SCORE}% (Target: 95%)"

if [[ $SCORE -ge 95 ]]; then
    echo "Status: ✅ COMPLIANT - Ready for production"
else
    echo "Status: ❌ NON-COMPLIANT - Remediation required"
fi
REMOTE_SCRIPT

chmod +x /tmp/ubuntu_compliance_check.sh
log_success "Remote validation script generated: /tmp/ubuntu_compliance_check.sh"

# Step 3: Provide instructions for manual execution
echo ""
log_info "Step 3: Manual Execution Instructions"
echo "========================================"
echo ""
echo "Option A - Direct VM access:"
echo "  1. SSH to StarlingX: ssh -p $STARLINGX_PORT $STARLINGX_USER@$STARLINGX_HOST"
echo "  2. SSH to Ubuntu VM: ssh ubuntu@$UBUNTU_VM_IP"
echo "  3. Run the compliance check:"
echo "     bash /tmp/ubuntu_compliance_check.sh"
echo ""
echo "Option B - Copy and execute:"
echo "  1. scp -P $STARLINGX_PORT /tmp/ubuntu_compliance_check.sh $STARLINGX_USER@$STARLINGX_HOST:/tmp/"
echo "  2. ssh -p $STARLINGX_PORT $STARLINGX_USER@$STARLINGX_HOST 'scp /tmp/ubuntu_compliance_check.sh ubuntu@$UBUNTU_VM_IP:/tmp/'"
echo "  3. ssh -p $STARLINGX_PORT $STARLINGX_USER@$STARLINGX_HOST 'ssh ubuntu@$UBUNTU_VM_IP bash /tmp/ubuntu_compliance_check.sh'"
echo ""

# Step 4: Create expected results summary
log_info "Step 4: Expected Results Summary"
cat > "$GOALIE_DIR/expected_ubuntu_compliance.yaml" << EOF
# Expected Ubuntu 22.04 Compliance Results
# After containerd installation and hardening

expected_results:
  target_score: 95
  environment: production
  vm_ip: $UBUNTU_VM_IP
  
  rules_expected_to_pass:
    - id: CIS-2.1.1
      reason: "Fresh Ubuntu 22.04 install has no legacy services"
    - id: CIS-3.1.1
      reason: "IP forwarding disabled by default"
    - id: CIS-3.2.1
      reason: "UFW should be enabled and configured"
    - id: CIS-4.1.1
      reason: "/etc/passwd has correct permissions by default"
    - id: CIS-4.2.1
      reason: "SSH hardened in cloud-init"
    - id: CIS-5.1.1
      reason: "auditd installed via cloud-init"
    - id: CONTAINERD-001
      reason: "containerd 1.7+ installed from Docker repo"
    - id: CONTAINERD-002
      reason: "SystemdCgroup enabled in config.toml"
  
  rules_may_require_remediation:
    - id: CIS-1.1.1
      remediation: "apt-get install -y aide aide-common && aideinit"
  
  estimated_score_after_hardening: 95
  
  validation_timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF

log_success "Expected compliance profile saved: $GOALIE_DIR/expected_ubuntu_compliance.yaml"
echo ""
log_info "Validation complete. Execute remote script to confirm actual compliance score."

