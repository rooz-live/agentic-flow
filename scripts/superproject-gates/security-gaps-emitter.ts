/**
 * Security Gaps Evidence Emitter
 * 
 * Emits evidence for security gaps and vulnerabilities identified
 * in the system.
 */

import type { Emitter, EvidenceEvent, EvidenceConfig } from '../types/schema';

export interface SecurityGap {
  id: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  remediation?: string;
}

export interface SecurityGapsInput {
  gaps: SecurityGap[];
  scan_timestamp?: string;
  scanner?: string;
}

export interface SecurityGapsData {
  gaps: SecurityGap[];
  total_count: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  scan_timestamp: string;
  scanner: string;
}

export class SecurityGapsEmitter implements Emitter {
  readonly name = 'security_gaps';

  emit(input: SecurityGapsInput): EvidenceEvent {
    const gaps = input.gaps || [];
    const data: SecurityGapsData = {
      gaps,
      total_count: gaps.length,
      critical_count: gaps.filter(g => g.severity === 'critical').length,
      high_count: gaps.filter(g => g.severity === 'high').length,
      medium_count: gaps.filter(g => g.severity === 'medium').length,
      low_count: gaps.filter(g => g.severity === 'low').length,
      scan_timestamp: input.scan_timestamp || new Date().toISOString(),
      scanner: input.scanner || 'default'
    };

    return {
      timestamp: new Date().toISOString(),
      emitter: this.name,
      data: {
        security_gaps: data
      }
    };
  }

  isEnabled(config: EvidenceConfig): boolean {
    return config.emitters?.[this.name]?.enabled ?? false;
  }
}

export default SecurityGapsEmitter;
