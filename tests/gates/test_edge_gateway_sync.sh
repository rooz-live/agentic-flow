#!/usr/bin/env bash
# TDD tests for scripts/cicd/edge_gateway_sync_engine.py
#
# Behaviours under test:
#   F1  Missing edge_gateway.cfg → engine exits non-zero
#   F2  Missing fqdn_registry.yaml → engine exits non-zero
#   F3  --dry-run with no drift → exits 0, prints plan
#   R1  DNS OK + cache hit → domain skipped, status PASS
#   R2  DNS drift detected → FAIL result emitted
#   R3  DNS unresolved → DLQ JSONL entry written
#   R4  Retry on transient failure (stub DNS fails first, then succeeds)
#   R5  Health probe function handles reachable and unreachable endpoints
#   P1  DoD artefact edge_sync_*.json has required fields
#   P2  --json emits valid JSON to stdout with status field
#   P3  DLQ entry written for FAIL with notify_on_fail=true
#   E1  one.sh edge-sync --dry-run --no-coherence routes to engine, exits 0
#   E2  Coherence gate blocks without --no-coherence when coherence_results.json absent
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$SCRIPT_DIR/../helpers/assertions.sh"

ENGINE_SRC="$ROOT_DIR/scripts/cicd/edge_gateway_sync_engine.py"
FETCHER_SRC="$ROOT_DIR/scripts/cicd/edge_fetcher.py"
RUNNER_SRC="$ROOT_DIR/scripts/cicd/edge_runner.py"
REPORTER_SRC="$ROOT_DIR/scripts/cicd/edge_reporter.py"
DLQ_ROAM_SRC="$ROOT_DIR/scripts/cicd/lib/dlq_roam_apply.py"
ONE_SH="$ROOT_DIR/scripts/one.sh"

TMPROOT=$(mktemp -d)
trap 'rm -rf "$TMPROOT"' EXIT

log() { echo "$@"; }

# Create a fake project containing the real engine + the requested fake modules.
make_fake_project() {
    local proj="$1"
    mkdir -p "$proj/scripts/cicd/lib" "$proj/src/proxies" "$proj/config/cicd" "$proj/.goalie/evidence"
    cp "$ENGINE_SRC" "$proj/scripts/cicd/edge_gateway_sync_engine.py"
    cp "$DLQ_ROAM_SRC" "$proj/scripts/cicd/lib/dlq_roam_apply.py"
    cp "$ROOT_DIR/scripts/cicd/lib/receipt.py" "$proj/scripts/cicd/lib/receipt.py"
    {
        echo "version: 1.0.0"
        echo "dlq_path: .goalie/evidence/edge_gateway/dlq.jsonl"
        echo "failure_to_roam:"
        echo "  edge_sync_fail: R-EDGE-01"
    } > "$proj/config/cicd/dlq_roam_mapping.yaml"
    echo "---" >> "$proj/config/cicd/dlq_roam_mapping.yaml"
    # Copy real fetcher/runner/reporter unless overridden by caller
    cp "$FETCHER_SRC" "$proj/scripts/cicd/edge_fetcher.py"
    cp "$RUNNER_SRC" "$proj/scripts/cicd/edge_runner.py"
    cp "$REPORTER_SRC" "$proj/scripts/cicd/edge_reporter.py"
}

run_engine() {
    local proj="$1"
    shift
    (cd "$proj" && python3 "scripts/cicd/edge_gateway_sync_engine.py" "$@")
}

# Run a command and assert its exit code. Captures rc of the *command*.
run_assert_rc() {
    local expected=$1
    local out=$2
    shift 2
    set +e
    "$@" > "$out" 2>&1
    assert_exit_code "$expected"
}

# ── F1: Missing edge_gateway.cfg → engine exits non-zero ─────────────────────
test_missing_cfg_fails() {
    echo ""
    echo "F1: missing edge_gateway.cfg → exit 1"
    local proj="$TMPROOT/f1"
    make_fake_project "$proj"
    cat > "$proj/config/fqdn_registry.yaml" <<'YAML'
domains:
  - fqdn: billing.bhopti.com
    origin: "23.92.79.2"
    health_path: /
YAML

    run_assert_rc 1 "$TMPROOT/f1.out" run_engine "$proj" --no-coherence --dry-run
    assert_contains "$(cat "$TMPROOT/f1.out")" "No FQDN targets"
}

