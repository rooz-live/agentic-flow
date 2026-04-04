/**
 * WIP Bounds Check Evidence Emitter
 * 
 * Emits evidence for work-in-progress bounds checking including
 * WIP count and iteration limits.
 */

import type { Emitter, EvidenceEvent, EvidenceConfig, WipBoundsCheckData } from '../types/schema';

export interface WipBoundsCheckInput {
  wip: number;
  iters: number;
}

export class WipBoundsCheckEmitter implements Emitter {
  readonly name = 'wip_bounds_check';

  emit(input: WipBoundsCheckInput): EvidenceEvent {
    const data: WipBoundsCheckData = {
      wip: input.wip,
      iters: input.iters
    };

    return {
      timestamp: new Date().toISOString(),
      emitter: this.name,
      data: {
        wip_bounds_check: data
      }
    };
  }

  isEnabled(config: EvidenceConfig): boolean {
    return config.emitters?.[this.name]?.enabled ?? false;
  }
}

export default WipBoundsCheckEmitter;
