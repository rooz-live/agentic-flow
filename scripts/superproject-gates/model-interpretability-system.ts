/**
 * Model Interpretability System
 *
 * Main integration point for LIME and SHAP interpretability in PDA cycle.
 * Provides unified API for generating and managing model explanations.
 */

import { LIMEExplainer } from './lime-explainer';
import { SHAPExplainer } from './shap-explainer';
import type {
  InterpretabilityResult,
  PredictionContext,
  InterpretabilityEvidence,
  InterpretabilityMetrics,
  ModelInterpretabilityConfig,
  LIMEConfig,
  SHAPConfig
} from './types';

export class ModelInterpretabilitySystem {
  private lime: LIMEExplainer;
  private shap: SHAPExplainer;
  private config: ModelInterpretabilityConfig;
  private evidenceHistory: Map<string, InterpretabilityEvidence> = new Map();
  private predictionHistory: Map<string, PredictionContext> = new Map();

  constructor(config: Partial<ModelInterpretabilityConfig> = {}) {
    const limeConfig: LIMEConfig = {
      numSamples: config.lime?.numSamples || 1000,
      numFeatures: config.lime?.numFeatures || 10,
      kernelWidth: config.lime?.kernelWidth || 0.75,
      sampleAroundInstance: config.lime?.sampleAroundInstance ?? true,
      discretizeContinuous: config.lime?.discretizeContinuous ?? true,
      discretizer: config.lime?.discretizer || 'quantile'
    };
    const shapConfig: SHAPConfig = {
      algorithm: config.shap?.algorithm || 'kernel',
      nsamples: config.shap?.nsamples || 1000,
      backgroundDataSize: config.shap?.backgroundDataSize || 100,
      featurePerturbation: config.shap?.featurePerturbation || 'interventional',
      maxDisplay: config.shap?.maxDisplay || 20
    };

    this.lime = new LIMEExplainer(limeConfig);
    this.shap = new SHAPExplainer(shapConfig);

    this.config = {
      lime: limeConfig,
      shap: shapConfig,
      enableLogging: config.enableLogging !== false,
      logExplanations: config.logExplanations !== false,
      minConfidenceThreshold: config.minConfidenceThreshold || 0.6
    };
  }

  /**
   * Generate comprehensive interpretability analysis for a prediction
   * Called during the Do phase of the PDA cycle
   */
  public async analyzeDecision(
    context: PredictionContext,
    modelPredict: (features: Record<string, number>) => number,
    options: {
      useLIME?: boolean;
      useSHAP?: boolean;
    } = {}
  ): Promise<InterpretabilityResult> {
    const useLIME = options.useLIME !== false;
    const useSHAP = options.useSHAP !== false;

    // Store prediction context
    this.predictionHistory.set(context.predictionId, context);

    // Generate LIME explanation (local interpretability)
    let limeExplanation;
    if (useLIME) {
      limeExplanation = await this.lime.explainPrediction(context, modelPredict);
    }

    // Generate SHAP values (global interpretability)
    let shapValues;
    if (useSHAP) {
      shapValues = await this.shap.explainPrediction(context, modelPredict);
    }

    // Calculate overall confidence
    const confidence = this.calculateOverallConfidence(limeExplanation, shapValues);

    // Generate summary
    const summary = this.generateInterpretabilitySummary(
      limeExplanation,
      shapValues,
      confidence
    );

    const result: InterpretabilityResult = {
      lime: limeExplanation,
      shap: shapValues,
      timestamp: new Date(),
      confidence,
      summary
    };

    // Log as evidence if enabled
    if (this.config.logExplanations && confidence >= this.config.minConfidenceThreshold) {
      this.logEvidence(context.predictionId, result);
    }

    return result;
  }

  /**
   * Generate global feature importance across multiple predictions
   */
  public async analyzeGlobalImportance(
    contexts: PredictionContext[],
    modelPredict: (features: Record<string, number>) => number
  ): Promise<InterpretabilityResult> {
    if (contexts.length === 0) {
      throw new Error('No prediction contexts provided for global importance analysis');
    }

    // Calculate global SHAP values
    const shapValues = await this.shap.calculateGlobalImportance(
      contexts,
      modelPredict
    );

    // Generate summary
    const summary = this.generateGlobalImportanceSummary(shapValues);

    const result: InterpretabilityResult = {
      shap: shapValues,
      timestamp: new Date(),
      confidence: 0.85, // Global analysis typically has higher confidence
      summary
    };

    return result;
  }

