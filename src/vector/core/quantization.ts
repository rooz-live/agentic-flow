/**
 * Adaptive Quantization Strategies
 * Binary (32x), Scalar (4x), Product (8-16x) memory reduction
 */

import { QuantizationType, QuantizationConfig } from './types';

export interface QuantizedVector {
  data: Uint8Array | Float32Array;
  originalDimension: number;
  type: QuantizationType;
}

export class BinaryQuantization {
  static quantize(vector: number[]): Uint8Array {
    const dim = vector.length;
    const quantized = new Uint8Array(Math.ceil(dim / 8));
    
    for (let i = 0; i < dim; i++) {
      if (vector[i] > 0) {
        quantized[Math.floor(i / 8)] |= (1 << (i % 8));
      }
    }
    
    return quantized;
  }

  static similarity(a: Uint8Array, b: Uint8Array): number {
    let sameBits = 0;
    const len = Math.min(a.length, b.length);
    
    for (let i = 0; i < len; i++) {
      const xor = a[i] ^ b[i];
      sameBits += 8 - this.popCount(xor);
    }
    
    return sameBits / (len * 8);
  }

  private static popCount(x: number): number {
    x = x - ((x >> 1) & 0x55555555);
    x = (x & 0x33333333) + ((x >> 2) & 0x33333333);
    return ((x + (x >> 4) & 0xF0F0F0F) * 0x1010101) >> 24;
  }
}

export class ScalarQuantization {
  private min: number;
  private max: number;
  private bits: number;

  constructor(bits = 8) {
    this.bits = bits;
    this.min = -1;
    this.max = 1;
  }

  calibrate(vectors: number[][]): void {
    const allValues = vectors.flat();
    this.min = Math.min(...allValues);
    this.max = Math.max(...allValues);
  }

  quantize(vector: number[]): Uint8Array {
    const levels = Math.pow(2, this.bits) - 1;
    const scale = levels / (this.max - this.min);
    
    const quantized = new Uint8Array(vector.length);
    for (let i = 0; i < vector.length; i++) {
      const normalized = (vector[i] - this.min) * scale;
      quantized[i] = Math.min(levels, Math.max(0, Math.round(normalized)));
    }
    
    return quantized;
  }

  dequantize(quantized: Uint8Array): Float32Array {
    const levels = Math.pow(2, this.bits) - 1;
    const scale = (this.max - this.min) / levels;
    
    const vector = new Float32Array(quantized.length);
    for (let i = 0; i < quantized.length; i++) {
      vector[i] = quantized[i] * scale + this.min;
    }
    
    return vector;
  }

  quantizeBatch(vectors: number[][]): Uint8Array[] {
    return vectors.map(v => this.quantize(v));
  }
}

export class ProductQuantization {
  private subspaces: number;
  private centroids: number;
  private codebooks: Float32Array[][];

  constructor(subspaces = 8, centroids = 256) {
    this.subspaces = subspaces;
    this.centroids = centroids;
    this.codebooks = [];
  }

  train(vectors: number[][]): void {
    const dim = vectors[0].length;
    const subspaceDim = Math.floor(dim / this.subspaces);
    
    for (let i = 0; i < this.subspaces; i++) {
      const subspaceData = vectors.map(v => 
        v.slice(i * subspaceDim, (i + 1) * subspaceDim)
      );
      this.codebooks[i] = this.kMeans(subspaceData, this.centroids);
    }
  }

  quantize(vector: number[]): Uint8Array {
    const dim = vector.length;
    const subspaceDim = Math.floor(dim / this.subspaces);
    const codes = new Uint8Array(this.subspaces);
    
    for (let i = 0; i < this.subspaces; i++) {
      const subspace = vector.slice(i * subspaceDim, (i + 1) * subspaceDim);
      codes[i] = this.findNearestCentroid(subspace, this.codebooks[i]);
    }
    
    return codes;
  }

  private kMeans(data: number[][], k: number): Float32Array[] {
    const dim = data[0].length;
    const centroids: Float32Array[] = [];
    
    for (let i = 0; i < k; i++) {
      centroids.push(new Float32Array(data[Math.floor(Math.random() * data.length)]));
    }
    
    for (let iter = 0; iter < 10; iter++) {
      const assignments = data.map(d => this.findNearestCentroid(d, centroids));
      
      for (let i = 0; i < k; i++) {
        const cluster = data.filter((_, idx) => assignments[idx] === i);
        if (cluster.length > 0) {
          centroids[i] = this.computeMean(cluster);
        }
      }
    }
    
    return centroids;
  }

  private findNearestCentroid(vector: number[], centroids: Float32Array[]): number {
    let minDist = Infinity;
    let nearest = 0;
    
    for (let i = 0; i < centroids.length; i++) {
      const dist = this.euclideanDistance(vector, centroids[i]);
      if (dist < minDist) {
        minDist = dist;
        nearest = i;
      }
    }
    
    return nearest;
  }

  private euclideanDistance(a: number[], b: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  private computeMean(vectors: number[][]): Float32Array {
    const dim = vectors[0].length;
    const mean = new Float32Array(dim);
    
    for (const v of vectors) {
      for (let i = 0; i < dim; i++) {
        mean[i] += v[i];
      }
    }
    
    for (let i = 0; i < dim; i++) {
      mean[i] /= vectors.length;
    }
    
    return mean;
  }
}

export class AdaptiveQuantizer {
  private config: QuantizationConfig;
  private quantizer: BinaryQuantization | ScalarQuantization | ProductQuantization | null = null;

  constructor(config: QuantizationConfig) {
    this.config = config;
    this.initQuantizer();
  }

  private initQuantizer(): void {
    switch (this.config.type) {
      case 'scalar':
        this.quantizer = new ScalarQuantization(this.config.bits || 8);
        break;
      case 'product':
        this.quantizer = new ProductQuantization();
        break;
      case 'binary':
        this.quantizer = new BinaryQuantization();
        break;
      default:
        this.quantizer = null;
    }
  }

  quantize(vector: number[]): Uint8Array {
    if (this.config.type === 'none' || !this.quantizer) {
      return new Uint8Array(new Float32Array(vector).buffer);
    }

    if (this.quantizer instanceof BinaryQuantization) {
      return BinaryQuantization.quantize(vector);
    }

    if (this.quantizer instanceof ScalarQuantization) {
      return this.quantizer.quantize(vector);
    }

    if (this.quantizer instanceof ProductQuantization) {
      return this.quantizer.quantize(vector);
    }

    throw new Error(`Unsupported quantization type: ${this.config.type}`);
  }

  getMemoryReduction(): number {
    switch (this.config.type) {
      case 'binary':
        return 32;
      case 'scalar':
        return 4;
      case 'product':
        return 8;
      default:
        return 1;
    }
  }
}
