# Database File Locations

## Overview

SQLiteVector supports both file-based and in-memory databases. This guide explains where database files are stored and how to configure them.

## Default Behavior

### File-Based Mode (Persistent)

When you provide a `path` option, SQLiteVector automatically creates a **persistent database file** on disk:

```typescript
import { createVectorDB } from '@agentic-flow/sqlite-vector';

// Creates a file at ./data/mydb.db
const db = await createVectorDB({
  path: './data/mydb.db'
});
```

**Key Points:**
- ✅ Database persists after `db.close()`
- ✅ Data survives application restarts
- ✅ Can be backed up, copied, or version controlled
- ✅ Suitable for production use

### In-Memory Mode (Temporary)

When no `path` is provided **OR** you explicitly set `memoryMode: true`, the database exists only in RAM:

```typescript
// Option 1: No path (defaults to in-memory)
const db = await createVectorDB();

// Option 2: Explicit memory mode
const db = await createVectorDB({
  memoryMode: true
});
```

**Key Points:**
- ⚡ Fastest performance (no disk I/O)
- ⚠️ All data lost when `db.close()` is called
- ⚠️ All data lost on application restart
- ✅ Perfect for testing and temporary operations

## Configuration Options

### File Path with Custom Location

```typescript
const db = await createVectorDB({
  path: '/absolute/path/to/database.db'  // Absolute path
});

const db2 = await createVectorDB({
  path: './relative/path/database.db'    // Relative to working directory
});

const db3 = await createVectorDB({
  path: join(__dirname, '..', 'data', 'vectors.db')  // Using path.join
});
```

### Override Memory Mode

```typescript
// Force in-memory even with path specified
const db = await createVectorDB({
  path: './mydb.db',
  memoryMode: true  // Overrides path, uses :memory:
});
```

## Database File Locations by Use Case

### 1. ReasoningBank Integration Tests

**Location:** `./data/reasoningbank-test.db`

```typescript
const db = await createVectorDB({
  path: join('./data', 'reasoningbank-test.db')
});
```

**Created by:** `tests/integration/reasoningbank.test.ts`
**Size:** ~140 KB (with 63 vectors, patterns, and experiences)
**Cleanup:** Automatically deleted in `afterAll()` hook

### 2. Development/Testing

**Recommended Location:** `./data/` directory

```typescript
const db = await createVectorDB({
  path: './data/dev-vectors.db'
});
```

**Benefits:**
- Organized in one directory
- Easy to `.gitignore` (add `data/*.db` to .gitignore)
- Simple cleanup: `rm -rf data/`

### 3. Production Deployment

**Recommended Locations:**

**Option A: Application Data Directory**
```typescript
import { join } from 'path';
import os from 'os';

const dbPath = join(os.homedir(), '.myapp', 'vectors.db');
const db = await createVectorDB({ path: dbPath });
```

**Option B: System Database Directory**
```typescript
// Linux/Mac
const dbPath = '/var/lib/myapp/vectors.db';

// Windows
const dbPath = 'C:\\ProgramData\\MyApp\\vectors.db';

const db = await createVectorDB({ path: dbPath });
```

**Option C: Docker Volume**
```yaml
# docker-compose.yml
volumes:
  - ./data:/app/data

# Application code
const db = await createVectorDB({
  path: '/app/data/vectors.db'
});
```

### 4. Testing with Jest

**Use in-memory for speed:**

```typescript
describe('Vector DB Tests', () => {
  let db;

  beforeEach(async () => {
    // Fast: new in-memory DB for each test
    db = await createVectorDB();
  });

  afterEach(() => {
    db.close();  // Memory freed automatically
  });

  it('should insert vectors', () => {
    const id = db.insert({ embedding: [1, 0, 0] });
    expect(id).toBeTruthy();
  });
});
```

### 5. Browser (WASM Backend)

**Browser doesn't support file system directly.** Use export/import for persistence:

```typescript
// Create in-memory database (only option in browser)
const db = await createVectorDB();

// ... insert vectors ...

// Export to binary (for localStorage or server)
const data = db.export();
localStorage.setItem('vectordb', JSON.stringify(Array.from(data)));

// Later: Import from binary
const stored = JSON.parse(localStorage.getItem('vectordb'));
const restoredData = new Uint8Array(stored);
await db.importAsync(restoredData);
```

## Checking Database File Locations

### During Development

```bash
# Find all SQLite databases
find . -name "*.db" -type f

# Check database file size
ls -lh ./data/*.db
du -h ./data/*.db

# View database schema
sqlite3 ./data/mydb.db ".schema"

# Count vectors
sqlite3 ./data/mydb.db "SELECT COUNT(*) FROM vectors;"
```

### In Application Code

