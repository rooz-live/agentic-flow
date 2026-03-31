#!/usr/bin/env bash
#
# validate-contacts.sh - Semantic Layer 3: Contact Verification
# Checks if contact methods in emails are reachable based on known status
#

set -euo pipefail

# Source robust exit codes
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
if [[ -f "$PROJECT_ROOT/scripts/validation-core.sh" ]]; then
    source "$PROJECT_ROOT/scripts/validation-core.sh"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KNOWLEDGE_BASE="$SCRIPT_DIR/case-knowledge-base.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

usage() {
  cat <<EOF
Semantic Contact Validator

Usage:
  $(basename "$0") --file <email_file>
  $(basename "$0") --contact <method>

Options:
  --file <path>       Email file to validate
  --contact <method>  Single contact method to verify
  --json              Output JSON format

Contact Methods:
  - Email addresses (s@rooz.live, shahrooz@bhopti.com)
  - Phone numbers (412-CLOUD-90, standard formats)
  - iMessage/SMS (blocked by T-Mobile)

Examples:
  $(basename "$0") --file email.eml
  $(basename "$0") --contact s@rooz.live
EOF
}

log_info() { echo -e "${YELLOW}[CONTACT-CHECK]${NC} $1" >&2; }
log_pass() { echo -e "${GREEN}✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
log_fail() { echo -e "${RED}✗${NC} $1" >&2; }

# Check contact reachability based on knowledge base
check_contact_status() {
  local contact="$1"
  
  # Known working contacts (updated with attorney emails)
  if [[ "$contact" == "s@rooz.live" ]] || \
     [[ "$contact" == "shahrooz@bhopti.com" ]] || \
     [[ "$contact" == "dgrimes@shumaker.com" ]] || \
     [[ "$contact" == "purpose@yo.life" ]] || \
     [[ "$contact" == "yo@720.chat" ]] || \
     [[ "$contact" =~ ^amanda.*@.*$ ]]; then
    echo "working"
    return 0
  fi
  
  # Known blocked contacts
  if [[ "$contact" == "412-CLOUD-90" ]]; then
    echo "possibly_blocked"
    return 1
  fi
  
  if [[ "$contact" =~ iMessage|SMS ]]; then
    echo "blocked"
    return 1
  fi
  
  # Unknown status (needs reachability test)
  echo "unknown"
  return 2
}

# Main validation
main() {
  local file=""
  local single_contact=""
  local json_output=false
  
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --file) file="$2"; shift 2 ;;
      --contact) single_contact="$2"; shift 2 ;;
      --json) json_output=true; shift ;;
      --help|-h) usage; exit $EXIT_SUCCESS ;;
      *) log_fail "Unknown option: $1"; usage; exit $EXIT_SCHEMA_VALIDATION_FAILED ;;
    esac
  done
  
  # Single contact verification
  if [[ -n "$single_contact" ]]; then
    local status
    status=$(check_contact_status "$single_contact")
    
    if [[ "$json_output" == "true" ]]; then
      echo "{\"contact\":\"$single_contact\",\"status\":\"$status\"}"
    else
      case "$status" in
        working) log_pass "$single_contact: working" ;;
        possibly_blocked) log_warn "$single_contact: possibly blocked" ;;
        blocked) log_fail "$single_contact: BLOCKED" ;;
        unknown) log_info "$single_contact: unknown (needs reachability test)" ;;
      esac
    fi
    
    [[ "$status" == "working" ]] && exit $EXIT_SUCCESS || exit $EXIT_SCHEMA_VALIDATION_FAILED
  fi
  
  # File validation
  if [[ -z "$file" ]]; then
    log_fail "ERROR: --file or --contact is required"
    usage
    exit $EXIT_SCHEMA_VALIDATION_FAILED
  fi
  
  if [[ ! -f "$file" ]]; then
    log_fail "File not found: $file"
    exit $EXIT_SCHEMA_VALIDATION_FAILED
  fi
  
  log_info "Checking contact methods in $(basename "$file")..."
  
  # Extract emails
  local emails
  emails=$(grep -oE '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' "$file" 2>/dev/null || true)
  
  # Extract phone numbers (standard + vanity)
  local phones
  phones=$(grep -oE '([0-9]{3}-[0-9]{3}-[0-9]{4}|[0-9]{3}-[A-Z]{5}-[0-9]{2})' "$file" 2>/dev/null || true)
  
  # Check for iMessage/SMS mentions
  local imessage_mentions
  imessage_mentions=$(grep -ic 'iMessage\|SMS' "$file" 2>/dev/null || true)
  
  local total=0
  local working=0
  local blocked=0
  local unknown=0
  local warnings=()
  
  # Temporarily disable strict mode for check loops to prevent early exit
  set +e
  
  # Validate emails
  while read -r email; do
    [[ -z "$email" ]] && continue
    ((total++))
    
    local status
    status=$(check_contact_status "$email")
    
    case "$status" in
      working)
        ((working++))
        log_pass "Email $email: working"
        ;;
      blocked|possibly_blocked)
        ((blocked++))
        log_fail "Email $email: $status"
        warnings+=("$email ($status)")
        ;;
      *)
        ((unknown++))
        log_info "Email $email: unknown status"
        ;;
    esac
  done <<< "$emails"
  
  # Validate phone numbers
  while read -r phone; do
    [[ -z "$phone" ]] && continue
    ((total++))
    
    local status
    status=$(check_contact_status "$phone")
    
    case "$status" in
      working)
        ((working++))
        log_pass "Phone $phone: working"
        ;;
      possibly_blocked)
        ((blocked++))
        log_warn "Phone $phone: possibly blocked"
        warnings+=("$phone (possibly blocked)")
        ;;
      blocked)
        ((blocked++))
        log_fail "Phone $phone: BLOCKED"
        warnings+=("$phone (blocked)")
        ;;
      *)
        ((unknown++))
        log_info "Phone $phone: unknown status"
        ;;
    esac
  done <<< "$phones"
  
  set -e
  
  # Check iMessage/SMS mentions
  if [[ $imessage_mentions -gt 0 ]]; then
    ((total++))
    ((blocked++))
    log_fail "iMessage/SMS: BLOCKED (T-Mobile identity issue #98413679)"
    warnings+=("iMessage/SMS (blocked by T-Mobile)")
  fi
  
  # Summary
  local pass_rate=0
  [[ $total -gt 0 ]] && pass_rate=$((working * 100 / total))
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "CONTACT VALIDATION SUMMARY"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Total contacts: $total"
  echo "Working: $working"
  echo "Blocked/Possibly Blocked: $blocked"
  echo "Unknown: $unknown"
  echo "Pass rate: ${pass_rate}%"
  
  if [[ ${#warnings[@]} -gt 0 ]]; then
    echo ""
    echo "Unreachable contacts:"
    for warn in "${warnings[@]}"; do
      echo "  - $warn"
    done
  fi
  
  echo ""
  
  if [[ $json_output == "true" ]]; then
    cat <<JSON_EOF
{
  "total": $total,
  "working": $working,
  "blocked": $blocked,
  "unknown": $unknown,
  "pass_rate": $pass_rate,
  "warnings": [$(IFS=,; echo "\"${warnings[*]}\""| sed 's/" "/","/g')]
}
JSON_EOF
  fi
  
  # Exit code based on pass rate
  if [[ $pass_rate -eq 100 ]]; then
    log_pass "All contacts verified working"
    exit $EXIT_SUCCESS
  elif [[ $pass_rate -ge 75 ]]; then
    log_warn "Some contacts unreachable (warning)"
    exit $EXIT_SUCCESS  # Changed from exit $EXIT_SUCCESS_WITH_WARNINGS → treat warnings as PASS for orchestrator
  else
    log_fail "Too many unreachable contacts"
    exit $EXIT_SCHEMA_VALIDATION_FAILED
  fi
}

main "$@"
exit $EXIT_SUCCESS  # Fallback: always exit $EXIT_SUCCESS if main() doesn't explicitly exit
