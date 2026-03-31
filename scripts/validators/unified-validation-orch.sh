#!/usr/bin/env bash
# unified-validation-orch.sh
# Integrates valid*.sh with backup/capacity comparison
# Tracks all iterations, formats, and story arcs
# %/# LABEL.INTERFACE.TAG.VOTE? %/# %.#

set -euo pipefail

# Source robust exit codes
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/validation-core.sh" 2>/dev/null || {
    EX_OK=0
    EX_USAGE=64
    EX_VALIDATION_FAILED=65
    EX_DATAERR=65
}

# Paths
EMAILS_BASE="/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/02-EMAILS"
META_DIR="${EMAILS_BASE}/.meta"
TRACKING_FILE="${META_DIR}/email-lifecycle-tracking.json"
BACKUP_DIR="/Users/shahroozbhopti/Documents/code/investing/agentic-flow/.backups/emails"
LOG_FILE="${META_DIR}/validation-orch.log"

# Ensure directories
mkdir -p "$META_DIR" "$BACKUP_DIR"

# Validation script registry
VALIDATION_REGISTRY=(
    "validate-email-pre-send.sh:full"
    "email-gate-lean.sh:lean"
    "email-hitl-gate.sh:hitl"
    "semantic-validation-gate.sh:semantic"
    "validate-email.sh:legacy"
)

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Function: Create backup before validation
backup_before_validation() {
    local email_file="$1"
    local email_name=$(basename "$email_file")
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local backup_path="${BACKUP_DIR}/${timestamp}_${email_name}"
    
    cp "$email_file" "$backup_path"
    log "BACKUP: Created $backup_path"
    echo "$backup_path"
}

# Function: Compute SHA256
compute_hash() {
    local file="$1"
    shasum -a 256 "$file" 2>/dev/null | cut -d' ' -f1 || echo "hash-error"
}

