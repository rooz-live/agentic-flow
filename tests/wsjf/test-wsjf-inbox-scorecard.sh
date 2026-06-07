#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export MAIL_STAB_SKIP_REMOTE=1
bash "$ROOT/scripts/mail/mail-stabilization-score.sh" >/dev/null
OUT=$(python3 "$ROOT/scripts/wsjf/wsjf_inbox_scorecard.py")
path=$(echo "$OUT" | sed -n 's/^wsjf_inbox_scorecard=//p')
[[ -f "$path" ]] || { echo FAIL missing scorecard; exit 1; }
python3 - "$path" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
assert d["schema"] == "cls.wsjf_inbox.v1"
assert "lanes" in d and "substrate_index" in d["lanes"]
sub = d["lanes"]["substrate_index"]
assert "paths_staged" in sub and "paths_cap" in sub and "pct_of_cap" in sub
assert "fa_free_closure_composite_pct" in d
assert "inbox_zero_target" in d
print("PASS wsjf_inbox_scorecard")
PY
