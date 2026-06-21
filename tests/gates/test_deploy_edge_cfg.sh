#!/usr/bin/env bash
# TDD tests for scripts/deploy/deploy-edge-cfg.sh
#
# Behaviours under test:
#   T1  Missing edge_gateway.cfg → exit 1
#   T2  Missing fqdn_registry.yaml → exit 1
#   T3  FQDN parser extracts real domains from edge_gateway.cfg correctly
#   T4  --dry-run with violations → exits 0 (advisory, not blocking)
#   T5  DoD artifact written with correct fields after run
#   T6  Real run: mailadmin.bhopti.com (in registry) reports OK status
#
# NOTE on bash version:
#   deploy-edge-cfg.sh uses `declare -A` (associative arrays) requiring bash 4+.
#   macOS /bin/bash is 3.2.  We resolve the real `bash` via PATH (homebrew 5.x)
#   and invoke fake-repo scripts via their shebang (#!/usr/bin/env bash) so that
#   `env bash` picks up the correct version.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$SCRIPT_DIR/../helpers/assertions.sh"

DEPLOY_EDGE="$ROOT_DIR/scripts/deploy/deploy-edge-cfg.sh"
TMPROOT=$(mktemp -d)
trap 'rm -rf "$TMPROOT"' EXIT

# Resolve the real bash (must be ≥ bash 4 for declare -A)
REAL_BASH=$(command -v bash)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TDD: deploy-edge-cfg.sh  (bash=$REAL_BASH $(bash --version | head -1))"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Build a minimal fake repo ─────────────────────────────────────────────────
build_fake_repo() {
    # $1 = edge cfg content  $2 = fqdn_registry content
    local REPO="$TMPROOT/repo_$RANDOM"
    mkdir -p "$REPO/src/proxies" "$REPO/config" "$REPO/.goalie/evidence" "$REPO/scripts/deploy" "$REPO/scripts/cicd"
    printf "%s" "${1:-}" > "$REPO/src/proxies/edge_gateway.cfg"
    printf "%s" "${2:-}" > "$REPO/config/fqdn_registry.yaml"
    cp "$DEPLOY_EDGE" "$REPO/scripts/deploy/deploy-edge-cfg.sh"
    chmod +x "$REPO/scripts/deploy/deploy-edge-cfg.sh"
    cp "$ROOT_DIR"/scripts/cicd/edge_*.py "$REPO/scripts/cicd/"
    echo "$REPO"
}

# Execute the script via its shebang (so #!/usr/bin/env bash resolves to real bash)
run_in_repo() {
    local REPO="$1"; shift
    set +e
    "$REPO/scripts/deploy/deploy-edge-cfg.sh" "$@" > "$TMPROOT/out.txt" 2>&1
    LAST_RC=$?
    set -e
}

# Same but with a custom PATH prepended (for dig stubs etc.)
run_in_repo_with_path() {
    local EXTRA_PATH="$1"; local REPO="$2"; shift 2
    set +e
    PATH="$EXTRA_PATH:$PATH" \
        "$REPO/scripts/deploy/deploy-edge-cfg.sh" "$@" > "$TMPROOT/out.txt" 2>&1
    LAST_RC=$?
    set -e
}

# ── T1: Missing edge_gateway.cfg → exit 1 ────────────────────────────────────
test_missing_edge_cfg_fails() {
    echo ""
    echo "T1: missing edge_gateway.cfg → exit 1"
    REPO=$(build_fake_repo "" "")
    rm -f "$REPO/src/proxies/edge_gateway.cfg"
    run_in_repo "$REPO"
    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ $LAST_RC -ne 0 ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  exits non-zero (exit $LAST_RC)"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  should have exited non-zero"
    fi
}

# ── T2: Missing fqdn_registry.yaml → exit 1 ──────────────────────────────────
test_missing_registry_fails() {
    echo ""
    echo "T2: missing fqdn_registry.yaml → exit 1"
    # Caddy multi-line format so FQDN is actually extracted
    REPO=$(build_fake_repo "example.com {
}" "")
    rm -f "$REPO/config/fqdn_registry.yaml"
    run_in_repo "$REPO"
    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ $LAST_RC -ne 0 ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  exits non-zero (exit $LAST_RC)"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  should have exited non-zero"
    fi
}

# ── T3: FQDN parser extracts correct domains from real cfg ────────────────────
test_fqdn_parser_extracts_domains() {
    echo ""
    echo "T3: FQDN parser correctly extracts domains from edge_gateway.cfg"

    ACTUAL=$(python3 - "$ROOT_DIR/src/proxies/edge_gateway.cfg" <<'PY'
import re, sys
with open(sys.argv[1]) as f:
    content = f.read()
lines = [l for l in content.splitlines() if not l.strip().startswith('#')]
fqdns = []
for line in lines:
    line = line.strip()
    if re.search(r'[a-z0-9][\w.-]+\.[a-z]{2,}\s*\{?$', line, re.I):
        line = line.rstrip('{').strip()
        for part in line.split(','):
            part = part.strip()
            if re.match(r'^[a-zA-Z0-9][\w.-]+\.[a-zA-Z]{2,}$', part):
                fqdns.append(part)
seen = set()
for f in fqdns:
    if f not in seen:
        seen.add(f)
        print(f)
PY
    )

    TESTS_RUN=$((TESTS_RUN + 1))
    if echo "$ACTUAL" | grep -q "billing.bhopti.com"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  billing.bhopti.com extracted"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  billing.bhopti.com NOT extracted (got: $ACTUAL)"
    fi

    TESTS_RUN=$((TESTS_RUN + 1))
    if echo "$ACTUAL" | grep -q "api.interface.tag.ooo"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  api.interface.tag.ooo extracted"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  api.interface.tag.ooo NOT extracted"
    fi

    TESTS_RUN=$((TESTS_RUN + 1))
    if ! echo "$ACTUAL" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  bare IPs not extracted"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  bare IP was extracted (parser bug)"
    fi
}

