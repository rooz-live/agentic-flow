#!/usr/bin/env bash
# TDD contract: R01/R## edge ROAM lanes stay FA-owned; autopilot must not fake closure.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TRACKER="$ROOT/.goalie/ROAM_TRACKER_COG.yaml"
AUTOPILOT="$ROOT/scripts/cicd/wave_autopilot.sh"
SMOKE="$ROOT/tooling/scripts/cog_edge_smoke.sh"
BILLING_SYN="$ROOT/code/tooling/scripts/public_synthetic_check.sh"

fail() { echo "FAIL: $*"; exit 1; }

[[ -f "$TRACKER" ]] || fail "missing ROAM tracker"
[[ -x "$AUTOPILOT" ]] || fail "missing wave_autopilot"

extract_block() {
  local rid="$1"
  awk -v id="$rid" '
    $0 ~ "^- id: " id "$" || $0 ~ "^  - id: " id "$" { on=1 }
    on && (/^- id: / || /^  - id: /) && $0 !~ ("^- id: " id "$") && $0 !~ ("^  - id: " id "$") { exit }
    on { print }
  ' "$TRACKER"
}

for rid in R01 R02 R03 R04 R05 R06 R07 R08 R09; do
  grep -qE "^- id: ${rid}$|^  - id: ${rid}$" "$TRACKER" || fail "tracker missing ${rid}"
  block="$(extract_block "$rid")"
  echo "$block" | grep -q 'verification_command:' || fail "${rid} missing verification_command"
  echo "$block" | grep -q 'artifact_path:' || fail "${rid} missing artifact_path"
done

r01="$(extract_block R01)"
echo "$r01" | grep -q 'interface.tag.vote' || fail 'R01 must reference interface.tag.vote deploy lane'
echo "$r01" | grep -q 'nginx' || fail 'R01 must reference nginx verification'

r04="$(extract_block R04)"
echo "$r04" | grep -q 'COGNITUM_WEBHOOK_SECRET' || fail 'R04 must reference webhook secret lane'

grep -q '23.92.79.2' "$AUTOPILOT" && fail 'wave_autopilot must not embed FA SSH deploy (R01 lane)'
grep -q 'interface.tag.vote' "$AUTOPILOT" && fail 'wave_autopilot must not claim interface.tag.vote closure'

[[ -x "$SMOKE" ]] || fail 'missing tooling/scripts/cog_edge_smoke.sh (local partial evidence)'
[[ -f "$BILLING_SYN" ]] || fail 'missing code/tooling billing synthetic (dual-edge spine)'

COGNITUM_WEBHOOK_SECRET="" bash "$SMOKE" >/dev/null || fail 'cog_edge_smoke must PASS locally (does not close R01 deploy)'

echo "PASS roam_edge_contract (R01/R## FA lanes separate from autopilot billing perceive)"
