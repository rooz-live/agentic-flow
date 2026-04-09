/**
 * SHAP (SHapley Additive exPlanations) Explainer
 *
 * Provides global feature importance explanations for model decisions in the PDA cycle.
 * SHAP values provide a unified measure of feature importance based on game theory.
 */

import type {
  SHAPValues,
  FeatureAttribution,
  PredictionContext,
  SHAPConfig
} from './types';

export class SHAPExplainer {
  private config: SHAPConfig;
  private shapHistory: Map<string, SHAPValues> = new Map();
  private backgroundData: Record<string, number>[] = [];

  constructor(config: Partial<SHAPConfig> = {}) {
    this.config = {
      algorithm: config.algorithm || 'kernel',
      nsamples: config.nsamples || 1000,
      backgroundDataSize: config.backgroundDataSize || 100,
      featurePerturbation: config.featurePerturbation || 'interventional',
      maxDisplay: config.maxDisplay || 20
    };
  }

  /**
   * Initialize background data for SHAP calculations
   */
  public initializeBackgroundData(data: Record<string, number>[]): void {
    this.backgroundData = data.slice(0, this.config.backgroundDataSize);
  }

  /**
   * Generate SHAP values for a prediction
   */
  public async explainPrediction(
    context: PredictionContext,
    modelPredict: (features: Record<string, number>) => number
  ): Promise<SHAPValues> {
    const { features, modelId } = context;

    // Calculate SHAP values using kernel SHAP
    const shapValues = await this.calculateKernelSHAP(features, modelPredict);

    // Calculate feature importance
    const featureImportance: FeatureAttribution[] = Object.keys(features).map(
      featureName => ({
        featureName,
        value: features[featureName],
        attribution: shapValues[featureName] || 0,
        importance: Math.abs(shapValues[featureName] || 0)
      })
    ).sort((a, b) => b.importance - a.importance);

    // Calculate mean absolute SHAP values
    const meanAbsoluteSHAP = Object.values(shapValues).map(Math.abs);

    // Calculate base value (expected model output)
    const baseValue = this.calculateBaseValue(modelPredict);

    const shapResult: SHAPValues = {
      id: this.generateId('shap'),
      modelId,
      timestamp: new Date(),
      featureImportance: featureImportance.slice(0, this.config.maxDisplay),
      meanAbsoluteSHAP,
      baseValue,
      totalSamples: this.config.nsamples
    };

    // Store in history
    this.shapHistory.set(shapResult.id, shapResult);

    return shapResult;
  }

  /**
   * Calculate global SHAP values across multiple predictions
   */
  public async calculateGlobalImportance(
    contexts: PredictionContext[],
    modelPredict: (features: Record<string, number>) => number
  ): Promise<SHAPValues> {
    if (contexts.length === 0) {
      throw new Error('No prediction contexts provided for global importance calculation');
    }

    const allShapValues: Record<string, number[]> = {};
    const featureNames = Object.keys(contexts[0].features);

    // Initialize arrays
    for (const featureName of featureNames) {
      allShapValues[featureName] = [];
    }

    // Calculate SHAP for each context
    for (const context of contexts) {
      const shapValues = await this.calculateKernelSHAP(context.features, modelPredict);
      for (const [featureName, value] of Object.entries(shapValues)) {
        allShapValues[featureName].push(value);
      }
    }

    // Calculate mean SHAP values
    const meanShapValues: Record<string, number> = {};
    for (const [featureName, values] of Object.entries(allShapValues)) {
      meanShapValues[featureName] = values.reduce((sum, v) => sum + v, 0) / values.length;
    }

    // Create feature importance
    const featureImportance: FeatureAttribution[] = Object.entries(meanShapValues).map(
      ([featureName, attribution]) => ({
        featureName,
        value: contexts[0].features[featureName] || 0,
        attribution,
        importance: Math.abs(attribution)
      })
    ).sort((a, b) => b.importance - a.importance);

    // Calculate mean absolute SHAP
    const meanAbsoluteSHAP = Object.entries(allShapValues).map(
      ([_, values]) => values.reduce((sum, v) => sum + Math.abs(v), 0) / values.length
    );

    const baseValue = this.calculateBaseValue(modelPredict);

    const shapResult: SHAPValues = {
      id: this.generateId('shap-global'),
      modelId: contexts[0].modelId,
      timestamp: new Date(),
      featureImportance: featureImportance.slice(0, this.config.maxDisplay),
      meanAbsoluteSHAP,
      baseValue,
      totalSamples: contexts.length * this.config.nsamples
    };

    return shapResult;
  }

