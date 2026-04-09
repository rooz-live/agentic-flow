/**
 * LIME (Local Interpretable Model-agnostic Explanations) Explainer
 *
 * Provides local explanations for individual predictions in the PDA cycle's Do phase.
 * LIME approximates the model locally with an interpretable model to explain
 * feature contributions to specific predictions.
 */

import type {
  LIMEExplanation,
  FeatureAttribution,
  PredictionContext,
  LIMEConfig
} from './types';

export class LIMEExplainer {
  private config: LIMEConfig;
  private explanationHistory: Map<string, LIMEExplanation> = new Map();

  constructor(config: Partial<LIMEConfig> = {}) {
    this.config = {
      numSamples: config.numSamples || 5000,
      numFeatures: config.numFeatures || 10,
      kernelWidth: config.kernelWidth || 0.75,
      sampleAroundInstance: config.sampleAroundInstance !== false,
      discretizeContinuous: config.discretizeContinuous || false,
      discretizer: config.discretizer || 'quantile'
    };
  }

  /**
   * Generate LIME explanation for a prediction
   */
  public async explainPrediction(
    context: PredictionContext,
    modelPredict: (features: Record<string, number>) => number
  ): Promise<LIMEExplanation> {
    const { features, prediction, modelId, predictionId } = context;

    // Generate perturbed samples around the instance
    const samples = this.generatePerturbedSamples(features);

    // Get predictions for all samples
    const predictions = samples.map(sample => ({
      features: sample,
      prediction: modelPredict(sample),
      weight: this.calculateSampleWeight(features, sample)
    }));

    // Fit local linear model
    const { coefficients, intercept, rSquared } = this.fitLocalModel(predictions);

    // Calculate feature attributions
    const featureAttributions: FeatureAttribution[] = Object.keys(features)
      .slice(0, this.config.numFeatures)
      .map(featureName => ({
        featureName,
        value: features[featureName],
        attribution: coefficients[featureName] || 0,
        importance: Math.abs(coefficients[featureName] || 0)
      }))
      .sort((a, b) => b.importance - a.importance);

    // Calculate confidence based on R-squared and sample quality
    const confidence = this.calculateConfidence(rSquared, predictions.length);

    // Generate explanation summary
    const explanation = this.generateExplanationSummary(
      featureAttributions,
      prediction,
      confidence
    );

    const limeExplanation: LIMEExplanation = {
      id: this.generateId('lime'),
      predictionId,
      modelId,
      timestamp: new Date(),
      prediction,
      localPrediction: this.predictLocal(features, coefficients, intercept),
      features: featureAttributions,
      intercept,
      rSquared,
      numSamples: predictions.length,
      confidence,
      explanation
    };

    // Store in history
    this.explanationHistory.set(limeExplanation.id, limeExplanation);

    return limeExplanation;
  }

  /**
   * Generate perturbed samples around the instance
   */
  private generatePerturbedSamples(
    features: Record<string, number>
  ): Record<string, number>[] {
    const samples: Record<string, number>[] = [];
    const featureNames = Object.keys(features);

    for (let i = 0; i < this.config.numSamples; i++) {
      const sample: Record<string, number> = {};

      for (const featureName of featureNames) {
        if (this.config.sampleAroundInstance && Math.random() < 0.5) {
          // Keep original value with probability
          sample[featureName] = features[featureName];
        } else {
          // Perturb the feature
          sample[featureName] = this.perturbFeature(features[featureName]);
        }
      }

      samples.push(sample);
    }

    return samples;
  }

  /**
   * Perturb a single feature value
   */
  private perturbFeature(value: number): number {
    const perturbation = (Math.random() - 0.5) * 2 * this.config.kernelWidth;
    return value + perturbation * value;
  }

  /**
   * Calculate sample weight based on distance from original instance
   */
  private calculateSampleWeight(
    original: Record<string, number>,
    sample: Record<string, number>
  ): number {
    let distance = 0;
    const featureNames = Object.keys(original);

    for (const featureName of featureNames) {
      const diff = (original[featureName] - sample[featureName]) /
                  (Math.abs(original[featureName]) || 1);
      distance += diff * diff;
    }

    distance = Math.sqrt(distance / featureNames.length);

    // Exponential kernel: higher weight for closer samples
    return Math.exp(-(distance * distance) / (this.config.kernelWidth * this.config.kernelWidth));
  }

