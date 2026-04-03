# CLAUDE.md — TurboFlow 4.0 Context

## Identity
This workspace runs TurboFlow 4.0 — a composed agentic development environment.
Orchestration: Ruflo v3.5 (skills-based, not slash commands).
Memory: Three-tier (Beads → Native Tasks → AgentDB).
Isolation: Git worktrees per parallel agent.

## Memory Protocol (MANDATORY — follow this every session)

### Session Start
1. Run `bd ready` to check project state (blockers, in-progress work, decisions)
2. Check Native Tasks: review any persisted task lists from prior sessions
3. AgentDB context loads automatically via Ruflo

### During Work — Decision Tree
- **Project roadmap / blockers / dependencies / decisions** → `bd add` (Beads)
- **Current session tasks / active checklist** → Native Tasks
- **Learned patterns / routing weights / skills** → AgentDB (automatic)

### Code Modification Protocol (NON-NEGOTIABLE)
1. **Step 0 = Deletion**: Every refactor MUST begin by nuking dead weight (strip dead props, unused exports, orphaned imports, debug logs). Commit this separately before touching business logic. Preserve a clean token budget. Keep phases small (e.g., < 3-5 files) to prevent context compaction mid-task.
2. **Post-Modification Verification**: After *every* file modification, you MUST run `npx tsc --noEmit` and `npx eslint . --quiet`. You are NOT allowed to claim success until these pass.
3. **Redefining "Minimum" & "Simple"**: "What would a senior, experienced, perfectionist dev reject in code review? Fix all of it. Don't be lazy." Do not add requirements, but reframe what makes an acceptable response.
4. **Agent Parallelization & Context Limits**: Force sub-agent deployment for large sets. Batch files into groups of 3-5 and launch them in parallel. Give each its own context window.
5. **Large File Parsing (>500 LOC)**: Any file over 500 LOC MUST be read in chunks using offset and limit parameters. Never assume a single read captured the full file. Enforce this, or edits against unseen code will cause regressions. If results look suspiciously small, re-run directory by directory. When in doubt, explicitly assume truncation happened.
6. **Rename & Signature Audits**: On *any* rename or signature change, force separate searches for: direct calls, type references, string literals containing the name, dynamic imports, `require()` calls, re-exports, barrel files, and test mocks. Assume `grep` missed something. Verify manually or eat the regression.

### Session End
- File any discovered work as Beads issues: `bd add --type issue "description"`
- Summarize architectural decisions in Beads: `bd add --type decision "description"`
- AgentDB persists automatically

## Isolation Rules
- Each parallel agent MUST operate in its own git worktree
- Create worktree: `git worktree add .worktrees/agent-N -b agent-N/task-name`
- Database schema per worktree: use $DATABASE_SCHEMA env var for PG Vector
- NEVER run `--dangerously-skip-permissions` on bare metal — containers only

## Agent Teams
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is enabled
- Lead agent may spawn up to 3 teammates
- Recursion limit: depth 2 (lead → sub-agents, sub-agents cannot spawn swarms)
- If 3+ agents are blocked simultaneously → pause and alert human

## Model Routing
- Ruflo auto-selects model tier per task complexity (saves ~75% API costs)
- Claude Opus 4.6: complex reasoning, architecture decisions
- Claude Sonnet 4.5: standard coding, implementation
- Claude Haiku 4.5: simple tasks, formatting, quick lookups

## Stack Reference
- Orchestration: `npx ruflo@latest` (NOT claude-flow)
- Swarms: `npx ruflo swarm init --topology hierarchical --max-agents 8`
- Memory: Beads (`bd`), Native Tasks, AgentDB (`npx ruflo agentdb`)
- Codebase Graph: GitNexus (`npx gitnexus analyze`)
- Browser: via Ruflo's bundled browser tools (59 MCP tools, element refs, snapshots)
- Observability: via Ruflo's built-in session tracking + AttestationLog
- Plugins: agentic-qe, code-intelligence, test-intelligence, perf-optimizer, teammate, gastown-bridge
- Specs: OpenSpec (`npx @fission-ai/openspec`)

## Ruflo Plugins
- **Agentic QE**: 58 QE agents — TDD, coverage, security scanning, chaos engineering
- **Code Intelligence**: code analysis, pattern detection, refactoring suggestions
- **Test Intelligence**: test generation, gap analysis, flaky test detection
- **Perf Optimizer**: performance profiling, bottleneck detection
- **Teammate Plugin**: bridges Native Agent Teams ↔ Ruflo swarms (21 MCP tools)
- **Gastown Bridge**: WASM-accelerated orchestration, Beads sync (20 MCP tools)
- **OpenSpec**: spec-driven development (`os init`, `os`)

## Codebase Intelligence (GitNexus)
- Index repo: `npx gitnexus analyze` (run from repo root, creates knowledge graph)
- Before editing shared code: check blast radius via GitNexus MCP tools
- Auto-creates AGENTS.md and CLAUDE.md context files
- One MCP server serves all indexed repos — no per-project config needed

