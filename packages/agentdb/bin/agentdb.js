#!/usr/bin/env node

/**
 * AgentDB CLI
 *
 * Command-line interface for agentdb operations
 */

const { version } = require('../package.json');

const COMMANDS = {
  help: showHelp,
  version: showVersion,
  mcp: startMcpServer,
  init: initDatabase,
  benchmark: runBenchmark,
  repl: startRepl,
  'create-plugin': createPlugin,
  'list-plugins': listPlugins,
  'list-templates': listTemplates,
  'plugin-info': pluginInfo,
  'use-plugin': usePlugin,
  import: importCommand,
  export: exportCommand,
  query: queryCommand,
  stats: statsCommand,
};

function showHelp(subcommand) {
  // Show command-specific help if requested
  if (subcommand && COMMANDS[subcommand]) {
    showCommandHelp(subcommand);
    return;
  }

  console.log(`
█▀█ █▀▀ █▀▀ █▄░█ ▀█▀ █▀▄ █▄▄
█▀█ █▄█ ██▄ █░▀█ ░█░ █▄▀ █▄█

AgentDB v${version} - Agent Memory & Vector Database
Website: https://agentdb.ruv.io

USAGE
  npx agentdb <command> [options]
  npx agentdb <command> --help    (detailed command help)

CORE COMMANDS
  init <path>       Initialize vector database
  mcp               Start MCP server for Claude Code
  benchmark         Run performance benchmarks
  version           Show version information

PLUGIN COMMANDS
  create-plugin     Create learning plugin (interactive wizard)
  list-plugins      List available plugins
  list-templates    List plugin templates
  plugin-info       Show plugin details

DATABASE COMMANDS
  import <file>     Import vectors from file
  export <file>     Export vectors to file
  query <db>        Query vector database
  stats <db>        Show database statistics

QUICK START
  npx agentdb create-plugin              # Create plugin
  npx agentdb init ./agents.db           # Initialize DB
  npx agentdb mcp                        # Start MCP server
  npx agentdb benchmark                  # Run benchmarks

HELP & INFO
  npx agentdb help <command>             # Command-specific help
  npx agentdb <command> --help           # Alternative syntax
  npx agentdb version                    # Version info

DOCUMENTATION
  GitHub:  https://github.com/ruvnet/agentic-flow/tree/main/packages/agentdb
  Issues:  https://github.com/ruvnet/agentic-flow/issues
  License: MIT OR Apache-2.0
`);
}

