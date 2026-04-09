/**
 * Observability Gaps Evidence Emitter
 * 
 * Emits evidence for observability gaps including identified gaps
 * and their severity levels.
 */

import type { Emitter, EvidenceEvent, EvidenceConfig, ObservabilityGapsData } from '../types/schema';

export interface ObservabilityGapsInput {
  gaps: string[];
  severity: 'low' | 'medium' | 'high';
}

export class ObservabilityGapsEmitter implements Emitter {
  readonly name = 'observability_gaps';

  emit(input: ObservabilityGapsInput): EvidenceEvent {
    const data: ObservabilityGapsData = {
      gaps: input.gaps,
      severity: input.severity
    };

    return {
      timestamp: new Date().toISOString(),
      emitter: this.name,
      data: {
        observability_gaps: data
      }
    };
  }

  isEnabled(config: EvidenceConfig): boolean {
    return config.emitters?.[this.name]?.enabled ?? false;
  }
}

export default ObservabilityGapsEmitter;
