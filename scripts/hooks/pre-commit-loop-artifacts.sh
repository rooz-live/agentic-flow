#!/usr/bin/env bash
# WSJF-6: block loop artifact noise unless LOOP_ARTIFACT_OK=1.
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

if [[ "${LOOP_ARTIFACT_OK:-0}" == "1" ]]; then
  echo "pre-commit: LOOP_ARTIFACT_OK=1 — allowing staged .goalie/ and reports/"
  exit 0
fi

mapfile -t STAGED < <(git diff --cached --name-only --diff-filter=ACM || true)
BLOCKED=()
for f in "${STAGED[@]}"; do
  case "$f" in
    reports/*) BLOCKED+=("$f") ;;
    .goalie/scorecards/current.json|.goalie/scorecards/required.json) ;;
    .goalie/*) BLOCKED+=("$f") ;;
  esac
done

if [[ ${#BLOCKED[@]} -gt 0 ]]; then
  echo "pre-commit: FAIL loop artifacts staged (.goalie/, reports/)." >&2
  echo "Set LOOP_ARTIFACT_OK=1 only for intentional evidence commits." >&2
  printf '%s\n' "${BLOCKED[@]}" >&2
  exit 1
fi
