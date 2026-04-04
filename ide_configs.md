# Agentic Max-Scope Configuration Guide

Setup the "Master Max-Scope System Prompt" in your editor for Gemma 4 / Qwen3.5.

## Claude Code — upgrade reconciliation

After upgrading the [Claude Code CLI or plugins](https://github.com/anthropics/claude-code/releases), diff your local hook and MCP settings against release notes (breaking paths, env vars, default plugin locations). Re-run `TRUST_GIT=/usr/bin/git bash scripts/validate-foundation.sh --trust-path` before claiming PI Sync readiness. Project truth for merge policy stays in `.goalie/go_no_go_ledger.md`.

#### **Continue.dev** (VS Code + Cursor + Windsurf Editor — universal layer)
1. Open Continue sidebar (`Cmd/Ctrl + L`).
2. Click the gear → `config.json` (or `~/.continue/config.json`).
3. Paste this into models array:

```json
{
  "title": "Gemma 4 / Qwen3.5 Max-Scope",
  "provider": "ollama",
  "model": "gemma4:26b",
  "systemMessage": "You are an expert, autonomous, agentic AI coding partner operating at MAXIMUM WORKSPACE SCOPE.\n\n[PASTE AGENTS.md CORE DIRECTIVES]",
  "roles": ["chat", "edit", "apply"],
  "context": [
    { "provider": "codebase" },
    { "provider": "folder" },
    { "provider": "docs" },
    { "provider": "diff" },
    { "provider": "terminal" },
    { "provider": "problems" }
  ]
}
```

#### **Zed IDE**
1. Open Agent panel → Models → Configure (or `Cmd/Ctrl + ,` → search “language_models”).
2. Add/edit in `settings.json`:

```json
"language_models": {
  "ollama": {
    "api_url": "http://localhost:11434",
    "context_window": 131072,
    "available_models": [
      {
        "name": "gemma4:26b",
        "display_name": "Gemma 4 Max-Scope",
        "max_tokens": 131072,
        "supports_tools": true
      }
    ]
  }
}
```

#### **Windsurf Editor** (Cascade AI)
1. Open Windsurf Settings (`Cmd/Ctrl + Shift + P` → “Windsurf Settings”).
2. Enable “Cascade Gitignore Access”.
3. Create/edit `~/.codeium/windsurf/memories/global_rules.md` (global) **and** workspace-level `rules.md` with AGENTS.md content.

#### **Augment Intent** (Context Engine MCP)
1. In Augment → Settings → Context Engine / MCP Providers.
2. Add local provider pointing to `http://localhost:11434` (Ollama) or LM Studio.
3. In the MCP config (or `~/.config/llm-context/config.toml`), enable full codebase indexing and add AGENTS.md.

#### **Warp Terminal** (bonus)
Just run `ollama run gemma4:26b` and paste the Master Prompt as the first message.
