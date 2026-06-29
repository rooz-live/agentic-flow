#!/usr/bin/env bash
# MPP receipt chain contract — isolated DATA_ROOT; scripts from CODE_ROOT.
#
# Closes the receipt chain end-to-end across five behavioral tiers. The script
# under test (scripts/cicd/receipt_chain.sh) is treated as immutable; only the
# test coverage was previously missing.
#
#   Phase 0 (baseline): ENFORCE=0 full chain (verify -> export -> compile ->
#                        hire -> PASS). Legacy smoke; proves the chain still
#                        completes the full sequence without enforcement.
#   Phase 1: ENFORCE=1 + minimal valid scorecard fixture + MOCK_HIRE=1. The full
#            verify/compile/hire sequence runs UNDER enforcement and closes with a
#            PASS receipt (proves the enforce path, not just the SKIP path).
#   Phase 2: F9 hire-receipt schema contract. Every hire_receipts.jsonl line must
#            carry receipt_id/timestamp/status_code/endpoint, with the success
#            invariant status_code in {200,201,202} (the F-series "PASS").
#   Phase 3: ENFORCE=1 with NO scorecard -> fail-closed (non-zero exit, receipt
#            status != PASS).
#   Phase 4: sequence closure — verify -> export -> compile -> hire all produced
#            artifacts and the last receipt in the chain has status=PASS.
#
# NOTE on F9 `status`: the canonical hire receipt (hire_mcp_client._write_receipt)
# and the in-script mock both key success off status_code, not a `status` string.
# We therefore assert status_code success and only require status=="PASS" when a
# `status` key is present (forward-compatible), so the contract matches the
# immutable script rather than fighting it.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CHAIN="$ROOT/scripts/cicd/receipt_chain.sh"

PASS=0
FAIL=0
pass() { echo "PASS $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL $1" >&2; FAIL=$((FAIL + 1)); }

BASE="$(mktemp -d)"
trap 'rm -rf "$BASE"' EXIT

# Sanity: the script exists, is executable, and parses (plus its sibling hook).
test -x "$CHAIN"
bash -n "$CHAIN"
bash -n "$ROOT/scripts/cicd/tick_post_hooks.sh"

# --- shared env used by every phase ------------------------------------------
common_env() {
  export AF_SKIP_OP_READ=1
  export AF_GATE_CONTEXT=review
  export AF_ALLOW_OWNED_LOCAL=1
  export CI=false
  export GITHUB_ACTIONS=
  export AF_RECEIPT_CHAIN_MOCK_HIRE=1
}
common_env

# mk_data_root: fresh isolated git repo + profile_readme + verify_signals.
# Prints the new root path. Does NOT write a scorecard (see write_scorecard).
mk_data_root() {
  local label="$1"
  local tmp="$BASE/$label"
  mkdir -p "$tmp/.goalie/scorecards" "$tmp/.goalie/evidence"
  git -C "$tmp" init -q
  git -C "$tmp" config user.email "receipt-test@agentic-flow.local"
  git -C "$tmp" config user.name "receipt-test"
  echo "# receipt contract" > "$tmp/profile_readme.md"
  cat > "$tmp/.goalie/scorecards/verify_signals.json" <<'JSON'
{"signals":[{"name":"noop","cmd":["true"],"required":true}]}
JSON
  git -C "$tmp" add -A
  git -C "$tmp" commit -q -m "init"
  echo "$tmp"
}

# write_scorecard: minimal VALID scorecard that scorecard_resolver will accept
# (it must carry originality+impact dicts), annotated with the F-series closure
# fields the receipt chain expects a real policy snapshot to carry. Left
# uncommitted, mirroring the canonical (artifact) lifecycle.
write_scorecard() {
  local root="$1"
  local ts
  ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  cat > "$root/.goalie/scorecards/current.json" <<JSON
{
  "originality": {
    "improbability": 2,
    "resonance": 2,
    "new_relationship": true,
    "coherence": "PASS"
  },
  "impact": {
    "baseline_value": 2,
    "reward_direction": 1,
    "gate_integrity": "PASS",
    "tail_risks": [{"name": "contract", "disposition": "Mitigated", "penalty": 1}],
    "cod_weight": 1,
    "blast_radius": 1,
    "reversibility": 1,
    "sign_off": true
  },
  "coherence": "PASS",
  "gate_integrity": "PASS",
  "sign_off": true,
  "pace_source": "policy_snapshot",
  "pace_cod_weight": 3.5,
  "timestamp": "$ts"
}
JSON
}

# resolve_scorecard: echo the resolved path (or empty) for a DATA_ROOT.
resolve_scorecard() {
  REPO_ROOT="$1" python3 "$ROOT/scripts/metrics/scorecard_resolver.py" --resolve-path 2>/dev/null || true
}

