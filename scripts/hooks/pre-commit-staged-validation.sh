#!/usr/bin/env bash
# Pre-commit helper: shellcheck on staged *.sh; validate-email on staged *.eml (BHOPTI).
# @business-context WSJF: T0 protocol — block bad shell / bad .eml before commit
# @constraint DDD-VALIDATION: Fails closed on shellcheck errors; eml optional if validator missing
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

mapfile -t STAGED_SH < <(git diff --cached --name-only --diff-filter=ACM | grep '\.sh$' || true)
if [[ ${#STAGED_SH[@]} -gt 0 ]] && command -v shellcheck >/dev/null 2>&1; then
  for f in "${STAGED_SH[@]}"; do
    [[ -f "$f" ]] || continue
    shellcheck "$f" || exit 1
  done
fi

VALIDATOR="${BHOPTI_VALIDATE_EMAIL:-$HOME/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/_SYSTEM/_AUTOMATION/validate-email.sh}"
mapfile -t STAGED_EML < <(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(eml|email)$' || true)
if [[ ${#STAGED_EML[@]} -gt 0 ]]; then
  if [[ ! -x "$VALIDATOR" && ! -f "$VALIDATOR" ]]; then
    echo "WARN: validate-email not found at $VALIDATOR — skip .eml checks"
    exit 0
  fi
  for f in "${STAGED_EML[@]}"; do
    [[ -f "$f" ]] || continue
    bash "$VALIDATOR" "$f" || exit 1
  done
fi

# Protocol: hash-db + validation-core + runner tests when those files change
mapfile -t STAGED_ALL < <(git diff --cached --name-only --diff-filter=ACM || true)
run_validation_tests=false
for f in "${STAGED_ALL[@]}"; do
  case "$f" in
    tests/test-email-hash-db.sh|tests/test-validation-core.sh|tests/test-validation-runner.sh|\
    tests/fixtures/eml/*|_SYSTEM/_AUTOMATION/email-hash-db.sh|_SYSTEM/_AUTOMATION/validate-email.sh|\
    scripts/validation-core.sh|scripts/validators/file/validation-runner.sh)
      run_validation_tests=true
      ;;
  esac
done
if [[ "$run_validation_tests" == true ]]; then
  ./tests/test-email-hash-db.sh
  ./tests/test-validation-core.sh
  ./tests/test-validation-runner.sh
fi

exit 0
