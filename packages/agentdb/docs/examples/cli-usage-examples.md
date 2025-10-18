# AgentDB CLI Usage Examples

This document demonstrates the database CLI commands with real examples.

## Prerequisites

Build the project:
```bash
npm run build
```

## Commands Overview

### 1. Import Vectors

Import vectors from JSON or CSV files into your database.

#### Import from JSON
```bash
# Basic import
npx agentdb import ./tests/test.db ./tests/test-vectors.json

# Import with verbose output
npx agentdb import ./tests/test.db ./tests/test-vectors.json -v

# Import with custom batch size
npx agentdb import ./tests/test.db ./tests/test-vectors.json -b 500
```

#### Import from CSV
```bash
# Import CSV file
npx agentdb import ./tests/test.db ./tests/test-vectors.csv -f csv

# Import CSV with verbose mode
npx agentdb import ./tests/test.db ./tests/test-vectors.csv -f csv -v
```

**Supported JSON Formats:**

1. Array of objects with embedding field:
```json
[
  {
    "id": "vec-001",
    "embedding": [0.1, 0.2, 0.3],
    "metadata": {"category": "tech"}
  }
]
```

2. Simple array of arrays:
```json
[
  [0.1, 0.2, 0.3],
  [0.4, 0.5, 0.6]
]
```

3. Wrapped format:
```json
{
  "vectors": [
    {"embedding": [0.1, 0.2, 0.3]}
  ]
}
```

**CSV Format:**
- Must have an `embedding` column
- Optional `id` column
- All other columns become metadata

### 2. Export Vectors

Export your database vectors to JSON or CSV files.

```bash
# Export to JSON (default)
npx agentdb export ./tests/test.db ./output/vectors.json

# Export to CSV
npx agentdb export ./tests/test.db ./output/vectors.csv -f csv

# Export with limit
npx agentdb export ./tests/test.db ./output/vectors.json -l 1000

# Export with verbose output
npx agentdb export ./tests/test.db ./output/vectors.json -v
```

**Output Structure (JSON):**
```json
{
  "metadata": {
    "exportedAt": "2024-10-17T20:00:00.000Z",
    "totalVectors": 5,
    "databasePath": "/path/to/test.db",
    "format": "json"
  },
  "vectors": [...]
}
```

### 3. Query Database

Search for similar vectors using different similarity metrics.

```bash
# Query with JSON array format
npx agentdb query ./tests/test.db "[0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8]"

# Query with space-separated values
npx agentdb query ./tests/test.db "0.1 0.2 0.3 0.4 0.5 0.6 0.7 0.8"

# Query with comma-separated values
npx agentdb query ./tests/test.db "0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8"

# Get top 10 results
npx agentdb query ./tests/test.db "[0.1,0.2,0.3]" -k 10

# Use different similarity metric
npx agentdb query ./tests/test.db "[0.1,0.2,0.3]" -m euclidean

# Set similarity threshold
npx agentdb query ./tests/test.db "[0.1,0.2,0.3]" -t 0.5

# Output as JSON
npx agentdb query ./tests/test.db "[0.1,0.2,0.3]" -f json

# Verbose mode with details
npx agentdb query ./tests/test.db "[0.1,0.2,0.3]" -v
```

**Similarity Metrics:**
- `cosine` (default): Cosine similarity
- `euclidean`: Euclidean distance
- `dot`: Dot product similarity

**Table Output Example:**
```
🔍 Querying database...

Database: /path/to/test.db
Top K: 5
Metric: cosine
Threshold: 0.0

Embedding dimension: 8

✅ Found 5 results in 12ms

Rank | ID                               | Score    | Metadata
────────────────────────────────────────────────────────────────────────────────
1    | vec-001                          | 0.998765 | {"category":"technology"...
2    | vec-003                          | 0.995432 | {"category":"technology"...
3    | vec-002                          | 0.987654 | {"category":"science","d...
4    | vec-005                          | 0.976543 | {"category":"technology"...
5    | vec-004                          | 0.965432 | {"category":"research","...
```

