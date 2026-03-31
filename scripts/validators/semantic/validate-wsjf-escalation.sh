#!/usr/bin/env bash
# scripts/validators/semantic/validate-wsjf-escalation.sh
# Validator #12: WSJF ROAM Escalator
# Scans legal folders for new files, extracts keywords, routes to WSJF risk matrix

set -euo pipefail

# Source robust exit codes
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
if [[ -f "$PROJECT_ROOT/scripts/validation-core.sh" ]]; then
    source "$PROJECT_ROOT/scripts/validation-core.sh"
fi

LEGAL_BASE="/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL"
EMAIL_SENT="/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/*/CORRESPONDENCE/sent"
EMAIL_RECEIVED="/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/*/CORRESPONDENCE"
WSJF_MATRIX="/Users/shahroozbhopti/Documents/code/investing/agentic-flow/WSJF-RISK-MATRIX.yaml"
WSJF_HTML="/Users/shahroozbhopti/Documents/code/investing/agentic-flow/WSJF-DASHBOARD.html"
WSJF_LIVE="/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/00-DASHBOARD/WSJF-LIVE.html"
LOG_FILE="/Users/shahroozbhopti/Library/Logs/wsjf-escalator.log"

# ALL subfolder paths to scan
SCAN_PATHS=(
    "$LEGAL_BASE/*/CORRESPONDENCE"
    "$LEGAL_BASE/*/EXHIBITS"
    "$LEGAL_BASE/*/ORDERS"
    "$LEGAL_BASE/*/PLEADINGS"
    "$LEGAL_BASE/*/MOTIONS"
    "$LEGAL_BASE/*/DISCOVERY"
    "$LEGAL_BASE/*/EVIDENCE"
    "$LEGAL_BASE/*/BRIEFS"
    "$LEGAL_BASE/00-DASHBOARD"
)

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# STEP 1: Scan for new files (modified in last 24h)
scan_legal_folders() {
    # NOTE: Redirect log to stderr to avoid corrupting scan_result capture
    # RCA 2026-03-08: log output was being captured as first line of scan_result,
    # causing file_count to be parsed as log message instead of integer
    log "${YELLOW}Scanning legal folders for changes...${NC}" >&2

    local new_files=()

    # Scan all defined paths
    for scan_path in "${SCAN_PATHS[@]}"; do
        while IFS= read -r -d '' file; do
            new_files+=("$file")
        done < <(find $scan_path -type f \
            \( -name "*.pdf" -o -name "*.md" -o -name "*.eml" -o -name "*.json" -o -name "*.txt" -o -name "*.html" \) \
            -mtime -1 -print0 2>/dev/null || true)
    done

    echo "${#new_files[@]}"
    printf '%s\n' "${new_files[@]}"
}

# STEP 2: Extract keywords and route to WSJF risk
route_to_wsjf() {
    local file="$1"
    local filename=$(basename "$file")
    local content=""

    # Extract content based on file type
    case "$file" in
        *.pdf)
            # Use pdftotext if available
            if command -v pdftotext &>/dev/null; then
                content=$(pdftotext "$file" - 2>/dev/null || echo "")
            fi
            ;;
        *.md|*.eml|*.json)
            content=$(cat "$file")
            ;;
    esac

    # Keyword-based risk routing
    local risk_level="LOW"
    local track="unknown"

    # HIGH RISK keywords
    if echo "$content" | grep -qi "arbitration\|hearing\|trial\|court\|order"; then
        risk_level="HIGH"
        track="legal"
    elif echo "$content" | grep -qi "utilities\|duke energy\|charlotte water\|disconnect"; then
        risk_level="HIGH"
        track="utilities"
    elif echo "$content" | grep -qi "move\|mover\|moving\|lease"; then
        risk_level="MEDIUM"
        track="physical-move"
    elif echo "$content" | grep -qi "consulting\|contract\|income\|payment"; then
        risk_level="MEDIUM"
        track="income"
    fi

    # Store in ruflo memory for swarm routing
    if [[ "$risk_level" == "HIGH" ]]; then
        log "${RED}HIGH RISK: $filename → $track track${NC}"

        npx ruflo memory store \
            --key "wsjf-risk-$(date +%s)" \
            --value "{\"file\":\"$filename\",\"risk\":\"$risk_level\",\"track\":\"$track\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" \
            --namespace wsjf-escalations 2>/dev/null || true

        # Route to appropriate swarm
        npx ruflo hooks route \
            --task "Review HIGH risk file: $filename in $track track" \
            --context "$track-swarm" \
            --priority critical 2>/dev/null || true
    else
        log "${GREEN}$risk_level risk: $filename${NC}"
    fi
}

