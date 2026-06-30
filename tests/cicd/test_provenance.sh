#!/usr/bin/env bash
# F1 (Fail-Closed Provenance) contract test.
#
# Closes the provenance-hardening gap end-to-end:
#   1. Every receipt_chain receipt MUST carry a `provenance` field.
#   2. A local (OWNED) context MUST be marked provenance="local" — never "ci_signed".
#   3. A CI-signed context (AF_CI_PROVENANCE_SIGNATURE present) MUST be "ci_signed",
#      and may never be conflated with "local" or "none".
#   4. CI without a signing key MUST fail-closed (non-zero exit) before any PASS path.
#   5. derive_gate_integrity() MUST return provenance metadata that distinguishes
#      ci_signed (PASS) from local (OWNED) from none (FAIL).
#
# The script under test (receipt_chain.sh / scorecard_gate.py) is treated as the
# contract; this file only asserts its provenance behavior.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CHAIN="$ROOT/scripts/cicd/receipt_chain.sh"
EMIT="$ROOT/scripts/gates/emit_ci_provenance.sh"

PASS=0
FAIL=0
pass() { echo "PASS $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL $1" >&2; FAIL=$((FAIL + 1)); }

BASE="$(mktemp -d)"
trap 'rm -rf "$BASE"' EXIT

test -x "$CHAIN"
bash -n "$CHAIN"
test -f "$EMIT"

# --- shared env used by every receipt-chain phase --------------------------------
common_env() {
  export AF_SKIP_OP_READ=1
  export AF_GATE_CONTEXT=review
  export AF_ALLOW_OWNED_LOCAL=1
  export CI=false
  export GITHUB_ACTIONS=
  export AF_RECEIPT_CHAIN_MOCK_HIRE=1
}

# mk_data_root: fresh isolated git repo + profile_readme + verify_signals fixture.
mk_data_root() {
  local label="$1"
  local tmp="$BASE/$label"
  mkdir -p "$tmp/.goalie/scorecards" "$tmp/.goalie/evidence"
  git -C "$tmp" init -q
  git -C "$tmp" config user.email "provenance-test@agentic-flow.local"
  git -C "$tmp" config user.name "provenance-test"
  echo "# provenance contract" > "$tmp/profile_readme.md"
  cat > "$tmp/.goalie/scorecards/verify_signals.json" <<'JSON'
{"signals":[{"name":"noop","cmd":["true"],"required":true}]}
JSON
  git -C "$tmp" add -A
  git -C "$tmp" commit -q -m "init"
  echo "$tmp"
}

# Minimal valid scorecard (matches receipt_chain.sh expectations).
write_scorecard() {
  local root="$1"
  local ts
  ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  cat > "$root/.goalie/scorecards/current.json" <<JSON
{
  "originality": {"improbability": 2, "resonance": 2, "new_relationship": true, "coherence": "PASS"},
  "impact": {
    "baseline_value": 2, "reward_direction": 1, "gate_integrity": "PASS",
    "tail_risks": [{"name": "contract", "disposition": "Mitigated", "penalty": 1}],
    "cod_weight": 1, "blast_radius": 1, "reversibility": 1, "sign_off": true
  },
  "coherence": "PASS", "gate_integrity": "PASS", "sign_off": true,
  "pace_source": "policy_snapshot", "pace_cod_weight": 3.5, "timestamp": "$ts"
}
JSON
}

# receipt_field <dir> <field>: echo a top-level field of the latest tick receipt.
receipt_field() {
  local dir="$1" field="$2" rcpt
  rcpt="$(ls -t "$dir"/tick_*.json 2>/dev/null | head -1 || true)"
  [[ -n "$rcpt" ]] || { echo "MISSING"; return 0; }
  python3 -c "import json,sys; print(json.load(open(sys.argv[1])).get(sys.argv[2],'ABSENT'))" "$rcpt" "$field" 2>/dev/null || echo "MISSING"
}

common_env

