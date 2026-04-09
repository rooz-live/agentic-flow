/**
 * Economic Compounding Evidence Emitter
 * 
 * Emits evidence for economic compounding metrics including energy cost,
 * value generation, and WSJF calculations.
 */

import type { Emitter, EvidenceEvent, EvidenceConfig, EconomicCompoundingData } from '../types/schema';

export interface EconomicCompoundingInput {
  energy_cost_usd: number;
  value_per_hour: number;
  wsjf_per_hour?: number;
  sys_state_err?: boolean;
  abort?: boolean;
  autofix_adv?: number;
}

export class EconomicCompoundingEmitter implements Emitter {
  readonly name = 'economic_compounding';

  emit(input: EconomicCompoundingInput): EvidenceEvent {
    const data: EconomicCompoundingData = {
      energy_cost_usd: input.energy_cost_usd,
      value_per_hour: input.value_per_hour,
      wsjf_per_h: input.wsjf_per_hour ?? input.value_per_hour / Math.max(input.energy_cost_usd, 0.001),
      wsjf_per_hour: input.wsjf_per_hour ?? input.value_per_hour / Math.max(input.energy_cost_usd, 0.001),
      sys_state_err: input.sys_state_err ?? false,
      abort: input.abort ?? false,
      autofix_adv: input.autofix_adv ?? 0
    };

    return {
      timestamp: new Date().toISOString(),
      emitter: this.name,
      data: {
        economic_compounding: data
      }
    };
  }

  isEnabled(config: EvidenceConfig): boolean {
    return config.emitters?.[this.name]?.enabled ?? false;
  }
}

export default EconomicCompoundingEmitter;
