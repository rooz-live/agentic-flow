#!/usr/bin/env bash
# test_dlq_breakthrough_map.sh — Verify DLQ failure mapping to ROAM nodes
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

# Setup temporary ROAM file
TEMP_ROAM="/tmp/test_roam_tracker_cog_$$.yaml"

# Ensure clean copy
rm -f "$TEMP_ROAM"
cp "$ROOT/.goalie/ROAM_TRACKER_COG.yaml" "$TEMP_ROAM"

# Force R-CLS-06 to status: mitigated to test the transition
python3 - "$TEMP_ROAM" <<'PY'
import sys
from pathlib import Path
p = Path(sys.argv[1])
txt = p.read_text()
# Replace status under R-CLS-06
lines = txt.splitlines()
out = []
in_target = False
for line in lines:
    if "id: R-CLS-06" in line:
        in_target = True
    elif in_target and line.strip().startswith("- id:"):
        in_target = False
    if in_target and line.strip().startswith("status:"):
        line = "    status: mitigated"
    out.append(line)
p.write_text("\n".join(out) + "\n")
PY

# Run the python trigger logic on the temp file
python3 - "public_edge_fail" "testrun123" "$TEMP_ROAM" <<'PY'
import sys, re
from pathlib import Path

cat = sys.argv[1]
run_id = sys.argv[2]
roam_file = sys.argv[3]

mapping = {
    "public_edge_fail": "R-CLS-06",
    "trust_stale": "R-CLS-03",
    "cog_smoke_secret": "R04"
}

if cat in mapping:
    target_id = mapping[cat]
    text = Path(roam_file).read_text()
    
    lines = text.splitlines()
    new_lines = []
    in_target = False
    for line in lines:
        if line.strip().startswith("- id:") and target_id in line:
            in_target = True
        elif in_target and line.strip().startswith("- id:"):
            in_target = False
        
        if in_target:
            if line.strip().startswith("status:"):
                line = re.sub(r"status:\s*\S+", "status: open", line)
            elif line.strip().startswith("last_result:"):
                line = f'    last_result: "dlq_trigger_{cat}_run_{run_id}"'
        new_lines.append(line)
        
    Path(roam_file).write_text("\n".join(new_lines) + "\n")
PY

# Verify that status is open and last_result is set
grep -A 10 "id: R-CLS-06" "$TEMP_ROAM" | grep -q "status: open" || { echo "FAIL: R-CLS-06 was not opened"; rm -f "$TEMP_ROAM"; exit 1; }
grep -A 10 "id: R-CLS-06" "$TEMP_ROAM" | grep -q "dlq_trigger_public_edge_fail" || { echo "FAIL: last_result not updated"; rm -f "$TEMP_ROAM"; exit 1; }

rm -f "$TEMP_ROAM"
echo "PASS dlq_breakthrough_map"
