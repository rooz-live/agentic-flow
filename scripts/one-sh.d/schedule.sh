#!/usr/bin/env bash
# schedule.sh — /schedule cadence runner dispatch
set -euo pipefail
ROOT_DIR="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" || "${1:-}" == "help" ]]; then
    cat <<'HELP'
Usage: ./scripts/one.sh schedule|wsjf [args...]

  Updates the multi-lane Now/Near/Next/Later (LNNNL) ledger from
  wsjf_now_items, ROAM risks, and upstream evidence. With no arguments
  it performs a full WSJF refresh and writes .goalie/LNNNL.yaml.
HELP
    exit 0
fi

echo "--> WSJF Schedule update..."
# NOTE: no `exec` here — `exec` made the WSJF-evidence step below DEAD CODE (it never
# ran), and the old `$ROOT` was undefined (should be `$ROOT_DIR`), so the line was pure
# theater: a broken evidence step silently swallowed by `|| true`. Now the LNNNL update
# runs as a child (set -e still propagates its failure) and the evidence step actually runs.
python3 "$ROOT_DIR/scripts/cicd/update_lnnnl.py" "$@"

# WSJF exec evidence — named skip (AF_SKIP_WSJF_EXEC). NEVER blanket `|| true`: the exit is
# captured and warned so a broken exec_wsjf step cannot stay hidden. Advisory only (it
# writes wsjf_ruflo_latest.json), so a non-zero rc warns rather than aborting the schedule.
if [[ "${AF_SKIP_WSJF_EXEC:-0}" == "1" ]]; then
    echo "SKIP exec_wsjf_ruflo (AF_SKIP_WSJF_EXEC=1)"
else
    if ! bash "$ROOT_DIR/scripts/cicd/exec_wsjf_ruflo.sh" >/dev/null 2>&1; then
        _rc=$?
        echo "WARN: exec_wsjf_ruflo.sh failed (rc=$_rc) — WSJF exec evidence not recorded" >&2
    fi
fi