# ── F2: Missing fqdn_registry.yaml → engine exits non-zero ─────────────────────
test_missing_registry_fails() {
    echo ""
    echo "F2: missing fqdn_registry.yaml → exit 1"
    local proj="$TMPROOT/f2"
    make_fake_project "$proj"
    cat > "$proj/src/proxies/edge_gateway.cfg" <<'CFG'
billing.bhopti.com {
    reverse_proxy 23.92.79.2:80
}
CFG

    run_assert_rc 1 "$TMPROOT/f2.out" run_engine "$proj" --no-coherence --dry-run
    assert_contains "$(cat "$TMPROOT/f2.out")" "FQDN registry"
}

# ── F3: --dry-run with no drift → exits 0 and prints plan ─────────────────────
test_dry_run_no_drift() {
    echo ""
    echo "F3: --dry-run with no drift → exit 0 + plan"
    local proj="$TMPROOT/f3"
    make_fake_project "$proj"
    cat > "$proj/src/proxies/edge_gateway.cfg" <<'CFG'
billing.bhopti.com {
    reverse_proxy 23.92.79.2:80
}
CFG
    cat > "$proj/config/fqdn_registry.yaml" <<'YAML'
domains:
  - fqdn: billing.bhopti.com
    origin: "23.92.79.2"
    health_path: /
    sync_timeout_s: 5
YAML

    run_assert_rc 0 "$TMPROOT/f3.out" run_engine "$proj" --no-coherence --dry-run
    assert_contains "$(cat "$TMPROOT/f3.out")" "Dry-run"
    assert_contains "$(cat "$TMPROOT/f3.out")" "billing.bhopti.com"
}

# ── R1: DNS OK + cache hit → domain skipped, status PASS ─────────────────────
test_dns_ok_cache_hit_skipped() {
    echo ""
    echo "R1: DNS OK + cache hit → skipped PASS"
    local proj="$TMPROOT/r1"
    make_fake_project "$proj"
    cat > "$proj/src/proxies/edge_gateway.cfg" <<'CFG'
billing.bhopti.com {
    reverse_proxy 23.92.79.2:80
}
CFG
    cat > "$proj/config/fqdn_registry.yaml" <<'YAML'
domains:
  - fqdn: billing.bhopti.com
    origin: "23.92.79.2"
    health_path: /
YAML
    mkdir -p "$proj/.goalie/evidence/edge_gateway"
    echo '{"billing.bhopti.com": "23.92.79.2"}' > "$proj/.goalie/evidence/edge_gateway/last_known_state.json"

    cat > "$proj/scripts/cicd/edge_fetcher.py" <<'PY'
from pathlib import Path
OFFLINE = "offline_or_unresolved"
def fetch_edge_status(project_root):
    fqdns = ["billing.bhopti.com"]
    registry = {"billing.bhopti.com": "23.92.79.2"}
    live = {"billing.bhopti.com": "23.92.79.2"}
    cache = {"billing.bhopti.com": "23.92.79.2"}
    to_sync = []
    meta = {"billing.bhopti.com": {"origin": "23.92.79.2", "health_path": "/", "sync_timeout_s": 5, "roam_risk_id": None, "notify_on_fail": False}}
    return fqdns, registry, live, cache, to_sync, meta
PY
    cat > "$proj/scripts/cicd/edge_runner.py" <<'PY'
def run_edge_sync(*args, **kwargs): return []
PY

    run_assert_rc 0 "$TMPROOT/r1.out" run_engine "$proj" --no-coherence
    assert_file_exists "$proj/.goalie/evidence/last_edge_sync.json"
    assert_file_contains "$proj/.goalie/evidence/last_edge_sync.json" "PASS"
    assert_file_contains "$proj/.goalie/evidence/last_edge_sync.json" "skipped_count"
}