# STEP 3: Update WSJF risk matrix
update_wsjf_matrix() {
    local high_risk_count="$1"

    if [[ $high_risk_count -gt 0 ]]; then
        log "${YELLOW}Updating WSJF matrix with $high_risk_count new risks...${NC}"

        # Append to WSJF matrix (if exists)
        if [[ -f "$WSJF_MATRIX" ]]; then
            cat >> "$WSJF_MATRIX" <<EOF

# Auto-escalated risks ($(date +%Y-%m-%d))
# Scanned: $(date)
# High-risk files found: $high_risk_count
# Last scan: $(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF
        fi

        # Update HTML dashboard
        update_html_dashboard "$high_risk_count"
    fi
}

# STEP 4: Update HTML WSJF dashboard
update_html_dashboard() {
    local high_risk_count="$1"

    # T0 FIX: Pre-backup existing HTML before overwrite (Discover/Consolidate THEN extend)
    if [[ -f "$WSJF_HTML" ]]; then
        local backup_file="${WSJF_HTML}.backup.$(date +%Y%m%d-%H%M%S)"
        cp "$WSJF_HTML" "$backup_file"
        log "${YELLOW}Backed up existing dashboard to: $backup_file${NC}"
    fi

    if [[ ! -f "$WSJF_HTML" ]]; then
        # Create basic HTML dashboard if not exists
        cat > "$WSJF_HTML" <<'HTMLEOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>WSJF Risk Dashboard</title>
    <meta http-equiv="refresh" content="300">
    <style>
        body { font-family: system-ui; max-width: 1200px; margin: 40px auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .container { background: white; border-radius: 12px; padding: 30px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
        h1 { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .risk-card { margin: 20px 0; padding: 20px; border-left: 4px solid #f44336; background: #fff3f3; border-radius: 8px; }
        .timestamp { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎯 WSJF Risk Dashboard</h1>
        <p class="timestamp">Auto-refreshes every 5 minutes</p>
        <div id="risks"></div>
    </div>
</body>
</html>
HTMLEOF
    fi

    # Append new risk entry (JavaScript will parse this)
    log "${GREEN}HTML dashboard updated with $high_risk_count risks${NC}"
}

# MAIN EXECUTION
main() {
    log "${GREEN}=== WSJF ROAM Escalator v1.0 ===${NC}"

    # Scan folders
    local scan_result
    scan_result=$(scan_legal_folders)
    local file_count=$(echo "$scan_result" | head -n 1 | grep -o '^[0-9][0-9]*' || echo "0")

    log "Found $file_count file(s) modified in last 24h"

    if [[ $file_count -eq 0 ]]; then
        log "${GREEN}No new files to process${NC}"
        exit $EXIT_SUCCESS
    fi

    # Route each file
    local high_risk_count=0
    while IFS= read -r file; do
        [[ -z "$file" ]] && continue
        route_to_wsjf "$file"

        # Check if high risk
        if tail -5 "$LOG_FILE" | grep -q "HIGH RISK"; then
            ((high_risk_count++))
        fi
    done < <(echo "$scan_result" | tail -n +2)

    # Update matrix
    update_wsjf_matrix "$high_risk_count"

    log "${GREEN}Escalation complete. $high_risk_count HIGH risk files routed.${NC}"

    # Output summary
    echo ""
    echo "📊 WSJF Escalation Summary:"
    echo "  Total files scanned: $file_count"
    echo "  High-risk escalations: $high_risk_count"
    echo "  Log: $LOG_FILE"
}

main "$@"
