/**
 * Parity Check Module
 *
 * Implements quantum-inspired parity checks and syndrome analysis
 * for error detection in health monitoring metrics
 */

import { EventEmitter } from 'events';
import {
  ParityCheckResult,
  SyndromeAnalysis,
  ErrorType,
  ErrorSeverity
} from './types';

/**
 * Parity Check System
 * Detects errors using parity bits and syndrome analysis
 */
export class ParityCheckSystem extends EventEmitter {
  private checkHistory: Map<string, ParityCheckResult[]> = new Map();

  /**
   * Calculate parity bit for a value
   */
  private calculateParity(value: number): number {
    // XOR all bits to get parity
    let parity = 0;
    let n = Math.abs(Math.floor(value));
    while (n > 0) {
      parity ^= (n & 1);
      n >>= 1;
    }
    return parity;
  }

  /**
   * Generate syndrome from multiple parity checks
   */
  private generateSyndrome(values: number[], parityBits: number[]): number[] {
    const syndrome: number[] = [];
    for (let i = 0; i < parityBits.length; i++) {
      const expected = parityBits[i];
      const actual = this.calculateParity(values[i]);
      syndrome.push(expected ^ actual);
    }
    return syndrome;
  }

  /**
   * Analyze syndrome to determine error pattern and location
   */
  private analyzeSyndrome(syndrome: number[], numBits: number): SyndromeAnalysis {
    const errorPattern: number[] = new Array(numBits).fill(0);
    const errorLocations: number[] = [];
    let errorType: ErrorType = 'unknown';
    let confidence = 1.0;

    // Convert syndrome to error location
    const syndromeValue = parseInt(syndrome.join(''), 2);

    if (syndromeValue === 0) {
      return {
        syndrome,
        errorPattern,
        errorLocations,
        errorType: 'unknown',
        correctable: true,
        confidence: 1.0
      };
    }

    // Determine error location from syndrome
    const errorLocation = syndromeValue % numBits;
    if (errorLocation >= 0 && errorLocation < numBits) {
      errorPattern[errorLocation] = 1;
      errorLocations.push(errorLocation);
      errorType = 'bit-flip';
      confidence = 0.95;
    }

    // Check for phase-flip pattern (alternating bits)
    const alternatingCount = syndrome.filter((bit, idx) => 
      idx > 0 && bit === syndrome[idx - 1]
    ).length;
    
    if (alternatingCount > syndrome.length / 2) {
      errorType = 'phase-flip';
      confidence = 0.85;
    }

    return {
      syndrome,
      errorPattern,
      errorLocations,
      errorType,
      correctable: errorLocations.length > 0,
      confidence
    };
  }

  /**
   * Perform parity check on a set of values
   */
  public performParityCheck(
    metricId: string,
    values: number[],
    expectedParity?: number[]
  ): ParityCheckResult {
    const parityBits = expectedParity || values.map(v => this.calculateParity(v));
    const syndrome = this.generateSyndrome(values, parityBits);
    const errorDetected = syndrome.some(bit => bit === 1);

    let errorLocation: number | undefined;
    let confidence = 1.0;

    if (errorDetected) {
      const analysis = this.analyzeSyndrome(syndrome, values.length);
      errorLocation = analysis.errorLocations[0];
      confidence = analysis.confidence;
    }

    const result: ParityCheckResult = {
      passed: !errorDetected,
      syndrome,
      errorDetected,
      errorLocation,
      confidence
    };

    // Store result in history
    this.addToHistory(metricId, result);

    // Emit event if error detected
    if (errorDetected) {
      this.emit('errorDetected', {
        metricId,
        result,
        timestamp: new Date()
      });
    }

    return result;
  }

  /**
   * Perform multi-bit parity check (Hamming code style)
   */
  public performHammingCheck(
    metricId: string,
    data: number[]
  ): ParityCheckResult {
    const m = data.length; // Number of data bits
    const r = Math.ceil(Math.log2(m + 1)); // Number of parity bits needed

    // Calculate parity bits for Hamming code
    const parityBits: number[] = [];
    for (let i = 0; i < r; i++) {
      const parityPosition = Math.pow(2, i);
      let parity = 0;
      
      for (let j = 1; j <= m + r; j++) {
        if ((j & parityPosition) !== 0 && j <= data.length) {
          parity ^= (data[j - 1] & 1);
        }
      }
      parityBits.push(parity);
    }

    // Generate syndrome
    const syndrome = this.generateSyndrome(data, parityBits);
    const errorDetected = syndrome.some(bit => bit === 1);

    let errorLocation: number | undefined;
    let confidence = 1.0;

    if (errorDetected) {
      // Calculate error location from syndrome
      const syndromeValue = parseInt(syndrome.join(''), 2);
      errorLocation = syndromeValue - 1; // Hamming positions are 1-indexed
      confidence = 0.98;
    }

    const result: ParityCheckResult = {
      passed: !errorDetected,
      syndrome,
      errorDetected,
      errorLocation,
      confidence
    };

    this.addToHistory(metricId, result);

    if (errorDetected) {
      this.emit('errorDetected', {
        metricId,
        result,
        timestamp: new Date()
      });
    }

    return result;
  }

  /**
   * Get error severity based on syndrome
   */
  public getErrorSeverity(result: ParityCheckResult): ErrorSeverity {
    if (!result.errorDetected) {
      return 'low';
    }

    const syndromeWeight = result.syndrome.filter(bit => bit === 1).length;

    if (syndromeWeight === 1) {
      return 'low';
    } else if (syndromeWeight === 2) {
      return 'medium';
    } else if (syndromeWeight === 3) {
      return 'high';
    } else {
      return 'critical';
    }
  }

  /**
   * Add check result to history
   */
  private addToHistory(metricId: string, result: ParityCheckResult): void {
    if (!this.checkHistory.has(metricId)) {
      this.checkHistory.set(metricId, []);
    }
    
    const history = this.checkHistory.get(metricId)!;
    history.push(result);

    // Keep only last 100 results
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Get check history for a metric
   */
  public getCheckHistory(metricId: string): ParityCheckResult[] {
    return this.checkHistory.get(metricId) || [];
  }

  /**
   * Clear check history for a metric
   */
  public clearCheckHistory(metricId: string): void {
    this.checkHistory.delete(metricId);
  }

  /**
   * Get error rate from history
   */
  public getErrorRate(metricId: string, windowMs: number = 60000): number {
    const history = this.getCheckHistory(metricId);
    
    if (history.length === 0) {
      return 0;
    }

    const errorCount = history.filter(r => r.errorDetected).length;
    return errorCount / history.length;
  }
}
