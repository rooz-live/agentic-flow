/**
 * Pattern Test Data - Convenience exports for pattern event generation
 * 
 * This module provides standalone function exports for generating test data,
 * wrapping the PatternEventGenerator class for easier imports.
 */

import { PatternEventGenerator } from './pattern-event-generator';
import {
  PatternEvent,
  ValidPatternEvent,
  InvalidPatternEvent,
  TimelineSignature,
  MerkleChainInfo,
  RollupWindow,
  EconomicScoring
} from '../types/pattern-types';

// Singleton generator instance
const generator = new PatternEventGenerator();

/**
 * Generate a valid pattern event with optional overrides
 */
export function generateValidPatternEvent(overrides: Partial<PatternEvent> = {}): ValidPatternEvent {
  return generator.generateValidPatternEvent(overrides);
}

/**
 * Generate an invalid pattern event for testing validation
 */
export function generateInvalidPatternEvent(issueType?: string): InvalidPatternEvent {
  return generator.generateInvalidPatternEvent(issueType);
}

/**
 * Generate a valid timeline signature
 */
export function generateTimelineSignature(overrides: Partial<TimelineSignature> = {}): TimelineSignature {
  return generator.generateTimelineSignature(overrides);
}

/**
 * Generate a valid Merkle chain info
 */
export function generateMerkleChainInfo(overrides: Partial<MerkleChainInfo> = {}): MerkleChainInfo {
  return generator.generateMerkleChainInfo(overrides);
}

/**
 * Generate a valid rollup window
 */
export function generateRollupWindow(eventCount: number = 100, overrides: Partial<RollupWindow> = {}): RollupWindow {
  return generator.generateRollupWindow(eventCount, overrides);
}

/**
 * Generate economic scoring data
 */
export function generateEconomicScoring(overrides: Partial<EconomicScoring> = {}): EconomicScoring {
  return generator.generateEconomicScoring(overrides);
}

/**
 * Generate a batch of valid pattern events
 */
export function generatePatternEventBatch(count: number, overrides: Partial<PatternEvent> = {}): ValidPatternEvent[] {
  return Array.from({ length: count }, () => generator.generateValidPatternEvent(overrides));
}

/**
 * Generate production dataset for testing
 */
export function generateProductionDataset(options: {
  eventCount?: number;
  patterns?: string[];
  includeTimeline?: boolean;
  includeMerkle?: boolean;
} = {}): ValidPatternEvent[] {
  const {
    eventCount = 100,
    patterns = ['ml-training-guardrail', 'safe-degrade', 'governance-review'],
    includeTimeline = false,
    includeMerkle = false
  } = options;

  return Array.from({ length: eventCount }, (_, i) => {
    const event = generator.generateValidPatternEvent({
      pattern: patterns[i % patterns.length]
    });

    if (includeTimeline) {
      event.timeline = generator.generateTimelineSignature();
    }
    if (includeMerkle) {
      event.merkle = generator.generateMerkleChainInfo({ index: i });
    }

    return event;
  });
}

/**
 * Generate anomaly test dataset
 */
export function generateAnomalyDataset(anomalyType: string, count: number = 50): ValidPatternEvent[] {
  switch (anomalyType) {
    case 'overuse':
      return Array.from({ length: count }, (_, i) => 
        generator.generateValidPatternEvent({
          pattern: i < count * 0.4 ? 'safe-degrade' : 'ml-training-guardrail'
        })
      );
    case 'mutation-spike':
      return Array.from({ length: count }, (_, i) =>
        generator.generateValidPatternEvent({
          mutation: i > count * 0.7,
          mode: i > count * 0.7 ? 'mutation' : 'advisory'
        })
      );
    case 'economic-degradation':
      return Array.from({ length: count }, (_, i) =>
        generator.generateValidPatternEvent({
          economic: {
            cod: 100 + i * 50,
            wsjf_score: 50 + i * 25,
            job_size: 10,
            risk_reduction: 0.3
          }
        })
      );
    default:
      return generatePatternEventBatch(count);
  }
}

// Re-export types for convenience
export type {
  PatternEvent,
  ValidPatternEvent,
  InvalidPatternEvent,
  TimelineSignature,
  MerkleChainInfo,
  RollupWindow,
  EconomicScoring
};

// Re-export the generator class if needed
export { PatternEventGenerator };

