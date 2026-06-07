# Vector Search Module

Multi-domain semantic search with HNSW indexing, adaptive quantization, and tri-modal access (CLI + MCP + API).

## Architecture

```
src/vector/
├── core/              # Foundation layer
│   ├── types.ts       # Core interfaces (EmbeddingModel, VectorIndex, SearchResult)
│   ├── embedding.ts   # OpenAI & local embedding implementations
│   ├── quantization.ts # Binary (32x), Scalar (4x), Product (8-16x) quantization
│   └── agentdb-adapter.ts # HNSW-powered vector index with MMR
├── adapters/          # Domain-specific extraction
│   ├── base.ts        # DomainAdapter interface
│   ├── code-adapter.ts # AST-aware code pattern extraction
│   ├── telemetry-adapter.ts # Execution trace extraction
│   └── document-adapter.ts # Markdown/spec/PRD extraction
├── search/            # Unified search interface
│   └── unified-search.ts # Cross-domain hybrid search with context synthesis
├── integrations/      # External integrations
│   └── mcp-server.ts  # MCP server for IDE-native search
├── cli/               # CLI entry points
│   ├── search-cli.ts  # Node.js search CLI
│   └── index-cli.ts   # Node.js indexing CLI
└── index.ts           # Module exports
```

## Performance Characteristics

| Operation | Latency | Memory Reduction |
|-----------|---------|------------------|
| Vector Search | <100µs (HNSW) | 32x (binary quantization) |
| Pattern Retrieval | <1ms (cached) | 4x (scalar quantization) |
| Batch Insert | 2ms/100 vectors | Configurable |
| Similarity Compute | <5ms | N/A |

## Usage

### CLI

```bash
# Semantic code discovery
python3 scripts/cmd_semantic_search.py "ROAM risk pattern" --domain code --k 5

# Telemetry query
python3 scripts/cmd_semantic_search.py "high latency deployments" --domain telemetry

# Cross-domain hybrid search
python3 scripts/cmd_semantic_search.py "deployment risk" --domains code,telemetry

# Index new source
python3 scripts/cmd_semantic_search.py --index ./src --domain code

# Check stats
python3 scripts/cmd_semantic_search.py --stats
```

### TypeScript API

```typescript
import { initGlobalSearch, CodePatternAdapter } from './src/vector';

const search = initGlobalSearch('./.agentdb/vectors.db');
await search.addDomain(new CodePatternAdapter());

// Index source
await search.indexSource('code', './src');

// Query
const results = await search.query("validation pattern", {
  k: 10,
  threshold: 0.7,
  useMMR: true
});

// Cross-domain with context synthesis
const { results, context } = await search.queryWithContext(
  "rollback pattern",
  { domains: ['code', 'telemetry'] }
);
```

### MCP Server

```bash
# Add to Claude Code
claude mcp add agentdb node src/vector/integrations/mcp-server.js

# Available tools:
# - agentdb_query: Semantic search
# - agentdb_hybrid_search: Search with metadata filters
# - agentdb_index_source: Index new sources
# - agentdb_stats: Database statistics
```

## Adaptive Quantization

| Domain | Strategy | Memory Reduction | Use Case |
|--------|----------|------------------|----------|
| Code | Scalar (8-bit) | 4x | Precision-critical AST patterns |
| Telemetry | Binary | 32x | High-volume execution traces |
| Docs | Scalar (8-bit) | 4x | RAG quality-critical |

## MMR (Maximal Marginal Relevance)

Enable diverse results by balancing relevance vs diversity:

```typescript
const results = await search.query("pattern", {
  useMMR: true,
  mmrLambda: 0.5  // 0 = max diversity, 1 = max relevance
});
```

## E2E Verification

```bash
# Run anti-CVT tests
npx playwright test tests/vector-search.e2e.spec.ts
```

Tests verify:
- ✅ Infrastructure files exist (anti "file exists" theater)
- ✅ TypeScript compiles without errors
- ✅ CLI responds correctly
- ✅ Search returns relevant results (requires indexed data)

## Configuration

Environment variables:
- `OPENAI_API_KEY`: Required for embeddings
- `AGENTDB_PATH`: Database path (default: `./.agentdb/vectors.db`)
- `LOCAL_EMBEDDING_PATH`: For local embedding models

## Integration with Agentic Flow

This module enables:
- **Analyst Circle**: Semantic telemetry analysis
- **Assessor Circle**: Automated risk discovery via similarity
- **Innovator Circle**: Code pattern discovery
- **Orchestrator Circle**: Cross-domain dependency detection
- **Seeker Circle**: Documentation RAG queries
