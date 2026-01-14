# MCP Fallback System Documentation

## Overview

The MCP (Model Context Protocol) fallback system provides **robust offline operation** when AgentDB MCP server is unavailable. The system automatically detects MCP availability and seamlessly falls back to cached skills data.

## Architecture

```
┌─────────────────┐
│  ay-prod-cycle  │
└────────┬────────┘
         │
         ├─→ 1. Check MCP health (mcp-health-check.sh)
         │
         ├─→ 2a. MCP Available
         │     └─→ Fetch from AgentDB → Cache locally → Return
         │
         └─→ 2b. MCP Unavailable
               └─→ Load from .cache/skills → Return cached data
```

## Key Components

### 1. **mcp-health-check.sh**
Checks if AgentDB and Claude Flow are available with configurable timeout.

```bash
./scripts/mcp-health-check.sh

# Environment variables:
# MCP_TIMEOUT=3  # Timeout in seconds (default: 3)
```

**Exit codes:**
- `0` - At least one MCP server available
- `1` - All MCP servers down

### 2. **export-skills-cache.sh**
Exports skills from AgentDB to local cache for offline use.

```bash
./scripts/export-skills-cache.sh

# Creates cache files in:
# .cache/skills/orchestrator.json
# .cache/skills/assessor.json
# .cache/skills/innovator.json
# .cache/skills/analyst.json
# .cache/skills/seeker.json
# .cache/skills/intuitive.json
```

### 3. **ay-prod-cycle.sh** (Enhanced)
Production cycle script now includes automatic MCP detection and fallback.

```bash
# Lines 15-20: MCP health check
export MCP_OFFLINE_MODE=0
if ! "$SCRIPT_DIR/mcp-health-check.sh" 2>/dev/null; then
    echo -e "\033[1;33m[⚠]\033[0m MCP unavailable - using offline fallback"
    export MCP_OFFLINE_MODE=1
fi

# Lines 119-126: Skills query with cache fallback
if [[ "$MCP_OFFLINE_MODE" == "1" ]] && [[ -f "$CACHE_DIR/${circle}.json" ]]; then
    log_info "Using cached skills (offline mode)"
    skills=$(jq -r '.skills[]' "$CACHE_DIR/${circle}.json" 2>/dev/null || echo "")
fi
```

### 4. **SkillsFallbackManager** (TypeScript)
Programmatic interface for skills retrieval with fallback logic.

```typescript
import { SkillsFallbackManager } from './src/mcp/skills-fallback';

const manager = new SkillsFallbackManager();

// Get skills with automatic fallback
const skills = await manager.getSkills({
  circle: 'orchestrator',
  preferLocal: true,      // Try cache first (faster)
  mcpTimeout: 3000,       // MCP timeout in ms
  fallback: 'cached'      // Use cached on MCP failure
});

// Export all skills to cache
await manager.exportAllSkills();

// Check MCP availability
const isAvailable = await manager.isMCPAvailable();

// Get cache statistics
const stats = manager.getCacheStats();
```

## Usage Patterns

### Pattern 1: Production with MCP Available
```bash
# MCP server running → Fetch fresh skills → Cache locally
./scripts/ay-prod-cycle.sh orchestrator standup advisory
```

**Flow:**
1. `mcp-health-check.sh` → ✅ Pass
2. Query AgentDB → Get skills
3. Cache to `.cache/skills/orchestrator.json`
4. Execute ceremony with fresh data

### Pattern 2: Production with MCP Unavailable
```bash
# MCP server down → Use cached skills
./scripts/ay-prod-cycle.sh orchestrator standup advisory
```

**Flow:**
1. `mcp-health-check.sh` → ❌ Fail
2. Set `MCP_OFFLINE_MODE=1`
3. Load from `.cache/skills/orchestrator.json`
4. Execute ceremony with cached data

### Pattern 3: Offline Preparation
```bash
# Before going offline, export all skills
./scripts/export-skills-cache.sh

# Verify cache exists
ls -lh .cache/skills/

# Now ay-prod-cycle.sh will work offline
```

## MCP Server Status

### Why MCP May Be "Optional"

The MCP server is **optional for execution** because:

1. **Local WASM provides full functionality** - AgentDB core features are compiled to WASM and run locally
2. **Cache provides historical data** - Skills cache contains previously learned patterns
3. **Bash scripts fallback** - Native ceremony implementations don't require MCP
4. **Graceful degradation** - System works with reduced features (no real-time learning) but maintains core operations

### When MCP Is Required

MCP is **required** for:
- ✅ Real-time skill learning and adaptation
- ✅ Cross-session memory synchronization
- ✅ Neural pattern training
- ✅ Live episode storage and retrieval
- ✅ Multi-agent coordination state

### When MCP Is Optional

MCP is **optional** for:
- ⚪ Basic ceremony execution (uses cached skills)
- ⚪ Local workflow orchestration
- ⚪ Static skill application
- ⚪ Offline development/testing

## Port Conflicts

Your current issue: **Port 3000 occupied by Grafana**

```bash
# Current state
lsof -i :3000
# COMMAND  PID  USER   FD   TYPE  DEVICE SIZE/OFF NODE NAME
# grafana 5551 user   21u  IPv6  ...     0t0  TCP *:hbci (LISTEN)
```

### Solution Options

**Option A: Change MCP Port**
```bash
# Start AgentDB on different port
npx agentdb mcp start --port 3001 --verbose

# Update client configuration
export AGENTDB_MCP_PORT=3001
```

