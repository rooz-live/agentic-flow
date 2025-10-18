/**
 * Binary Quantization Example
 *
 * Demonstrates 32x compression and ultra-fast search with binary quantization
 */

import { createBinaryQuantizer } from 'sqlite-vector';

// Example: BERT embeddings search with binary quantization

async function main() {
  // 1. Setup - Create quantizer
  console.log('Setting up binary quantizer...');

  const quantizer = createBinaryQuantizer({
    method: 'median',      // Adaptive threshold from training data
    useAsymmetric: true    // Better search quality
  });

  // 2. Generate sample BERT embeddings (768 dimensions)
  console.log('Generating sample vectors...');

  const dimensions = 768;
  const dbSize = 10000;

  function randomVector(dim: number): number[] {
    return Array.from({ length: dim }, () => Math.random() * 2 - 1);
  }

  const database = Array.from({ length: dbSize }, () => randomVector(dimensions));
  const queries = Array.from({ length: 10 }, () => randomVector(dimensions));

  // 3. Train quantizer
  console.log('Training quantizer on sample data...');

  const trainingData = database.slice(0, 1000);
  await quantizer.train(trainingData);

  console.log(`Trained on ${trainingData.length} vectors`);

  // 4. Encode database
  console.log('Encoding database vectors...');

  const startEncode = Date.now();
  const encodedDb = database.map(v => quantizer.encode(v));
  const encodeTime = Date.now() - startEncode;

  console.log(`Encoded ${dbSize} vectors in ${encodeTime}ms`);

  // 5. Get compression statistics
  const stats = quantizer.getStats();

  console.log('\n=== Compression Statistics ===');
  console.log(`Dimensions: ${stats.dimensions}`);
  console.log(`Compressed bytes: ${stats.compressedBytes}`);
  console.log(`Compression ratio: ${stats.compressionRatio.toFixed(1)}x`);
  console.log(`Original DB size: ${(dbSize * dimensions * 4 / 1024 / 1024).toFixed(1)}MB`);
  console.log(`Compressed DB size: ${(dbSize * stats.compressedBytes / 1024 / 1024).toFixed(1)}MB`);
  console.log(`Memory saved: ${((1 - 1/stats.compressionRatio) * 100).toFixed(1)}%`);

  // 6. Simple search (single-stage)
  console.log('\n=== Single-Stage Search ===');

  const query1 = queries[0];
  const startSearch = Date.now();

  const simpleResults = encodedDb
    .map((codes, idx) => ({
      idx,
      score: quantizer.asymmetricSearch(query1, codes)
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 10);

  const searchTime = Date.now() - startSearch;

  console.log(`Found top 10 in ${searchTime}ms`);
  console.log('Top 3 results:', simpleResults.slice(0, 3).map(r => r.idx));

  // 7. Two-stage search (binary filter + exact rerank)
  console.log('\n=== Two-Stage Search (Recommended) ===');

  function cosineDistance(a: number[], b: number[]): number {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    return 1 - (dot / (Math.sqrt(magA) * Math.sqrt(magB)));
  }

  const query2 = queries[1];
  const k = 10;
  const startTwoStage = Date.now();

  // Stage 1: Binary filter (fast, get 10x candidates)
  const candidates = encodedDb
    .map((codes, idx) => ({
      idx,
      score: quantizer.asymmetricSearch(query2, codes)
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, k * 10);  // 100 candidates

  // Stage 2: Exact reranking (accurate)
  const finalResults = candidates
    .map(c => ({
      idx: c.idx,
      score: cosineDistance(query2, database[c.idx])
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, k);

  const twoStageTime = Date.now() - startTwoStage;

  console.log(`Found top ${k} with reranking in ${twoStageTime}ms`);
  console.log('Top 3 results:', finalResults.slice(0, 3).map(r => r.idx));

  // 8. Hamming distance example (fastest)
  console.log('\n=== Hamming Distance (Fastest) ===');

  const query3Code = quantizer.encode(queries[2]);
  const startHamming = Date.now();

  const hammingResults = encodedDb
    .map((codes, idx) => ({
      idx,
      distance: quantizer.hammingDistance(query3Code, codes)
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 10);

  const hammingTime = Date.now() - startHamming;

  console.log(`Found top 10 in ${hammingTime}ms (pure Hamming)`);
  console.log('Top 3 results:', hammingResults.slice(0, 3).map(r => r.idx));

  // 9. Performance summary
  console.log('\n=== Performance Summary ===');
  console.log(`Avg encode time: ${stats.avgEncodeTime.toFixed(2)}ms`);
  console.log(`Avg Hamming time: ${stats.avgHammingTime.toFixed(2)}μs`);
  console.log(`Single-stage search: ${searchTime}ms`);
  console.log(`Two-stage search: ${twoStageTime}ms`);
  console.log(`Hamming search: ${hammingTime}ms`);

  // 10. Calculate recall (compare with ground truth)
  console.log('\n=== Quality Metrics ===');

  // Ground truth: exact search
  const groundTruth = database
    .map((vec, idx) => ({
      idx,
      score: cosineDistance(query2, vec)
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, k);

  // Calculate recall
  const truePositives = finalResults.filter(r =>
    groundTruth.some(gt => gt.idx === r.idx)
  ).length;

  const recall = truePositives / k;
  console.log(`Recall@${k}: ${(recall * 100).toFixed(1)}%`);
}

// Run example
main().catch(console.error);

/**
 * Expected Output:
 *
 * Setting up binary quantizer...
 * Generating sample vectors...
 * Training quantizer on sample data...
 * Trained on 1000 vectors
 * Encoding database vectors...
 * Encoded 10000 vectors in ~1700ms
 *
 * === Compression Statistics ===
 * Dimensions: 768
 * Compressed bytes: 96
 * Compression ratio: 32.0x
 * Original DB size: 29.3MB
 * Compressed DB size: 0.9MB
 * Memory saved: 96.9%
 *
 * === Single-Stage Search ===
 * Found top 10 in ~160ms
 * Top 3 results: [1234, 5678, 9012]
 *
 * === Two-Stage Search (Recommended) ===
 * Found top 10 with reranking in ~180ms
 * Top 3 results: [1234, 5678, 9012]
 *
 * === Hamming Distance (Fastest) ===
 * Found top 10 in ~15ms (pure Hamming)
 * Top 3 results: [1234, 5678, 9012]
 *
 * === Performance Summary ===
 * Avg encode time: 0.17ms
 * Avg Hamming time: 3.32μs
 * Single-stage search: 160ms
 * Two-stage search: 180ms
 * Hamming search: 15ms
 *
 * === Quality Metrics ===
 * Recall@10: 85.0%+
 */
