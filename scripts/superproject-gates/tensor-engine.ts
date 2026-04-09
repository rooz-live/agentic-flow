/**
 * TensorEngine - Tensor Operations for Batch WSJF Scoring
 * 
 * Implements tensor-based batch operations for GPU-acceleratable WSJF scoring.
 * This module provides the foundation for ruvector-core integration with
 * placeholder methods for future Rust FFI binding.
 * 
 * Performance targets from RUVECTOR_INTEGRATION_ARCHITECTURE.md:
 * - WSJF Batch Scoring: <500ms for 1000 files
 * - Memory footprint: O(n) where n = number of files
 * 
 * @module ruvector/tensor-engine
 */

import {
  Tensor2D,
  TensorShape,
  WSJFTensorInput,
  WSJFTensorResult,
  TensorDType,
  DEFAULT_TENSOR_CONFIG
} from './types.js';

/**
 * TensorEngine provides tensor-based operations for batch WSJF scoring
 * and matrix computations. Designed for future GPU acceleration via Rust FFI.
 */
export class TensorEngine {
  private static readonly EPSILON = DEFAULT_TENSOR_CONFIG.epsilon;

  /**
   * Batch WSJF scoring using tensor operations
   * 
   * WSJF = (Business Value + Time Criticality + Risk Reduction) / Job Size
   * 
   * @param input - WSJFTensorInput containing arrays of scores
   * @returns WSJFTensorResult with computed scores, rankings, and statistics
   */
  static batchWSJFScore(input: WSJFTensorInput): WSJFTensorResult {
    const startTime = performance.now();
    const n = input.businessValue.length;

    // Validate input lengths
    if (
      input.timeCriticality.length !== n ||
      input.riskReduction.length !== n ||
      input.jobSize.length !== n
    ) {
      throw new Error('All input arrays must have the same length');
    }

    if (n === 0) {
      return {
        scores: [],
        rankings: [],
        statistics: { mean: 0, stdDev: 0, min: 0, max: 0 },
        computeTimeMs: performance.now() - startTime
      };
    }

    // Create tensors for vectorized operations
    const costOfDelay = new Float64Array(n);
    const scores = new Float64Array(n);

    // Vectorized Cost of Delay calculation: BV + TC + RR
    for (let i = 0; i < n; i++) {
      costOfDelay[i] = input.businessValue[i] + 
                       input.timeCriticality[i] + 
                       input.riskReduction[i];
    }

    // Vectorized WSJF calculation: CoD / Job Size
    for (let i = 0; i < n; i++) {
      // Guard against division by zero
      const jobSize = Math.max(input.jobSize[i], this.EPSILON);
      scores[i] = costOfDelay[i] / jobSize;
    }

    // Calculate statistics
    const statistics = this.computeStatistics(scores);

    // Generate rankings (indices sorted by score, descending)
    const rankings = this.argsort(scores, 'descending');

    const computeTimeMs = performance.now() - startTime;

    return {
      scores: Array.from(scores),
      rankings,
      statistics,
      computeTimeMs
    };
  }

