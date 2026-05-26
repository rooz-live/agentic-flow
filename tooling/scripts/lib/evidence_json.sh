#!/usr/bin/env bash
# tooling/scripts/lib/evidence_json.sh
# Shared library for structured evidence artifact I/O.
#
# Usage (source this file):
#   source "$(dirname "${BASH_SOURCE[0]}")/lib/evidence_json.sh"
#
# Functions exposed:
#   write_evidence_artifact  <artifact_type> <gate_name> <status> [extra_json_kv_pairs...]
#   perceive_evidence        <artifact_type> [--latest | --run-id <id>]
#
# Exit codes:
#   0 — success / artifact found
#   1 — write error / artifact not found
#   2 — artifact found but status == FAIL

set -euo pipefail

_EVIDENCE_ROOT="${EVIDENCE_ROOT:-${PROJECT_ROOT:-.}/.goalie/evidence}"

# --------------------------------------------------------------------------- #
# write_evidence_artifact
#
# Writes a JSON evidence artifact to:
#   $EVIDENCE_ROOT/<artifact_type>/gate_<run_id>.json
#
# Args:
#   $1  artifact_type  — directory name under .goalie/evidence/ (e.g. "domain-probes")
#   $2  gate_name      — human label for this gate (e.g. "dod-pre-task")
#   $3  status         — PASS | FAIL | WARN | SKIP
#   $@  remaining      — optional extra key=value pairs (must be valid JSON values)
#
# Example:
#   write_evidence_artifact "pre-task" "index-gate" "PASS" \
#       '"tracked_src":42' '"tracked_tests":28'
# --------------------------------------------------------------------------- #
write_evidence_artifact() {
    local artifact_type="${1:?artifact_type required}"
    local gate_name="${2:?gate_name required}"
    local status="${3:?status required (PASS|FAIL|WARN|SKIP)}"
    shift 3

    local run_id
    run_id="$(date -u +%Y%m%dT%H%M%SZ)"
    local out_dir="${_EVIDENCE_ROOT}/${artifact_type}"
    local out_file="${out_dir}/gate_${run_id}.json"
    mkdir -p "$out_dir"

    # Build optional extra fields
    local extras=""
    for kv in "$@"; do
        extras+=",${kv}"
    done

    local git_head=""
    git_head="$(git -C "${PROJECT_ROOT:-.}" rev-parse --short HEAD 2>/dev/null || echo "unknown")"

    python3 - <<PY
import json, sys
payload = {
    "run_id":      "${run_id}",
    "gate_name":   "${gate_name}",
    "artifact_type": "${artifact_type}",
    "status":      "${status}",
    "git_head":    "${git_head}",
    "timestamp_utc": "${run_id}",
    "extras":      {}
}
extras_raw = """${extras}"""
if extras_raw.strip().strip(","):
    for item in extras_raw.strip().strip(",").split(","):
        if ":" in item:
            k, v = item.split(":", 1)
            try:
                payload["extras"][k.strip().strip('"')] = json.loads(v.strip())
            except Exception:
                payload["extras"][k.strip().strip('"')] = v.strip().strip('"')
with open("${out_file}", "w") as f:
    json.dump(payload, f, indent=2)
print(f"evidence_written={sys.argv[0] if False else '${out_file}'}")
PY
    echo "evidence_written=${out_file}"

    # Also write/update a symlink to latest
    local latest_link="${out_dir}/latest.json"
    ln -sf "$(basename "$out_file")" "$latest_link" 2>/dev/null || cp "$out_file" "$latest_link"

    [[ "$status" == "FAIL" ]] && return 2
    return 0
}

# --------------------------------------------------------------------------- #
# perceive_evidence
#
# Reads and prints the latest (or specific) evidence artifact.
# Returns exit 2 if the artifact status == FAIL, 1 if not found, 0 if PASS/WARN/SKIP.
#
# Args:
#   $1  artifact_type
#   $2  --latest (default) | --run-id <id>
# --------------------------------------------------------------------------- #
perceive_evidence() {
    local artifact_type="${1:?artifact_type required}"
    local mode="${2:---latest}"
    local target_file=""

    local out_dir="${_EVIDENCE_ROOT}/${artifact_type}"

    if [[ "$mode" == "--latest" ]]; then
        target_file="${out_dir}/latest.json"
    elif [[ "$mode" == "--run-id" ]]; then
        local run_id="${3:?run_id required with --run-id}"
        target_file="${out_dir}/gate_${run_id}.json"
    else
        target_file="${out_dir}/latest.json"
    fi

    if [[ ! -f "$target_file" ]]; then
        echo "PERCEIVE_MISS artifact_type=${artifact_type} path=${target_file}" >&2
        return 1
    fi

    cat "$target_file"
    local status
    status="$(python3 -c "import json,sys; d=json.load(open('${target_file}')); print(d.get('status','UNKNOWN'))")"
    echo ""
    echo "perceived_status=${status}"
    [[ "$status" == "FAIL" ]] && return 2
    return 0
}