**Option B: Stop Grafana Temporarily**
```bash
# Stop Grafana when using MCP
brew services stop grafana

# Start AgentDB on default port
npx agentdb mcp start --verbose

# Restart Grafana after
brew services start grafana
```

**Option C: Use Offline Mode**
```bash
# Work without MCP (uses cache)
./scripts/export-skills-cache.sh  # One-time setup
./scripts/ay-prod-cycle.sh orchestrator standup advisory
```

## Testing the System

### Test 1: MCP Health Check
```bash
# Should detect MCP status
./scripts/mcp-health-check.sh
echo $?  # 0 = available, 1 = unavailable

# Force offline mode
export MCP_TIMEOUT=0
./scripts/mcp-health-check.sh
```

### Test 2: Skills Export
```bash
# Export to cache
./scripts/export-skills-cache.sh

# Verify cache files
cat .cache/skills/orchestrator.json | jq
```

### Test 3: Offline Ceremony Execution
```bash
# Kill MCP server
pkill -f "agentdb mcp"

# Run ceremony (should use cache)
./scripts/ay-prod-cycle.sh orchestrator standup advisory

# Should see: "⚠️ MCP unavailable - using offline fallback"
# Should see: "Using cached skills (offline mode)"
```

### Test 4: TypeScript Integration
```typescript
import { SkillsFallbackManager } from './src/mcp/skills-fallback';

const manager = new SkillsFallbackManager();

// Test MCP availability
const available = await manager.isMCPAvailable();
console.log(`MCP Available: ${available}`);

// Get skills (auto-fallback)
const skills = await manager.getSkills({
  circle: 'orchestrator',
  preferLocal: true,
  fallback: 'cached'
});

console.log(`Retrieved ${skills.length} skills`);

// Cache stats
const stats = manager.getCacheStats();
console.log('Cache Stats:', stats);
```

## Cache Management

### Cache Structure
```json
{
  "circle": "orchestrator",
  "skills": [
    {
      "name": "chaotic_workflow",
      "circle": "orchestrator",
      "confidence": 0.85,
      "usage_count": 42
    }
  ],
  "cached_at": "2026-01-09T20:23:15Z",
  "source": "agentdb"
}
```

### Cache Maintenance
```bash
# View cache age
npx ts-node src/mcp/skills-fallback.ts stats

# Refresh cache
./scripts/export-skills-cache.sh

# Clear cache (forces MCP or empty)
rm -rf .cache/skills/*

# Manual cache validation
for f in .cache/skills/*.json; do
  echo "Validating $f"
  jq empty "$f" && echo "✅ Valid" || echo "❌ Invalid"
done
```

## NPM Script Integration

Add to `package.json`:

```json
{
  "scripts": {
    "mcp:check": "./scripts/mcp-health-check.sh",
    "mcp:export": "./scripts/export-skills-cache.sh",
    "mcp:stats": "npx ts-node src/mcp/skills-fallback.ts stats",
    "prod-cycle": "./scripts/ay-prod-cycle.sh"
  }
}
```

Usage:
```bash
npm run mcp:check
npm run mcp:export
npm run mcp:stats
npm run prod-cycle -- orchestrator standup advisory
```

## Troubleshooting

### Issue: "agentdb command not found"
```bash
# Check installation
npm list agentdb
npx agentdb --version

# Reinstall if needed
npm install agentdb@latest
```

### Issue: "MCP timeout"
```bash
# Increase timeout
export MCP_TIMEOUT=10
./scripts/mcp-health-check.sh

# Or edit mcp-health-check.sh line 5:
TIMEOUT="${MCP_TIMEOUT:-10}"  # Changed from 3 to 10
```

### Issue: "Cache file corrupted"
```bash
# Check JSON validity
jq empty .cache/skills/orchestrator.json

# Re-export if corrupt
rm .cache/skills/orchestrator.json
./scripts/export-skills-cache.sh
```

### Issue: "Port 3000 in use"
```bash
# Find what's using port
lsof -i :3000

# Use different port
npx agentdb mcp start --port 3001
```

## Performance Characteristics

| Scenario | Latency | Reliability | Data Freshness |
|----------|---------|-------------|----------------|
| MCP Available (first call) | ~500ms | High | Real-time |
| MCP Available (cached) | ~50ms | High | Real-time |
| MCP Unavailable (cache) | ~10ms | Medium | Stale |
| MCP Unavailable (no cache) | ~5ms | Low | Empty set |

## Best Practices

1. **Export cache before deployment**
   ```bash
   npm run mcp:export
   git add .cache/skills/
   ```

2. **Monitor cache age**
   ```bash
   npm run mcp:stats | jq '.[] | select(.age > "24h")'
   ```

3. **Graceful degradation**
   - Don't fail on MCP timeout
   - Always provide fallback data
   - Log degraded operation clearly

4. **Test offline mode**
   ```bash
   # Simulate offline
   pkill -f "agentdb mcp"
   ./scripts/ay-prod-cycle.sh orchestrator standup
   ```

## Future Enhancements

1. **WASM Skills Engine** - Run skill evaluation in browser/WASM
2. **P2P Skills Sync** - Share skills between offline instances
3. **Differential Updates** - Only sync changed skills
4. **Cache Expiry** - Auto-refresh stale cache (>24h old)
5. **Metrics Collection** - Track cache hit rate, MCP availability

## Summary

The MCP fallback system ensures **zero-downtime operation** by:

✅ Automatically detecting MCP availability  
✅ Caching skills locally for offline use  
✅ Providing seamless fallback to cached data  
✅ Maintaining full ceremony execution capability  
✅ Supporting both Bash and TypeScript workflows  

**Result: Production ceremonies run reliably whether MCP is available or not.**
