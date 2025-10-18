/**
 * SQLiteVector QUIC Sync - Performance Benchmarks
 *
 * Target: <100ms for 100 vector sync, <5ms for conflict resolution
 */

import { Suite } from 'benchmark';
import { VectorQuicSync } from '../src/sync/quic-sync';
import { DeltaEncoder } from '../src/sync/delta';
import { ConflictResolver } from '../src/sync/conflict';
import type { VectorChange } from '../src/sync/types';

// Mock database
class BenchDatabase {
  prepare() {
    return {
      all: () => [],
      get: () => ({ max_id: 0, version_vector: '{}' }),
      run: () => ({ changes: 1 })
    };
  }
}

// Create test data
function createVectorChanges(count: number): VectorChange[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    operation: 'insert' as const,
    shardId: 'bench-shard',
    vectorId: `vec-${i}`,
    vector: new Float32Array(128).fill(Math.random()),
    metadata: { index: i, timestamp: Date.now() },
    timestamp: Date.now() * 1000 + i,
    sourceNode: 'bench-node',
    versionVector: new Map([['bench-node', i + 1]])
  }));
}

// Benchmark suite
const suite = new Suite('SQLiteVector QUIC Sync');

// Delta Encoding Benchmarks
suite.add('DeltaEncoder: encode 10 vectors', () => {
  const changes = createVectorChanges(10);
  DeltaEncoder.encode('bench-shard', changes, 'msgpack');
});

suite.add('DeltaEncoder: encode 100 vectors', () => {
  const changes = createVectorChanges(100);
  DeltaEncoder.encode('bench-shard', changes, 'msgpack');
});

suite.add('DeltaEncoder: encode 1000 vectors', () => {
  const changes = createVectorChanges(1000);
  DeltaEncoder.encode('bench-shard', changes, 'msgpack');
});

// Serialization Benchmarks
const delta10 = DeltaEncoder.encode('bench-shard', createVectorChanges(10), 'msgpack');
const delta100 = DeltaEncoder.encode('bench-shard', createVectorChanges(100), 'msgpack');

suite.add('DeltaEncoder: serialize 10 vectors', () => {
  DeltaEncoder.serialize(delta10);
});

suite.add('DeltaEncoder: serialize 100 vectors', () => {
  DeltaEncoder.serialize(delta100);
});

const bytes10 = DeltaEncoder.serialize(delta10);
const bytes100 = DeltaEncoder.serialize(delta100);

suite.add('DeltaEncoder: deserialize 10 vectors', () => {
  DeltaEncoder.deserialize(bytes10);
});

suite.add('DeltaEncoder: deserialize 100 vectors', () => {
  DeltaEncoder.deserialize(bytes100);
});

// Conflict Resolution Benchmarks
const resolver = new ConflictResolver('last-write-wins');
const local10 = createVectorChanges(10);
const remote10 = createVectorChanges(10).map(c => ({
  ...c,
  id: c.id + 1000,
  sourceNode: 'remote-node'
}));

suite.add('ConflictResolver: resolve 10 conflicts', () => {
  resolver.resolveAll(local10, remote10);
});

const local100 = createVectorChanges(100);
const remote100 = createVectorChanges(100).map(c => ({
  ...c,
  id: c.id + 1000,
  sourceNode: 'remote-node'
}));

suite.add('ConflictResolver: resolve 100 conflicts', () => {
  resolver.resolveAll(local100, remote100);
});

const local1000 = createVectorChanges(1000);
const remote1000 = createVectorChanges(1000).map(c => ({
  ...c,
  id: c.id + 1000,
  sourceNode: 'remote-node'
}));

suite.add('ConflictResolver: resolve 1000 conflicts', () => {
  resolver.resolveAll(local1000, remote1000);
});

// Optimization Benchmarks
suite.add('DeltaEncoder: optimize 100 changes', () => {
  const changes = createVectorChanges(100);
  DeltaEncoder.optimize(changes);
});

suite.add('DeltaEncoder: batch 1000 changes (size 100)', () => {
  const changes = createVectorChanges(1000);
  DeltaEncoder.batch(changes, 100);
});

// Run benchmarks
suite
  .on('cycle', (event: any) => {
    console.log(String(event.target));

    // Check performance targets
    const hz = event.target.hz;
    const name = event.target.name;

    if (name.includes('100 vectors')) {
      const timeMs = (1000 / hz);
      const target = 10; // 10ms target for 100 vectors

      if (timeMs > target) {
        console.warn(
          `⚠️  Performance warning: ${name} took ${timeMs.toFixed(2)}ms (target: ${target}ms)`
        );
      } else {
        console.log(
          `✓ ${name} took ${timeMs.toFixed(2)}ms (target: ${target}ms)`
        );
      }
    }

    if (name.includes('resolve') && name.includes('conflicts')) {
      const timeMs = (1000 / hz);
      const target = 5; // 5ms target for conflict resolution

      if (timeMs > target) {
        console.warn(
          `⚠️  Performance warning: ${name} took ${timeMs.toFixed(2)}ms (target: ${target}ms)`
        );
      } else {
        console.log(
          `✓ ${name} took ${timeMs.toFixed(2)}ms (target: ${target}ms)`
        );
      }
    }
  })
  .on('complete', function(this: any) {
    console.log('\n📊 Benchmark Results Summary:');
    console.log('Fastest is ' + this.filter('fastest').map('name'));

    // Print performance analysis
    console.log('\n🎯 Performance Analysis:');
    this.forEach((bench: any) => {
      const timeMs = (1000 / bench.hz).toFixed(3);
      const opsPerSec = bench.hz.toFixed(0);
      console.log(`  ${bench.name}: ${timeMs}ms (${opsPerSec} ops/sec)`);
    });
  })
  .run({ async: true });

// Export for programmatic use
export { suite };
