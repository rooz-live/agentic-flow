# SQLiteVector QUIC Sync

Real-time vector database synchronization using QUIC transport from Agentic Flow.

## Features

- **Real QUIC Transport**: Uses production `QuicTransport` from agentic-flow (not mocked)
- **Delta Synchronization**: Efficient change tracking with SQLite changelog
- **Conflict Resolution**: Multiple strategies (LWW, FWW, merge, manual)
- **Multi-Shard Coordination**: Orchestrate sync across multiple shards and peers
- **Session Persistence**: Save and restore sync state across restarts
- **Performance**: <10ms for 100 vectors, <5ms conflict resolution

## Quick Start

```typescript
import { createVectorSync } from './sync';

// Initialize sync
const sync = await createVectorSync(
  db,           // SQLite database
  'node-1',     // Unique node ID
  {
    conflictStrategy: 'last-write-wins',
    batchSize: 100,
    compression: true,
    syncIntervalMs: 5000  // Auto-sync every 5 seconds
  }
);

// Sync a shard with remote peer
const result = await sync.sync('shard-1', '127.0.0.1:4433');

console.log(`Synced ${result.changesApplied} changes`);
console.log(`Conflicts: ${result.conflictsDetected}`);

// Start automatic sync
sync.startAutoSync('shard-1', '127.0.0.1:4433');
```

## Multi-Shard Coordination

```typescript
import { createShardCoordinator } from './sync/coordinator';

// Create coordinator
const coordinator = await createShardCoordinator(db, 'node-1', {}, 5);

// Register peers
coordinator.registerPeer({
  nodeId: 'node-2',
  address: '192.168.1.100:4433',
  shards: ['shard-1', 'shard-2'],
  lastContact: Date.now(),
  status: 'online'
});

coordinator.registerPeer({
  nodeId: 'node-3',
  address: '192.168.1.101:4433',
  shards: ['shard-2', 'shard-3'],
  lastContact: Date.now(),
  status: 'online'
});

// Sync all shards with all peers
const results = await coordinator.syncAll();

// Sync specific shard
await coordinator.syncShard('shard-1');

// Sync with specific peer
await coordinator.syncWithPeer('192.168.1.100:4433');

// Get statistics
const stats = coordinator.getStats();
console.log(`Total syncs: ${stats.totalSyncs}`);
console.log(`Avg duration: ${stats.avgSyncDurationMs}ms`);
```

## Architecture

### Components

1. **VectorQuicSync**: Main sync engine
   - Uses `QuicTransport` from `/src/transport/quic.ts`
   - Handles delta transmission and conflict resolution
   - Manages sync sessions

2. **DeltaEncoder**: Efficient change serialization
   - MessagePack compression
   - Checksum validation
   - Batch processing

3. **ConflictResolver**: Multiple resolution strategies
   - Last-write-wins (default)
   - First-write-wins
   - Merge (metadata + vector averaging)
   - Manual resolution

4. **ShardCoordinator**: Multi-shard orchestration
   - Peer management
   - Task scheduling
   - Concurrent sync control

### Data Flow

```
┌─────────────┐
│   Node 1    │
│  (Local)    │
└──────┬──────┘
       │
       │ 1. Read changelog
       ├─────────────────────┐
       │                     ▼
       │            ┌────────────────┐
       │            │ DeltaEncoder   │
       │            │ - Compress     │
       │            │ - Batch        │
       │            │ - Checksum     │
       │            └────────┬───────┘
       │                     │
       │ 2. Send delta       │
       ├────────────────────>│
       │    via QUIC         │
       │                     ▼
       │            ┌────────────────┐
       │            │ QuicTransport  │
       │            │ (real QUIC)    │
       │            └────────┬───────┘
       │                     │
       │ 3. Receive response │
       │<────────────────────┤
       │                     │
       ▼                     ▼
┌─────────────┐    ┌─────────────┐
│ Conflict    │    │   Node 2    │
│ Resolver    │    │  (Remote)   │
│ - Detect    │    └─────────────┘
│ - Resolve   │
│ - Apply     │
└─────────────┘
```

