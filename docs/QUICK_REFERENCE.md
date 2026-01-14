# Quick Reference - Agentic Flow Commands

## ⚡ Quick Start (30 seconds)

```bash
# 1. Check everything is ready
npm run preflight

# 2. Run a ceremony (offline mode)
export MCP_OFFLINE_MODE=1
./scripts/ay-prod-cycle.sh orchestrator standup advisory

# 3. Check skills status
npx agentdb stats
```

## 📋 Pre-Flight & Diagnostics

```bash
# Full pre-flight checklist
npm run preflight

# MCP server diagnostics
npm run mcp:diagnose

# MCP health check only
npm run mcp:health

# Check skills cache status
npm run cache:status
```

## 🔧 MCP Server Management

```bash
# Start MCP server (finds available port)
npm run mcp:start

# Fix common issues (kill suspended, restart)
npm run mcp:fix

# Full setup (init + fix + cache + test)
npm run mcp:setup init

# Manual port selection
MCP_PORT=3004 ./scripts/mcp-start.sh

# Stop all MCP processes
pkill -9 -f "agentdb.*mcp"
```

## 💾 Cache Management

```bash
# Export skills to cache (bash)
npm run cache:export

# Export skills to cache (TypeScript)
npm run cache:export:ts

# One-time cache update
npm run cache:update

# Start cache auto-updater daemon
npm run cache:daemon

# Check daemon status
npm run cache:status

# Stop daemon
./scripts/cache-auto-update.sh stop

# Force update (ignore age)
./scripts/cache-auto-update.sh force
```

## 🎯 Running Ceremonies

```bash
# Basic syntax
./scripts/ay-prod-cycle.sh <circle> <ceremony> [adr]

# Examples
./scripts/ay-prod-cycle.sh orchestrator standup advisory
./scripts/ay-prod-cycle.sh assessor wsjf advisory
./scripts/ay-prod-cycle.sh innovator retro

# List available options
./scripts/ay-prod-cycle.sh list-circles
./scripts/ay-prod-cycle.sh list-skills standup

# Check status
./scripts/ay-prod-cycle.sh status
```

## 🚀 Establish Baseline

```bash
# Run all circles once
for circle in orchestrator assessor innovator analyst seeker intuitive; do
    ceremony=$(echo "standup wsjf retro refine replenish synthesis" | tr ' ' '\n' | shuf | head -1)
    ./scripts/ay-prod-cycle.sh "$circle" "$ceremony" advisory
done

# Verify baseline established
npx agentdb stats
# Should show: Skills: >0, Episodes: >6
```

## 🔄 Continuous Improvement

```bash
# Start cache updater (background)
npm run cache:daemon &

# Run continuous improvement cycles
# (depends on your ay-continuous-improve.sh implementation)

# Monitor
watch -n 60 'npx agentdb stats'
tail -f /tmp/cache-auto-update.log
```

## 📊 Monitoring & Status

```bash
# AgentDB statistics
npx agentdb stats

# Cache metadata
cat .cache/skills/_metadata.json | jq .

# List cached skills
ls -lh .cache/skills/

# Check MCP processes
ps aux | grep "agentdb.*mcp"

# Check port usage
lsof -i :3000 :3001 :3002 :3003 :3004

# View cache update logs
tail -f /tmp/cache-auto-update.log

# View MCP server logs
tail -f /tmp/mcp-server.log
```

## 🧪 Testing & Validation

```bash
# Test offline mode
export MCP_OFFLINE_MODE=1
./scripts/ay-prod-cycle.sh orchestrator standup advisory

# Test MCP online mode
unset MCP_OFFLINE_MODE
./scripts/ay-prod-cycle.sh orchestrator standup advisory

# Validate cache files
for file in .cache/skills/*.json; do
    echo "Checking $file..."
    jq empty "$file" && echo "✓ Valid" || echo "✗ Invalid"
done

# Test skill export
npx agentdb skill export --circle orchestrator | jq .
```

## 🐛 Troubleshooting

```bash
# MCP server suspended - resume
kill -CONT $(pgrep -f 'agentdb.*mcp')

# MCP server not responding - restart
npm run mcp:fix

# Port conflict - use different port
MCP_PORT=3005 npm run mcp:start

# Cache corrupted - rebuild
rm -rf .cache/skills/*
npm run cache:export

# Skills not extracting - run baseline
for i in {1..3}; do
    ./scripts/ay-prod-cycle.sh orchestrator standup advisory
done
npx agentdb stats  # Should show Skills > 0

# Clear npm cache
npm cache clean --force
npm install
```

## 🔬 Advanced: Claude-Flow v3alpha