function showCommandHelp(command) {
  const helps = {
    init: `
COMMAND: init

Initialize a new vector database

USAGE
  npx agentdb init <path> [options]

ARGUMENTS
  <path>            Database file path (e.g., ./vectors.db)

OPTIONS
  --dimension <n>   Vector dimension (default: 1536)
  --preset <name>   Use preset: small, medium, large
  --in-memory       Create in-memory database

EXAMPLES
  npx agentdb init ./vectors.db
  npx agentdb init ./vectors.db --dimension 768
  npx agentdb init ./vectors.db --preset large
`,
    mcp: `
COMMAND: mcp

Start Model Context Protocol server for Claude Code integration

USAGE
  npx agentdb mcp [options]

OPTIONS
  --port <number>   Port to listen on (default: 3000)
  --host <string>   Host to bind to (default: localhost)
  --log <level>     Log level: debug, info, warn, error

EXAMPLES
  npx agentdb mcp
  npx agentdb mcp --port 3000
  npx agentdb mcp --log debug

CLAUDE DESKTOP CONFIG
  Add to ~/.config/claude/config.json:
  {
    "mcpServers": {
      "agentdb": {
        "command": "npx",
        "args": ["agentdb", "mcp"]
      }
    }
  }
`,
    'create-plugin': `
COMMAND: create-plugin

Create a new learning plugin with interactive wizard

USAGE
  npx agentdb create-plugin [options]

OPTIONS
  -t, --template <name>     Use template (see list-templates)
  -n, --name <name>         Plugin name (lowercase-hyphenated)
  --no-customize            Skip customization (use defaults)
  -o, --output <dir>        Output directory (default: ./plugins)
  --force                   Overwrite existing plugin
  --dry-run                 Preview without creating files

AVAILABLE TEMPLATES
  decision-transformer      Sequence modeling RL (recommended)
  q-learning               Value-based learning
  sarsa                    On-policy TD learning
  actor-critic             Policy gradient with baseline

EXAMPLES
  npx agentdb create-plugin
  npx agentdb create-plugin -t q-learning -n my-agent
  npx agentdb create-plugin --dry-run
`,
    import: `
COMMAND: import

Import vectors from file into database

USAGE
  npx agentdb import <database> <file> [options]

ARGUMENTS
  <database>        Database path
  <file>            Input file (JSON, CSV)

OPTIONS
  -f, --format <type>       Format: json, csv (default: json)
  -b, --batch-size <n>      Batch size (default: 1000)
  -v, --verbose             Verbose output

EXAMPLES
  npx agentdb import ./db.sqlite vectors.json
  npx agentdb import ./db.sqlite data.csv -f csv -v
`,
    export: `
COMMAND: export

Export vectors from database to file

USAGE
  npx agentdb export <database> <file> [options]

ARGUMENTS
  <database>        Database path
  <file>            Output file

OPTIONS
  -f, --format <type>       Format: json, csv (default: json)
  -l, --limit <n>           Limit number of vectors
  -v, --verbose             Verbose output

EXAMPLES
  npx agentdb export ./db.sqlite vectors.json
  npx agentdb export ./db.sqlite data.csv -f csv -l 1000
`,
    query: `
COMMAND: query

Query vector database for similar vectors

USAGE
  npx agentdb query <database> <embedding> [options]

ARGUMENTS
  <database>        Database path
  <embedding>       Vector as JSON array or space-separated

OPTIONS
  -k, --top-k <n>           Results to return (default: 5)
  -m, --metric <name>       Metric: cosine, euclidean, dot
  -t, --threshold <n>       Min similarity threshold
  -f, --format <type>       Output: table, json (default: table)
  -v, --verbose             Verbose output

EXAMPLES
  npx agentdb query ./db.sqlite "[0.1,0.2,0.3]"
  npx agentdb query ./db.sqlite "0.1 0.2 0.3" -k 10
`,
    stats: `
COMMAND: stats

Show database statistics and information

USAGE
  npx agentdb stats <database> [options]

ARGUMENTS
  <database>        Database path

OPTIONS
  -d, --detailed            Show detailed statistics
  -f, --format <type>       Output: table, json (default: table)

EXAMPLES
  npx agentdb stats ./db.sqlite
  npx agentdb stats ./db.sqlite -d -f json
`,
    benchmark: `
COMMAND: benchmark

Run comprehensive performance benchmarks

USAGE
  npx agentdb benchmark [options]

OPTIONS
  --suite <name>            Suite: insertion, search, all
  --size <n>                Dataset size (default: 10000)
  --dimension <n>           Vector dimension (default: 1536)

EXAMPLES
  npx agentdb benchmark
  npx agentdb benchmark --suite insertion
  npx agentdb benchmark --size 50000
`,
    'list-plugins': `
COMMAND: list-plugins

List all available learning plugins

USAGE
  npx agentdb list-plugins [options]

OPTIONS
  -v, --verbose             Show detailed information
  --filter <pattern>        Filter by name pattern
  --json                    Output as JSON

EXAMPLES
  npx agentdb list-plugins
  npx agentdb list-plugins --verbose
  npx agentdb list-plugins --filter "q-*"
`,
    'list-templates': `
COMMAND: list-templates

List all available plugin templates

USAGE
  npx agentdb list-templates [options]

OPTIONS
  -d, --detailed            Show detailed information
  -c, --category <name>     Filter by category
  --json                    Output as JSON

EXAMPLES
  npx agentdb list-templates
  npx agentdb list-templates --detailed
  npx agentdb list-templates -c reinforcement-learning
`,
    'plugin-info': `
COMMAND: plugin-info

Get detailed information about a plugin

USAGE
  npx agentdb plugin-info <name> [options]

ARGUMENTS
  <name>            Plugin name

OPTIONS
  --json                    Output as JSON
  --metrics                 Include performance metrics
  --dependencies            Show dependencies

EXAMPLES
  npx agentdb plugin-info my-plugin
  npx agentdb plugin-info my-plugin --metrics
`
  };

  if (helps[command]) {
    console.log(helps[command]);
  } else {
    console.error(`No detailed help available for: ${command}`);
    console.error(`Run: npx agentdb ${command} --help`);
  }
}