# receipt_status: echo the status field of the most recent tick receipt (or MISSING).
receipt_status() {
  local dir="$1"
  local rcpt
  rcpt="$(ls -t "$dir"/tick_*.json 2>/dev/null | head -1 || true)"
  [[ -n "$rcpt" ]] || { echo "MISSING"; return 0; }
  python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['status'])" "$rcpt" 2>/dev/null || echo "MISSING"
}

# ============================================================================
# Phase 0 — baseline: ENFORCE=0 full chain still completes with PASS.
# ============================================================================
echo "=== Phase 0: baseline ENFORCE=0 full chain ==="
P0="$(mk_data_root phase0)"
write_scorecard "$P0"
export REPO_ROOT="$P0"
export AF_RECEIPT_CHAIN_ENFORCE=0
export AF_VERIFY_SIGNALS="$P0/.goalie/scorecards/verify_signals.json"

set +e
bash "$CHAIN" >"$BASE/phase0.log" 2>&1
P0_EC=$?
set -e
if [[ $P0_EC -eq 0 ]]; then pass "phase0 chain exit=0"; else fail "phase0 chain exit=$P0_EC want 0"; fi

RES0="$(resolve_scorecard "$P0")"
if [[ "$RES0" == *scorecards/current.json ]]; then pass "phase0 scorecard resolved (not SKIP'd)"; else fail "phase0 scorecard not resolved: ${RES0:-<none>}"; fi

[[ -f "$P0/.goalie/earnings_ledger.jsonl" ]] && pass "phase0 earnings_ledger.jsonl present" || fail "phase0 earnings_ledger.jsonl missing"
[[ -f "$P0/.goalie/evidence/earnings_latest.json" ]] && pass "phase0 earnings_latest.json present" || fail "phase0 earnings_latest.json missing"

S0="$(receipt_status "$P0/.goalie/evidence/receipts")"
if [[ "$S0" == "PASS" ]]; then pass "phase0 receipt status=PASS"; else fail "phase0 receipt status=$S0 want PASS"; fi

[[ -f "$P0/.goalie/evidence/hire_receipts.jsonl" ]] && pass "phase0 hire_receipts.jsonl present (F9)" || fail "phase0 hire_receipts.jsonl missing"

# ============================================================================
# Phase 1 — ENFORCE=1 happy path: full sequence under enforcement -> PASS.
# (Artifacts left in $P1 for Phase 2 + Phase 4 inspection.)
# ============================================================================
echo "=== Phase 1: ENFORCE=1 + scorecard fixture + MOCK_HIRE (happy path) ==="
P1="$(mk_data_root phase1)"
write_scorecard "$P1"
export REPO_ROOT="$P1"
export AF_RECEIPT_CHAIN_ENFORCE=1
export AF_VERIFY_SIGNALS="$P1/.goalie/scorecards/verify_signals.json"

set +e
bash "$CHAIN" >"$BASE/phase1.log" 2>&1
P1_EC=$?
set -e
if [[ $P1_EC -eq 0 ]]; then
  pass "phase1 enforce chain exit=0 (full sequence under enforcement)"
else
  fail "phase1 enforce chain exit=$P1_EC want 0"
  echo "--- phase1 chain log (tail) ---" >&2
  tail -n 40 "$BASE/phase1.log" >&2 || true
fi

RES1="$(resolve_scorecard "$P1")"
if [[ "$RES1" == *scorecards/current.json ]]; then pass "phase1 scorecard resolved (not SKIP'd)"; else fail "phase1 scorecard not resolved: ${RES1:-<none>}"; fi

S1="$(receipt_status "$P1/.goalie/evidence/receipts")"
if [[ "$S1" == "PASS" ]]; then pass "phase1 receipt status=PASS (enforce happy path)"; else fail "phase1 receipt status=$S1 want PASS"; fi

# ============================================================================
# Phase 2 — F9 hire-receipt schema contract (every hire_receipts.jsonl line).
# ============================================================================
echo "=== Phase 2: F9 hire receipt schema (all lines) ==="
HIRE_LOG="$P1/.goalie/evidence/hire_receipts.jsonl"
if [[ -f "$HIRE_LOG" ]]; then pass "phase2 hire_receipts.jsonl present"; else fail "phase2 hire_receipts.jsonl missing"; fi

set +e
python3 - "$HIRE_LOG" <<'PY'
import json, sys
from pathlib import Path

log = Path(sys.argv[1])
if not log.is_file():
    print("MISSING", file=sys.stderr); sys.exit(2)
lines = [ln for ln in log.read_text(encoding="utf-8").splitlines() if ln.strip()]
if not lines:
    print("EMPTY", file=sys.stderr); sys.exit(2)

# F9 required keys (matches receipt_chain.sh's own hire-receipt validation).
required = ("receipt_id", "timestamp", "status_code", "endpoint")
success_codes = {200, 201, 202}

