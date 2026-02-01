# WSJF Quick Reference Card

## 🚀 One-Line Setup
```bash
source scripts/ay-aliases.sh && wsjf swarm init && wsjf swarm bind agent-001 coder
```

## Essential Commands

### Initialization
```bash
source scripts/ay-aliases.sh        # Load commands (do this first!)
wsjf swarm init                     # Initialize swarm with defaults
wsjf swarm init hierarchical-mesh 15 specialized  # With options
```

### Agent Management
```bash
wsjf swarm bind <id> <type> [name]  # Bind agent to swarm
wsjf swarm bind agent-001 coder     # Example
wsjf swarm bind agent-002 tester "QA Lead"  # With name
```

### Status & Monitoring
```bash
wsjf status                         # All system status
wsjf swarm status                   # Swarm status only
wsjf swarm health                   # Health check
ay-swarm                            # Quick swarm status
ay-health                           # Quick health check
```

### Model Routing
```bash
wsjf mcp route "<task>"             # Route task to optimal model
wsjf mcp stats                      # View MCP statistics
ay-mcp                              # Quick MCP stats
```

### TUI Monitor
```bash
wsjf monitor                        # Start interactive monitor
ay-monitor                          # Quick start monitor
```

**TUI Controls**:
- `q` - Quit
- `h` - Health check
- `p` - Pause/Resume
- `r` - Refresh
- `s` - Scale info
- `i` - Info display

### Help
```bash
wsjf help                           # Show all commands
wsjf help swarm                     # Help for specific command
```

## Quick Aliases

Instead of `wsjf <category> <command>`, use:

| Alias | Command | Description |
|-------|---------|-------------|
| `ay-swarm` | `wsjf swarm status` | Swarm status |
| `ay-monitor` | `wsjf monitor` | TUI monitor |
| `ay-health` | `wsjf swarm health` | Health check |
| `ay-mcp` | `wsjf mcp stats` | MCP statistics |
| `ay-roam` | `wsjf roam status` | ROAM tracker |
| `ay-status` | `wsjf status` | All status |

## Common Workflows

### Setup New Swarm
```bash
source scripts/ay-aliases.sh
wsjf swarm init hierarchical-mesh 10 specialized
wsjf swarm bind agent-001 coder "Lead Dev"
wsjf swarm bind agent-002 tester "QA Engineer"
wsjf swarm bind agent-003 reviewer "Senior Reviewer"
wsjf status
```

### Check System Health
```bash
ay-health                           # Quick health
wsjf swarm health                   # Detailed health
ay-status                           # All metrics
```

### Test Model Routing
```bash
wsjf mcp route "fix login bug"                    # → haiku (98.7% savings)
wsjf mcp route "design secure microservices"      # → sonnet (80% savings)
wsjf mcp route "refactor authentication module"   # → haiku
```

### Monitor Live
```bash
ay-monitor                          # Start TUI
# Press 'p' to pause, 'h' for health, 'q' to quit
```

## State Files

| File | Purpose |
|------|---------|
| `.swarm/state.json` | Swarm state (agents, tasks, status) |
| `.swarm/mcp/registry.json` | MCP registry state |
| `ROAM.md` | Risk/opportunity tracker |

## Model Routing

| Model | Cost/1k | Latency | Use Case | Keywords |
|-------|---------|---------|----------|----------|
| agent-booster | $0 | <1ms | Simple transforms | - |
| haiku | $0.0002 | 500ms | Bug fixes, refactoring | bug, fix, refactor |
| sonnet | $0.003 | 2s | Complex reasoning | architecture, security |
| opus | $0.015 | 5s | Expert analysis | critical, expert, analysis |

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Command not found | Run `source scripts/ay-aliases.sh` |
| No agents showing | `wsjf swarm init` then `wsjf swarm bind ...` |
| State corrupted | `rm .swarm/state.json && wsjf swarm init` |
| TUI not working | `npm install blessed blessed-contrib` |

## Success Indicators

✅ Good System Health:
- Agents: 3+ idle (ready for work)
- Health: 100% for all agents
- Tasks: 0 pending (queue clear)
- ROAM: <3 days staleness, ≥0.80 stability, ≥95% OK rate

⚠️ Needs Attention:
- Agents: 0 idle (all busy or none bound)
- Health: <70% for any agent
- Tasks: 5+ pending (bottleneck)
- ROAM: ≥3 days staleness, <0.80 stability

## Examples

### Initialize and bind 5 agents
```bash
source scripts/ay-aliases.sh
wsjf swarm init
for i in {1..5}; do wsjf swarm bind "agent-00$i" coder "Coder $i"; done
wsjf status
```

### Monitor with custom refresh
```bash
wsjf monitor 2000  # 2-second refresh
```

### Route different task types
```bash
wsjf mcp route "add logging statements"           # → haiku
wsjf mcp route "implement OAuth2 security"        # → sonnet
wsjf mcp route "quick typo fix"                   # → haiku
wsjf mcp route "design distributed cache layer"   # → sonnet/opus
```

---

**Docs**: `docs/WSJF-IMPLEMENTATION.md`  
**Version**: 1.0.0
