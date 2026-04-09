#!/usr/bin/env bash
#
# ultimate_deploy.sh
# Purpose: Production deployment orchestrator with safety gates
# Correlation ID: consciousness-1758658960
# Requires: APPLY_CONFIRM=YES for production deployment
#

set -euo pipefail

# ============================================================================
# CONSTANTS
# ============================================================================

readonly CORRELATION_ID="consciousness-1758658960"
readonly COMPONENT="ultimate_deploy"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Gate thresholds
readonly CONSCIOUSNESS_MIN=0.75
readonly CONSENSUS_MIN=0.85
readonly VALIDATION_MIN=99.9

# Rollout stages
readonly ROLLOUT_STAGES=(10 25 50 75 100)

# Configuration
readonly APPLY_CONFIRM="${APPLY_CONFIRM:-NO}"
readonly DRY_RUN="${DRY_RUN:-0}"
readonly PRIMARY_UPSTREAM="${PRIMARY_UPSTREAM:-primary_backend}"
readonly CANARY_UPSTREAM="${CANARY_UPSTREAM:-canary_backend}"

# ============================================================================
# HEARTBEAT UTILITY
# ============================================================================

heartbeat() {
    local phase="$1"
    local status="$2"
    local start_time="$3"
    local metrics="${4:-}"
    
    local elapsed=$((SECONDS - start_time))
    local ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    echo "$ts|$COMPONENT|$phase|$status|$elapsed|$CORRELATION_ID|$metrics"
    if [[ -d "$SCRIPT_DIR/logs" ]]; then
        echo "$ts|$COMPONENT|$phase|$status|$elapsed|$CORRELATION_ID|$metrics" >> "$SCRIPT_DIR/logs/heartbeats.log"
    fi
}

# ============================================================================
# ERROR TRAP
# ============================================================================

trap 'heartbeat "error_trap" "ERROR" "$SECONDS" "line=$LINENO"' ERR

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

detect_nginx_root() {
    local nginx_v_output
    nginx_v_output=$(nginx -V 2>&1 || echo "")
    
    if [[ "$nginx_v_output" =~ --conf-path=([^[:space:]]+) ]]; then
        dirname "${BASH_REMATCH[1]}"
    elif [[ "$nginx_v_output" =~ --prefix=([^[:space:]]+) ]]; then
        echo "${BASH_REMATCH[1]}"
    elif [[ -d "/etc/nginx" ]]; then
        echo "/etc/nginx"
    else
        echo "/etc/nginx"
    fi
}

backup_nginx_config() {
    local nginx_root="$1"
    local backup_path="${nginx_root}_backup_${TIMESTAMP}.tar.gz"
    
    echo "Creating nginx backup: $backup_path"
    sudo tar -czf "$backup_path" -C "$(dirname "$nginx_root")" "$(basename "$nginx_root")" 2>/dev/null || {
        sudo cp -r "$nginx_root" "${nginx_root}_backup_${TIMESTAMP}"
        backup_path="${nginx_root}_backup_${TIMESTAMP}"
    }
    
    echo "$backup_path"
}

test_nginx() {
    sudo nginx -t 2>&1
}

reload_nginx() {
    if command -v systemctl &>/dev/null && systemctl is-active --quiet nginx 2>/dev/null; then
        sudo systemctl reload nginx
    else
        sudo nginx -s reload
    fi
}

# ============================================================================
# GATE: APPLY CONFIRMATION
# ============================================================================

gate_apply_confirmation() {
    local gate_start=$SECONDS
    echo ""
    echo "=========================================="
    echo "Gate: Apply Confirmation"
    echo "=========================================="
    
    heartbeat "gate_apply_confirm" "START" "$gate_start" ""
    
    if [[ "$APPLY_CONFIRM" != "YES" ]] && [[ "$DRY_RUN" != "1" ]]; then
        echo "✗ APPLY_CONFIRM is not set to YES"
        echo ""
        echo "This script requires explicit confirmation to deploy to production."
        echo ""
        echo "To proceed, export APPLY_CONFIRM=YES:"
        echo "  export APPLY_CONFIRM=YES"
        echo "  ./ultimate_deploy.sh"
        echo ""
        echo "To run in dry-run mode:"
        echo "  DRY_RUN=1 ./ultimate_deploy.sh"
        echo ""
        heartbeat "gate_apply_confirm" "ERROR" "$gate_start" "confirm=NO"
        exit 2
    fi
    
    if [[ "$DRY_RUN" == "1" ]]; then
        echo "✓ Running in DRY-RUN mode"
        heartbeat "gate_apply_confirm" "OK" "$gate_start" "mode=dryrun"
    else
        echo "✓ APPLY_CONFIRM=YES confirmed"
        heartbeat "gate_apply_confirm" "OK" "$gate_start" "confirm=YES"
    fi
}

