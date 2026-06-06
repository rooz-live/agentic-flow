# Vector Search Integration - ROAM Risk Analysis

**Status**: In Progress  
**Date**: 2026-05-24  
**Context**: Deconstructing monoliths, integrating with existing AgentDB

---

## Risk Matrix

| Risk | State | Owner | Mitigation |
|------|-------|-------|------------|
| **R1**: Embedding API rate limits/billing shock | MITIGATED | Vector Team | Local fallback via transformers.js |
| **R2**: Vector dimension drift (384 vs 1536) | MITIGATED | Vector Team | Adaptive dimension detection on insert |
| **R3**: SQLite WAL growth unbounded | ACCEPTED | Infra | Configurable vacuum schedule |
| **R4**: MCP server startup latency | OWNED | IDE Team | Lazy init + background warmup |
| **R5**: Cross-domain search performance | MITIGATED | Vector Team | Per-domain HNSW indices |
| **R6**: Schema migration failures | MITIGATED | Vector Team | Backwards compat + versioned migrations |
| **R7**: Config monolith recreation | RESOLVED | Arch Team | Decomposed to focused YAML |
| **R8**: Completion Velocity Theater | MITIGATED | QE Team | E2E physical verification required |

---

## Detailed Analysis

### R1: Embedding API Rate Limits (MITIGATED)

**Scenario**: OpenAI API throttling during bulk indexing

**Impact**: 
- User value: 5 (search unavailable)
- Time criticality: 5 (blocking operational workflows)
- Risk reduction: 3 (can queue)
- Job size: 2 (simple fallback)

**WSJF Score**: (5+5+3)/2 = 6.5 → **NOW priority**

**Mitigation**:
```yaml
embedding:
  fallback_chain:
    - transformers  # all-MiniLM-L6-v2, 384-dim
    - openai      # retry with backoff
```

**Verification**: `npm run test:vector-fallback`

---

### R2: Vector Dimension Drift (MITIGATED)

**Scenario**: Mixing 384-dim (local) and 1536-dim (OpenAI) vectors in same index

**Impact**: Search returns garbage results

**Mitigation**:
- Adaptive dimension detection: Store dimension in metadata
- Per-dimension indices: Separate HNSW graphs
- Runtime validation: Reject mismatched queries

**Code**:
```typescript
if (queryEmbedding.length !== indexDimension) {
  throw new VectorDimensionError(
    `Query dim ${queryEmbedding.length} != index dim ${indexDimension}`
  );
}
```

---

### R3: SQLite WAL Growth (ACCEPTED)

**Scenario**: WAL grows unbounded during high-throughput ingestion

**Decision**: ACCEPTED with monitoring

**Rationale**:
- Auto-checkpoint every 1000 pages (SQLite default)
- Vacuum scheduled weekly via cron
- Alert at >1GB WAL size

**Trade-off**: Accept storage growth for durability guarantees

---

### R4: MCP Server Startup (OWNED)

**Scenario**: MCP server adds 2-3s to IDE startup

**Owner**: IDE Integration Team

**Plan**:
1. NOW: Document latency impact
2. NEXT: Implement lazy initialization
3. LATER: Background warmup on idle

---

### R5: Cross-Domain Performance (MITIGATED)

**Scenario**: Searching code+telemetry+docs in one query is slow

**Mitigation**:
- Per-domain HNSW indices (not one giant index)
- Parallel search across domains
- Result fusion via reciprocal rank

**Performance target**: <100ms per domain, <200ms total

---

### R6: Schema Migration (MITIGATED)

**Scenario**: Adding columns breaks existing queries

**Mitigation**:
- Versioned migrations (001_add_mmr_score.sql)
- Backwards compatible reads
- Feature flags for new columns

---

### R7: Config Monolith (RESOLVED)

**Scenario**: Previous attempt created 264-item config directory

**Resolution**: Deconstructed to focused `vector-search-bridge.yaml`

**Principles**:
- Single responsibility: Only vector search config
- Inherit from AgentDB: Don't duplicate
- Feature flags: Enable/disable without breaking

---

### R8: Completion Velocity Theater (MITIGATED)

**Scenario**: "Files exist" claimed as "feature works"

**Mitigation**:
- E2E Playwright tests required
- Physical verification: Query must return results
- NDCG@10 > 0.8 threshold
- Synthetic probe: Every 5 minutes

---

## Action Items

| Priority | Action | Owner | Due |
|----------|--------|-------|-----|
| NOW | Implement transformers.js fallback | Vector | Today |
| NOW | Add dimension validation | Vector | Today |
| NEXT | Lazy MCP init | IDE | This week |
| NEXT | Parallel cross-domain search | Vector | This week |
| LATER | Background MCP warmup | IDE | Next PI |

---

## Invert Thinking Applied

Instead of:
- ❌ "Disable search if OpenAI is down"
- ✅ "Fall back to local embeddings"

Instead of:
- ❌ "Delete old schema on migration"
- ✅ "Retain compat, flag new features"

Instead of:
- ❌ "One giant config file"
- ✅ "Focused decomposed configs"

Instead of:
- ❌ "Claim done when files exist"
- ✅ "Verify with physical E2E tests"