```bash
# Install alpha version
npm install claude-flow@v3alpha

# Initialize experimental features
npx claude-flow@v3alpha init

# Start with experimental features
npx claude-flow@v3alpha mcp start --experimental

# Contribute to upstream
git clone https://github.com/ruvnet/claude-flow.git
cd claude-flow
npm install
npm run test
```

## 📦 Package Management

```bash
# Update dependencies
npm install --save-dev agentdb@latest
npm install claude-flow@latest

# Lock to exact versions
npm install --save-exact agentdb@1.6.1

# Check installed versions
npm list agentdb claude-flow
npm list -g agentdb

# Global install
npm install -g agentdb@latest
```

## 🌐 Environment Variables

```bash
# MCP Configuration
export MCP_PORT=3004              # Custom port
export MCP_TIMEOUT=5              # Health check timeout (seconds)
export MCP_OFFLINE_MODE=1         # Force offline mode

# Cache Configuration
export CACHE_UPDATE_INTERVAL=600  # Update every 10 minutes
export MAX_CACHE_AGE=86400        # Cache valid for 24 hours

# AgentDB Configuration
export AGENTDB_DB_PATH=./db/agentdb.sqlite
export AGENTDB_LOG_LEVEL=debug
```

## 📁 Important File Locations

```
agentic-flow/
├── .cache/skills/              # Cached skills (offline mode)
│   ├── orchestrator.json
│   ├── assessor.json
│   ├── innovator.json
│   ├── analyst.json
│   ├── seeker.json
│   ├── intuitive.json
│   └── _metadata.json          # Cache metadata
│
├── scripts/
│   ├── preflight-check.sh      # Pre-flight checklist
│   ├── ay-prod-cycle.sh        # Run ceremonies
│   ├── mcp-setup.sh            # MCP management
│   ├── mcp-start.sh            # Start MCP server
│   ├── mcp-health-check.sh     # Health check
│   ├── export-skills-cache.sh  # Export to cache
│   ├── export-skills.ts        # TypeScript export
│   └── cache-auto-update.sh    # Auto-updater
│
├── docs/
│   ├── MCP_ARCHITECTURE.md     # Architecture guide
│   ├── CONTINUOUS_IMPROVEMENT_GUIDE.md  # Full guide
│   └── QUICK_REFERENCE.md      # This file
│
└── /tmp/
    ├── mcp-server.log          # MCP logs
    ├── mcp-server.pid          # MCP PID
    ├── cache-auto-update.log   # Cache updater logs
    └── cache-auto-update.pid   # Updater PID
```

## ✅ Health Check Checklist

Run these in order to verify everything is working:

```bash
# 1. Dependencies
command -v jq && echo "✓ jq" || echo "✗ jq missing"
command -v sqlite3 && echo "✓ sqlite3" || echo "✗ sqlite3 missing"
command -v npx && echo "✓ npx" || echo "✗ npx missing"

# 2. Scripts
[ -x scripts/ay-prod-cycle.sh ] && echo "✓ ay-prod-cycle.sh" || echo "✗ Missing"
[ -x scripts/mcp-health-check.sh ] && echo "✓ mcp-health-check.sh" || echo "✗ Missing"

# 3. Cache
[ -d .cache/skills ] && echo "✓ Cache dir exists" || echo "✗ Cache missing"
[ -f .cache/skills/_metadata.json ] && echo "✓ Metadata exists" || echo "✗ No metadata"

# 4. AgentDB
npx agentdb stats >/dev/null 2>&1 && echo "✓ AgentDB responding" || echo "✗ AgentDB offline"

# 5. MCP (optional)
npm run mcp:health >/dev/null 2>&1 && echo "✓ MCP online" || echo "⚠ MCP offline (OK)"
```

## 🎓 Common Workflows

### First Time Setup
```bash
npm run preflight              # Check prerequisites
npm run mcp:fix                # Start MCP server
npm run cache:export           # Export skills
npm run preflight              # Verify all green
```

### Daily Development
```bash
export MCP_OFFLINE_MODE=1      # Work offline
./scripts/ay-prod-cycle.sh orchestrator standup advisory
npx agentdb stats              # Check progress
```

### Before Committing
```bash
npm run cache:export           # Update cache
git add .cache/skills/         # Commit cache
npm run test                   # Run tests
npm run lint                   # Check code
```

### Production Deployment
```bash
npm run mcp:fix                # Ensure MCP running
npm run cache:daemon &         # Start auto-updater
# Deploy your application
npm run cache:status           # Monitor updates
```

---

**Last Updated**: 2026-01-09  
**Version**: 1.0  
**Quick Help**: `npm run preflight` or `./scripts/mcp-setup.sh diagnose`