### 4. Database Statistics

View comprehensive database statistics.

```bash
# Basic statistics
npx agentdb stats ./tests/test.db

# Detailed statistics
npx agentdb stats ./tests/test.db -d

# Output as JSON
npx agentdb stats ./tests/test.db -f json

# Detailed JSON output
npx agentdb stats ./tests/test.db -d -f json
```

**Output Example:**
```
📊 Database Statistics

Database: /path/to/test.db

Basic Statistics
──────────────────────────────────────────────────
Total vectors:     5
Database size:     16.4 KB
Avg vector size:   3.28 KB

Query Cache Statistics
──────────────────────────────────────────────────
Cache hits:        12
Cache misses:      3
Hit rate:          80.00%
Cached entries:    5
Cache evictions:   0
Avg access time:   0.125ms

Database Information
──────────────────────────────────────────────────
Backend type:      native
Initialized:       Yes
```

## Complete Workflow Example

Here's a complete workflow from creating a database to querying it:

```bash
# 1. Initialize a new database
npx agentdb init ./mydb.sqlite

# 2. Import vectors from JSON
npx agentdb import ./mydb.sqlite ./data/vectors.json -v

# 3. Check database stats
npx agentdb stats ./mydb.sqlite -d

# 4. Query for similar vectors
npx agentdb query ./mydb.sqlite "[0.1,0.2,0.3,0.4,0.5]" -k 10

# 5. Export results
npx agentdb export ./mydb.sqlite ./output/backup.json
```

## Error Handling

The CLI provides helpful error messages:

```bash
# Missing database
$ npx agentdb query ./nonexistent.db "[0.1,0.2,0.3]"
❌ Database not found: /path/to/nonexistent.db

# Invalid embedding format
$ npx agentdb query ./test.db "invalid"
❌ Failed to parse embedding: Unexpected token 'i'

Expected formats:
  - JSON array: [0.1, 0.2, 0.3, ...]
  - Space-separated: 0.1 0.2 0.3 ...
  - Comma-separated: 0.1,0.2,0.3,...

# Missing required arguments
$ npx agentdb import
❌ Usage: agentdb import <database> <file> [options]
```

## Performance Tips

1. **Batch Size**: For large imports, adjust batch size:
   ```bash
   npx agentdb import ./db.sqlite ./large-file.json -b 10000
   ```

2. **Query Cache**: The database automatically caches queries for 50-100x speedup on repeated searches.

3. **Progress Tracking**: Use `-v` flag to see detailed progress:
   ```bash
   npx agentdb import ./db.sqlite ./data.json -v
   ```

## Integration with Node.js

You can also use these commands programmatically:

```javascript
const { importVectors, queryVectors, showStats } = require('agentdb/dist/cli/db-commands.js');

// Import vectors
await importVectors('./test.db', './vectors.json', {
  format: 'json',
  batchSize: 1000,
  verbose: true
});

// Query database
await queryVectors('./test.db', '[0.1,0.2,0.3]', {
  k: 5,
  metric: 'cosine',
  format: 'table'
});

// Show stats
await showStats('./test.db', {
  detailed: true,
  format: 'json'
});
```

## Advanced Features

### Custom Metadata Filtering (Coming Soon)
```bash
# Filter by metadata during export
npx agentdb export ./db.sqlite ./output.json -w "metadata.category='technology'"
```

### Streaming Large Exports (Coming Soon)
```bash
# Stream export for memory efficiency
npx agentdb export ./db.sqlite ./output.json --stream
```

## Troubleshooting

### Build Issues
```bash
# Rebuild if commands not found
npm run build
```

### Database Lock Issues
```bash
# Close all connections to the database first
# Or use a different database path
```

### Memory Issues with Large Imports
```bash
# Use smaller batch sizes
npx agentdb import ./db.sqlite ./huge-file.json -b 100
```

## See Also

- [AgentDB API Documentation](../README.md)
- [Plugin Development Guide](./PLUGIN_QUICKSTART.md)
- [MCP Server Integration](./MCP_GUIDE.md)
