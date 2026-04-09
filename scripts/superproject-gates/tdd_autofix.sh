#!/bin/bash
# TDD Automated Fix Script for Milestone Gate Blockers
# Correlation ID: consciousness-1758658960

set -euo pipefail

CORRELATION_ID="consciousness-1758658960"
TIMESTAMP=$(date -Iseconds)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/logs/tdd_autofix_$(date +%Y%m%d_%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Ensure logs directory exists
mkdir -p "$SCRIPT_DIR/logs"

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    echo -e "${level}${message}${NC}" | tee -a "$LOG_FILE"
    echo "$TIMESTAMP|tdd_autofix|$message|$CORRELATION_ID" >> "$LOG_FILE"
}

log_success() { log "$GREEN" "[✓] $@"; }
log_error() { log "$RED" "[✗] $@"; }
log_warning() { log "$YELLOW" "[⚠] $@"; }
log_info() { log "$BLUE" "[ℹ] $@"; }

# Emit heartbeat
emit_heartbeat() {
    local component=$1
    local phase=$2
    local status=$3
    local elapsed=${4:-0}
    local metrics=${5:-"{}"}
    
    echo "$TIMESTAMP|$component|$phase|$status|$elapsed|$CORRELATION_ID|$metrics"
}

# Test runner function
run_tests() {
    log_info "Running TDD test suite..."
    
    cd "$SCRIPT_DIR"
    if /usr/local/bin/python3 tests/test_milestone_gates.py 2>&1 | tee -a "$LOG_FILE"; then
        log_success "All tests passed!"
        return 0
    else
        log_error "Tests failed. Applying fixes..."
        return 1
    fi
}

# Fix 1: Increase file descriptor limits
fix_file_descriptors() {
    log_info "Fix 1: Increasing file descriptor limits..."
    
    current_limit=$(ulimit -n)
    log_info "Current limit: $current_limit"
    
    if [ "$current_limit" -lt 4096 ]; then
        ulimit -n 4096 || {
            log_warning "Could not set ulimit in current session"
            log_info "Setting system-wide limits..."
            
            # For macOS, use launchctl
            if [[ "$OSTYPE" == "darwin"* ]]; then
                log_info "Configuring macOS file descriptor limits..."
                sudo launchctl limit maxfiles 65536 200000 || log_warning "Could not set launchctl limits"
            fi
        }
        
        new_limit=$(ulimit -n)
        log_success "File descriptor limit increased from $current_limit to $new_limit"
        emit_heartbeat "autofix" "file_descriptors" "success" 0 "{\"old_limit\":$current_limit,\"new_limit\":$new_limit}"
    else
        log_success "File descriptor limit already sufficient: $current_limit"
        emit_heartbeat "autofix" "file_descriptors" "skip" 0 "{\"current_limit\":$current_limit}"
    fi
}

# Fix 2: Update datetime deprecation warnings
fix_datetime_deprecations() {
    log_info "Fix 2: Updating datetime deprecation warnings..."
    
    files_to_fix=(
        "neural_architecture_orchestrator.py"
        "enhanced_mcp_orchestrator.py"
        "lionagi_multimodal_analyzer.py"
        "orchestrators/master_unified_orchestrator.py"
        "orchestrators/quantum_consciousness_orchestrator.py"
    )
    
    fixed_count=0
    
    for file in "${files_to_fix[@]}"; do
        filepath="$SCRIPT_DIR/$file"
        if [ -f "$filepath" ]; then
            log_info "Processing $file..."
            
            # Create backup
            cp "$filepath" "$filepath.bak"
            
            # Replace datetime.utcnow() with datetime.now(datetime.UTC)
            # First, handle cases with datetime.datetime.utcnow()
            sed -i.tmp 's/datetime\.datetime\.utcnow()/datetime.datetime.now(datetime.UTC)/g' "$filepath"
            
            # Handle cases with just utcnow() where datetime module is imported
            # sed -i.tmp 's/\butcnow()/now(datetime.UTC)/g' "$filepath"
            
            rm -f "$filepath.tmp"
            
            if diff -q "$filepath" "$filepath.bak" > /dev/null 2>&1; then
                log_info "No changes needed in $file"
                rm "$filepath.bak"
            else
                log_success "Updated $file"
                ((fixed_count++))
            fi
        else
            log_warning "File not found: $file"
        fi
    done
    
    log_success "Fixed datetime deprecations in $fixed_count file(s)"
    emit_heartbeat "autofix" "datetime_deprecations" "success" 0 "{\"files_fixed\":$fixed_count}"
}