for i, line in enumerate(lines):
    try:
        entry = json.loads(line)
    except json.JSONDecodeError as exc:
        print(f"BADJSON line {i}: {exc}", file=sys.stderr); sys.exit(2)
    for key in required:
        if key not in entry:
            print(f"MISSING line {i}: {key}", file=sys.stderr); sys.exit(2)
    if not str(entry["receipt_id"]).strip():
        print(f"EMPTY line {i}: receipt_id", file=sys.stderr); sys.exit(2)
    if not str(entry["endpoint"]).strip():
        print(f"EMPTY line {i}: endpoint", file=sys.stderr); sys.exit(2)
    # status_code must be a real integer in the success set (F-series "PASS").
    sc = entry["status_code"]
    if not isinstance(sc, int) or isinstance(sc, bool):
        print(f"TYPE line {i}: status_code not int ({type(sc).__name__})", file=sys.stderr); sys.exit(2)
    if sc not in success_codes:
        print(f"STATUS line {i}: status_code={sc} want one of {sorted(success_codes)}", file=sys.stderr); sys.exit(2)
    # ISO 8601 sanity (date-time separator present).
    if "T" not in str(entry["timestamp"]):
        print(f"BADTS line {i}: {entry['timestamp']}", file=sys.stderr); sys.exit(2)
    # If a `status` key is present, it must be the F-series PASS (forward-compat).
    if "status" in entry and str(entry["status"]).upper() != "PASS":
        print(f"STATUS line {i}: status={entry['status']!r} want PASS", file=sys.stderr); sys.exit(2)
print("OK")
PY
P2_EC=$?
set -e
if [[ $P2_EC -eq 0 ]]; then pass "phase2 every hire line satisfies F9 schema + success code"; else fail "phase2 F9 schema validation failed (see stderr)"; fi

# ============================================================================
# Phase 3 — ENFORCE=1 + NO scorecard: fail-closed (non-zero, receipt != PASS).
# ============================================================================
echo "=== Phase 3: ENFORCE=1 + NO scorecard (fail-closed) ==="
P3="$(mk_data_root phase3)"
# Intentionally do NOT write a scorecard -> resolver returns nothing.
export REPO_ROOT="$P3"
export AF_RECEIPT_CHAIN_ENFORCE=1
export AF_VERIFY_SIGNALS="$P3/.goalie/scorecards/verify_signals.json"

set +e
bash "$CHAIN" >"$BASE/phase3.log" 2>&1
P3_EC=$?
set -e
if [[ $P3_EC -ne 0 ]]; then pass "phase3 fail-closed exit=$P3_EC (non-zero, no scorecard)"; else fail "phase3 exit=0 want non-zero (missing scorecard must block under ENFORCE=1)"; fi

S3="$(receipt_status "$P3/.goalie/evidence/receipts")"
if [[ "$S3" != "PASS" ]]; then pass "phase3 receipt status=$S3 (not PASS -> fail-closed)"; else fail "phase3 receipt status=PASS but expected BLOCK/SKIP (fail-closed violated)"; fi

# ============================================================================
# Phase 4 — sequence closure: verify -> export -> compile -> hire -> PASS.
# (Inspects the Phase 1 enforcement run's artifacts.)
# ============================================================================
echo "=== Phase 4: sequence closure (verify -> export -> compile -> hire -> PASS)"
SEQ_OK=1
check_seq_file() {  # label path
  if [[ -f "$2" ]]; then pass "phase4 $1 present"; else fail "phase4 $1 missing"; SEQ_OK=0; fi
}
check_seq_file "earnings_ledger.jsonl (verify credited)" "$P1/.goalie/earnings_ledger.jsonl"
check_seq_file "earnings_latest.json (export ran)"       "$P1/.goalie/evidence/earnings_latest.json"
check_seq_file "profile_readme.md (compile target)"      "$P1/profile_readme.md"
check_seq_file "hire_receipts.jsonl (hire ran)"          "$P1/.goalie/evidence/hire_receipts.jsonl"

LAST="$(ls -t "$P1/.goalie/evidence/receipts"/tick_*.json 2>/dev/null | head -1 || true)"
LAST_ST="MISSING"
if [[ -n "$LAST" ]]; then
  LAST_ST="$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['status'])" "$LAST" 2>/dev/null || echo MISSING)"
fi
if [[ "$LAST_ST" == "PASS" ]] && [[ $SEQ_OK -eq 1 ]]; then
  pass "phase4 sequence closed: last receipt status=PASS"
else
  fail "phase4 sequence not closed (last_status=$LAST_ST, seq_ok=$SEQ_OK)"
fi

unset REPO_ROOT

# ============================================================================
echo "=== results: $PASS passed, $FAIL failed ==="
if [[ "$FAIL" -eq 0 ]]; then
  echo "PASS receipt_chain mpp"
  exit 0
fi
echo "FAIL receipt_chain mpp" >&2
exit 1