# ============================================================================
# GATE: CONSCIOUSNESS CHECK
# ============================================================================

gate_consciousness_check() {
    local gate_start=$SECONDS
    echo ""
    echo "=========================================="
    echo "Gate: Consciousness Check"
    echo "=========================================="
    
    heartbeat "gate_consciousness" "START" "$gate_start" ""
    
    local confidence=${CONSCIOUSNESS_CONFIDENCE:-}
    
    # Try to read from JSON file if env var not set
    if [[ -z "$confidence" ]] && [[ -f "$SCRIPT_DIR/consciousness_state.json" ]]; then
        confidence=$(grep -oP '"confidence"\s*:\s*\K[0-9.]+' "$SCRIPT_DIR/consciousness_state.json" 2>/dev/null || echo "")
    fi
    
    # Default to fail if still not found
    if [[ -z "$confidence" ]]; then
        confidence=0.0
    fi
    
    echo "Consciousness confidence: $confidence"
    echo "Required minimum: $CONSCIOUSNESS_MIN"
    
    if (( $(awk "BEGIN {print ($confidence >= $CONSCIOUSNESS_MIN)}") )); then
        echo "✓ Consciousness check passed"
        heartbeat "gate_consciousness" "OK" "$gate_start" "confidence=$confidence,min=$CONSCIOUSNESS_MIN"
    else
        echo "✗ Consciousness check failed"
        heartbeat "gate_consciousness" "ERROR" "$gate_start" "confidence=$confidence,min=$CONSCIOUSNESS_MIN"
        return 1
    fi
}

# ============================================================================
# GATE: SWARM CONSENSUS CHECK
# ============================================================================

gate_swarm_consensus() {
    local gate_start=$SECONDS
    echo ""
    echo "=========================================="
    echo "Gate: Swarm Consensus Check"
    echo "=========================================="
    
    heartbeat "gate_swarm_consensus" "START" "$gate_start" ""
    
    local consensus=${SWARM_CONSENSUS:-}
    
    # Try to read from JSON file if env var not set
    if [[ -z "$consensus" ]] && [[ -f "$SCRIPT_DIR/swarm_state.json" ]]; then
        consensus=$(grep -oP '"consensus"\s*:\s*\K[0-9.]+' "$SCRIPT_DIR/swarm_state.json" 2>/dev/null || echo "")
    fi
    
    # Default to fail if still not found
    if [[ -z "$consensus" ]]; then
        consensus=0.0
    fi
    
    echo "Swarm consensus: $consensus"
    echo "Required minimum: $CONSENSUS_MIN"
    
    if (( $(awk "BEGIN {print ($consensus >= $CONSENSUS_MIN)}") )); then
        echo "✓ Swarm consensus check passed"
        heartbeat "gate_swarm_consensus" "OK" "$gate_start" "consensus=$consensus,min=$CONSENSUS_MIN"
    else
        echo "✗ Swarm consensus check failed"
        heartbeat "gate_swarm_consensus" "ERROR" "$gate_start" "consensus=$consensus,min=$CONSENSUS_MIN"
        return 1
    fi
}

# ============================================================================
# GATE: GRAPHITI KNOWLEDGE GRAPH CHECK
# ============================================================================

