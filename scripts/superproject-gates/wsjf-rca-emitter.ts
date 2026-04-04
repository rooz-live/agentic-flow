/**
 * WSJF RCA Evidence Emitter
 * 
 * Emits evidence for Weighted Shortest Job First (WSJF) calculations
 * and Root Cause Analysis findings.
 */

import type { Emitter, EvidenceEvent, EvidenceConfig } from '../types/schema';

export interface WSJFFactors {
  business_value: number;
  time_criticality: number;
  risk_reduction: number;
  job_size: number;
}

export interface RCAFinding {
  id: string;
  root_cause: string;
  category: string;
  impact: 'high' | 'medium' | 'low';
  recommendations: string[];
}

export interface WSJFRCAInput {
  wsjf_score?: number;
  wsjf_factors?: WSJFFactors;
  rca_findings?: RCAFinding[];
  context?: Record<string, unknown>;
}

export interface WSJFRCAData {
  wsjf_score: number;
  wsjf_factors: WSJFFactors;
  wsjf_per_hour: number;
  rca_findings: RCAFinding[];
  total_findings: number;
  high_impact_count: number;
}

export class WSJFRCAEmitter implements Emitter {
  readonly name = 'wsjf_rca';

  emit(input: WSJFRCAInput): EvidenceEvent {
    const defaultFactors: WSJFFactors = {
      business_value: 1,
      time_criticality: 1,
      risk_reduction: 1,
      job_size: 1
    };

    const factors = input.wsjf_factors || defaultFactors;
    const wsjfScore = input.wsjf_score || this.calculateWSJF(factors);
    const rcaFindings = input.rca_findings || [];

    const data: WSJFRCAData = {
      wsjf_score: wsjfScore,
      wsjf_factors: factors,
      wsjf_per_hour: wsjfScore / Math.max(factors.job_size, 0.1),
      rca_findings: rcaFindings,
      total_findings: rcaFindings.length,
      high_impact_count: rcaFindings.filter(f => f.impact === 'high').length
    };

    return {
      timestamp: new Date().toISOString(),
      emitter: this.name,
      data: {
        wsjf_rca: data,
        ...input.context
      }
    };
  }

  private calculateWSJF(factors: WSJFFactors): number {
    const costOfDelay = factors.business_value + factors.time_criticality + factors.risk_reduction;
    return costOfDelay / Math.max(factors.job_size, 0.1);
  }

  isEnabled(config: EvidenceConfig): boolean {
    return config.emitters?.[this.name]?.enabled ?? false;
  }
}

export default WSJFRCAEmitter;
