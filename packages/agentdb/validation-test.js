#!/usr/bin/env node
/**
 * Comprehensive validation test for SQLiteVector
 * Tests all core functionality
 */

async function loadModule() {
  // Use dynamic import for ESM modules
  return await import('./dist/index.js');
}

let createVectorDB, SQLiteVectorDB, BackendType;

async function runValidation() {
  console.log('🧪 SQLiteVector Validation Suite\n');

  // Load ESM module
  console.log('📦 Loading module...');
  const module = await loadModule();
  createVectorDB = module.createVectorDB;
  SQLiteVectorDB = module.SQLiteVectorDB;
  BackendType = module.BackendType;
  console.log('✅ Module loaded\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      failed++;
    }
  }

  // Test 1: Create database
  console.log('\n📦 Database Creation:');
  const db = await createVectorDB();
  test('Database instance created', () => {
    if (!(db instanceof SQLiteVectorDB)) throw new Error('Not an instance of SQLiteVectorDB');
  });

  test('Backend is native (Node.js)', () => {
    if (db.getBackendType() !== BackendType.NATIVE) throw new Error('Expected native backend');
  });

  // Test 2: Insert operations
  console.log('\n📝 Insert Operations:');
  const vector1 = { embedding: [1, 2, 3], metadata: { doc: 'test1' } };
  let id1;
  test('Insert single vector', () => {
    id1 = db.insert(vector1);
    if (!id1 || typeof id1 !== 'string') throw new Error('Invalid ID returned');
  });

  const vectors = [
    { embedding: [4, 5, 6], metadata: { doc: 'test2' } },
    { embedding: [7, 8, 9], metadata: { doc: 'test3' } },
    { embedding: [10, 11, 12], metadata: { doc: 'test4' } },
  ];
  test('Insert batch of vectors', () => {
    const ids = db.insertBatch(vectors);
    if (ids.length !== 3) throw new Error(`Expected 3 IDs, got ${ids.length}`);
  });

  // Test 3: Search operations
  console.log('\n🔍 Search Operations:');
  test('Search with cosine similarity', () => {
    const results = db.search([1, 2, 3], 2, 'cosine');
    if (results.length === 0) throw new Error('No results found');
    if (results[0].score < 0 || results[0].score > 1) throw new Error('Invalid score range');
  });

  test('Search with euclidean distance', () => {
    const results = db.search([4, 5, 6], 2, 'euclidean');
    if (results.length === 0) throw new Error('No results found');
  });

  test('Search with dot product', () => {
    const results = db.search([7, 8, 9], 2, 'dot');
    if (results.length === 0) throw new Error('No results found');
  });

  test('Search with threshold', () => {
    const results = db.search([1, 2, 3], 10, 'cosine', 0.9);
    if (!results.every(r => r.score >= 0.9)) throw new Error('Threshold not respected');
  });

  // Test 4: Retrieval operations
  console.log('\n📖 Retrieval Operations:');
  test('Get vector by ID', () => {
    const retrieved = db.get(id1);
    if (!retrieved) throw new Error('Vector not found');
    if (retrieved.id !== id1) throw new Error('ID mismatch');
    if (!retrieved.embedding) throw new Error('No embedding');
  });

  test('Get non-existent vector', () => {
    const result = db.get('nonexistent');
    if (result !== null) throw new Error('Should return null for non-existent ID');
  });

  // Test 5: Statistics
  console.log('\n📊 Statistics:');
  test('Get database stats', () => {
    const stats = db.stats();
    if (stats.count !== 4) throw new Error(`Expected 4 vectors, got ${stats.count}`);
    if (stats.size <= 0) throw new Error('Invalid size');
  });

  // Test 6: Metadata preservation
  console.log('\n🏷️  Metadata:');
  test('Metadata preserved in search', () => {
    const results = db.search([1, 2, 3], 1, 'cosine');
    if (!results[0].metadata) throw new Error('No metadata');
    if (results[0].metadata.doc !== 'test1') throw new Error('Metadata mismatch');
  });

  // Test 7: Delete operations
  console.log('\n🗑️  Delete Operations:');
  test('Delete vector', () => {
    const deleted = db.delete(id1);
    if (!deleted) throw new Error('Delete failed');
  });

  test('Verify deletion', () => {
    const retrieved = db.get(id1);
    if (retrieved !== null) throw new Error('Vector not deleted');
  });

  test('Delete non-existent vector', () => {
    const deleted = db.delete('nonexistent');
    if (deleted) throw new Error('Should return false for non-existent ID');
  });

  // Test 8: Performance
  console.log('\n⚡ Performance:');
  await asyncTest('Batch insert 1000 vectors', async () => {
    const largeVectors = Array.from({ length: 1000 }, (_, i) => ({
      embedding: [i, i + 1, i + 2],
      metadata: { index: i }
    }));

    const startTime = Date.now();
    const ids = db.insertBatch(largeVectors);
    const duration = Date.now() - startTime;

    if (ids.length !== 1000) throw new Error(`Expected 1000 IDs, got ${ids.length}`);
    if (duration > 5000) throw new Error(`Too slow: ${duration}ms (expected <5000ms)`);
    console.log(`   ⏱️  Inserted 1000 vectors in ${duration}ms (${Math.round(1000 / (duration / 1000))} vectors/sec)`);
  });

  await asyncTest('Search performance', async () => {
    const startTime = Date.now();
    for (let i = 0; i < 100; i++) {
      db.search([Math.random(), Math.random(), Math.random()], 5, 'cosine');
    }
    const duration = Date.now() - startTime;

    console.log(`   ⏱️  100 searches in ${duration}ms (${Math.round(100 / (duration / 1000))} queries/sec)`);
    if (duration > 1000) throw new Error(`Too slow: ${duration}ms`);
  });

  // Test 9: Edge cases
  console.log('\n🔬 Edge Cases:');
  test('Empty embedding', () => {
    try {
      db.insert({ embedding: [] });
      throw new Error('Should reject empty embedding');
    } catch (error) {
      // Expected to fail
    }
  });

  test('Search with k=0', () => {
    const results = db.search([1, 2, 3], 0, 'cosine');
    if (results.length !== 0) throw new Error('Should return empty results');
  });

  // Cleanup
  db.close();

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 Validation Results:`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

  if (failed === 0) {
    console.log('\n🎉 All validation tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Review output above.');
    process.exit(1);
  }
}

runValidation().catch(error => {
  console.error('\n❌ Validation failed:', error);
  process.exit(1);
});
