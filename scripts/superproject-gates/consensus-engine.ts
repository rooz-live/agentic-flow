/**
 * Consensus Engine Module
 *
 * Implements distributed consensus algorithms for error correction
 * across multiple health monitoring sources
 */

import { EventEmitter } from 'events';
import {
  RedundantMetricCopy,
  ErrorType,
  ErrorSeverity,
  ErrorCorrectionResult
} from './types';

/**
 * Consensus algorithm types
 */
export type ConsensusAlgorithm = 'pbft' | 'raft' | 'paxos' | 'simple';

/**
 * Consensus vote
 */
export interface ConsensusVote {
  voterId: string;
  value: any;
  timestamp: Date;
  signature?: string;
}

/**
 * Consensus result
 */
export interface ConsensusResult {
  consensusValue: any;
  algorithm: ConsensusAlgorithm;
  votes: ConsensusVote[];
  agreementRatio: number;
  round: number;
  converged: boolean;
  confidence: number;
}

/**
 * Consensus Engine
 * Implements distributed consensus for error correction
 */
export class ConsensusEngine extends EventEmitter {
  private consensusHistory: Map<string, ConsensusResult[]> = new Map();
  private voterReputation: Map<string, number> = new Map();

  /**
   * Perform simple consensus (majority with reputation weighting)
   */
  public async performSimpleConsensus(
    metricId: string,
    copies: RedundantMetricCopy[],
    rounds: number = 1
  ): Promise<ConsensusResult> {
    const votes: ConsensusVote[] = copies.map(copy => ({
      voterId: copy.copyId,
      value: copy.value,
      timestamp: copy.timestamp
    }));

    let result: ConsensusResult;
    let currentVotes = [...votes];

    for (let round = 1; round <= rounds; round++) {
      result = this.calculateConsensus(metricId, currentVotes, 'simple', round);
      
      if (result.converged) {
        break;
      }

      // For multi-round, filter to votes matching consensus
      currentVotes = currentVotes.filter(v => v.value === result.consensusValue);
    }

    this.addToHistory(metricId, result!);

    if (result!.converged) {
      this.emit('consensusReached', {
        metricId,
        result: result!,
        timestamp: new Date()
      });
    }

    return result!;
  }

  /**
   * Perform PBFT-style consensus
   */
  public async performPBFTConsensus(
    metricId: string,
    copies: RedundantMetricCopy[],
    faultTolerance: number = 1
  ): Promise<ConsensusResult> {
    const votes: ConsensusVote[] = copies.map(copy => ({
      voterId: copy.copyId,
      value: copy.value,
      timestamp: copy.timestamp
    }));

    const totalNodes = votes.length;
    const requiredAgreements = Math.floor((totalNodes + faultTolerance) / 3) * 2 + 1;

    let result: ConsensusResult | null = null;
    let round = 0;

    while (round < 10) {
      round++;
      result = this.calculateConsensus(metricId, votes, 'pbft', round);

      // Check if we have enough agreements
      const agreementCount = votes.filter(v => v.value === result.consensusValue).length;

      if (agreementCount >= requiredAgreements) {
        result.converged = true;
        break;
      }
    }

    this.addToHistory(metricId, result);

    if (result!.converged) {
      this.emit('consensusReached', {
        metricId,
        result: result!,
        timestamp: new Date()
      });
    }

    return result!;
  }

  /**
   * Perform Raft-style consensus
   */
  public async performRaftConsensus(
    metricId: string,
    copies: RedundantMetricCopy[],
    leaderId?: string
  ): Promise<ConsensusResult> {
    const votes: ConsensusVote[] = copies.map(copy => ({
      voterId: copy.copyId,
      value: copy.value,
      timestamp: copy.timestamp
    }));

    // Select leader based on reputation or provided ID
    const leader = leaderId || this.selectLeader(votes);
    const leaderVote = votes.find(v => v.voterId === leader);

    if (!leaderVote) {
      throw new Error('Leader vote not found');
    }

    // Count votes matching leader
    const matchingVotes = votes.filter(v => v.value === leaderVote.value);
    const agreementRatio = matchingVotes.length / votes.length;

    const result: ConsensusResult = {
      consensusValue: leaderVote.value,
      algorithm: 'raft',
      votes,
      agreementRatio,
      round: 1,
      converged: agreementRatio > 0.5,
      confidence: agreementRatio
    };

    this.addToHistory(metricId, result);

    if (result.converged) {
      this.emit('consensusReached', {
        metricId,
        result,
        timestamp: new Date()
      });
    }

    return result;
  }