# ============================================================================
# Phase 1 — local (OWNED) receipt carries provenance="local".
# ============================================================================
echo "=== Phase 1: local receipt provenance marking ==="
P1="$(mk_data_root prov_local)"
write_scorecard "$P1"
export REPO_ROOT="$P1"
export AF_RECEIPT_CHAIN_ENFORCE=1
export AF_VERIFY_SIGNALS="$P1/.goalie/scorecards/verify_signals.json"
unset AF_CI_PROVENANCE_SIGNATURE AF_CI_PROVENANCE_PRINCIPAL || true

set +e
bash "$CHAIN" >"$BASE/p1.log" 2>&1
P1_EC=$?
set -e
if [[ $P1_EC -eq 0 ]]; then pass "phase1 local chain exit=0"; else fail "phase1 local chain exit=$P1_EC ($(tail -3 "$BASE/p1.log" | tr '\n' ';'))"; fi

PROV1="$(receipt_field "$P1/.goalie/evidence/receipts" provenance)"
GI1="$(receipt_field "$P1/.goalie/evidence/receipts" gate_integrity)"
[[ "$PROV1" != "ABSENT" && "$PROV1" != "MISSING" ]] && pass "phase1 receipt has provenance field" || fail "phase1 receipt missing provenance field ($PROV1)"
[[ "$PROV1" == "local" ]] && pass "phase1 provenance=local (OWNED receipt marked)" || fail "phase1 provenance=$PROV1 want local"
[[ "$GI1" == "OWNED" ]] && pass "phase1 gate_integrity=OWNED" || fail "phase1 gate_integrity=$GI1 want OWNED"

# ============================================================================
# Phase 2 — CI-signed context provenance="ci_signed" (signature present).
# We set the provenance env directly (no GITHUB_ACTIONS -> emit script not
# re-sourced) so the receipt derivation keys off the signature presence.
# ============================================================================
echo "=== Phase 2: ci-signed receipt provenance marking ==="
P2="$(mk_data_root prov_ci)"
write_scorecard "$P2"
export REPO_ROOT="$P2"
export AF_VERIFY_SIGNALS="$P2/.goalie/scorecards/verify_signals.json"
export AF_CI_PROVENANCE_SIGNATURE="dummy-ed25519-receipt-signature"
export AF_CI_PROVENANCE_PRINCIPAL="ci@agentic-flow.github"

set +e
bash "$CHAIN" >"$BASE/p2.log" 2>&1
P2_EC=$?
set -e
if [[ $P2_EC -eq 0 ]]; then pass "phase2 ci-signed chain exit=0"; else fail "phase2 ci-signed chain exit=$P2_EC ($(tail -3 "$BASE/p2.log" | tr '\n' ';'))"; fi

PROV2="$(receipt_field "$P2/.goalie/evidence/receipts" provenance)"
GI2="$(receipt_field "$P2/.goalie/evidence/receipts" gate_integrity)"
[[ "$PROV2" == "ci_signed" ]] && pass "phase2 provenance=ci_signed" || fail "phase2 provenance=$PROV2 want ci_signed"
[[ "$GI2" == "PASS" ]] && pass "phase2 gate_integrity=PASS" || fail "phase2 gate_integrity=$GI2 want PASS"
[[ "$PROV2" != "local" && "$PROV2" != "none" ]] && pass "phase2 ci_signed not conflated with local/none" || fail "phase2 ci_signed conflation (provenance=$PROV2)"

unset AF_CI_PROVENANCE_SIGNATURE AF_CI_PROVENANCE_PRINCIPAL || true

# ============================================================================
# Phase 3 — receipt_chain fail-closed in CI without AF_CI_SIGNING_KEY.
# receipt_chain.sh sources emit_ci_provenance.sh when GITHUB_ACTIONS is set;
# that must BLOCK (exit 1) before producing any PASS receipt.
# ============================================================================
echo "=== Phase 3: receipt_chain fail-closed in CI without signing key ==="
P3="$(mk_data_root prov_failclosed)"
write_scorecard "$P3"   # scorecard present so the chain proceeds to provenance sourcing
export REPO_ROOT="$P3"
export AF_VERIFY_SIGNALS="$P3/.goalie/scorecards/verify_signals.json"

