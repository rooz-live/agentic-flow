# AgentDB CLI Database Commands

Comprehensive database operations via command-line interface.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Commands](#commands)
  - [import](#import)
  - [export](#export)
  - [query](#query)
  - [stats](#stats)
- [Usage Examples](#usage-examples)
- [File Formats](#file-formats)
- [Advanced Features](#advanced-features)
- [Troubleshooting](#troubleshooting)

## Overview

AgentDB provides powerful CLI commands for database operations:

- **Import**: Load vectors from JSON/CSV files
- **Export**: Save vectors to JSON/CSV files
- **Query**: Search for similar vectors
- **Stats**: View database statistics and performance metrics

All commands support:
- ✅ Progress tracking for large operations
- ✅ Colored, user-friendly output
- ✅ Comprehensive error messages
- ✅ Both file and in-memory databases
- ✅ Batch processing for performance
- ✅ Multiple output formats (table/JSON)

## Installation

```bash
npm install agentdb
```

Or use directly with npx:

```bash
npx agentdb <command>
```

## Commands

### import

Import vectors from JSON or CSV files into the database.

```bash
agentdb import <database> <file> [options]
```

**Arguments:**
- `database` - Path to SQLite database file
- `file` - Path to JSON or CSV file containing vectors

**Options:**
- `-f, --format <format>` - File format: `json` (default) or `csv`
- `-b, --batch-size <size>` - Batch size for imports (default: 1000)
- `-v, --verbose` - Show detailed progress information

**Examples:**

```bash
# Import from JSON file
agentdb import ./agents.db ./vectors.json

# Import from CSV with verbose output
agentdb import ./agents.db ./data.csv -f csv -v

# Import with custom batch size
agentdb import ./agents.db ./large-file.json -b 5000
```

**Performance:**
- Automatic batching for large files
- Transaction-based inserts
- Progress bar for visual feedback
- Handles millions of vectors efficiently

### export

Export vectors from database to JSON or CSV files.

```bash
agentdb export <database> <file> [options]
```

**Arguments:**
- `database` - Path to SQLite database file
- `file` - Output file path

**Options:**
- `-f, --format <format>` - Output format: `json` (default) or `csv`
- `-l, --limit <number>` - Limit number of vectors to export
- `-w, --where <condition>` - Filter condition (coming soon)
- `-v, --verbose` - Show detailed export information

**Examples:**

```bash
# Export to JSON
agentdb export ./agents.db ./backup.json

# Export to CSV
agentdb export ./agents.db ./vectors.csv -f csv

# Export with limit
agentdb export ./agents.db ./sample.json -l 1000

# Verbose export
agentdb export ./agents.db ./output.json -v
```

**Output includes:**
- Metadata (timestamp, count, format)
- All vectors with embeddings
- Associated metadata for each vector

### query

Search for similar vectors using different similarity metrics.

```bash
agentdb query <database> <embedding> [options]
```

**Arguments:**
- `database` - Path to SQLite database file
- `embedding` - Query vector (multiple formats supported)

**Options:**
- `-k, --top-k <number>` - Number of results to return (default: 5)
- `-m, --metric <metric>` - Similarity metric: `cosine`, `euclidean`, or `dot` (default: cosine)
- `-t, --threshold <number>` - Minimum similarity threshold (default: 0.0)
- `-f, --format <format>` - Output format: `table` (default) or `json`
- `-v, --verbose` - Show detailed query information

**Embedding Formats:**

The query command accepts embeddings in multiple formats:

```bash
# JSON array
agentdb query ./db.sqlite "[0.1, 0.2, 0.3, 0.4]"

# Space-separated
agentdb query ./db.sqlite "0.1 0.2 0.3 0.4"

# Comma-separated
agentdb query ./db.sqlite "0.1,0.2,0.3,0.4"
```

**Examples:**

```bash
# Basic query
agentdb query ./agents.db "[0.1,0.2,0.3]"

# Get top 10 results
agentdb query ./agents.db "[0.1,0.2,0.3]" -k 10

# Use Euclidean distance
agentdb query ./agents.db "[0.1,0.2,0.3]" -m euclidean

# Set similarity threshold
agentdb query ./agents.db "[0.1,0.2,0.3]" -t 0.5

# JSON output
agentdb query ./agents.db "[0.1,0.2,0.3]" -f json

# Verbose mode
agentdb query ./agents.db "[0.1,0.2,0.3]" -v
```

**Similarity Metrics:**

- **cosine**: Cosine similarity (best for normalized vectors)
- **euclidean**: Euclidean distance (L2 norm)
- **dot**: Dot product similarity (fast, good for high-dimensional data)

### stats

Display comprehensive database statistics and performance metrics.

```bash
agentdb stats <database> [options]
```

**Arguments:**
- `database` - Path to SQLite database file

**Options:**
- `-d, --detailed` - Show detailed statistics including cache and compression
- `-f, --format <format>` - Output format: `table` (default) or `json`

**Examples:**

```bash
# Basic statistics
agentdb stats ./agents.db

# Detailed statistics
agentdb stats ./agents.db -d

# JSON output
agentdb stats ./agents.db -f json

# Detailed JSON
agentdb stats ./agents.db -d -f json
```

**Statistics Shown:**

Basic:
- Total vector count
- Database size
- Average vector size

Query Cache (if enabled):
- Cache hits and misses
- Hit rate percentage
- Number of cached entries
- Cache evictions
- Average access time

Detailed Mode:
- Backend type (native/WASM)
- Initialization status
- Compression statistics
- Performance metrics

## Usage Examples

### Complete Workflow

```bash
# 1. Initialize database
agentdb init ./mydb.sqlite

# 2. Import vectors
agentdb import ./mydb.sqlite ./vectors.json -v

# 3. Check statistics
agentdb stats ./mydb.sqlite -d

# 4. Query for similar vectors
agentdb query ./mydb.sqlite "[0.1,0.2,0.3,0.4,0.5]" -k 10

# 5. Export results
agentdb export ./mydb.sqlite ./backup.json
```

### Working with Large Datasets

```bash
# Import large file with batching
agentdb import ./large.db ./million-vectors.json -b 10000 -v

# Query with threshold to filter low-similarity results
agentdb query ./large.db "[0.1,0.2,0.3]" -k 100 -t 0.7

# Export subset of data
agentdb export ./large.db ./subset.json -l 10000
```

### CSV Workflow

```bash
# Import CSV data
agentdb import ./db.sqlite ./data.csv -f csv

# Query and get JSON output
agentdb query ./db.sqlite "[0.5,0.5,0.5]" -f json > results.json

# Export back to CSV
agentdb export ./db.sqlite ./output.csv -f csv
```

## File Formats

### JSON Format

**Import JSON** - Multiple formats supported:

1. **Array of vector objects** (recommended):
```json
[
  {
    "id": "vec-001",
    "embedding": [0.1, 0.2, 0.3],
    "metadata": {
      "category": "technology",
      "year": 2024
    },
    "timestamp": 1697587200000
  },
  {
    "id": "vec-002",
    "embedding": [0.4, 0.5, 0.6],
    "metadata": {
      "category": "science"
    }
  }
]
```

2. **Simple array of embeddings**:
```json
[
  [0.1, 0.2, 0.3],
  [0.4, 0.5, 0.6],
  [0.7, 0.8, 0.9]
]
```

3. **Wrapped format**:
```json
{
  "vectors": [
    {"embedding": [0.1, 0.2, 0.3]},
    {"embedding": [0.4, 0.5, 0.6]}
  ]
}
```

**Export JSON** - Structured format:
```json
{
  "metadata": {
    "exportedAt": "2024-10-17T20:00:00.000Z",
    "totalVectors": 5,
    "databasePath": "/path/to/db.sqlite",
    "format": "json"
  },
  "vectors": [
    {
      "id": "vec-001",
      "embedding": [0.1, 0.2, 0.3],
      "metadata": {"category": "tech"}
    }
  ]
}
```

### CSV Format

**Import CSV** - Requirements:
- Must have an `embedding` column
- Optional `id` column
- All other columns become metadata

Example:
```csv
id,embedding,category,description,year
vec-001,"[0.1, 0.2, 0.3]",technology,"AI research",2024
vec-002,"[0.4, 0.5, 0.6]",science,"Quantum computing",2024
```

**Export CSV** - Format:
```csv
id,embedding,metadata
vec-001,"[0.1,0.2,0.3]","{""category"":""technology""}"
vec-002,"[0.4,0.5,0.6]","{""category"":""science""}"
```

## Advanced Features

### Batch Processing

For optimal performance with large datasets:

```bash
# Adjust batch size based on available memory
# Small batches: Less memory, slower
agentdb import ./db.sqlite ./data.json -b 100

# Large batches: More memory, faster
agentdb import ./db.sqlite ./data.json -b 50000
```

### Progress Tracking

Visual progress bars automatically appear for large operations:

```
📥 Importing vectors...

Database: /path/to/database.db
Source: /path/to/vectors.json
Format: JSON

Found 10000 vectors

Importing: ████████████████████████████████████████ 10000/10000 (100%)

✅ Import complete!
```

### Error Handling

Comprehensive error messages guide you:

```bash
$ agentdb query ./missing.db "[0.1,0.2,0.3]"
❌ Database not found: /path/to/missing.db

$ agentdb query ./db.sqlite "invalid"
❌ Failed to parse embedding: Unexpected token 'i'

Expected formats:
  - JSON array: [0.1, 0.2, 0.3, ...]
  - Space-separated: 0.1 0.2 0.3 ...
  - Comma-separated: 0.1,0.2,0.3,...
```

### Programmatic Usage

Use CLI commands in your Node.js code:

```javascript
const {
  importVectors,
  exportVectors,
  queryVectors,
  showStats
} = require('agentdb/dist/cli/db-commands');

async function example() {
  // Import vectors
  await importVectors('./db.sqlite', './vectors.json', {
    format: 'json',
    batchSize: 1000,
    verbose: true
  });

  // Query database
  await queryVectors('./db.sqlite', '[0.1,0.2,0.3]', {
    k: 5,
    metric: 'cosine',
    format: 'table'
  });

  // Show statistics
  await showStats('./db.sqlite', {
    detailed: true,
    format: 'json'
  });

  // Export database
  await exportVectors('./db.sqlite', './backup.json', {
    format: 'json',
    verbose: true
  });
}
```

## Performance Tips

### Import Performance

1. **Use larger batch sizes** for big datasets:
   ```bash
   agentdb import ./db.sqlite ./data.json -b 10000
   ```

2. **Enable verbose mode** to monitor progress:
   ```bash
   agentdb import ./db.sqlite ./data.json -v
   ```

3. **Pre-process data** to remove duplicates before import

### Query Performance

1. **Use query cache** (enabled by default) for 50-100x speedup on repeated queries

2. **Set appropriate thresholds** to filter results:
   ```bash
   agentdb query ./db.sqlite "[0.1,0.2,0.3]" -t 0.5
   ```

3. **Choose the right metric**:
   - `cosine`: Best for normalized vectors
   - `euclidean`: Good for absolute distances
   - `dot`: Fastest for high-dimensional data

### Export Performance

1. **Use limits** for large databases:
   ```bash
   agentdb export ./db.sqlite ./subset.json -l 100000
   ```

2. **Export to CSV** for smaller file sizes (less metadata)

## Troubleshooting

### Build Issues

```bash
# If commands not found, rebuild the project
npm run build
```

### Database Lock Errors

```bash
# Close all connections to the database
# Or use a different database path
```

### Memory Issues

```bash
# Use smaller batch sizes for imports
agentdb import ./db.sqlite ./huge.json -b 100

# Export with limits
agentdb export ./db.sqlite ./output.json -l 10000
```

### Permission Errors

```bash
# Ensure database file is writable
chmod 644 ./database.db

# Ensure parent directory exists
mkdir -p ./data
agentdb init ./data/new.db
```

## See Also

- [AgentDB Main Documentation](../README.md)
- [CLI Usage Examples](./examples/cli-usage-examples.md)
- [Plugin Development Guide](./PLUGIN_QUICKSTART.md)
- [API Reference](./API.md)
- [Performance Benchmarks](./BENCHMARKS.md)

## License

MIT OR Apache-2.0
