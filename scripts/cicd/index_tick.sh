#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib/cls_common.sh"
cls_repo_root
OUT="$REPO_ROOT/.goalie/evidence/learning/index_tick.json"
mkdir -p "$(dirname "$OUT")"
read -r UC US < <(cls_untracked_counts)
export UC US OUT
python3 <<'PY'
import json, os
uc, us = int(os.environ["UC"]), int(os.environ["US"])
out = os.environ["OUT"]
doc = {"untracked_critical": uc, "untracked_substrate_total": us, "status": "PASS" if uc == 0 else "FAIL"}
open(out, "w").write(json.dumps(doc, indent=2) + "\n")
print(json.dumps(doc))
raise SystemExit(0 if uc == 0 else 1)
PY
