#!/usr/bin/env bash
# Contract: one.sh utilization of MetaHarness, Agentic QE, and Ruflo plugin portfolio.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$SCRIPT_DIR/../helpers/assertions.sh"

ONE_SH="$ROOT_DIR/scripts/one.sh"
HARNESS_PKG="$ROOT_DIR/apps/agent-harness/package.json"
TMPROOT=$(mktemp -d)
trap 'rm -rf "$TMPROOT"' EXIT

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TDD: one.sh MetaHarness + Agentic QE + Ruflo portfolio"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_help_lists_portfolio_subcommands() {
  echo ""
  echo "P1: help lists harness, aqe, ruflo"
  bash "$ONE_SH" help > "$TMPROOT/help.txt" 2>&1
  for sub in harness aqe ruflo workflow; do
    TESTS_RUN=$((TESTS_RUN + 1))
    if grep -q "$sub" "$TMPROOT/help.txt"; then
      TESTS_PASSED=$((TESTS_PASSED + 1))
      echo -e "\033[32m✓\033[0m  help lists: $sub"
    else
      TESTS_FAILED=$((TESTS_FAILED + 1))
      echo -e "\033[31m✗\033[0m  help MISSING: $sub"
    fi
  done
}

test_harness_metaharness_wiring() {
  echo ""
  echo "P2: harness → apps/agent-harness + @metaharness/*"
  TESTS_RUN=$((TESTS_RUN + 1))
  if grep -q 'apps/agent-harness' "$ONE_SH"; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "\033[32m✓\033[0m  one.sh references apps/agent-harness"
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "\033[31m✗\033[0m  one.sh missing apps/agent-harness dispatch"
  fi
  for dep in '@metaharness/kernel' '@metaharness/darwin' 'metaharness-darwin'; do
    TESTS_RUN=$((TESTS_RUN + 1))
    if grep -q "$dep" "$HARNESS_PKG"; then
      TESTS_PASSED=$((TESTS_PASSED + 1))
      echo -e "\033[32m✓\033[0m  harness package declares: $dep"
    else
      TESTS_FAILED=$((TESTS_FAILED + 1))
      echo -e "\033[31m✗\033[0m  harness package MISSING: $dep"
    fi
  done
  TESTS_RUN=$((TESTS_RUN + 1))
  bash "$ONE_SH" harness --help > "$TMPROOT/harness_help.txt" 2>&1
  if grep -qi 'metaharness\|doctor' "$TMPROOT/harness_help.txt"; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "\033[32m✓\033[0m  harness --help documents MetaHarness commands"
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "\033[31m✗\033[0m  harness --help missing MetaHarness docs"
  fi
}

test_aqe_agentic_flow_root() {
  echo ""
  echo "P3: aqe → agentic-qe + agentic-flow monorepo root"
  TESTS_RUN=$((TESTS_RUN + 1))
  local pinned_ver
  pinned_ver=$(python3 -c "import yaml; print([p['pinned'] for p in yaml.safe_load(open('$ROOT_DIR/config/versions/portfolio.yaml'))['packages'] if p['id']=='agentic-qe'][0])" 2>/dev/null || echo "3.11.3")
  if grep -q "agentic-qe@${pinned_ver}" "$ROOT_DIR/scripts/one-sh.d/aqe.sh"; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "\033[32m✓\033[0m  aqe.sh pins agentic-qe@${pinned_ver}"
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "\033[31m✗\033[0m  aqe.sh missing agentic-qe pin"
  fi
  TESTS_RUN=$((TESTS_RUN + 1))
  if grep -q 'AQE_PROJECT_ROOT' "$ROOT_DIR/scripts/one-sh.d/aqe.sh"; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "\033[32m✓\033[0m  aqe.sh sets AQE_PROJECT_ROOT"
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "\033[31m✗\033[0m  aqe.sh missing AQE_PROJECT_ROOT"
  fi
  TESTS_RUN=$((TESTS_RUN + 1))
  if python3 -c "import json; from pathlib import Path; assert json.loads(Path('$ROOT_DIR/package.json').read_text())['name']=='agentic-flow'"; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "\033[32m✓\033[0m  monorepo package.json name is agentic-flow"
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "\033[31m✗\033[0m  package.json name is not agentic-flow"
  fi
}