# ── R2: DNS drift detected → FAIL result emitted ───────────────────────────────
test_drift_detected_emits_fail() {
    echo ""
    echo "R2: DNS drift → FAIL"
    local proj="$TMPROOT/r2"
    make_fake_project "$proj"
    cat > "$proj/src/proxies/edge_gateway.cfg" <<'CFG'
billing.bhopti.com {
    reverse_proxy 23.92.79.2:80
}
CFG
    cat > "$proj/config/fqdn_registry.yaml" <<'YAML'
domains:
  - fqdn: billing.bhopti.com
    origin: "23.92.79.2"
    health_path: /
    notify_on_fail: true
YAML
    mkdir -p "$proj/.goalie/evidence/edge_gateway"
    echo '{}' > "$proj/.goalie/evidence/edge_gateway/last_known_state.json"
    mkdir -p "$proj/tooling/scripts"
    cat > "$proj/tooling/scripts/cpanel_dns_sync.sh" <<'SH'
#!/usr/bin/env bash
echo "result: 0"
exit 1
SH
    chmod +x "$proj/tooling/scripts/cpanel_dns_sync.sh"

    cat > "$proj/scripts/cicd/edge_fetcher.py" <<'PY'
OFFLINE = "offline_or_unresolved"
def fetch_edge_status(project_root):
    fqdns = ["billing.bhopti.com"]
    registry = {"billing.bhopti.com": "23.92.79.2"}
    live = {"billing.bhopti.com": "1.2.3.4"}
    cache = {}
    to_sync = ["billing.bhopti.com"]
    meta = {"billing.bhopti.com": {"origin": "23.92.79.2", "health_path": "/", "sync_timeout_s": 5, "roam_risk_id": None, "notify_on_fail": True}}
    return fqdns, registry, live, cache, to_sync, meta
PY

    run_assert_rc 1 "$TMPROOT/r2.out" run_engine "$proj" --no-coherence
    assert_file_contains "$proj/.goalie/evidence/last_edge_sync.json" "FAIL"
    assert_file_contains "$proj/.goalie/evidence/edge_gateway/dlq.jsonl" "edge_sync_fail"
}

# ── R3: DNS unresolved → DLQ JSONL entry written ───────────────────────────────
test_unresolved_writes_dlq() {
    echo ""
    echo "R3: DNS unresolved → DLQ entry"
    local proj="$TMPROOT/r3"
    make_fake_project "$proj"
    cat > "$proj/src/proxies/edge_gateway.cfg" <<'CFG'
ghost.bhopti.com {
    reverse_proxy 23.92.79.2:80
}
CFG
    cat > "$proj/config/fqdn_registry.yaml" <<'YAML'
domains:
  - fqdn: ghost.bhopti.com
    origin: "23.92.79.2"
    health_path: /
    notify_on_fail: true
YAML
    mkdir -p "$proj/.goalie/evidence/edge_gateway"
    echo '{}' > "$proj/.goalie/evidence/edge_gateway/last_known_state.json"
    mkdir -p "$proj/tooling/scripts"
    cat > "$proj/tooling/scripts/cpanel_dns_sync.sh" <<'SH'
#!/usr/bin/env bash
echo "result: 0"
exit 1
SH
    chmod +x "$proj/tooling/scripts/cpanel_dns_sync.sh"

    cat > "$proj/scripts/cicd/edge_fetcher.py" <<'PY'
OFFLINE = "offline_or_unresolved"
def fetch_edge_status(project_root):
    fqdns = ["ghost.bhopti.com"]
    registry = {"ghost.bhopti.com": "23.92.79.2"}
    live = {"ghost.bhopti.com": OFFLINE}
    cache = {}
    to_sync = ["ghost.bhopti.com"]
    meta = {"ghost.bhopti.com": {"origin": "23.92.79.2", "health_path": "/", "sync_timeout_s": 5, "roam_risk_id": "R-EDGE-01", "notify_on_fail": True}}
    return fqdns, registry, live, cache, to_sync, meta
PY

    run_assert_rc 1 "$TMPROOT/r3.out" run_engine "$proj" --no-coherence
    assert_file_contains "$proj/.goalie/evidence/edge_gateway/dlq.jsonl" "ghost.bhopti.com"
    assert_file_contains "$proj/.goalie/evidence/edge_gateway/dlq.jsonl" "R-EDGE-01"
}

# ── P4: Standard cicd.receipt.v1 artifact is emitted and validated ──────────

