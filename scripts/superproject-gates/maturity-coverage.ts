/**
 * Maturity Coverage Evidence Emitter
 * 
 * Emits evidence for maturity and coverage metrics including tier depth
 * and coverage percentages.
 */

import type { Emitter, EvidenceEvent, EvidenceConfig, MaturityCoverageData } from '../types/schema';

export interface MaturityCoverageInput {
  tier_depth: number;
  coverage_pct: number;
}

export class MaturityCoverageEmitter implements Emitter {
  readonly name = 'maturity_coverage';

  emit(input: MaturityCoverageInput): EvidenceEvent {
    const data: MaturityCoverageData = {
      tier_depth: input.tier_depth,
      coverage_pct: input.coverage_pct
    };

    return {
      timestamp: new Date().toISOString(),
      emitter: this.name,
      data: {
        maturity_coverage: data
      }
    };
  }

  isEnabled(config: EvidenceConfig): boolean {
    return config.emitters?.[this.name]?.enabled ?? false;
  }
}

export default MaturityCoverageEmitter;
