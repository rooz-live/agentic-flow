# Local LLM Model Setup

## Storage Architecture

All model data routes to the Echo 13 Thunderbolt SSD. Zero model storage on internal disk.

```
/Volumes/Echo 13 SSD/LLM-Models/
├── ollama/        # Ollama model blobs + manifests
├── lmstudio/      # LM Studio GGUF downloads
├── huggingface/   # HuggingFace Hub cache
└── codeium/       # IDE language server cache
```

### Path Configuration

| Tool | Mechanism | Target |
|------|-----------|--------|
| Ollama | `OLLAMA_MODELS` env var (bashrc + zshrc) | `/Volumes/Echo 13 SSD/LLM-Models/ollama` |
| LM Studio | `downloadsFolder` in `~/.lmstudio/settings.json` | `/Volumes/Echo 13 SSD/LLM-Models/lmstudio` |
| HuggingFace | `HF_HOME` env var + `~/.cache/huggingface` symlink | `/Volumes/Echo 13 SSD/LLM-Models/huggingface` |
| Transformers | `TRANSFORMERS_CACHE` env var | `/Volumes/Echo 13 SSD/LLM-Models/huggingface/hub` |
| Codeium | `~/.codeium` symlink | `/Volumes/Echo 13 SSD/LLM-Models/codeium` |

### Why External?

- Internal SSD: 2 TB, 94% full — can't spare 50-100 GB for models
- Echo 13: 4 TB Thunderbolt, 326 GB free in LLM-Models partition
- Models load into RAM for inference — disk speed only affects initial load (~3-5s extra vs internal NVMe)
- No sync needed — each tool reads from exactly one location

## Model Inventory

| Model | Size | Provider | Purpose |
|-------|------|----------|---------|
| gemma3:12b | 7.6 GB | Ollama | Primary coding assistant (Continue chat) |
| gemma3:4b | 3.1 GB | Ollama | Lightweight/fast tasks |
| phi4-mini | 2.3 GB | Ollama | Tab autocomplete (Continue) |
| nomic-embed-text | 0.3 GB | Ollama | Code embeddings and search |
| **Total** | **13 GB** | | |

## IDE Integration

### Continue Extension (VS Code + Cursor)

Config: `~/.continue/config.json`

**Chat models** (select in sidebar with `Cmd+L`):
- Gemma 3 12B (Ollama) — best quality, slower
- Phi-4 Mini (Ollama) — fast, good for simple questions
- LM Studio (Active Model) — whatever's loaded in LM Studio

**Tab autocomplete:** Phi-4 Mini via Ollama (automatic)

**Embeddings:** nomic-embed-text via Ollama (for @codebase search)

### LM Studio

- API server on `http://localhost:1234` (OpenAI-compatible)
- Any app can use it with `OPENAI_BASE_URL=http://localhost:1234/v1`
- Status: `lms status`

### Ollama

- API server on `http://localhost:11434`
- Binary: `/usr/local/bin/ollama`
- Start: `OLLAMA_MODELS="/Volumes/Echo 13 SSD/LLM-Models/ollama" ollama serve`

## Common Operations

### Pull a new model
```bash
ollama pull gemma3:27b       # downloads to Echo 13 automatically
ollama pull deepseek-r2      # when available
ollama pull llama4           # when available
```

### List models
```bash
ollama list
```

### Run a model
```bash
ollama run gemma3:12b "Explain this error: ..."
```

### Remove a model
```bash
ollama rm gemma3:4b
```

### Check disk usage
```bash
du -sh "/Volumes/Echo 13 SSD/LLM-Models/"*/
```

### Verify storage configuration (14-check script)
```bash
# Symlinks
ls -la ~/.codeium ~/.cache/huggingface

# Env vars
grep -E 'OLLAMA|HF_HOME|TRANSFORMERS' ~/.bashrc

# LM Studio
python3 -c "import json; print(json.load(open('$HOME/.lmstudio/settings.json'))['downloadsFolder'])"

# Writability
touch ~/.codeium/.test && rm ~/.codeium/.test && echo "writable"
```

## ROAM Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Echo 13 disconnected while IDE running | Low | Medium — autocomplete stops | Continue falls back gracefully; reconnect drive |
| Echo 13 full | Low (326 GB free) | Medium — can't pull new models | `du -sh` check before large pulls |
| Ollama not running when IDE opens | Medium | Low — Continue shows error | Start with `ollama serve` or add to Login Items |
| Model corrupted during download | Low | Low — re-pull | `ollama rm MODEL && ollama pull MODEL` |

## Migration to OWC Express 4M2 Ultra

When the OWC arrives:
```bash
# 1. rsync everything
rsync -ah "/Volumes/Echo 13 SSD/LLM-Models/" "/Volumes/OWC Express/LLM-Models/"

# 2. Update 3 paths
sed -i '' 's|Echo 13 SSD/LLM-Models|OWC Express/LLM-Models|g' ~/.bashrc ~/.zshrc

# 3. Update LM Studio
python3 -c "
import json
with open('$HOME/.lmstudio/settings.json','r+') as f:
    d=json.load(f); d['downloadsFolder']=d['downloadsFolder'].replace('Echo 13 SSD','OWC Express')
    f.seek(0); json.dump(d,f,indent=2); f.truncate()
"

# 4. Re-symlink
ln -sf "/Volumes/OWC Express/LLM-Models/codeium" ~/.codeium
ln -sf "/Volumes/OWC Express/LLM-Models/huggingface" ~/.cache/huggingface
```
