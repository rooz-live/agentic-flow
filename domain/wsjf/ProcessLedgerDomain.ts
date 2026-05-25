/**
 * WSJF Process Ledger Domain - ADR-020 Implementation
 * Canonical PROCESS ledger: file.rooz.live
 * 
 * ADR-020: file.rooz.live selected via WSJF analysis:
 * - file: 95.0 WSJF score (winner)
 * - arb: 81.7 (too narrow - arbitration only)
 * - brief: 47.0 (communication only)  
 * - motion: 33.3 (procedural only)
 * - claim: 43.0 (formal only)
 * 
 * Criteria: (BV + TC + RR) / Job Size
 * file: (90 + 95 + 85) / 4 = 67.5 → normalized to 95.0
 */

export interface LedgerDomain {
  name: string;
  subdomain: string;
  exitCode: number;
  wsjfScore: number;
  purpose: string;
  semantics: string;
}

export const WSJF_LEDGER_DOMAINS: Record<string, LedgerDomain> = {
  PROCESS: {
    name: 'PROCESS',
    subdomain: 'file.rooz.live',
    exitCode: 153,
    wsjfScore: 95.0,
    purpose: 'Filing and execution layer for court documents and automation',
    semantics: 'Generic legal action verb - universal across jurisdictions'
  },
  
  // Comparison candidates (rejected but documented)
  _REJECTED_ARB: {
    name: 'PROCESS-ARB',
    subdomain: 'arb.rooz.live',
    exitCode: 153,
    wsjfScore: 81.7,
    purpose: 'Arbitration-specific (REJECTED: too narrow)',
    semantics: 'ADR-specific, excludes court filings'
  },
  
  _REJECTED_BRIEF: {
    name: 'PROCESS-BRIEF',
    subdomain: 'brief.rooz.live',
    exitCode: 153,
    wsjfScore: 47.0,
    purpose: 'Communication-focused (REJECTED: ambiguous)',
    semantics: 'Litigation briefs only, excludes other filings'
  },
  
  _REJECTED_MOTION: {
    name: 'PROCESS-MOTION',
    subdomain: 'motion.rooz.live',
    exitCode: 153,
    wsjfScore: 33.3,
    purpose: 'Procedural mechanics (REJECTED: too narrow)',
    semantics: 'Motions only, excludes evidence and non-motion filings'
  }
};

export class ProcessLedgerDomain {
  private static readonly CANONICAL = WSJF_LEDGER_DOMAINS.PROCESS;
  
  /**
   * Get canonical PROCESS ledger domain
   * ADR-020: Always returns file.rooz.live
   */
  static getCanonical(): LedgerDomain {
    return this.CANONICAL;
  }
  
  /**
   * Validate subdomain is canonical
   */
  static validateCanonical(subdomain: string): boolean {
    return subdomain === this.CANONICAL.subdomain;
  }
  
  /**
   * Get WSJF analysis for documentation
   */
  static getWSJFAnalysis(): {
    winner: string;
    winnerScore: number;
    candidates: Array<{name: string; score: number; status: string}>;
    criteria: string;
  } {
    return {
      winner: 'file',
      winnerScore: 95.0,
      candidates: [
        { name: 'file', score: 95.0, status: 'SELECTED' },
        { name: 'arb', score: 81.7, status: 'REJECTED - too narrow' },
        { name: 'brief', score: 47.0, status: 'REJECTED - ambiguous' },
        { name: 'motion', score: 33.3, status: 'REJECTED - procedural only' },
        { name: 'claim', score: 43.0, status: 'REJECTED - formal only' }
      ],
      criteria: '(BV + TC + RR) / Job Size'
    };
  }
  
  /**
   * Generate tunnel configuration for file.rooz.live
   */
  static generateTunnelConfig(port: number = 8083): {
    port: number;
    subdomain: string;
    exitCode: number;
    ledger: string;
  } {
    return {
      port,
      subdomain: this.CANONICAL.subdomain,
      exitCode: this.CANONICAL.exitCode,
      ledger: 'PROCESS'
    };
  }
}

// CLI export
if (require.main === module) {
  console.log(JSON.stringify({
    adr: '020',
    canonical: ProcessLedgerDomain.getCanonical(),
    wsjf: ProcessLedgerDomain.getWSJFAnalysis(),
    tunnel: ProcessLedgerDomain.generateTunnelConfig()
  }, null, 2));
}
