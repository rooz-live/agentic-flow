/**
 * Brutal Honesty Protocol
 *
 * Implements recommendation lifecycle tracking with dilution detection.
 *
 * Addresses Phase 1 gap: No brutal honesty protocols exist in codebase.
 *
 * Key Functions:
 * - Track recommendations from generation through disposition
 * - Detect hedging language, confidence downgrading, and dilution
 * - Calculate implementation rate per production cycle
 * - Maintain calibrated judgment under authority collapse
 */
export interface Recommendation {
    id: string;
    generatedAt: Date;
    source: string;
    originalText: string;
    currentText: string;
    confidence: number;
    status: RecommendationStatus;
    disposition?: RecommendationDisposition;
    auditTrail: AuditEntry[];
}
export type RecommendationStatus = 'generated' | 'queued' | 'in_progress' | 'implemented' | 'deferred' | 'blocked' | 'skipped';
export type RecommendationDisposition = 'accepted' | 'rejected' | 'diluted' | 'soft_pedaled' | 'expired';
export interface AuditEntry {
    timestamp: Date;
    action: string;
    actor: string;
    details: string;
    confidenceDelta?: number;
}
export interface DilutionAnalysis {
    originalConfidence: number;
    currentConfidence: number;
    confidenceDrop: number;
    hedgingPatterns: string[];
    dilutionScore: number;
    isDiluted: boolean;
}
export declare class BrutalHonestyProtocol {
    private recommendations;
    generateRecommendation(source: string, text: string, confidence: number): Recommendation;
    updateRecommendation(id: string, newText: string, actor: string): Recommendation | null;
    analyzeDilution(original: string, current: string): DilutionAnalysis;
    private countHedgingPatterns;
    setStatus(id: string, status: RecommendationStatus, actor: string): void;
    getImplementationRate(): {
        total: number;
        implemented: number;
        rate: number;
    };
    getSkippedRecommendations(): Recommendation[];
    getDilutedRecommendations(): Recommendation[];
    getAuditReport(): {
        total: number;
        byStatus: Record<RecommendationStatus, number>;
        byDisposition: Record<string, number>;
        implementationRate: number;
        dilutionRate: number;
    };
}
export declare const globalHonestyProtocol: BrutalHonestyProtocol;
//# sourceMappingURL=brutal_honesty.d.ts.map