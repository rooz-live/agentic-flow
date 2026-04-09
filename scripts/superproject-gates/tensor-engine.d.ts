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
import { Tensor2D, WSJFTensorInput, WSJFTensorResult, TensorDType } from './types.js';
/**
 * TensorEngine provides tensor-based operations for batch WSJF scoring
 * and matrix computations. Designed for future GPU acceleration via Rust FFI.
 */
export declare class TensorEngine {
    private static readonly EPSILON;
    /**
     * Batch WSJF scoring using tensor operations
     *
     * WSJF = (Business Value + Time Criticality + Risk Reduction) / Job Size
     *
     * @param input - WSJFTensorInput containing arrays of scores
     * @returns WSJFTensorResult with computed scores, rankings, and statistics
     */
    static batchWSJFScore(input: WSJFTensorInput): WSJFTensorResult;
    /**
     * Matrix multiplication (placeholder for Rust FFI)
     *
     * @param a - First tensor (m x n)
     * @param b - Second tensor (n x p)
     * @returns Result tensor (m x p)
     */
    static matmul(a: Tensor2D, b: Tensor2D): Tensor2D;
    /**
     * Element-wise tensor addition
     *
     * @param a - First tensor
     * @param b - Second tensor (must have same shape as a)
     * @returns Result tensor with element-wise sum
     */
    static add(a: Tensor2D, b: Tensor2D): Tensor2D;
    /**
     * Scalar multiplication of tensor
     *
     * @param tensor - Input tensor
     * @param scalar - Scalar value to multiply
     * @returns Result tensor scaled by scalar
     */
    static scale(tensor: Tensor2D, scalar: number): Tensor2D;
    /**
     * Softmax activation (row-wise)
     *
     * @param tensor - Input tensor
     * @returns Tensor with softmax applied to each row
     */
    static softmax(tensor: Tensor2D): Tensor2D;
    /**
     * Create a 2D tensor from nested array
     *
     * @param data - 2D array of numbers
     * @param dtype - Data type (default: float64)
     * @returns Tensor2D representation
     */
    static createTensor(data: number[][], dtype?: TensorDType): Tensor2D;
    /**
     * Get indices of maximum values along rows
     *
     * @param tensor - Input tensor
     * @returns Array of column indices for max value in each row
     */
    static argmax(tensor: Tensor2D): number[];
    /**
     * Get top K values and indices from a tensor (row-wise)
     *
     * @param tensor - Input tensor
     * @param k - Number of top values to return
     * @returns Object with indices and values arrays
     */
    static topK(tensor: Tensor2D, k: number): {
        indices: number[];
        values: number[];
    };
    /**
     * Compute statistics for an array of scores
     */
    private static computeStatistics;
    /**
     * Return indices that would sort the array
     */
    private static argsort;
}
/**
 * Factory function for creating TensorEngine instance
 * (for dependency injection patterns)
 */
export declare function createTensorEngine(): typeof TensorEngine;
//# sourceMappingURL=tensor-engine.d.ts.map