#!/bin/bash
# _classifier-rules.sh — Shared classifier rules for bhopti-legal pipeline

SMTP_BOUNCE_RE='(550 5\.[0-9]\.[0-9]|551 5\.[0-9]\.[0-9]|5\.4\.1|delivery.*fail|address.*reject|recipient.*reject|undeliverable|message.*bounced)'
SMTP_TEMP_RE='(421 4\.[0-9]\.[0-9]|450 4\.[0-9]\.[0-9]|451 4\.[0-9]\.[0-9]|4\.[0-9]\.[0-9] temporary)'

# Format: "filename_pattern|ROAM_id|escalation_level|message"
FILE_CLASSIFIER=(
  "ARBITRATION-ORDER|R010|RED|Arbitration ORDER detected — confirm date/venue immediately"
  "arbitration-order|R010|RED|Arbitration ORDER detected — confirm date/venue immediately"
  "ARBITRATION-NOTICE|R010|RED|New arbitration notice detected — review immediately"
  "arbitration-notice|R010|RED|New arbitration notice detected — review immediately"
  "COURT-ORDER|R010|RED|Court order document found — review and file"
  "court-order|R010|RED|Court order document found — review and file"
  "HEARING|R010|RED|Hearing document found — check for date"
  "ADR-ORDER|R010|RED|ADR order document — review"
  "NOTICE-OF|R010|YELLOW|Court notice detected"
  "EEOC|none|RED|EEOC document — track separately (02-ACTIVE-HIGH)"
  "eeoc|none|RED|EEOC document — track separately"
  "IRS|none|YELLOW|IRS/Tax document found — date-stamp and archive"
  "irs-|none|YELLOW|IRS document found"
  "day5-|none|GREEN|Advocacy pipeline Day5 document generated"
  "TIER-5|none|GREEN|Tier-5 digital outreach document"
  "WSJF-BATCH|none|YELLOW|WSJF batch file generated — check scoring"
  "swarm-v|none|GREEN|Swarm iteration output saved"
  "validation-report|none|YELLOW|Validation report generated"
  "CONSULTING|none|GREEN|Consulting document — 13-CONSULTING-APPLICATIONS track"
  "JOB-APP|none|GREEN|Job application document"
  "INCOME|none|GREEN|Income document"
  "RESUME|none|GREEN|Resume/CV document updated"
  "TRIAL-DEBRIEF|R010|YELLOW|Trial debrief filed — extract key learnings for arb prep"
  "trial-debrief|R010|YELLOW|Trial debrief filed — extract key learnings for arb prep"
  "TRIAL-PREP|R010|YELLOW|Trial prep document updated"
  "PRE-ARBITRATION|R009|RED|Pre-arbitration form file detected — check completion status"
  "pre-arbitration|R009|RED|Pre-arbitration form detected — check completion status"
  "duke-energy|R009|YELLOW|Duke Energy document found"
  "DUKE-ENERGY|R009|YELLOW|Duke Energy document found"
  "utilities|R009|YELLOW|Utilities document found"
  "UTILITIES|R009|YELLOW|Utilities document found"
  "credit-dispute|R009|YELLOW|Credit dispute document — check status"
  "CREDIT-DISPUTE|R009|YELLOW|Credit dispute document — check status"
  "applications.json|none|GREEN|applications.json updated — income track active"
  "APPLICATION|none|GREEN|Application document found — income track"
  "720.chat|none|GREEN|720.chat document found — income track"
  "AMANDA|none|GREEN|Amanda document updated — check utilities/move coordination"
  "FRAZIER|none|GREEN|Frazier Ave document — move coordination"
  "mover|none|GREEN|Mover document found"
  "movers|none|GREEN|Mover document found"
  "GRIMES|R009|YELLOW|Grimes/Shumaker document — settlement track"
  "grimes|R009|YELLOW|Grimes/Shumaker document — settlement track"
  "SETTLEMENT|R009|YELLOW|Settlement document updated — review"
  "settlement|R009|YELLOW|Settlement document updated — review"
  "SETTLEMENT-ANALYSIS|R009|YELLOW|Settlement analysis updated"
  "Information.*Github|R009|YELLOW|Github information removal request from counsel"
  "information.*github|R009|YELLOW|Github information removal request from counsel"
  "EVIDENCE|R010|YELLOW|Evidence document added/updated — verify hash"
  "EXHIBIT|R010|YELLOW|Exhibit file added — add to exhibit list"
  "WORK-ORDER|R010|YELLOW|Work order document — W-1 gap item"
  "work-order|R010|YELLOW|Work order document — W-1 gap item"
)

