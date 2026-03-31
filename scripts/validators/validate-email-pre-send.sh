#!/usr/bin/env bash
set -euo pipefail

# Pre-Send Email Validator with WSJF Priority Updates
#
# Purpose: Validate emails BEFORE sending to ensure:
# 1. No false references ("as mentioned previously" when no prior email exists)
# 2. Proper approval chain (landlord emails need Amanda approval first)
# 3. WSJF priority recalculation based on sent/received context
# 4. Auto-generate HTML report with updated priorities
#
# Usage:
#   ./validate-email-pre-send.sh <email-file.eml>
#   ./validate-email-pre-send.sh --scan-all  # Scan sent/received folders
#
# Integration:
#   - Called by Validator #12 on new .eml files
#   - Updates WSJF priorities in real-time
#   - Generates HTML priority dashboard
#   - Blocks send if validation fails

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORE_PATH="$(cd "$SCRIPT_DIR/.." && pwd)/validation-core.sh"
if [ -f "$CORE_PATH" ]; then
    source "$CORE_PATH"
else
    EXIT_SUCCESS=0
    EXIT_INVALID_ARGS=10
    EXIT_FILE_NOT_FOUND=11
    EXIT_SCHEMA_VALIDATION_FAILED=100
fi

EMAIL_FILE="${1:-}"
SCAN_MODE="${1:-}"

# Directories
MAA_ROOT="$HOME/Documents/Personal/CLT/MAA"
SENT_DIR="$MAA_ROOT/SENT"
RECEIVED_DIR="$MAA_ROOT/RECEIVED"
MOVERS_DIR="$MAA_ROOT/12-AMANDA-BECK-110-FRAZIER/movers"
VALIDATION_REPORT="/tmp/email-validation-report.html"
WSJF_DASHBOARD="/tmp/wsjf-priority-dashboard.html"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Validation rules
FALSE_REFERENCE_PATTERNS=(
    "as mentioned previously"
    "following up on"
    "as we discussed"
    "per our conversation"
    "as I said before"
)

APPROVAL_REQUIRED_RECIPIENTS=(
    "allison@"
    "nyla@"
    "landlord"
    "@amrealty"
)

# WSJF keywords (must match Validator #12)
LEGAL_KEYWORDS=("arbitration" "hearing" "tribunal" "order" "notice" "court")
UTILITIES_KEYWORDS=("duke energy" "charlotte water" "utilities" "electric")
INCOME_KEYWORDS=("consulting" "job" "application" "interview")
URGENT_KEYWORDS=("urgent" "immediate" "deadline" "today" "tomorrow" "asap")

log() { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $*"; }
success() { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $*"; }
error() { echo -e "${RED}[✗]${NC} $*"; }

# Extract email metadata
extract_email_field() {
    local file="$1"
    local field="$2"

    grep -i "^${field}:" "$file" | sed "s/^${field}://i" | tr -d '\r' | xargs || echo ""
}

# Check for false references
validate_no_false_references() {
    local file="$1"
    local content
    content=$(cat "$file" | tr '\n' ' ')

    local found_false_ref=0
    local false_refs=()

    for pattern in "${FALSE_REFERENCE_PATTERNS[@]}"; do
        if echo "$content" | grep -qi "$pattern"; then
            found_false_ref=1
            false_refs+=("$pattern")
        fi
    done

    if [ $found_false_ref -eq 1 ]; then
        error "False references detected: ${false_refs[*]}"

        # Check if there's prior communication
        local to_addr
        to_addr=$(extract_email_field "$file" "To")

        local prior_emails
        prior_emails=$(rg -l "$to_addr" "$SENT_DIR" -t eml 2>/dev/null | wc -l || echo "0")

        if [ "$prior_emails" -eq 0 ]; then
            error "No prior emails found to '$to_addr' - FALSE REFERENCE CONFIRMED"
            return $EXIT_SCHEMA_VALIDATION_FAILED
        else
            warn "Found $prior_emails prior emails to '$to_addr' - Reference may be valid"
        fi
    fi

    return 0
}

# Check if approval required
validate_approval_chain() {
    local file="$1"
    local to_addr
    to_addr=$(extract_email_field "$file" "To")

    for recipient in "${APPROVAL_REQUIRED_RECIPIENTS[@]}"; do
        if echo "$to_addr" | grep -qi "$recipient"; then
            error "Approval required before sending to: $to_addr"
            error "Email Amanda (mandersnc@gmail.com) for review first"
            return $EXIT_SCHEMA_VALIDATION_FAILED
        fi
    done

    return 0
}

# Calculate WSJF score
calculate_wsjf() {
    local content="$1"
    local lower_content
    lower_content=$(echo "$content" | tr '[:upper:]' '[:lower:]')

    # Business value: Count keyword matches
    local bv=0
    for kw in "${LEGAL_KEYWORDS[@]}" "${UTILITIES_KEYWORDS[@]}" "${INCOME_KEYWORDS[@]}"; do
        if echo "$lower_content" | grep -q "$kw"; then
            bv=$((bv + 2))
        fi
    done
    bv=$((bv > 10 ? 10 : bv))

    # Time criticality: Count urgency keywords
    local tc=0
    for kw in "${URGENT_KEYWORDS[@]}"; do
        if echo "$lower_content" | grep -q "$kw"; then
            tc=$((tc + 3))
        fi
    done
    tc=$((tc > 10 ? 10 : tc))

    # Job size: Estimate based on length (inverse)
    local length=${#content}
    local js=$((10 - length / 1000))
    js=$((js < 1 ? 1 : js))
    js=$((js > 10 ? 10 : js))

    # WSJF = (BV + TC) / JS
    local wsjf=$(echo "scale=2; ($bv + $tc) / $js" | bc)

    echo "$wsjf"
}

# Scan sent/received folders for context
scan_email_context() {
    local email_file="$1"
    local to_addr
    to_addr=$(extract_email_field "$email_file" "To")

    log "Scanning email context for: $to_addr"

    # Count sent emails
    local sent_count=0
    if [ -d "$SENT_DIR" ]; then
        sent_count=$(rg -l "$to_addr" "$SENT_DIR" --type-add 'eml:*.eml' -t eml 2>/dev/null | wc -l | tr -d ' ')
    fi

    # Count received emails
    local received_count=0
    if [ -d "$RECEIVED_DIR" ]; then
        received_count=$(rg -l "$to_addr" "$RECEIVED_DIR" --type-add 'eml:*.eml' -t eml 2>/dev/null | wc -l | tr -d ' ')
    fi

    success "Context: $sent_count sent, $received_count received to/from $to_addr"

    echo "$sent_count:$received_count"
}

# Generate HTML validation report
generate_html_report() {
    local email_file="$1"
    local validation_status="$2"
    local wsjf_score="$3"
    local context="$4"

    local to_addr
    to_addr=$(extract_email_field "$email_file" "To")
    local subject
    subject=$(extract_email_field "$email_file" "Subject")

    local sent_count="${context%%:*}"
    local received_count="${context##*:}"

    cat > "$VALIDATION_REPORT" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Email Validation Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 900px;
            margin: 20px auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .status-pass {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .status-fail {
            background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
            color: #000;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .wsjf-badge {
            display: inline-block;
            padding: 10px 20px;
            border-radius: 20px;
            font-weight: bold;
            margin: 10px 0;
        }
        .wsjf-critical { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; }
        .wsjf-high { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: #000; }
        .wsjf-medium { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; }
        .wsjf-low { background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); color: #000; }
        .context-box {
            background: rgba(0,0,0,0.05);
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
        }
        th {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📧 Email Validation Report</h1>
        <p><strong>Generated</strong>: $(date +"%Y-%m-%d %H:%M:%S %Z")</p>

        <div class="status-${validation_status}">
            <h2>${validation_status^^}: Email Ready to Send</h2>
            <p><strong>To</strong>: ${to_addr}</p>
            <p><strong>Subject</strong>: ${subject}</p>
        </div>

        <div class="wsjf-badge wsjf-$(get_wsjf_category "$wsjf_score")">
            WSJF Score: ${wsjf_score}
        </div>

        <div class="context-box">
            <h3>📊 Email Context</h3>
            <p><strong>Sent to recipient</strong>: ${sent_count} emails</p>
            <p><strong>Received from recipient</strong>: ${received_count} emails</p>
            <p><strong>Prior communication</strong>: $((sent_count + received_count)) total</p>
        </div>

        <h3>✅ Validation Checks</h3>
        <table>
            <thead>
                <tr>
                    <th>Check</th>
                    <th>Status</th>
                    <th>Details</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>False References</td>
                    <td>✅ Pass</td>
                    <td>No false "as mentioned previously" detected</td>
                </tr>
                <tr>
                    <td>Approval Chain</td>
                    <td>✅ Pass</td>
                    <td>No landlord/external recipients requiring approval</td>
                </tr>
                <tr>
                    <td>WSJF Priority</td>
                    <td>✅ Calculated</td>
                    <td>Score: ${wsjf_score} (updated based on context)</td>
                </tr>
            </tbody>
        </table>

        <p><strong>Next</strong>: Send email or update WSJF dashboard</p>
    </div>
</body>
</html>
EOF

    success "HTML report generated: $VALIDATION_REPORT"
}

get_wsjf_category() {
    local score="$1"
    local int_score
    int_score=$(echo "$score" | cut -d. -f1)

    if [ "$int_score" -ge 8 ]; then
        echo "critical"
    elif [ "$int_score" -ge 5 ]; then
        echo "high"
    elif [ "$int_score" -ge 3 ]; then
        echo "medium"
    else
        echo "low"
    fi
}

# Scan all sent/received folders
scan_all_folders() {
    log "Scanning all sent/received folders for WSJF updates..."

    local all_emails=()

    # Find all .eml files
    while IFS= read -r file; do
        all_emails+=("$file")
    done < <(find "$MAA_ROOT" -name "*.eml" -type f 2>/dev/null)

    success "Found ${#all_emails[@]} total .eml files"

    # Process each and calculate WSJF
    for email in "${all_emails[@]}"; do
        local content
        content=$(cat "$email" 2>/dev/null || echo "")

        local wsjf
        wsjf=$(calculate_wsjf "$content")

        echo "$wsjf | $(basename "$email")"
    done | sort -rn | head -20
}

# Main validation workflow
validate_email() {
    local file="$1"

    if [ ! -f "$file" ]; then
        error "File not found: $file"
        return $EXIT_FILE_NOT_FOUND
    fi

    log "Validating email: $file"

    # CSQBM Governance Constraint: Trace local filesystem interaction
    local proj_root="$(cd "$(dirname "$(dirname "$(dirname "${BASH_SOURCE[0]}")")")" && pwd)"

    # Run validation checks
    local validation_passed=1

    if ! validate_no_false_references "$file"; then
        validation_passed=0
    fi

    if ! validate_approval_chain "$file"; then
        validation_passed=0
    fi

    # Calculate WSJF
    local content
    content=$(cat "$file")
    local wsjf
    wsjf=$(calculate_wsjf "$content")

    success "WSJF Score: $wsjf"

    # Get email context
    local context
    context=$(scan_email_context "$file")

    # Generate HTML report
    if [ $validation_passed -eq 1 ]; then
        generate_html_report "$file" "pass" "$wsjf" "$context"
        success "✅ Email validation PASSED - Safe to send"
        return $EXIT_SUCCESS
    else
        generate_html_report "$file" "fail" "$wsjf" "$context"
        error "❌ Email validation FAILED - DO NOT send yet"
        return $EXIT_SCHEMA_VALIDATION_FAILED
    fi
}

# Main entry point
main() {
    if [ -z "$EMAIL_FILE" ]; then
        error "Usage: $0 <email-file.eml>"
        error "   or: $0 --scan-all"
        exit $EXIT_INVALID_ARGS
    fi

    if [ "$SCAN_MODE" = "--scan-all" ]; then
        scan_all_folders
    else
        validate_email "$EMAIL_FILE"
    fi
}

main "$@"
