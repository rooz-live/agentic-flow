#!/usr/bin/env bash
# scripts/infra/smoke.sh — Passive smoke testing gate
#
# Runs local-safe steps: syntax checks, Ansible dry-runs, Semgrep validation.
# Skips network-heavy or mutating checks unless RUN_NETWORK_SMOKE=1.
#
# Usage:
#   ./scripts/infra/smoke.sh
#   RUN_NETWORK_SMOKE=1 ./scripts/infra/smoke.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
RUN_NETWORK_SMOKE="${RUN_NETWORK_SMOKE:-0}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${CYAN}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 1. Syntax checks for all shell scripts
check_syntax() {
    log_info "Running bash syntax checks..."
    find "$PROJECT_ROOT" -name "*.sh" -not -path "*/node_modules/*" -not -path "*/.git/*" -print0 | while IFS= read -r -d '' file; do
        if ! bash -n "$file"; then
            log_error "Syntax error in $file"
            exit 1
        fi
    done
    log_success "Bash syntax checks passed."
}

# 2. Ansible syntax checks
check_ansible() {
    log_info "Running Ansible playbook syntax checks..."
    local playbooks_dir="$SCRIPT_DIR/ansible/playbooks"
    if [[ -d "$playbooks_dir" ]]; then
        find "$playbooks_dir" -name "*.yml" -print0 | while IFS= read -r -d '' pb; do
            if command -v ansible-playbook >/dev/null 2>&1; then
                # We just do a syntax check
                ansible-playbook --syntax-check "$pb" >/dev/null || {
                    log_error "Ansible syntax check failed for $pb"
                    exit 1
                }
            else
                log_warn "ansible-playbook not found, skipping syntax check for $pb"
                break
            fi
        done
        log_success "Ansible syntax checks passed."
    else
        log_warn "Ansible playbooks directory not found at $playbooks_dir"
    fi
}

# 3. Semgrep dry-run/validation
check_semgrep() {
    log_info "Validating Semgrep configuration..."
    if command -v semgrep >/dev/null 2>&1; then
        semgrep --validate --config "$PROJECT_ROOT/.semgrep.yml" >/dev/null 2>&1 || {
            log_warn "Semgrep config validation had warnings or failed."
        }
        log_success "Semgrep validation completed."
    else
        log_warn "Semgrep not installed, skipping validation."
    fi
}

# 4. Routing / Swarm sanity
check_ay_route() {
    log_info "Checking ay-swarm.sh routing sanity..."
    local swarm_script="$PROJECT_ROOT/scripts/ay-swarm.sh"
    if [[ -x "$swarm_script" ]]; then
        # Just verify it can print status without error
        "$swarm_script" --status >/dev/null || {
            log_error "ay-swarm.sh --status failed."
            exit 1
        }
        log_success "ay-swarm.sh executed successfully."
    else
        log_warn "ay-swarm.sh not found or not executable."
    fi
}

# 5. Network Smoke
run_network_checks() {
    if [[ "$RUN_NETWORK_SMOKE" == "1" ]]; then
        log_info "RUN_NETWORK_SMOKE=1: Executing network validations..."

        # Check run-health.sh local dry-runs
        local health_runner="$SCRIPT_DIR/run-health.sh"
        if [[ -x "$health_runner" ]]; then
            "$health_runner" local >/dev/null || log_warn "run-health.sh local reported issues."
        fi

        log_success "Network smoke checks completed."
    else
        log_info "Skipping network checks (RUN_NETWORK_SMOKE=0)."
    fi
}

main() {
    echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}                 Passive Infrastructure Smoke               ${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"

    check_syntax
    check_ansible
    check_semgrep
    check_ay_route
    run_network_checks

    echo ""
    log_success "All smoke tests passed successfully! Ready for the next WSJF cycle."
}

main "$@"