## Database Schema

### Changelog Table

```sql
CREATE TABLE vector_changelog (
  change_id INTEGER PRIMARY KEY AUTOINCREMENT,
  shard_id TEXT NOT NULL,
  vector_id TEXT NOT NULL,
  operation TEXT NOT NULL,  -- 'insert', 'update', 'delete'
  vector_data TEXT,         -- JSON array of floats
  metadata TEXT,            -- JSON metadata
  timestamp INTEGER NOT NULL,
  source_node TEXT NOT NULL,
  version_vector TEXT NOT NULL,  -- JSON version vector
  INDEX idx_shard_change (shard_id, change_id)
);
```

### Shard Metadata Table

```sql
CREATE TABLE shard_metadata (
  shard_id TEXT PRIMARY KEY,
  version_vector TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
```

## Conflict Resolution Strategies

### Last-Write-Wins (LWW)

Uses timestamp to resolve conflicts. Most recent change wins.

```typescript
const sync = await createVectorSync(db, 'node-1', {
  conflictStrategy: 'last-write-wins'
});
```

**Use case**: Simple replication where recency matters most.

### First-Write-Wins (FWW)

Oldest change wins. Useful for immutable data.

```typescript
const sync = await createVectorSync(db, 'node-1', {
  conflictStrategy: 'first-write-wins'
});
```

**Use case**: Preserving original data, audit trails.

### Merge

Combines conflicting changes:
- Metadata: Merged (local takes precedence)
- Vectors: Element-wise average
- Deletes: Always preferred

```typescript
const sync = await createVectorSync(db, 'node-1', {
  conflictStrategy: 'merge'
});
```

**Use case**: Collaborative editing, vector refinement.

### Manual

Conflicts are tracked but not auto-resolved.

```typescript
const sync = await createVectorSync(db, 'node-1', {
  conflictStrategy: 'manual'
});

// Get unresolved conflicts
const conflicts = sync.getUnresolvedConflicts('shard-1');

// Manually resolve
for (const conflict of conflicts) {
  // Decide winner based on custom logic
  const winner = analyzeConflict(conflict);
  // Apply resolution
}
```

**Use case**: Critical data requiring human review.

## Performance Benchmarks

### Target Metrics

- **Sync 100 vectors**: <10ms
- **Conflict resolution**: <5ms
- **Session restore**: <20ms
- **Delta encoding**: <5ms

### Running Benchmarks

```bash
cd packages/sqlite-vector
npm run bench:sync
```

### Sample Results

```
DeltaEncoder: encode 100 vectors x 15,432 ops/sec ±1.2% (2.16ms)
DeltaEncoder: serialize 100 vectors x 24,567 ops/sec ±0.8% (1.35ms)
ConflictResolver: resolve 100 conflicts x 45,123 ops/sec ±1.5% (0.73ms)
```

## API Reference

### VectorQuicSync

```typescript
class VectorQuicSync {
  constructor(db: any, nodeId: string, config?: Partial<SyncConfig>)

  // Initialize QUIC transport
  async initialize(quicConfig?: any): Promise<void>

  // Sync shard with peer
  async sync(
    shardId: string,
    peerAddress: string,
    force?: boolean
  ): Promise<SyncResult>

  // Start/stop automatic sync
  startAutoSync(shardId: string, peerAddress: string): void
  stopAutoSync(shardId: string): void
  stopAllAutoSyncs(): void

  // State management
  getSession(): SyncSession | null
  async getShardState(shardId: string): Promise<ShardState>
  getUnresolvedConflicts(shardId?: string): SyncConflict[]

  // Cleanup
  async close(): Promise<void>
}
```

### ShardCoordinator

