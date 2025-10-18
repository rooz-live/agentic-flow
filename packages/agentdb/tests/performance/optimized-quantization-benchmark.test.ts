/**
 * Optimized Quantization Benchmark
 * Tests improved accuracy profiles
 */

import { describe, it, expect } from '@jest/globals';
import {
  QuantizationProfiles,
  ImprovedProductQuantizer,
  QuantizationUtils
} from '../../src/quantization/optimized-pq';

describe('Optimized Quantization Performance', () => {
  const dimensions = 768;
  const numVectors = 1000;
  const trainingVectors: number[][] = [];
  const testVectors: number[][] = [];

  beforeAll(() => {
    // Generate training vectors
    for (let i = 0; i < numVectors; i++) {
      trainingVectors.push(
        Array.from({ length: dimensions }, () => Math.random())
      );
    }

    // Generate test vectors
    for (let i = 0; i < 100; i++) {
      testVectors.push(
        Array.from({ length: dimensions }, () => Math.random())
      );
    }
  });

  it('should show profile comparison', () => {
    console.log('\nQuantization Profile Comparison:');
    QuantizationUtils.printProfileComparison(dimensions);

    // Verify profiles exist
    const profiles = QuantizationProfiles.getAllProfiles(dimensions);
    expect(profiles.length).toBe(4);
  });

  it('should achieve HIGH_ACCURACY profile targets', async () => {
    const profile = QuantizationProfiles.HIGH_ACCURACY(dimensions);
    console.log(`\n=== Testing ${profile.name} Profile ===`);
    console.log(`Target: ${(profile.expectedAccuracy * 100).toFixed(0)}% accuracy, ${profile.expectedCompression.toFixed(0)}x compression`);

    const pq = ImprovedProductQuantizer.fromProfile(profile);
    await pq.trainImproved(trainingVectors);

    // Evaluate accuracy
    const accuracy = pq.evaluateAccuracy(testVectors);
    const actualAccuracy = 1 - accuracy.avgError;

    console.log(`\nResults:`);
    console.log(`  Accuracy:    ${(actualAccuracy * 100).toFixed(1)}%`);
    console.log(`  Avg error:   ${(accuracy.avgError * 100).toFixed(1)}%`);
    console.log(`  Max error:   ${(accuracy.maxError * 100).toFixed(1)}%`);
    console.log(`  RMSE:        ${accuracy.rmse.toFixed(4)}`);

    const stats = pq.getStats();
    console.log(`  Compression: ${stats.compressionRatio.toFixed(0)}x`);
    console.log(`  Size:        ${stats.originalSize} → ${stats.compressedSize} bytes`);

    // Should meet accuracy target
    expect(actualAccuracy).toBeGreaterThan(profile.expectedAccuracy - 0.05); // Within 5%
    expect(stats.compressionRatio).toBeGreaterThan(profile.expectedCompression * 0.9);
  }, 60000);

  it('should achieve BALANCED profile targets', async () => {
    const profile = QuantizationProfiles.BALANCED(dimensions);
    console.log(`\n=== Testing ${profile.name} Profile ===`);
    console.log(`Target: ${(profile.expectedAccuracy * 100).toFixed(0)}% accuracy, ${profile.expectedCompression.toFixed(0)}x compression`);

    const pq = ImprovedProductQuantizer.fromProfile(profile);
    await pq.trainImproved(trainingVectors);

    const accuracy = pq.evaluateAccuracy(testVectors);
    const actualAccuracy = 1 - accuracy.avgError;

    console.log(`\nResults:`);
    console.log(`  Accuracy:    ${(actualAccuracy * 100).toFixed(1)}%`);
    console.log(`  Avg error:   ${(accuracy.avgError * 100).toFixed(1)}%`);
    console.log(`  RMSE:        ${accuracy.rmse.toFixed(4)}`);

    const stats = pq.getStats();
    console.log(`  Compression: ${stats.compressionRatio.toFixed(0)}x`);

    expect(actualAccuracy).toBeGreaterThan(profile.expectedAccuracy - 0.05);
    expect(stats.compressionRatio).toBeGreaterThan(profile.expectedCompression * 0.9);
  }, 60000);

  it('should achieve HIGH_COMPRESSION profile targets', async () => {
    const profile = QuantizationProfiles.HIGH_COMPRESSION(dimensions);
    console.log(`\n=== Testing ${profile.name} Profile ===`);
    console.log(`Target: ${(profile.expectedAccuracy * 100).toFixed(0)}% accuracy, ${profile.expectedCompression.toFixed(0)}x compression`);

    const pq = ImprovedProductQuantizer.fromProfile(profile);
    await pq.trainImproved(trainingVectors);

    const accuracy = pq.evaluateAccuracy(testVectors);
    const actualAccuracy = 1 - accuracy.avgError;

    console.log(`\nResults:`);
    console.log(`  Accuracy:    ${(actualAccuracy * 100).toFixed(1)}%`);
    console.log(`  Avg error:   ${(accuracy.avgError * 100).toFixed(1)}%`);
    console.log(`  RMSE:        ${accuracy.rmse.toFixed(4)}`);

    const stats = pq.getStats();
    console.log(`  Compression: ${stats.compressionRatio.toFixed(0)}x`);

    expect(actualAccuracy).toBeGreaterThan(profile.expectedAccuracy - 0.10); // More tolerance
    expect(stats.compressionRatio).toBeGreaterThan(profile.expectedCompression * 0.9);
  }, 60000);

  it('should recommend appropriate profile', () => {
    console.log(`\n=== Profile Recommendations ===`);

    // High accuracy requirement
    const highAccProfile = QuantizationProfiles.recommend(dimensions, 0.93);
    console.log(`Min 93% accuracy: ${highAccProfile.name} (${(highAccProfile.expectedAccuracy * 100).toFixed(0)}%)`);
    expect(highAccProfile.expectedAccuracy).toBeGreaterThanOrEqual(0.93);

    // Size constraint
    const sizeProfile = QuantizationProfiles.recommend(dimensions, undefined, 10);
    console.log(`Max 10 bytes: ${sizeProfile.name} (${dimensions * 4 / sizeProfile.expectedCompression} bytes)`);
    expect(dimensions * 4 / sizeProfile.expectedCompression).toBeLessThanOrEqual(10);

    // Balanced
    const balancedProfile = QuantizationProfiles.recommend(dimensions, 0.88);
    console.log(`Min 88% accuracy: ${balancedProfile.name}`);
    expect(balancedProfile.expectedAccuracy).toBeGreaterThanOrEqual(0.88);
  });

  it('should compare profiles side-by-side', async () => {
    console.log(`\n=== Profile Comparison (Same Training Data) ===\n`);
    console.log('Profile            | Accuracy | Error   | Compression | Train Time');
    console.log('-------------------|----------|---------|-------------|------------');

    const profiles = [
      QuantizationProfiles.HIGH_ACCURACY(dimensions),
      QuantizationProfiles.BALANCED(dimensions),
      QuantizationProfiles.HIGH_COMPRESSION(dimensions)
    ];

    for (const profile of profiles) {
      const pq = ImprovedProductQuantizer.fromProfile(profile);

      const trainStart = performance.now();
      await pq.train(trainingVectors);
      const trainTime = performance.now() - trainStart;

      const accuracy = pq.evaluateAccuracy(testVectors.slice(0, 50)); // Smaller test set for speed
      const actualAccuracy = 1 - accuracy.avgError;

      const stats = pq.getStats();

      console.log(
        `${profile.name.padEnd(18)} | ` +
        `${(actualAccuracy * 100).toFixed(1)}%`.padEnd(8) + ' | ' +
        `${(accuracy.avgError * 100).toFixed(1)}%`.padEnd(7) + ' | ' +
        `${stats.compressionRatio.toFixed(0)}x`.padEnd(11) + ' | ' +
        `${trainTime.toFixed(0)}ms`
      );
    }

    console.log();
  }, 180000);

  it('should show trade-off analysis', () => {
    console.log(`\n=== Accuracy vs Compression Trade-off ===\n`);
    console.log('Subvectors | Bits | Compression | Est. Accuracy');
    console.log('-----------|------|-------------|---------------');

    const configs = [
      { subvectors: 16, bits: 8 },
      { subvectors: 12, bits: 8 },
      { subvectors: 8, bits: 8 },
      { subvectors: 6, bits: 8 },
      { subvectors: 4, bits: 8 },
      { subvectors: 8, bits: 6 },
      { subvectors: 8, bits: 4 }
    ];

    for (const config of configs) {
      const compression = QuantizationUtils.compressionRatio(
        dimensions,
        config.subvectors,
        config.bits
      );
      const accuracy = QuantizationUtils.estimateAccuracy(
        dimensions,
        config.subvectors,
        config.bits
      );

      console.log(
        `${config.subvectors.toString().padStart(10)} | ` +
        `${config.bits.toString().padStart(4)} | ` +
        `${compression.toFixed(0).padStart(11)}x | ` +
        `${(accuracy * 100).toFixed(1)}%`
      );
    }

    console.log();
  });

  it('should validate search quality with quantization', async () => {
    const profile = QuantizationProfiles.BALANCED(dimensions);
    const pq = ImprovedProductQuantizer.fromProfile(profile);
    await pq.train(trainingVectors);

    // Encode all training vectors
    const encodedVectors = trainingVectors.map(v => pq.encode(v));

    // Test query
    const query = testVectors[0];
    const k = 10;

    // Ground truth: exact distances
    const exactResults = trainingVectors
      .map((v, i) => ({
        index: i,
        distance: euclideanDistance(query, v)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, k);

    // Quantized search: asymmetric distances
    const quantizedResults = encodedVectors
      .map((codes, i) => ({
        index: i,
        distance: pq.asymmetricDistance(query, codes)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, k);

    // Calculate recall@k
    const exactIndices = new Set(exactResults.map(r => r.index));
    const quantizedIndices = new Set(quantizedResults.map(r => r.index));

    let matches = 0;
    for (const idx of quantizedIndices) {
      if (exactIndices.has(idx)) matches++;
    }

    const recall = matches / k;

    console.log(`\n=== Search Quality (Balanced Profile) ===`);
    console.log(`  Recall@${k}:     ${(recall * 100).toFixed(1)}%`);
    console.log(`  Matches:        ${matches}/${k}`);
    console.log(`  Compression:    ${pq.getStats().compressionRatio.toFixed(0)}x`);

    // Should have good recall
    expect(recall).toBeGreaterThan(0.8); // At least 80% recall
  }, 60000);
});

// Utility function
function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}
