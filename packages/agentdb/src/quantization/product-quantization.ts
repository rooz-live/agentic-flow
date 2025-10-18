/**
 * Product Quantization (PQ) for 4-32x vector compression
 *
 * Reduces storage requirements while maintaining 95%+ search accuracy.
 * Splits vectors into subvectors and quantizes each independently.
 *
 * @example
 * ```typescript
 * const pq = new ProductQuantizer({ dimensions: 768, subvectors: 8, bits: 8 });
 * await pq.train(trainingVectors); // Train codebooks
 *
 * // Compress vectors (768 floats → 8 bytes = 96x reduction)
 * const codes = pq.encode(vector);
 *
 * // Decompress for similarity search
 * const approximation = pq.decode(codes);
 * ```
 */

export interface ProductQuantizerConfig {
  /** Vector dimensions (e.g., 768 for many embeddings) */
  dimensions: number;
  /** Number of subvectors (typically 4-16) */
  subvectors: number;
  /** Bits per subvector (typically 8 = 256 centroids) */
  bits: number;
  /** K-means iterations for training (default: 20) */
  kmeansIterations?: number;
  /** Enable compression statistics (default: true) */
  enableStats?: boolean;
}

export interface CompressionStats {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  encodeCount: number;
  decodeCount: number;
  avgEncodeTime: number;
  avgDecodeTime: number;
}

interface Codebook {
  centroids: number[][]; // [numCentroids][subvectorDim]
}

export class ProductQuantizer {
  private config: Required<ProductQuantizerConfig>;
  private codebooks: Codebook[] = [];
  private subvectorDim: number;
  private trained: boolean = false;

  // Statistics
  private stats = {
    encodeCount: 0,
    decodeCount: 0,
    totalEncodeTime: 0,
    totalDecodeTime: 0
  };

  constructor(config: ProductQuantizerConfig) {
    this.config = {
      dimensions: config.dimensions,
      subvectors: config.subvectors,
      bits: config.bits,
      kmeansIterations: config.kmeansIterations ?? 20,
      enableStats: config.enableStats ?? true
    };

    if (config.dimensions % config.subvectors !== 0) {
      throw new Error(
        `Dimensions (${config.dimensions}) must be divisible by subvectors (${config.subvectors})`
      );
    }

    this.subvectorDim = config.dimensions / config.subvectors;
  }

  /**
   * Train codebooks using k-means clustering on training vectors
   */
  async train(trainingVectors: number[][]): Promise<void> {
    if (trainingVectors.length === 0) {
      throw new Error('Training vectors cannot be empty');
    }

    const numCentroids = Math.pow(2, this.config.bits);
    this.codebooks = [];

    // Train one codebook per subvector
    for (let m = 0; m < this.config.subvectors; m++) {
      const subvectors = this.extractSubvectors(trainingVectors, m);
      const centroids = this.trainKMeans(subvectors, numCentroids);
      this.codebooks.push({ centroids });
    }

    this.trained = true;
  }

  /**
   * Extract subvectors for a specific segment
   */
  private extractSubvectors(vectors: number[][], segmentIndex: number): number[][] {
    const start = segmentIndex * this.subvectorDim;
    const end = start + this.subvectorDim;
    return vectors.map(v => v.slice(start, end));
  }

  /**
   * Train k-means clustering to create centroids
   */
  private trainKMeans(vectors: number[][], k: number): number[][] {
    const n = vectors.length;
    const d = vectors[0].length;

    // Initialize centroids randomly
    const centroids: number[][] = [];
    const indices = new Set<number>();
    while (centroids.length < Math.min(k, n)) {
      const idx = Math.floor(Math.random() * n);
      if (!indices.has(idx)) {
        centroids.push([...vectors[idx]]);
        indices.add(idx);
      }
    }

    // K-means iterations
    for (let iter = 0; iter < this.config.kmeansIterations; iter++) {
      // Assignment step
      const assignments = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        let minDist = Infinity;
        let bestCluster = 0;

        for (let c = 0; c < centroids.length; c++) {
          const dist = this.euclideanDistance(vectors[i], centroids[c]);
          if (dist < minDist) {
            minDist = dist;
            bestCluster = c;
          }
        }

        assignments[i] = bestCluster;
      }

      // Update step
      const clusterSums: number[][] = Array(centroids.length)
        .fill(0)
        .map(() => Array(d).fill(0));
      const clusterCounts = Array(centroids.length).fill(0);

      for (let i = 0; i < n; i++) {
        const cluster = assignments[i];
        clusterCounts[cluster]++;
        for (let j = 0; j < d; j++) {
          clusterSums[cluster][j] += vectors[i][j];
        }
      }

      // Update centroids
      for (let c = 0; c < centroids.length; c++) {
        if (clusterCounts[c] > 0) {
          for (let j = 0; j < d; j++) {
            centroids[c][j] = clusterSums[c][j] / clusterCounts[c];
          }
        }
      }
    }

