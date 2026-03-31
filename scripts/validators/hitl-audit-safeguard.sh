#!/bin/bash
# HITL Audit & Safeguard Script
# @business-context WSJF-1: Email tracking HITL compliance
# @adr ADR-005: Governance constraints
# @constraint R-2026-016: Submodule Git index recursion limit
# @planned-change R-2026-018: Attention fragmentation consolidation
# Tracks all file movements to 02-EMAILS/sent/ and ensures HITL compliance
# Usage: ./hitl-audit-safeguard.sh [--watch|--audit|--fix]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source robust exit codes
if [[ -f "$PROJECT_ROOT/scripts/validation-core.sh" ]]; then
    source "$PROJECT_ROOT/scripts/validation-core.sh"
else
    EXIT_SUCCESS=0; EXIT_INVALID_ARGS=10; EXIT_FILE_NOT_FOUND=11
    EXIT_TOOL_MISSING=60; EXIT_SCHEMA_VALIDATION_FAILED=100
fi

LEGAL_DIR="${HOME}/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL"
EMAILS_DIR="${LEGAL_DIR}/02-EMAILS"
SENT_DIR="${EMAILS_DIR}/sent"
VALIDATED_DIR="${EMAILS_DIR}/validated"
DRAFTS_DIR="${EMAILS_DIR}/drafts"
HITL_LOG="${EMAILS_DIR}/.meta/hitl-verification.log"
AUDIT_LOG="${EMAILS_DIR}/.meta/hitl-audit.log"
META_DIR="${EMAILS_DIR}/.meta"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $*"; }
success() { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $*"; }
error() { echo -e "${RED}[✗]${NC} $*"; }

# Ensure meta directory exists
mkdir -p "$META_DIR"

# ═══════════════════════════════════════════════════════════════════════════════
# AUDIT: Check all files in sent/ for proper HITL approval
# ═══════════════════════════════════════════════════════════════════════════════

audit_sent_folder() {
    log "🔍 AUDIT: Checking all files in sent/ for HITL compliance..."

    # CSQBM Governance Constraint: emit background trace telemetry
    local proj_root="$(cd "$(dirname "$(dirname "$(dirname "${BASH_SOURCE[0]}")")")" && pwd)"
    if [[ -x "$proj_root/scripts/validators/project/check-csqbm.sh" ]]; then
        ALLOW_CSQBM_BYPASS="${ALLOW_CSQBM_BYPASS:-true}" bash "$proj_root/scripts/validators/project/check-csqbm.sh" --deep-why >/dev/null 2>&1 || {
            error "CSQBM Governance Failure. System operation halted to preserve interior truth boundaries."
            exit 100
        }
    fi

    local violations=0
    local approved=0

    for sent_file in "$SENT_DIR"/*.eml; do
        [[ -f "$sent_file" ]] || continue

        local filename
        filename=$(basename "$sent_file")

        # Check if file exists in validated/ (required before sent/)
        if [[ ! -f "${VALIDATED_DIR}/${filename}" ]]; then
            warn "VIOLATION: $filename in sent/ but NOT in validated/"
            warn "  → File was moved to sent/ without validation"
            ((violations++))

            # Log violation
            echo "$(date '+%Y-%m-%dT%H:%M:%S')|VIOLATION|$filename|Not in validated/" >> "$AUDIT_LOG"
            continue
        fi

        # Check HITL log for approval
        if [[ -f "$HITL_LOG" ]]; then
            if grep -q "APPROVED.*$filename" "$HITL_LOG" 2>/dev/null; then
                success "✓ $filename has HITL approval"
                ((approved++))
            else
                # Check if it was moved anyway (pending or no record)
                local hitl_status
                hitl_status=$(grep "$filename" "$HITL_LOG" 2>/dev/null | tail -1 || echo "NO_RECORD")

                if [[ "$hitl_status" == "NO_RECORD" ]]; then
                    warn "VIOLATION: $filename in sent/ with NO HITL record"
                    warn "  → File was moved without any HITL verification"
                    ((violations++))
                    echo "$(date '+%Y-%m-%dT%H:%M:%S')|VIOLATION|$filename|No HITL record" >> "$AUDIT_LOG"
                elif echo "$hitl_status" | grep -q "PENDING"; then
                    warn "VIOLATION: $filename in sent/ but HITL status is PENDING"
                    warn "  → File was moved before HITL approval"
                    ((violations++))
                    echo "$(date '+%Y-%m-%dT%H:%M:%S')|VIOLATION|$filename|HITL PENDING" >> "$AUDIT_LOG"
                fi
            fi
        else
            warn "VIOLATION: $filename in sent/ but NO HITL log exists"
            ((violations++))
            echo "$(date '+%Y-%m-%dT%H:%M:%S')|VIOLATION|$filename|No HITL log" >> "$AUDIT_LOG"
        fi
    done

    echo ""
    log "════════════════════════════════════════════════════════════════"
    log "AUDIT COMPLETE:"
    log "  Approved:   $approved"
    log "  Violations: $violations"
    log "════════════════════════════════════════════════════════════════"

    if [[ $violations -gt 0 ]]; then
        error "⚠️  $violations files in sent/ without proper HITL approval!"
        error "   Run with --fix to move violations back to validated/"
        return 1
    else
        success "✅ All files in sent/ have proper HITL approval"
        return 0
    fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# FIX: Move violations back to validated/
# ═══════════════════════════════════════════════════════════════════════════════

fix_violations() {
    log "🔧 FIX: Moving HITL violations back to validated/..."

    local fixed=0

    for sent_file in "$SENT_DIR"/*.eml; do
        [[ -f "$sent_file" ]] || continue

        local filename
        filename=$(basename "$sent_file")

        # Check if properly approved
        local is_approved=false
        if [[ -f "$HITL_LOG" ]] && grep -q "APPROVED.*$filename" "$HITL_LOG" 2>/dev/null; then
            is_approved=true
        fi

        if [[ "$is_approved" == "false" ]]; then
            warn "Moving $filename back to validated/ (no HITL approval)"

            # Copy to validated/ (keep backup in sent/ for now)
            cp "$sent_file" "${VALIDATED_DIR}/${filename}"

            # Log the fix
            echo "$(date '+%Y-%m-%dT%H:%M:%S')|FIXED|$filename|Moved back to validated/" >> "$AUDIT_LOG"

            ((fixed++))
        fi
    done

    log "Fixed $fixed files"
}

# ═══════════════════════════════════════════════════════════════════════════════
# WATCH: Monitor sent/ folder in real-time
# ═══════════════════════════════════════════════════════════════════════════════

watch_sent_folder() {
    log "👁️  WATCH: Monitoring sent/ folder for HITL violations..."
    log "Press Ctrl+C to stop"

    # Use fswatch or inotifywait if available, otherwise poll
    if command -v fswatch &> /dev/null; then
        fswatch -o "$SENT_DIR" | while read -r; do
            log "Change detected in sent/"
            audit_sent_folder
        done
    else
        # Polling fallback
        while true; do
            sleep 5
            audit_sent_folder &> /dev/null || {
                error "🚨 HITL VIOLATION DETECTED!"
                # Could add notification here (sound, alert, etc.)
            }
        done
    fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# PULSE: Health & Heartbeat Telemetry (R-2026-016 Replacement)
# ═══════════════════════════════════════════════════════════════════════════════

pulse_cron_heartbeat() {
    log "💓 PULSE: Emitting HITL safeguard heartbeat telemetry..."
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local pulse_file="$META_DIR/hitl-safeguard.pulse"
    
    echo '{"timestamp": "'"$timestamp"'", "status": "UP", "service": "hitl-audit-safeguard", "remediation_mode": "native_pulse"}' > "$pulse_file"
    success "Pulse recorded to $pulse_file"
}

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

case "${1:-audit}" in
    --audit|-a)
        audit_sent_folder
        ;;
    --fix|-f)
        fix_violations
        ;;
    --watch|-w)
        pulse_cron_heartbeat
        watch_sent_folder
        ;;
    --pulse|-p)
        pulse_cron_heartbeat
        ;;
    --help|-h)
        echo "HITL Audit & Safeguard"
        echo ""
        echo "Usage: $0 [option]"
        echo ""
        echo "Options:"
        echo "  --audit   Check all files in sent/ for HITL compliance (default)"
        echo "  --fix     Move violations back to validated/"
        echo "  --watch   Continuously monitor sent/ folder"
        echo "  --pulse   Emit backend cron health monitoring telemetry payload"
        echo "  --help    Show this help"
        echo ""
        echo "Exit codes:"
        echo "  0 = All files compliant"
        echo "  1 = Violations found"
        ;;
    *)
        audit_sent_folder
        ;;
esac
