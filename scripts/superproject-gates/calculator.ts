/**
 * WSJF (Weighted Shortest Job First) Calculator
 * 
 * Implements the core WSJF calculation algorithm with configurable parameters
 * and support for enhanced calculation methods including risk and opportunity adjustments
 */

import {
  WSJFCalculationParams,
  WSJFWeightingFactors,
  WSJFResult,
  WSJFConfiguration,
  WSJFError
} from './types';

export class WSJFCalculator {
  private defaultWeightingFactors: WSJFWeightingFactors = {
    userBusinessWeight: 1.0,
    timeCriticalityWeight: 1.0,
    customerValueWeight: 1.0,
    riskReductionWeight: 1.0,
    opportunityEnablementWeight: 1.0
  };

  private defaultConfiguration: WSJFConfiguration = {
    id: 'default',
    name: 'Default WSJF Configuration',
    description: 'Standard WSJF calculation with default parameters',
    weightingFactors: this.defaultWeightingFactors,
    calculationMethod: 'standard',
    recalculationInterval: 60,
    autoRecalculate: true,
    enableRiskAdjustments: false,
    enableOpportunityAdjustments: false,
    minJobSize: 0.1,
    maxJobSize: 1000,
    defaultJobDuration: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  /**
   * Calculate WSJF score using standard formula: WSJF = Cost of Delay / Job Duration
   * Cost of Delay = (User Business Value + Time Criticality + Customer Value + Risk Reduction + Opportunity Enablement)
   */
  public calculateWSJF(
    jobId: string,
    params: WSJFCalculationParams,
    configuration?: Partial<WSJFConfiguration>
  ): WSJFResult {
    try {
      const config = { ...this.defaultConfiguration, ...configuration };
      
      // Validate input parameters
      this.validateCalculationParams(params);
      this.validateConfiguration(config);

      // Calculate weighted cost of delay components
      const weightedUserBusiness = params.userBusinessValue * config.weightingFactors.userBusinessWeight;
      const weightedTimeCriticality = params.timeCriticality * config.weightingFactors.timeCriticalityWeight;
      const weightedCustomerValue = params.customerValue * config.weightingFactors.customerValueWeight;
      
      let costOfDelay = weightedUserBusiness + weightedTimeCriticality + weightedCustomerValue;

      // Add risk and opportunity adjustments if enabled
      if (config.enableRiskAdjustments && params.riskReduction !== undefined) {
        costOfDelay += params.riskReduction * config.weightingFactors.riskReductionWeight;
      }

      if (config.enableOpportunityAdjustments && params.opportunityEnablement !== undefined) {
        costOfDelay += params.opportunityEnablement * config.weightingFactors.opportunityEnablementWeight;
      }

      // Apply calculation method specific adjustments
      costOfDelay = this.applyCalculationMethodAdjustments(costOfDelay, config.calculationMethod);

      // Calculate job duration (ensure it's not zero to avoid division by zero)
      const jobDuration = Math.max(params.jobSize, config.minJobSize);

      // Calculate final WSJF score
      const wsjfScore = costOfDelay / jobDuration;

      // Create result object
      const result: WSJFResult = {
        id: this.generateId('wsjf-result'),
        jobId,
        wsjfScore: Math.round(wsjfScore * 100) / 100, // Round to 2 decimal places
        costOfDelay: Math.round(costOfDelay * 100) / 100,
        jobDuration: Math.round(jobDuration * 100) / 100,
        calculationParams: { ...params },
        weightingFactors: { ...config.weightingFactors },
        calculatedAt: new Date()
      };

      return result;
    } catch (error) {
      throw this.createError('CALCULATION_FAILED', `WSJF calculation failed: ${error.message}`);
    }
  }

  /**
   * Batch calculate WSJF scores for multiple jobs
   */
  public calculateBatchWSJF(
    calculations: Array<{
      jobId: string;
      params: WSJFCalculationParams;
    }>,
    configuration?: Partial<WSJFConfiguration>
  ): WSJFResult[] {
    const results: WSJFResult[] = [];
    const errors: WSJFError[] = [];

    for (const calc of calculations) {
      try {
        const result = this.calculateWSJF(calc.jobId, calc.params, configuration);
        results.push(result);
      } catch (error) {
        errors.push({
          code: 'BATCH_CALCULATION_ERROR',
          message: `Failed to calculate WSJF for job ${calc.jobId}: ${error.message}`,
          details: { jobId: calc.jobId, params: calc.params },
          timestamp: new Date()
        });
      }
    }

    if (errors.length > 0 && results.length === 0) {
      throw errors[0];
    }

    return results;
  }

  /**
   * Recalculate WSJF score with updated parameters
   */
  public recalculateWSJF(
    existingResult: WSJFResult,
    updatedParams: Partial<WSJFCalculationParams>,
    updatedWeightingFactors?: Partial<WSJFWeightingFactors>,
    configuration?: Partial<WSJFConfiguration>
  ): WSJFResult {
    const mergedParams = { ...existingResult.calculationParams, ...updatedParams };
    const mergedWeightingFactors = updatedWeightingFactors 
      ? { ...existingResult.weightingFactors, ...updatedWeightingFactors }
      : existingResult.weightingFactors;

    const config = configuration ? { ...configuration, weightingFactors: mergedWeightingFactors } : undefined;

    const newResult = this.calculateWSJF(existingResult.jobId, mergedParams, config);
    
    // Preserve original calculation timestamp and add recalculation timestamp
    newResult.lastRecalculatedAt = new Date();

    return newResult;
  }

  /**
   * Apply calculation method specific adjustments
   */
  private applyCalculationMethodAdjustments(
    costOfDelay: number,
    method: WSJFConfiguration['calculationMethod']
  ): number {
    switch (method) {
      case 'enhanced':
        // Enhanced method applies logarithmic scaling to prevent extreme values
        return Math.log(costOfDelay + 1) * 10;
      
      case 'custom':
        // Custom method could implement more complex logic
        // For now, applying a simple normalization factor
        return Math.min(costOfDelay, 1000);
      
      case 'standard':
      default:
        return costOfDelay;
    }
  }

  /**
   * Validate calculation parameters
   */
  private validateCalculationParams(params: WSJFCalculationParams): void {
    if (params.userBusinessValue < 0 || params.userBusinessValue > 100) {
      throw new Error('User business value must be between 0 and 100');
    }

    if (params.timeCriticality < 0 || params.timeCriticality > 100) {
      throw new Error('Time criticality must be between 0 and 100');
    }

    if (params.customerValue < 0 || params.customerValue > 100) {
      throw new Error('Customer value must be between 0 and 100');
    }

    if (params.jobSize <= 0) {
      throw new Error('Job size must be greater than 0');
    }

    if (params.riskReduction !== undefined && (params.riskReduction < 0 || params.riskReduction > 100)) {
      throw new Error('Risk reduction must be between 0 and 100');
    }

    if (params.opportunityEnablement !== undefined && (params.opportunityEnablement < 0 || params.opportunityEnablement > 100)) {
      throw new Error('Opportunity enablement must be between 0 and 100');
    }
  }

  /**
   * Validate configuration parameters
   */
  private validateConfiguration(config: WSJFConfiguration): void {
    if (config.minJobSize <= 0) {
      throw new Error('Minimum job size must be greater than 0');
    }

    if (config.maxJobSize <= config.minJobSize) {
      throw new Error('Maximum job size must be greater than minimum job size');
    }

    if (config.recalculationInterval <= 0) {
      throw new Error('Recalculation interval must be greater than 0');
    }

    // Validate weighting factors
    Object.values(config.weightingFactors).forEach(weight => {
      if (weight < 0 || weight > 10) {
        throw new Error('Weighting factors must be between 0 and 10');
      }
    });
  }

  /**
   * Create standardized error object
   */
  private createError(code: string, message: string): WSJFError {
    return {
      code,
      message,
      timestamp: new Date()
    };
  }

  /**
   * Generate unique ID for WSJF results
   */
  private generateId(type: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${type}-${timestamp}-${random}`;
  }

  /**
   * Get default configuration
   */
  public getDefaultConfiguration(): WSJFConfiguration {
    return { ...this.defaultConfiguration };
  }

  /**
   * Get default weighting factors
   */
  public getDefaultWeightingFactors(): WSJFWeightingFactors {
    return { ...this.defaultWeightingFactors };
  }

  /**
   * Create custom configuration
   */
  public createConfiguration(
    name: string,
    description: string,
    weightingFactors: Partial<WSJFWeightingFactors>,
    options: Partial<Omit<WSJFConfiguration, 'name' | 'description' | 'weightingFactors'>> = {}
  ): WSJFConfiguration {
    const config: WSJFConfiguration = {
      id: this.generateId('wsjf-config'),
      name,
      description,
      weightingFactors: { ...this.defaultWeightingFactors, ...weightingFactors },
      calculationMethod: 'standard',
      recalculationInterval: 60,
      autoRecalculate: true,
      enableRiskAdjustments: false,
      enableOpportunityAdjustments: false,
      minJobSize: 0.1,
      maxJobSize: 1000,
      defaultJobDuration: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...options
    };

    this.validateConfiguration(config);
    return config;
  }

  /**
   * Calculate WSJF statistics for a set of results
   */
  public calculateStatistics(results: WSJFResult[]): {
    count: number;
    averageScore: number;
    minScore: number;
    maxScore: number;
    medianScore: number;
    standardDeviation: number;
  } {
    if (results.length === 0) {
      return {
        count: 0,
        averageScore: 0,
        minScore: 0,
        maxScore: 0,
        medianScore: 0,
        standardDeviation: 0
      };
    }

    const scores = results.map(r => r.wsjfScore).sort((a, b) => a - b);
    const sum = scores.reduce((acc, score) => acc + score, 0);
    const average = sum / scores.length;
    
    const median = scores.length % 2 === 0
      ? (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2
      : scores[Math.floor(scores.length / 2)];

    const variance = scores.reduce((acc, score) => acc + Math.pow(score - average, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);

    return {
      count: results.length,
      averageScore: Math.round(average * 100) / 100,
      minScore: Math.round(scores[0] * 100) / 100,
      maxScore: Math.round(scores[scores.length - 1] * 100) / 100,
      medianScore: Math.round(median * 100) / 100,
      standardDeviation: Math.round(standardDeviation * 100) / 100
    };
  }
}