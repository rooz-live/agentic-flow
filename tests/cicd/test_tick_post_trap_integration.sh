#!/usr/bin/env bash
# F4 integration: exercise the REAL tick_post_hooks.sh EXIT trap.
#
# Phase 1 (fail-closed): update_lnnnl mocked to a STALE exit (2) → tick_post exits
#   early via the LNNNL stale block, BEFORE tick_cycle_policy_latest.json is written
#   (tick_post_hooks.sh line ~132 < line 199). The EXIT trap must NOT leak a stale
#   pace_source (live|last_good). It must fail-closed to pace_source=stale.
#
#   To prove the fix, we pre-seed .goalie/evidence/last_pace_bundle.json with a
#   cached pace. Without the fix, on_exit fell back to read_pace_bundle() which
#   resolves to pace_source=last_good on lnnnl_exit=2. With the fix, the else
#   branch hardcodes the stale sentinel.
#
# Phase 2 (happy path): update_lnnnl mocked to succeed (0) + a minimal LNNNL with
#   an empty shippable lane (pace=0.5 → run_aqe=run_up=0) + stubbed heavy downstream
#   steps. tick_post reaches the policy write (line 199); the EXIT trap then resolves
#   pace_source=policy_snapshot.
#
# All mocked scripts and evidence files are backed up and restored on EXIT.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TMP="$(mktemp -d)"
STUB_BACKUP="$TMP/stub_backup"
EV_BACKUP="$TMP/ev_backup"
mkdir -p "$STUB_BACKUP" "$EV_BACKUP"
RUN_LOG="$TMP/tick_post_run.log"

PASS=0
FAIL=0
pass() { echo "PASS $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL $1" >&2; FAIL=$((FAIL + 1)); }

# --- Evidence files we may touch (back up + restore) ------------------------
EV_FILES=".goalie/LNNNL.yaml
.goalie/evidence/tick_post_latest.json
.goalie/evidence/tick_cycle_policy_latest.json
.goalie/evidence/last_pace_bundle.json"

snapshot_evidence() {
  local f
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    if [[ -e "$ROOT/$f" ]]; then
      mkdir -p "$EV_BACKUP/$(dirname "$f")"
      cp -a "$ROOT/$f" "$EV_BACKUP/$f"
    fi
  done <<< "$EV_FILES"
}

restore_evidence() {
  local f
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    if [[ -e "$EV_BACKUP/$f" ]]; then
      mkdir -p "$ROOT/$(dirname "$f")"
      cp -a "$EV_BACKUP/$f" "$ROOT/$f"
    else
      rm -f "$ROOT/$f"
    fi
  done <<< "$EV_FILES"
}

# --- Script stubbing (backup original once; restore all on EXIT) ------------
STUBBED=""
_stub() { # relpath body
  local rel="$1"
  local body="$2"
  local target="$ROOT/$rel"
  local backup="$STUB_BACKUP/$rel"
  mkdir -p "$(dirname "$backup")"
  # Back up the ORIGINAL the first time only (so re-stubs don't clobber it).
  if [[ ! -f "$backup" ]]; then
    cp -a "$target" "$backup"
  fi
  printf '%s' "$body" > "$target"
  chmod +x "$target"
  STUBBED="$STUBBED$rel"$'\n'
}
stub_py() { # relpath exit_code  (invoked via python3)
  _stub "$1" $'#!/usr/bin/env python3\nimport sys\nsys.exit('"$2"$')\n'
}
stub_sh() { # relpath            (invoked via bash)
  _stub "$1" $'#!/usr/bin/env bash\nexit 0\n'
}
restore_stubs() {
  [[ -z "$STUBBED" ]] && return 0
  local rel
  while IFS= read -r rel; do
    [[ -z "$rel" ]] && continue
    if [[ -f "$STUB_BACKUP/$rel" ]]; then
      cp -a "$STUB_BACKUP/$rel" "$ROOT/$rel"
    fi
  done <<< "$STUBBED"
}

cleanup() {
  restore_stubs || true
  restore_evidence || true
  rm -rf "$TMP" || true
}
trap cleanup EXIT

snapshot_evidence

# --- Common env: run the REAL script against the real repo ------------------
export REPO_ROOT="$ROOT"
export AF_SKIP_OP_READ=1
export AF_SKIP_DISK_STEWARD=1
export AF_QUIET=1
export CI=false
export CEREMONY_RAN=1
unset AF_ALLOW_OP_READ || true

# Pre-update_lnnnl helpers run in BOTH phases; stub once for determinism.
stub_sh "scripts/cicd/exec_wsjf_ruflo.sh"
stub_py "scripts/cicd/lib/env_key_resolver.py" 0

run_tick_post() {
  set +e
  bash "$ROOT/scripts/cicd/tick_post_hooks.sh" >"$RUN_LOG" 2>&1
  local ec=$?
  set -e
  RUN_EC=$ec
}

POLICY="$ROOT/.goalie/evidence/tick_cycle_policy_latest.json"
TICK="$ROOT/.goalie/evidence/tick_post_latest.json"

# ============================================================================
# PHASE 1 — fail-closed: early exit (LNNNL stale) before policy write.
# ============================================================================
echo "--- phase 1: early-exit trap (expect pace_source=stale) ---"

export AF_LNNNL_STALE_ENFORCE=1
export AF_LNNNL_ENFORCE=1
export AF_TICK_POST_ENFORCE=1

