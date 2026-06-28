#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" || "${1:-}" == "help" ]]; then
    cat <<'HELP'
Usage: ./scripts/one.sh ceremony [standup|review|retro|wsjf|roam|pi|pi-sync] [--commit-unit]

  Runs a bounded ceremony unit (standup, review, retro, wsjf refine,
  roam risks, pi prep/sync). Default is the full ceremony engine.
HELP
    exit 0
fi

ONLY=""
COMMIT=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        --commit-unit) COMMIT="--commit-unit"; shift ;;
        standup) ONLY="--only standup"; shift ;;
        review) ONLY="--only review"; shift ;;
        retro|retro_replenish) ONLY="--only retro_replenish"; shift ;;
        wsjf|wsjf_refine) ONLY="--only wsjf_refine"; shift ;;
        roam|roam_risks) ONLY="--only roam_risks"; shift ;;
        pi|pi_prep) ONLY="--only pi_prep"; shift ;;
        pi-sync|pi_sync) ONLY="--only pi_sync"; shift ;;
        *) break ;;
    esac
done

exec python3 "$ROOT_DIR/scripts/cicd/lib/ceremony_engine.py" ${ONLY} ${COMMIT} --json
