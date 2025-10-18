#!/usr/bin/env node
/**
 * Comprehensive Help System for SQLite Vector CLI
 * Organized with subsections for easy navigation
 */

import chalk from 'chalk';

const version = '1.0.0'; // Will be replaced with actual version

/**
 * Main help display with subsections
 */
export function showComprehensiveHelp(): void {
  console.log(getHelpContent());
}

/**
 * Get the complete help content
 */
export function getHelpContent(): string {
  return `
${getBanner()}

${getQuickStart()}

${getTableOfContents()}

${getCoreCommands()}

${getPluginCommands()}

${getDatabaseCommands()}

${getAdvancedCommands()}

${getExamples()}

${getTemplates()}

${getConfigurationGuide()}

${getTroubleshooting()}

${getResourcesAndDocumentation()}

${getFooter()}
`;
}

/**
 * ASCII Art Banner
 */
function getBanner(): string {
  return chalk.cyan.bold(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║   █▀█ █▀▀ █▀▀ █▄░█ ▀█▀ █▀▄ █▄▄                                         ║
║   █▀█ █▄█ ██▄ █░▀█ ░█░ █▄▀ █▄█                                         ║
║                                                                           ║
║   Agent Memory & Vector Database with ReasoningBank                      ║
║   Version ${version.padEnd(62)}║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);
}

/**
 * Quick Start Section
 */
function getQuickStart(): string {
  return `
${chalk.yellow.bold('━━━ QUICK START ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}

${chalk.cyan('Get started in 30 seconds:')}

  ${chalk.gray('1.')} Create a learning plugin
     ${chalk.yellow('$ npx agentdb create-plugin')}

  ${chalk.gray('2.')} Initialize a vector database
     ${chalk.yellow('$ npx agentdb init ./my-vectors.db')}

  ${chalk.gray('3.')} Run performance benchmarks
     ${chalk.yellow('$ npx agentdb benchmark')}

  ${chalk.gray('4.')} Start MCP server for Claude Code
     ${chalk.yellow('$ npx agentdb mcp')}

${chalk.cyan('Need help?')} Run any command with ${chalk.yellow('--help')} for detailed information.
`;
}

/**
 * Table of Contents
 */
function getTableOfContents(): string {
  return `
${chalk.yellow.bold('━━━ TABLE OF CONTENTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}

  ${chalk.cyan('1.')} Core Commands ..................... Basic operations
  ${chalk.cyan('2.')} Plugin Commands ................... Learning plugin management
  ${chalk.cyan('3.')} Database Commands ................. Database operations
  ${chalk.cyan('4.')} Advanced Commands ................. Advanced features
  ${chalk.cyan('5.')} Examples .......................... Common usage patterns
  ${chalk.cyan('6.')} Templates ......................... Available plugin templates
  ${chalk.cyan('7.')} Configuration ..................... Configuration guide
  ${chalk.cyan('8.')} Troubleshooting ................... Common issues & solutions
  ${chalk.cyan('9.')} Resources ......................... Documentation & links
`;
}

/**
 * Section 1: Core Commands
 */
function getCoreCommands(): string {
  return `
${chalk.yellow.bold('━━━ 1. CORE COMMANDS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}

${chalk.cyan.bold('help')} [command]
  ${chalk.gray('Show this help message or help for a specific command')}

  ${chalk.yellow('$ npx agentdb help')}
  ${chalk.yellow('$ npx agentdb help create-plugin')}
  ${chalk.yellow('$ npx agentdb create-plugin --help')}

${chalk.cyan.bold('version')}
  ${chalk.gray('Display version information')}

  ${chalk.yellow('$ npx agentdb version')}

  ${chalk.gray('Output:')}
  ${chalk.gray('  agentdb v1.0.0')}
  ${chalk.gray('  Node: v20.10.0')}
  ${chalk.gray('  Platform: linux x64')}

${chalk.cyan.bold('mcp')} [options]
  ${chalk.gray('Start Model Context Protocol (MCP) server for Claude Code integration')}

  ${chalk.yellow('$ npx agentdb mcp')}
  ${chalk.yellow('$ npx agentdb mcp --port 3000')}
  ${chalk.yellow('$ npx agentdb mcp --log debug')}

  ${chalk.gray('Options:')}
    ${chalk.cyan('--port <number>')}     Port to listen on (default: 3000)
    ${chalk.cyan('--host <string>')}     Host to bind to (default: localhost)
    ${chalk.cyan('--log <level>')}       Log level: debug, info, warn, error
    ${chalk.cyan('--cors')}              Enable CORS
    ${chalk.cyan('--auth <token>')}      API authentication token

  ${chalk.gray('Claude Desktop Integration:')}
  ${chalk.gray('Add to ~/.config/claude/config.json:')}
  ${chalk.blue(`{
    "mcpServers": {
      "agentdb": {
        "command": "npx",
        "args": ["agentdb", "mcp"]
      }
    }
  }`)}
`;
}

