/**
 * Optimal Abstraction Level Identifier
 *
 * Identifies the optimal governance abstraction level based on causal strength
 * Compares micro, macro, and super-macro levels to find strongest causal structure
 */

import type {
  OptimalLevel,
  AbstractionLevel,
  MicroCausalAnalysis,
  MacroCausalAnalysis,
  SuperMacroCausalAnalysis,
  CausalEmergenceConfig
} from './types.js';
import { CausalStrengthMetricsCalculator } from './causal-strength-metrics.js';

/**
 * Optimal Abstraction Level Identifier
 * Determines the best governance level based on causal emergence
 */
export class OptimalAbstractionLevelIdentifier {
  private metricsCalculator: CausalStrengthMetricsCalculator;
  private config: CausalEmergenceConfig;

  constructor(config?: Partial<CausalEmergenceConfig>) {
    this.config = {
      threshold: 0.15,
      periodicEvaluationCycles: 10,
      minSampleSize: 20,
      weights: {
        taskCompletion: 0.4,
        decisionEfficiency: 0.3,
        predictability: 0.2,
        variance: 0.1
      }
    };
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.metricsCalculator = new CausalStrengthMetricsCalculator(this.config);
  }

  /**
   * Identify optimal abstraction level from all analyses
   * @param micro - Micro-level analysis results
   * @param macro - Macro-level analysis results
   * @param superMacro - Super-macro-level analysis results
   * @returns Optimal level recommendation
   */
  public identifyOptimalLevel(
    micro: MicroCausalAnalysis,
    macro: MacroCausalAnalysis,
    superMacro: SuperMacroCausalAnalysis
  ): OptimalLevel {
    // Validate sample sizes
    const microValid = micro.sampleSize >= this.config.minSampleSize;
    const macroValid = macro.sampleSize >= this.config.minSampleSize;
    const superMacroValid = superMacro.sampleSize >= this.config.minSampleSize;

    // Calculate confidence for each level
    const microConfidence = this.metricsCalculator.calculateConfidence(micro.sampleSize);
    const macroConfidence = this.metricsCalculator.calculateConfidence(macro.sampleSize);
    const superMacroConfidence = this.metricsCalculator.calculateConfidence(superMacro.sampleSize);

    // Determine optimal level based on causal strength and confidence
    const candidates: Array<{
      level: AbstractionLevel;
      strength: number;
      confidence: number;
      emergenceGain: number;
    }> = [];

    if (microValid) {
      candidates.push({
        level: 'micro',
        strength: micro.overallStrength,
        confidence: microConfidence,
        emergenceGain: 0 // Baseline
      });
    }

    if (macroValid) {
      candidates.push({
        level: 'macro',
        strength: macro.overallStrength,
        confidence: macroConfidence,
        emergenceGain: macro.emergenceScore
      });
    }

    if (superMacroValid) {
      candidates.push({
        level: 'super-macro',
        strength: superMacro.overallStrength,
        confidence: superMacroConfidence,
        emergenceGain: superMacro.emergenceScore
      });
    }

    // If no valid candidates, return default
    if (candidates.length === 0) {
      return {
        level: 'micro',
        strength: 0,
        emergenceGain: 0,
        confidence: 0,
        rationale: 'Insufficient data for analysis - need more execution history'
      };
    }

    // Score each candidate (strength * confidence)
    const scored = candidates.map(c => ({
      ...c,
      score: c.strength * c.confidence
    }));

    // Sort by score and emergence gain
    scored.sort((a, b) => {
      // Prefer higher emergence gain
      if (b.emergenceGain !== a.emergenceGain) {
        return b.emergenceGain - a.emergenceGain;
      }
      // Then prefer higher score
      return b.score - a.score;
    });

    const optimal = scored[0];

    // Generate rationale
    const rationale = this.generateRationale(
      optimal,
      micro,
      macro,
      superMacro,
      microValid,
      macroValid,
      superMacroValid
    );

    return {
      level: optimal.level,
      strength: optimal.strength,
      emergenceGain: optimal.emergenceGain,
      confidence: optimal.confidence,
      rationale
    };
  }