  /**
   * Get interpretability metrics for Act phase analysis
   */
  public getInterpretabilityMetrics(
    modelId: string,
    timeframe?: { start: Date; end: Date }
  ): InterpretabilityMetrics {
    const limeExplanations = this.lime.getExplanationsForModel(modelId);
    const shapValues = this.shap.getSHAPValuesForModel(modelId);

    // Filter by timeframe if provided
    const filteredLIME = timeframe
      ? limeExplanations.filter(e =>
          e.timestamp >= timeframe.start && e.timestamp <= timeframe.end
        )
      : limeExplanations;

    const filteredSHAP = timeframe
      ? shapValues.filter(s =>
          s.timestamp >= timeframe.start && s.timestamp <= timeframe.end
        )
      : shapValues;

    // Calculate average confidence
    const averageConfidence =
      filteredLIME.length > 0
        ? filteredLIME.reduce((sum, e) => sum + e.confidence, 0) / filteredLIME.length
        : 0;

    // Calculate feature stability
    const featureStability = this.calculateFeatureStability(filteredLIME);

    // Calculate explanation consistency
    const explanationConsistency = this.calculateExplanationConsistency(
      filteredLIME,
      filteredSHAP
    );

    // Get top features
    const topFeatures = this.getTopFeatures(filteredSHAP);

    // Detect drift
    const driftDetected = this.detectDrift(filteredLIME);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      averageConfidence,
      featureStability,
      explanationConsistency,
      driftDetected
    );

