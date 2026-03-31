# AgentDB Integration Plan - Offline-First Architecture

## Current State Analysis

### ✅ What Works
- Local agentdb package at `packages/agentdb`
- WASM-based (sql.js) for full offline functionality
- CLI available: `dist/cli/agentdb-cli.js`
- Scripts exist: `mcp-health-check.sh`, `export-skills-cache.sh`

### ❌ What's Missing
- No dependency link in root `package.json`
- Scripts don't use local agentdb
- No fallback logic in `ay-prod-cycle.sh`
- No skills cache directory

## Implementation: NOW Tasks

### 1. Link Local AgentDB (5 min)

```bash
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow

# Add workspace link
npm install --workspace=packages/agentdb

# Or direct link in package.json
npm install file:./packages/agentdb --save-dev
```

### 2. Create Skills Cache (2 min)

```bash
mkdir -p .cache/skills

# Initialize with empty arrays for each circle
cat > .cache/skills/orchestrator.json << 'EOF'
{
  "circle": "orchestrator",
  "ceremonies": ["standup"],
  "skills": ["chaotic_workflow", "minimal_cycle", "retro_driven"],
  "cached_at": "2026-01-09T20:00:00Z"
}
EOF

# Repeat for other circles
```

### 3. Update ay-prod-cycle.sh (10 min)

Add after line 11:

```bash
# MCP Health Check with Fallback
if ! "$SCRIPT_DIR/mcp-health-check.sh" 2>/dev/null; then
    log_warn "MCP unavailable - using offline fallback"
    export MCP_OFFLINE_MODE=1
fi

# Override query_skills function for offline mode
query_skills() {
  local circle="$1"
  local ceremony="$2"
  
  # Try MCP first if available
  if [[ "$MCP_OFFLINE_MODE" != "1" ]] && command -v npx >/dev/null 2>&1; then
    if timeout 3s npx agentdb skill query --circle "$circle" --ceremony "$ceremony" 2>/dev/null; then
      return 0
    fi
    log_warn "MCP timeout, falling back to cache"
  fi
  
  # Fallback to cache
  local cache_file="$ROOT_DIR/.cache/skills/${circle}.json"
  if [[ -f "$cache_file" ]]; then
    log_info "Using cached skills for $circle"
    jq -r '.skills[]' "$cache_file" 2>/dev/null || echo ""
  else
    log_warn "No cache found for $circle, using defaults"
    echo "${CEREMONY_SKILLS[$ceremony]:-}"
  fi
}
```

### 4. Test Offline Mode (5 min)

```bash
# Force offline mode
export MCP_OFFLINE_MODE=1

# Run ceremony
./scripts/ay-prod-cycle.sh orchestrator standup advisory

# Expected: Uses cached skills, no MCP errors
```

## Implementation: NEXT Tasks

### 5. Build Skills Export Tool (15 min)

```typescript
// packages/agentdb/src/cli/export-skills.ts
import { SkillLibrary } from '../controllers/SkillLibrary.js';
import fs from 'fs';

export async function exportSkills(circle: string, outputPath: string) {
  const skillLib = new SkillLibrary('./data/agentdb.sqlite');
  const skills = await skillLib.querySkills({ circle });
  
  const cache = {
    circle,
    skills: skills.map(s => s.name),
    cached_at: new Date().toISOString()
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(cache, null, 2));
  console.log(`✓ Exported ${skills.length} skills for ${circle}`);
}
```

### 6. Automated Cache Updates (10 min)

```bash
# scripts/update-skills-cache.sh
#!/usr/bin/env bash
set -euo pipefail

CIRCLES="orchestrator assessor innovator analyst seeker intuitive"

for circle in $CIRCLES; do
  echo "Exporting $circle..."
  npx agentdb skill export --circle "$circle" > ".cache/skills/${circle}.json"
done

echo "✓ All skills cached"
```

## Implementation: LATER Tasks

### 7. Claude-Flow v3alpha Integration

**Why LATER:**
- Upstream dependency (external project)
- Requires cloud MCP server
- Not needed for offline functionality
- Good for: contributing back to claude-flow project

**When to do it:**
- After local agentdb fully integrated
- When you want to share skills across teams
- When you need remote MCP capabilities

### 8. WASM Vector Search Optimization

Already available but not yet used:
- `WASMVectorSearch` controller exists
- 150x faster than traditional search
- Enable via config flag

## Architecture Decision

### Why Offline-First?

```
┌─────────────────────────────────────┐
│        ay-prod-cycle.sh             │
│                                     │
│  1. Try MCP (3s timeout)           │
│  2. Fallback to Cache (.cache/)    │
│  3. Fallback to Defaults (hardcoded)│
└─────────────────────────────────────┘
         ↓                    ↓
   ┌──────────┐         ┌──────────┐
   │  Local   │         │  Remote  │
   │ AgentDB  │         │   MCP    │
   │ (WASM)   │         │  Server  │
   └──────────┘         └──────────┘
     ALWAYS              OPTIONAL
    AVAILABLE           (cloud/network)
```

### Why MCP Optional?

**Local AgentDB provides:**
- ✅ All core functionality (WASM)
- ✅ Skill storage/retrieval
- ✅ Episode learning
- ✅ Vector search
- ✅ No network dependency

**MCP Server adds:**
- Remote access
- Multi-client sync
- Cloud backup
- Real-time updates
- Team collaboration

## Testing Strategy

```bash
# Test 1: Full offline
export MCP_OFFLINE_MODE=1
./scripts/ay-prod-cycle.sh orchestrator standup advisory
# Expected: Uses cache, no errors

# Test 2: MCP available
unset MCP_OFFLINE_MODE
npx agentdb mcp start &
./scripts/ay-prod-cycle.sh orchestrator standup advisory
# Expected: Uses MCP, faster

# Test 3: MCP timeout
# (Start MCP but block port)
./scripts/ay-prod-cycle.sh orchestrator standup advisory
# Expected: Timeout → fallback to cache
```

## Monitoring

Add to scripts:

```bash
# Log which source was used
log_info "Skills source: ${SKILLS_SOURCE:-unknown}"

# Metrics
echo "$(date),${CIRCLE},${CEREMONY},${SKILLS_SOURCE},${DURATION}" >> .cache/metrics.csv
```

## Summary

**NOW (30 min total):**
1. Link agentdb package → 5 min
2. Create cache dirs → 2 min  
3. Update ay-prod-cycle.sh → 10 min
4. Test offline mode → 5 min

**NEXT (25 min):**
5. Skills export tool → 15 min
6. Auto cache updates → 10 min

**LATER:**
7. Claude-flow v3alpha (upstream contribution)
8. WASM optimization tuning

**Result:** Fully functional offline-first system with optional MCP enhancement.