function showVersion() {
  console.log(`agentdb v${version}`);
  console.log(`Node: ${process.version}`);
  console.log(`Platform: ${process.platform} ${process.arch}`);
}

async function startMcpServer() {
  console.error('🚀 Starting AgentDB MCP Server...');
  console.error('');

  try {
    // Check if MCP implementation exists
    const mcpPath = require.resolve('../dist/mcp-server.js');

    // Import and start the MCP server
    const { AgentDBMCPServer } = require(mcpPath);
    const server = new AgentDBMCPServer();
    await server.start();
  } catch (error) {
    console.error('❌ Failed to start MCP server');
    console.error('');
    console.error('Error:', error.message);
    console.error('');
    console.error('Make sure to build the project first:');
    console.error('  npm run build');
    console.error('');
    process.exit(1);
  }
}

function initDatabase(path) {
  if (!path) {
    console.error('❌ Error: Database path required');
    console.error('');
    console.error('Usage: agentdb init <path>');
    console.error('Example: agentdb init ./agents.db');
    process.exit(1);
  }

  console.log(`📦 Initializing agent memory database: ${path}`);
  console.log('');

  try {
    const { SqliteVectorDB, Presets } = require('../dist/index.js');

    // Create a small test database
    const config = Presets.smallDataset(1536, path);
    const db = SqliteVectorDB.new(config);

    console.log('✅ Database initialized successfully!');
    console.log('');
    console.log('Configuration:');
    console.log(`  Path: ${path}`);
    console.log(`  Dimension: 1536`);
    console.log(`  Mode: persistent`);
    console.log('');
    console.log('Next steps:');
    console.log('  1. Import the library: const { SqliteVectorDB } = require("agentdb")');
    console.log('  2. Insert vectors: await db.insert({ data: [...], metadata: {...} })');
    console.log('  3. Search: await db.search(queryVector, 5)');
    console.log('');

    db.close();
  } catch (error) {
    console.error('❌ Failed to initialize database:', error.message);
    process.exit(1);
  }
}

function runBenchmark() {
  console.log('📊 Running AgentDB Performance Benchmarks...');
  console.log('');
  console.log('This will test:');
  console.log('  - Native & WASM backend performance');
  console.log('  - Insert operations (single & batch)');
  console.log('  - Search operations (various metrics)');
  console.log('  - Memory usage');
  console.log('  - Backend comparison');
  console.log('');

  try {
    // Try to run compiled benchmark first
    const benchmarkPath = require.resolve('../dist/benchmarks/comprehensive-performance.bench.js');
    const { PerformanceBenchmark } = require(benchmarkPath);

    const benchmark = new PerformanceBenchmark();
    benchmark.runAll()
      .then(() => {
        console.log('\n✅ All benchmarks completed successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n❌ Benchmark failed:', error);
        process.exit(1);
      });
  } catch (error) {
    // If compiled version doesn't exist, try TypeScript version with ts-node
    try {
      console.error('⚠️  Compiled benchmarks not found, trying TypeScript version...');
      console.error('');

      const { spawn } = require('child_process');
      const benchmarkProcess = spawn('npx', ['ts-node', 'benchmarks/comprehensive-performance.bench.ts'], {
        stdio: 'inherit',
        cwd: require('path').resolve(__dirname, '..')
      });

      benchmarkProcess.on('close', (code) => {
        process.exit(code);
      });
    } catch (tsError) {
      console.error('❌ Benchmarks not available');
      console.error('');
      console.error('To run benchmarks:');
      console.error('  1. Build the project: npm run build');
      console.error('  2. Run benchmarks: npx agentdb benchmark');
      console.error('');
      console.error('Or run directly:');
      console.error('  npm run bench');
      console.error('  npm run bench:comprehensive');
      console.error('');
      process.exit(1);
    }
  }
}

function startRepl() {
  console.log('🔧 Interactive REPL (experimental)');
  console.log('');
  console.error('❌ REPL not implemented yet');
  console.error('');
  console.error('For now, use Node.js REPL:');
  console.error('  node');
  console.error('  > const { SqliteVectorDB, Presets } = require("agentdb")');
  console.error('  > const db = await SqliteVectorDB.new(Presets.inMemory(1536))');
  console.error('');
  process.exit(1);
}

