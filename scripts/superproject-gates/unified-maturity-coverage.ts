/**
 * Unified Maturity Coverage Evidence Emitter
 * 
 * Enhanced version of the maturity coverage emitter with unified schema support.
 */

import type { 
  EvidenceEmitter, 
  EvidenceEmitterConfig, 
  UnifiedEvidenceEvent, 
  CoverageEvidenceData,
  EvidenceData,
  ValidationStatus,
  EvidenceCategory,
  EvidencePriority
} from '../unified-evidence-schema';

export interface UnifiedMaturityInput {
  tier_depth: number;
  coverage_pct: number;
  maturity_level?: number;
  compliance_score?: number;
  gaps?: string[];
}

export class UnifiedMaturityCoverageEmitter implements EvidenceEmitter {
  readonly name = 'unified_maturity_coverage';
  readonly version = '2.0.0';
  readonly category = 'coverage' as unknown as EvidenceCategory;
  private config: EvidenceEmitterConfig;

  constructor(config?: Partial<EvidenceEmitterConfig>) {
    this.config = {
      name: this.name,
      version: this.version,
      category: 'coverage' as unknown as EvidenceCategory,
      enabled: true,
      priority: 'medium' as EvidencePriority,
      schema_version: '1.0.0',
      ...config
    } as EvidenceEmitterConfig;
  }

  async emit(eventType: string, data: EvidenceData): Promise<UnifiedEvidenceEvent> {
    const coverageData = data as CoverageEvidenceData;
    const maturityLevel = coverageData.maturity_level ?? 
      String(Math.min(Math.floor((coverageData.tier_depth ?? 0) / 2) + 1, 5));

    const enrichedData: CoverageEvidenceData = {
      ...coverageData,
      maturity_level: maturityLevel
    };

    return {
      timestamp: new Date().toISOString(),
      run_id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      command: 'maturity-coverage',
      mode: 'production',
      emitter_name: this.name,
      event_type: eventType,
      category: 'coverage' as unknown as EvidenceCategory,
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
    const coverageData = data as CoverageEvidenceData;

    if (coverageData.tier_depth === undefined) {
      warnings.push('tier_depth not provided');
    }

    if (coverageData.coverage_pct === undefined) {
      warnings.push('coverage_pct not provided');
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

export default UnifiedMaturityCoverageEmitter;
