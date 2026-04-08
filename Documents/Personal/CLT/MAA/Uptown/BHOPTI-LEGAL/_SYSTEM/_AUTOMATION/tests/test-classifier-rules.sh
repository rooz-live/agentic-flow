#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/_SYSTEM/_AUTOMATION"
# shellcheck source=/dev/null
source "${ROOT_DIR}/_classifier-rules.sh"

PASS=0
FAIL=0

assert_eq() {
  local name="$1"
  local got="$2"
  local expected="$3"
  if [[ "$got" == "$expected" ]]; then
    printf 'PASS: %s\n' "$name"
    PASS=$((PASS + 1))
  else
    printf 'FAIL: %s\n  expected: %s\n  got:      %s\n' "$name" "$expected" "$got"
    FAIL=$((FAIL + 1))
  fi
}

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

# Representative filename classifications
assert_eq "arbitration notice" "$(classify_file "${tmpdir}/ARBITRATION-NOTICE-MARCH-3-2026.pdf")" "R010:RED:New arbitration notice detected — review immediately"
assert_eq "court order" "$(classify_file "${tmpdir}/COURT-ORDER-urgent.pdf")" "R010:RED:Court order document found — review and file"
assert_eq "duke energy" "$(classify_file "${tmpdir}/duke-energy-response.eml")" "R009:YELLOW:Duke Energy document found"
assert_eq "applications json" "$(classify_file "${tmpdir}/applications.json")" "none:GREEN:applications.json updated — income track active"
assert_eq "trial debrief" "$(classify_file "${tmpdir}/TRIAL-DEBRIEF-day3.md")" "R010:YELLOW:Trial debrief filed — extract key learnings for arb prep"
assert_eq "eeoc" "$(classify_file "${tmpdir}/EEOC-intake.pdf")" "none:RED:EEOC document — track separately (02-ACTIVE-HIGH)"
assert_eq "mover" "$(classify_file "${tmpdir}/movers-estimate.txt")" "none:GREEN:Mover document found"
assert_eq "unknown" "$(classify_file "${tmpdir}/random-file.bin")" "none:NONE:NONE"

# Bounce scan + code extraction + content-first ROAM mapping
bounce_file="${tmpdir}/bounce-grimes.eml"
cat > "$bounce_file" <<'EOF'
Subject: Delivery failed
From: Mailer-Daemon
Body: 550 5.4.1 recipient rejected
Counsel note: please contact Grimes and Shumaker re settlement option A.
EOF

if scan_smtp_bounce "$bounce_file"; then
  assert_eq "bounce code" "$(get_bounce_code "$bounce_file")" "550 5.4.1"
  assert_eq "bounce roam content" "$(get_bounce_roam_ref "$bounce_file")" "R009"
else
  printf 'FAIL: bounce detection\n'
  FAIL=$((FAIL + 1))
fi

temp_file="${tmpdir}/temp-fail.eml"
cat > "$temp_file" <<'EOF'
Subject: temporary failure
421 4.4.2 temporary failure
EOF

if scan_smtp_temp_fail "$temp_file"; then
  printf 'PASS: temp failure detection\n'
  PASS=$((PASS + 1))
else
  printf 'FAIL: temp failure detection\n'
  FAIL=$((FAIL + 1))
fi

# T1: WSJF keyword variable tests (sourced from shared module)
assert_eq "WSJF_RED defined" "$([[ -n "${WSJF_RED_KEYWORDS:-}" ]] && echo yes || echo no)" "yes"
assert_eq "WSJF_YELLOW defined" "$([[ -n "${WSJF_YELLOW_KEYWORDS:-}" ]] && echo yes || echo no)" "yes"
assert_eq "WSJF_GREEN defined" "$([[ -n "${WSJF_GREEN_KEYWORDS:-}" ]] && echo yes || echo no)" "yes"

# RED keyword matches
if echo "utilities shutoff" | grep -Eiq "$WSJF_RED_KEYWORDS"; then
  printf 'PASS: RED keyword "utilities"\n'; PASS=$((PASS + 1))
else
  printf 'FAIL: RED keyword "utilities"\n'; FAIL=$((FAIL + 1))
fi

# YELLOW keyword matches
if echo "arbitration scheduled" | grep -Eiq "$WSJF_YELLOW_KEYWORDS"; then
  printf 'PASS: YELLOW keyword "arbitration"\n'; PASS=$((PASS + 1))
else
  printf 'FAIL: YELLOW keyword "arbitration"\n'; FAIL=$((FAIL + 1))
fi

# GREEN keyword matches
if echo "storage unit lease" | grep -Eiq "$WSJF_GREEN_KEYWORDS"; then
  printf 'PASS: GREEN keyword "storage"\n'; PASS=$((PASS + 1))
else
  printf 'FAIL: GREEN keyword "storage"\n'; FAIL=$((FAIL + 1))
fi

# Negative: GREEN should NOT match RED content
if ! echo "emergency disconnect" | grep -Eiq "$WSJF_GREEN_KEYWORDS"; then
  printf 'PASS: GREEN does not match RED content\n'; PASS=$((PASS + 1))
else
  printf 'FAIL: GREEN should not match RED content\n'; FAIL=$((FAIL + 1))
fi

printf '\nSummary: PASS=%s FAIL=%s\n' "$PASS" "$FAIL"
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
