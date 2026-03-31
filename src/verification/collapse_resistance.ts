/**
 * Collapse Resistance Monitor
 *
 * Detects institutional decay patterns before catastrophic failure.
 *
 * "capacity to detect misalignment not degrade faster than
 * conditions that require it"
 *
 * Key signals:
 * - Moral language detached from consequence
 * - Confidence rising faster than corrective capacity
 * - Dissent framed as threat rather than signal
 * - Suffering narrativized rather than interrogated
 */

export interface CollapseSignal {
  category: 'moral_detachment' | 'confidence_inflation' | 'dissent_suppression' | 'suffering_narrative' | 'authority_drift';
  severity: 'early' | 'concerning' | 'critical';
  evidence: string;
  pattern: string;
  remediation: string;
}

export interface CollapseResistanceReport {
  healthScore: number;
  signals: CollapseSignal[];
  recommendations: string[];
  dimensionalAlignment: {
    manthra: number; // thought clarity
    yasna: number;   // word-action alignment
    mithra: number;  // binding coherence
  };
}

// Pattern categories with severity weights
const COLLAPSE_PATTERN_CATEGORIES = {
  moral_detachment: {
    patterns: [
      { regex: /\b(we believe in|committed to|dedicated to)\b.*\b(without|but)\b/gi, severity: 'concerning' as const },
      { regex: /\b(values|principles|ethics)\b.*\b(however|although|despite)\b/gi, severity: 'concerning' as const },
    ],
    weight: 1.5,
    remediation: 'Reconnect stated values to measurable outcomes with evidence trails',
  },
  confidence_inflation: {
    patterns: [
      { regex: /\b(guaranteed|always|never)\b/gi, severity: 'early' as const },
      { regex: /\b(100%|zero risk|completely|absolutely)\b/gi, severity: 'concerning' as const },
      { regex: /\b(perfect|flawless|bulletproof)\b/gi, severity: 'critical' as const },
    ],
    weight: 2.0,
    remediation: 'Add uncertainty quantification, caveats, and failure mode analysis',
  },
  dissent_suppression: {
    patterns: [
      { regex: /\b(concerns? (are|were) (noted|acknowledged) but)\b/gi, severity: 'concerning' as const },
      { regex: /\b(dissent|disagreement|objection).*\b(addressed|handled|managed)\b/gi, severity: 'concerning' as const },
      { regex: /\b(decided|resolved|closed).*\b(discussion|debate|conversation)\b/gi, severity: 'early' as const },
    ],
    weight: 1.8,
    remediation: 'Treat dissent as signal, not threat; preserve minority reports',
  },
  suffering_narrative: {
    patterns: [
      { regex: /\b(learning experience|growth opportunity)\b.*\b(failure|loss|harm)\b/gi, severity: 'concerning' as const },
      { regex: /\b(necessary|acceptable|unavoidable)\b.*\b(cost|sacrifice|tradeoff)\b/gi, severity: 'early' as const },
    ],
    weight: 1.3,
    remediation: 'Acknowledge costs directly without euphemism; track remediation',
  },
  authority_drift: {
    patterns: [
      { regex: /\b(policy requires|mandate|compliance)\b.*\b(regardless|despite)\b/gi, severity: 'concerning' as const },
      { regex: /\b(decided|determined|ruled)\b.*\b(by|from)\b.*\b(leadership|management|exec)\b/gi, severity: 'early' as const },
    ],
    weight: 1.4,
    remediation: 'Preserve judgment pathways; authority should enable, not replace, discernment',
  },
};

export class CollapseResistanceMonitor {
  /**
   * Analyze text for collapse resistance signals.
   */
  analyze(content: string): CollapseResistanceReport {
    const signals: CollapseSignal[] = [];
    let totalWeight = 0;
    let harmWeight = 0;

    for (const [category, config] of Object.entries(COLLAPSE_PATTERN_CATEGORIES)) {
      for (const patternDef of config.patterns) {
        const matches = content.match(patternDef.regex);
        if (matches && matches.length > 0) {
          totalWeight += config.weight;
          harmWeight += config.weight * (patternDef.severity === 'critical' ? 3 : patternDef.severity === 'concerning' ? 2 : 1);

          signals.push({
            category: category as CollapseSignal['category'],
            severity: patternDef.severity,
            evidence: matches.slice(0, 2).join(', '),
            pattern: patternDef.regex.source,
            remediation: config.remediation,
          });
        }
      }
    }

    // Calculate health score (1 = healthy, 0 = collapsing)
    const healthScore = totalWeight > 0
      ? Math.max(0, 1 - (harmWeight / (totalWeight * 3)))
      : 1.0;

    // Calculate dimensional alignment from signals
    const dimensionalAlignment = this.calculateDimensionalAlignment(signals);

    return {
      healthScore,
      signals,
      recommendations: this.generateRecommendations(signals, healthScore),
      dimensionalAlignment,
    };
  }

  private calculateDimensionalAlignment(signals: CollapseSignal[]): CollapseResistanceReport['dimensionalAlignment'] {
    const byCategory = signals.reduce((acc, s) => {
      acc[s.category] = (acc[s.category] || 0) + (s.severity === 'critical' ? 3 : s.severity === 'concerning' ? 2 : 1);
      return acc;
    }, {} as Record<string, number>);

    // Manthra (thought): affected by confidence inflation
    const manthra = Math.max(0, 1 - (byCategory.confidence_inflation || 0) * 0.15);

    // Yasna (word): affected by moral detachment and suffering narrative
    const yasna = Math.max(0, 1 - ((byCategory.moral_detachment || 0) + (byCategory.suffering_narrative || 0)) * 0.12);

    // Mithra (deed): affected by authority drift and dissent suppression
    const mithra = Math.max(0, 1 - ((byCategory.authority_drift || 0) + (byCategory.dissent_suppression || 0)) * 0.12);

    return { manthra, yasna, mithra };
  }

  private generateRecommendations(signals: CollapseSignal[], healthScore: number): string[] {
    const recs: string[] = [];

    if (healthScore < 0.3) {
      recs.push('CRITICAL: High collapse risk detected. Pause and conduct full alignment review.');
    }

    // Deduplicate remediations
    const uniqueRemediations = Array.from(new Set(signals.map(s => s.remediation)));
    recs.push(...uniqueRemediations.slice(0, 3));

    if (signals.some(s => s.category === 'dissent_suppression')) {
      recs.push('Establish dissent preservation mechanism (minority reports, devil\'s advocate role)');
    }

    return recs;
  }
}

export const collapseMonitor = new CollapseResistanceMonitor();
