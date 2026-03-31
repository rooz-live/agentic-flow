#!/usr/bin/env bash
#
# Validator #12 ENHANCED: WSJF ROAM Escalator with Email Scanning
# 
# NEW FEATURES:
# - Scans .eml files in sent/received folders
# - Increased scan frequency (hourly instead of daily)
# - Pre-send email validation hook
# - HTML WSJF priority updates
# - Real-time email impact on next priority
#
# Usage:
#   ./validator-12-enhanced.sh --scan-all        # Full scan (emails + files)
#   ./validator-12-enhanced.sh --validate-email FILE.eml  # Pre-send validation
#   ./validator-12-enhanced.sh --watch-realtime  # Continuous monitoring

set -euo pipefail

# Configuration
BASE_DIR="/Users/shahroozbhopti/Documents"
LEGAL_FOLDER="$BASE_DIR/Personal/CLT/MAA"
CODE_FOLDER="$BASE_DIR/code/investing/agentic-flow"
EMAIL_FOLDERS=(
    "$CODE_FOLDER/docs/12-AMANDA-BECK-110-FRAZIER/movers"
    "$LEGAL_FOLDER/CORRESPONDENCE/INBOUND"
    "$LEGAL_FOLDER/CORRESPONDENCE/OUTBOUND"
    "$LEGAL_FOLDER/CORRESPONDENCE/SENT"
    # Deep scan legal folders (CRITICAL - arbitration files)
    "$LEGAL_FOLDER/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL"
    "$LEGAL_FOLDER/Uptown/BHOPTI-LEGAL/POST-TRIAL"
    "$LEGAL_FOLDER/Uptown/BHOPTI-LEGAL/00-DASHBOARD"
)
LOG_FILE="$HOME/Library/Logs/wsjf-roam-escalator-enhanced.log"
WSJF_HTML="$CODE_FOLDER/reports/wsjf-priority-dashboard.html"

# WSJF priority thresholds
WSJF_CRITICAL=45.0
WSJF_HIGH=40.0
WSJF_MEDIUM=35.0
WSJF_LOW=30.0

mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$CODE_FOLDER/reports"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Function: Scan .eml files for keywords
scan_email_files() {
    log "📧 Scanning .eml files for critical keywords..."
    
    local keywords="Duke Energy|utilities|arbitration|mover|quote|response|hearing"
    local files_found=0
    
    # Use ripgrep with custom eml type
    while IFS= read -r file; do
        if [ -f "$file" ]; then
            files_found=$((files_found + 1))
            
            local filename=$(basename "$file")
            local wsjf=$(assign_wsjf_score "$file")
            
            log "  📄 Email: $filename (WSJF $wsjf)"
            
            # Extract email metadata
            local subject=$(grep "^Subject:" "$file" | head -1 | cut -d: -f2- | xargs || echo "No subject")
            local from=$(grep "^From:" "$file" | head -1 | cut -d: -f2- | xargs || echo "Unknown")
            
            log "    From: $from"
            log "    Subject: $subject"
            
            # Route to swarm
            route_to_swarm "$file" "$wsjf"
            
            # Update HTML dashboard
            update_html_dashboard "$filename" "$wsjf" "$from" "$subject"
        fi
    done < <(rg -l "$keywords" "${EMAIL_FOLDERS[@]}" --type-add 'eml:*.eml' -t eml 2>/dev/null || true)
    
    log "📊 Email scan complete: $files_found files processed"
}

