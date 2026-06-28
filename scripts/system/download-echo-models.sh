#!/usr/bin/env bash
# Idempotent download of manifest GGUFs to Echo 13 + Ollama bind (zero re-download).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MANIFEST="${ECHO_MODEL_MANIFEST:-$REPO_ROOT/config/cicd/echo_model_manifest.yaml}"
PATHS_FILE="${LLM_PATHS_FILE:-$REPO_ROOT/config/local/llm-paths.env}"
[[ -f "$PATHS_FILE" ]] && source "$PATHS_FILE"

export LM_STUDIO_DIR="${LM_STUDIO_DIR:-/Volumes/Echo 13 SSD/LLM-Models/lmstudio}"
export OLLAMA_MODELS="${OLLAMA_MODELS:-/Volumes/Echo 13 SSD/LLM-Models/ollama}"
export HF_HOME="${HF_HOME:-/Volumes/Echo 13 SSD/LLM-Models/huggingface}"
export CENTRAL_MODELS_DIR="${CENTRAL_MODELS_DIR:-$HOME/.local/share/universal-models}"

die() { echo "download-echo-models: $*" >&2; exit 1; }
[[ -f "$MANIFEST" ]] || die "missing manifest: $MANIFEST"
[[ -d "/Volumes/Echo 13 SSD" ]] || die "Echo 13 SSD not mounted"

python3 -c "import huggingface_hub" 2>/dev/null || pip3 install huggingface_hub -q --break-system-packages

mkdir -p "$LM_STUDIO_DIR" "$OLLAMA_MODELS" "$HF_HOME" "$CENTRAL_MODELS_DIR"

echo "=== Echo model download (manifest-driven) ==="
python3 <<PY
import os, sys, yaml
from pathlib import Path
from huggingface_hub import hf_hub_download

repo_root = Path("$REPO_ROOT")
manifest = yaml.safe_load(Path("$MANIFEST").read_text(encoding="utf-8"))
lm = Path(os.environ["LM_STUDIO_DIR"])
results = []
for item in manifest.get("downloads", []):
    dest = lm / item["local_subdir"]
    dest.mkdir(parents=True, exist_ok=True)
    target = dest / item["filename"]
    if target.is_file() and target.stat().st_size > 1_000_000:
        print(f"[skip] {item['filename']} ({target.stat().st_size // 1_000_000}MB)")
        results.append(str(target))
        continue
    print(f"[fetch] {item['repo_id']}/{item['filename']} (~{item.get('size_gb')}GB)")
    path = hf_hub_download(
        repo_id=item["repo_id"],
        filename=item["filename"],
        local_dir=str(dest),
        local_dir_use_symlinks=False,
    )
    print(f"[done] {path}")
    results.append(path)
print("DOWNLOAD_OK", len(results))
PY

if ! pgrep -f "ollama serve" >/dev/null 2>&1; then
  echo "[ollama] starting serve"
  nohup env OLLAMA_MODELS="$OLLAMA_MODELS" ollama serve >> /tmp/ollama-echo13.log 2>&1 &
  sleep 3
fi

export LM_STUDIO_DIR OLLAMA_MODELS CENTRAL_MODELS_DIR
bash "$REPO_ROOT/scripts/system/sync-universal-models.sh"

export MANIFEST
python3 <<'PY'
import os, subprocess, yaml
from pathlib import Path
manifest = yaml.safe_load(Path(os.environ["MANIFEST"]).read_text(encoding="utf-8"))
def has(name):
    r = subprocess.run(["ollama", "list"], capture_output=True, text=True)
    return name in r.stdout
for m in manifest.get("models", []):
    primary = m.get("ollama_name")
    if not primary or m.get("bundled"):
        continue
    if has(primary):
        print(f"[bind] present: {primary}")
    for alias in m.get("aliases", []):
        if alias != primary and has(primary) and not has(alias):
            subprocess.run(["ollama", "cp", primary, alias], check=False)
            print(f"[alias] {primary} -> {alias}")
PY

echo "=== download-echo-models complete ==="