  /**
   * Generate rationale for optimal level recommendation
   * @param optimal - Selected optimal level
   * @param micro - Micro-level analysis
   * @param macro - Macro-level analysis
   * @param superMacro - Super-macro-level analysis
   * @param microValid - Whether micro has sufficient data
   * @param macroValid - Whether macro has sufficient data
   * @param superMacroValid - Whether super-macro has sufficient data
   * @returns Rationale string
   */
  private generateRationale(
    optimal: {
      level: AbstractionLevel;
      strength: number;
      confidence: number;
      emergenceGain: number;
    },
    micro: MicroCausalAnalysis,
    macro: MacroCausalAnalysis,
    superMacro: SuperMacroCausalAnalysis,
    microValid: boolean,
    macroValid: boolean,
    superMacroValid: boolean
  ): string {
    const parts: string[] = [];

    // Explain why this level is optimal
    switch (optimal.level) {
      case 'micro':
        parts.push(`Micro-level (Accountability) governance selected with causal strength of ${(optimal.strength * 100).toFixed(1)}%.`);
        if (macroValid && macro.emergenceScore < 0) {
          parts.push(`Macro-level governance shows ${(-macro.emergenceScore * 100).toFixed(1)}% lower causal strength.`);
        }
        if (superMacroValid && superMacro.emergenceScore < 0) {
          parts.push(`Super-macro-level governance shows ${(-superMacro.emergenceScore * 100).toFixed(1)}% lower causal strength.`);
        }
        break;

      case 'macro':
        parts.push(`Macro-level (Domain) governance selected with causal strength of ${(optimal.strength * 100).toFixed(1)}%.`);
        parts.push(`Emergence gain of ${(optimal.emergenceGain * 100).toFixed(1)}% over micro-level governance.`);
        if (superMacroValid && superMacro.emergenceScore < 0) {
          parts.push(`Super-macro-level governance shows ${(-superMacro.emergenceScore * 100).toFixed(1)}% lower causal strength.`);
        }
        break;

      case 'super-macro':
        parts.push(`Super-macro-level (Purpose) governance selected with causal strength of ${(optimal.strength * 100).toFixed(1)}%.`);
        parts.push(`Emergence gain of ${(optimal.emergenceGain * 100).toFixed(1)}% over macro-level governance.`);
        break;
    }

    // Add confidence information
    parts.push(`Confidence: ${(optimal.confidence * 100).toFixed(1)}% based on ${optimal.level} sample size.`);

    return parts.join(' ');
  }

  /**
   * Check if adjustment should be triggered
   * @param optimalLevel - Current optimal level
   * @param cycleCount - Number of cycles since last evaluation
   * @returns Whether adjustment should be triggered
   */
  public shouldTriggerAdjustment(
    optimalLevel: OptimalLevel,
    cycleCount: number
  ): boolean {
    // Threshold-based trigger
    const thresholdTriggered = optimalLevel.emergenceGain >= this.config.threshold;

    // Periodic trigger
    const periodicTriggered = cycleCount >= this.config.periodicEvaluationCycles;

    return thresholdTriggered || periodicTriggered;
  }

  /**
   * Get adjustment trigger reason
   * @param optimalLevel - Current optimal level
   * @param cycleCount - Number of cycles since last evaluation
   * @returns Reason for trigger
   */
  public getTriggerReason(
    optimalLevel: OptimalLevel,
    cycleCount: number
  ): string {
    const reasons: string[] = [];

    if (optimalLevel.emergenceGain >= this.config.threshold) {
      reasons.push(`Emergence gain of ${(optimalLevel.emergenceGain * 100).toFixed(1)}% exceeds threshold of ${(this.config.threshold * 100).toFixed(1)}%`);
    }

    if (cycleCount >= this.config.periodicEvaluationCycles) {
      reasons.push(`Periodic evaluation triggered after ${cycleCount} cycles (threshold: ${this.config.periodicEvaluationCycles})`);
    }

    return reasons.length > 0 ? reasons.join('; ') : 'Manual trigger';
  }

  /**
   * Compare levels to identify trends
   * @param history - Array of historical optimal levels
   * @returns Trend analysis
   */
  public analyzeTrends(history: OptimalLevel[]): {
    direction: 'improving' | 'stable' | 'degrading';
    dominantLevel: AbstractionLevel;
    levelChanges: number;
  } {
    if (history.length < 3) {
      return {
        direction: 'stable',
        dominantLevel: 'micro',
        levelChanges: 0
      };
    }

    // Count occurrences of each level
    const levelCounts = new Map<AbstractionLevel, number>();
    for (const opt of history) {
      const count = levelCounts.get(opt.level) || 0;
      levelCounts.set(opt.level, count + 1);
    }

    // Find dominant level
    let dominantLevel: AbstractionLevel = 'micro';
    let maxCount = 0;
    for (const [level, count] of levelCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        dominantLevel = level;
      }
    }

    // Count level changes
    let levelChanges = 0;
    for (let i = 1; i < history.length; i++) {
      if (history[i].level !== history[i - 1].level) {
        levelChanges++;
      }
    }

    // Determine trend direction based on recent emergence gains
    const recentGains = history.slice(-5).map(h => h.emergenceGain);
    const avgRecentGain = recentGains.reduce((a, b) => a + b, 0) / recentGains.length;

    let direction: 'improving' | 'stable' | 'degrading' = 'stable';
    if (avgRecentGain > 0.05) {
      direction = 'improving';
    } else if (avgRecentGain < -0.05) {
      direction = 'degrading';
    }

    return {
      direction,
      dominantLevel,
      levelChanges
    };
  }

  /**
   * Update configuration
   * @param config - Partial configuration to update
   */
  public configure(config: Partial<CausalEmergenceConfig>): void {
    this.config = { ...this.config, ...config };
    this.metricsCalculator.configure(config);
  }

  /**
   * Get current configuration
   * @returns Current configuration
   */
  public getConfig(): CausalEmergenceConfig {
    return { ...this.config };
  }
}
