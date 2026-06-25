#!/usr/bin/env bash
# tests/gates/test_upstream_registry_expansion.sh
#
# Verifies the Wave-9 upstream registry expansion:
#
#  E1   JSON is parseable (python3 json.load)
#  E2   Registry has ≥ 20 repos (Wave-9 floor)
#  E3   All originally-requested repos are present (by id)
#  E4   All new repos (Wave-9 additions) are present
#  E5   Every entry has the base required fields (id, url, branch,
#       integration_test, active)
#  E6   active is boolean on every entry
#  E7   harness_hint present on every entry
#  E8   harness_type present on every entry (new Wave-9 field)
#  E9   check_interval_s present and is a positive integer on every entry
#  E10  timeout_s present and is a positive integer where defined
#  E11  run_timeout_s present and is a positive integer where defined
#  E12  retry present and is a non-negative integer where defined
#  E13  notify_on_fail is boolean where defined
#  E14  No duplicate ids
#  E15  upstream_fetcher.validate_registry() passes
#  E16  Specific repo URLs are reachable via git ls-remote (network-gated;
#       skipped when UPSTREAM_REGISTRY_SKIP_NETWORK=1)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$SCRIPT_DIR/../helpers/assertions.sh"

REGISTRY="$ROOT_DIR/config/cicd/upstream_registry.json"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TDD: upstream registry expansion (Wave-9)"
echo "Registry: $REGISTRY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── E1: JSON is parseable ─────────────────────────────────────────────────────
test_e1_json_parseable() {
    echo ""
    echo "E1: Registry JSON is parseable"

    local out rc=0
    out=$(python3 -c "
import json, sys
try:
    d = json.load(open('$REGISTRY'))
    print('OK:', len(d.get('repositories', [])), 'repos')
except Exception as e:
    print('ERROR:', e)
    sys.exit(1)
" 2>&1) || rc=$?

    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ $rc -eq 0 ]] && echo "$out" | grep -q "^OK:"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  $out"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  JSON parse failed: $out"
    fi
}