test_agenticow_probe() {
  echo ""
  echo "P9: agenticow portfolio pin + probe (offline degraded ok)"
  TESTS_RUN=$((TESTS_RUN + 1))
  if grep -q 'id: agenticow' "$ROOT_DIR/config/versions/portfolio.yaml"; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "\033[32m✓\033[0m  portfolio.yaml declares agenticow"
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "\033[31m✗\033[0m  portfolio.yaml missing agenticow"
  fi
  TESTS_RUN=$((TESTS_RUN + 1))
  if grep -q '^AGENTICOW_VERSION=' "$ROOT_DIR/config/ruflo/version.env"; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "\033[32m✓\033[0m  version.env has AGENTICOW_VERSION"
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "\033[31m✗\033[0m  version.env missing AGENTICOW_VERSION"
  fi
  TESTS_RUN=$((TESTS_RUN + 1))
  AF_SKIP_NETWORK=1 REPO_ROOT="$ROOT_DIR" python3 "$ROOT_DIR/scripts/ruflo/agenticow_probe.py" > "$TMPROOT/agenticow.json" 2>&1
  if python3 -c "import json; d=json.load(open('$TMPROOT/agenticow.json')); assert d.get('schema')=='agenticow_probe.v1'" 2>/dev/null; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "\033[32m✓\033[0m  agenticow_probe emits v1 schema"
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "\033[31m✗\033[0m  agenticow_probe failed"
  fi
}

test_redblue_manifest_link() {
  echo ""
  echo "P8: @metaharness/redblue mock-judge ↔ harness manifest"
  TESTS_RUN=$((TESTS_RUN + 1))
  if [[ -f "$ROOT_DIR/apps/agent-harness/.harness/manifest.json" ]]; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "\033[32m✓\033[0m  harness manifest present"
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "\033[31m✗\033[0m  harness manifest missing"
  fi
  TESTS_RUN=$((TESTS_RUN + 1))
  if grep -q '@metaharness/redblue' "$HARNESS_PKG"; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "\033[32m✓\033[0m  harness declares @metaharness/redblue"
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "\033[31m✗\033[0m  harness missing redblue dep"
  fi
}

