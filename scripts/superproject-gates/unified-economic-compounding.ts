/**
 * Unified Economic Compounding Evidence Emitter
 * 
 * Enhanced version of the economic compounding emitter with unified schema support.
 */

import type { 
  EvidenceEmitter, 
  EvidenceEmitterConfig, 
  UnifiedEvidenceEvent, 
  EconomicEvidenceData,
  EvidenceData,
  ValidationStatus,
  EvidenceCategory,
  EvidencePriority
} from '../unified-evidence-schema';

export interface UnifiedEconomicInput {
  energy_cost_usd: number;
  value_per_hour: number;
  wsjf_per_hour?: number;
  compound_rate?: number;
  time_horizon_hours?: number;
  sys_state_err?: boolean;
  abort?: boolean;
  autofix_adv?: number;
}

export class UnifiedEconomicCompoundingEmitter implements EvidenceEmitter {
  readonly name = 'unified_economic_compounding';
  readonly version = '2.0.0';
  readonly category = 'economic' as EvidenceCategory;
  private config: EvidenceEmitterConfig;

  constructor(config?: Partial<EvidenceEmitterConfig>) {
    this.config = {
      name: this.name,
      version: this.version,
      category: 'economic' as EvidenceCategory,
      enabled: true,
      priority: 'medium' as EvidencePriority,
      schema_version: '1.0.0',
      ...config
    } as EvidenceEmitterConfig;
  }

  async emit(eventType: string, data: EvidenceData): Promise<UnifiedEvidenceEvent> {
    const economicData = data as EconomicEvidenceData;
    const wsjfPerHour = economicData.wsjf_per_hour ??
      (economicData.value_per_hour ?? 0) / Math.max(economicData.energy_cost_usd ?? 0.001, 0.001);

    const enrichedData: EconomicEvidenceData = {
      ...economicData,
      wsjf_per_hour: wsjfPerHour,
      sys_state_err: economicData.sys_state_err ?? false,
      abort: economicData.abort ?? false,
      autofix_adv: economicData.autofix_adv ?? 0
    };

    return {
      timestamp: new Date().toISOString(),
      run_id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      command: 'economic-compounding',
      mode: 'production',
      emitter_name: this.name,
      event_type: eventType,
      category: 'economic' as EvidenceCategory,
      data: enrichedData,
      priority: this.config.priority
    };
  }

  async flush(): Promise<void> {
    // Flush implementation - no-op for now
  }

  configure(config: EvidenceEmitterConfig): void {
    this.config = { ...this.config, ...config };
  }

  async initialize(): Promise<void> {
    // Initialize implementation
  }

  async cleanup(): Promise<void> {
    // Cleanup implementation
  }

  validate(data: EvidenceData): ValidationStatus {
    const errors: string[] = [];
    const warnings: string[] = [];
    const economicData = data as EconomicEvidenceData;

    if (economicData.energy_cost_usd === undefined) {
      warnings.push('energy_cost_usd not provided, using defaults');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      schema_version: this.config.schema_version
    };
  }

  transform(data: EvidenceData): EvidenceData {
    return data;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getConfig(): EvidenceEmitterConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<EvidenceEmitterConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export default UnifiedEconomicCompoundingEmitter;
