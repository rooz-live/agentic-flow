/**
 * WSJF (Weighted Shortest Job First) Calculator
 *
 * Implements the core WSJF calculation algorithm with configurable parameters
 * and support for enhanced calculation methods including risk and opportunity adjustments
 */
import { WSJFCalculationParams, WSJFWeightingFactors, WSJFResult, WSJFConfiguration } from './types';
export declare class WSJFCalculator {
    private defaultWeightingFactors;
    private defaultConfiguration;
    /**
     * Calculate WSJF score using standard formula: WSJF = Cost of Delay / Job Duration
     * Cost of Delay = (User Business Value + Time Criticality + Customer Value + Risk Reduction + Opportunity Enablement)
     */
    calculateWSJF(jobId: string, params: WSJFCalculationParams, configuration?: Partial<WSJFConfiguration>): WSJFResult;
    /**
     * Batch calculate WSJF scores for multiple jobs
     */
    calculateBatchWSJF(calculations: Array<{
        jobId: string;
        params: WSJFCalculationParams;
    }>, configuration?: Partial<WSJFConfiguration>): WSJFResult[];
    /**
     * Recalculate WSJF score with updated parameters
     */
    recalculateWSJF(existingResult: WSJFResult, updatedParams: Partial<WSJFCalculationParams>, updatedWeightingFactors?: Partial<WSJFWeightingFactors>, configuration?: Partial<WSJFConfiguration>): WSJFResult;
    /**
     * Apply calculation method specific adjustments
     */
    private applyCalculationMethodAdjustments;
    /**
     * Validate calculation parameters
     */
    private validateCalculationParams;
    /**
     * Validate configuration parameters
     */
    private validateConfiguration;
    /**
     * Create standardized error object
     */
    private createError;
    /**
     * Generate unique ID for WSJF results
     */
    private generateId;
    /**
     * Get default configuration
     */
    getDefaultConfiguration(): WSJFConfiguration;
    /**
     * Get default weighting factors
     */
    getDefaultWeightingFactors(): WSJFWeightingFactors;
    /**
     * Create custom configuration
     */
    createConfiguration(name: string, description: string, weightingFactors: Partial<WSJFWeightingFactors>, options?: Partial<Omit<WSJFConfiguration, 'name' | 'description' | 'weightingFactors'>>): WSJFConfiguration;
    /**
     * Calculate WSJF statistics for a set of results
     */
    calculateStatistics(results: WSJFResult[]): {
        count: number;
        averageScore: number;
        minScore: number;
        maxScore: number;
        medianScore: number;
        standardDeviation: number;
    };
}
//# sourceMappingURL=calculator.d.ts.map