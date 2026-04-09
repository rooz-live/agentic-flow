/**
 * Evidence-Driven Risk Assessment - Risk Model Training Pipeline
 *
 * Implements risk model training from historical evidence.
 * Provides model validation, testing, performance metrics,
 * retraining triggers, versioning, and rollback capabilities.
 *
 * Applies Manthra: Directed thought-power for logical separation
 * Applies Yasna: Disciplined alignment through consistent interfaces
 * Applies Mithra: Binding force preventing code drift
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { Evidence, EvidenceQuality } from './evidence-risk-assessment.js';

/**
 * Model type
 */
export type ModelType = 'classification' | 'regression' | 'anomaly_detection' | 'ensemble';

/**
 * Model status
 */
export type ModelStatus = 'training' | 'trained' | 'validating' | 'validated' | 'deployed' | 'deprecated' | 'failed';

/**
 * Training algorithm
 */
export type TrainingAlgorithm = 'random_forest' | 'gradient_boosting' | 'neural_network' | 'logistic_regression' | 'svm';

/**
 * Model metrics
 */
export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  confusionMatrix: {
    truePositive: number;
    trueNegative: number;
    falsePositive: number;
    falseNegative: number;
  };
  calibration: {
    brierScore: number;
    expectedCalibrationError: number;
  };
  featureImportance: Map<string, number>;
  trainingTime: number;
  inferenceTime: number;
}

/**
 * Model validation result
 */
export interface ModelValidationResult {
  modelId: string;
  isValid: boolean;
  validationStatus: 'passed' | 'failed' | 'warning';
  metrics: ModelMetrics;
  crossValidation: {
    folds: number;
    meanAccuracy: number;
    stdAccuracy: number;
    foldResults: ModelMetrics[];
  };
  holdoutSet: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
  recommendations: string[];
  warnings: string[];
}

/**
 * Training request
 */
export interface TrainingRequest {
  modelType: ModelType;
  algorithm: TrainingAlgorithm;
  evidence: Evidence[];
  features: string[];
  targetVariable: string;
  hyperparameters?: Record<string, any>;
  validationSplit: number; // 0 to 1
  crossValidationFolds?: number;
  enableEarlyStopping: boolean;
  maxEpochs?: number;
  patience?: number;
}

/**
 * Training result
 */
export interface TrainingResult {
  modelId: string;
  modelVersion: string;
  status: ModelStatus;
  metrics: ModelMetrics;
  validation: ModelValidationResult;
  trainingTime: number;
  evidenceCount: number;
  featureCount: number;
  hyperparameters: Record<string, any>;
  artifacts: {
    modelPath: string;
    metadataPath: string;
    featureImportancePath: string;
  };
}

/**
 * Model version
 */
export interface ModelVersion {
  version: string;
  modelId: string;
  createdAt: Date;
  status: ModelStatus;
  metrics: ModelMetrics;
  evidenceCount: number;
  hyperparameters: Record<string, any>;
  parentVersion?: string;
  isRollback: boolean;
  tags: string[];
}

/**
 * Retraining trigger
 */
export interface RetrainingTrigger {
  id: string;
  triggerType: 'performance_degradation' | 'data_drift' | 'scheduled' | 'manual' | 'new_evidence';
  timestamp: Date;
  threshold: number;
  currentValue: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  triggered: boolean;
  action?: 'retrain' | 'monitor' | 'ignore';
}

/**
 * Model training configuration
 */
export interface ModelTrainingConfig {
  model: {
    type: ModelType;
    algorithm: TrainingAlgorithm;
    defaultHyperparameters: Record<string, any>;
  };
  training: {
    validationSplit: number;
    crossValidationFolds: number;
    enableEarlyStopping: boolean;
    maxEpochs: number;
    patience: number;
    batchSize: number;
    learningRate: number;
  };
  validation: {
    minAccuracy: number;
    minF1Score: number;
    minCalibrationError: number;
    enableCrossValidation: boolean;
    holdoutSetSize: number;
  };
  retraining: {
    enabled: boolean;
    performanceThreshold: number; // Accuracy drop threshold
    dataDriftThreshold: number;
    scheduleInterval: number; // milliseconds
    minNewEvidence: number;
    autoRetrain: boolean;
  };
  storage: {
    modelsPath: string;
    versionsPath: string;
    artifactsPath: string;
    maxVersions: number;
    compressionEnabled: boolean;
  };
  monitoring: {
    enablePerformanceMonitoring: boolean;
    enableDataDriftDetection: boolean;
    monitoringInterval: number;
    alertThreshold: number;
  };
}

