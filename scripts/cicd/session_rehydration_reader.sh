#!/usr/bin/env bash
# BT-9: Read rehydration manifest for session wake (--compact | --emit).
set -euo pipefail
source "$(dirname "$0")/lib/cls_common.sh"
cls_repo_root

MODE="${1:---compact}"
LATEST="$REPO_ROOT/.goalie/evidence/learning/rehydration_latest.json"

load_doc() {
  python3 - "$REPO_ROOT" "$LATEST" <<'PY'
import json, sys
from pathlib import Path
root, latest = Path(sys.argv[1]), Path(sys.argv[2])
if not latest.is_file():
    raise SystemExit(2)
meta = json.loads(latest.read_text())
path = Path(meta.get("path", ""))
if not path.is_file():
    raise SystemExit(3)
print(path.read_text())
PY
}

if [[ ! -f "$LATEST" ]]; then
  [[ "$MODE" == "--emit" ]] && return 0 2>/dev/null || true
  echo "WARN: no rehydration_latest.json" >&2
  echo 'AGENT_LOOP_WAKE_CLS {"status":"empty"}'
  exit 1
fi

case "$MODE" in
  --emit)
    load_doc >/dev/null 2>&1 && echo "rehydration_manifest_ready=1" || true
    ;;
  --compact|--wake|*)
    DOC="$(load_doc)" || exit 1
    python3 -c "import json,sys; d=json.loads(sys.argv[1]); c={k:d.get(k) for k in ('schema','head_sha','loop_item','loop_tick_count','trust_artifact_ok','untracked_critical','untracked_substrate_total','session_reset_recommended','budget','next_commands','latest_learning_path')}; print(json.dumps(c,indent=2)); print('AGENT_LOOP_WAKE_CLS '+json.dumps({'status':'ok','head_sha':d.get('head_sha'),'tick':d.get('loop_tick_count')}))" "$DOC"
    ;;
esac