# Mock update_lnnnl.py → STALE (exit 2). This triggers tick_post_hooks.sh's
# LNNNL stale gate → exit 2 BEFORE the policy file is written.
stub_py "scripts/cicd/update_lnnnl.py" 2

# Guarantee no policy file exists at trap time (early-exit condition).
rm -f "$POLICY"

# Pre-seed last-good cache. On lnnnl_exit=2, pace_from_lnnnl.py resolves to
# pace_source=last_good from this cache — i.e. the exact stale leak the fix
# must prevent.
mkdir -p "$ROOT/.goalie/evidence"
printf '%s' '{"shippable_pace":1.5}' >"$ROOT/.goalie/evidence/last_pace_bundle.json"

run_tick_post

if [[ "$RUN_EC" -eq 2 ]]; then
  pass "phase1 exit=2 (stale early-exit)"
else
  fail "phase1 exit=$RUN_EC want 2"
fi

if [[ ! -f "$POLICY" ]]; then
  pass "phase1 policy file NOT written (pre-199 exit)"
else
  fail "phase1 policy file exists — early exit did not occur"
fi

if [[ ! -f "$TICK" ]]; then
  fail "phase1 tick_post_latest.json missing (trap did not write evidence)"
else
  SRC="$(python3 -c "import json; print(json.load(open('$TICK'))['pace_source'])")"
  if [[ "$SRC" == "stale" ]]; then
    pass "phase1 pace_source=stale (fail-closed)"
  else
    fail "phase1 pace_source=$SRC want stale (leak via SAVED_PACE_BUNDLE/read_pace_bundle)"
  fi

  if python3 -c "import json,sys; sys.exit(0 if json.load(open(sys.argv[1]))['pace_cod_weight'] is None else 1)" "$TICK"; then
    pass "phase1 pace_cod_weight=null"
  else
    fail "phase1 pace_cod_weight not null (stale sentinel corrupted)"
  fi

  case "$SRC" in
    live|last_good|policy_snapshot) fail "phase1 pace_source=$SRC claims valid pace on incomplete tick" ;;
    *) pass "phase1 pace_source is not a valid-measurement source" ;;
  esac
fi

# ============================================================================
# PHASE 2 — happy path: policy written → pace_source=policy_snapshot.
# ============================================================================
echo "--- phase 2: completed cycle (expect pace_source=policy_snapshot) ---"

# update_lnnnl succeeds; heavy downstream steps stubbed to no-ops so the real
# trap/pace path runs deterministically without side effects.
stub_py "scripts/cicd/update_lnnnl.py" 0
stub_py "scripts/cicd/version_portfolio_probe.py" 0
stub_py "scripts/metrics/max_roi_cycles.py" 0
stub_sh "scripts/metrics/inbox_zero_timescape.sh"
stub_py "scripts/cicd/exit_artifact_inbox.py" 0
stub_py "scripts/metrics/correlate_timescape_evidence.py" 0
stub_py "scripts/metrics/timescape_envelope.py" 0
stub_sh "scripts/cicd/pi_plan_sync.sh"
stub_py "scripts/metrics/scorecard_resolver.py" 0
stub_sh "scripts/cicd/receipt_chain.sh"
stub_py "scripts/ruflo/intel_pipeline_post_task.py" 0

export AF_LNNNL_ENFORCE=1
export AF_LNNNL_STALE_ENFORCE=0
export AF_TICK_POST_ENFORCE=0

# Fresh start: prove the policy + tick are written this run.
rm -f "$POLICY" "$TICK"

# Minimal LNNNL: empty shippable lane → pace_cod_weight=0.5 (pace_from_lnnnl.py
# default), pace_source=live at line 143; run_aqe=run_up=0 so AQE/upstream skip.
mkdir -p "$ROOT/.goalie"
cat >"$ROOT/.goalie/LNNNL.yaml" <<'YAML'
lanes:
  shippable:
    now: ""
    near: ""
    next: ""
  blockers:
    now: ""
    near: ""
    next: ""
YAML

run_tick_post

if [[ "$RUN_EC" -eq 0 ]]; then
  pass "phase2 exit=0 (completed cycle)"
else
  fail "phase2 exit=$RUN_EC want 0"
  echo "--- phase2 tick_post log (tail) ---" >&2
  tail -n 40 "$RUN_LOG" >&2 || true
fi

if [[ -f "$POLICY" ]]; then
  pass "phase2 policy file written (reached line 199)"
else
  fail "phase2 policy file missing — cycle did not reach policy write"
fi

if [[ -f "$TICK" ]]; then
  SRC="$(python3 -c "import json; print(json.load(open('$TICK'))['pace_source'])")"
  if [[ "$SRC" == "policy_snapshot" ]]; then
    pass "phase2 pace_source=policy_snapshot (policy-authoritative trap)"
  else
    fail "phase2 pace_source=$SRC want policy_snapshot"
  fi
else
  fail "phase2 tick_post_latest.json missing (trap did not write evidence)"
fi

# ============================================================================
echo "=== results: $PASS passed, $FAIL failed ==="
if [[ "$FAIL" -eq 0 ]]; then
  echo "PASS tick_post_trap_integration"
  exit 0
fi
echo "FAIL tick_post_trap_integration" >&2
exit 1