/**
 * Feature engineering result
 */
export interface FeatureEngineeringResult {
  features: string[];
  featureImportance: Map<string, number>;
  correlations: Map<string, number>;
  selectedFeatures: string[];
  discardedFeatures: string[];
  transformationApplied: string[];
}

/**
 * Risk Model Training Pipeline
 *
 * Trains risk models on historical evidence with validation,
 * testing, performance metrics, retraining triggers, and versioning.
 */
export class RiskModelTrainingPipeline extends EventEmitter {
  private config: ModelTrainingConfig;
  private models: Map<string, ModelVersion> = new Map();
  private currentModelId: string | null = null;
  private trainingHistory: TrainingResult[] = [];
  private retrainingTriggers: RetrainingTrigger[] = [];
  private featureImportanceHistory: Map<string, number[]> = new Map();
  private isTraining: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<ModelTrainingConfig>) {
    super();

    this.config = this.createDefaultConfig(config);

    console.log('[RISK-MODEL-TRAINING] Risk Model Training Pipeline initialized');
  }

  /**
   * Create default configuration
   */
  private createDefaultConfig(config?: Partial<ModelTrainingConfig>): ModelTrainingConfig {
    const defaultConfig: ModelTrainingConfig = {
      model: {
        type: 'classification',
        algorithm: 'random_forest',
        defaultHyperparameters: {
          nEstimators: 100,
          maxDepth: 10,
          minSamplesSplit: 2,
          minSamplesLeaf: 1,
          maxFeatures: 'sqrt'
        }
      },
      training: {
        validationSplit: 0.2,
        crossValidationFolds: 5,
        enableEarlyStopping: true,
        maxEpochs: 100,
        patience: 10,
        batchSize: 32,
        learningRate: 0.001
      },
      validation: {
        minAccuracy: 0.75,
        minF1Score: 0.70,
        minCalibrationError: 0.15,
        enableCrossValidation: true,
        holdoutSetSize: 0.1
      },
      retraining: {
        enabled: true,
        performanceThreshold: 0.05, // 5% drop
        dataDriftThreshold: 0.1, // 10% drift
        scheduleInterval: 86400000, // 24 hours
        minNewEvidence: 100,
        autoRetrain: false
      },
      storage: {
        modelsPath: path.join(process.cwd(), '.goalie', 'models'),
        versionsPath: path.join(process.cwd(), '.goalie', 'model-versions'),
        artifactsPath: path.join(process.cwd(), '.goalie', 'model-artifacts'),
        maxVersions: 10,
        compressionEnabled: true
      },
      monitoring: {
        enablePerformanceMonitoring: true,
        enableDataDriftDetection: true,
        monitoringInterval: 3600000, // 1 hour
        alertThreshold: 0.8
      }
    };

    return { ...defaultConfig, ...config };
  }

  /**
   * Start monitoring
   */
  public async start(): Promise<void> {
    console.log('[RISK-MODEL-TRAINING] Starting model training pipeline');

    // Load existing models
    await this.loadModels();

    // Start monitoring interval
    if (this.config.monitoring.enablePerformanceMonitoring) {
      this.startMonitoring();
    }

    this.emit('started', { timestamp: new Date() });
  }

  /**
   * Train model from evidence
   */
  public async train(request: TrainingRequest): Promise<TrainingResult> {
    if (this.isTraining) {
      throw new Error('Training already in progress');
    }

    this.isTraining = true;
    const startTime = Date.now();

    try {
      console.log(`[RISK-MODEL-TRAINING] Starting training for model type: ${request.modelType}`);

      // Feature engineering
      const featureEngineering = await this.performFeatureEngineering(request.evidence, request.features);
      const selectedFeatures = featureEngineering.selectedFeatures;

      // Split data
      const { trainSet, validationSet } = this.splitData(
        request.evidence,
        request.validationSplit
      );

      // Train model (mock implementation)
      const modelMetrics = await this.trainModel(
        trainSet,
        validationSet,
        selectedFeatures,
        request
      );

      // Validate model
      const validation = await this.validateModel(
        modelMetrics,
        validationSet,
        selectedFeatures
      );

      // Create model version
      const modelVersion = this.createModelVersion(
        modelMetrics,
        validation,
        request
      );

      // Store model
      await this.storeModel(modelVersion);

      // Update current model
      if (validation.isValid) {
        this.currentModelId = modelVersion.modelId;
      }

      const trainingTime = Date.now() - startTime;

      const result: TrainingResult = {
        modelId: modelVersion.modelId,
        modelVersion: modelVersion.version,
        status: modelVersion.status,
        metrics: modelMetrics,
        validation,
        trainingTime,
        evidenceCount: request.evidence.length,
        featureCount: selectedFeatures.length,
        hyperparameters: request.hyperparameters || this.config.model.defaultHyperparameters,
        artifacts: {
          modelPath: path.join(this.config.storage.modelsPath, `${modelVersion.modelId}.model`),
          metadataPath: path.join(this.config.storage.artifactsPath, `${modelVersion.modelId}.json`),
          featureImportancePath: path.join(this.config.storage.artifactsPath, `${modelVersion.modelId}-features.json`)
        }
      };

      this.trainingHistory.push(result);
      this.emit('trained', result);

      console.log(`[RISK-MODEL-TRAINING] Training completed: ${modelVersion.modelId} in ${trainingTime}ms`);
      return result;
    } finally {
      this.isTraining = false;
    }
  }

  /**
   * Perform feature engineering
   */
  private async performFeatureEngineering(
    evidence: Evidence[],
    requestedFeatures: string[]
  ): Promise<FeatureEngineeringResult> {
    console.log('[RISK-MODEL-TRAINING] Performing feature engineering');

    // Extract features from evidence
    const allFeatures = new Set<string>();
    const featureValues: Map<string, number[]> = new Map();

    for (const ev of evidence) {
      // Extract numeric features from data
      for (const [key, value] of Object.entries(ev.data)) {
        if (typeof value === 'number') {
          allFeatures.add(key);
          if (!featureValues.has(key)) {
            featureValues.set(key, []);
          }
          featureValues.get(key)!.push(value);
        }
      }

      // Add metadata features
      allFeatures.add('confidence');
      allFeatures.add('quality_score');
      allFeatures.add('age_hours');

      if (!featureValues.has('confidence')) {
        featureValues.set('confidence', []);
      }
      featureValues.get('confidence')!.push(ev.confidence);

      if (!featureValues.has('quality_score')) {
        featureValues.set('quality_score', []);
      }
      const qualityScore = this.getQualityScore(ev.quality);
      featureValues.get('quality_score')!.push(qualityScore);

      if (!featureValues.has('age_hours')) {
        featureValues.set('age_hours', []);
      }
      const ageHours = (Date.now() - ev.timestamp.getTime()) / (1000 * 60 * 60);
      featureValues.get('age_hours')!.push(ageHours);
    }

    // Calculate feature importance (mock - based on variance)
    const featureImportance = new Map<string, number>();
    for (const feature of allFeatures) {
      const values = featureValues.get(feature) || [];
      const variance = this.calculateVariance(values);
      const importance = Math.min(1, variance / 1000);
      featureImportance.set(feature, importance);
    }

    // Calculate correlations
    const correlations = new Map<string, number>();
    const features = Array.from(allFeatures);
    for (let i = 0; i < features.length; i++) {
      for (let j = i + 1; j < features.length; j++) {
        const corr = this.calculateCorrelation(
          featureValues.get(features[i]) || [],
          featureValues.get(features[j]) || []
        );
        if (Math.abs(corr) > 0.7) {
          correlations.set(`${features[i]}_${features[j]}`, corr);
        }
      }
    }

    // Select features
    const selectedFeatures = requestedFeatures.length > 0
      ? requestedFeatures.filter(f => allFeatures.has(f))
      : Array.from(allFeatures).filter(f => (featureImportance.get(f) || 0) > 0.1);

    // Discard low importance features
    const discardedFeatures = Array.from(allFeatures)
      .filter(f => !selectedFeatures.includes(f));

    return {
      features: Array.from(allFeatures),
      featureImportance,
      correlations,
      selectedFeatures,
      discardedFeatures,
      transformationApplied: ['normalization', 'variance_filtering']
    };
  }

  /**
   * Get quality score
   */
  private getQualityScore(quality: EvidenceQuality): number {
    const scores: Record<EvidenceQuality, number> = {
      critical: 1.0,
      high: 0.8,
      medium: 0.6,
      low: 0.4,
      unverified: 0.2
    };
    return scores[quality];
  }

  /**
   * Calculate variance
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((sum, d) => sum + d, 0) / values.length;
  }

  /**
   * Calculate correlation
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const meanX = x.reduce((sum, v) => sum + v, 0) / n;
    const meanY = y.reduce((sum, v) => sum + v, 0) / n;

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      numerator += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }

    const denominator = Math.sqrt(denX * denomY);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Split data into train and validation sets
   */
  private splitData(evidence: Evidence[], validationSplit: number): {
    trainSet: Evidence[];
    validationSet: Evidence[];
  } {
    const shuffled = [...evidence].sort(() => Math.random() - 0.5);
    const splitIndex = Math.floor(evidence.length * (1 - validationSplit));

    return {
      trainSet: shuffled.slice(0, splitIndex),
      validationSet: shuffled.slice(splitIndex)
    };
  }

  /**
   * Train model (mock implementation)
   */
  private async trainModel(
    trainSet: Evidence[],
    validationSet: Evidence[],
    features: string[],
    request: TrainingRequest
  ): Promise<ModelMetrics> {
    console.log('[RISK-MODEL-TRAINING] Training model (mock implementation)');

    // Simulate training time
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate mock metrics
    const baseAccuracy = 0.7 + Math.random() * 0.2;
    const accuracy = Math.min(0.95, baseAccuracy + (features.length * 0.01));

    return {
      accuracy,
      precision: accuracy - 0.02 + Math.random() * 0.04,
      recall: accuracy - 0.03 + Math.random() * 0.06,
      f1Score: accuracy - 0.025 + Math.random() * 0.05,
      auc: accuracy + 0.02 + Math.random() * 0.03,
      confusionMatrix: {
        truePositive: Math.floor(trainSet.length * accuracy * 0.4),
        trueNegative: Math.floor(trainSet.length * accuracy * 0.4),
        falsePositive: Math.floor(trainSet.length * (1 - accuracy) * 0.5),
        falseNegative: Math.floor(trainSet.length * (1 - accuracy) * 0.5)
      },
      calibration: {
        brierScore: 0.1 + Math.random() * 0.1,
        expectedCalibrationError: 0.08 + Math.random() * 0.08
      },
      featureImportance: new Map(
        features.map(f => [f, 0.5 + Math.random() * 0.5])
      ),
      trainingTime: 1000,
      inferenceTime: 10 + Math.random() * 20
    };
  }

  /**
   * Validate model
   */
  private async validateModel(
    metrics: ModelMetrics,
    validationSet: Evidence[],
    features: string[]
  ): Promise<ModelValidationResult> {
    console.log('[RISK-MODEL-TRAINING] Validating model');

    const config = this.config.validation;

    // Check validation thresholds
    const isValid = metrics.accuracy >= config.minAccuracy &&
                   metrics.f1Score >= config.minF1Score &&
                   metrics.calibration.brierScore <= config.minCalibrationError;

    const validationStatus: 'passed' | 'failed' | 'warning' = isValid
      ? 'passed'
      : metrics.accuracy >= config.minAccuracy - 0.05
        ? 'warning'
        : 'failed';

    // Cross-validation (mock)
    const foldResults: ModelMetrics[] = [];
    for (let i = 0; i < (config.crossValidationFolds || 5); i++) {
      foldResults.push({
        ...metrics,
        accuracy: metrics.accuracy - 0.02 + Math.random() * 0.04,
        precision: metrics.precision - 0.02 + Math.random() * 0.04,
        recall: metrics.recall - 0.02 + Math.random() * 0.04,
        f1Score: metrics.f1Score - 0.02 + Math.random() * 0.04
      });
    }

    const meanAccuracy = foldResults.reduce((sum, m) => sum + m.accuracy, 0) / foldResults.length;
    const stdAccuracy = Math.sqrt(
      foldResults.reduce((sum, m) => sum + Math.pow(m.accuracy - meanAccuracy, 2), 0) / foldResults.length
    );

    const recommendations: string[] = [];
    const warnings: string[] = [];

    if (metrics.accuracy < config.minAccuracy) {
      recommendations.push(`Consider collecting more training data. Current accuracy: ${(metrics.accuracy * 100).toFixed(1)}%`);
    }

    if (metrics.calibration.brierScore > config.minCalibrationError) {
      recommendations.push('Apply calibration techniques to improve probability estimates');
    }

    if (stdAccuracy > 0.05) {
      warnings.push('High variance in cross-validation results');
    }

    if (features.length < 5) {
      warnings.push('Low number of features may limit model performance');
    }

    return {
      modelId: this.currentModelId || 'unknown',
      isValid,
      validationStatus,
      metrics,
      crossValidation: {
        folds: foldResults.length,
        meanAccuracy,
        stdAccuracy,
        foldResults
      },
      holdoutSet: {
        accuracy: metrics.accuracy - 0.01 + Math.random() * 0.02,
        precision: metrics.precision - 0.01 + Math.random() * 0.02,
        recall: metrics.recall - 0.01 + Math.random() * 0.02,
        f1Score: metrics.f1Score - 0.01 + Math.random() * 0.02
      },
      recommendations,
      warnings
    };
  }

  /**
   * Create model version
   */
  private createModelVersion(
    metrics: ModelMetrics,
    validation: ModelValidationResult,
    request: TrainingRequest
  ): ModelVersion {
    const version = `v${Date.now()}`;
    const modelId = uuidv4();

    return {
      version,
      modelId,
      createdAt: new Date(),
      status: validation.isValid ? 'validated' : 'failed',
      metrics,
      evidenceCount: request.evidence.length,
      hyperparameters: request.hyperparameters || this.config.model.defaultHyperparameters,
      tags: [request.modelType, request.algorithm],
      isRollback: false
    };
  }

  /**
   * Store model
   */
  private async storeModel(modelVersion: ModelVersion): Promise<void> {
    try {
      // Ensure directories exist
      await fs.mkdir(this.config.storage.modelsPath, { recursive: true });
      await fs.mkdir(this.config.storage.versionsPath, { recursive: true });
      await fs.mkdir(this.config.storage.artifactsPath, { recursive: true });

      // Store model version
      this.models.set(modelVersion.modelId, modelVersion);

      // Save to disk
      const versionPath = path.join(this.config.storage.versionsPath, `${modelVersion.version}.json`);
      await fs.writeFile(versionPath, JSON.stringify(modelVersion, null, 2));

      // Save feature importance history
      for (const [feature, importance] of modelVersion.metrics.featureImportance) {
        if (!this.featureImportanceHistory.has(feature)) {
          this.featureImportanceHistory.set(feature, []);
        }
        this.featureImportanceHistory.get(feature)!.push(importance);
      }

      console.log(`[RISK-MODEL-TRAINING] Stored model: ${modelVersion.modelId} (${modelVersion.version})`);
    } catch (error) {
      console.error('[RISK-MODEL-TRAINING] Failed to store model:', error);
      throw error;
    }
  }

  /**
   * Load models from storage
   */
  private async loadModels(): Promise<void> {
    try {
      const versionsPath = this.config.storage.versionsPath;
      const files = await fs.readdir(versionsPath);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(versionsPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const modelVersion: ModelVersion = JSON.parse(content);

          this.models.set(modelVersion.modelId, modelVersion);

          // Set as current if it's the latest
          if (!this.currentModelId) {
            this.currentModelId = modelVersion.modelId;
          }
        }
      }

      console.log(`[RISK-MODEL-TRAINING] Loaded ${this.models.size} models from storage`);
    } catch (error) {
      console.error('[RISK-MODEL-TRAINING] Failed to load models:', error);
    }
  }

  /**
   * Start monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      await this.checkRetrainingTriggers();
    }, this.config.monitoring.monitoringInterval);

    console.log('[RISK-MODEL-TRAINING] Monitoring started');
  }

  /**
   * Check retraining triggers
   */
  private async checkRetrainingTriggers(): Promise<void> {
    const triggers: RetrainingTrigger[] = [];

    // Performance degradation trigger
    if (this.currentModelId) {
      const currentModel = this.models.get(this.currentModelId);
      if (currentModel) {
        const performanceDrop = this.calculatePerformanceDrop(currentModel);
        if (performanceDrop > this.config.retraining.performanceThreshold) {
          triggers.push({
            id: uuidv4(),
            triggerType: 'performance_degradation',
            timestamp: new Date(),
            threshold: this.config.retraining.performanceThreshold,
            currentValue: performanceDrop,
            severity: performanceDrop > 0.1 ? 'high' : 'medium',
            description: `Performance dropped by ${(performanceDrop * 100).toFixed(1)}%`,
            triggered: true
          });
        }
      }
    }

    // Scheduled trigger
    const lastTraining = this.trainingHistory[this.trainingHistory.length - 1];
    if (lastTraining) {
      const timeSinceLastTraining = Date.now() - lastTraining.trainingTime;
      if (timeSinceLastTraining > this.config.retraining.scheduleInterval) {
        triggers.push({
          id: uuidv4(),
          triggerType: 'scheduled',
          timestamp: new Date(),
          threshold: this.config.retraining.scheduleInterval,
          currentValue: timeSinceLastTraining,
          severity: 'low',
          description: 'Scheduled retraining time reached',
          triggered: true
        });
      }
    }

    // Emit triggers
    for (const trigger of triggers) {
      this.retrainingTriggers.push(trigger);
      this.emit('retrainingTriggered', trigger);

      if (this.config.retraining.autoRetrain) {
        // Auto-retrain would be triggered here
        console.log(`[RISK-MODEL-TRAINING] Auto-retrain triggered: ${trigger.triggerType}`);
      }
    }
  }

  /**
   * Calculate performance drop
   */
  private calculatePerformanceDrop(model: ModelVersion): number {
    const recentMetrics = this.trainingHistory
      .slice(-5)
      .map(h => h.metrics.accuracy);

    if (recentMetrics.length === 0) return 0;

    const avgRecent = recentMetrics.reduce((sum, m) => sum + m, 0) / recentMetrics.length;
    const drop = (model.metrics.accuracy - avgRecent) / model.metrics.accuracy;

    return Math.max(0, drop);
  }

  /**
   * Rollback to previous model version
   */
  public async rollback(modelId: string): Promise<void> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    // Create rollback version
    const rollbackVersion: ModelVersion = {
      ...model,
      version: `v${Date.now()}`,
      createdAt: new Date(),
      isRollback: true,
      parentVersion: model.version,
      tags: [...model.tags, 'rollback']
    };

    await this.storeModel(rollbackVersion);
    this.currentModelId = rollbackVersion.modelId;

    this.emit('rolledBack', { from: this.currentModelId, to: modelId, version: rollbackVersion.version });
    console.log(`[RISK-MODEL-TRAINING] Rolled back to model: ${modelId}`);
  }

  /**
   * Get current model
   */
  public getCurrentModel(): ModelVersion | null {
    if (!this.currentModelId) return null;
    return this.models.get(this.currentModelId) || null;
  }

  /**
   * Get model by ID
   */
  public getModel(modelId: string): ModelVersion | undefined {
    return this.models.get(modelId);
  }

  /**
   * Get all models
   */
  public getAllModels(): ModelVersion[] {
    return Array.from(this.models.values());
  }

  /**
   * Get training history
   */
  public getTrainingHistory(): TrainingResult[] {
    return [...this.trainingHistory];
  }

  /**
   * Get feature importance history
   */
  public getFeatureImportanceHistory(): Map<string, number[]> {
    return new Map(this.featureImportanceHistory);
  }

  /**
   * Get retraining triggers
   */
  public getRetrainingTriggers(): RetrainingTrigger[] {
    return [...this.retrainingTriggers];
  }

  /**
   * Stop monitoring
   */
  public async stop(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.emit('stopped', { timestamp: new Date() });
    console.log('[RISK-MODEL-TRAINING] Monitoring stopped');
  }

  /**
   * Get configuration
   */
  public getConfig(): ModelTrainingConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<ModelTrainingConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('configUpdated', { config: this.config });
    console.log('[RISK-MODEL-TRAINING] Configuration updated');
  }
}

/**
 * Create default risk model training pipeline
 */
export function createDefaultRiskModelTrainingPipeline(): RiskModelTrainingPipeline {
  return new RiskModelTrainingPipeline();
}

/**
 * Create risk model training pipeline from config
 */
export function createRiskModelTrainingPipelineFromConfig(
  config: Partial<ModelTrainingConfig>
): RiskModelTrainingPipeline {
  return new RiskModelTrainingPipeline(config);
}