```typescript
import { existsSync, statSync } from 'fs';
import { resolve } from 'path';

const dbPath = './data/vectors.db';
const db = await createVectorDB({ path: dbPath });

// Get full path
const fullPath = resolve(dbPath);
console.log(`Database location: ${fullPath}`);

// Check if file exists
if (existsSync(fullPath)) {
  const stats = statSync(fullPath);
  console.log(`Database size: ${(stats.size / 1024).toFixed(2)} KB`);
}

// Get database statistics
const dbStats = db.stats();
console.log(`Vectors: ${dbStats.count}`);
console.log(`Storage: ${(dbStats.size / 1024).toFixed(2)} KB`);
```

## Database File Format

SQLiteVector uses the standard **SQLite3 database format**:

- **File Extension:** `.db` (recommended)
- **Format:** SQLite 3.x binary format
- **Compatibility:** Can be opened with any SQLite tool
- **Schema:**
  ```sql
  CREATE TABLE vectors (
    id TEXT PRIMARY KEY,
    embedding BLOB NOT NULL,
    norm REAL NOT NULL,
    metadata TEXT,
    timestamp INTEGER NOT NULL
  );
  ```

## Common Issues

### Issue 1: Database File Not Created

**Symptom:** `existsSync(dbPath)` returns `false` after creating database.

**Cause:** Using in-memory mode by default.

**Solution:**
```typescript
// ❌ Wrong: memoryMode defaults to true
const db = await createVectorDB({ path: './mydb.db' });

// ✅ Correct: explicitly set memoryMode: false (or omit it)
const db = await createVectorDB({
  path: './mydb.db',
  memoryMode: false  // Optional, auto-detected now
});
```

**Note:** As of version 1.0.0, if `path` is provided, `memoryMode` automatically defaults to `false`.

### Issue 2: Permission Denied

**Symptom:** `Error: EACCES: permission denied`

**Solution:**
```bash
# Ensure directory exists and is writable
mkdir -p ./data
chmod 755 ./data

# Or use a writable system location
const db = await createVectorDB({
  path: join(os.tmpdir(), 'vectors.db')
});
```

### Issue 3: Database Locked

**Symptom:** `Error: database is locked`

**Cause:** Another process has the database open, or WAL mode not enabled.

**Solution:**
```typescript
const db = await createVectorDB({
  path: './mydb.db',
  walMode: true  // Enable Write-Ahead Logging for concurrency
});
```

### Issue 4: Data Not Persisting

**Symptom:** Database file exists but data is lost after restart.

**Causes & Solutions:**
1. **Not closing database properly:**
   ```typescript
   // ❌ Wrong: data may not flush to disk
   process.exit(0);

   // ✅ Correct: close before exit
   db.close();
   process.exit(0);
   ```

2. **Using in-memory override:**
   ```typescript
   // ❌ Wrong: path ignored due to memoryMode
   const db = await createVectorDB({
     path: './mydb.db',
     memoryMode: true  // Overrides path!
   });

   // ✅ Correct: remove memoryMode or set to false
   const db = await createVectorDB({
     path: './mydb.db'
   });
   ```

## Best Practices

### 1. Use Absolute Paths in Production

```typescript
import { resolve } from 'path';

const dbPath = resolve('./data/vectors.db');
const db = await createVectorDB({ path: dbPath });
console.log(`Database: ${dbPath}`);
```

### 2. Create Directory Before Database

```typescript
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

const dbPath = './data/vectors.db';
const dbDir = dirname(dbPath);

if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const db = await createVectorDB({ path: dbPath });
```

### 3. Add Database Files to .gitignore

```gitignore
# .gitignore
data/*.db
data/*.db-shm
data/*.db-wal
*.db
*.db-shm
*.db-wal
```

### 4. Backup Databases Regularly

```bash
#!/bin/bash
# backup-db.sh
timestamp=$(date +%Y%m%d-%H%M%S)
cp ./data/vectors.db ./backups/vectors-$timestamp.db
```

### 5. Close Databases Gracefully

```typescript
process.on('SIGINT', () => {
  console.log('Closing database...');
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Closing database...');
  db.close();
  process.exit(0);
});
```

## Summary

| Mode | Persistent | Fast | Use Case |
|------|-----------|------|----------|
| **File-based** (`path: './mydb.db'`) | ✅ Yes | ⚡ Fast | Production, development |
| **In-memory** (no path) | ❌ No | ⚡⚡ Fastest | Testing, temporary |
| **WASM (browser)** | Export/Import | ⚡ Fast | Web applications |

**Default Database Locations:**
- **Tests:** `./data/reasoningbank-test.db` (140 KB)
- **Development:** `./data/` directory
- **Production:** System-appropriate location (`/var/lib`, `%APPDATA%`, etc.)
- **Browser:** In-memory with export/import

**Key Configuration:**
```typescript
// File-based (persistent)
await createVectorDB({ path: './data/vectors.db' });

// In-memory (temporary)
await createVectorDB();
```

---

**Version:** 1.0.0
**Last Updated:** 2025-10-17
**See Also:** [README.md](../README.md), [PERFORMANCE_REPORT.md](./PERFORMANCE_REPORT.md)
