# Changelog

All notable changes to agentic-flow will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.4.0] - 2025-11-30

### 🎉 Production Maturity Release: Closed-Loop Governance & CI/CD

This release delivers comprehensive production maturity improvements including closed-loop telemetry, 
multi-stage CI/CD pipelines, and enhanced governance patterns.

### Added

#### CI/CD Pipeline
- **Multi-Stage Pipeline**: 5-stage GitHub Actions workflow (Source Control → Build → Test → Staging → Production)
- **Release Workflow**: Automated semantic versioning, release notes generation, and GitHub Releases
- **Build Orchestrator**: 4 execution modes (full, quick, test-only, validate) via `scripts/build-orchestrator.sh`
- **pytest Configuration**: Comprehensive pytest.ini with 10 custom markers for test organization

#### Telemetry & Governance
- **Closed-Loop Telemetry**: Iterative RCA with pattern-triggered metrics
- **8 Governance Patterns**: depth-ladder, safe-degrade, circle-risk-focus, autocommit-shadow, guardrail-lock, failure-strategy, iteration-budget, observability-first
- **patterns_triggered Field**: Circle participation events now track which governance patterns fired
- **CONSOLIDATED_ACTIONS.yaml**: Enhanced schema with `verified` and `highImpact` fields
- **governance_state.json**: Proper versioning and schema documentation

#### SAFLA Integration
- **Throughput Metrics**: SAFLA delta evaluation for production quality gates
- **Capability Tracking**: Enhanced capability monitoring with threshold tuning
- **Depth-Ladder Oscillation Detection**: Automatic adjustment triggers for stability

### Fixed

#### Security (9 CVEs Addressed)
- CVE-2025-13466, GHSA-67mh-4wv8-2f99, CVE-2024-5629 (Phase 3)
- CVE-2025-53605, CVE-2024-12224, CVE-2024-47081, CVE-2024-35195 (Phase 2)
- CVE-2025-6638, CVE-2025-64756 (Phase 1)

#### Tests & CI
- 14 test failures resolved for SAFLA throughput validation
- ReasoningBank API consumer tests with static analysis
- Build step ordering for public API tests

### Changed

#### Repository Hygiene
- Reorganized `.gitignore` with proper sections and removed duplicates
- Cleaned `__pycache__`, `.pytest_cache`, and temporary files
- Updated npm scripts for build orchestration

#### Dependencies
- Dependency automation with GitHub Dependabot and validation workflow
- GitLab CI/CD migration preparation

### Documentation
- `.goalie/README.md`: governance_state.json schema documentation
- Integration tests for telemetry consumers (7/7 passing)

---

## [2.0.0] - 2025-11-06

### Major Version Bump
- Version alignment with major feature releases
- ReasoningBank learning memory enhancements
- Multi-agent coordination improvements

---

## [1.9.2] - 2025-11-06

