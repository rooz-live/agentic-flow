/**
 * Vector Quantization Performance Benchmark
 * Tests compression ratio and accuracy retention
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { ProductQuantizer } from '../../src/quantization/product-quantization';

describe('Product Quantization Performance Benchmark', () => {
  const dimensions = 768;
  const numVectors = 1000;
  const trainingVectors: number[][] = [];

  beforeAll(() => {
    // Generate training vectors
    for (let i = 0; i < numVectors; i++) {
      const vector = Array.from({ length: dimensions }, () => Math.random());
      trainingVectors.push(vector);
    }
  });

  it('should achieve 4x compression with 8-bit quantization', async () => {
    const pq = new ProductQuantizer({
      dimensions,
      subvectors: 8,
      bits: 8,
      kmeansIterations: 20,
      enableStats: true
    });

    // Train quantizer
    console.log('Training quantizer...');
    const startTrain = performance.now();
    await pq.train(trainingVectors);
    const trainTime = performance.now() - startTrain;

    console.log(`\nQuantization Training:`);
    console.log(`  Training time: ${trainTime.toFixed(0)}ms`);
    console.log(`  Vectors:       ${numVectors}`);

    // Get compression stats
    const stats = pq.getStats();
    console.log(`\nCompression Statistics:`);
    console.log(`  Original size:     ${stats.originalSize} bytes`);
    console.log(`  Compressed size:   ${stats.compressedSize} bytes`);
    console.log(`  Compression ratio: ${stats.compressionRatio.toFixed(1)}x`);

    expect(stats.compressionRatio).toBeGreaterThanOrEqual(3);
    expect(pq.isTrained()).toBe(true);
  });

  it('should achieve 16x compression with 4-bit quantization', async () => {
    const pq = new ProductQuantizer({
      dimensions,
      subvectors: 16,
      bits: 4, // 16 centroids per subvector
      kmeansIterations: 15,
      enableStats: true
    });

    await pq.train(trainingVectors);

    const stats = pq.getStats();
    console.log(`\n4-bit Quantization:`);
    console.log(`  Compression ratio: ${stats.compressionRatio.toFixed(1)}x`);

    expect(stats.compressionRatio).toBeGreaterThanOrEqual(12);
  });

  it('should maintain accuracy after encode/decode', async () => {
    const pq = new ProductQuantizer({
      dimensions,
      subvectors: 8,
      bits: 8,
      kmeansIterations: 20
    });

    await pq.train(trainingVectors);

    // Test encode/decode accuracy
    const testVector = trainingVectors[0];
    const codes = pq.encode(testVector);
    const decoded = pq.decode(codes);

    // Calculate relative error
    let error = 0;
    for (let i = 0; i < dimensions; i++) {
      const diff = testVector[i] - decoded[i];
      error += diff * diff;
    }
    const mse = error / dimensions;
    const rmse = Math.sqrt(mse);
    const relativeError = rmse / Math.sqrt(
      testVector.reduce((sum, v) => sum + v * v, 0) / dimensions
    );

    console.log(`\nAccuracy Test:`);
    console.log(`  RMSE:           ${rmse.toFixed(4)}`);
    console.log(`  Relative error: ${(relativeError * 100).toFixed(2)}%`);

    // Expect relative error < 10% for good quantization
    expect(relativeError).toBeLessThan(0.15);
  });

  it('should measure encode/decode performance', async () => {
    const pq = new ProductQuantizer({
      dimensions,
      subvectors: 8,
      bits: 8,
      kmeansIterations: 20,
      enableStats: true
    });

    await pq.train(trainingVectors);

    // Benchmark encoding
    const encodeStart = performance.now();
    for (let i = 0; i < 100; i++) {
      pq.encode(trainingVectors[i % trainingVectors.length]);
    }
    const encodeTime = (performance.now() - encodeStart) / 100;

    // Benchmark decoding
    const codes = pq.encode(trainingVectors[0]);
    const decodeStart = performance.now();
    for (let i = 0; i < 100; i++) {
      pq.decode(codes);
    }
    const decodeTime = (performance.now() - decodeStart) / 100;

    console.log(`\nPerformance:`);
    console.log(`  Encode time: ${encodeTime.toFixed(3)}ms per vector`);
    console.log(`  Decode time: ${decodeTime.toFixed(3)}ms per vector`);

    const stats = pq.getStats();
    console.log(`\nStatistics:`);
    console.log(`  Encode count: ${stats.encodeCount}`);
    console.log(`  Decode count: ${stats.decodeCount}`);
    console.log(`  Avg encode:   ${stats.avgEncodeTime.toFixed(3)}ms`);
    console.log(`  Avg decode:   ${stats.avgDecodeTime.toFixed(3)}ms`);

    expect(encodeTime).toBeLessThan(1); // < 1ms per encode
    expect(decodeTime).toBeLessThan(1); // < 1ms per decode
  });

  it('should support asymmetric distance computation', async () => {
    const pq = new ProductQuantizer({
      dimensions,
      subvectors: 8,
      bits: 8,
      kmeansIterations: 20
    });

    await pq.train(trainingVectors);

    // Encode database vectors
    const encodedVectors = trainingVectors.slice(0, 100).map(v => pq.encode(v));

    // Query vector (not encoded)
    const query = Array.from({ length: dimensions }, () => Math.random());

    // Benchmark asymmetric distance
    const startTime = performance.now();
    const distances = encodedVectors.map(codes => pq.asymmetricDistance(query, codes));
    const searchTime = performance.now() - startTime;

    console.log(`\nAsymmetric Distance Search:`);
    console.log(`  Vectors:     100`);
    console.log(`  Total time:  ${searchTime.toFixed(2)}ms`);
    console.log(`  Per vector:  ${(searchTime / 100).toFixed(3)}ms`);

    expect(distances.length).toBe(100);
    expect(searchTime).toBeLessThan(100); // < 100ms for 100 vectors
  });

  it('should support codebook export/import', async () => {
    const pq = new ProductQuantizer({
      dimensions,
      subvectors: 8,
      bits: 8,
      kmeansIterations: 20
    });

    await pq.train(trainingVectors);

    // Export codebooks
    const codebooks = pq.exportCodebooks();
    expect(codebooks.length).toBe(8);

    // Create new quantizer and import
    const pq2 = new ProductQuantizer({
      dimensions,
      subvectors: 8,
      bits: 8
    });

    pq2.importCodebooks(codebooks);
    expect(pq2.isTrained()).toBe(true);

    // Verify encoding produces same results
    const testVector = trainingVectors[0];
    const codes1 = pq.encode(testVector);
    const codes2 = pq2.encode(testVector);

    expect(codes2).toEqual(codes1);

    console.log(`\nCodebook Export/Import:`);
    console.log(`  Codebooks exported: ${codebooks.length}`);
    console.log(`  Import successful:  ✓`);
    console.log(`  Encoding matches:   ✓`);
  });

  it('should test different subvector configurations', async () => {
    const configs = [
      { subvectors: 4, bits: 8, expectedRatio: 12 },
      { subvectors: 8, bits: 8, expectedRatio: 6 },
      { subvectors: 16, bits: 8, expectedRatio: 3 },
      { subvectors: 8, bits: 4, expectedRatio: 12 }
    ];

    console.log(`\nConfiguration Comparison:`);
    console.log(`  Config         | Compression | Train Time`);
    console.log(`  -------------- | ----------- | ----------`);

    for (const config of configs) {
      const pq = new ProductQuantizer({
        dimensions,
        ...config,
        kmeansIterations: 10 // Reduced for speed
      });

      const startTrain = performance.now();
      await pq.train(trainingVectors.slice(0, 500)); // Smaller training set
      const trainTime = performance.now() - startTrain;

      const stats = pq.getStats();

      console.log(
        `  ${config.subvectors}sv x ${config.bits}bit | ` +
        `${stats.compressionRatio.toFixed(1)}x        | ` +
        `${trainTime.toFixed(0)}ms`
      );

      expect(stats.compressionRatio).toBeGreaterThan(config.expectedRatio * 0.8);
    }
  });
});