/**
 * Section 2: Plugin Commands
 */
function getPluginCommands(): string {
  return `
${chalk.yellow.bold('━━━ 2. PLUGIN COMMANDS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}

${chalk.cyan.bold('create-plugin')} [options]
  ${chalk.gray('Create a new learning plugin with interactive wizard')}
  ${chalk.gray('Supports Decision Transformer, Q-Learning, SARSA, Actor-Critic, and more')}

  ${chalk.yellow('$ npx agentdb create-plugin')}
  ${chalk.yellow('$ npx agentdb create-plugin --template q-learning --name my-q')}
  ${chalk.yellow('$ npx agentdb create-plugin -t decision-transformer -n my-dt --no-customize')}

  ${chalk.gray('Options:')}
    ${chalk.cyan('-t, --template <name>')}    Use a template (see list-templates)
    ${chalk.cyan('-n, --name <name>')}        Plugin name (lowercase, hyphens only)
    ${chalk.cyan('--no-customize')}           Skip customization (use defaults)
    ${chalk.cyan('-o, --output <dir>')}       Output directory (default: ./plugins)
    ${chalk.cyan('--force')}                  Overwrite existing plugin
    ${chalk.cyan('--dry-run')}                Show what would be generated

  ${chalk.gray('Generated Structure:')}
  ${chalk.blue(`plugins/my-plugin/
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
      └── plugin.test.ts # Unit tests`)}

${chalk.cyan.bold('list-plugins')} [options]
  ${chalk.gray('List all available plugins')}

  ${chalk.yellow('$ npx agentdb list-plugins')}
  ${chalk.yellow('$ npx agentdb list-plugins --verbose')}
  ${chalk.yellow('$ npx agentdb list-plugins --filter "q-*"')}

  ${chalk.gray('Options:')}
    ${chalk.cyan('-v, --verbose')}            Show detailed information
    ${chalk.cyan('--filter <pattern>')}       Filter by name pattern
    ${chalk.cyan('--sort <field>')}           Sort by: name, version, created
    ${chalk.cyan('--json')}                   Output as JSON

${chalk.cyan.bold('list-templates')} [options]
  ${chalk.gray('List all available plugin templates')}

  ${chalk.yellow('$ npx agentdb list-templates')}
  ${chalk.yellow('$ npx agentdb list-templates --detailed')}
  ${chalk.yellow('$ npx agentdb list-templates --category reinforcement-learning')}

  ${chalk.gray('Options:')}
    ${chalk.cyan('-d, --detailed')}           Show detailed information
    ${chalk.cyan('-c, --category <name>')}    Filter by category
    ${chalk.cyan('--json')}                   Output as JSON

${chalk.cyan.bold('plugin-info')} <name> [options]
  ${chalk.gray('Get information about a specific plugin')}

  ${chalk.yellow('$ npx agentdb plugin-info my-plugin')}
  ${chalk.yellow('$ npx agentdb plugin-info my-plugin --json')}

  ${chalk.gray('Options:')}
    ${chalk.cyan('--json')}                   Output as JSON
    ${chalk.cyan('--metrics')}                Include performance metrics
    ${chalk.cyan('--dependencies')}           Show dependencies

${chalk.cyan.bold('use-plugin')} <name> [options]
  ${chalk.gray('Load and use a plugin in your application')}

  ${chalk.yellow('$ npx agentdb use-plugin my-plugin')}
  ${chalk.yellow('$ npx agentdb use-plugin my-plugin --config custom.yaml')}

  ${chalk.gray('Options:')}
    ${chalk.cyan('-c, --config <file>')}      Custom configuration file
    ${chalk.cyan('-t, --test')}               Run in test mode
    ${chalk.cyan('-v, --verbose')}            Verbose output
    ${chalk.cyan('--interactive')}            Interactive mode (REPL)

${chalk.cyan.bold('test-plugin')} <name> [options]
  ${chalk.gray('Test a plugin')}

  ${chalk.yellow('$ npx agentdb test-plugin my-plugin')}
  ${chalk.yellow('$ npx agentdb test-plugin my-plugin --coverage')}
  ${chalk.yellow('$ npx agentdb test-plugin my-plugin --benchmark')}

  ${chalk.gray('Options:')}
    ${chalk.cyan('--coverage')}               Generate coverage report
    ${chalk.cyan('--benchmark')}              Run performance benchmarks
    ${chalk.cyan('-v, --verbose')}            Verbose output
    ${chalk.cyan('--watch')}                  Watch mode

${chalk.cyan.bold('validate-plugin')} <name> [options]
  ${chalk.gray('Validate plugin configuration and structure')}

  ${chalk.yellow('$ npx agentdb validate-plugin my-plugin')}
  ${chalk.yellow('$ npx agentdb validate-plugin my-plugin --fix')}

  ${chalk.gray('Options:')}
    ${chalk.cyan('--fix')}                    Attempt to fix validation errors
    ${chalk.cyan('--strict')}                 Use strict validation
    ${chalk.cyan('--schema <file>')}          Custom validation schema
`;
}

/**
 * Section 3: Database Commands
 */
function getDatabaseCommands(): string {
  return `
${chalk.yellow.bold('━━━ 3. DATABASE COMMANDS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}

${chalk.cyan.bold('init')} <path> [options]
  ${chalk.gray('Initialize a new vector database')}

  ${chalk.yellow('$ npx agentdb init ./vectors.db')}
  ${chalk.yellow('$ npx agentdb init ./vectors.db --dimension 1536')}
  ${chalk.yellow('$ npx agentdb init ./vectors.db --preset large')}

  ${chalk.gray('Options:')}
    ${chalk.cyan('--dimension <number>')}     Vector dimension (default: 1536)
    ${chalk.cyan('--preset <name>')}          Use preset: small, medium, large
    ${chalk.cyan('--hnsw')}                   Enable HNSW index (default: true)
    ${chalk.cyan('--quantization <bits>')}    Quantization: 8, 16, or none
    ${chalk.cyan('--in-memory')}              Create in-memory database
    ${chalk.cyan('--read-only')}              Open in read-only mode

${chalk.cyan.bold('import')} <file> [options]
  ${chalk.gray('Import vectors from file (JSON, CSV, NPY)')}

  ${chalk.yellow('$ npx agentdb import vectors.json --db ./vectors.db')}
  ${chalk.yellow('$ npx agentdb import embeddings.npy --db ./vectors.db --format npy')}

  ${chalk.gray('Options:')}
    ${chalk.cyan('--db <path>')}              Database path
    ${chalk.cyan('--format <type>')}          Format: json, csv, npy, parquet
    ${chalk.cyan('--batch-size <number>')}    Batch size (default: 1000)
    ${chalk.cyan('--skip-errors')}            Continue on errors

${chalk.cyan.bold('export')} <path> [options]
  ${chalk.gray('Export vectors to file')}

  ${chalk.yellow('$ npx agentdb export ./vectors.db --output vectors.json')}
  ${chalk.yellow('$ npx agentdb export ./vectors.db --format npy -o embeddings.npy')}

  ${chalk.gray('Options:')}
    ${chalk.cyan('-o, --output <file>')}      Output file
    ${chalk.cyan('--format <type>')}          Format: json, csv, npy, parquet
    ${chalk.cyan('--filter <query>')}         Filter condition
    ${chalk.cyan('--limit <number>')}         Limit number of vectors

${chalk.cyan.bold('query')} <database> [options]
  ${chalk.gray('Query vector database')}

  ${chalk.yellow('$ npx agentdb query ./vectors.db --vector "[0.1, 0.2, ...]"')}
  ${chalk.yellow('$ npx agentdb query ./vectors.db --text "search query"')}

  ${chalk.gray('Options:')}
    ${chalk.cyan('--vector <json>')}          Query vector (JSON array)
    ${chalk.cyan('--text <string>')}          Text query (auto-embedded)
    ${chalk.cyan('--k <number>')}             Number of results (default: 5)
    ${chalk.cyan('--threshold <number>')}     Similarity threshold (0-1)
    ${chalk.cyan('--metric <name>')}          Metric: cosine, euclidean, dot

${chalk.cyan.bold('stats')} <database> [options]
  ${chalk.gray('Show database statistics')}

  ${chalk.yellow('$ npx agentdb stats ./vectors.db')}
  ${chalk.yellow('$ npx agentdb stats ./vectors.db --detailed')}

  ${chalk.gray('Options:')}
    ${chalk.cyan('--detailed')}               Show detailed statistics
    ${chalk.cyan('--json')}                   Output as JSON
`;
}

/**
 * Section 4: Advanced Commands
 */
function getAdvancedCommands(): string {
  return `
${chalk.yellow.bold('━━━ 4. ADVANCED COMMANDS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}

${chalk.cyan.bold('benchmark')} [options]
  ${chalk.gray('Run performance benchmarks')}

  ${chalk.yellow('$ npx agentdb benchmark')}
  ${chalk.yellow('$ npx agentdb benchmark --suite insertion')}
  ${chalk.yellow('$ npx agentdb benchmark --output report.json')}

  ${chalk.gray('Options:')}
    ${chalk.cyan('--suite <name>')}           Benchmark suite: insertion, search, all
    ${chalk.cyan('--size <number>')}          Dataset size (default: 10000)
    ${chalk.cyan('--dimension <number>')}     Vector dimension (default: 1536)
    ${chalk.cyan('--output <file>')}          Save results to file
    ${chalk.cyan('--compare <file>')}         Compare with previous results

${chalk.cyan.bold('optimize')} <database> [options]
  ${chalk.gray('Optimize database performance')}

  ${chalk.yellow('$ npx agentdb optimize ./vectors.db')}
  ${chalk.yellow('$ npx agentdb optimize ./vectors.db --rebuild-index')}

  ${chalk.gray('Options:')}
    ${chalk.cyan('--rebuild-index')}          Rebuild HNSW index
    ${chalk.cyan('--vacuum')}                 Vacuum database
    ${chalk.cyan('--analyze')}                Update statistics
    ${chalk.cyan('--compact')}                Compact database

${chalk.cyan.bold('repl')} [options]
  ${chalk.gray('Start interactive REPL (experimental)')}

  ${chalk.yellow('$ npx agentdb repl')}
  ${chalk.yellow('$ npx agentdb repl --db ./vectors.db')}

  ${chalk.gray('Options:')}
    ${chalk.cyan('--db <path>')}              Load database on startup
    ${chalk.cyan('--history')}                Enable command history
    ${chalk.cyan('--plugin <name>')}          Load plugin

${chalk.cyan.bold('train')} <plugin> [options]
  ${chalk.gray('Train a learning plugin')}

  ${chalk.yellow('$ npx agentdb train my-plugin')}
  ${chalk.yellow('$ npx agentdb train my-plugin --data ./training.json')}

  ${chalk.gray('Options:')}
    ${chalk.cyan('--data <file>')}            Training data file
    ${chalk.cyan('--epochs <number>')}        Number of epochs (default: 10)
    ${chalk.cyan('--batch-size <number>')}    Batch size (default: 32)
    ${chalk.cyan('--checkpoint <dir>')}       Save checkpoints
    ${chalk.cyan('--wandb')}                  Log to Weights & Biases

${chalk.cyan.bold('deploy')} <plugin> [options]
  ${chalk.gray('Deploy plugin to production')}

  ${chalk.yellow('$ npx agentdb deploy my-plugin')}
  ${chalk.yellow('$ npx agentdb deploy my-plugin --env production')}

  ${chalk.gray('Options:')}
    ${chalk.cyan('--env <name>')}             Environment: dev, staging, production
    ${chalk.cyan('--registry <url>')}         Plugin registry URL
    ${chalk.cyan('--tag <version>')}          Version tag
`;
}

/**
 * Section 5: Examples
 */
function getExamples(): string {
  return `
${chalk.yellow.bold('━━━ 5. EXAMPLES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}

${chalk.cyan.bold('Example 1: Quick Plugin Setup')}
  ${chalk.gray('# Create Q-Learning plugin')}
  ${chalk.yellow('$ npx agentdb create-plugin -t q-learning -n my-q-agent --no-customize')}

  ${chalk.gray('# Navigate and install')}
  ${chalk.yellow('$ cd plugins/my-q-agent && npm install')}

  ${chalk.gray('# Test the plugin')}
  ${chalk.yellow('$ npm test')}

${chalk.cyan.bold('Example 2: Custom Reward Function')}
  ${chalk.gray('# Create plugin with wizard')}
  ${chalk.yellow('$ npx agentdb create-plugin')}
  ${chalk.gray('  ? Base algorithm: Decision Transformer')}
  ${chalk.gray('  ? Reward function: Custom')}
  ${chalk.gray('  ? Enter reward function:')}
  ${chalk.blue(`    function computeReward(outcome, context) {
      const base = outcome.success ? 1.0 : -1.0;
      const timePenalty = -0.1 * (context.duration / 1000);
      return base + timePenalty;
    }`)}

${chalk.cyan.bold('Example 3: Database Operations')}
  ${chalk.gray('# Initialize database')}
  ${chalk.yellow('$ npx agentdb init ./data/vectors.db --dimension 768')}

  ${chalk.gray('# Import vectors')}
  ${chalk.yellow('$ npx agentdb import embeddings.json --db ./data/vectors.db')}

  ${chalk.gray('# Query database')}
  ${chalk.yellow('$ npx agentdb query ./data/vectors.db --text "search query" --k 10')}

  ${chalk.gray('# Export results')}
  ${chalk.yellow('$ npx agentdb export ./data/vectors.db -o results.json --format json')}

${chalk.cyan.bold('Example 4: A/B Testing Plugins')}
  ${chalk.gray('# Create two plugins')}
  ${chalk.yellow('$ npx agentdb create-plugin -t decision-transformer -n plugin-a')}
  ${chalk.yellow('$ npx agentdb create-plugin -t q-learning -n plugin-b')}

  ${chalk.gray('# Compare performance')}
  ${chalk.yellow('$ npx agentdb test-plugin plugin-a --benchmark')}
  ${chalk.yellow('$ npx agentdb test-plugin plugin-b --benchmark')}

${chalk.cyan.bold('Example 5: Production Deployment')}
  ${chalk.gray('# Train plugin')}
  ${chalk.yellow('$ npx agentdb train my-plugin --data ./training-data.json --epochs 100')}

  ${chalk.gray('# Validate')}
  ${chalk.yellow('$ npx agentdb validate-plugin my-plugin --strict')}

  ${chalk.gray('# Deploy')}
  ${chalk.yellow('$ npx agentdb deploy my-plugin --env production --tag v1.0.0')}
`;
}

/**
 * Section 6: Templates
 */
function getTemplates(): string {
  return `
${chalk.yellow.bold('━━━ 6. TEMPLATES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}

${chalk.cyan.bold('decision-transformer')} ${chalk.green('(Recommended)')}
  ${chalk.gray('Sequence modeling approach to reinforcement learning')}
  ${chalk.gray('Best for: Sequential decision-making tasks')}
  ${chalk.gray('Sample efficiency: ⭐⭐⭐⭐⭐ (5x better than Q-learning)')}

  ${chalk.yellow('$ npx agentdb create-plugin -t decision-transformer -n my-dt')}

${chalk.cyan.bold('q-learning')}
  ${chalk.gray('Model-free, off-policy, value-based learning')}
  ${chalk.gray('Best for: Discrete action spaces with clear value functions')}
  ${chalk.gray('Sample efficiency: ⭐⭐⭐')}

  ${chalk.yellow('$ npx agentdb create-plugin -t q-learning -n my-q')}

${chalk.cyan.bold('sarsa')}
  ${chalk.gray('On-policy temporal difference learning')}
  ${chalk.gray('Best for: Safe, conservative learning scenarios')}
  ${chalk.gray('Sample efficiency: ⭐⭐⭐')}

  ${chalk.yellow('$ npx agentdb create-plugin -t sarsa -n my-sarsa')}

${chalk.cyan.bold('actor-critic')}
  ${chalk.gray('Policy gradient method with value function baseline')}
  ${chalk.gray('Best for: Continuous action spaces, complex policies')}
  ${chalk.gray('Sample efficiency: ⭐⭐⭐⭐')}

  ${chalk.yellow('$ npx agentdb create-plugin -t actor-critic -n my-ac')}

${chalk.cyan.bold('curiosity-driven')}
  ${chalk.gray('Intrinsic motivation for exploration')}
  ${chalk.gray('Best for: Sparse reward environments requiring exploration')}
  ${chalk.gray('Sample efficiency: ⭐⭐⭐⭐')}

  ${chalk.yellow('$ npx agentdb create-plugin -t curiosity-driven -n my-curious')}

${chalk.gray('View all templates:')} ${chalk.yellow('npx agentdb list-templates --detailed')}
`;
}

/**
 * Section 7: Configuration Guide
 */
function getConfigurationGuide(): string {
  return `
${chalk.yellow.bold('━━━ 7. CONFIGURATION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}

${chalk.cyan.bold('Plugin Configuration (plugin.yaml)')}
  ${chalk.blue(`name: my-plugin
version: 1.0.0
description: My custom learning plugin
base_algorithm: decision_transformer

algorithm:
  type: decision_transformer
  learning_rate: 0.001
  discount_factor: 0.99

training:
  batch_size: 32
  epochs: 10
  min_experiences: 100

storage:
  path: ./.rl/plugin.db
  hnsw:
    enabled: true
    M: 16`)}

${chalk.cyan.bold('Environment Variables')}
  ${chalk.cyan('SQLITE_VECTOR_DB_PATH')}       Database path (default: ./vectors.db)
  ${chalk.cyan('SQLITE_VECTOR_LOG_LEVEL')}     Log level: debug, info, warn, error
  ${chalk.cyan('SQLITE_VECTOR_CACHE_SIZE')}    Cache size in MB (default: 100)
  ${chalk.cyan('SQLITE_VECTOR_WORKERS')}       Number of worker threads (default: 4)

${chalk.cyan.bold('Configuration Files')}
  ${chalk.gray('Global:')} ${chalk.blue('~/.agentdb/config.yaml')}
  ${chalk.gray('Project:')} ${chalk.blue('./.agentdb/config.yaml')}
  ${chalk.gray('Plugin:')} ${chalk.blue('./plugins/<name>/plugin.yaml')}

${chalk.cyan.bold('Configuration Precedence')}
  ${chalk.gray('1. Command-line arguments (highest priority)')}
  ${chalk.gray('2. Environment variables')}
  ${chalk.gray('3. Project config')}
  ${chalk.gray('4. Global config')}
  ${chalk.gray('5. Default values (lowest priority)')}
`;
}

/**
 * Section 8: Troubleshooting
 */
function getTroubleshooting(): string {
  return `
${chalk.yellow.bold('━━━ 8. TROUBLESHOOTING ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}

${chalk.cyan.bold('Common Issues')}

${chalk.red('Issue:')} Plugin creation fails
  ${chalk.green('Solution:')} Ensure Node.js >= 18 and all dependencies are installed
  ${chalk.yellow('$ node --version')}
  ${chalk.yellow('$ npm install -g npm@latest')}

${chalk.red('Issue:')} Database locked error
  ${chalk.green('Solution:')} Close other connections or use WAL mode
  ${chalk.yellow('$ npx agentdb optimize ./vectors.db --mode wal')}

${chalk.red('Issue:')} Out of memory during training
  ${chalk.green('Solution:')} Reduce batch size or enable quantization
  ${chalk.gray('In plugin.yaml:')}
  ${chalk.blue(`training:
  batch_size: 16  # Reduce from 32
storage:
  quantization:
    enabled: true
    bits: 8`)}

${chalk.red('Issue:')} Slow search performance
  ${chalk.green('Solution:')} Enable HNSW index and optimize
  ${chalk.yellow('$ npx agentdb optimize ./vectors.db --rebuild-index')}

${chalk.red('Issue:')} Plugin tests failing
  ${chalk.green('Solution:')} Check dependencies and rebuild
  ${chalk.yellow('$ cd plugins/my-plugin')}
  ${chalk.yellow('$ rm -rf node_modules && npm install')}
  ${chalk.yellow('$ npm run build && npm test')}

${chalk.cyan.bold('Debug Mode')}
  ${chalk.gray('Enable verbose logging:')}
  ${chalk.yellow('$ DEBUG=agentdb:* npx agentdb <command>')}
  ${chalk.yellow('$ npx agentdb <command> --verbose --log-level debug')}

${chalk.cyan.bold('Getting Help')}
  ${chalk.gray('Report issues:')} ${chalk.blue('https://github.com/ruvnet/agentic-flow/issues')}
  ${chalk.gray('View logs:')} ${chalk.yellow('~/.agentdb/logs/')}
  ${chalk.gray('Check status:')} ${chalk.yellow('npx agentdb version')}
`;
}

/**
 * Section 9: Resources and Documentation
 */
function getResourcesAndDocumentation(): string {
  return `
${chalk.yellow.bold('━━━ 9. RESOURCES & DOCUMENTATION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}

${chalk.cyan.bold('Documentation')}
  ${chalk.blue('📘 Plugin Quick Start')}      docs/PLUGIN_QUICKSTART.md
  ${chalk.blue('📕 API Reference')}            docs/PLUGIN_API.md
  ${chalk.blue('📗 Architecture Design')}      docs/LEARNING_PLUGIN_DESIGN.md
  ${chalk.blue('📙 Decision Transformer')}     docs/DECISION_TRANSFORMER.md
  ${chalk.blue('📔 Performance Benchmarks')}   docs/RL_BENCHMARKS.md
  ${chalk.blue('📓 Optimization Guide')}       docs/PLUGIN_OPTIMIZATION.md

${chalk.cyan.bold('Online Resources')}
  ${chalk.gray('GitHub:')}       ${chalk.blue('https://github.com/ruvnet/agentic-flow')}
  ${chalk.gray('Issues:')}       ${chalk.blue('https://github.com/ruvnet/agentic-flow/issues')}
  ${chalk.gray('Wiki:')}         ${chalk.blue('https://github.com/ruvnet/agentic-flow/wiki')}
  ${chalk.gray('Discussions:')} ${chalk.blue('https://github.com/ruvnet/agentic-flow/discussions')}

${chalk.cyan.bold('Community')}
  ${chalk.gray('Discord:')}      ${chalk.blue('https://discord.gg/agentic-flow')}
  ${chalk.gray('Twitter:')}      ${chalk.blue('@agentic_flow')}
  ${chalk.gray('Stack Overflow:')} ${chalk.blue('Tag: agentdb')}

${chalk.cyan.bold('Code Examples')}
  ${chalk.gray('Examples repository:')} ${chalk.blue('https://github.com/ruvnet/agentic-flow-examples')}
  ${chalk.gray('Tutorials:')}           ${chalk.blue('https://docs.agentic-flow.ai/tutorials')}
  ${chalk.gray('Blog posts:')}          ${chalk.blue('https://blog.agentic-flow.ai')}
`;
}

/**
 * Footer
 */
function getFooter(): string {
  return `
${chalk.yellow.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}

${chalk.cyan.bold('License')}
  MIT OR Apache-2.0

${chalk.cyan.bold('Contributing')}
  Contributions welcome! See CONTRIBUTING.md for guidelines.

${chalk.cyan.bold('Support')}
  Found a bug? ${chalk.yellow('npx agentdb help')} | ${chalk.blue('https://github.com/ruvnet/agentic-flow/issues')}

${chalk.gray('Run')} ${chalk.yellow('npx agentdb <command> --help')} ${chalk.gray('for detailed command information.')}

${chalk.yellow.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}
`;
}

/**
 * Show help for specific command
 */
export function showCommandHelp(command: string): void {
  // This will be implemented to show command-specific help
  console.log(`Detailed help for: ${command}`);
  console.log(`Run: npx agentdb ${command} --help`);
}