gate_graphiti_check() {
    local gate_start=$SECONDS
    echo ""
    echo "=========================================="
    echo "Gate: Graphiti Knowledge Graph Check"
    echo "=========================================="
    
    heartbeat "gate_graphiti" "START" "$gate_start" ""
    
    local status="unknown"
    
    # Try API endpoint if configured
    if [[ -n "${GRAPHITI_ENDPOINT:-}" ]] && [[ -n "${GRAPHITI_TOKEN:-}" ]]; then
        echo "Checking Graphiti API: $GRAPHITI_ENDPOINT"
        local response
        response=$(curl -s -H "Authorization: Bearer $GRAPHITI_TOKEN" \
            "$GRAPHITI_ENDPOINT/deployments/affiliate-platform/prod/status" 2>/dev/null || echo "")
        
        if echo "$response" | grep -q '"status":"approved"'; then
            status="approved"
        elif echo "$response" | grep -q '"status":"ready"'; then
            status="ready"
        fi
    # Try local file
    elif [[ -f "$SCRIPT_DIR/graphiti_state.json" ]]; then
        echo "Checking local graphiti_state.json"
        status=$(grep -oP '"status"\s*:\s*"\K[^"]+' "$SCRIPT_DIR/graphiti_state.json" 2>/dev/null || echo "unknown")
    fi
    
    echo "Graphiti status: $status"
    
    if [[ "$status" == "approved" ]] || [[ "$status" == "ready" ]]; then
        echo "✓ Graphiti check passed"
        heartbeat "gate_graphiti" "OK" "$gate_start" "status=$status"
    elif [[ "$DRY_RUN" == "1" ]]; then
        echo "⚠ Graphiti check skipped (dry-run mode)"
        heartbeat "gate_graphiti" "OK" "$gate_start" "status=$status,mode=dryrun"
    else
        echo "✗ Graphiti check failed"
        heartbeat "gate_graphiti" "ERROR" "$gate_start" "status=$status"
        return 1
    fi
}

# ============================================================================
# PRE-CANARY VALIDATION
# ============================================================================

pre_canary_validation() {
    local phase_start=$SECONDS
    echo ""
    echo "=========================================="
    echo "Pre-Canary Validation"
    echo "=========================================="
    
    heartbeat "pre_canary_validation" "START" "$phase_start" ""
    
    if [[ ! -x "$SCRIPT_DIR/comprehensive_validation_suite.sh" ]]; then
        echo "✗ Validation suite not found or not executable"
        heartbeat "pre_canary_validation" "ERROR" "$phase_start" "suite_missing=1"
        return 1
    fi
    
    echo "Running comprehensive validation suite..."
    if "$SCRIPT_DIR/comprehensive_validation_suite.sh"; then
        echo "✓ Pre-canary validation passed"
        heartbeat "pre_canary_validation" "OK" "$phase_start" "validation=pass"
    else
        echo "✗ Pre-canary validation failed"
        heartbeat "pre_canary_validation" "ERROR" "$phase_start" "validation=fail"
        return 1
    fi
}

# ============================================================================
# CANARY DEPLOYMENT (10%)
# ============================================================================

deploy_canary() {
    local phase_start=$SECONDS
    echo ""
    echo "=========================================="
    echo "Canary Deployment (10% traffic)"
    echo "=========================================="
    
    heartbeat "canary_deploy" "START" "$phase_start" ""
    
    if [[ "$DRY_RUN" == "1" ]]; then
        echo "[DRY-RUN] Would configure canary at 10% traffic"
        echo "[DRY-RUN] Primary: $PRIMARY_UPSTREAM"
        echo "[DRY-RUN] Canary: $CANARY_UPSTREAM"
        heartbeat "canary_deploy" "OK" "$phase_start" "mode=dryrun,percent=10"
        return 0
    fi
    
    local nginx_root
    nginx_root=$(detect_nginx_root)
    
    # Create canary configuration
    local canary_conf="$nginx_root/conf.d/canary.conf"
    echo "Creating canary configuration: $canary_conf"
    
    sudo tee "$canary_conf" > /dev/null << EOF
# Canary configuration for progressive rollout
# Generated: $(date)
# Correlation ID: $CORRELATION_ID

split_clients "\${remote_addr}" \$canary_backend {
    10%    $CANARY_UPSTREAM;
    *      $PRIMARY_UPSTREAM;
}

# Add X-Canary header for observability
add_header X-Canary "\$canary_backend" always;
EOF
    
    # Validate and reload
    if test_nginx; then
        reload_nginx
        echo "✓ Canary deployed at 10%"
        
        # Monitor canary for 2 minutes
        echo "Monitoring canary for 2 minutes..."
        local monitor_duration=120
        local check_interval=15
        local errors=0
        
        for ((i=1; i<=$monitor_duration; i+=$check_interval)); do
            echo "  Check $(( (i-1)/check_interval + 1))/$(( monitor_duration/check_interval ))..."
            
            # Sample health endpoints
            if ! curl -s -m 5 https://interface.rooz.live/healthz 2>/dev/null | grep -q "OK"; then
                ((errors++))
            fi
            
            if [[ $errors -gt 2 ]]; then
                echo "✗ Canary monitoring detected failures"
                heartbeat "canary_deploy" "ERROR" "$phase_start" "percent=10,errors=$errors"
                return 1
            fi
            
            sleep $check_interval
        done
        
        echo "✓ Canary monitoring passed"
        heartbeat "canary_deploy" "OK" "$phase_start" "percent=10,errors=$errors"
    else
        echo "✗ Nginx validation failed"
        heartbeat "canary_deploy" "ERROR" "$phase_start" "validation_failed=1"
        return 1
    fi
}

