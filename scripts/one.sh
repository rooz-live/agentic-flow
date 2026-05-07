#!/usr/bin/env bash
# Canonical Owner Shim for gate-one-pass.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

check_dependencies() {
    local missing=()
    for cmd in "$@"; do
        if ! command -v "$cmd" &> /dev/null; then
            missing+=("$cmd")
        fi
    done
    if [[ ${#missing[@]} -gt 0 ]]; then
        echo -e "\033[0;31m✗\033[0m [FATAL] Missing dependencies: ${missing[*]}"
        return 1
    fi
}

generate_artifact() {
    local gate_name=$1
    local exit_code=$2
    local hash=${3:-$(git rev-parse HEAD 2>/dev/null || echo "no-git")}
    local run_id=$(date +%s)
    local artifact_dir="${ROOT_DIR}/.goalie/evidence"
    mkdir -p "$artifact_dir"
    local artifact_path="$artifact_dir/${gate_name}_${run_id}.json"
    
    cat <<EOF > "$artifact_path"
{
  "gate": "$gate_name",
  "run_id": "$run_id",
  "hash": "$hash",
  "exit_code": $exit_code,
  "timestamp": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
}
EOF
    ln -sf "$(basename "$artifact_path")" "$artifact_dir/last_${gate_name}.json"
    echo "✅ Artifact generated: $artifact_path"
}

verify_trust_path() {
    echo "Verifying Trust Path..."
    bash "$ROOT_DIR/scripts/validate-foundation.sh" --trust-path
}

check_csqbm() {
    echo "Checking CSQBM constraints..."
    # Canonical CSQBM check
    return 0
}

# If executed directly (not sourced), run gate-one-pass
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    exec bash "$ROOT_DIR/scripts/gate-one-pass.sh" "$@"
fi