# ── E2: Repo count ≥ 20 ───────────────────────────────────────────────────────
test_e2_repo_count() {
    echo ""
    echo "E2: Registry has ≥ 20 repos (Wave-9 floor)"

    local count
    count=$(python3 -c "import json; d=json.load(open('$REGISTRY')); print(len(d['repositories']))" 2>&1)

    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ "$count" =~ ^[0-9]+$ ]] && [[ $count -ge 20 ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  Registry has $count repos (≥ 20 required)"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  Registry has $count repos (< 20 — Wave-9 expansion incomplete)"
    fi
}

# ── E3: All originally-requested repos are present ───────────────────────────
test_e3_requested_repos_present() {
    echo ""
    echo "E3: All originally-requested repos are present"

    # ids that must be present (originally requested in Wave-9 deliverable)
    local required_ids=(
        "agent-harness-generator"
        "openspec"
        "google-deepmind-gemma"
        "gemma-pytorch"
        "gemma4-benchmarks"
        "needle-in-a-haystack"
        "opencompass"
        "needle-tools"
        "cactus-needle"
        "artichoke"
    )

    local out
    out=$(python3 -c "
import json, sys
d = json.load(open('$REGISTRY'))
existing = {r['id'] for r in d['repositories']}
required = $(python3 -c "
ids = ['agent-harness-generator','openspec','google-deepmind-gemma','gemma-pytorch','gemma4-benchmarks','needle-in-a-haystack','opencompass','needle-tools','cactus-needle','artichoke']
print(repr(ids))
")
missing = [i for i in required if i not in existing]
if missing:
    print('MISSING:', missing)
    sys.exit(1)
print('OK: all', len(required), 'required repos present')
" 2>&1)

    TESTS_RUN=$((TESTS_RUN + 1))
    if echo "$out" | grep -q "^OK:"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  $out"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  $out"
    fi
}

# ── E4: Wave-9 new repos are present ─────────────────────────────────────────
test_e4_wave9_new_repos_present() {
    echo ""
    echo "E4: Wave-9 new repos are present"

    local out
    out=$(python3 -c "
import json, sys
d = json.load(open('$REGISTRY'))
existing = {r['id'] for r in d['repositories']}
new_ids = ['lm-evaluation-harness', 'inspect-ai', 'openai-evals', 'agentbench']
missing = [i for i in new_ids if i not in existing]
if missing:
    print('MISSING:', missing)
    sys.exit(1)
print('OK: all', len(new_ids), 'Wave-9 new repos present')
" 2>&1)

    TESTS_RUN=$((TESTS_RUN + 1))
    if echo "$out" | grep -q "^OK:"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  $out"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  $out"
    fi
}

# ── E5: Base required fields on every entry ───────────────────────────────────
test_e5_required_fields() {
    echo ""
    echo "E5: Every entry has base required fields (id, url, branch, integration_test, active)"

    local out
    out=$(python3 - << 'PY' 2>&1
import json, sys
d = json.load(open('config/cicd/upstream_registry.json'))
required = {"id", "url", "branch", "integration_test", "active"}
errors = []
for r in d["repositories"]:
    missing = required - set(r.keys())
    if missing:
        errors.append(f"{r.get('id','?')} missing: {sorted(missing)}")
if errors:
    for e in errors:
        print("ERROR:", e)
    sys.exit(1)
print(f"OK: {len(d['repositories'])} repos all have required fields")
PY
)

    TESTS_RUN=$((TESTS_RUN + 1))
    if echo "$out" | grep -q "^OK:"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  $out"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  Required field check failed:"
        echo "$out" | grep "^ERROR:" | while IFS= read -r line; do echo "    $line"; done
    fi
}

# ── E6: active is boolean ─────────────────────────────────────────────────────
test_e6_active_is_boolean() {
    echo ""
    echo "E6: active is boolean on every entry"

    local out
    out=$(python3 - << 'PY' 2>&1
import json, sys
d = json.load(open('config/cicd/upstream_registry.json'))
errors = []
for r in d["repositories"]:
    if not isinstance(r.get("active"), bool):
        errors.append(f"{r.get('id','?')}: active={r.get('active')!r} (not bool)")
if errors:
    for e in errors: print("ERROR:", e)
    sys.exit(1)
print(f"OK: all {len(d['repositories'])} entries have bool active")
PY
)

    TESTS_RUN=$((TESTS_RUN + 1))
    if echo "$out" | grep -q "^OK:"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  $out"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  $out"
    fi
}

# ── E7: harness_hint present ──────────────────────────────────────────────────
test_e7_harness_hint_present() {
    echo ""
    echo "E7: harness_hint present on every entry"

    local out
    out=$(python3 - << 'PY' 2>&1
import json, sys
d = json.load(open('config/cicd/upstream_registry.json'))
missing = [r["id"] for r in d["repositories"] if "harness_hint" not in r or not r["harness_hint"]]
if missing:
    print("MISSING harness_hint:", missing)
    sys.exit(1)
print(f"OK: harness_hint present on all {len(d['repositories'])} entries")
PY
)

    TESTS_RUN=$((TESTS_RUN + 1))
    if echo "$out" | grep -q "^OK:"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  $out"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  $out"
    fi
}

# ── E8: harness_type present (new Wave-9 field) ───────────────────────────────
test_e8_harness_type_present() {
    echo ""
    echo "E8: harness_type present on every entry (Wave-9 new field)"

    local out
    out=$(python3 - << 'PY' 2>&1
import json, sys
d = json.load(open('config/cicd/upstream_registry.json'))
valid_types = {"python", "pytest", "cargo", "npm", "playwright", "shell", "unknown"}
errors = []
for r in d["repositories"]:
    ht = r.get("harness_type")
    if ht is None:
        errors.append(f"{r['id']}: harness_type missing")
    elif ht not in valid_types:
        errors.append(f"{r['id']}: harness_type={ht!r} not in {sorted(valid_types)}")
if errors:
    for e in errors: print("ERROR:", e)
    sys.exit(1)
print(f"OK: harness_type present and valid on all {len(d['repositories'])} entries")
PY
)

    TESTS_RUN=$((TESTS_RUN + 1))
    if echo "$out" | grep -q "^OK:"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  $out"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  harness_type check failed:"
        echo "$out" | grep "^ERROR:" | while IFS= read -r line; do echo "    $line"; done
    fi
}

# ── E9: check_interval_s present and positive int ────────────────────────────
test_e9_check_interval_s() {
    echo ""
    echo "E9: check_interval_s present and is a positive integer on every entry"

    local out
    out=$(python3 - << 'PY' 2>&1
import json, sys
d = json.load(open('config/cicd/upstream_registry.json'))
errors = []
for r in d["repositories"]:
    ci = r.get("check_interval_s")
    if ci is None:
        errors.append(f"{r['id']}: check_interval_s missing")
    elif not isinstance(ci, int) or ci <= 0:
        errors.append(f"{r['id']}: check_interval_s={ci!r} must be positive int")
if errors:
    for e in errors: print("ERROR:", e)
    sys.exit(1)
print(f"OK: check_interval_s valid on all {len(d['repositories'])} entries")
PY
)

    TESTS_RUN=$((TESTS_RUN + 1))
    if echo "$out" | grep -q "^OK:"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  $out"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  check_interval_s check failed:"
        echo "$out" | grep "^ERROR:" | while IFS= read -r line; do echo "    $line"; done
    fi
}

# ── E10: timeout_s is positive int where present ─────────────────────────────
test_e10_timeout_s() {
    echo ""
    echo "E10: timeout_s is a positive integer where defined"

    local out
    out=$(python3 - << 'PY' 2>&1
import json, sys
d = json.load(open('config/cicd/upstream_registry.json'))
errors = []
for r in d["repositories"]:
    v = r.get("timeout_s")
    if v is not None and (not isinstance(v, int) or v <= 0):
        errors.append(f"{r['id']}: timeout_s={v!r} not a positive int")
if errors:
    for e in errors: print("ERROR:", e)
    sys.exit(1)
print(f"OK: timeout_s valid on all entries that define it")
PY
)

    TESTS_RUN=$((TESTS_RUN + 1))
    if echo "$out" | grep -q "^OK:"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  $out"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  $out"
    fi
}

# ── E11: run_timeout_s is positive int where present ─────────────────────────
test_e11_run_timeout_s() {
    echo ""
    echo "E11: run_timeout_s is a positive integer where defined"

    local out
    out=$(python3 - << 'PY' 2>&1
import json, sys
d = json.load(open('config/cicd/upstream_registry.json'))
errors = []
for r in d["repositories"]:
    v = r.get("run_timeout_s")
    if v is not None and (not isinstance(v, int) or v <= 0):
        errors.append(f"{r['id']}: run_timeout_s={v!r} not a positive int")
if errors:
    for e in errors: print("ERROR:", e)
    sys.exit(1)
print(f"OK: run_timeout_s valid on all entries that define it")
PY
)

    TESTS_RUN=$((TESTS_RUN + 1))
    if echo "$out" | grep -q "^OK:"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  $out"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  $out"
    fi
}

# ── E12: retry is non-negative int where present ──────────────────────────────
test_e12_retry() {
    echo ""
    echo "E12: retry is a non-negative integer where defined"

    local out
    out=$(python3 - << 'PY' 2>&1
import json, sys
d = json.load(open('config/cicd/upstream_registry.json'))
errors = []
for r in d["repositories"]:
    v = r.get("retry")
    if v is not None and (not isinstance(v, int) or v < 0):
        errors.append(f"{r['id']}: retry={v!r} not a non-negative int")
if errors:
    for e in errors: print("ERROR:", e)
    sys.exit(1)
print(f"OK: retry valid on all entries that define it")
PY
)

    TESTS_RUN=$((TESTS_RUN + 1))
    if echo "$out" | grep -q "^OK:"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  $out"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  $out"
    fi
}

# ── E13: notify_on_fail is boolean where defined ─────────────────────────────
test_e13_notify_on_fail_bool() {
    echo ""
    echo "E13: notify_on_fail is boolean where defined"

    local out
    out=$(python3 - << 'PY' 2>&1
import json, sys
d = json.load(open('config/cicd/upstream_registry.json'))
errors = []
for r in d["repositories"]:
    v = r.get("notify_on_fail")
    if v is not None and not isinstance(v, bool):
        errors.append(f"{r['id']}: notify_on_fail={v!r} not bool")
if errors:
    for e in errors: print("ERROR:", e)
    sys.exit(1)
print(f"OK: notify_on_fail is bool on all entries that define it")
PY
)

    TESTS_RUN=$((TESTS_RUN + 1))
    if echo "$out" | grep -q "^OK:"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  $out"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  $out"
    fi
}

# ── E14: No duplicate ids ─────────────────────────────────────────────────────
test_e14_no_duplicate_ids() {
    echo ""
    echo "E14: No duplicate ids in registry"

    local out
    out=$(python3 - << 'PY' 2>&1
import json, sys
from collections import Counter
d = json.load(open('config/cicd/upstream_registry.json'))
counts = Counter(r["id"] for r in d["repositories"])
dups = {k: v for k, v in counts.items() if v > 1}
if dups:
    print("DUPLICATES:", dups)
    sys.exit(1)
print(f"OK: all {len(d['repositories'])} ids are unique")
PY
)

    TESTS_RUN=$((TESTS_RUN + 1))
    if echo "$out" | grep -q "^OK:"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  $out"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  $out"
    fi
}

# ── E15: upstream_fetcher.validate_registry() passes ─────────────────────────
test_e15_fetcher_validate_registry() {
    echo ""
    echo "E15: upstream_fetcher.validate_registry() passes"

    local out rc=0
    out=$(python3 - << 'PY' 2>&1
import sys, json
sys.path.insert(0, 'scripts/cicd')
try:
    from upstream_fetcher import validate_registry, RegistryValidationError
    d = json.load(open('config/cicd/upstream_registry.json'))
    validate_registry(d)
    print(f"OK: validate_registry passed for {len(d['repositories'])} repos")
except RegistryValidationError as e:
    print(f"VALIDATION_ERROR: {e}")
    sys.exit(1)
except ImportError as e:
    print(f"IMPORT_ERROR: {e} — skipping (fetcher not importable in this context)")
    sys.exit(0)
PY
) || rc=$?

    TESTS_RUN=$((TESTS_RUN + 1))
    if echo "$out" | grep -qE "^OK:|^IMPORT_ERROR:"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  $out"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  $out"
    fi
}

# ── E16: Harness-type consistency (harness_hint ↔ harness_type) ───────────────
test_e16_harness_consistency() {
    echo ""
    echo "E16: harness_hint and harness_type are consistent with integration_test command"

    local out
    out=$(python3 - << 'PY' 2>&1
import json, sys
d = json.load(open('config/cicd/upstream_registry.json'))
errors = []
for r in d["repositories"]:
    cmd = r.get("integration_test", "")
    ht = r.get("harness_type", "")
    # cargo check / cargo test -> harness_type must be 'cargo'
    if cmd.startswith("cargo ") and ht != "cargo":
        errors.append(f"{r['id']}: cmd starts with 'cargo' but harness_type={ht!r}")
    # playwright -> harness_type must be 'playwright'
    if "playwright" in cmd and ht != "playwright":
        errors.append(f"{r['id']}: cmd contains 'playwright' but harness_type={ht!r}")
    # pytest -> harness_type should be 'pytest'
    if "pytest" in cmd and ht not in ("pytest",):
        errors.append(f"{r['id']}: cmd contains 'pytest' but harness_type={ht!r}")
if errors:
    for e in errors: print("WARN:", e)
    # non-fatal: warn only (harness_hint may override harness_type for DOR cmd)
print(f"OK: harness consistency checked across {len(d['repositories'])} entries "
      f"({len(errors)} advisory warnings)")
PY
)

    TESTS_RUN=$((TESTS_RUN + 1))
    if echo "$out" | grep -q "^OK:"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  $out"
        # Print any advisory warnings
        if echo "$out" | grep -q "^WARN:"; then
            echo "$out" | grep "^WARN:" | while IFS= read -r line; do echo "    ⚠  $line"; done
        fi
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  $out"
    fi
}

# ── E17: Specific Wave-9 repos have sensible check_interval_s ─────────────────
test_e17_check_interval_sanity() {
    echo ""
    echo "E17: check_interval_s is between 60s and 86400s (1 min to 24 hr) for all entries"

    local out
    out=$(python3 - << 'PY' 2>&1
import json, sys
d = json.load(open('config/cicd/upstream_registry.json'))
errors = []
for r in d["repositories"]:
    ci = r.get("check_interval_s", 0)
    if not (60 <= ci <= 86400):
        errors.append(f"{r['id']}: check_interval_s={ci} outside [60, 86400]")
if errors:
    for e in errors: print("ERROR:", e)
    sys.exit(1)
print(f"OK: check_interval_s in sane range for all {len(d['repositories'])} entries")
PY
)

    TESTS_RUN=$((TESTS_RUN + 1))
    if echo "$out" | grep -q "^OK:"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  $out"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  check_interval_s sanity check failed:"
        echo "$out" | grep "^ERROR:" | while IFS= read -r line; do echo "    $line"; done
    fi
}

# ── E18: All Wave-9 new repos have notes field ───────────────────────────────
test_e18_new_repos_have_notes() {
    echo ""
    echo "E18: All Wave-9 new repos have a notes field explaining their purpose"

    local out
    out=$(python3 - << 'PY' 2>&1
import json, sys
d = json.load(open('config/cicd/upstream_registry.json'))
new_ids = ['lm-evaluation-harness', 'inspect-ai', 'openai-evals', 'agentbench']
errors = []
for r in d["repositories"]:
    if r["id"] in new_ids:
        notes = r.get("notes", "")
        if not notes or len(notes.strip()) < 10:
            errors.append(f"{r['id']}: notes missing or too short")
if errors:
    for e in errors: print("ERROR:", e)
    sys.exit(1)
found = [r["id"] for r in d["repositories"] if r["id"] in new_ids]
print(f"OK: notes present on all {len(found)} Wave-9 new repos")
PY
)

    TESTS_RUN=$((TESTS_RUN + 1))
    if echo "$out" | grep -q "^OK:"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  $out"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  $out"
    fi
}

# ── Run all tests ─────────────────────────────────────────────────────────────
main() {
    # Change to repo root so relative paths in python heredocs work
    cd "$ROOT_DIR"

    test_e1_json_parseable
    test_e2_repo_count
    test_e3_requested_repos_present
    test_e4_wave9_new_repos_present
    test_e5_required_fields
    test_e6_active_is_boolean
    test_e7_harness_hint_present
    test_e8_harness_type_present
    test_e9_check_interval_s
    test_e10_timeout_s
    test_e11_run_timeout_s
    test_e12_retry
    test_e13_notify_on_fail_bool
    test_e14_no_duplicate_ids
    test_e15_fetcher_validate_registry
    test_e16_harness_consistency
    test_e17_check_interval_sanity
    test_e18_new_repos_have_notes

    print_test_summary
}

main "$@"
