/**
 * Coverage Analysis Engine
 *
 * Core engine for tier-based coverage reporting, depth analysis,
 * and maturity surface measurement
 */
import { EventEmitter } from 'events';
import { CoverageReport, CoveragePeriod, CoverageScope, TierDefinition, TierType, CoverageConfiguration } from './types';
export declare class CoverageAnalyzer extends EventEmitter {
    private configuration;
    private tierDefinitions;
    private coverageData;
    private historicalData;
    constructor(configuration?: Partial<CoverageConfiguration>);
    private mergeWithDefaultConfig;
    private getDefaultTierDefinitions;
    private initializeTierDefinitions;
    private loadHistoricalData;
    generateCoverageReport(period: CoveragePeriod, scope: CoverageScope): Promise<CoverageReport>;
    private collectCoverageData;
    private collectPatternMetrics;
    private collectWSJFData;
    private collectEconomicData;
    private mergeCoverageData;
    private inferTierFromPattern;
    private inferDepthFromPattern;
    private inferStatusFromPattern;
    private calculatePatternCoverage;
    private calculatePatternQuality;
    private analyzeTierCoverage;
    private calculateTierMetrics;
    private validateTierCompliance;
    private validateSchemaCompliance;
    private validateBacklogCompliance;
    private validateTelemetryCompliance;
    private validateExecutionCompliance;
    private validateItemAgainstSchema;
    private validateFieldValue;
    private generateSchemaRecommendations;
    private identifyCoverageGaps;
    private calculateTierScore;
    private analyzeDepth;
    private analyzeDepthTrends;
    private analyzeDepthQuality;
    private calculateConsistency;
    private calculateReliability;
    private identifyQualityIssues;
    private generateQualityImprovements;
    private generateDepthRecommendations;
    private calculateMaturitySurface;
    private calculateMaturityDimensions;
    private calculateDimensionScore;
    private calculateCompletenessScore;
    private calculateDepthScore;
    private calculateQualityScore;
    private calculateProcessScore;
    private determineMaturityLevel;
    private generateMaturityCriteria;
    private identifyMaturityGaps;
    private calculateMaturityEvolution;
    private calculateTrajectory;
    private generateProjection;
    private identifyKeyDrivers;
    private analyzeTrends;
    private calculateOverallTrend;
    private calculateTierTrends;
    private calculateDepthTrends;
    private calculateCircleTrends;
    private generateTrendInsights;
    private generateRecommendations;
    private generateSummary;
    private generateHighlights;
    private generateConcerns;
    private saveReport;
    private generateId;
    getConfiguration(): CoverageConfiguration;
    updateConfiguration(config: Partial<CoverageConfiguration>): void;
    getTierDefinitions(): Map<TierType, TierDefinition>;
    getHistoricalReports(): CoverageReport[];
}
//# sourceMappingURL=coverage-analyzer.d.ts.map