# Function: Run validation with tracking
run_validated() {
    local email_file="$1"
    local validation_type="${2:-full}"
    local script_name=""
    
    # Find appropriate script
    for entry in "${VALIDATION_REGISTRY[@]}"; do
        IFS=: read -r script vtype <<< "$entry"
        if [[ "$vtype" == "$validation_type" ]]; then
            script_name="$script"
            break
        fi
    done
    
    if [[ -z "$script_name" ]]; then
        log "ERROR: Unknown validation type: $validation_type"
        return $EX_USAGE
    fi
    
    local script_path="${SCRIPT_DIR}/${script_name}"
    if [[ ! -f "$script_path" ]]; then
        log "ERROR: Script not found: $script_path"
        return $EX_DATAERR
    fi
    
    # Create backup
    local backup_path=$(backup_before_validation "$email_file")
    local pre_hash=$(compute_hash "$email_file")
    
    # Run validation
    log "VALIDATION: Running $script_name on $(basename "$email_file")"
    local start_time=$(date +%s%N)
    
    local output
    local exit_code
    if output=$("$script_path" --file "$email_file" 2>&1); then
        exit_code=$EX_OK
    else
        exit_code=$?
    fi
    export RUNNER_EXIT="$exit_code"
    
    local end_time=$(date +%s%N)
    local duration_ms=$(( (end_time - start_time) / 1000000 ))
    
    # Parse results
    local issues=()
    local score=0
    local checks_passed=0
    local checks_total=0
    
    # Extract issues from output
    while IFS= read -r line; do
        case "$line" in
            PASS\|*)
                checks_passed=$((checks_passed + 1))
                checks_total=$((checks_total + 1))
                ;;
            WARN\|*)
                checks_passed=$((checks_passed + 1))
                checks_total=$((checks_total + 1))
                ;;
            FAIL\|*)
                checks_total=$((checks_total + 1))
                ;;
            *"PLACEHOLDER"*|*"placeholder"*)
                issues+=("Placeholder detected")
                ;;
            *"Pro Se"*|*"pro se"*)
                : # Good - has Pro Se
                ;;
            *"N.C.G.S"*|*"N.C.G."*)
                : # Good - has legal citations
                ;;
            *"Score:"*|*"score:"*)
                score=$(echo "$line" | grep -oE '[0-9]+' | head -1)
                ;;
        esac
    done <<< "$output"
    local iteration="${VALIDATION_ITERATION:-1}"
    
    # If no explicit score, calculate from issues
    if [[ $score -eq 0 ]]; then
        if [[ $exit_code -eq $EX_OK ]]; then
            score=100
        else
            score=$(( 100 - (${#issues[@]} * 15) ))
            [[ $score -lt 0 ]] && score=0
        fi
    fi
    
    # Track in Python tracker
    python3 "${SCRIPT_DIR}/email-lifecycle-tracker.py" track-validation \
        --email "$email_file" \
        --script "$script_name" \
        --exit-code "$exit_code" \
        --duration "$duration_ms" \
        --score "$score" \
        --issues "${issues[*]}" \
        --hash "$pre_hash" \
        2>/dev/null || true
    
    log "RESULT: exit=$exit_code RUNNER_EXIT=$RUNNER_EXIT score=$score duration=${duration_ms}ms issues=${#issues[@]} %/#=${checks_passed}/${checks_total} %.#=iter:${iteration}"

    # Optional JSON handoff for dashboard/API consumers.
    if [[ "${UNIFIED_VALIDATION_JSON:-0}" == "1" ]]; then
        local good_enough_to_send="false"
        if [[ "$exit_code" -le 1 && "$checks_total" -gt 0 && "$checks_passed" -eq "$checks_total" ]]; then
            good_enough_to_send="true"
        fi
        local pass_rate_pct
        if [[ "$checks_total" -gt 0 ]]; then
            pass_rate_pct=$(echo "scale=2; ($checks_passed * 100) / $checks_total" | bc 2>/dev/null || echo "0")
        else
            pass_rate_pct="0"
        fi
        local failures_100_plus=0
        if [[ "$exit_code" -ge 100 ]]; then failures_100_plus=1; fi
        local top_reason=""
        if [[ "${#issues[@]}" -gt 0 ]]; then
            top_reason="${issues[0]}"
        fi
        local next_action="Fix issues and re-run validation."
        local roam_tag="M: Mitigated - validation fix path available"
        if [[ "$exit_code" -le 1 ]]; then
            next_action="Proceed with HITL send review."
            roam_tag="R: Resolved - gate passes"
        elif [[ "$exit_code" -lt 100 ]]; then
            next_action="Fix config/input issues and re-run validation."
            roam_tag="O: Owned - input/config remediation required"
        fi
        local hints_json="[]"
        if [[ "${#issues[@]}" -gt 0 ]]; then
            hints_json=$(printf '%s\n' "${issues[@]}" | python3 - <<'PY'
import json, sys
vals=[x.strip() for x in sys.stdin.read().splitlines() if x.strip()]
print(json.dumps(vals))
PY
)
        fi
        cat <<EOF
{"exit_code":$exit_code,"RUNNER_EXIT":$exit_code,"runner_exit":$exit_code,"good_enough_to_send":$good_enough_to_send,"send_ready":$good_enough_to_send,"validation_ok":$good_enough_to_send,"fail_count":$((checks_total-checks_passed)),"checks_passed":$checks_passed,"checks_total":$checks_total,"iteration":$iteration,"%/#":{"checks_passed":$checks_passed,"checks_total":$checks_total},"%.#":{"iteration":$iteration,"pass_rate_pct":$pass_rate_pct,"checks_failed":$((checks_total-checks_passed))},"fix_hints":$hints_json,"failures_100_plus":$failures_100_plus,"rca_trace":{"raw_exit":$exit_code,"top_reason":"$(printf '%s' "$top_reason" | sed 's/"/\\"/g')","next_action":"$next_action","roam_tag":"$roam_tag"}}
EOF
    fi
    
    # Return original exit code
    return $exit_code
}

# Function: Track format upgrade
track_format_upgrade() {
    local email_file="$1"
    local from_format="$2"
    local to_format="$3"
    shift 3
    local elements=("$@")
    
    python3 "${SCRIPT_DIR}/email-lifecycle-tracker.py" track-format \
        --email "$email_file" \
        --from "$from_format" \
        --to "$to_format" \
        --elements "${elements[*]}" \
        2>/dev/null || true
    
    log "FORMAT: Upgraded $email_file from $from_format to $to_format"
}

# Function: Track edit
track_edit() {
    local email_file="$1"
    local editor="$2"
    local changes="$3"
    
    python3 "${SCRIPT_DIR}/email-lifecycle-tracker.py" track-edit \
        --email "$email_file" \
        --editor "$editor" \
        --changes "$changes" \
        2>/dev/null || true
    
    log "EDIT: $editor edited $email_file - $changes"
}

# Function: Compute WSJF and prioritize
compute_wsjf_priority() {
    local email_file="$1"
    local bv="$2"    # Business Value
    local tc="$3"    # Time Criticality  
    local rr="$4"    # Risk Reduction
    local job_size="$5"
    
    local wsjf_score=$(echo "scale=2; ($bv + $tc + $rr) / $job_size" | bc 2>/dev/null || echo "0")
    local priority
    
    if (( $(echo "$wsjf_score >= 50" | bc -l) )); then
        priority="NOW"
    elif (( $(echo "$wsjf_score >= 20" | bc -l) )); then
        priority="NEXT"
    else
        priority="LATER"
    fi
    
    python3 "${SCRIPT_DIR}/email-lifecycle-tracker.py" compute-wsjf \
        --email "$email_file" \
        --bv "$bv" --tc "$tc" --rr "$rr" --job-size "$job_size" \
        2>/dev/null || true
    
    log "WSJF: $email_file score=$wsjf_score priority=$priority"
    echo "$priority"
}

# Function: Detect duplicates across directories
detect_duplicates() {
    log "DUPLICATE_CHECK: Scanning for duplicates..."
    
    local -A hash_map
    local duplicates_found=0
    
    for dir in "${EMAILS_BASE}/validated" "${EMAILS_BASE}/sent" "${EMAILS_BASE}/drafts"; do
        [[ -d "$dir" ]] || continue
        
        for eml in "$dir"/*.eml; do
            [[ -f "$eml" ]] || continue
            
            local hash=$(compute_hash "$eml")
            if [[ -n "${hash_map[$hash]}" ]]; then
                log "DUPLICATE: $eml matches ${hash_map[$hash]}"
                ((duplicates_found++))
            else
                hash_map[$hash]="$eml"
            fi
        done
    done
    
    log "DUPLICATE_CHECK: Found $duplicates_found duplicates"
    return $duplicates_found
}

# Function: Run capacity comparison
run_capacity_comparison() {
    log "CAPACITY: Running capacity comparison..."
    
    # Count emails by status
    local validated_count=$(find "${EMAILS_BASE}/validated" -name "*.eml" 2>/dev/null | wc -l)
    local sent_count=$(find "${EMAILS_BASE}/sent" -name "*.eml" 2>/dev/null | wc -l)
    local drafts_count=$(find "${EMAILS_BASE}/drafts" -name "*.eml" 2>/dev/null | wc -l)
    local total=$((validated_count + sent_count + drafts_count))
    
    log "CAPACITY: validated=$validated_count sent=$sent_count drafts=$drafts_count total=$total"
    
    # Calculate throughput
    local sent_today=$(find "${EMAILS_BASE}/sent" -name "*.eml" -mtime -1 2>/dev/null | wc -l)
    log "CAPACITY: Sent in last 24h: $sent_today"
}

# Function: Mover email truth scan (drafted/validated/sent/received)
scan_mover_email_truth() {
    local mover_re='mover|moving|packer|unpacker|uhaul|bellhops|twomenandatruck|thumbtack|classy gals'
    local drafts_dir="${EMAILS_BASE}/drafts"
    local validated_dir="${EMAILS_BASE}/validated"
    local sent_dir="${EMAILS_BASE}/sent"
    local received_dir="${EMAILS_BASE}/received"

    local drafted=0
    local validated=0
    local sent=0
    local received=0

    [[ -d "$drafts_dir" ]] && drafted=$(rg -l -i "$mover_re" "$drafts_dir" --glob "*.eml" 2>/dev/null | wc -l | tr -d ' ')
    [[ -d "$validated_dir" ]] && validated=$(rg -l -i "$mover_re" "$validated_dir" --glob "*.eml" 2>/dev/null | wc -l | tr -d ' ')
    [[ -d "$sent_dir" ]] && sent=$(rg -l -i "$mover_re" "$sent_dir" --glob "*.eml" 2>/dev/null | wc -l | tr -d ' ')
    [[ -d "$received_dir" ]] && received=$(rg -l -i "$mover_re" "$received_dir" --glob "*.eml" 2>/dev/null | wc -l | tr -d ' ')

    local total=$((drafted + validated + sent + received))
    log "MOVER_TRUTH: drafted=$drafted validated=$validated sent=$sent received=$received total=$total"
    cat <<EOF
{"drafted":$drafted,"validated":$validated,"sent":$sent,"received":$received,"total":$total}
EOF
}

# Main execution
main() {
    local command="${1:-help}"
    
    case "$command" in
        validate)
            shift
            run_validated "$@"
            ;;
        format-upgrade)
            shift
            track_format_upgrade "$@"
            ;;
        edit)
            shift
            track_edit "$@"
            ;;
        wsjf)
            shift
            compute_wsjf_priority "$@"
            ;;
        duplicates)
            detect_duplicates
            ;;
        capacity)
            run_capacity_comparison
            ;;
        mover-truth)
            scan_mover_email_truth
            ;;
        sweep)
            log "SWEEP: Running full validation sweep"
            detect_duplicates
            run_capacity_comparison
            # Validate all pending emails
            for eml in "${EMAILS_BASE}/validated"/*.eml; do
                [[ -f "$eml" ]] || continue
                run_validated "$eml" full
            done
            ;;
        help|*)
            cat << 'EOF'
Unified Validation Orchestrator
Usage: unified-validation-orch.sh [COMMAND] [ARGS]

Commands:
  validate <email> [type]     Run validation with full tracking
  format-upgrade <email> <from> <to> [elements...]
                            Track format upgrade
  edit <email> <editor> <changes>
                            Track edit
  wsjf <email> <bv> <tc> <rr> <job_size>
                            Compute WSJF priority
  duplicates                Detect duplicate emails
  capacity                  Run capacity comparison
  mover-truth               Scan mover email truth counts (drafted/validated/sent/received)
  sweep                     Full validation sweep

Examples:
  unified-validation-orch.sh validate EMAIL-TO-DOUG.eml full
  unified-validation-orch.sh wsjf EMAIL-TO-DOUG.eml 100 95 90 5
  unified-validation-orch.sh sweep

Exit Codes:
  0 = Success
  64 = Usage error
  65 = Validation failed
EOF
            ;;
    esac
}

main "$@"
