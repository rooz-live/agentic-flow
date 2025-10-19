# AgentDB MCP Server Setup for Claude Code

## Quick Setup

Add AgentDB to Claude Code using the MCP configuration command:

```bash
claude mcp add agentdb npx agentdb@1.0.5 mcp
```

This will configure Claude Code to use AgentDB's MCP server with all 20 tools (10 core + 10 learning tools).

## Manual Configuration

Alternatively, you can manually add AgentDB to your Claude Code MCP configuration file:

### Location

- **macOS/Linux:** `~/.config/claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

### Configuration

Add this to your `mcpServers` section:

```json
{
  "mcpServers": {
    "agentdb": {
      "command": "npx",
      "args": ["agentdb@1.0.5", "mcp"]
    }
  }
}
```

### Full Example Configuration

```json
{
  "mcpServers": {
    "agentdb": {
      "command": "npx",
      "args": ["agentdb@1.0.5", "mcp"],
      "env": {
        "NODE_ENV": "production"
      }
    },
    "agentic-flow": {
      "command": "npx",
      "args": ["agentic-flow@1.6.6", "mcp:stdio"]
    }
  }
}
```

## Verify Installation

1. **Restart Claude Code** after adding the configuration

2. **Check available tools** - AgentDB should expose 20 tools:

   **Core AgentDB Tools (10):**
   - `agentdb_init` - Initialize vector database
   - `agentdb_insert` - Insert single vector
   - `agentdb_insert_batch` - Batch insert vectors
   - `agentdb_search` - Similarity search
   - `agentdb_delete` - Delete vector by ID
   - `agentdb_stats` - Database statistics
   - `agentdb_pattern_store` - Store reasoning pattern
   - `agentdb_pattern_search` - Search patterns
   - `agentdb_pattern_stats` - Pattern statistics
   - `agentdb_clear_cache` - Clear query cache

   **Learning Tools (10):**
   - `learning_start_session` - Start learning session
   - `learning_end_session` - End learning session
   - `learning_predict` - Predict best action
   - `learning_feedback` - Provide feedback
   - `learning_train` - Train policy
   - `learning_metrics` - Get metrics
   - `learning_transfer` - Transfer learning
   - `learning_explain` - Explain predictions
   - `experience_record` - Record experience
   - `reward_signal` - Calculate reward

3. **Test with a simple command:**

   Ask Claude Code: "Initialize an AgentDB database and insert a test vector"

   Claude should use the `agentdb_init` and `agentdb_insert` tools automatically.

## Usage Examples

### Example 1: Vector Search

```
User: "Create a vector database, insert 5 random vectors, then search for similar ones"

Claude will:
1. Call agentdb_init
2. Call agentdb_insert (5 times)
3. Call agentdb_search
4. Show results
```

### Example 2: Learning Session

```
User: "Start a learning session for coding tasks and record some tool executions"

Claude will:
1. Call learning_start_session
2. Call experience_record for tool uses
3. Call learning_metrics to show progress
4. Call learning_end_session
```

### Example 3: Pattern Storage

```
User: "Store a successful code review pattern in AgentDB"

Claude will:
1. Call agentdb_init
2. Call agentdb_pattern_store with the pattern
3. Later use agentdb_pattern_search to find similar patterns
```

## Advanced Configuration

### With Custom Database Path

```json
{
  "mcpServers": {
    "agentdb": {
      "command": "npx",
      "args": ["agentdb@1.0.5", "mcp"],
      "env": {
        "AGENTDB_PATH": "/path/to/your/database.db",
        "AGENTDB_BACKEND": "native"
      }
    }
  }
}
```

### With Debugging

```json
{
  "mcpServers": {
    "agentdb": {
      "command": "npx",
      "args": ["agentdb@1.0.5", "mcp"],
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "agentdb:*"
      }
    }
  }
}
```

## Troubleshooting

### MCP Server Not Appearing

1. Check the config file location is correct
2. Ensure valid JSON syntax (no trailing commas)
3. Restart Claude Code completely
4. Check Claude Code logs: `~/.claude/logs/`

### Tools Not Working

1. Verify npx can run agentdb:
   ```bash
   npx agentdb@1.0.5 --version
   ```

2. Test MCP server manually:
   ```bash
   npx agentdb@1.0.5 mcp
   ```

3. Check Node.js version (requires Node 18+):
   ```bash
   node --version
   ```

### Permission Errors

If you get permission errors, ensure npx cache is accessible:
```bash
npm cache clean --force
npx agentdb@1.0.5 --version
```

## Combining with Agentic-Flow

You can use both AgentDB and Agentic-Flow together:

```json
{
  "mcpServers": {
    "agentdb": {
      "command": "npx",
      "args": ["agentdb@1.0.5", "mcp"]
    },
    "agentic-flow": {
      "command": "npx",
      "args": ["agentic-flow@1.6.6", "mcp:stdio"]
    }
  }
}
```

This gives Claude Code access to:
- **20 AgentDB tools** (vector DB + learning)
- **213+ Agentic-Flow tools** (66 agents + coordination)
- **Total: 233+ MCP tools**

## Features Available in Claude Code

Once configured, Claude Code can:

✅ **Store Agent Memory**
- Save conversation context as vectors
- Search past interactions by similarity
- Build knowledge base over time

✅ **Learn from Experience**
- Start learning sessions
- Record successful/failed actions
- Get AI-recommended actions
- Train policies on experience

✅ **Pattern Recognition**
- Store successful reasoning patterns
- Search for similar problem solutions
- Transfer knowledge between tasks

✅ **High-Performance Search**
- 768-dimensional vector search
- Cosine, Euclidean, Dot product metrics
- HNSW index for fast retrieval
- Query caching (50-100x speedup)

## Resources

- **Documentation:** https://agentdb.ruv.io
- **npm Package:** https://www.npmjs.com/package/agentdb
- **GitHub:** https://github.com/ruvnet/agentic-flow/tree/main/packages/agentdb
- **Browser Examples:** https://github.com/ruvnet/agentic-flow/tree/main/packages/agentdb/examples/browser

## Support

If you encounter issues:

1. Check the [troubleshooting section](#troubleshooting) above
2. Open an issue: https://github.com/ruvnet/agentic-flow/issues
3. Join discussions: https://github.com/ruvnet/agentic-flow/discussions

---

**Last Updated:** October 18, 2025
**AgentDB Version:** 1.0.5
**Claude Code Compatibility:** ✅ Tested and Working