test_ruflo_portfolio_wiring() {
  echo ""
  echo "P4: ruflo portfolio — pinned CLI + plugins manifest"
  TESTS_RUN=$((TESTS_RUN + 1))
  if grep -q 'ruflo_npx.sh' "$ROOT_DIR/scripts/one-sh.d/workflow.sh"; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "\033[32m✓\033[0m  workflow.sh sources ruflo_npx.sh"
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "\033[31m✗\033[0m  workflow.sh missing ruflo_npx"
  fi
  # shellcheck disable=SC1091
  source "$ROOT_DIR/config/ruflo/version.env"
  TESTS_RUN=$((TESTS_RUN + 1))
  if grep -q 'ruflo@${RUFLO_VERSION}' "$ROOT_DIR/scripts/ruflo/lib/ruflo_npx.sh" \
     && grep -q "^RUFLO_VERSION=${RUFLO_VERSION}$" "$ROOT_DIR/config/ruflo/version.env"; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "\033[32m✓\033[0m  ruflo_npx pins ruflo@${RUFLO_VERSION}"
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "\033[31m✗\033[0m  ruflo_npx version pin mismatch"
  fi
  TESTS_RUN=$((TESTS_RUN + 1))
  if python3 -c "
import yaml
from pathlib import Path
root = Path('$ROOT_DIR')
plugins = yaml.safe_load((root / 'config/ruflo/plugins.yaml').read_text())
manifest = yaml.safe_load((root / 'config/monorepo/root_manifest.yaml').read_text())
assert plugins.get('schema') == 'ruflo_plugins.v1'
ids = {p['id'] for p in plugins.get('plugins', [])}
for required in ('agentic-qe', 'test-intelligence', 'code-intelligence'):
    assert required in ids
assert manifest.get('orchestration', {}).get('canonical_router') == 'scripts/one.sh'
assert 'plugins_manifest: config/ruflo/plugins.yaml' in (root / 'config/monorepo/root_manifest.yaml').read_text()
"; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "\033[32m✓\033[0m  plugins.yaml portfolio + root_manifest linkage"
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "\033[31m✗\033[0m  ruflo portfolio manifest contract failed"
  fi
}

test_harness_doctor_smoke() {
  echo ""
  echo "P6: one.sh harness doctor — MetaHarness live smoke"
  set +e
  bash "$ONE_SH" harness doctor > "$TMPROOT/doctor.txt" 2>&1
  LAST_RC=$?
  set -e
  TESTS_RUN=$((TESTS_RUN + 1))
  if [[ $LAST_RC -eq 0 ]]; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "\033[32m✓\033[0m  harness doctor exits 0"
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "\033[31m✗\033[0m  harness doctor failed (rc=$LAST_RC)"
  fi
  TESTS_RUN=$((TESTS_RUN + 1))
  if grep -qi 'kernel\|metaharness\|all checks passed' "$TMPROOT/doctor.txt"; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "\033[32m✓\033[0m  doctor output mentions kernel health"
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "\033[31m✗\033[0m  doctor output missing kernel health markers"
  fi
}

test_workflow_alias_matches_ruflo() {
  echo ""
  echo "P7: workflow alias === ruflo --help"
  bash "$ONE_SH" ruflo --help > "$TMPROOT/ruflo_help.txt" 2>&1
  bash "$ONE_SH" workflow --help > "$TMPROOT/workflow_help.txt" 2>&1
  TESTS_RUN=$((TESTS_RUN + 1))
  if diff -q "$TMPROOT/ruflo_help.txt" "$TMPROOT/workflow_help.txt" >/dev/null 2>&1; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "\033[32m✓\033[0m  workflow and ruflo --help are identical"
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "\033[31m✗\033[0m  workflow vs ruflo help mismatch"
  fi
}





test_one_sh_portfolio_subcommand() {
  echo ""
  echo "P5: one.sh portfolio → version_portfolio_probe"
  TESTS_RUN=$((TESTS_RUN + 1))
  if grep -qE 'portfolio\|versions\)' "$ONE_SH"; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "\033[32m✓\033[0m  one.sh routes portfolio → version_portfolio_probe"
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "\033[31m✗\033[0m  one.sh missing portfolio subcommand"
  fi
  TESTS_RUN=$((TESTS_RUN + 1))
  AF_SKIP_NETWORK=1 bash "$ONE_SH" portfolio --dry-run --json > "$TMPROOT/portfolio.json" 2>&1
  if python3 -c "import json,sys; d=json.load(open(sys.argv[1])); assert d.get('schema')=='version_portfolio.v1'" "$TMPROOT/portfolio.json" 2>/dev/null; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "\033[32m✓\033[0m  one.sh portfolio --dry-run emits v1 schema"
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "\033[31m✗\033[0m  one.sh portfolio probe failed"
  fi
}

main() {
  test_help_lists_portfolio_subcommands
  test_harness_metaharness_wiring
  test_aqe_agentic_flow_root
  test_ruflo_portfolio_wiring
  test_one_sh_portfolio_subcommand
  test_harness_doctor_smoke
  test_workflow_alias_matches_ruflo
  test_agenticow_probe
  test_redblue_manifest_link
  print_test_summary
}

main "$@"