set +e
env CI=true GITHUB_ACTIONS=true AF_SKIP_OP_READ=1 AF_GATE_CONTEXT=ci \
  bash "$CHAIN" >"$BASE/p3.log" 2>&1
P3_EC=$?
set -e
if [[ $P3_EC -ne 0 ]]; then pass "phase3 CI no-key fail-closed exit=$P3_EC (non-zero)"; else fail "phase3 CI no-key exit=0 (fail-closed violated)"; fi

LAST3="$(ls -t "$P3/.goalie/evidence/receipts"/tick_*.json 2>/dev/null | head -1 || true)"
if [[ -n "$LAST3" ]]; then
  S3="$(python3 -c "import json,sys; print(json.load(open(sys.argv[1])).get('status'))" "$LAST3" 2>/dev/null || echo MISSING)"
  if [[ "$S3" != "PASS" ]]; then pass "phase3 no PASS receipt without CI provenance (status=$S3)"; else fail "phase3 PASS receipt written without CI provenance"; fi
else
  pass "phase3 no receipt written (blocked at provenance sourcing)"
fi

unset REPO_ROOT

# ============================================================================
# Phase 4 — derive_gate_integrity() provenance metadata + fail-closed matrix.
# ============================================================================
echo "=== Phase 4: derive_gate_integrity provenance metadata ==="
set +e
PYTHONPATH="$ROOT" python3 - "$ROOT" <<'PY'
import sys
sys.path.insert(0, sys.argv[1])
from scripts.gates.scorecard_gate import derive_gate_integrity as dgi

cases = [
    ({"CI": "true", "GITHUB_EVENT_NAME": "push"}, "FAIL", "none"),   # CI, no signature -> fail-closed
    ({"AF_GATE_CONTEXT": "review"}, "OWNED", "local"),               # local convenience receipt
    ({"AF_GATE_CONTEXT": "precommit"}, "OWNED", "local"),
    ({"AF_ALLOW_OWNED_LOCAL": "1"}, "OWNED", "local"),
    ({"AF_GATE_CONTEXT": "ci"}, "FAIL", "none"),                     # ci context without CI env/provenance
    ({}, "FAIL", "none"),                                            # no valid context
]
ok = True
for env, want_val, want_prov in cases:
    r = dgi(env)
    got_val, got_prov = str(r), getattr(r, "provenance", "none")
    label = " ".join(f"{k}={v}" for k, v in env.items()) or "(empty)"
    if got_val == want_val and got_prov == want_prov:
        print(f"  ok: {label} -> {got_val}/{got_prov}")
    else:
        ok = False
        print(f"  MISMATCH: {label} -> {got_val}/{got_prov} (want {want_val}/{want_prov})", file=sys.stderr)
sys.exit(0 if ok else 1)
PY
P4_EC=$?
set -e
if [[ $P4_EC -eq 0 ]]; then pass "phase4 derive_gate_integrity provenance matrix correct"; else fail "phase4 derive_gate_integrity provenance mismatch"; fi

# ============================================================================
# Phase 5 — emit_ci_provenance.sh fail-closed gate (defense-in-depth).
# ============================================================================
echo "=== Phase 5: emit_ci_provenance fail-closed (CI, no key) ==="
set +e
(
  cd "$ROOT"
  export CI=true GITHUB_ACTIONS=true
  unset AF_CI_SIGNING_KEY
  bash "$EMIT" >/dev/null 2>&1
)
P5_EC=$?
set -e
if [[ $P5_EC -ne 0 ]]; then pass "phase5 emit_ci_provenance blocks CI without key (exit=$P5_EC)"; else fail "phase5 emit_ci_provenance did not block CI without key"; fi

# ============================================================================
echo "=== results: $PASS passed, $FAIL failed ==="
if [[ "$FAIL" -eq 0 ]]; then
  echo "PASS provenance_contract"
  exit 0
fi
echo "FAIL provenance_contract" >&2
exit 1
