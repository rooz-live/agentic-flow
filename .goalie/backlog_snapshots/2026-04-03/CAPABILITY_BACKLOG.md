# CAPABILITY BACKLOG - WSJF-Prioritized Integration Pipeline
## Generated: 2026-04-03T22:45:00Z
## Sort Order: Cost of Delay ÷ Job Size (Highest First)

---

## 📍 CRITICAL TRUST BLOCKERS (WSJF 95-100)
### Must resolve before any capability migration

#### 1. GitNexus Code Intelligence (WSJF: 100)
- **Repo**: https://github.com/abhigyanpatwari/GitNexus
- **Purpose**: Zero-server code intelligence with knowledge graph
- **Integration**: MCP server for code navigation
- **Action**: `npx gitnexus analyze` (already indexed: 153624 symbols)
- **Status**: ✅ Active - CLI and MCP available

#### 2. Superproject Consolidation - Gate Script Tracking (WSJF: 100)
- **Blocker**: Legacy gate tracking sprawl
- **Impact**: Pre-commit hooks bypassed, CI/CD blocked
- **Solution**: Isolate to healthy submodule `investing/agentic-flow` via Substitution Map
- **Evidence**: CSQBM verified active in submodule

---

## 🏗️ INFRASTRUCTURE & GATES (WSJF 90-94)

#### 3. Agentic QE Fleet (WSJF: 95)
- **Repo**: https://github.com/proffesor-for-testing/agentic-qe
- **Purpose**: AI-powered quality engineering (82 skills)
- **Key Skills**: brutal-honesty-review, chaos-engineering-resilience
- **Action**: `npx agentic-qe@3.9.0 init --auto`
- **Integration**: Mutation testing, coverage analysis

#### 4. TLD Dashboard UI Materialization (WSJF: 92)
- **Tool**: `ruvector decompile`
- **Purpose**: Iteratively increment PI Sync Prep towards PI Sync
- **Integration**: Laterally/vertically integrated menus mapping

---

## 📋 INTEGRATION CHECKLIST

### Before Next Merge:
- [ ] Run `npx tsc --noEmit` (TypeScript validation)
- [ ] Run `npx eslint . --quiet` (Lint validation)
- [ ] Run `scripts/contract-enforcement-gate.sh verify`
- [ ] Verify agentdb.db freshness (<96 hours)
- [ ] Check submodule git status clean

---

*This backlog has been explicitly truncated/pruned for Phase 105 Single-Thread WSJF Focus. Full archive preserved in CAPABILITY_BACKLOG.md.bak representing R-2026-016 capability retention.*
