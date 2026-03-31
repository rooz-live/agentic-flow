#!/usr/bin/env bash
# @business-context WSJF: Disk growth evidence without destructive actions
# disk-evidence-readonly.sh — du summaries + cleanup decision matrix (dry)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPORT_DIR="$PROJECT_ROOT/reports/mover-ops"
OUT_JSON="$REPORT_DIR/disk-evidence-$(date -u +%Y%m%dT%H%M%SZ).json"

mkdir -p "$REPORT_DIR"

safe_du() {
  local dir="$1"
  if [[ -d "$dir" ]]; then
    du -sh "$dir" 2>/dev/null | awk '{print $1}' || echo "n/a"
  else
    echo "missing"
  fi
}

PRJ="$(safe_du "$PROJECT_ROOT")"
# Avoid full ~/Library/Caches du — can take many minutes; record intent only.
CACHES="not_scanned_run_du_sh_library_caches_manually_if_needed"
DOCKER_DF=""
if command -v docker >/dev/null 2>&1; then
  DOCKER_DF=$(docker system df 2>/dev/null | head -20 || true)
fi

python3 - "$PRJ" "$CACHES" "$DOCKER_DF" "$OUT_JSON" <<'PY'
import json, pathlib, sys
prj, caches, docker_df, out_path = sys.argv[1:5]

matrix = [
    {"class": "recreatable", "examples": ["docker layers", "npm/pip caches", "Library/Caches"], "action": "prune_compress", "reversibility": "full"},
    {"class": "recoverable", "examples": ["old reports under reports/", "session logs"], "action": "archive_then_prune", "reversibility": "restore_from_tar"},
    {"class": "irreplaceable", "examples": ["06-EMAILS legal tree", "ROAM evidence", "validator golden fixtures"], "action": "keep", "reversibility": "n/a"},
]

doc = {
    "contract": "disk_evidence_readonly",
    "version": "1.0",
    "du_agentic_flow": prj,
    "du_library_caches": caches,
    "docker_system_df_head": docker_df,
    "cleanup_decision_matrix": matrix,
    "note": "No destructive commands run. Use safe-cleanup-reversible.sh --dry-run for staged plan.",
}
pathlib.Path(out_path).parent.mkdir(parents=True, exist_ok=True)
pathlib.Path(out_path).write_text(json.dumps(doc, indent=2), encoding="utf-8")
print(json.dumps(doc, indent=2))
PY

echo "[disk-evidence-readonly] Wrote $OUT_JSON" >&2
