# AgentDB v1.0.3 Release Notes

**Release Date:** October 18, 2025
**Package:** agentdb@1.0.3
**Status:** ✅ Published to npm
**npm URL:** https://www.npmjs.com/package/agentdb

## 🐛 Bug Fix Release

This is a quick patch release that fixes a CLI usability issue discovered in v1.0.2.

## What's Fixed

### CLI Version Flag Support

Previously, only the `version` command worked to display version information:
```bash
npx agentdb version  # ✅ Worked
npx agentdb --version  # ❌ Error: Unknown command
npx agentdb -v  # ❌ Error: Unknown command
```

Now all three methods work correctly:
```bash
npx agentdb version  # ✅ Works
npx agentdb --version  # ✅ Now works!
npx agentdb -v  # ✅ Now works!
```

**Output:**
```
agentdb v1.0.3
Node: v22.17.0
Platform: linux x64
```

## Technical Changes

- **File Modified:** `bin/agentdb.js`
- **Lines Changed:** 5 lines added (689-693)
- **Change:** Added version flag check (`--version` and `-v`) before command routing

**Code Change:**
```javascript
// Added after command extraction (line 689-693)
if (command === '--version' || command === '-v') {
  showVersion();
  process.exit(0);
}
```

## Migration from v1.0.2

No migration needed! This is a backward-compatible bug fix. Simply upgrade:

```bash
npm install agentdb@1.0.3
```

All v1.0.2 features remain unchanged:
- ✅ 10 MCP learning tools
- ✅ Q-learning with experience replay
- ✅ Multi-dimensional reward system
- ✅ Transfer learning
- ✅ All documentation and examples

## Changelog Entry

```markdown
## [1.0.3] - 2025-10-18

### Fixed
- CLI now properly recognizes `--version` and `-v` flags
- Added version flag handling in bin/agentdb.js before command routing
```

## Package Stats

- **Version:** 1.0.3
- **Size:** ~2.5MB (includes WASM files)
- **Files:** 200+ distributed files
- **Dependencies:** Minimal, well-maintained
- **License:** MIT OR Apache-2.0

## All Features (v1.0.2 + v1.0.3)

### Core Features
- Ultra-fast vector database built on SQLite
- ReasoningBank integration for AI agents
- QUIC sync support for distributed operations
- HNSW index for fast similarity search
- Browser WASM backend support
- Native backend with better-sqlite3

### MCP Learning Tools (v1.0.2)
1. **`learning_start_session`** - Start adaptive learning sessions
2. **`learning_end_session`** - End sessions and save policies
3. **`learning_predict`** - Get AI-recommended actions with confidence
4. **`learning_feedback`** - Provide user feedback to refine learning
5. **`learning_train`** - Train policies on collected experiences
6. **`learning_metrics`** - Get performance metrics and progress
7. **`learning_transfer`** - Transfer knowledge between similar tasks
8. **`learning_explain`** - Get explanations for recommendations
9. **`experience_record`** - Record tool executions as experiences
10. **`reward_signal`** - Calculate multi-dimensional rewards

### CLI Improvements
- **v1.0.1:** Concise help system with command-specific subhelps
- **v1.0.1:** Support for `--help` and `-h` flags on all commands
- **v1.0.3:** Support for `--version` and `-v` flags ✨ **NEW**

## Documentation

Complete documentation available:
1. **[MCP_LEARNING_INTEGRATION.md](./MCP_LEARNING_INTEGRATION.md)** - Complete integration guide
2. **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Technical details
3. **[MCP_TOOLS_VERIFICATION_REPORT.md](./MCP_TOOLS_VERIFICATION_REPORT.md)** - Verification results
4. **[RELEASE_v1.0.2.md](./RELEASE_v1.0.2.md)** - v1.0.2 release notes
5. **[Example Implementation](../examples/mcp-learning-example.ts)** - Working example

## Quick Start

### Installation

```bash
npm install agentdb@1.0.3
```

### Check Version

```bash
# All three methods work:
npx agentdb version
npx agentdb --version
npx agentdb -v
```

### Basic Usage

```typescript
import { SQLiteVectorDB } from 'agentdb';

// Initialize database
const db = new SQLiteVectorDB({ path: './agents.db' });

// Insert vectors
await db.insert({
  embedding: Array(768).fill(0).map(() => Math.random()),
  metadata: { type: 'document', id: '123' }
});

// Search
const results = await db.search(queryVector, 5);
```

### MCP Server

```bash
# Start MCP server for Claude Code integration
npx agentdb mcp
```

## Credits

Developed by the AgentDB team as part of the agentic-flow project.

**Author:** rUv (@ruvnet)
**Repository:** https://github.com/ruvnet/agentic-flow
**Website:** https://agentdb.ruv.io

## Support

- **Issues:** https://github.com/ruvnet/agentic-flow/issues
- **Discussions:** https://github.com/ruvnet/agentic-flow/discussions
- **Documentation:** https://agentdb.ruv.io
- **npm:** https://www.npmjs.com/package/agentdb

---

**Published:** October 18, 2025
**License:** MIT OR Apache-2.0
**Status:** ✅ Production Ready
