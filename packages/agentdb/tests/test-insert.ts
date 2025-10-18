import { SQLiteVectorDB } from '../src/core/vector-db.js';

const db = new SQLiteVectorDB({ memoryMode: true });

console.log('Inserting vector...');
const id = db.insert({
  embedding: Array(768).fill(0.1),
  metadata: { type: 'test', value: 123 },
});

console.log('Inserted with ID:', id);

const results = db.search(Array(768).fill(0), 10);
console.log('Search results:', results.length);

if (results.length > 0) {
  console.log('First result metadata:', results[0].metadata);
}

db.close();