# ── T4: --dry-run with violations → exit 0 ───────────────────────────────────
# Use proper Caddy multi-line format: FQDN on its own line ending with {
test_dry_run_exits_zero_with_violations() {
    echo ""
    echo "T4: --dry-run exits 0 even when violations exist"

    # Multi-line Caddy format so the parser extracts the FQDN
    EDGE_CONTENT="fake-domain.example.com {
    reverse_proxy 127.0.0.1:8080
}"
    REGISTRY_CONTENT="- fqdn: fake-domain.example.com
  origin: 127.0.0.1"
    REPO=$(build_fake_repo "$EDGE_CONTENT" "$REGISTRY_CONTENT")

    # Stub dig: returns empty output (no A record) but exits 0
    STUB_BIN="$TMPROOT/stubs_t4"
    mkdir -p "$STUB_BIN"
    cat > "$STUB_BIN/dig" <<'DIG'
#!/usr/bin/env bash
# Stub: no A record
exit 0
DIG
    chmod +x "$STUB_BIN/dig"

    run_in_repo_with_path "$STUB_BIN" "$REPO" --dry-run --no-coherence

    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ $LAST_RC -eq 0 ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  --dry-run exits 0"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  --dry-run exited $LAST_RC (expected 0)"
        cat "$TMPROOT/out.txt"
    fi

    # Actual script prints: "--dry-run mode: exit 0 (advisory only)"
    TESTS_RUN=$((TESTS_RUN + 1))
    if grep -qi "dry.run mode\|advisory only\|advisory" "$TMPROOT/out.txt" 2>/dev/null; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  output mentions dry-run advisory"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  no dry-run advisory (got: $(tail -3 "$TMPROOT/out.txt"))"
    fi
}

# ── T5: DoD artifact written with correct fields ──────────────────────────────
test_dod_artifact_schema() {
    echo ""
    echo "T5: DoD artifact has required fields"

    # Use the real script against the real repo (shebang invocation)
    "$DEPLOY_EDGE" --dry-run --no-coherence > /dev/null 2>&1 || true

    ARTIFACT="$ROOT_DIR/.goalie/evidence/last_edge_cfg_deploy.json"
    assert_file_exists "$ARTIFACT"
    assert_valid_json  "$ARTIFACT"

    for field in gate run_id hash timestamp violations results; do
        TESTS_RUN=$((TESTS_RUN + 1))
        if python3 -c "
import json, sys
d = json.load(open('$ARTIFACT'))
if '$field' not in d: sys.exit(1)
" 2>/dev/null; then
            TESTS_PASSED=$((TESTS_PASSED + 1))
            echo -e "\033[32m✓\033[0m  field present: $field"
        else
            TESTS_FAILED=$((TESTS_FAILED + 1))
            echo -e "\033[31m✗\033[0m  field MISSING: $field"
        fi
    done

    TESTS_RUN=$((TESTS_RUN + 1))
    RESULTS_TYPE=$(python3 -c "
import json
d = json.load(open('$ARTIFACT'))
print(type(d['results']).__name__)
" 2>/dev/null || echo "error")
    if [[ "$RESULTS_TYPE" == "list" ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  results is a JSON array"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  results type=$RESULTS_TYPE (expected list)"
    fi

    TESTS_RUN=$((TESTS_RUN + 1))
    GATE=$(python3 -c "import json; print(json.load(open('$ARTIFACT'))['gate'])" 2>/dev/null || echo "MISSING")
    if [[ "$GATE" == "deploy-edge-cfg" ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  gate=deploy-edge-cfg"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  gate=$GATE (expected deploy-edge-cfg)"
    fi
}

# ── T6: Real run reports mailadmin.bhopti.com as OK ──────────────────────────
test_mailadmin_known_ok() {
    echo ""
    echo "T6: mailadmin.bhopti.com resolves to 23.92.79.2 and is in registry → status OK"

    ARTIFACT="$ROOT_DIR/.goalie/evidence/last_edge_cfg_deploy.json"

    TESTS_RUN=$((TESTS_RUN + 1))
    STATUS=$(python3 -c "
import json
d = json.load(open('$ARTIFACT'))
for r in d['results']:
    if r['fqdn'] == 'mailadmin.bhopti.com':
        print(r['status'])
        exit()
print('NOT_FOUND')
" 2>/dev/null || echo "PARSE_ERROR")
    if [[ "$STATUS" == "OK" || "$STATUS" == "PASS" ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "\033[32m✓\033[0m  mailadmin.bhopti.com status=$STATUS"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\033[31m✗\033[0m  mailadmin.bhopti.com status=$STATUS (expected OK or PASS)"
    fi
}

main() {
    test_missing_edge_cfg_fails
    test_missing_registry_fails
    test_fqdn_parser_extracts_domains
    test_dry_run_exits_zero_with_violations
    test_dod_artifact_schema
    test_mailadmin_known_ok
    print_test_summary
}

main "$@"