  /**
   * Matrix multiplication (placeholder for Rust FFI)
   * 
   * @param a - First tensor (m x n)
   * @param b - Second tensor (n x p)
   * @returns Result tensor (m x p)
   */
  static matmul(a: Tensor2D, b: Tensor2D): Tensor2D {
    if (a.shape.cols !== b.shape.rows) {
      throw new Error(
        `Incompatible shapes for matmul: (${a.shape.rows}x${a.shape.cols}) * (${b.shape.rows}x${b.shape.cols})`
      );
    }

    const m = a.shape.rows;
    const n = a.shape.cols;
    const p = b.shape.cols;

    const result = new Float64Array(m * p);

    // Standard matrix multiplication O(m*n*p)
    // Future: Replace with BLAS/GPU implementation via Rust FFI
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < p; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          sum += a.data[i * n + k] * b.data[k * p + j];
        }
        result[i * p + j] = sum;
      }
    }

    return {
      data: result,
      shape: { rows: m, cols: p }
    };
  }

  /**
   * Element-wise tensor addition
   * 
   * @param a - First tensor
   * @param b - Second tensor (must have same shape as a)
   * @returns Result tensor with element-wise sum
   */
  static add(a: Tensor2D, b: Tensor2D): Tensor2D {
    if (a.shape.rows !== b.shape.rows || a.shape.cols !== b.shape.cols) {
      throw new Error(
        `Shape mismatch for addition: (${a.shape.rows}x${a.shape.cols}) + (${b.shape.rows}x${b.shape.cols})`
      );
    }

    const result = new Float64Array(a.data.length);
    for (let i = 0; i < a.data.length; i++) {
      result[i] = a.data[i] + b.data[i];
    }

    return {
      data: result,
      shape: { ...a.shape }
    };
  }

  /**
   * Scalar multiplication of tensor
   * 
   * @param tensor - Input tensor
   * @param scalar - Scalar value to multiply
   * @returns Result tensor scaled by scalar
   */
  static scale(tensor: Tensor2D, scalar: number): Tensor2D {
    const result = new Float64Array(tensor.data.length);
    for (let i = 0; i < tensor.data.length; i++) {
      result[i] = tensor.data[i] * scalar;
    }

    return {
      data: result,
      shape: { ...tensor.shape }
    };
  }

  /**
   * Softmax activation (row-wise)
   * 
   * @param tensor - Input tensor
   * @returns Tensor with softmax applied to each row
   */
  static softmax(tensor: Tensor2D): Tensor2D {
    const { rows, cols } = tensor.shape;
    const result = new Float64Array(tensor.data.length);

    for (let i = 0; i < rows; i++) {
      const rowStart = i * cols;
      
      // Find max for numerical stability
      let maxVal = tensor.data[rowStart];
      for (let j = 1; j < cols; j++) {
        maxVal = Math.max(maxVal, tensor.data[rowStart + j]);
      }

      // Compute exp and sum
      let expSum = 0;
      for (let j = 0; j < cols; j++) {
        result[rowStart + j] = Math.exp(tensor.data[rowStart + j] - maxVal);
        expSum += result[rowStart + j];
      }

      // Normalize
      for (let j = 0; j < cols; j++) {
        result[rowStart + j] /= expSum;
      }
    }

    return {
      data: result,
      shape: { ...tensor.shape }
    };
  }

  /**
   * Create a 2D tensor from nested array
   * 
   * @param data - 2D array of numbers
   * @param dtype - Data type (default: float64)
   * @returns Tensor2D representation
   */
  static createTensor(
    data: number[][],
    dtype: TensorDType = 'float64'
  ): Tensor2D {
    if (data.length === 0) {
      return {
        data: new Float64Array(0),
        shape: { rows: 0, cols: 0 }
      };
    }

    const rows = data.length;
    const cols = data[0].length;

    // Validate rectangular shape
    for (let i = 1; i < rows; i++) {
      if (data[i].length !== cols) {
        throw new Error('All rows must have the same number of columns');
      }
    }

    const flatData = dtype === 'float32'
      ? new Float64Array(rows * cols)  // Still use Float64Array but could be Float32Array
      : new Float64Array(rows * cols);

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        flatData[i * cols + j] = data[i][j];
      }
    }

    return {
      data: flatData,
      shape: { rows, cols }
    };
  }

  /**
   * Get indices of maximum values along rows
   * 
   * @param tensor - Input tensor
   * @returns Array of column indices for max value in each row
   */
  static argmax(tensor: Tensor2D): number[] {
    const { rows, cols } = tensor.shape;
    const result: number[] = new Array(rows);

    for (let i = 0; i < rows; i++) {
      let maxIdx = 0;
      let maxVal = tensor.data[i * cols];

      for (let j = 1; j < cols; j++) {
        const val = tensor.data[i * cols + j];
        if (val > maxVal) {
          maxVal = val;
          maxIdx = j;
        }
      }
      result[i] = maxIdx;
    }

    return result;
  }

  /**
   * Get top K values and indices from a tensor (row-wise)
   * 
   * @param tensor - Input tensor
   * @param k - Number of top values to return
   * @returns Object with indices and values arrays
   */
  static topK(
    tensor: Tensor2D,
    k: number
  ): { indices: number[]; values: number[] } {
    const { rows, cols } = tensor.shape;
    const effectiveK = Math.min(k, cols);

    // For single row or treating as flat array
    if (rows === 1 || cols === 1) {
      const flatLen = tensor.data.length;
      const effectiveKFlat = Math.min(k, flatLen);
      
      // Create index-value pairs and sort
      const indexed: Array<{ idx: number; val: number }> = [];
      for (let i = 0; i < flatLen; i++) {
        indexed.push({ idx: i, val: tensor.data[i] });
      }
      indexed.sort((a, b) => b.val - a.val);

      return {
        indices: indexed.slice(0, effectiveKFlat).map(x => x.idx),
        values: indexed.slice(0, effectiveKFlat).map(x => x.val)
      };
    }

    // Multi-row: return top K per row (flattened)
    const allIndices: number[] = [];
    const allValues: number[] = [];

    for (let i = 0; i < rows; i++) {
      const rowStart = i * cols;
      const indexed: Array<{ idx: number; val: number }> = [];
      
      for (let j = 0; j < cols; j++) {
        indexed.push({ idx: j, val: tensor.data[rowStart + j] });
      }
      indexed.sort((a, b) => b.val - a.val);

      for (let j = 0; j < effectiveK; j++) {
        allIndices.push(indexed[j].idx);
        allValues.push(indexed[j].val);
      }
    }

    return { indices: allIndices, values: allValues };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Compute statistics for an array of scores
   */
  private static computeStatistics(scores: Float64Array): WSJFTensorResult['statistics'] {
    const n = scores.length;
    if (n === 0) {
      return { mean: 0, stdDev: 0, min: 0, max: 0 };
    }

    let sum = 0;
    let min = scores[0];
    let max = scores[0];

    for (let i = 0; i < n; i++) {
      sum += scores[i];
      min = Math.min(min, scores[i]);
      max = Math.max(max, scores[i]);
    }

    const mean = sum / n;

    // Calculate standard deviation
    let variance = 0;
    for (let i = 0; i < n; i++) {
      const diff = scores[i] - mean;
      variance += diff * diff;
    }
    const stdDev = Math.sqrt(variance / n);

    return { mean, stdDev, min, max };
  }

  /**
   * Return indices that would sort the array
   */
  private static argsort(
    arr: Float64Array,
    order: 'ascending' | 'descending' = 'descending'
  ): number[] {
    const indexed = Array.from(arr).map((val, idx) => ({ val, idx }));
    
    if (order === 'descending') {
      indexed.sort((a, b) => b.val - a.val);
    } else {
      indexed.sort((a, b) => a.val - b.val);
    }

    return indexed.map(x => x.idx);
  }
}

/**
 * Factory function for creating TensorEngine instance
 * (for dependency injection patterns)
 */
export function createTensorEngine(): typeof TensorEngine {
  return TensorEngine;
}
