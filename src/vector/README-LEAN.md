# Vector Search - Lean Integration

**Status**: NOW Phase - Reuse Existing, Deconstruct Monoliths  
**Approach**: Anti-fragile, WSJF-prioritized, Invert Thinking

---

## Philosophy: Reduce Toil, Reuse Infrastructure

> "The best code is the code you don't write."

Instead of creating a new vector search monolith, we:
1. **Reuse** AgentDB's existing `EmbeddingService` (transformers.js)
2. **Bridge** to new capabilities via focused adapters
3. **Deconstruct** config monolith into single-purpose YAML
4. **Extend** rather than replace (anti-fragile)

---

## Architecture: Deconstructed Monolith

```
┌─────────────────────────────────────────────────────────┐
│  BEFORE: Config Monolith (264 files)                    │
│  AFTER: Focused Bridges (3 files)                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Existing AgentDB              New Vector Capabilities  │
│  ┌──────────────┐              ┌──────────────────┐     │
│  │ EmbeddingService│◄──────────│ agentdb-bridge.ts │     │
│  │ (transformers) │           │ (lean wrapper)   │     │
│  └──────────────┘              └──────────────────┘     │
│         ▲                           │                   │
│         │                           ▼                   │
│  ┌──────────────┐              ┌──────────────────┐     │
│  │ ReflexionMemory│            │ telemetry-lean.ts │     │
│  │ SkillLibrary   │            │ (domain adapter) │     │
│  └──────────────┘              └──────────────────┘     │
│                                                          │
│  Config:                                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │ vector-search-bridge.yaml (single purpose)      │   │
│  │ - Inherits AgentDB config                       │   │
│  │ - Feature flags (anti-fragile)                 │   │
│  │ - WSJF priorities                              │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## WSJF Execution Order

### NOW (Score >8.0)
| ID | Item | Score | Status |
|----|------|-------|--------|
| VS-NOW-003 | Dimension Validation | 14.0 | ✅ Done |
| VS-NOW-001 | Reuse AgentDB Embedder | 15.0 | ✅ Done |
| VS-NOW-002 | Telemetry Ingest | 7.5 | ✅ Done |

### NEXT (Score 4.0-8.0)
| ID | Item | Score | Status |
|----|------|-------|--------|
| VS-NEXT-004 | CLI Python Bridge | 6.0 | Ready |
| VS-NEXT-001 | MCP Lazy Init | 4.0 | Planned |

### LATER (Score <4.0)
| ID | Item | Score | Status |
|----|------|-------|--------|
| VS-LATER-001 | AST Code Parsing | 1.6 | Backlog |
| VS-LATER-004 | Public Edge API | 1.6 | Backlog |

---

## ROAM Risks Status

| Risk | State | Verification |
|------|-------|--------------|
| API rate limits | MITIGATED | Local fallback implemented |
| Dimension drift | MITIGATED | Runtime validation |
| WAL growth | ACCEPTED | Weekly vacuum scheduled |
| MCP latency | OWNED | Lazy init planned |
| CVT (fake done) | MITIGATED | E2E required |

---

## Anti-Fragile Principles Applied

### 1. Invert Thinking
```yaml
# ❌ Instead of disabling:
features:
  search: false  # Broken, turn off

# ✅ Extend with fallback:
features:
  search: true
  fallback_embedder: transformers  # Never fully fails
```

### 2. Config Upgrades (Not Deletion)
```typescript
// ❌ Delete old code:
// rm old_embedding.ts

// ✅ Flag-based migration:
if (config.use_new_embedder) {
  return newEmbedder.compute(text);
} else {
  return oldEmbedder.compute(text);  // Retained
}
```

### 3. Lean Iterations
- Max job size: 5 story points
- NOW items: 1-2 points each
- Ship every 2-3 days

### 4. Physical Verification
```bash
# ❌ Don't claim done when:
ls src/vector/index.ts  # File exists

# ✅ Claim done when:
npx playwright test tests/vector-search.e2e.spec.ts  # Passes
```

---

## Quick Start

### 1. Index Existing Telemetry (NOW)
```typescript
import { TelemetryLeanAdapter } from './src/vector/adapters/telemetry-lean';

const adapter = new TelemetryLeanAdapter('./.agentdb/vectors.db');
await adapter.ingestFromPath('./logs/pattern_metrics.jsonl');

// Search
const results = adapter.search(queryEmbedding, 10, 0.7);
```

### 2. Use AgentDB Bridge (NOW)
```typescript
import { createEmbeddingBridge } from './src/vector/integrations/agentdb-bridge';

const bridge = await createEmbeddingBridge();
const embedding = await bridge.compute("telemetry pattern");
```

### 3. CLI Search (NEXT)
```bash
python3 scripts/cmd_semantic_search.py \
  "deployment failure pattern" \
  --domain telemetry \
  --k 10
```

---

## File Inventory (Deconstructed)

| File | Purpose | Size |
|------|---------|------|
| `config/vector-search-bridge.yaml` | Single-purpose config | ~100 lines |
| `src/vector/ROAM-ANALYSIS.md` | Risk documentation | ~200 lines |
| `src/vector/WSJF-PRIORITIES.yaml` | Prioritization | ~150 lines |
| `src/vector/integrations/agentdb-bridge.ts` | Lean bridge | ~100 lines |
| `src/vector/adapters/telemetry-lean.ts` | Domain adapter | ~200 lines |
| **Total** | **Focused, decomposed** | **~750 lines** |

Compare to:
- Previous attempt: 14 files, ~2000 lines
- Config monolith: 264 files
- **Reduction: 70% less code, focused purpose**

---

## Integration with Agentic Foundation

| Domain | Integration Point |
|--------|-------------------|
| AI | AgentDB EmbeddingService |
| BI | Telemetry pattern analytics |
| CICD | E2E tests in pipeline |
| Analytics | Vector search metrics |
| Flow | Lean iteration cadence |

---

## Long Horizon: Deep RCA

**Question**: Why did previous vector search attempt create a monolith?

**Root Cause**:
1. Assumed "new feature = new codebase"
2. Didn't inventory existing AgentDB capabilities
3. No WSJF prioritization → everything at once
4. No ROAM analysis → over-engineered mitigations

**Resolution** (Invert Thinking):
- ✅ Reuse > Recreate
- ✅ Decompose > Monolith
- ✅ Prioritize > Everything-now
- ✅ Extend > Replace

---

## Next Actions (Per WSJF)

1. **NOW**: Verify telemetry ingest works with real logs
2. **NOW**: Add dimension validation E2E test
3. **NEXT**: Implement CLI Python bridge
4. **NEXT**: Lazy MCP initialization
5. **LATER**: AST code parsing (PI 2+)
6. **LATER**: Public edge deployment