# ── P5: fetch_run_report queries edge receipts by context ─────────────────────
test_fetch_run_report_edge_context() {
    echo ""
    echo "P5: fetch_run_report --context edge"
    local proj="$TMPROOT/p5"
    make_fake_project "$proj"
    cat > "$proj/src/proxies/edge_gateway.cfg" <<'CFG'
billing.bhopti.com {
    reverse_proxy 23.92.79.2:80
}
CFG
    cat > "$proj/config/fqdn_registry.yaml" <<'YAML'
domains:
  - fqdn: billing.bhopti.com
    origin: "23.92.79.2"
    health_path: /
YAML
    mkdir -p "$proj/.goalie/evidence/edge_gateway"
    echo '{"billing.bhopti.com": "23.92.79.2"}' > "$proj/.goalie/evidence/edge_gateway/last_known_state.json"
    cat > "$proj/scripts/cicd/edge_fetcher.py" <<'PY'
def fetch_edge_status(project_root):
    fqdns = ["billing.bhopti.com"]
    registry = {"billing.bhopti.com": "23.92.79.2"}
    live = {"billing.bhopti.com": "23.92.79.2"}
    cache = {"billing.bhopti.com": "23.92.79.2"}
    to_sync = []
    meta = {"billing.bhopti.com": {"origin": "23.92.79.2", "health_path": "/", "sync_timeout_s": 5, "roam_risk_id": None, "notify_on_fail": False}}
    return fqdns, registry, live, cache, to_sync, meta
PY
    cat > "$proj/scripts/cicd/edge_runner.py" <<'PY'
def run_edge_sync(*args, **kwargs): return []
PY
    run_assert_rc 0 "$TMPROOT/p5.out" run_engine "$proj" --no-coherence
    run_assert_rc 0 "$TMPROOT/p5fetch.out" bash -c "cd '$proj' && python3 '$ROOT_DIR/scripts/cicd/fetch_run_report.py' --context edge --summary"
    assert_contains "$(cat "$TMPROOT/p5fetch.out")" "edge"
}

test_receipt_artifact_emitted() {
    echo ""
    echo "P4: standard receipt artefact emitted"
    local proj="$TMPROOT/p4"
    make_fake_project "$proj"
    cat > "$proj/src/proxies/edge_gateway.cfg" <<'CFG'
billing.bhopti.com {
    reverse_proxy 23.92.79.2:80
}
CFG
    cat > "$proj/config/fqdn_registry.yaml" <<'YAML'
domains:
  - fqdn: billing.bhopti.com
    origin: "23.92.79.2"
    health_path: /
YAML
    mkdir -p "$proj/.goalie/evidence/edge_gateway"
    echo '{"billing.bhopti.com": "23.92.79.2"}' > "$proj/.goalie/evidence/edge_gateway/last_known_state.json"

    cat > "$proj/scripts/cicd/edge_fetcher.py" <<'PY'
from pathlib import Path
OFFLINE = "offline_or_unresolved"
def fetch_edge_status(project_root):
    fqdns = ["billing.bhopti.com"]
    registry = {"billing.bhopti.com": "23.92.79.2"}
    live = {"billing.bhopti.com": "23.92.79.2"}
    cache = {"billing.bhopti.com": "23.92.79.2"}
    to_sync = []
    meta = {"billing.bhopti.com": {"origin": "23.92.79.2", "health_path": "/", "sync_timeout_s": 5, "roam_risk_id": None, "notify_on_fail": False}}
    return fqdns, registry, live, cache, to_sync, meta
PY
    cat > "$proj/scripts/cicd/edge_runner.py" <<'PY'
def run_edge_sync(*args, **kwargs): return []
PY

    run_assert_rc 0 "$TMPROOT/p4.out" run_engine "$proj" --no-coherence
    local rcpt
    rcpt=$(find "$proj/.goalie/evidence/edge_gateway" -name 'receipt_edge_sync_*.json' | head -1)
    assert_file_exists "$rcpt"
    assert_file_contains "$rcpt" '"schema": "cicd.receipt.v1"'
    assert_file_contains "$rcpt" '"context": "edge"'
    assert_file_contains "$rcpt" '"status": "PASS"'
    assert_file_contains "$rcpt" '"edge_dns_sync"'
    assert_valid_json "$rcpt"
}

# ── R4: Retry on transient DNS failure ────────────────────────────────────────
test_retry_transient_dns() {
    echo ""
    echo "R4: retry transient DNS failure"
    local proj="$TMPROOT/r4"
    make_fake_project "$proj"
    mkdir -p "$proj/scripts/cicd"
    cp "$RUNNER_SRC" "$proj/scripts/cicd/edge_runner.py"

    (cd "$proj" && python3 - <<'PY') > "$TMPROOT/r4.out"
import sys
sys.path.insert(0, "scripts/cicd")
import edge_runner
import edge_fetcher

attempts = [0]
def flaky(fqdn):
    attempts[0] += 1
    if attempts[0] == 1:
        return "offline_or_unresolved"
    return "23.92.79.2"
edge_fetcher.get_live_resolution = flaky

ip, used = edge_runner._resolve_with_retry("billing.bhopti.com", 2)
print(f"ip={ip} attempts={used}")
assert ip == "23.92.79.2", f"expected IP, got {ip}"
assert used == 2, f"expected 2 attempts, got {used}"
PY
    assert_exit_code 0
    assert_contains "$(cat "$TMPROOT/r4.out")" "ip=23.92.79.2 attempts=2"
}