// Learning Plugin CLI commands
function createPlugin(...args) {
  try {
    const wrapperPath = require('path').join(__dirname, 'plugin-cli-wrapper.mjs');
    // Use the .mjs wrapper to load the ES module
    // Prepend 'create-plugin' command since plugin-cli expects it
    const { spawn } = require('child_process');
    const child = spawn('node', [wrapperPath, 'create-plugin', ...args], {
      stdio: 'inherit',
      cwd: require('path').resolve(__dirname, '..')
    });

    child.on('close', (code) => {
      process.exit(code);
    });
  } catch (error) {
    console.error('❌ Plugin CLI not available');
    console.error('');
    console.error('Error:', error.message);
    console.error('');
    console.error('Make sure to build the project first:');
    console.error('  npm run build');
    console.error('');
    process.exit(1);
  }
}

function listPlugins(...args) {
  // Call plugin CLI wrapper with list-plugins command
  const wrapperPath = require('path').join(__dirname, 'plugin-cli-wrapper.mjs');
  const { spawn } = require('child_process');
  const child = spawn('node', [wrapperPath, 'list-plugins', ...args], {
    stdio: 'inherit',
    cwd: require('path').resolve(__dirname, '..')
  });
  child.on('close', (code) => process.exit(code));
}

function listTemplates(...args) {
  const wrapperPath = require('path').join(__dirname, 'plugin-cli-wrapper.mjs');
  const { spawn} = require('child_process');
  const child = spawn('node', [wrapperPath, 'list-templates', ...args], {
    stdio: 'inherit',
    cwd: require('path').resolve(__dirname, '..')
  });
  child.on('close', (code) => process.exit(code));
}

function pluginInfo(...args) {
  const wrapperPath = require('path').join(__dirname, 'plugin-cli-wrapper.mjs');
  const { spawn } = require('child_process');
  const child = spawn('node', [wrapperPath, 'plugin-info', ...args], {
    stdio: 'inherit',
    cwd: require('path').resolve(__dirname, '..')
  });
  child.on('close', (code) => process.exit(code));
}

function usePlugin(...args) {
  const wrapperPath = require('path').join(__dirname, 'plugin-cli-wrapper.mjs');
  const { spawn } = require('child_process');
  const child = spawn('node', [wrapperPath, 'use-plugin', ...args], {
    stdio: 'inherit',
    cwd: require('path').resolve(__dirname, '..')
  });
  child.on('close', (code) => process.exit(code));
}

// Database commands
function importCommand(...args) {
  const [database, file, ...flags] = args;

  if (!database || !file) {
    console.error('❌ Usage: agentdb import <database> <file> [options]');
    console.error('');
    console.error('Options:');
    console.error('  -f, --format <format>       File format (json|csv), default: json');
    console.error('  -b, --batch-size <size>     Batch size for imports, default: 1000');
    console.error('  -v, --verbose               Verbose output');
    console.error('');
    console.error('Examples:');
    console.error('  agentdb import ./db.sqlite vectors.json');
    console.error('  agentdb import ./db.sqlite data.csv -f csv -v');
    process.exit(1);
  }

  try {
    const { importVectors } = require('../dist/cli/db-commands.js');
    const options = parseFlags(flags);
    importVectors(database, file, options).catch(err => {
      console.error('❌ Import failed:', err.message);
      process.exit(1);
    });
  } catch (error) {
    console.error('❌ Database commands not available. Please run: npm run build');
    process.exit(1);
  }
}

function exportCommand(...args) {
  const [database, file, ...flags] = args;

  if (!database || !file) {
    console.error('❌ Usage: agentdb export <database> <file> [options]');
    console.error('');
    console.error('Options:');
    console.error('  -f, --format <format>       File format (json|csv), default: json');
    console.error('  -l, --limit <number>        Limit number of vectors');
    console.error('  -v, --verbose               Verbose output');
    console.error('');
    console.error('Examples:');
    console.error('  agentdb export ./db.sqlite vectors.json');
    console.error('  agentdb export ./db.sqlite data.csv -f csv -l 1000');
    process.exit(1);
  }

  try {
    const { exportVectors } = require('../dist/cli/db-commands.js');
    const options = parseFlags(flags);
    exportVectors(database, file, options).catch(err => {
      console.error('❌ Export failed:', err.message);
      process.exit(1);
    });
  } catch (error) {
    console.error('❌ Database commands not available. Please run: npm run build');
    process.exit(1);
  }
}

