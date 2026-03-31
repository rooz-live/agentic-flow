#!/usr/bin/env bash
# =============================================================================
# Infrastructure Health Trust Gate (PI Sync Mandatory Gate)
# =============================================================================
# Purpose: Validates that all git tracking surfaces, submodule layers, and 
# superproject bounds are categorically healthy before allowing CSQBM PI Syncs.

set -euo pipefail

log_info() { echo -e "\e[34m[INFO]\e[0m $1"; }
log_warning() { echo -e "\e[33m[WARNING]\e[0m $1"; }
log_error() { echo -e "\e[31m[ERROR]\e[0m $1"; }
log_success() { echo -e "\e[32m[SUCCESS]\e[0m $1"; }

log_info "Enforcing Infrastructure Trust Gate for PI Sync..."

TRUST_GIT="${TRUST_GIT:-/usr/bin/git}"

if ! $TRUST_GIT rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    log_error "Process executing externally to a git repository."
    exit 1
fi

HEAD_SHA=$($TRUST_GIT rev-parse HEAD)
log_info "Superproject constrained securely. Absolute HEAD bounds: $HEAD_SHA"

log_info "Printing fundamental structural mapping (git status):"
$TRUST_GIT status --short -uno 2>&1 | sed 's/^/  /' || true

SUBMODULE_OUTPUT=$($TRUST_GIT submodule status --recursive 2>&1 || true)
if [[ -z "$SUBMODULE_OUTPUT" ]]; then
    log_info "No tracking submodules engaged via bounds. Parity resolved natively."
    exit 0
fi

log_info "Tracing native submodule recursive health boundaries:"
echo "$SUBMODULE_OUTPUT" | sed 's/^/  /'

exit_code=0
while IFS= read -r line; do
    if [[ -z "$line" ]]; then continue; fi
    prefix=${line:0:1}
    repo_name=$(echo "$line" | awk '{print $2}')
    
    case "$prefix" in
        "-")
            log_error "Submodule $repo_name is uninitialized (missing parity)."
            exit_code=1
            ;;
        "+")
            log_error "Submodule $repo_name is modified (structural drift). NO-GO."
            exit_code=1
            ;;
        "U")
            log_error "Submodule $repo_name has active merge conflicts blocking PI Sync."
            exit_code=1
            ;;
        " ")
            log_success "Submodule $repo_name is perfectly synchronized."
            ;;
        *)
            log_error "Unknown indicator '$prefix' found on submodule $repo_name."
            exit_code=1
            ;;
    esac
done <<< "$SUBMODULE_OUTPUT"

if [ $exit_code -ne 0 ]; then
    log_error "INFRASTRUCTURE HEALTH NO-GO. Submodule objects corrupted or detached."
    exit 1
fi

log_success "INFRASTRUCTURE HEALTH GO. Parity mapped safely."
exit 0
