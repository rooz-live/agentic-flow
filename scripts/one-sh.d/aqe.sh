#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

if [[ -z "${AQE_MODEL:-}" ]]; then
    eval "$(python3 "$ROOT_DIR/scripts/cicd/lib/llm_model_registry.py" --export-shell --tier "${AQE_LLM_TIER:-standard}" 2>/dev/null)" || true
fi

# Default to the repo root so AQE doesn't silently bind to a stale path.
export AQE_PROJECT_ROOT="${AQE_PROJECT_ROOT:-$ROOT_DIR}"

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" || "${1:-}" == "help" ]]; then
    cat <<'HELP'
Usage: ./scripts/one.sh aqe [init|<aqe-cmd>] [args...]

  init          Initialize AQE fleet and spawn default agents
  status        Show AQE fleet status
  <aqe-cmd>     Any other agentic-qe command (test, coverage, quality, ...)
HELP
    exit 0
fi

CMD="${1:-status}"

if [[ "$CMD" == "init" ]]; then
    shift
    echo "--> Initializing AQE fleet..."
    npx --yes agentic-qe@3.11.3 fleet init \
        --topology hierarchical-mesh \
        --max-agents "${AQE_MAX_AGENTS:-15}" \
        --domains "${AQE_DOMAINS:-all}" \
        --memory "${AQE_MEMORY_BACKEND:-hybrid}" \
        --skip-patterns \
        --skip-code-scan \
        "$@"
    echo "--> Spawning default AQE agents..."
    npx --yes agentic-qe@3.11.3 fleet spawn \
        --domains "${AQE_DEFAULT_DOMAINS:-test-generation,coverage-analysis,quality-assessment}" \
        --count "${AQE_SPAWN_COUNT:-1}"
    echo "--> AQE fleet ready."
    exit 0
fi

exec npx --yes agentic-qe@3.11.3 "$@"