function queryCommand(...args) {
  const [database, embedding, ...flags] = args;

  if (!database || !embedding) {
    console.error('❌ Usage: agentdb query <database> <embedding> [options]');
    console.error('');
    console.error('Options:');
    console.error('  -k, --top-k <number>        Number of results, default: 5');
    console.error('  -m, --metric <metric>       Similarity metric (cosine|euclidean|dot), default: cosine');
    console.error('  -t, --threshold <number>    Minimum similarity threshold, default: 0.0');
    console.error('  -f, --format <format>       Output format (table|json), default: table');
    console.error('  -v, --verbose               Verbose output');
    console.error('');
    console.error('Examples:');
    console.error('  agentdb query ./db.sqlite "[0.1,0.2,0.3]"');
    console.error('  agentdb query ./db.sqlite "0.1 0.2 0.3" -k 10 -m euclidean');
    process.exit(1);
  }

  try {
    const { queryVectors } = require('../dist/cli/db-commands.js');
    const options = parseFlags(flags);
    queryVectors(database, embedding, options).catch(err => {
      console.error('❌ Query failed:', err.message);
      process.exit(1);
    });
  } catch (error) {
    console.error('❌ Database commands not available. Please run: npm run build');
    process.exit(1);
  }
}

function statsCommand(...args) {
  const [database, ...flags] = args;

  if (!database) {
    console.error('❌ Usage: agentdb stats <database> [options]');
    console.error('');
    console.error('Options:');
    console.error('  -d, --detailed              Show detailed statistics');
    console.error('  -f, --format <format>       Output format (table|json), default: table');
    console.error('');
    console.error('Examples:');
    console.error('  agentdb stats ./db.sqlite');
    console.error('  agentdb stats ./db.sqlite -d -f json');
    process.exit(1);
  }

  try {
    const { showStats } = require('../dist/cli/db-commands.js');
    const options = parseFlags(flags);
    showStats(database, options).catch(err => {
      console.error('❌ Stats command failed:', err.message);
      process.exit(1);
    });
  } catch (error) {
    console.error('❌ Database commands not available. Please run: npm run build');
    process.exit(1);
  }
}

// Parse command line flags into options object
function parseFlags(flags) {
  const options = {};
  for (let i = 0; i < flags.length; i++) {
    const flag = flags[i];

    if (flag === '-f' || flag === '--format') {
      options.format = flags[++i];
    } else if (flag === '-b' || flag === '--batch-size') {
      options.batchSize = parseInt(flags[++i], 10);
    } else if (flag === '-k' || flag === '--top-k') {
      options.k = parseInt(flags[++i], 10);
    } else if (flag === '-m' || flag === '--metric') {
      options.metric = flags[++i];
    } else if (flag === '-t' || flag === '--threshold') {
      options.threshold = parseFloat(flags[++i]);
    } else if (flag === '-l' || flag === '--limit') {
      options.limit = parseInt(flags[++i], 10);
    } else if (flag === '-d' || flag === '--detailed') {
      options.detailed = true;
    } else if (flag === '-v' || flag === '--verbose') {
      options.verbose = true;
    }
  }
  return options;
}

// Parse command line arguments
const [,, command = 'help', ...args] = process.argv;

// Handle --version and -v flags at root level
if (command === '--version' || command === '-v') {
  showVersion();
  process.exit(0);
}

// Handle --help and -h flags at root level
if (command === '--help' || command === '-h') {
  showHelp();
  process.exit(0);
}

// Handle --help flag for any command
if (args.includes('--help') || args.includes('-h')) {
  showCommandHelp(command);
  process.exit(0);
}

const handler = COMMANDS[command];
if (handler) {
  // Handle async commands
  const result = handler(...args);
  if (result instanceof Promise) {
    result.catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
  }
} else {
  console.error(`❌ Unknown command: ${command}`);
  console.error('');
  console.error('Run "npx agentdb help" for usage information');
  process.exit(1);
}