# ============================================================================
# PROGRESSIVE ROLLOUT
# ============================================================================

progressive_rollout() {
    local phase_start=$SECONDS
    echo ""
    echo "=========================================="
    echo "Progressive Rollout"
    echo "=========================================="
    
    heartbeat "progressive_rollout" "START" "$phase_start" ""
    
    local nginx_root
    nginx_root=$(detect_nginx_root)
    local canary_conf="$nginx_root/conf.d/canary.conf"
    
    for stage in "${ROLLOUT_STAGES[@]}"; do
        if [[ $stage -eq 10 ]]; then
            continue  # Already deployed in canary phase
        fi
        
        echo ""
        echo "Deploying to ${stage}% traffic..."
        
        if [[ "$DRY_RUN" == "1" ]]; then
            echo "[DRY-RUN] Would update canary to ${stage}%"
            heartbeat "progressive_rollout_${stage}" "OK" "$((SECONDS - phase_start))" "mode=dryrun,percent=$stage"
            sleep 2
            continue
        fi
        
        # Update canary configuration
        local canary_percent=$stage
        local primary_percent=$((100 - stage))
        
        sudo tee "$canary_conf" > /dev/null << EOF
# Canary configuration for progressive rollout
# Generated: $(date)
# Correlation ID: $CORRELATION_ID
# Stage: ${stage}%

split_clients "\${remote_addr}" \$canary_backend {
    ${canary_percent}%    $CANARY_UPSTREAM;
    *                      $PRIMARY_UPSTREAM;
}

add_header X-Canary "\$canary_backend" always;
EOF
        
        # Validate and reload
        if ! test_nginx; then
            echo "✗ Nginx validation failed at ${stage}%"
            heartbeat "progressive_rollout_${stage}" "ERROR" "$((SECONDS - phase_start))" "percent=$stage,validation_failed=1"
            return 1
        fi
        
        reload_nginx
        echo "✓ Traffic shifted to ${stage}%"
        
        # Run validation
        echo "Running validation at ${stage}%..."
        if ! "$SCRIPT_DIR/comprehensive_validation_suite.sh" > /dev/null 2>&1; then
            echo "✗ Validation failed at ${stage}%"
            heartbeat "progressive_rollout_${stage}" "ERROR" "$((SECONDS - phase_start))" "percent=$stage,validation_failed=1"
            return 1
        fi
        
        echo "✓ Validation passed at ${stage}%"
        heartbeat "progressive_rollout_${stage}" "OK" "$((SECONDS - phase_start))" "percent=$stage"
        
        # Pause between stages
        if [[ $stage -lt 100 ]]; then
            echo "Stabilizing for 30 seconds..."
            sleep 30
        fi
    done
    
    heartbeat "progressive_rollout" "OK" "$phase_start" "final_percent=100"
}

# ============================================================================
# POST-DEPLOYMENT VALIDATION
# ============================================================================

post_deployment_validation() {
    local phase_start=$SECONDS
    echo ""
    echo "=========================================="
    echo "Post-Deployment Validation"
    echo "=========================================="
    
    heartbeat "post_deploy_validation" "START" "$phase_start" ""
    
    if [[ "$DRY_RUN" == "1" ]]; then
        echo "[DRY-RUN] Would run post-deployment validation"
        heartbeat "post_deploy_validation" "OK" "$phase_start" "mode=dryrun"
        return 0
    fi
    
    echo "Running final validation at 100%..."
    if "$SCRIPT_DIR/comprehensive_validation_suite.sh"; then
        echo "✓ Post-deployment validation passed"
        heartbeat "post_deploy_validation" "OK" "$phase_start" "validation=pass"
    else
        echo "✗ Post-deployment validation failed"
        heartbeat "post_deploy_validation" "ERROR" "$phase_start" "validation=fail"
        return 1
    fi
}