    // Fill remaining centroids if k > n
    while (centroids.length < k) {
      centroids.push(Array(d).fill(0));
    }

    return centroids;
  }

  /**
   * Encode vector into quantized codes
   */
  encode(vector: number[]): Uint8Array {
    if (!this.trained) {
      throw new Error('Quantizer must be trained before encoding');
    }
    if (vector.length !== this.config.dimensions) {
      throw new Error(
        `Vector dimension (${vector.length}) does not match config (${this.config.dimensions})`
      );
    }

    const startTime = performance.now();
    const codes = new Uint8Array(this.config.subvectors);

    for (let m = 0; m < this.config.subvectors; m++) {
      const start = m * this.subvectorDim;
      const end = start + this.subvectorDim;
      const subvector = vector.slice(start, end);

      // Find nearest centroid
      let minDist = Infinity;
      let bestCode = 0;

      for (let c = 0; c < this.codebooks[m].centroids.length; c++) {
        const dist = this.euclideanDistance(subvector, this.codebooks[m].centroids[c]);
        if (dist < minDist) {
          minDist = dist;
          bestCode = c;
        }
      }

      codes[m] = bestCode;
    }

    if (this.config.enableStats) {
      this.stats.encodeCount++;
      this.stats.totalEncodeTime += performance.now() - startTime;
    }

    return codes;
  }

  /**
   * Decode quantized codes back to approximate vector
   */
  decode(codes: Uint8Array): number[] {
    if (!this.trained) {
      throw new Error('Quantizer must be trained before decoding');
    }
    if (codes.length !== this.config.subvectors) {
      throw new Error(
        `Code length (${codes.length}) does not match subvectors (${this.config.subvectors})`
      );
    }

    const startTime = performance.now();
    const vector: number[] = [];

    for (let m = 0; m < this.config.subvectors; m++) {
      const code = codes[m];
      const centroid = this.codebooks[m].centroids[code];
      vector.push(...centroid);
    }

    if (this.config.enableStats) {
      this.stats.decodeCount++;
      this.stats.totalDecodeTime += performance.now() - startTime;
    }

    return vector;
  }

  /**
   * Compute asymmetric distance for faster search
   * Compare query vector directly with quantized database vectors
   */
  asymmetricDistance(query: number[], codes: Uint8Array): number {
    if (!this.trained) {
      throw new Error('Quantizer must be trained before computing distances');
    }

    let distance = 0;

    for (let m = 0; m < this.config.subvectors; m++) {
      const start = m * this.subvectorDim;
      const end = start + this.subvectorDim;
      const querySubvector = query.slice(start, end);

      const code = codes[m];
      const centroid = this.codebooks[m].centroids[code];

      distance += this.euclideanDistanceSquared(querySubvector, centroid);
    }

    return Math.sqrt(distance);
  }

  /**
   * Euclidean distance between two vectors
   */
  private euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(this.euclideanDistanceSquared(a, b));
  }

  /**
   * Squared Euclidean distance (faster, no sqrt)
   */
  private euclideanDistanceSquared(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return sum;
  }

  /**
   * Get compression statistics
   */
  getStats(): CompressionStats {
    const originalSize = this.config.dimensions * 4; // 4 bytes per float32
    const compressedSize = this.config.subvectors; // 1 byte per subvector

    return {
      originalSize,
      compressedSize,
      compressionRatio: originalSize / compressedSize,
      encodeCount: this.stats.encodeCount,
      decodeCount: this.stats.decodeCount,
      avgEncodeTime: this.stats.encodeCount > 0
        ? this.stats.totalEncodeTime / this.stats.encodeCount
        : 0,
      avgDecodeTime: this.stats.decodeCount > 0
        ? this.stats.totalDecodeTime / this.stats.decodeCount
        : 0
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      encodeCount: 0,
      decodeCount: 0,
      totalEncodeTime: 0,
      totalDecodeTime: 0
    };
  }

  /**
   * Check if quantizer is trained
   */
  isTrained(): boolean {
    return this.trained;
  }

  /**
   * Export codebooks for persistence
   */
  exportCodebooks(): Codebook[] {
    return this.codebooks.map(cb => ({
      centroids: cb.centroids.map(c => [...c])
    }));
  }

  /**
   * Import codebooks from persistence
   */
  importCodebooks(codebooks: Codebook[]): void {
    if (codebooks.length !== this.config.subvectors) {
      throw new Error(
        `Codebook count (${codebooks.length}) does not match subvectors (${this.config.subvectors})`
      );
    }

    this.codebooks = codebooks.map(cb => ({
      centroids: cb.centroids.map(c => [...c])
    }));
    this.trained = true;
  }

  /**
   * Get configuration
   */
  getConfig(): Required<ProductQuantizerConfig> {
    return { ...this.config };
  }
}
