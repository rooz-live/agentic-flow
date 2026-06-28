#!/usr/bin/env bash
# Source from cycle_tick / shell: export local LLM env to cut OpenRouter token spend.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PATHS_FILE="${LLM_PATHS_FILE:-$REPO_ROOT/config/local/llm-paths.env}"
MANIFEST="${ECHO_MODEL_MANIFEST:-$REPO_ROOT/config/cicd/echo_model_manifest.yaml}"
[[ -f "$PATHS_FILE" ]] && source "$PATHS_FILE"

export LM_STUDIO_DIR="${LM_STUDIO_DIR:-/Volumes/Echo 13 SSD/LLM-Models/lmstudio}"
export OLLAMA_MODELS="${OLLAMA_MODELS:-/Volumes/Echo 13 SSD/LLM-Models/ollama}"
export HF_HOME="${HF_HOME:-/Volumes/Echo 13 SSD/LLM-Models/huggingface}"
export CENTRAL_MODELS_DIR="${CENTRAL_MODELS_DIR:-$HOME/.local/share/universal-models}"
export LOCAL_LLM_ENDPOINT="${LOCAL_LLM_ENDPOINT:-http://127.0.0.1:11434}"
export OPENAI_API_BASE="${OPENAI_API_BASE:-$LOCAL_LLM_ENDPOINT/v1}"
export OPENAI_API_KEY="${OPENAI_API_KEY:-ollama}"

# Not mounted — leave cloud defaults
if [[ ! -d "/Volumes/Echo 13 SSD" ]]; then
  [[ "${1:-}" == "quiet" ]] && return 0 2>/dev/null || exit 0
fi

if ! pgrep -f "ollama serve" >/dev/null 2>&1; then
  nohup env OLLAMA_MODELS="$OLLAMA_MODELS" ollama serve >> /tmp/ollama-echo13.log 2>&1 &
  sleep 2
fi

pick_model() {
  python3 <<PY
import subprocess, yaml
from pathlib import Path
manifest = yaml.safe_load(Path("$MANIFEST").read_text(encoding="utf-8")) if Path("$MANIFEST").is_file() else {"models":[]}
listed = subprocess.run(["ollama","list"], capture_output=True, text=True).stdout
names = set()
for line in listed.splitlines()[1:]:
    if not line.strip():
        continue
    n = line.split()[0]
    names.add(n)
    names.add(n.split(":")[0])
order = ["qwen3-scoped-aqe", "gemma4-compute", "gemma3-fallback"]
by_id = {m["id"]: m for m in manifest.get("models", [])}
for mid in order:
    m = by_id.get(mid, {})
    for name in [m.get("ollama_name")] + list(m.get("aliases", [])):
        if not name:
            continue
        if name in names or f"{name}:latest" in names:
            print(name)
            raise SystemExit(0)
print("gemma3:12b")
PY
}

ACTIVE="$(pick_model)"
export AQE_FREE_TIER="${AQE_FREE_TIER:-1}"
# Refresh each activation so stale cloud model names do not stick
if [[ -z "${AQE_FREE_TIER_MODEL_PIN:-}" ]]; then
  export AQE_FREE_TIER_MODEL="$ACTIVE"
else
  export AQE_FREE_TIER_MODEL="${AQE_FREE_TIER_MODEL:-$ACTIVE}"
fi
export ECHO_LLM_ACTIVE_MODEL="$ACTIVE"

[[ "${1:-}" == "quiet" ]] || echo "[echo-llm] AQE_FREE_TIER_MODEL=$AQE_FREE_TIER_MODEL"