### Fixed
- **Gemini Provider**: Identified and documented empty response bug in Gemini proxy (Issue #51)
  - Proxy initialization works correctly
  - Request routing to Gemini API successful
  - Response conversion needs debugging (responses not reaching output)
  - Added comprehensive logging for troubleshooting

### Added
- **Config Wizard Enhancement Request**: Created issue #50 for Gemini API key configuration
  - Config wizard currently only prompts for ANTHROPIC_API_KEY
  - Need to add GOOGLE_GEMINI_API_KEY and OPENROUTER_API_KEY prompts
  - Improves multi-provider setup experience

### Documentation
- Added detailed Gemini provider testing documentation
- Created GitHub issues with comprehensive debugging information
- Documented proxy architecture and response flow

## [1.7.0] - 2025-01-24

### 🎉 Major Release: AgentDB Integration & Memory Optimization

**100% backwards compatible** - All existing code continues to work.

### Added

#### AgentDB Integration
- **Proper Dependency**: Integrated AgentDB v1.3.9 as npm dependency (replaced embedded code)
- **29 MCP Tools**: Full Claude Desktop integration via Model Context Protocol
  - 5 core vector DB tools (init, insert, batch, search, delete)
  - 5 core AgentDB tools (stats, pattern store/search, cache management)
  - 9 frontier memory tools (reflexion, skills, causal memory)
  - 10 RL learning system tools (9 algorithms)
- **Hybrid ReasoningBank**: Combined Rust WASM (compute) + AgentDB TypeScript (storage)
  - 10x faster similarity computation with WASM
  - Persistent SQLite storage
  - Automatic backend selection
- **Advanced Memory System**: High-level memory operations
  - Auto-consolidation (patterns → skills)
  - Episodic replay (learn from failures)
  - Causal "what-if" analysis
  - Skill composition planning

#### Memory Optimizations
- **Shared Memory Pool**: Singleton architecture for multi-agent systems
  - Single SQLite connection (vs multiple per agent)
  - Single embedding model instance (vs ~150MB per agent)
  - LRU query cache (1000 entries, 60s TTL)
  - LRU embedding cache (10K entries)
  - **Result**: 56% memory reduction (800MB → 350MB for 4 agents)

#### Performance Features
- **HNSW Indexing**: 116x faster vector search (580ms → 5ms @ 100K vectors)
- **Batch Operations**: 141x faster inserts (14.1s → 100ms for 1000)
- **Query Caching**: 90%+ hit rate on repeated queries
- **Optimized SQLite**: WAL mode, 64MB cache, 256MB mmap

### Changed

#### Internal Architecture (No Breaking Changes)
- Replaced embedded AgentDB copy (400KB) with npm dependency
- All imports maintained via re-exports for backwards compatibility
- Updated build process to include new modules
- Version bumped to 1.7.0

#### Performance Improvements
- Bundle size reduced by 400KB (5.2MB → 4.8MB, -7.7%)
- Memory usage reduced by 56% (800MB → 350MB for 4 agents)
- Vector search 116x faster (580ms → 5ms @ 100K vectors)
- Batch operations 141x faster (14.1s → 100ms for 1000 inserts)
- Cold start 65% faster (3.5s → 1.2s)

### Fixed
- Memory leaks in multi-agent scenarios (via SharedMemoryPool)
- Inefficient embedding recomputation (via caching)
- Slow vector search (via HNSW indexing)

### Deprecated (Soft - Still Work)

#### Import Paths (Still Functional)
```typescript
// ⚠️ Soft deprecated (works but not recommended)
import { ReflexionMemory } from 'agentic-flow/agentdb';

// ✅ Recommended (better tree-shaking)
import { ReflexionMemory } from 'agentdb/controllers';
```

#### Multiple DB Connections (Still Functional)
```typescript
// ⚠️ Soft deprecated (works but inefficient)
const db = new Database('./agent.db');

// ✅ Recommended (shared resources)
import { SharedMemoryPool } from 'agentic-flow/memory';
const pool = SharedMemoryPool.getInstance();
```

### Migration Guide

See [MIGRATION_v1.7.0.md](./MIGRATION_v1.7.0.md) for detailed migration instructions.

**TLDR**: Just upgrade - everything works!
```bash
npm install agentic-flow@^1.7.0
```

### Documentation

- [Integration Plan](./docs/AGENTDB_INTEGRATION_PLAN.md)
- [Migration Guide](./MIGRATION_v1.7.0.md)
- [GitHub Issue #34](https://github.com/ruvnet/agentic-flow/issues/34)

### Contributors

- @ruvnet - Integration, optimization, and testing

---

## [1.6.4] - 2024-01-20

### Fixed
- Bug fixes and stability improvements

## [1.6.3] - 2024-01-18

### Added
- Enhanced agent coordination
- Improved error handling

## [1.6.0] - 2024-01-15

### Added
- 66 specialized agents
- 213 MCP tools
- ReasoningBank learning memory
- GitHub integration

---

For older versions, see git history: `git log --oneline`
