# SQLite Vector CLI Help Guide

Complete reference for the SQLite Vector command-line interface with comprehensive subsections.

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Command Categories](#command-categories)
3. [Detailed Command Reference](#detailed-command-reference)
4. [Configuration](#configuration)
5. [Examples](#examples)
6. [Troubleshooting](#troubleshooting)

---

## Quick Reference

### Most Common Commands

```bash
# Show comprehensive help
npx agentdb help

# Create a plugin
npx agentdb create-plugin

# List available templates
npx agentdb list-templates

# Initialize database
npx agentdb init ./vectors.db

# Run benchmarks
npx agentdb benchmark
```

### Help System Navigation

The `help` command shows 9 organized sections:

1. **Core Commands** - Basic operations (help, version, mcp)
2. **Plugin Commands** - Learning plugin management
3. **Database Commands** - Database operations (init, import, export)
4. **Advanced Commands** - Advanced features (optimize, train, deploy)
5. **Examples** - Common usage patterns
6. **Templates** - Available plugin templates with descriptions
7. **Configuration** - Configuration guide and options
8. **Troubleshooting** - Common issues and solutions
9. **Resources** - Documentation and community links

---

## Command Categories

### Core Commands

- `help` - Display comprehensive help
- `version` - Show version information
- `mcp` - Start MCP server for Claude Code integration

### Plugin Commands

- `create-plugin` - Create new learning plugin with wizard
- `list-plugins` - List all available plugins
- `list-templates` - List available plugin templates
- `plugin-info` - Get information about a specific plugin
- `use-plugin` - Load and use a plugin
- `test-plugin` - Test a plugin
- `validate-plugin` - Validate plugin configuration

### Database Commands

- `init` - Initialize new vector database
- `import` - Import vectors from file
- `export` - Export vectors to file
- `query` - Query vector database
- `stats` - Show database statistics

### Advanced Commands

- `benchmark` - Run performance benchmarks
- `optimize` - Optimize database performance
- `repl` - Start interactive REPL (experimental)
- `train` - Train a learning plugin
- `deploy` - Deploy plugin to production

---

## Detailed Command Reference

### help [command]

Display comprehensive help information with organized subsections.

**Usage:**
```bash
npx agentdb help
npx agentdb help create-plugin
npx agentdb <command> --help
```

**Features:**
- 9 organized sections for easy navigation
- Color-coded output for readability
- Quick reference examples
- Links to detailed documentation

---

### create-plugin [options]

Create a new learning plugin with interactive wizard or from template.

**Usage:**
```bash
# Interactive wizard (recommended)
npx agentdb create-plugin

# Quick creation from template
npx agentdb create-plugin -t q-learning -n my-q --no-customize

# With custom output directory
npx agentdb create-plugin -o ./custom-plugins
```

**Options:**
- `-t, --template <name>` - Use a template (decision-transformer, q-learning, sarsa, actor-critic)
- `-n, --name <name>` - Plugin name (lowercase, hyphens only)
- `--no-customize` - Skip customization (use template defaults)
- `-o, --output <dir>` - Output directory (default: ./plugins)
- `--force` - Overwrite existing plugin
- `--dry-run` - Show what would be generated

**Generated Structure:**
```
plugins/my-plugin/
├── plugin.yaml        # Configuration
├── README.md          # Documentation
├── package.json       # Dependencies
├── tsconfig.json      # TypeScript config
├── src/
│   ├── index.ts      # Plugin implementation
│   ├── agent.ts      # Learning algorithm
│   ├── reward.ts     # Reward function
│   └── policy.ts     # Action selection
└── tests/
    └── plugin.test.ts # Unit tests
```

**Examples:**
```bash
# Create Q-Learning plugin
npx agentdb create-plugin -t q-learning -n trading-agent

# Create Decision Transformer plugin
npx agentdb create-plugin -t decision-transformer -n code-gen-agent

# Create with wizard for custom configuration
npx agentdb create-plugin
```

---

### list-templates [options]

List all available plugin templates with descriptions.

**Usage:**
```bash
npx agentdb list-templates
npx agentdb list-templates --detailed
npx agentdb list-templates --category reinforcement-learning
npx agentdb list-templates --json
```

**Options:**
- `-d, --detailed` - Show detailed information
- `-c, --category <name>` - Filter by category
- `--json` - Output as JSON

**Available Templates:**

1. **decision-transformer** (Recommended) ⭐⭐⭐⭐⭐
   - Sequence modeling for sequential tasks
   - 5x better sample efficiency than Q-learning
   - Best for code generation, dialogue systems

2. **q-learning** ⭐⭐⭐
   - Model-free value-based learning
   - Good for discrete action spaces
   - Well-established algorithm

3. **sarsa** ⭐⭐⭐
   - On-policy Q-learning variant
   - More conservative than Q-learning
   - Good for safe exploration

4. **actor-critic** ⭐⭐⭐⭐
   - Policy gradient + value function
   - Good for continuous actions
   - Stable training

5. **curiosity-driven** ⭐⭐⭐⭐
   - Intrinsic motivation for exploration
   - Best for sparse reward environments
   - Exploration bonus based on prediction error

---

### init <path> [options]

Initialize a new vector database.

**Usage:**
```bash
npx agentdb init ./vectors.db
npx agentdb init ./vectors.db --dimension 1536
npx agentdb init ./vectors.db --preset large
```

**Options:**
- `--dimension <number>` - Vector dimension (default: 1536)
- `--preset <name>` - Use preset: small, medium, large
- `--hnsw` - Enable HNSW index (default: true)
- `--quantization <bits>` - Quantization: 8, 16, or none
- `--in-memory` - Create in-memory database
- `--read-only` - Open in read-only mode

**Examples:**
```bash
# Standard initialization
npx agentdb init ./embeddings.db --dimension 768

# Large dataset with optimizations
npx agentdb init ./large.db --preset large --quantization 8

# In-memory for testing
npx agentdb init :memory: --in-memory
```

---

### mcp [options]

Start Model Context Protocol (MCP) server for Claude Code integration.

**Usage:**
```bash
npx agentdb mcp
npx agentdb mcp --port 3000
npx agentdb mcp --log debug
```

**Options:**
- `--port <number>` - Port to listen on (default: 3000)
- `--host <string>` - Host to bind to (default: localhost)
- `--log <level>` - Log level: debug, info, warn, error
- `--cors` - Enable CORS
- `--auth <token>` - API authentication token

**Claude Desktop Integration:**

Add to `~/.config/claude/config.json`:
```json
{
  "mcpServers": {
    "agentdb": {
      "command": "npx",
      "args": ["agentdb", "mcp"]
    }
  }
}
```

---

### test-plugin <name> [options]

Test a plugin with optional coverage and benchmarks.

**Usage:**
```bash
npx agentdb test-plugin my-plugin
npx agentdb test-plugin my-plugin --coverage
npx agentdb test-plugin my-plugin --benchmark
```

**Options:**
- `--coverage` - Generate coverage report
- `--benchmark` - Run performance benchmarks
- `-v, --verbose` - Verbose output
- `--watch` - Watch mode

**Test Coverage:**
- Plugin loads successfully
- Configuration is valid
- Experience storage works
- Action selection works
- Training completes
- Metrics are tracked

---

### benchmark [options]

Run performance benchmarks on database or plugin.

**Usage:**
```bash
npx agentdb benchmark
npx agentdb benchmark --suite insertion
npx agentdb benchmark --output report.json
```

**Options:**
- `--suite <name>` - Benchmark suite: insertion, search, all
- `--size <number>` - Dataset size (default: 10000)
- `--dimension <number>` - Vector dimension (default: 1536)
- `--output <file>` - Save results to file
- `--compare <file>` - Compare with previous results

**Benchmark Suites:**
- **insertion** - Test insertion performance
- **search** - Test search performance (exact, HNSW)
- **all** - Complete benchmark suite

---

## Configuration

### Environment Variables

```bash
# Database path
export SQLITE_VECTOR_DB_PATH=./vectors.db

# Log level
export SQLITE_VECTOR_LOG_LEVEL=debug

# Cache size (MB)
export SQLITE_VECTOR_CACHE_SIZE=100

# Worker threads
export SQLITE_VECTOR_WORKERS=4
```

### Configuration Files

**Global Configuration:**
`~/.agentdb/config.yaml`

**Project Configuration:**
`./.agentdb/config.yaml`

**Plugin Configuration:**
`./plugins/<name>/plugin.yaml`

### Configuration Precedence

1. Command-line arguments (highest priority)
2. Environment variables
3. Project config
4. Global config
5. Default values (lowest priority)

---

## Examples

### Example 1: Quick Plugin Setup

```bash
# Create Q-Learning plugin
npx agentdb create-plugin -t q-learning -n my-q-agent --no-customize

# Navigate and install
cd plugins/my-q-agent && npm install

# Test the plugin
npm test
```

### Example 2: Database Workflow

```bash
# Initialize database
npx agentdb init ./data/vectors.db --dimension 768

# Import vectors
npx agentdb import embeddings.json --db ./data/vectors.db

# Query database
npx agentdb query ./data/vectors.db --text "search query" --k 10

# Export results
npx agentdb export ./data/vectors.db -o results.json
```

### Example 3: Custom Plugin

```bash
# Create with wizard
npx agentdb create-plugin
# Select: Decision Transformer
# Custom reward: Time + token penalty

# Install and test
cd plugins/my-custom-plugin
npm install && npm test

# Use in code
npx agentdb use-plugin my-custom-plugin
```

### Example 4: Production Deployment

```bash
# Train plugin
npx agentdb train my-plugin --data ./training.json --epochs 100

# Validate
npx agentdb validate-plugin my-plugin --strict

# Deploy
npx agentdb deploy my-plugin --env production --tag v1.0.0
```

---

## Troubleshooting

### Common Issues

#### Plugin Creation Fails

**Problem:** Plugin creation fails with dependency errors

**Solution:**
```bash
# Check Node version
node --version  # Should be >= 18

# Update npm
npm install -g npm@latest

# Clear cache
npm cache clean --force
```

#### Database Locked

**Problem:** "Database is locked" error

**Solution:**
```bash
# Use WAL mode
npx agentdb optimize ./vectors.db --mode wal

# Check for other connections
lsof ./vectors.db
```

#### Out of Memory During Training

**Problem:** OOM error during plugin training

**Solution:**
In `plugin.yaml`:
```yaml
training:
  batch_size: 16  # Reduce from 32

storage:
  quantization:
    enabled: true
    bits: 8
```

#### Slow Search Performance

**Problem:** Queries are slow

**Solution:**
```bash
# Rebuild HNSW index
npx agentdb optimize ./vectors.db --rebuild-index

# Check statistics
npx agentdb stats ./vectors.db --detailed
```

### Debug Mode

Enable verbose logging:
```bash
# Environment variable
DEBUG=agentdb:* npx agentdb <command>

# Command option
npx agentdb <command> --verbose --log-level debug
```

### Getting Help

- **Report Issues:** https://github.com/ruvnet/agentic-flow/issues
- **View Logs:** `~/.agentdb/logs/`
- **Check Status:** `npx agentdb version`

---

## Resources

### Documentation

- **Plugin Quick Start:** `docs/PLUGIN_QUICKSTART.md`
- **API Reference:** `docs/PLUGIN_API.md`
- **Architecture Design:** `docs/LEARNING_PLUGIN_DESIGN.md`
- **Decision Transformer:** `docs/DECISION_TRANSFORMER.md`
- **Performance Benchmarks:** `docs/RL_BENCHMARKS.md`

### Online Resources

- **GitHub:** https://github.com/ruvnet/agentic-flow
- **Issues:** https://github.com/ruvnet/agentic-flow/issues
- **Wiki:** https://github.com/ruvnet/agentic-flow/wiki
- **Discussions:** https://github.com/ruvnet/agentic-flow/discussions

### Community

- **Discord:** https://discord.gg/agentic-flow
- **Twitter:** @agentic_flow
- **Stack Overflow:** Tag: agentdb

---

## License

MIT OR Apache-2.0

## Contributing

Contributions welcome! See CONTRIBUTING.md for guidelines.