  /**
   * Fit a weighted linear regression model locally
   */
  private fitLocalModel(
    predictions: Array<{
      features: Record<string, number>;
      prediction: number;
      weight: number;
    }>
  ): { coefficients: Record<string, number>; intercept: number; rSquared: number } {
    const featureNames = Object.keys(predictions[0].features);
    const coefficients: Record<string, number> = {};

    // Simple weighted least squares approximation
    for (const featureName of featureNames) {
      let numerator = 0;
      let denominator = 0;

      for (const sample of predictions) {
        const featureValue = sample.features[featureName];
        numerator += sample.weight * featureValue * sample.prediction;
        denominator += sample.weight * featureValue * featureValue;
      }

      coefficients[featureName] = denominator !== 0 ? numerator / denominator : 0;
    }

    // Calculate intercept as weighted mean of residuals
    let weightedSumResiduals = 0;
    let totalWeight = 0;

    for (const sample of predictions) {
      let predicted = 0;
      for (const featureName of featureNames) {
        predicted += coefficients[featureName] * sample.features[featureName];
      }
      const residual = sample.prediction - predicted;
      weightedSumResiduals += sample.weight * residual;
      totalWeight += sample.weight;
    }

    const intercept = totalWeight !== 0 ? weightedSumResiduals / totalWeight : 0;

    // Calculate R-squared
    const rSquared = this.calculateRSquared(predictions, coefficients, intercept);

    return { coefficients, intercept, rSquared };
  }

  /**
   * Calculate R-squared for the local model
   */
  private calculateRSquared(
    predictions: Array<{
      features: Record<string, number>;
      prediction: number;
      weight: number;
    }>,
    coefficients: Record<string, number>,
    intercept: number
  ): number {
    const featureNames = Object.keys(coefficients);

    // Calculate weighted mean of predictions
    let weightedSum = 0;
    let totalWeight = 0;
    for (const sample of predictions) {
      weightedSum += sample.weight * sample.prediction;
      totalWeight += sample.weight;
    }
    const meanPrediction = totalWeight !== 0 ? weightedSum / totalWeight : 0;

    // Calculate total sum of squares and residual sum of squares
    let totalSS = 0;
    let residualSS = 0;

    for (const sample of predictions) {
      let predicted = intercept;
      for (const featureName of featureNames) {
        predicted += coefficients[featureName] * sample.features[featureName];
      }

      totalSS += sample.weight * Math.pow(sample.prediction - meanPrediction, 2);
      residualSS += sample.weight * Math.pow(sample.prediction - predicted, 2);
    }

    return totalSS !== 0 ? 1 - (residualSS / totalSS) : 0;
  }

  /**
   * Predict using the local model
   */
  private predictLocal(
    features: Record<string, number>,
    coefficients: Record<string, number>,
    intercept: number
  ): number {
    let prediction = intercept;
    for (const [featureName, coefficient] of Object.entries(coefficients)) {
      prediction += coefficient * (features[featureName] || 0);
    }
    return prediction;
  }

  /**
   * Calculate confidence in the explanation
   */
  private calculateConfidence(rSquared: number, numSamples: number): number {
    const rSquaredComponent = Math.max(0, rSquared);
    const sampleComponent = Math.min(1, numSamples / this.config.numSamples);
    return 0.6 * rSquaredComponent + 0.4 * sampleComponent;
  }

  /**
   * Generate human-readable explanation summary
   */
  private generateExplanationSummary(
    attributions: FeatureAttribution[],
    prediction: number,
    confidence: number
  ): string {
    const topFeatures = attributions.slice(0, 3);
    const positiveFeatures = topFeatures.filter(f => f.attribution > 0);
    const negativeFeatures = topFeatures.filter(f => f.attribution < 0);

    let summary = `Prediction: ${prediction.toFixed(4)} (confidence: ${(confidence * 100).toFixed(1)}%). `;

    if (positiveFeatures.length > 0) {
      summary += `Primary contributors: ${positiveFeatures.map(f => f.featureName).join(', ')}. `;
    }

    if (negativeFeatures.length > 0) {
      summary += `Main detractors: ${negativeFeatures.map(f => f.featureName).join(', ')}. `;
    }

    return summary;
  }

  /**
   * Get explanation from history
   */
  public getExplanation(id: string): LIMEExplanation | undefined {
    return this.explanationHistory.get(id);
  }

  /**
   * Get all explanations for a model
   */
  public getExplanationsForModel(modelId: string): LIMEExplanation[] {
    return Array.from(this.explanationHistory.values())
      .filter(e => e.modelId === modelId);
  }

  /**
   * Clear explanation history
   */
  public clearHistory(): void {
    this.explanationHistory.clear();
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
  public updateConfig(config: Partial<LIMEConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): LIMEConfig {
    return { ...this.config };
  }
}