# ── R5: Health probe function handles reachable / unreachable endpoints ───────
test_health_probe() {
    echo ""
    echo "R5: health probe function"
    local proj="$TMPROOT/r5"
    make_fake_project "$proj"
    mkdir -p "$proj/scripts/cicd"
    cp "$RUNNER_SRC" "$proj/scripts/cicd/edge_runner.py"

    (cd "$proj" && python3 - <<'PY') > "$TMPROOT/r5.out"
import sys
sys.path.insert(0, "scripts/cicd")
import edge_runner
from unittest.mock import patch, MagicMock

with patch("urllib.request.urlopen") as mock:
    resp = MagicMock()
    resp.status = 200
    resp.read.return_value = b"ok"
    resp.__enter__.return_value = resp
    mock.return_value = resp
    ok, detail = edge_runner._probe_health("billing.bhopti.com", "/health", 5)
    print(f"reachable: ok={ok} detail={detail}")
    assert ok is True, detail

with patch("urllib.request.urlopen") as mock:
    resp = MagicMock()
    resp.status = 500
    resp.read.return_value = b"error"
    resp.__enter__.return_value = resp
    mock.return_value = resp
    ok, detail = edge_runner._probe_health("billing.bhopti.com", "/health", 5)
    print(f"unreachable: ok={ok} detail={detail}")
    assert ok is False, detail

with patch("urllib.request.urlopen", side_effect=Exception("timeout")):
    ok, detail = edge_runner._probe_health("billing.bhopti.com", "/health", 1)
    print(f"error: ok={ok} detail={detail}")
    assert ok is False, detail
PY
    assert_exit_code 0
    assert_contains "$(cat "$TMPROOT/r5.out")" "reachable: ok=True"
    assert_contains "$(cat "$TMPROOT/r5.out")" "unreachable: ok=False"
    assert_contains "$(cat "$TMPROOT/r5.out")" "error: ok=False"
}

# ── P1: DoD artefact has required fields ──────────────────────────────────────
test_dod_artefact_fields() {
    echo ""
    echo "P1: DoD artefact fields"
    local proj="$TMPROOT/p1"
    make_fake_project "$proj"
    cat > "$proj/src/proxies/edge_gateway.cfg" <<'CFG'
billing.bhopti.com {
    reverse_proxy 23.92.79.2:80
}
CFG
    cat > "$proj/config/fqdn_registry.yaml" <<'YAML'
domains:
  - fqdn: billing.bhopti.com
    origin: "23.92.79.2"
    health_path: /
YAML
    mkdir -p "$proj/.goalie/evidence/edge_gateway"
    echo '{"billing.bhopti.com": "23.92.79.2"}' > "$proj/.goalie/evidence/edge_gateway/last_known_state.json"

    cat > "$proj/scripts/cicd/edge_fetcher.py" <<'PY'
def fetch_edge_status(project_root):
    fqdns = ["billing.bhopti.com"]
    registry = {"billing.bhopti.com": "23.92.79.2"}
    live = {"billing.bhopti.com": "23.92.79.2"}
    cache = {"billing.bhopti.com": "23.92.79.2"}
    to_sync = []
    meta = {"billing.bhopti.com": {"origin": "23.92.79.2", "health_path": "/", "sync_timeout_s": 5, "roam_risk_id": None, "notify_on_fail": False}}
    return fqdns, registry, live, cache, to_sync, meta
PY
    cat > "$proj/scripts/cicd/edge_runner.py" <<'PY'
def run_edge_sync(*args, **kwargs): return []
PY

    run_assert_rc 0 "$TMPROOT/p1.out" run_engine "$proj" --no-coherence
    local dod
    dod=$(find "$proj/.goalie/evidence/edge_gateway" -name 'edge_sync_*.json' | head -1)
    assert_file_exists "$dod"
    assert_file_contains "$dod" '"gate"'
    assert_file_contains "$dod" '"run_id"'
    assert_file_contains "$dod" '"timestamp"'
    assert_file_contains "$dod" '"coherence_check"'
    assert_valid_json "$dod"
}

