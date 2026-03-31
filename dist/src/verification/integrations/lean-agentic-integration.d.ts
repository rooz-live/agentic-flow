/**
 * Lean-Agentic Mathematical Models Integration
 * Novel verification algorithms, causal inference, statistical significance testing
 */
export interface CausalModel {
    variables: CausalVariable[];
    relationships: CausalRelationship[];
    assumptions: string[];
    confounders: string[];
}
export interface CausalVariable {
    name: string;
    type: 'treatment' | 'outcome' | 'covariate' | 'confounder';
    distribution?: string;
    observed: boolean;
}
export interface CausalRelationship {
    from: string;
    to: string;
    type: 'direct' | 'indirect' | 'confounded';
    strength?: number;
    significance?: number;
}
export interface CausalInferenceResult {
    effect: number;
    confidence: [number, number];
    pValue: number;
    significant: boolean;
    method: 'randomized-trial' | 'observational' | 'quasi-experimental';
    assumptions: AssumptionValidation[];
    threats: BiasThreats[];
}
export interface AssumptionValidation {
    assumption: string;
    satisfied: boolean;
    evidence: string;
    risk: 'low' | 'medium' | 'high';
}
export interface BiasThreats {
    type: 'selection' | 'confounding' | 'measurement' | 'missing-data';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    mitigation?: string;
}
export interface StatisticalTest {
    testName: string;
    statistic: number;
    pValue: number;
    significant: boolean;
    alpha: number;
    effectSize?: number;
    powerAnalysis?: PowerAnalysis;
}
export interface PowerAnalysis {
    power: number;
    sampleSize: number;
    effectSize: number;
    alpha: number;
    adequate: boolean;
}
export declare class LeanAgenticIntegration {
    private readonly SIGNIFICANCE_LEVEL;
    private readonly MINIMUM_POWER;
    /**
     * Perform causal inference validation
     */
    validateCausalInference(hypothesis: string, data: Record<string, any>, model: CausalModel): Promise<CausalInferenceResult>;
    /**
     * Validate causal model structure
     */
    private validateCausalStructure;
    /**
     * Check for cycles in causal graph
     */
    private hasCycles;
    /**
     * Validate causal assumptions
     */
    private validateAssumptions;
    /**
     * Validate SUTVA assumption
     */
    private validateSUTVA;
    /**
     * Validate ignorability assumption
     */
    private validateIgnorability;
    /**
     * Validate positivity assumption
     */
    private validatePositivity;
    /**
     * Validate consistency assumption
     */
    private validateConsistency;
    /**
     * Identify bias threats
     */
    private identifyBiasThreats;
    /**
     * Estimate causal effect
     */
    private estimateCausalEffect;
    /**
     * Calculate confidence interval
     */
    private calculateConfidenceInterval;
    /**
     * Compute p-value
     */
    private computePValue;
    /**
     * Normal CDF approximation
     */
    private normalCDF;
    /**
     * Determine study method
     */
    private determineMethod;
    /**
     * Perform statistical significance test
     */
    performSignificanceTest(hypothesis: string, data: Record<string, any>, testType: 't-test' | 'chi-square' | 'anova' | 'regression'): Promise<StatisticalTest>;
    /**
     * Perform power analysis
     */
    private performPowerAnalysis;
    /**
     * Calculate statistical power
     */
    private calculatePower;
    /**
     * Validate statistical model
     */
    validateStatisticalModel(model: Record<string, any>, data: Record<string, any>): Promise<{
        valid: boolean;
        diagnostics: ModelDiagnostics;
        recommendations: string[];
    }>;
    private analyzeResiduals;
    private checkMulticollinearity;
    private checkHeteroscedasticity;
    private checkNormality;
    private generateModelRecommendations;
    private assessModelValidity;
}
interface ModelDiagnostics {
    residualAnalysis: any;
    multicollinearity: any;
    heteroscedasticity: any;
    normality: any;
}
export {};
//# sourceMappingURL=lean-agentic-integration.d.ts.map