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
        manthra: number;
        yasna: number;
        mithra: number;
    };
}
export declare class CollapseResistanceMonitor {
    /**
     * Analyze text for collapse resistance signals.
     */
    analyze(content: string): CollapseResistanceReport;
    private calculateDimensionalAlignment;
    private generateRecommendations;
}
export declare const collapseMonitor: CollapseResistanceMonitor;
//# sourceMappingURL=collapse_resistance.d.ts.map