# ── P2: --json emits valid JSON to stdout ───────────────────────────────────
test_json_stdout() {
    echo ""
    echo "P2: --json stdout"
    local proj="$TMPROOT/p2"
    make_fake_project "$proj"
    cat > "$proj/src/proxies/edge_gateway.cfg" <<'CFG'
billing.bhopti.com {
    reverse_proxy 23.92.79.2:80
}
CFG
    cat > "$proj/config/fqdn_registry.yaml" <<'YAML'
domains:
  - fqdn: billing.bhopti.com
    origin: "23.92.79.2"
    health_path: /
YAML
    mkdir -p "$proj/.goalie/evidence/edge_gateway"
    echo '{"billing.bhopti.com": "23.92.79.2"}' > "$proj/.goalie/evidence/edge_gateway/last_known_state.json"

    cat > "$proj/scripts/cicd/edge_fetcher.py" <<'PY'
def fetch_edge_status(project_root):
    fqdns = ["billing.bhopti.com"]
    registry = {"billing.bhopti.com": "23.92.79.2"}
    live = {"billing.bhopti.com": "23.92.79.2"}
    cache = {"billing.bhopti.com": "23.92.79.2"}
    to_sync = []
    meta = {"billing.bhopti.com": {"origin": "23.92.79.2", "health_path": "/", "sync_timeout_s": 5, "roam_risk_id": None, "notify_on_fail": False}}
    return fqdns, registry, live, cache, to_sync, meta
PY
    cat > "$proj/scripts/cicd/edge_runner.py" <<'PY'
def run_edge_sync(*args, **kwargs): return []
PY

    run_assert_rc 0 "$TMPROOT/p2.json" run_engine "$proj" --no-coherence --json
    python3 -c "
import json
text = open('$TMPROOT/p2.json').read()
last = text.rfind('{')
if last == -1:
    raise SystemExit('no JSON object found')
obj = json.loads(text[last:])
assert 'status' in obj, obj
print('json_extract_ok')
" > "$TMPROOT/p2.extract" 2>&1
    assert_exit_code 0
    assert_contains "$(cat "$TMPROOT/p2.extract")" "json_extract_ok"
}

# ── P3: DLQ entry for notify_on_fail=true ──────────────────────────────────────
test_dlq_notify_on_fail() {
    echo ""
    echo "P3: DLQ when notify_on_fail=true"
    local proj="$TMPROOT/p3"
    make_fake_project "$proj"
    cat > "$proj/src/proxies/edge_gateway.cfg" <<'CFG'
billing.bhopti.com {
    reverse_proxy 23.92.79.2:80
}
CFG
    cat > "$proj/config/fqdn_registry.yaml" <<'YAML'
domains:
  - fqdn: billing.bhopti.com
    origin: "23.92.79.2"
    health_path: /
    notify_on_fail: true
YAML
    mkdir -p "$proj/.goalie/evidence/edge_gateway"
    echo '{}' > "$proj/.goalie/evidence/edge_gateway/last_known_state.json"
    mkdir -p "$proj/tooling/scripts"
    cat > "$proj/tooling/scripts/cpanel_dns_sync.sh" <<'SH'
#!/usr/bin/env bash
echo "result: 0"
exit 1
SH
    chmod +x "$proj/tooling/scripts/cpanel_dns_sync.sh"

    cat > "$proj/scripts/cicd/edge_fetcher.py" <<'PY'
OFFLINE = "offline_or_unresolved"
def fetch_edge_status(project_root):
    fqdns = ["billing.bhopti.com"]
    registry = {"billing.bhopti.com": "23.92.79.2"}
    live = {"billing.bhopti.com": "1.2.3.4"}
    cache = {}
    to_sync = ["billing.bhopti.com"]
    meta = {"billing.bhopti.com": {"origin": "23.92.79.2", "health_path": "/", "sync_timeout_s": 5, "roam_risk_id": "R-EDGE-01", "notify_on_fail": True}}
    return fqdns, registry, live, cache, to_sync, meta
PY

    run_assert_rc 1 "$TMPROOT/p3.out" run_engine "$proj" --no-coherence
    assert_file_contains "$proj/.goalie/evidence/edge_gateway/dlq.jsonl" "edge_sync_fail"
    assert_file_contains "$proj/.goalie/evidence/edge_gateway/dlq.jsonl" "R-EDGE-01"
    assert_file_contains "$proj/.goalie/evidence/edge_gateway/dlq.jsonl" "billing.bhopti.com"
}