  /**
   * Calculate Kernel SHAP values
   */
  private async calculateKernelSHAP(
    features: Record<string, number>,
    modelPredict: (features: Record<string, number>) => number
  ): Promise<Record<string, number>> {
    const featureNames = Object.keys(features);
    const shapValues: Record<string, number> = {};

    // Calculate base value (expected value)
    const baseValue = this.calculateBaseValue(modelPredict);

    // Calculate SHAP value for each feature
    for (const featureName of featureNames) {
      shapValues[featureName] = await this.calculateFeatureSHAP(
        features,
        featureName,
        modelPredict,
        baseValue
      );
    }

    return shapValues;
  }

  /**
   * Calculate SHAP value for a single feature
   */
  private async calculateFeatureSHAP(
    features: Record<string, number>,
    featureName: string,
    modelPredict: (features: Record<string, number>) => number,
    baseValue: number
  ): Promise<number> {
    const featureNames = Object.keys(features);
    const featureIndex = featureNames.indexOf(featureName);

    if (featureIndex === -1) {
      return 0;
    }

    // Generate coalitions (subsets of features)
    const coalitions = this.generateCoalitions(featureNames, featureIndex);

    // Calculate weighted marginal contributions
    let shapValue = 0;

    for (const coalition of coalitions) {
      const weight = this.calculateCoalitionWeight(coalition.length, featureNames.length);

      // Create feature set with feature included
      const featuresWith: Record<string, number> = {};
      const featuresWithout: Record<string, number> = {};

      for (let i = 0; i < featureNames.length; i++) {
        if (coalition.includes(i) || i === featureIndex) {
          featuresWith[featureNames[i]] = features[featureNames[i]];
        }
        if (coalition.includes(i)) {
          featuresWithout[featureNames[i]] = features[featureNames[i]];
        }
      }

      // Use background values for features not in coalition
      const backgroundSample = this.getBackgroundSample();
      for (const name of featureNames) {
        if (!(name in featuresWith)) {
          featuresWith[name] = backgroundSample[name] || 0;
        }
        if (!(name in featuresWithout)) {
          featuresWithout[name] = backgroundSample[name] || 0;
        }
      }

      // Calculate marginal contribution
      const predWith = modelPredict(featuresWith);
      const predWithout = modelPredict(featuresWithout);
      const marginalContribution = predWith - predWithout;

      shapValue += weight * marginalContribution;
    }

    return shapValue;
  }

  /**
   * Generate all coalitions for a feature
   */
  private generateCoalitions(featureNames: string[], featureIndex: number): number[][] {
    const coalitions: number[][] = [];
    const n = featureNames.length;

    // Generate all subsets of other features
    for (let mask = 0; mask < (1 << (n - 1)); mask++) {
      const coalition: number[] = [];
      for (let i = 0; i < n; i++) {
        if (i !== featureIndex) {
          const bitIndex = i > featureIndex ? i - 1 : i;
          if ((mask >> bitIndex) & 1) {
            coalition.push(i);
          }
        }
      }
      coalitions.push(coalition);
    }

    return coalitions;
  }

  /**
   * Calculate coalition weight (Shapley kernel)
   */
  private calculateCoalitionWeight(coalitionSize: number, totalFeatures: number): number {
    const n = totalFeatures - 1;
    const k = coalitionSize;
    return 1 / (this.binomialCoefficient(n, k) * (n + 1));
  }

  /**
   * Calculate binomial coefficient
   */
  private binomialCoefficient(n: number, k: number): number {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;

    let result = 1;
    for (let i = 0; i < k; i++) {
      result = result * (n - i) / (i + 1);
    }
    return result;
  }

  /**
   * Calculate base value (expected model output)
   */
  private calculateBaseValue(
    modelPredict: (features: Record<string, number>) => number
  ): number {
    if (this.backgroundData.length === 0) {
      return 0;
    }

    let sum = 0;
    for (const sample of this.backgroundData) {
      sum += modelPredict(sample);
    }
    return sum / this.backgroundData.length;
  }

  /**
   * Get a random background sample
   */
  private getBackgroundSample(): Record<string, number> {
    if (this.backgroundData.length === 0) {
      return {};
    }
    const index = Math.floor(Math.random() * this.backgroundData.length);
    return { ...this.backgroundData[index] };
  }

  /**
   * Get SHAP values from history
   */
  public getSHAPValues(id: string): SHAPValues | undefined {
    return this.shapHistory.get(id);
  }

  /**
   * Get all SHAP values for a model
   */
  public getSHAPValuesForModel(modelId: string): SHAPValues[] {
    return Array.from(this.shapHistory.values())
      .filter(s => s.modelId === modelId);
  }

  /**
   * Clear SHAP history
   */
  public clearHistory(): void {
    this.shapHistory.clear();
  }

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<SHAPConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): SHAPConfig {
    return { ...this.config };
  }
}
