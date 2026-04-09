/**
 * Majority Voting Module
 *
 * Implements majority voting for error correction using
 * redundant metric copies
 */

import { EventEmitter } from 'events';
import {
  MajorityVotingResult,
  RedundantMetricCopy,
  ErrorType,
  ErrorSeverity
} from './types';

/**
 * Majority Voting System
 * Corrects errors using majority voting across redundant copies
 */
export class MajorityVotingSystem extends EventEmitter {
  private voteHistory: Map<string, MajorityVotingResult[]> = new Map();

  /**
   * Perform majority voting on redundant metric copies
   */
  public performMajorityVote(
    metricId: string,
    copies: RedundantMetricCopy[]
  ): MajorityVotingResult {
    if (copies.length === 0) {
      throw new Error('No copies provided for majority voting');
    }

    const validCopies = copies.filter(c => c.valid);
    
    if (validCopies.length === 0) {
      throw new Error('No valid copies for majority voting');
    }

    const values = validCopies.map(c => c.value);
    const votes: any[] = [];
    const valueCounts = new Map<any, number[]>();

    // Count occurrences of each value
    values.forEach((value, idx) => {
      if (!valueCounts.has(value)) {
        valueCounts.set(value, []);
      }
      valueCounts.get(value)!.push(idx);
      votes.push(value);
    });

    // Find the majority value
    let majorityValue: any = null;
    let maxCount = 0;
    let majorityIndices: number[] = [];

    valueCounts.forEach((indices, value) => {
      if (indices.length > maxCount) {
        maxCount = indices.length;
        majorityValue = value;
        majorityIndices = indices;
      }
    });

    const agreementRatio = maxCount / validCopies.length;
    const corrected = agreementRatio > 0.5;

    // Find discarded votes (outliers)
    const discardedVotes: number[] = [];
    valueCounts.forEach((indices, value) => {
      if (value !== majorityValue) {
        discardedVotes.push(...indices);
      }
    });

    const result: MajorityVotingResult = {
      consensus: majorityValue,
      votes,
      agreementRatio,
      corrected,
      discardedVotes
    };

    // Store result in history
    this.addToHistory(metricId, result);

    // Emit event if correction was applied
    if (corrected) {
      this.emit('correctionApplied', {
        metricId,
        result,
        timestamp: new Date()
      });
    }

    return result;
  }

  /**
   * Perform weighted majority voting
   * Each vote can have a weight based on source reliability
   */
  public performWeightedMajorityVote(
    metricId: string,
    copies: RedundantMetricCopy[],
    weights: number[]
  ): MajorityVotingResult {
    if (copies.length !== weights.length) {
      throw new Error('Number of copies must match number of weights');
    }

    const validCopies = copies.filter(c => c.valid);
    
    if (validCopies.length === 0) {
      throw new Error('No valid copies for weighted majority voting');
    }

    const valueWeights = new Map<any, number>();

    // Sum weights for each value
    validCopies.forEach((copy, idx) => {
      const value = copy.value;
      const weight = weights[idx];
      const currentWeight = valueWeights.get(value) || 0;
      valueWeights.set(value, currentWeight + weight);
    });

    // Find value with highest total weight
    let majorityValue: any = null;
    let maxWeight = 0;
    let totalWeight = 0;

    valueWeights.forEach((weight, value) => {
      totalWeight += weight;
      if (weight > maxWeight) {
        maxWeight = weight;
        majorityValue = value;
      }
    });

    const agreementRatio = maxWeight / totalWeight;
    const corrected = agreementRatio > 0.5;

    const votes = validCopies.map(c => c.value);
    const discardedVotes: number[] = [];

    valueWeights.forEach((weight, value) => {
      if (value !== majorityValue) {
        validCopies.forEach((copy, idx) => {
          if (copy.value === value) {
            discardedVotes.push(idx);
          }
        });
      }
    });

    const result: MajorityVotingResult = {
      consensus: majorityValue,
      votes,
      agreementRatio,
      corrected,
      discardedVotes
    };

    this.addToHistory(metricId, result);

    if (corrected) {
      this.emit('correctionApplied', {
        metricId,
        result,
        timestamp: new Date()
      });
    }

    return result;
  }

  /**
   * Perform iterative majority voting
   * Removes outliers iteratively until consensus is reached
   */
  public performIterativeMajorityVote(
    metricId: string,
    copies: RedundantMetricCopy[],
    maxIterations: number = 5
  ): MajorityVotingResult {
    let currentCopies = [...copies];
    let result: MajorityVotingResult;
    let iteration = 0;

    while (iteration < maxIterations && currentCopies.length > 1) {
      result = this.performMajorityVote(metricId, currentCopies);
      
      // If we have good agreement, stop
      if (result.agreementRatio >= 0.7) {
        return result;
      }

      // Remove outliers for next iteration
      const validIndices = currentCopies
        .map((_, idx) => idx)
        .filter(idx => !result.discardedVotes.includes(idx));
      
      currentCopies = validIndices.map(idx => currentCopies[idx]);
      iteration++;
    }

    // Final vote on remaining copies
    return this.performMajorityVote(metricId, currentCopies);
  }

  /**
   * Calculate confidence in the majority vote result
   */
  public calculateConfidence(result: MajorityVotingResult): number {
    // Base confidence from agreement ratio
    let confidence = result.agreementRatio;

    // Boost confidence if we have many votes
    if (result.votes.length >= 5) {
      confidence *= 1.1;
    } else if (result.votes.length >= 3) {
      confidence *= 1.05;
    }

    // Penalize if many votes were discarded
    const discardRatio = result.discardedVotes.length / result.votes.length;
    confidence *= (1 - discardRatio * 0.5);

    return Math.min(1.0, Math.max(0.0, confidence));
  }

  /**
   * Determine error type from voting result
   */
  public getErrorType(result: MajorityVotingResult): ErrorType {
    if (!result.corrected) {
      return 'unknown';
    }

    const uniqueValues = new Set(result.votes).size;
    
    if (uniqueValues === 2) {
      return 'bit-flip';
    } else if (uniqueValues > 2) {
      return 'phase-flip';
    } else {
      return 'both';
    }
  }

  /**
   * Determine error severity from voting result
   */
  public getErrorSeverity(result: MajorityVotingResult): ErrorSeverity {
    if (!result.corrected) {
      return 'low';
    }

    const agreementRatio = result.agreementRatio;

    if (agreementRatio >= 0.8) {
      return 'low';
    } else if (agreementRatio >= 0.6) {
      return 'medium';
    } else if (agreementRatio >= 0.5) {
      return 'high';
    } else {
      return 'critical';
    }
  }

  /**
   * Add vote result to history
   */
  private addToHistory(metricId: string, result: MajorityVotingResult): void {
    if (!this.voteHistory.has(metricId)) {
      this.voteHistory.set(metricId, []);
    }
    
    const history = this.voteHistory.get(metricId)!;
    history.push(result);

    // Keep only last 100 results
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Get vote history for a metric
   */
  public getVoteHistory(metricId: string): MajorityVotingResult[] {
    return this.voteHistory.get(metricId) || [];
  }

  /**
   * Clear vote history for a metric
   */
  public clearVoteHistory(metricId: string): void {
    this.voteHistory.delete(metricId);
  }

  /**
   * Get average agreement ratio from history
   */
  public getAverageAgreement(metricId: string): number {
    const history = this.getVoteHistory(metricId);
    
    if (history.length === 0) {
      return 1.0;
    }

    const totalAgreement = history.reduce((sum, r) => sum + r.agreementRatio, 0);
    return totalAgreement / history.length;
  }
}
