# MCP Server Architecture & Troubleshooting Guide

## Executive Summary

**Problem**: MCP server not responding due to:
1. **Suspended processes** (T state) - main issue
2. **Port conflicts** (3000: Grafana, 3001: Docker, 3002: Node)
3. **No fallback mechanism** for offline operation

**Solution**: Hybrid architecture with local cache fallback

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│          Production Ceremony Scripts         │
│         (ay-prod-cycle.sh, etc.)            │
└──────────────────┬──────────────────────────┘
                   │
                   ├─ Check MCP Health
                   │
        ┌──────────┴──────────┐
        │                     │
    ✅ MCP Online        ❌ MCP Offline
        │                     │
        │                     ├─ Use Cache
        ▼                     ▼
   ┌─────────┐         ┌──────────┐
   │   MCP   │         │  .cache/ │
   │ Server  │◄────────│  skills/ │
   │ (3003)  │  Sync   │          │
   └─────────┘         └──────────┘
        │
        ├─ AgentDB API
        ├─ Skill Queries
        └─ Episode Storage
```

## Why MCP is Optional

### Local WASM Provides Full Functionality

**MCP Server Role**: 
- Real-time skill updates
- Cross-session learning
- Multi-agent coordination
- Neural pattern training

**Local Cache Role** (when MCP offline):
- Pre-exported skills (JSON)
- Static ceremony mappings
- Offline operation
- Zero latency

**Trade-offs**:
- ✅ **With MCP**: Dynamic learning, real-time updates
- ✅ **Without MCP**: Predictable, cached behavior
- ❌ **With MCP**: Requires running server, port management
- ❌ **Without MCP**: No cross-session learning

## Current Issues

### Issue #1: Suspended MCP Processes

```bash
# Diagnosis
ps aux | grep "agentdb.*mcp"
# Shows: T (stopped/suspended) state

# Why it happens:
# - Ctrl+Z pressed accidentally
# - Terminal job control suspended process
# - No restart mechanism

# Fix:
kill -CONT $(pgrep -f 'agentdb.*mcp')  # Resume
# OR
./scripts/mcp-setup.sh fix              # Kill and restart
```

### Issue #2: Port Conflicts

```
Port 3000: Grafana    (default MCP port)
Port 3001: Docker     (proposed alternate)
Port 3002: Node app   (another alternate)
```

**Solution**: Use port 3003+ or dynamic port allocation

### Issue #3: No Fallback Mechanism

**Before**: Script fails when MCP unavailable  
**After**: Graceful fallback to cache

## Quick Start

### 1. Initial Setup

```bash
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow

# Diagnose current state
./scripts/mcp-setup.sh diagnose

# Fix issues (kill suspended, start server)
./scripts/mcp-setup.sh fix

# Export skills to cache
./scripts/mcp-setup.sh cache

# Test integration
./scripts/mcp-setup.sh test
```

### 2. Start MCP Server (Optional)

```bash
# Option A: Use management script
./scripts/mcp-start.sh

# Option B: Manual start with custom port
MCP_PORT=3003 npx agentdb mcp start --verbose &

# Option C: Initialize claude-flow v3alpha
npx claude-flow@v3alpha init
./scripts/mcp-setup.sh init
```

### 3. Run Production Ceremonies

```bash
# Works with OR without MCP
./scripts/ay-prod-cycle.sh orchestrator standup advisory

# System automatically:
# - Checks MCP health
# - Falls back to cache if offline
# - Logs which mode is active
```

## File Structure

```
agentic-flow/
├── .cache/
│   └── skills/
│       ├── orchestrator.json    # Cached skills
│       ├── assessor.json
│       ├── innovator.json
│       ├── analyst.json
│       ├── seeker.json
│       ├── intuitive.json
│       └── _metadata.json       # Cache metadata
│
├── scripts/
│   ├── mcp-setup.sh             # Main management script
│   ├── mcp-start.sh             # Start MCP server
│   ├── mcp-health-check.sh      # Health check utility
│   ├── export-skills-cache.sh   # Export to cache
│   └── ay-prod-cycle.sh         # Updated with fallback
│
└── docs/
    └── MCP_ARCHITECTURE.md      # This file