# Fix 3: Deploy HSTS headers (read-only check first)
fix_hsts_headers() {
    log_info "Fix 3: Checking and deploying HSTS headers..."
    
    # Create HSTS snippet locally
    HSTS_SNIPPET=$(cat <<'EOF'
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
EOF
)
    
    # Test SSH connectivity first
    if ! ssh -o ConnectTimeout=5 root@23.92.79.2 "exit" 2>/dev/null; then
        log_error "Cannot connect to root@23.92.79.2 via SSH"
        log_info "Please ensure SSH key is configured: ~/pem/rooz.pem"
        emit_heartbeat "autofix" "hsts_headers" "failed" 0 "{\"error\":\"ssh_connection_failed\"}"
        return 1
    fi
    
    log_info "SSH connection successful"
    
    # Check if HSTS snippet already exists
    if ssh root@23.92.79.2 "[ -f /etc/nginx/snippets/hsts.conf ]" 2>/dev/null; then
        log_success "HSTS snippet already exists on server"
    else
        log_info "Creating HSTS snippet on server..."
        echo "$HSTS_SNIPPET" | ssh root@23.92.79.2 "mkdir -p /etc/nginx/snippets && cat > /etc/nginx/snippets/hsts.conf"
        log_success "HSTS snippet created"
    fi
    
    # Check domains for HSTS headers
    domains=("interface.artchat.art" "interface.o-gov.com" "interface.rooz.live" "interface.tag.ooo" "interface.tag.vote")
    missing_hsts=0
    
    for domain in "${domains[@]}"; do
        if curl -Iks --max-time 5 "https://$domain" 2>/dev/null | grep -qi "strict-transport-security"; then
            log_success "$domain has HSTS header"
        else
            log_warning "$domain missing HSTS header"
            ((missing_hsts++))
        fi
    done
    
    if [ $missing_hsts -gt 0 ]; then
        log_warning "$missing_hsts domain(s) missing HSTS headers"
        log_info "Manual intervention required to add 'include snippets/hsts.conf;' to nginx configs"
        emit_heartbeat "autofix" "hsts_headers" "partial" 0 "{\"missing_count\":$missing_hsts}"
    else
        log_success "All domains have HSTS headers"
        emit_heartbeat "autofix" "hsts_headers" "success" 0 "{\"missing_count\":0}"
    fi
}

# Fix 4: Check HTTPS accessibility
fix_https_issues() {
    log_info "Fix 4: Checking HTTPS accessibility..."
    
    domains=("interface.artchat.art" "interface.o-gov.com" "interface.rooz.live" "interface.tag.ooo" "interface.tag.vote")
    failed_count=0
    
    for domain in "${domains[@]}"; do
        if curl -Iks --max-time 10 "https://$domain" 2>/dev/null | head -1 | grep -qE "HTTP/[0-9.]+ (200|301|302)"; then
            log_success "$domain is accessible via HTTPS"
        else
            log_error "$domain is NOT accessible via HTTPS"
            ((failed_count++))
            
            # Check DNS
            if dig +short A "$domain" | grep -qE '^[0-9.]+$'; then
                log_info "  DNS resolves: $(dig +short A $domain | head -1)"
            else
                log_error "  DNS resolution failed"
            fi
        fi
    done
    
    if [ $failed_count -gt 0 ]; then
        log_error "$failed_count domain(s) not accessible via HTTPS"
        log_info "Manual intervention required: Check SSL certificates with certbot"
        emit_heartbeat "autofix" "https_issues" "failed" 0 "{\"failed_count\":$failed_count}"
        return 1
    else
        log_success "All domains accessible via HTTPS"
        emit_heartbeat "autofix" "https_issues" "success" 0 "{\"failed_count\":0}"
    fi
}

# Fix 5: Verify Nginx configuration
fix_nginx_config() {
    log_info "Fix 5: Verifying Nginx configuration..."
    
    if ! ssh -o ConnectTimeout=5 root@23.92.79.2 "exit" 2>/dev/null; then
        log_error "Cannot connect to server for Nginx check"
        emit_heartbeat "autofix" "nginx_config" "failed" 0 "{\"error\":\"ssh_connection_failed\"}"
        return 1
    fi
    
    if ssh root@23.92.79.2 "nginx -t" 2>&1 | grep -qi "syntax is ok"; then
        log_success "Nginx configuration syntax is valid"
        emit_heartbeat "autofix" "nginx_config" "success" 0 "{\"status\":\"valid\"}"
    else
        log_error "Nginx configuration has syntax errors"
        log_info "Manual intervention required to fix nginx configuration"
        emit_heartbeat "autofix" "nginx_config" "failed" 0 "{\"status\":\"invalid\"}"
        return 1
    fi
}

# Main execution
main() {
    log_info "=========================================="
    log_info "TDD Automated Fix Script Starting"
    log_info "Correlation ID: $CORRELATION_ID"
    log_info "Timestamp: $TIMESTAMP"
    log_info "Log File: $LOG_FILE"
    log_info "=========================================="
    echo ""
    
    emit_heartbeat "tdd_autofix" "start" "running" 0 "{\"phase\":\"initial\"}"
    
    # Run initial tests to identify failures
    log_info "Step 1: Running initial test suite..."
    if run_tests; then
        log_success "All tests passed! No fixes needed."
        emit_heartbeat "tdd_autofix" "complete" "success" 0 "{\"fixes_applied\":0}"
        exit 0
    fi
    
    echo ""
    log_info "Step 2: Applying automated fixes..."
    echo ""
    
    # Apply fixes
    fix_file_descriptors
    echo ""
    
    fix_datetime_deprecations
    echo ""
    
    fix_hsts_headers
    echo ""
    
    fix_https_issues
    echo ""
    
    fix_nginx_config
    echo ""
    
    # Run tests again
    log_info "Step 3: Running test suite after fixes..."
    if run_tests; then
        log_success "=========================================="
        log_success "All tests passed after applying fixes!"
        log_success "=========================================="
        emit_heartbeat "tdd_autofix" "complete" "success" 0 "{\"fixes_applied\":5}"
        exit 0
    else
        log_warning "=========================================="
        log_warning "Some tests still failing after automated fixes"
        log_warning "Manual intervention may be required"
        log_warning "=========================================="
        log_info "Review log file: $LOG_FILE"
        emit_heartbeat "tdd_autofix" "complete" "partial" 0 "{\"fixes_applied\":5,\"manual_required\":true}"
        exit 1
    fi
}

# Run main function
main "$@"