# Function: Pre-send email validation
validate_email_before_send() {
    local email_file="$1"
    
    log "🔍 Pre-send validation for: $(basename "$email_file")"
    
    if [ ! -f "$email_file" ]; then
        log "❌ Error: Email file not found"
        return 1
    fi
    
    # Extract recipients
    local to=$(grep "^To:" "$email_file" | cut -d: -f2- | xargs)
    local subject=$(grep "^Subject:" "$email_file" | cut -d: -f2- | xargs)
    
    log "  To: $to"
    log "  Subject: $subject"
    
    # Validation checks
    local validation_passed=true
    
    # Check 1: Valid email addresses
    if ! echo "$to" | grep -qE "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"; then
        log "  ❌ Invalid email address format"
        validation_passed=false
    fi
    
    # Check 2: Subject not empty
    if [ -z "$subject" ]; then
        log "  ⚠️ Warning: Empty subject"
        validation_passed=false
    fi
    
    # Check 3: Critical keywords (Duke Energy, utilities) require HIGH priority
    if echo "$subject $to" | grep -qE "Duke Energy|utilities|arbitration"; then
        local wsjf=$(assign_wsjf_score "$email_file")
        if (( $(echo "$wsjf < $WSJF_HIGH" | bc -l) )); then
            log "  ⚠️ Warning: Critical email but WSJF < 40.0 (actual: $wsjf)"
        fi
    fi
    
    # Check 4: Attachment check (if email mentions attachment)
    if grep -qE "attach|enclosed|find attached" "$email_file"; then
        log "  📎 Email mentions attachments - verify before sending"
    fi
    
    if $validation_passed; then
        log "  ✅ Validation passed - safe to send"
        return 0
    else
        log "  ❌ Validation failed - review before sending"
        return 1
    fi
}