    return {
      averageConfidence,
      featureStability,
      explanationConsistency,
      topFeatures,
      driftDetected,
      recommendations
    };
  }

  /**
   * Get evidence for a specific prediction
   */
  public getEvidence(predictionId: string): InterpretabilityEvidence | undefined {
    return this.evidenceHistory.get(predictionId);
  }

  /**
   * Get all evidence for a model
   */
  public getEvidenceForModel(modelId: string): InterpretabilityEvidence[] {
    return Array.from(this.evidenceHistory.values())
      .filter(e => {
        const context = this.predictionHistory.get(e.predictionId);
        return context?.modelId === modelId;
      });
  }

  /**
   * Initialize background data for SHAP
   */
  public initializeBackgroundData(data: Record<string, number>[]): void {
    this.shap.initializeBackgroundData(data);
  }

  /**
   * Clear all history
   */
  public clearHistory(): void {
    this.lime.clearHistory();
    this.shap.clearHistory();
    this.evidenceHistory.clear();
    this.predictionHistory.clear();
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<ModelInterpretabilityConfig>): void {
    if (config.lime) {
      this.lime.updateConfig(config.lime);
      this.config.lime = { ...this.config.lime, ...config.lime };
    }
    if (config.shap) {
      this.shap.updateConfig(config.shap);
      this.config.shap = { ...this.config.shap, ...config.shap };
    }
    if (config.enableLogging !== undefined) {
      this.config.enableLogging = config.enableLogging;
    }
    if (config.logExplanations !== undefined) {
      this.config.logExplanations = config.logExplanations;
    }
    if (config.minConfidenceThreshold !== undefined) {
      this.config.minConfidenceThreshold = config.minConfidenceThreshold;
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): ModelInterpretabilityConfig {
    return {
      lime: this.lime.getConfig(),
      shap: this.shap.getConfig(),
      enableLogging: this.config.enableLogging,
      logExplanations: this.config.logExplanations,
      minConfidenceThreshold: this.config.minConfidenceThreshold
    };
  }

  /**
   * Log interpretability as evidence
   */
  private logEvidence(
    predictionId: string,
    result: InterpretabilityResult
  ): void {
    const evidence: InterpretabilityEvidence = {
      type: result.lime && result.shap ? 'combined' : result.lime ? 'lime' : 'shap',
      predictionId,
      explanation: result,
      confidence: result.confidence,
      timestamp: new Date(),
      metadata: {
        limeId: result.lime?.id,
        shapId: result.shap?.id,
        modelId: this.predictionHistory.get(predictionId)?.modelId
      }
    };

    this.evidenceHistory.set(predictionId, evidence);

    if (this.config.enableLogging) {
      console.log(`[INTERPRETABILITY] Logged evidence for prediction ${predictionId}`);
      console.log(`  Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`  Summary: ${result.summary}`);
    }
  }

  /**
   * Calculate overall confidence from LIME and SHAP
   */
  private calculateOverallConfidence(
    limeExplanation?: any,
    shapValues?: any
  ): number {
    const confidences: number[] = [];

    if (limeExplanation) {
      confidences.push(limeExplanation.confidence);
    }
    if (shapValues) {
      // SHAP doesn't have a direct confidence metric, use sample-based estimate
      const sampleConfidence = Math.min(1, shapValues.totalSamples / 1000);
      confidences.push(sampleConfidence);
    }

    if (confidences.length === 0) {
      return 0;
    }

    return confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
  }

  /**
   * Generate interpretability summary
   */
  private generateInterpretabilitySummary(
    limeExplanation?: any,
    shapValues?: any,
    confidence?: number
  ): string {
    let summary = `Interpretability Analysis (confidence: ${(confidence! * 100).toFixed(1)}%). `;

    if (limeExplanation) {
      summary += `LIME R²: ${limeExplanation.rSquared.toFixed(3)}. `;
    }

    if (shapValues && shapValues.featureImportance.length > 0) {
      const topFeature = shapValues.featureImportance[0];
      summary += `Top feature: ${topFeature.featureName} (${topFeature.importance.toFixed(4)}). `;
    }

    return summary;
  }

  /**
   * Generate global importance summary
   */
  private generateGlobalImportanceSummary(shapValues: any): string {
    if (shapValues.featureImportance.length === 0) {
      return 'No feature importance data available.';
    }

    const topFeatures = shapValues.featureImportance.slice(0, 5);
    return `Global feature importance: ${topFeatures.map(f => `${f.featureName} (${f.importance.toFixed(4)})`).join(', ')}.`;
  }

  /**
   * Calculate feature stability across explanations
   */
  private calculateFeatureStability(limeExplanations: any[]): number {
    if (limeExplanations.length < 2) {
      return 1.0;
    }

    // Calculate rank correlation between consecutive explanations
    let totalCorrelation = 0;
    let comparisons = 0;

    for (let i = 1; i < limeExplanations.length; i++) {
      const prev = limeExplanations[i - 1];
      const curr = limeExplanations[i];

      const correlation = this.calculateRankCorrelation(
        prev.features.map(f => f.featureName),
        curr.features.map(f => f.featureName)
      );

      totalCorrelation += correlation;
      comparisons++;
    }

    return comparisons > 0 ? totalCorrelation / comparisons : 1.0;
  }

  /**
   * Calculate rank correlation (Spearman-like)
   */
  private calculateRankCorrelation(rank1: string[], rank2: string[]): number {
    const n = Math.min(rank1.length, rank2.length);
    if (n === 0) return 1.0;

    let matches = 0;
    for (let i = 0; i < n; i++) {
      const positionInRank2 = rank2.indexOf(rank1[i]);
      if (positionInRank2 !== -1 && Math.abs(positionInRank2 - i) <= 2) {
        matches++;
      }
    }

    return matches / n;
  }

  /**
   * Calculate explanation consistency between LIME and SHAP
   */
  private calculateExplanationConsistency(
    limeExplanations: any[],
    shapValues: any[]
  ): number {
    if (limeExplanations.length === 0 || shapValues.length === 0) {
      return 1.0;
    }

    // Compare top features between LIME and SHAP
    let totalAgreement = 0;
    let comparisons = 0;

    const minLen = Math.min(limeExplanations.length, shapValues.length);
    for (let i = 0; i < minLen; i++) {
      const limeTop = limeExplanations[i].features.slice(0, 5).map(f => f.featureName);
      const shapTop = shapValues[i].featureImportance.slice(0, 5).map(f => f.featureName);

      const intersection = limeTop.filter(f => shapTop.includes(f)).length;
      totalAgreement += intersection / 5;
      comparisons++;
    }

    return comparisons > 0 ? totalAgreement / comparisons : 1.0;
  }

  /**
   * Get top features from SHAP values
   */
  private getTopFeatures(shapValues: any[]): string[] {
    if (shapValues.length === 0) {
      return [];
    }

    // Aggregate feature importance across all SHAP values
    const featureScores: Map<string, number> = new Map();

    for (const shap of shapValues) {
      for (const feature of shap.featureImportance) {
        const currentScore = featureScores.get(feature.featureName) || 0;
        featureScores.set(feature.featureName, currentScore + feature.importance);
      }
    }

    // Sort and return top features
    return Array.from(featureScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name]) => name);
  }

  /**
   * Detect drift in explanations
   */
  private detectDrift(limeExplanations: any[]): boolean {
    if (limeExplanations.length < 5) {
      return false;
    }

    // Calculate average confidence over time
    const recent = limeExplanations.slice(-5);
    const older = limeExplanations.slice(-10, -5);

    const recentAvgConfidence =
      recent.reduce((sum, e) => sum + e.confidence, 0) / recent.length;
    const olderAvgConfidence =
      older.reduce((sum, e) => sum + e.confidence, 0) / older.length;

    // Drift detected if confidence drops significantly
    return olderAvgConfidence - recentAvgConfidence > 0.2;
  }

  /**
   * Generate recommendations based on metrics
   */
  private generateRecommendations(
    averageConfidence: number,
    featureStability: number,
    explanationConsistency: number,
    driftDetected: boolean
  ): string[] {
    const recommendations: string[] = [];

    if (averageConfidence < 0.7) {
      recommendations.push('Model interpretability confidence is low. Consider increasing sample sizes or reviewing model complexity.');
    }

    if (featureStability < 0.6) {
      recommendations.push('Feature attribution is unstable. Model may be overfitting or data distribution may be changing.');
    }

    if (explanationConsistency < 0.5) {
      recommendations.push('LIME and SHAP explanations disagree. Review model architecture and feature interactions.');
    }

    if (driftDetected) {
      recommendations.push('Explanation drift detected. Model may need retraining with recent data.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Interpretability metrics are within acceptable ranges.');
    }

    return recommendations;
  }
}