# ============================================================================
# ROLLBACK
# ============================================================================

rollback() {
    local rollback_start=$SECONDS
    local reason="${1:-unknown}"
    
    echo ""
    echo "=========================================="
    echo "⚠ ROLLBACK INITIATED"
    echo "=========================================="
    echo "Reason: $reason"
    
    heartbeat "rollback" "START" "$rollback_start" "reason=$reason"
    
    if [[ "$DRY_RUN" == "1" ]]; then
        echo "[DRY-RUN] Would rollback to previous configuration"
        heartbeat "rollback" "OK" "$rollback_start" "mode=dryrun"
        return 0
    fi
    
    local nginx_root
    nginx_root=$(detect_nginx_root)
    
    # Find latest backup
    local backup
    backup=$(ls -t "${nginx_root}_backup_"*.tar.gz 2>/dev/null | head -1 || echo "")
    
    if [[ -z "$backup" ]]; then
        backup=$(ls -td "${nginx_root}_backup_"* 2>/dev/null | head -1 || echo "")
    fi
    
    if [[ -z "$backup" ]]; then
        echo "✗ No backup found for rollback"
        heartbeat "rollback" "ERROR" "$rollback_start" "no_backup=1"
        return 1
    fi
    
    echo "Restoring from backup: $backup"
    
    # Restore backup
    if [[ "$backup" == *.tar.gz ]]; then
        sudo tar -xzf "$backup" -C "$(dirname "$nginx_root")"
    else
        sudo rm -rf "$nginx_root"
        sudo cp -r "$backup" "$nginx_root"
    fi
    
    # Validate and reload
    if test_nginx; then
        reload_nginx
        echo "✓ Rollback completed successfully"
        heartbeat "rollback" "OK" "$rollback_start" "backup=$backup"
    else
        echo "✗ Rollback validation failed"
        heartbeat "rollback" "ERROR" "$rollback_start" "validation_failed=1"
        return 1
    fi
}

# ============================================================================
# MAIN
# ============================================================================

main() {
    local main_start=$SECONDS
    
    echo ""
    echo "=========================================="
    echo "Ultimate Production Deployment Orchestrator"
    echo "Correlation ID: $CORRELATION_ID"
    echo "Timestamp: $(date)"
    echo "=========================================="
    
    # Create logs directory
    mkdir -p "$SCRIPT_DIR/logs"
    
    heartbeat "main" "START" "$main_start" "mode=$([[ $DRY_RUN == 1 ]] && echo dryrun || echo production)"
    
    # Run all gates
    echo ""
    echo "Running safety gates..."
    
    if ! gate_apply_confirmation; then
        echo "✗ Apply confirmation gate failed"
        exit 2
    fi
    
    if ! gate_consciousness_check; then
        echo "✗ Consciousness gate failed"
        exit 1
    fi
    
    if ! gate_swarm_consensus; then
        echo "✗ Swarm consensus gate failed"
        exit 1
    fi
    
    if ! gate_graphiti_check; then
        echo "✗ Graphiti gate failed"
        exit 1
    fi
    
    echo "✓ All safety gates passed"
    
    # Pre-canary validation
    if ! pre_canary_validation; then
        echo "✗ Pre-canary validation failed"
        exit 1
    fi
    
    # Canary deployment
    if ! deploy_canary; then
        echo "✗ Canary deployment failed"
        rollback "canary_failure"
        exit 1
    fi
    
    # Progressive rollout
    if ! progressive_rollout; then
        echo "✗ Progressive rollout failed"
        rollback "rollout_failure"
        exit 1
    fi
    
    # Post-deployment validation
    if ! post_deployment_validation; then
        echo "✗ Post-deployment validation failed"
        rollback "post_validation_failure"
        exit 1
    fi
    
    # Success
    echo ""
    echo "=========================================="
    echo "✓ DEPLOYMENT SUCCESSFUL"
    echo "=========================================="
    echo "Deployment ID: deploy_$TIMESTAMP"
    echo "Canary → Progressive Rollout → 100% Complete"
    echo "All validation gates passed"
    echo ""
    
    heartbeat "main" "OK" "$main_start" "deployment_id=deploy_$TIMESTAMP,status=success"
}

# Run main
main "$@"
