#!/usr/bin/env bash
# FA goal orchestrator — chains existing mail scripts; no duplicate DoD gates.
# Usage: bash scripts/mail/mail-wave-close.sh [--skip-dnssec] [--wave e|c|all]
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"
source "$REPO_ROOT/scripts/mail/_mail_infra_env.sh"
SKIP_DNSSEC=0
WAVE="all"
for arg in "$@"; do
  case "$arg" in
    --skip-dnssec) SKIP_DNSSEC=1 ;;
    --wave=*) WAVE="${arg#--wave=}" ;;
  esac
done

ec=0
run() { echo "=== $* ==="; "$@" || ec=$?; return 0; }

# Wave C
if [[ "$WAVE" == "all" || "$WAVE" == "c" ]]; then
  run bash scripts/mail/capture-comet-evidence.sh
fi

# Wave A
if [[ "$WAVE" == "all" || "$WAVE" == "a" ]]; then
  run bash scripts/mail/capture-mailstore-evidence.sh
fi

# DNSSEC → Wave E
if [[ "$WAVE" == "all" || "$WAVE" == "e" ]]; then
  if [[ "$SKIP_DNSSEC" -eq 0 ]]; then
    run bash scripts/mail/mail-dnssec-propagation-check.sh bhopti.com
    dnssec_ec=$ec
  else
    dnssec_ec=0
    echo "=== dnssec check skipped (--skip-dnssec) ==="
  fi
  if [[ "$dnssec_ec" -eq 0 || "$SKIP_DNSSEC" -eq 1 ]]; then
    run bash scripts/mail/mail-wave-e-verify.sh
  else
    echo "SKIP wave_e: DNSSEC not propagated (re-run after registrar TTL)"
    ec=2
  fi
fi

run bash scripts/mail/mail-stabilization-score.sh
run bash scripts/mail/mail-roam-audit.sh

# Trust spine only if repo has staged ROAM/evidence changes
if git diff --quiet .goalie/ROAM_TRACKER_COG.yaml 2>/dev/null; then
  echo "=== trust-path skipped (no ROAM diff) ==="
else
  run TRUST_FORCE_RERUN=1 bash scripts/one.sh trust-path
fi

echo "mail_wave_close_ec=$ec"
exit "$ec"
