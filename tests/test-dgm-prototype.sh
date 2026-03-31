#!/usr/bin/env bash
# Integration tests for dgm-prototype gate decisions.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

pass() { echo "PASS: $*"; }
fail() { echo "FAIL: $*" >&2; exit 1; }

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

run_gate() {
    local candidate_json="$1"
    shift
    (cd "$ROOT_DIR" && cargo run -p dgm-prototype --bin dgm-gate -- --candidate-json "$candidate_json" "$@" >/dev/null 2>&1)
}

# Case 1: Low-risk candidate + all gates passed -> apply (exit 0)
cat > "$tmp_dir/c1.json" <<'EOF'
{"id":"c1","target_path":"scripts/validators/file/validation-runner.sh","patch_path":"/tmp/c1.patch","summary":"Refactor date branch"}
EOF
if run_gate "$tmp_dir/c1.json" --allowlist "scripts/validators/" --tests-passed 1 --shellcheck-passed 1 --contract-verify-passed 1 --rollback-ready 1; then
    pass "low-risk candidate applied"
else
    fail "expected low-risk candidate to apply"
fi

# Case 2: Gate failure -> reject (exit 2)
if run_gate "$tmp_dir/c1.json" --allowlist "scripts/validators/" --tests-passed 0 --shellcheck-passed 1 --contract-verify-passed 1 --rollback-ready 1; then
    fail "expected rejection when tests fail"
else
    pass "rejects candidate when tests fail"
fi

# Case 3: Retention-sensitive target -> reject (exit 2)
cat > "$tmp_dir/c2.json" <<'EOF'
{"id":"c2","target_path":"_SYSTEM/_AUTOMATION/email-hash-db.sh","patch_path":"/tmp/c2.patch","summary":"delete stale log records"}
EOF
if run_gate "$tmp_dir/c2.json" --allowlist "scripts/validators/,_SYSTEM/_AUTOMATION/" --tests-passed 1 --shellcheck-passed 1 --contract-verify-passed 1 --rollback-ready 1; then
    fail "expected retention-sensitive candidate rejection"
else
    pass "retention-sensitive candidate rejected"
fi

echo "PASS: dgm-prototype integration tests complete"

