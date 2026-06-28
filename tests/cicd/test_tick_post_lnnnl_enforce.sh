#!/usr/bin/env bash
# Behavioral: mocked update_lnnnl failure + AF_LNNNL_ENFORCE=1 → tick_post non-zero exit.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MOCK_BIN="$(mktemp -d)"
cat > "$MOCK_BIN/update_lnnnl.py" <<'MOCK'
#!/usr/bin/env python3
import sys
sys.exit(1)
MOCK
chmod +x "$MOCK_BIN/update_lnnnl.py"
trap 'rm -rf "$MOCK_BIN"' EXIT

export REPO_ROOT="$ROOT"
export AF_LNNNL_ENFORCE=1
export AF_SKIP_OP_READ=1
export AF_TICK_POST_ENFORCE=1
cd "$ROOT"
# prepend mock so tick_post invokes failing WSJF without touching real script path in hook
# tick_post calls python3 "$ROOT/scripts/cicd/update_lnnnl.py" — override via AF_UPDATE_LNNNL_CMD if supported
# inject wrapper by temporarily replacing script
REAL="$ROOT/scripts/cicd/update_lnnnl.py"
BAK="$MOCK_BIN/update_lnnnl.real.py"
cp "$REAL" "$BAK"
cp "$MOCK_BIN/update_lnnnl.py" "$REAL"
trap 'cp "$BAK" "$REAL"; rm -rf "$MOCK_BIN"' EXIT

set +e
bash "$ROOT/scripts/cicd/tick_post_hooks.sh" >/dev/null 2>&1
EC=$?
set -e
[[ "$EC" -ne 0 ]] || { echo "FAIL: expected non-zero exit from enforce path, got $EC"; exit 1; }
echo "PASS tick_post_lnnnl_enforce (exit=$EC)"