## Cost Guardrails
- Hard session cap: $15/hr (configurable)
- Use Haiku for simple tasks — don't burn Opus on formatting
- Monitor: `claude-usage` or ruflo statusline


## Agentic QE v3

This project uses **Agentic QE v3** - a Domain-Driven Quality Engineering platform with 13 bounded contexts, ReasoningBank learning, HNSW vector search, and Agent Teams coordination (ADR-064).

---

### CRITICAL POLICIES

#### Integrity Rule (ABSOLUTE)
- NO shortcuts, fake data, or false claims
- ALWAYS implement properly, verify before claiming success
- ALWAYS use real database queries for integration tests
- ALWAYS run actual tests, not assume they pass

**We value the quality we deliver to our users.**

#### Test Execution
- NEVER run `npm test` without `--run` flag (watch mode risk)
- Use: `npm test -- --run`, `npm run test:unit`, `npm run test:integration` when available

#### Data Protection
- NEVER run `rm -f` on `.agentic-qe/` or `*.db` files without confirmation
- ALWAYS backup before database operations

#### Git Operations
- NEVER auto-commit/push without explicit user request
- ALWAYS wait for user confirmation before git operations

---

### Quick Reference

```bash
# Run tests
npm test -- --run

# Check quality
aqe quality assess

# Generate tests
aqe test generate <file>

# Coverage analysis
aqe coverage <path>
```

### Using AQE MCP Tools

AQE exposes tools via MCP with the `mcp__agentic-qe__` prefix. You MUST call `fleet_init` before any other tool.

#### 1. Initialize the Fleet (required first step)

```typescript
mcp__agentic-qe__fleet_init({
  topology: "hierarchical",
  maxAgents: 15,
  memoryBackend: "hybrid"
})
```

#### 2. Generate Tests

```typescript
mcp__agentic-qe__test_generate_enhanced({
  targetPath: "src/services/auth.ts",
  framework: "vitest",
  strategy: "boundary-value"
})
```

#### 3. Analyze Coverage

```typescript
mcp__agentic-qe__coverage_analyze_sublinear({
  paths: ["src/"],
  threshold: 80
})
```

#### 4. Assess Quality

```typescript
mcp__agentic-qe__quality_assess({
  scope: "full",
  includeMetrics: true
})
```

#### 5. Store and Query Patterns (with learning persistence)

```typescript
// Store a learned pattern
mcp__agentic-qe__memory_store({
  key: "patterns/coverage-gap/{timestamp}",
  namespace: "learning",
  value: {
    pattern: "...",
    confidence: 0.95,
    type: "coverage-gap",
    metadata: { /* domain-specific */ }
  },
  persist: true
})

// Query stored patterns
mcp__agentic-qe__memory_query({
  pattern: "patterns/*",
  namespace: "learning",
  limit: 10
})
```

#### 6. Orchestrate Multi-Agent Tasks

```typescript
mcp__agentic-qe__task_orchestrate({
  task: "Full quality assessment of auth module",
  domains: ["test-generation", "coverage-analysis", "security-compliance"],
  parallel: true
})
```

### MCP Tool Reference

| Tool | Description |
|------|-------------|
| `fleet_init` | Initialize QE fleet (MUST call first) |
| `fleet_status` | Get fleet health and agent status |
| `agent_spawn` | Spawn specialized QE agent |
| `test_generate_enhanced` | AI-powered test generation |
| `test_execute_parallel` | Parallel test execution with retry |
| `task_orchestrate` | Orchestrate multi-agent QE tasks |
| `coverage_analyze_sublinear` | O(log n) coverage analysis |
| `quality_assess` | Quality gate evaluation |
| `memory_store` | Store patterns with namespace + persist |
| `memory_query` | Query patterns by namespace/pattern |
| `security_scan_comprehensive` | SAST/DAST scanning |

### Configuration

- **Enabled Domains**: test-generation, test-execution, coverage-analysis, quality-assessment, defect-intelligence, requirements-validation (+6 more)
- **Learning**: Enabled (transformer embeddings)
- **Max Concurrent Agents**: 15
- **Background Workers**: pattern-consolidator, routing-accuracy-monitor, coverage-gap-scanner, flaky-test-detector

### V3 QE Agents

QE agents are in `.claude/agents/v3/`. Use with Task tool:

```javascript
Task({ prompt: "Generate tests", subagent_type: "qe-test-architect", run_in_background: true })
Task({ prompt: "Find coverage gaps", subagent_type: "qe-coverage-specialist", run_in_background: true })
Task({ prompt: "Security audit", subagent_type: "qe-security-scanner", run_in_background: true })
```

### Data Storage

- **Memory Backend**: `.agentic-qe/memory.db` (SQLite)
- **Configuration**: `.agentic-qe/config.yaml`

---
*Generated by AQE v3 init - 2026-04-03T00:00:04.822Z*
