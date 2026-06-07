#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FIX="$ROOT/tests/cicd/fixtures/wsjf_closure"
SCORECARD="$ROOT/scripts/cicd/wsjf_closure_scorecard.py"
[[ -f "$SCORECARD" ]] || { echo "FAIL missing scorecard script"; exit 1; }

OUT=$(REPO_ROOT="$ROOT" python3 "$SCORECARD" \
  --root "$ROOT" \
  --learning "$FIX/learning_green.json" \
  --roam "$FIX/roam_r04_open.yaml" \
  --loop-item P1-INDEX-02)
echo "$OUT" | grep -q closure_scorecard=

python3 - "$ROOT" <<'PY'
import json, sys
from pathlib import Path
root = Path(sys.argv[1])
lat = json.loads((root / ".goalie/evidence/learning/closure_scorecard_latest.json").read_text())
doc = json.loads(Path(lat["path"]).read_text())
assert doc["schema"] == "cls.closure_scorecard.v1"
assert "inbox" in doc and "closure_pct" in doc
assert 0 <= doc["fa_free_overall_pct"] <= 100
assert doc["closure_pct"]["billing_perceive"] == 100
assert doc["closure_pct"]["edge_cog_roam"] == 0
assert doc["inbox"]["untracked_critical_hash"] == 0
assert "R04" in doc.get("roam_open_ids", [])
print("PASS fixture R04 open edge=0 billing=100")
PY

python3 - "$ROOT" "$SCORECARD" <<'PY'
import json, subprocess, sys
from pathlib import Path
root = Path(sys.argv[1])
scorecard = sys.argv[2]
subprocess.check_call(["python3", scorecard, "--root", str(root)], env={**__import__("os").environ, "REPO_ROOT": str(root)})
lat = json.loads((root / ".goalie/evidence/learning/closure_scorecard_latest.json").read_text())
doc = json.loads(Path(lat["path"]).read_text())
staged = doc["inbox"]["staged_paths_hash"]
proc = subprocess.run(
    ["git", "-C", str(root), "diff", "--cached", "--name-only"],
    capture_output=True, text=True,
)
expected = len([ln for ln in proc.stdout.splitlines() if ln.strip()])
assert staged == expected, f"staged {staged} != git {expected}"
print(f"PASS staged_paths_hash={staged}")
PY

echo "PASS wsjf_closure_scorecard"