scan_smtp_bounce() {
  local filepath="$1"
  local ext
  ext="${filepath##*.}"
  ext="${ext,,}"
  [[ "$ext" != "eml" && "$ext" != "txt" ]] && return 1
  grep -qiE "$SMTP_BOUNCE_RE" "$filepath" 2>/dev/null
}

scan_smtp_temp_fail() {
  local filepath="$1"
  local ext
  ext="${filepath##*.}"
  ext="${ext,,}"
  [[ "$ext" != "eml" && "$ext" != "txt" ]] && return 1
  grep -qiE "$SMTP_TEMP_RE" "$filepath" 2>/dev/null
}

get_bounce_code() {
  local filepath="$1"
  grep -oiE '(550 5\.[0-9]\.[0-9]|551 [0-9.]+|5\.4\.1|4\.[0-9]\.[0-9][0-9]?)' "$filepath" 2>/dev/null | head -1 || echo "BOUNCE"
}

get_bounce_roam_ref() {
  local filepath="$1"
  local fname
  fname="$(basename "$filepath")"
  fname="${fname,,}"

  if [[ -f "$filepath" ]] && [[ "${filepath##*.}" =~ ^[Ee][Mm][Ll]$ || "${filepath##*.}" =~ ^[Tt][Xx][Tt]$ ]]; then
    local content
    content="$(head -200 "$filepath" 2>/dev/null | tr '[:upper:]' '[:lower:]')"
    if echo "$content" | grep -qE 'maa-26cv|26cv005596|590'; then echo "R010"; return; fi
    if echo "$content" | grep -qiE 'grimes|shumaker|dgrimes@|settlement.*amount|option [ab]'; then echo "R009"; return; fi
    if echo "$content" | grep -qiE 'arbitration|adr hearing|arbitrator|court order'; then echo "R010"; return; fi
    if echo "$content" | grep -qiE 'duke energy|ncluc|docket|service address.*frazier|frazier.*utility'; then echo "R009"; return; fi
    if echo "$content" | grep -qiE 'two men|college hunks|moving company|move.*estimate'; then echo "R-MOVE-BOUNCE"; return; fi
    if echo "$content" | grep -qiE 'thumbtack|angi|homeadvisor|pro network'; then echo "R-MOVE-COVERAGE"; return; fi
  fi

  [[ "$fname" == *two*men* || "$fname" == *twomen* ]] && echo "R-MOVE-BOUNCE" && return
  [[ "$fname" == *college*hunks* || "$fname" == *hunks* ]] && echo "R-MOVE-BOUNCE" && return
  [[ "$fname" == *thumbtack* ]] && echo "R-MOVE-COVERAGE" && return
  [[ "$fname" == *grimes* || "$fname" == *shumaker* ]] && echo "R009" && return
  [[ "$fname" == *duke* || "$fname" == *energy* || "$fname" == *utility* ]] && echo "R009" && return
  echo "none"
}

classify_file() {
  local filepath="$1"
  local filename
  filename="$(basename "$filepath")"
  for rule in "${FILE_CLASSIFIER[@]}"; do
    IFS='|' read -r pattern roam_id level message <<< "$rule"
    if echo "$filename" | grep -qiE "$pattern"; then
      echo "${roam_id}:${level}:${message}"
      return 0
    fi
  done
  echo "none:NONE:NONE"
}