```

## Environment Variables

```bash
# MCP Configuration
export MCP_PORT=3003              # Avoid port conflicts
export MCP_TIMEOUT=3              # Health check timeout (seconds)
export MCP_OFFLINE_MODE=1         # Force offline mode

# Cache Configuration
export CACHE_DIR=.cache/skills    # Cache location
export CACHE_MAX_AGE=86400        # Cache expiry (24 hours)
```

## Troubleshooting

### MCP Server Won't Start

```bash
# Check for suspended processes
ps aux | grep "agentdb.*mcp" | grep " T "

# Kill all MCP processes
pkill -9 -f "agentdb.*mcp"

# Check port conflicts
lsof -i :3000 :3001 :3002 :3003

# Start with different port
MCP_PORT=3004 ./scripts/mcp-start.sh
```

### Skills Not Loading

```bash
# Check cache
ls -la .cache/skills/

# Rebuild cache (requires MCP online)
./scripts/export-skills-cache.sh

# Test skill query
npx agentdb skill export --circle orchestrator
```

### Offline Mode Not Working

```bash
# Verify fallback logic
grep -A 10 "MCP_OFFLINE_MODE" scripts/ay-prod-cycle.sh

# Check cache files exist
cat .cache/skills/orchestrator.json | jq .

# Force offline mode
export MCP_OFFLINE_MODE=1
./scripts/ay-prod-cycle.sh orchestrator standup advisory
```

## Package Management

### Current Setup

```json
// package.json
{
  "dependencies": {
    // agentdb comes transitively from claude-flow
  },
  "devDependencies": {
    // Add if direct usage needed:
    "agentdb": "^1.6.1"
  }
}
```

### Upgrade Strategy

```bash
# Global upgrade
npm install -g agentdb@latest

# Local dev dependency
npm install --save-dev agentdb@latest

# Lock to exact version (no ^)
npm install --save-exact agentdb@1.6.1
```

## Contributing to Claude-Flow Upstream

If testing alpha features:

```bash
# Install v3alpha
npm install claude-flow@v3alpha

# Initialize experimental features
npx claude-flow@v3alpha init

# Run with new architecture
npx claude-flow@v3alpha mcp start --experimental
```

## When to Use MCP vs Cache

| Scenario | Use MCP | Use Cache |
|----------|---------|-----------|
| Development | ✅ Real-time updates | ❌ |
| Production | ✅ Cross-session learning | ❌ |
| CI/CD | ❌ | ✅ Predictable builds |
| Offline | ❌ | ✅ No dependencies |
| Demo | ❌ | ✅ No setup required |
| Training | ✅ Collect data | ❌ |

## Best Practices

1. **Always export cache after MCP changes**
   ```bash
   ./scripts/export-skills-cache.sh
   ```

2. **Commit cache to git for offline use**
   ```bash
   git add .cache/skills/
   git commit -m "Update skills cache"
   ```

3. **Monitor MCP health in production**
   ```bash
   */5 * * * * /path/to/mcp-health-check.sh || /path/to/mcp-start.sh
   ```

4. **Use environment variables for configuration**
   ```bash
   # .env file
   MCP_PORT=3003
   MCP_OFFLINE_MODE=0
   ```

## FAQ

**Q: Should I always run MCP server?**  
A: No. Use cache for predictable, offline operation. Use MCP for dynamic learning.

**Q: Why is my MCP server suspended?**  
A: Usually from Ctrl+Z. Resume with `kill -CONT $(pgrep -f 'agentdb.*mcp')`.

**Q: Can I contribute without MCP running?**  
A: Yes! Cache provides full functionality for testing and development.

**Q: How often should I rebuild cache?**  
A: After each learning cycle or daily in production.

---

**Created**: 2026-01-09  
**Version**: 1.0  
**Maintainer**: AgenticFlow Team