# ── E1: one.sh edge-sync --dry-run --no-coherence routes to engine ─────────────
test_one_sh_edge_sync_routes() {
    echo ""
    echo "E1: one.sh edge-sync --dry-run --no-coherence routes to engine"
    local proj="$TMPROOT/e1"
    make_fake_project "$proj"
    cp "$ONE_SH" "$proj/scripts/one.sh"
    cat > "$proj/src/proxies/edge_gateway.cfg" <<'CFG'
billing.bhopti.com {
    reverse_proxy 23.92.79.2:80
}
CFG
    cat > "$proj/config/fqdn_registry.yaml" <<'YAML'
domains:
  - fqdn: billing.bhopti.com
    origin: "23.92.79.2"
    health_path: /
YAML

    cat > "$proj/scripts/cicd/edge_fetcher.py" <<'PY'
def fetch_edge_status(project_root):
    fqdns = ["billing.bhopti.com"]
    registry = {"billing.bhopti.com": "23.92.79.2"}
    live = {"billing.bhopti.com": "23.92.79.2"}
    cache = {"billing.bhopti.com": "23.92.79.2"}
    to_sync = []
    meta = {"billing.bhopti.com": {"origin": "23.92.79.2", "health_path": "/", "sync_timeout_s": 5, "roam_risk_id": None, "notify_on_fail": False}}
    return fqdns, registry, live, cache, to_sync, meta
PY
    cat > "$proj/scripts/cicd/edge_runner.py" <<'PY'
def run_edge_sync(*args, **kwargs): return []
PY

    run_assert_rc 0 "$TMPROOT/e1.out" bash "$proj/scripts/one.sh" edge-sync --dry-run --no-coherence
    assert_contains "$(cat "$TMPROOT/e1.out")" "EDGE GATEWAY SYNC ENGINE"
}

# ── E2: Coherence gate blocks without --no-coherence when artefact absent ─────
test_coherence_gate_blocks() {
    echo ""
    echo "E2: coherence gate blocks without --no-coherence"
    local proj="$TMPROOT/e2"
    make_fake_project "$proj"
    cat > "$proj/src/proxies/edge_gateway.cfg" <<'CFG'
billing.bhopti.com {
    reverse_proxy 23.92.79.2:80
}
CFG
    cat > "$proj/config/fqdn_registry.yaml" <<'YAML'
domains:
  - fqdn: billing.bhopti.com
    origin: "23.92.79.2"
    health_path: /
YAML

    cat > "$proj/scripts/cicd/edge_fetcher.py" <<'PY'
def fetch_edge_status(project_root):
    fqdns = ["billing.bhopti.com"]
    registry = {"billing.bhopti.com": "23.92.79.2"}
    live = {"billing.bhopti.com": "23.92.79.2"}
    cache = {"billing.bhopti.com": "23.92.79.2"}
    to_sync = []
    meta = {"billing.bhopti.com": {"origin": "23.92.79.2", "health_path": "/", "sync_timeout_s": 5, "roam_risk_id": None, "notify_on_fail": False}}
    return fqdns, registry, live, cache, to_sync, meta
PY
    cat > "$proj/scripts/cicd/edge_runner.py" <<'PY'
def run_edge_sync(*args, **kwargs): return []
PY

    run_assert_rc 2 "$TMPROOT/e2.out" run_engine "$proj" --dry-run
    assert_contains "$(cat "$TMPROOT/e2.out")" "Coherence gate FAIL"
}

main() {
    test_missing_cfg_fails
    test_missing_registry_fails
    test_dry_run_no_drift
    test_dns_ok_cache_hit_skipped
    test_drift_detected_emits_fail
    test_unresolved_writes_dlq
    test_retry_transient_dns
    test_health_probe
    test_dod_artefact_fields
    test_json_stdout
    test_dlq_notify_on_fail
    test_receipt_artifact_emitted
    test_fetch_run_report_edge_context
    test_one_sh_edge_sync_routes
    test_coherence_gate_blocks
    print_test_summary
}

main "$@"
