/**
 * Basic Node.js usage example
 */

const { createDb, Vector } = require('../dist/index.js');

async function main() {
  console.log('SQLiteVector - Node.js Example\n');

  // Create in-memory database
  console.log('Creating database...');
  const db = await createDb({ memoryMode: true });

  // Insert vectors
  console.log('Inserting vectors...');
  const vector1 = new Vector([0.1, 0.2, 0.3], { doc: 'First document' });
  const vector2 = new Vector([0.4, 0.5, 0.6], { doc: 'Second document' });
  const vector3 = new Vector([0.15, 0.25, 0.35], { doc: 'Similar to first' });

  const id1 = await db.insert(vector1);
  const id2 = await db.insert(vector2);
  const id3 = await db.insert(vector3);

  console.log(`Inserted vectors with IDs: ${id1}, ${id2}, ${id3}`);

  // Batch insert
  console.log('\nBatch inserting vectors...');
  const batchVectors = [
    new Vector([0.7, 0.8, 0.9], { doc: 'Batch 1' }),
    new Vector([0.2, 0.3, 0.4], { doc: 'Batch 2' }),
  ];
  const batchIds = await db.insertBatch(batchVectors);
  console.log(`Batch inserted IDs: ${batchIds.join(', ')}`);

  // Search for similar vectors
  console.log('\nSearching for similar vectors...');
  const query = new Vector([0.12, 0.22, 0.32]);
  const results = await db.search(query, 3, { metric: 'cosine' });

  console.log('Search results:');
  results.forEach((result, i) => {
    console.log(`  ${i + 1}. ID: ${result.id}, Score: ${result.score.toFixed(4)}, Metadata:`, result.metadata);
  });

  // Get statistics
  console.log('\nDatabase statistics:');
  const stats = await db.getStats();
  console.log(`  Total vectors: ${stats.totalVectors}`);
  console.log(`  Dimension: ${stats.dimension}`);
  console.log(`  Memory usage: ${(stats.memoryUsage / 1024).toFixed(2)} KB`);
  console.log(`  DB size: ${(stats.dbSize / 1024).toFixed(2)} KB`);

  // Update a vector
  console.log('\nUpdating vector...');
  const updated = await db.update(id1, new Vector([0.11, 0.21, 0.31], { doc: 'Updated first' }));
  console.log(`Update successful: ${updated}`);

  // Delete a vector
  console.log('\nDeleting vector...');
  const deleted = await db.delete(id2);
  console.log(`Delete successful: ${deleted}`);

  // Final stats
  const finalStats = await db.getStats();
  console.log(`\nFinal vector count: ${finalStats.totalVectors}`);

  console.log('\nExample completed successfully!');
}

main().catch(console.error);
