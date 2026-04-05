# 🔄 Local CLI / Global Binaries Backout Procedures

> [!CAUTION]
> This runbook is utilized **strictly** if the local LLM routing (`OPENCODE_DISABLE_DEFAULT_PLUGINS=true opencode`) acts catastrophically or exhausts resources abruptly, requiring a return to native Anthropic inference mapping or prior execution baselines.

## 1. Purge OpenCode and Local Wrappers
To completely remove `opencode-ai` CLI mapping globally:

```bash
# Terminate global bin installation limiters
npm uninstall -g opencode-ai

# Purge Anthropic Auth bypass plugins local definitions
rm -rf ~/.config/opencode/
rm -rf /Users/shahroozbhopti/Documents/code/projects/investing/agentic-flow/.integrations/opencode-plugins/
```

## 2. Unload Ollama Model Payloads
Reclaim MacBook resource footprints (RAM / Storage):
```bash
ollama rm qwen2.5-coder
ollama rm deepseek-coder:1.3b
```

## 3. Disconnect Agentic QE Persistence Database
If `.agentic-qe/memory.db` becomes too bloated (~100k+ traces) and causes file-watch lockups natively:
```bash
npx agentic-qe reset
# Or physically purge the file mapping:
rm -rf .agentic-qe/memory.db
```

These steps ensure a complete reversal back to the **Phase 117** state seamlessly mapped naturally.