  /**
   * Calculate consensus from votes
   */
  private calculateConsensus(
    metricId: string,
    votes: ConsensusVote[],
    algorithm: ConsensusAlgorithm,
    round: number
  ): ConsensusResult {
    const valueCounts = new Map<any, { count: number; totalReputation: number }>();

    // Count votes with reputation weighting
    votes.forEach(vote => {
      const reputation = this.getVoterReputation(vote.voterId);
      
      if (!valueCounts.has(vote.value)) {
        valueCounts.set(vote.value, { count: 0, totalReputation: 0 });
      }
      
      const stats = valueCounts.get(vote.value)!;
      stats.count++;
      stats.totalReputation += reputation;
    });

    // Find consensus value (highest weighted count)
    let consensusValue: any = null;
    let maxScore = 0;

    valueCounts.forEach((stats, value) => {
      const score = stats.count * 0.7 + stats.totalReputation * 0.3;
      if (score > maxScore) {
        maxScore = score;
        consensusValue = value;
      }
    });

    const matchingVotes = votes.filter(v => v.value === consensusValue);
    const agreementRatio = matchingVotes.length / votes.length;
    const converged = agreementRatio >= 0.67;

    return {
      consensusValue,
      algorithm,
      votes,
      agreementRatio,
      round,
      converged,
      confidence: agreementRatio
    };
  }

  /**
   * Select leader based on reputation
   */
  private selectLeader(votes: ConsensusVote[]): string {
    let leader = votes[0].voterId;
    let maxReputation = this.getVoterReputation(leader);

    votes.forEach(vote => {
      const reputation = this.getVoterReputation(vote.voterId);
      if (reputation > maxReputation) {
        maxReputation = reputation;
        leader = vote.voterId;
      }
    });

    return leader;
  }

  /**
   * Get voter reputation
   */
  private getVoterReputation(voterId: string): number {
    return this.voterReputation.get(voterId) || 1.0;
  }

  /**
   * Update voter reputation based on consensus participation
   */
  public updateVoterReputation(voterId: string, delta: number): void {
    const current = this.getVoterReputation(voterId);
    const updated = Math.max(0.1, Math.min(2.0, current + delta));
    this.voterReputation.set(voterId, updated);
  }

  /**
   * Convert consensus result to error correction result
   */
  public toErrorCorrectionResult(
    metricId: string,
    consensus: ConsensusResult,
    originalValue: any
  ): ErrorCorrectionResult {
    const corrected = consensus.converged && consensus.consensusValue !== originalValue;
    
    return {
      success: corrected,
      strategy: 'consensus',
      originalValue,
      correctedValue: consensus.consensusValue,
      errorType: this.determineErrorType(consensus),
      errorSeverity: this.determineErrorSeverity(consensus),
      confidence: consensus.confidence,
      timestamp: new Date(),
      correctionAttempts: consensus.round
    };
  }

  /**
   * Determine error type from consensus result
   */
  private determineErrorType(consensus: ConsensusResult): ErrorType {
    const uniqueValues = new Set(consensus.votes.map(v => v.value)).size;
    
    if (uniqueValues === 2) {
      return 'bit-flip';
    } else if (uniqueValues > 2) {
      return 'phase-flip';
    } else {
      return 'both';
    }
  }

  /**
   * Determine error severity from consensus result
   */
  private determineErrorSeverity(consensus: ConsensusResult): ErrorSeverity {
    if (!consensus.converged) {
      return 'critical';
    }

    const agreementRatio = consensus.agreementRatio;

    if (agreementRatio >= 0.8) {
      return 'low';
    } else if (agreementRatio >= 0.67) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  /**
   * Add consensus result to history
   */
  private addToHistory(metricId: string, result: ConsensusResult): void {
    if (!this.consensusHistory.has(metricId)) {
      this.consensusHistory.set(metricId, []);
    }
    
    const history = this.consensusHistory.get(metricId)!;
    history.push(result);

    // Keep only last 100 results
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Get consensus history for a metric
   */
  public getConsensusHistory(metricId: string): ConsensusResult[] {
    return this.consensusHistory.get(metricId) || [];
  }

  /**
   * Clear consensus history for a metric
   */
  public clearConsensusHistory(metricId: string): void {
    this.consensusHistory.delete(metricId);
  }

  /**
   * Get convergence rate from history
   */
  public getConvergenceRate(metricId: string): number {
    const history = this.getConsensusHistory(metricId);
    
    if (history.length === 0) {
      return 1.0;
    }

    const convergedCount = history.filter(r => r.converged).length;
    return convergedCount / history.length;
  }
}
