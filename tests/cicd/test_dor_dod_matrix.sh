#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
python3 - "$ROOT" <<'PY'
import sys, yaml
from pathlib import Path
root = Path(sys.argv[1])
rehydration = (root / "docs/agentics/CLS_REHYDRATION_PROMPT.md").read_text()
mail = yaml.safe_load((root / "deploy/mail/MAIL_WAVE_DOR_DOD.yaml").read_text())
inherits = mail.get("inherits") or {}
expected = {
    "dor": "AGENT_SLICE=publication bash code/tooling/scripts/agent_session_dor.sh",
    "cls_perceive": "bash code/tooling/scripts/dod-gate.sh --perceive",
    "trust": "TRUST_FORCE_RERUN=1 bash scripts/one.sh trust-path",
    "autopilot": "bash scripts/cicd/wave_autopilot.sh",
}
for key, cmd in expected.items():
    if inherits.get(key) != cmd:
        raise SystemExit(f"MAIL_WAVE inherits.{key} mismatch: {inherits.get(key)!r} != {cmd!r}")
for key, cmd in expected.items():
    if key == "autopilot":
        if "wave_autopilot.sh" not in rehydration:
            raise SystemExit("Gate matrix must reference wave_autopilot.sh")
    elif cmd not in rehydration:
        raise SystemExit(f"CLS_REHYDRATION_PROMPT missing: {cmd}")
if "Gate matrix" not in rehydration and "Canonical Gate Matrix" not in rehydration:
    raise SystemExit("CLS_REHYDRATION_PROMPT missing gate matrix section")
print("PASS dor_dod_matrix")
PY