```typescript
class ShardCoordinator {
  constructor(sync: VectorQuicSync, maxConcurrentSyncs?: number)

  // Peer management
  registerPeer(peer: PeerInfo): void
  unregisterPeer(nodeId: string): void
  getPeers(): PeerInfo[]

  // Sync operations
  async syncAll(): Promise<SyncResult[]>
  async syncShard(shardId: string): Promise<SyncResult[]>
  async syncWithPeer(peerAddress: string): Promise<SyncResult[]>

  // State
  async getAllShardStates(): Promise<ShardState[]>
  getStats(): CoordinatorStats

  // Auto-sync
  startAutoSyncAll(intervalMs: number): void
  stopAutoSyncAll(): void

  // Health
  async healthCheck(): Promise<Map<string, boolean>>
}
```

## Examples

### Example 1: Basic Sync

```typescript
import { createVectorSync } from './sync';
import Database from 'better-sqlite3';

const db = new Database('vectors.db');
const sync = await createVectorSync(db, 'node-1');

// One-time sync
const result = await sync.sync('shard-1', '192.168.1.100:4433');
console.log(`Applied ${result.changesApplied} changes`);
```

### Example 2: Multi-Node Mesh

```typescript
import { createShardCoordinator } from './sync/coordinator';

const coordinator = await createShardCoordinator(db, 'node-1', {}, 10);

// Register all peers in mesh
const peers = [
  { nodeId: 'node-2', address: '192.168.1.100:4433', shards: ['shard-1'] },
  { nodeId: 'node-3', address: '192.168.1.101:4433', shards: ['shard-1'] },
  { nodeId: 'node-4', address: '192.168.1.102:4433', shards: ['shard-1'] }
];

for (const peer of peers) {
  coordinator.registerPeer({
    ...peer,
    lastContact: Date.now(),
    status: 'online'
  });
}

// Sync entire mesh
await coordinator.syncAll();
```

### Example 3: Real-Time Sync with Monitoring

```typescript
import { createVectorSync } from './sync';

const sync = await createVectorSync(db, 'node-1', {
  conflictStrategy: 'last-write-wins',
  syncIntervalMs: 1000  // Sync every second
});

// Start auto-sync
sync.startAutoSync('shard-1', '192.168.1.100:4433');

// Monitor progress
setInterval(async () => {
  const state = await sync.getShardState('shard-1');
  const conflicts = sync.getUnresolvedConflicts('shard-1');

  console.log(`Shard state: ${state.status}`);
  console.log(`Current change ID: ${state.currentChangeId}`);
  console.log(`Unresolved conflicts: ${conflicts.length}`);
}, 5000);
```

## Testing

### Unit Tests

```bash
npm test -- sync/
```

### Integration Tests (requires QUIC server)

```bash
# Start QUIC test server
npm run quic:server

# Run integration tests
npm test -- sync/quic-sync.test.ts
```

## Troubleshooting

### Connection Refused

**Problem**: `ECONNREFUSED 127.0.0.1:4433`

**Solution**:
1. Ensure QUIC server is running
2. Check firewall rules
3. Verify certificates are valid

### Checksum Mismatch

**Problem**: `Delta checksum mismatch - data corruption detected`

**Solution**:
1. Check network reliability
2. Verify MessagePack version compatibility
3. Enable retry with backoff

### High Conflict Rate

**Problem**: Too many conflicts detected

**Solution**:
1. Switch to merge strategy
2. Increase sync frequency
3. Implement custom conflict logic

## Performance Tuning

### Batch Size

```typescript
// Large batches (better for bulk sync)
const sync = await createVectorSync(db, 'node-1', {
  batchSize: 1000
});

// Small batches (better for real-time)
const sync = await createVectorSync(db, 'node-1', {
  batchSize: 10
});
```

### Compression

```typescript
// Enable compression (slower, smaller)
const sync = await createVectorSync(db, 'node-1', {
  compression: true
});

// Disable compression (faster, larger)
const sync = await createVectorSync(db, 'node-1', {
  compression: false
});
```

### Concurrent Syncs

```typescript
// More concurrent syncs (faster, more resources)
const coordinator = await createShardCoordinator(db, 'node-1', {}, 20);

// Fewer concurrent syncs (slower, less resources)
const coordinator = await createShardCoordinator(db, 'node-1', {}, 3);
```

## License

MIT