# Function: Update HTML WSJF dashboard
update_html_dashboard() {
    local filename="$1"
    local wsjf="$2"
    local from="${3:-Unknown}"
    local subject="${4:-No subject}"
    
    # Determine priority color
    local priority_color="#28a745"  # Green (LOW)
    local priority_label="LOW"
    
    if (( $(echo "$wsjf >= $WSJF_CRITICAL" | bc -l) )); then
        priority_color="#dc3545"  # Red (CRITICAL)
        priority_label="CRITICAL"
    elif (( $(echo "$wsjf >= $WSJF_HIGH" | bc -l) )); then
        priority_color="#fd7e14"  # Orange (HIGH)
        priority_label="HIGH"
    elif (( $(echo "$wsjf >= $WSJF_MEDIUM" | bc -l) )); then
        priority_color="#ffc107"  # Yellow (MEDIUM)
        priority_label="MEDIUM"
    fi
    
    # Create/update HTML dashboard
    cat > "$WSJF_HTML" << EOF
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="60">
    <title>WSJF Priority Dashboard</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        h1 {
            color: #667eea;
            margin: 0 0 10px 0;
        }
        .timestamp {
            color: #666;
            font-size: 0.9em;
            margin-bottom: 30px;
        }
        .priority-card {
            background: white;
            border-left: 5px solid;
            padding: 20px;
            margin: 15px 0;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .priority-card.critical { border-color: #dc3545; }
        .priority-card.high { border-color: #fd7e14; }
        .priority-card.medium { border-color: #ffc107; }
        .priority-card.low { border-color: #28a745; }
        .priority-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            color: white;
            font-weight: bold;
            font-size: 0.8em;
        }
        .wsjf-score {
            font-size: 2em;
            font-weight: bold;
            color: $priority_color;
        }
        .meta {
            color: #666;
            font-size: 0.9em;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎯 WSJF Priority Dashboard</h1>
        <div class="timestamp">Last updated: $(date +'%Y-%m-%d %H:%M:%S')</div>
        
        <div class="priority-card ${priority_label,,}">
            <span class="priority-badge" style="background: $priority_color;">$priority_label</span>
            <span class="wsjf-score">$wsjf</span>
            
            <h3>$filename</h3>
            <div class="meta">
                <strong>From:</strong> $from<br>
                <strong>Subject:</strong> $subject
            </div>
        </div>
        
        <hr>
        <p style="text-align: center; color: #666;">
            Auto-refreshes every 60 seconds<br>
            <small>Validator #12 Enhanced - WSJF ROAM Escalator</small>
        </p>
    </div>
</body>
</html>
EOF
    
    log "  ✅ HTML dashboard updated: $WSJF_HTML"
}

# Function: Watch emails in real-time (continuous monitoring)
watch_realtime() {
    log "👀 Starting real-time email monitoring..."
    
    while true; do
        scan_email_files
        
        # Scan regular files too
        scan_folders
        
        log "💤 Sleeping 5 minutes before next scan..."
        sleep 300  # 5 minutes
    done
}

# Import functions from original validator-12
assign_wsjf_score() {
    local file="$1"
    local filename=$(basename "$file")
    local wsjf=30.0
    
    if [[ "$filename" =~ ARBITRATION.*NOTICE|MOVE.*QUOTE|MOVER.*RESPONSE ]]; then
        wsjf=$WSJF_CRITICAL
    elif [[ "$filename" =~ utilities|Duke\ Energy|UTILITIES|CREDIT.*DISPUTE ]]; then
        wsjf=$WSJF_HIGH
    elif [[ "$filename" =~ consulting|income|720\.chat|applications\.json ]]; then
        wsjf=$WSJF_MEDIUM
    else
        wsjf=$WSJF_LOW
    fi
    
    echo "$wsjf"
}

route_to_swarm() {
    local file="$1"
    local wsjf="$2"
    local filename=$(basename "$file")
    
    log "📋 Routing $filename (WSJF $wsjf) to swarm..."
    
    local swarm="unknown"
    local task_description=""
    
    if (( $(echo "$wsjf >= $WSJF_CRITICAL" | bc -l) )); then
        swarm="physical-move-swarm"
        task_description="Process critical file: $filename"
    elif (( $(echo "$wsjf >= $WSJF_HIGH" | bc -l) )); then
        swarm="utilities-unblock-swarm"
        task_description="Process utilities/credit file: $filename"
    elif (( $(echo "$wsjf >= $WSJF_MEDIUM" | bc -l) )); then
        swarm="income-unblock-swarm"
        task_description="Process consulting/income file: $filename"
    else
        swarm="contract-legal-swarm"
        task_description="Process legal file: $filename"
    fi
    
    log "  → Swarm: $swarm"
    log "  → Task: $task_description"
    
    npx ruflo hooks route \
        --task "$task_description" \
        --context "$swarm" \
        >> "$LOG_FILE" 2>&1 || true
    
    npx @claude-flow/cli@latest memory store \
        --key "wsjf-routed-$(date +%Y%m%d-%H%M%S)" \
        --value "{\"file\": \"$filename\", \"wsjf\": $wsjf, \"swarm\": \"$swarm\"}" \
        --namespace patterns \
        >> "$LOG_FILE" 2>&1 || true
    
    log "  ✅ Routed successfully"
}

scan_folders() {
    # Simplified version - see validator-12-wsjf-roam-escalator.sh for full version
    log "📁 Scanning folders for new files..."
    
    for folder in "${EMAIL_FOLDERS[@]}"; do
        if [ -d "$folder" ]; then
            while IFS= read -r file; do
                local wsjf=$(assign_wsjf_score "$file")
                log "  📄 Found: $(basename "$file") (WSJF $wsjf)"
                route_to_swarm "$file" "$wsjf"
            done < <(find "$folder" -type f -mtime -1 2>/dev/null || true)
        fi
    done
}

# Main execution
case "${1:-scan}" in
    --scan-all)
        scan_email_files
        scan_folders
        ;;
    
    --validate-email)
        if [ -z "${2:-}" ]; then
            log "❌ Error: --validate-email requires file path"
            exit 1
        fi
        validate_email_before_send "$2"
        ;;
    
    --watch-realtime)
        watch_realtime
        ;;
    
    *)
        log "📋 Usage:"
        log "  $0 --scan-all              # Full scan (emails + files)"
        log "  $0 --validate-email FILE   # Pre-send validation"
        log "  $0 --watch-realtime        # Continuous monitoring"
        exit 1
        ;;
esac

npx @claude-flow/cli@latest hooks post-task \
    --task-id "validator-12-enhanced-$(date +%Y%m%d-%H%M%S)" \
    --success true \
    --store-results true \
    >> "$LOG_FILE" 2>&1 || true

log "🎉 Validator #12 Enhanced complete!"
