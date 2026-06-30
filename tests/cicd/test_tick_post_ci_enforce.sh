#!/usr/bin/env bash
# Contract: tick_post sub-steps fail-closed in CI (disk steward + WSJF enforce defaults).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
INVOKE="$ROOT/scripts/cicd/lib/disk_steward_invoke.sh"
# shellcheck source=scripts/cicd/lib/is_ci_env.sh
source "$ROOT/scripts/cicd/lib/is_ci_env.sh"

# shellcheck source=scripts/cicd/lib/disk_steward_invoke.sh
source "$INVOKE"
FAKE_ROOT="$(mktemp -d)"
mkdir -p "$FAKE_ROOT/scripts/cicd"
cat >"$FAKE_ROOT/scripts/cicd/disk_steward.sh" <<'STUB'
#!/usr/bin/env bash
exit 2
STUB
chmod +x "$FAKE_ROOT/scripts/cicd/disk_steward.sh"
set +e
unset AF_SKIP_DISK_STEWARD
AF_DISK_STEWARD_ENFORCE=1 disk_steward_maybe "$FAKE_ROOT"
T1_RC=$?
set -e
rm -rf "$FAKE_ROOT"
[[ "$T1_RC" -eq 2 ]] || { echo "FAIL: disk_steward_maybe enforce expected 2, got $T1_RC"; exit 1; }
echo "PASS T1 disk_steward_enforce"

export CI=true GITHUB_ACTIONS=true
# shellcheck source=scripts/cicd/lib/is_ci_env.sh
source "$ROOT/scripts/cicd/lib/is_ci_env.sh"
is_ci_env || { echo "FAIL: is_ci_env should be true under GITHUB_ACTIONS"; exit 1; }
unset CI GITHUB_ACTIONS
echo "PASS T2 ci_env_detection"

grep -q 'AF_WSJF_POST_ENFORCE' "$ROOT/scripts/cicd/tick_post_hooks.sh" || { echo "FAIL: tick_post missing AF_WSJF_POST_ENFORCE"; exit 1; }
grep -q 'AF_DISK_STEWARD_ENFORCE' "$ROOT/scripts/cicd/tick_post_hooks.sh" || { echo "FAIL: tick_post missing AF_DISK_STEWARD_ENFORCE"; exit 1; }
echo "PASS T3 tick_post_ci_enforce_wiring"
echo "PASS tick_post_ci_enforce"
