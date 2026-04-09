/**
 * Evidence-Driven Risk Assessment - Evidence Collection System
 *
 * Implements multi-source evidence collection for risk assessment.
 * Collects evidence from system health, incidents, performance,
 * security events, deployments, user feedback, and external signals.
 * Provides evidence validation, quality scoring, storage, and retrieval.
 *
 * Applies Manthra: Directed thought-power for logical separation
 * Applies Yasna: Disciplined alignment through consistent interfaces
 * Applies Mithra: Binding force preventing code drift
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Evidence source types
 */
export type EvidenceSource =
  | 'system_health'
  | 'incident_history'
  | 'performance_metrics'
  | 'security_events'
  | 'deployment_outcomes'
  | 'user_feedback'
  | 'external_signals';

/**
 * Evidence quality levels
 */
export type EvidenceQuality = 'critical' | 'high' | 'medium' | 'low' | 'unverified';

/**
 * Evidence validation status
 */
export type ValidationStatus = 'valid' | 'invalid' | 'partial' | 'pending';

/**
 * Evidence record
 */
export interface Evidence {
  id: string;
  timestamp: Date;
  source: EvidenceSource;
  sourceId: string;
  type: string;
  category: string;
  data: Record<string, any>;
  quality: EvidenceQuality;
  validationStatus: ValidationStatus;
  confidence: number; // 0 to 1
  tags: string[];
  relatedEvidenceIds: string[];
  metadata: {
    collector: string;
    collectionMethod: string;
    processingTime: number;
    checksum?: string;
  };
  expiresAt?: Date;
}

/**
 * Evidence validation result
 */
export interface EvidenceValidationResult {
  evidenceId: string;
  isValid: boolean;
  validationStatus: ValidationStatus;
  qualityScore: number; // 0 to 100
  confidence: number; // 0 to 1
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

/**
 * Evidence collection request
 */
export interface EvidenceCollectionRequest {
  sources: EvidenceSource[];
  filters?: {
    startTime?: Date;
    endTime?: Date;
    categories?: string[];
    minQuality?: EvidenceQuality;
    tags?: string[];
  };
  includeMetadata?: boolean;
  maxResults?: number;
}

/**
 * Evidence collection result
 */
export interface EvidenceCollectionResult {
  evidence: Evidence[];
  totalCount: number;
  filteredCount: number;
  collectionTime: number;
  sources: {
    source: EvidenceSource;
    count: number;
    quality: {
      critical: number;
      high: number;
      medium: number;
      low: number;
      unverified: number;
    };
  }[];
}

/**
 * Evidence storage configuration
 */
export interface EvidenceStorageConfig {
  enabled: boolean;
  path: string;
  maxRetentionDays: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  backupEnabled: boolean;
  backupIntervalMs: number;
}

/**
 * Evidence validation configuration
 */
export interface EvidenceValidationConfig {
  enabled: boolean;
  strictMode: boolean;
  qualityThreshold: number; // 0 to 100
  confidenceThreshold: number; // 0 to 1
  enableChecksum: boolean;
  enableCrossValidation: boolean;
  maxValidationRetries: number;
}

/**
 * Evidence collection configuration
 */
export interface EvidenceCollectionConfig {
  sources: {
    [K in EvidenceSource]?: {
      enabled: boolean;
      priority: number;
      collectionInterval: number;
      maxBatchSize: number;
      filters?: Record<string, any>;
    };
  };
  validation: EvidenceValidationConfig;
  storage: EvidenceStorageConfig;
  performance: {
    maxConcurrentCollections: number;
    collectionTimeoutMs: number;
    enableCaching: boolean;
    cacheTtlMs: number;
  };
}

/**
 * Evidence statistics
 */
export interface EvidenceStatistics {
  totalEvidence: number;
  bySource: Record<EvidenceSource, number>;
  byQuality: Record<EvidenceQuality, number>;
  byCategory: Record<string, number>;
  averageConfidence: number;
  validationRate: number;
  storageSize: number;
  oldestEvidence: Date | null;
  newestEvidence: Date | null;
}

/**
 * Evidence Collection System
 *
 * Centralized system for collecting, validating, and storing evidence
 * from multiple sources for risk assessment.
 */
export class EvidenceCollectionSystem extends EventEmitter {
  private config: EvidenceCollectionConfig;
  private evidenceStore: Map<string, Evidence> = new Map();
  private evidenceIndex: Map<EvidenceSource, Set<string>> = new Map();
  private categoryIndex: Map<string, Set<string>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();
  private validationCache: Map<string, EvidenceValidationResult> = new Map();
  private collectionIntervals: Map<EvidenceSource, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;
  private statistics: EvidenceStatistics;

  constructor(config?: Partial<EvidenceCollectionConfig>) {
    super();

    this.config = this.createDefaultConfig(config);
    this.statistics = this.createEmptyStatistics();

    // Initialize indexes
    this.initializeIndexes();

    console.log('[EVIDENCE-RISK] Evidence Collection System initialized');
  }

  /**
   * Create default configuration
   */
  private createDefaultConfig(config?: Partial<EvidenceCollectionConfig>): EvidenceCollectionConfig {
    const defaultConfig: EvidenceCollectionConfig = {
      sources: {
        system_health: {
          enabled: true,
          priority: 1,
          collectionInterval: 30000, // 30 seconds
          maxBatchSize: 100
        },
        incident_history: {
          enabled: true,
          priority: 2,
          collectionInterval: 60000, // 1 minute
          maxBatchSize: 50
        },
        performance_metrics: {
          enabled: true,
          priority: 3,
          collectionInterval: 15000, // 15 seconds
          maxBatchSize: 200
        },
        security_events: {
          enabled: true,
          priority: 1,
          collectionInterval: 10000, // 10 seconds
          maxBatchSize: 50
        },
        deployment_outcomes: {
          enabled: true,
          priority: 4,
          collectionInterval: 120000, // 2 minutes
          maxBatchSize: 30
        },
        user_feedback: {
          enabled: true,
          priority: 5,
          collectionInterval: 300000, // 5 minutes
          maxBatchSize: 100
        },
        external_signals: {
          enabled: true,
          priority: 6,
          collectionInterval: 600000, // 10 minutes
          maxBatchSize: 50
        }
      },
      validation: {
        enabled: true,
        strictMode: false,
        qualityThreshold: 70,
        confidenceThreshold: 0.6,
        enableChecksum: true,
        enableCrossValidation: true,
        maxValidationRetries: 3
      },
      storage: {
        enabled: true,
        path: path.join(process.cwd(), '.goalie', 'evidence'),
        maxRetentionDays: 90,
        compressionEnabled: true,
        encryptionEnabled: false,
        backupEnabled: true,
        backupIntervalMs: 3600000 // 1 hour
      },
      performance: {
        maxConcurrentCollections: 5,
        collectionTimeoutMs: 30000,
        enableCaching: true,
        cacheTtlMs: 300000 // 5 minutes
      }
    };

    return { ...defaultConfig, ...config };
  }

  /**
   * Create empty statistics
   */
  private createEmptyStatistics(): EvidenceStatistics {
    return {
      totalEvidence: 0,
      bySource: {
        system_health: 0,
        incident_history: 0,
        performance_metrics: 0,
        security_events: 0,
        deployment_outcomes: 0,
        user_feedback: 0,
        external_signals: 0
      },
      byQuality: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        unverified: 0
      },
      byCategory: {},
      averageConfidence: 0,
      validationRate: 0,
      storageSize: 0,
      oldestEvidence: null,
      newestEvidence: null
    };
  }

  /**
   * Initialize indexes
   */
  private initializeIndexes(): void {
    for (const source of Object.keys(this.config.sources) as EvidenceSource[]) {
      this.evidenceIndex.set(source, new Set());
    }
  }

  /**
   * Start evidence collection
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[EVIDENCE-RISK] Evidence collection already running');
      return;
    }

    this.isRunning = true;
    console.log('[EVIDENCE-RISK] Starting evidence collection system');

    // Start collection for each enabled source
    for (const [source, sourceConfig] of Object.entries(this.config.sources)) {
      if (sourceConfig?.enabled) {
        await this.startSourceCollection(source as EvidenceSource);
      }
    }

    // Load existing evidence from storage
    if (this.config.storage.enabled) {
      await this.loadEvidenceFromStorage();
    }

    // Start backup interval
    if (this.config.storage.backupEnabled) {
      this.startBackupInterval();
    }

    this.emit('started', { timestamp: new Date() });
  }

  /**
   * Start collection for a specific source
   */
  private async startSourceCollection(source: EvidenceSource): Promise<void> {
    const sourceConfig = this.config.sources[source];
    if (!sourceConfig) {
      return;
    }

    console.log(`[EVIDENCE-RISK] Starting collection for source: ${source}`);

    // Schedule periodic collection
    const interval = setInterval(async () => {
      try {
        await this.collectFromSource(source);
      } catch (error) {
        console.error(`[EVIDENCE-RISK] Collection error for ${source}:`, error);
        this.emit('collectionError', { source, error });
      }
    }, sourceConfig.collectionInterval);

    this.collectionIntervals.set(source, interval);

    // Initial collection
    await this.collectFromSource(source);
  }

  /**
   * Collect evidence from a specific source
   */
  private async collectFromSource(source: EvidenceSource): Promise<void> {
    const startTime = Date.now();

    try {
      const evidence = await this.generateEvidence(source);

      for (const ev of evidence) {
        await this.addEvidence(ev);
      }

      const collectionTime = Date.now() - startTime;
      this.emit('collected', {
        source,
        count: evidence.length,
        collectionTime
      });

      console.log(`[EVIDENCE-RISK] Collected ${evidence.length} evidence from ${source} in ${collectionTime}ms`);
    } catch (error) {
      console.error(`[EVIDENCE-RISK] Failed to collect from ${source}:`, error);
      throw error;
    }
  }

  /**
   * Generate evidence from source (mock implementation)
   * In production, this would connect to actual data sources
   */
  private async generateEvidence(source: EvidenceSource): Promise<Evidence[]> {
    const evidence: Evidence[] = [];
    const sourceConfig = this.config.sources[source];
    const batchSize = sourceConfig?.maxBatchSize || 10;

    for (let i = 0; i < batchSize; i++) {
      const ev: Evidence = {
        id: uuidv4(),
        timestamp: new Date(),
        source,
        sourceId: `${source}-${Date.now()}-${i}`,
        type: this.getEvidenceType(source),
        category: this.getEvidenceCategory(source),
        data: this.generateEvidenceData(source, i),
        quality: 'high',
        validationStatus: 'valid',
        confidence: 0.8 + Math.random() * 0.2,
        tags: this.generateEvidenceTags(source),
        relatedEvidenceIds: [],
        metadata: {
          collector: 'evidence-collection-system',
          collectionMethod: 'automated',
          processingTime: Math.random() * 100
        }
      };

      // Validate evidence
      const validation = await this.validateEvidence(ev);
      ev.quality = this.getQualityFromScore(validation.qualityScore);
      ev.validationStatus = validation.validationStatus;
      ev.confidence = validation.confidence;

      evidence.push(ev);
    }

    return evidence;
  }

  /**
   * Get evidence type for source
   */
  private getEvidenceType(source: EvidenceSource): string {
    const typeMap: Record<EvidenceSource, string> = {
      system_health: 'health_metric',
      incident_history: 'incident_record',
      performance_metrics: 'performance_data',
      security_events: 'security_event',
      deployment_outcomes: 'deployment_result',
      user_feedback: 'feedback_entry',
      external_signals: 'external_signal'
    };
    return typeMap[source];
  }

  /**
   * Get evidence category for source
   */
  private getEvidenceCategory(source: EvidenceSource): string {
    const categoryMap: Record<EvidenceSource, string> = {
      system_health: 'operational',
      incident_history: 'operational',
      performance_metrics: 'performance',
      security_events: 'security',
      deployment_outcomes: 'operational',
      user_feedback: 'quality',
      external_signals: 'market'
    };
    return categoryMap[source];
  }

  /**
   * Generate mock evidence data
   */
  private generateEvidenceData(source: EvidenceSource, index: number): Record<string, any> {
    const dataGenerators: Record<EvidenceSource, () => Record<string, any>> = {
      system_health: () => ({
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        disk: Math.random() * 100,
        network: Math.random() * 100,
        uptime: Math.random() * 10000
      }),
      incident_history: () => ({
        severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
        component: ['agentdb', 'mcp', 'governance', 'monitoring'][Math.floor(Math.random() * 4)],
        description: `Incident ${index}`,
        resolved: Math.random() > 0.5
      }),
      performance_metrics: () => ({
        responseTime: Math.random() * 1000,
        throughput: Math.random() * 1000,
        errorRate: Math.random() * 10,
        latency: Math.random() * 500
      }),
      security_events: () => ({
        eventType: ['authentication', 'authorization', 'data_access'][Math.floor(Math.random() * 3)],
        severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
        sourceIp: `192.168.1.${Math.floor(Math.random() * 255)}`,
        description: `Security event ${index}`
      }),
      deployment_outcomes: () => ({
        status: ['success', 'failure', 'partial'][Math.floor(Math.random() * 3)],
        duration: Math.random() * 600,
        rollback: Math.random() > 0.8,
        environment: ['production', 'staging', 'development'][Math.floor(Math.random() * 3)]
      }),
      user_feedback: () => ({
        rating: Math.floor(Math.random() * 5) + 1,
        category: ['bug', 'feature', 'improvement', 'question'][Math.floor(Math.random() * 4)],
        sentiment: ['positive', 'neutral', 'negative'][Math.floor(Math.random() * 3)],
        text: `Feedback ${index}`
      }),
      external_signals: () => ({
        signalType: ['market', 'competitor', 'trend'][Math.floor(Math.random() * 3)],
        impact: Math.random() * 100,
        confidence: Math.random(),
        source: 'external-api'
      })
    };

    return dataGenerators[source]();
  }

  /**
   * Generate evidence tags
   */
  private generateEvidenceTags(source: EvidenceSource): string[] {
    const tagSets: Record<EvidenceSource, string[]> = {
      system_health: ['health', 'metrics', 'operational'],
      incident_history: ['incident', 'operational', 'history'],
      performance_metrics: ['performance', 'metrics', 'latency'],
      security_events: ['security', 'event', 'audit'],
      deployment_outcomes: ['deployment', 'release', 'operational'],
      user_feedback: ['feedback', 'user', 'quality'],
      external_signals: ['external', 'market', 'signal']
    };
    return tagSets[source];
  }

  /**
   * Add evidence to store
   */
  public async addEvidence(evidence: Evidence): Promise<Evidence> {
    // Validate evidence
    const validation = await this.validateEvidence(evidence);
    evidence.quality = this.getQualityFromScore(validation.qualityScore);
    evidence.validationStatus = validation.validationStatus;
    evidence.confidence = validation.confidence;

    // Add to store
    this.evidenceStore.set(evidence.id, evidence);

    // Update indexes
    this.updateIndexes(evidence);

    // Update statistics
    this.updateStatistics(evidence);

    // Emit event
    this.emit('evidenceAdded', { evidence, validation });

    // Store to disk if enabled
    if (this.config.storage.enabled) {
      await this.storeEvidence(evidence);
    }

    return evidence;
  }

  /**
   * Validate evidence
   */
  public async validateEvidence(evidence: Evidence): Promise<EvidenceValidationResult> {
    // Check cache first
    if (this.config.performance.enableCaching && this.validationCache.has(evidence.id)) {
      return this.validationCache.get(evidence.id)!;
    }

    const result: EvidenceValidationResult = {
      evidenceId: evidence.id,
      isValid: true,
      validationStatus: 'valid',
      qualityScore: 100,
      confidence: evidence.confidence,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // Validate required fields
    const requiredFields = ['id', 'timestamp', 'source', 'type', 'data'];
    for (const field of requiredFields) {
      if (!evidence[field as keyof Evidence]) {
        result.errors.push(`Missing required field: ${field}`);
        result.isValid = false;
        result.validationStatus = 'invalid';
        result.qualityScore -= 20;
      }
    }

    // Validate timestamp
    if (evidence.timestamp > new Date()) {
      result.errors.push('Timestamp is in the future');
      result.isValid = false;
      result.validationStatus = 'invalid';
      result.qualityScore -= 15;
    }

    // Validate confidence
    if (evidence.confidence < 0 || evidence.confidence > 1) {
      result.errors.push('Confidence must be between 0 and 1');
      result.isValid = false;
      result.validationStatus = 'invalid';
      result.qualityScore -= 10;
    }

    // Validate data structure
    if (!evidence.data || Object.keys(evidence.data).length === 0) {
      result.warnings.push('Evidence data is empty');
      result.qualityScore -= 10;
      result.validationStatus = 'partial';
    }

    // Cross-validation if enabled
    if (this.config.validation.enableCrossValidation && evidence.relatedEvidenceIds.length > 0) {
      const relatedValid = evidence.relatedEvidenceIds.filter(id => {
        const related = this.evidenceStore.get(id);
        return related && related.validationStatus === 'valid';
      });

      if (relatedValid.length < evidence.relatedEvidenceIds.length / 2) {
        result.warnings.push('Many related evidence items are invalid');
        result.qualityScore -= 15;
        result.validationStatus = 'partial';
      }
    }

    // Apply quality threshold
    if (result.qualityScore < this.config.validation.qualityThreshold) {
      result.isValid = false;
      result.validationStatus = 'invalid';
    }

    // Apply confidence threshold
    if (result.confidence < this.config.validation.confidenceThreshold) {
      result.warnings.push('Confidence below threshold');
      result.qualityScore -= 10;
      if (result.validationStatus === 'valid') {
        result.validationStatus = 'partial';
      }
    }

    // Generate suggestions
    if (result.errors.length > 0) {
      result.suggestions.push('Review and fix validation errors');
    }
    if (result.warnings.length > 0) {
      result.suggestions.push('Consider addressing warnings for better quality');
    }

    // Cache result
    if (this.config.performance.enableCaching) {
      this.validationCache.set(evidence.id, result);
    }

    return result;
  }

  /**
   * Get quality from score
   */
  private getQualityFromScore(score: number): EvidenceQuality {
    if (score >= 90) return 'critical';
    if (score >= 75) return 'high';
    if (score >= 60) return 'medium';
    if (score >= 40) return 'low';
    return 'unverified';
  }

  /**
   * Update indexes
   */
  private updateIndexes(evidence: Evidence): void {
    // Source index
    const sourceSet = this.evidenceIndex.get(evidence.source);
    if (sourceSet) {
      sourceSet.add(evidence.id);
    }

    // Category index
    if (!this.categoryIndex.has(evidence.category)) {
      this.categoryIndex.set(evidence.category, new Set());
    }
    this.categoryIndex.get(evidence.category)!.add(evidence.id);

    // Tag index
    for (const tag of evidence.tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(evidence.id);
    }
  }

  /**
   * Update statistics
   */
  private updateStatistics(evidence: Evidence): void {
    this.statistics.totalEvidence++;
    this.statistics.bySource[evidence.source]++;
    this.statistics.byQuality[evidence.quality]++;

    if (!this.statistics.byCategory[evidence.category]) {
      this.statistics.byCategory[evidence.category] = 0;
    }
    this.statistics.byCategory[evidence.category]++;

    // Update average confidence
    const totalConfidence = this.statistics.averageConfidence * (this.statistics.totalEvidence - 1);
    this.statistics.averageConfidence = (totalConfidence + evidence.confidence) / this.statistics.totalEvidence;

    // Update validation rate
    const validCount = this.statistics.byQuality.critical +
                     this.statistics.byQuality.high +
                     this.statistics.byQuality.medium;
    this.statistics.validationRate = validCount / this.statistics.totalEvidence;

    // Update timestamps
    if (!this.statistics.oldestEvidence || evidence.timestamp < this.statistics.oldestEvidence) {
      this.statistics.oldestEvidence = evidence.timestamp;
    }
    if (!this.statistics.newestEvidence || evidence.timestamp > this.statistics.newestEvidence) {
      this.statistics.newestEvidence = evidence.timestamp;
    }
  }

  /**
   * Store evidence to disk
   */
  private async storeEvidence(evidence: Evidence): Promise<void> {
    try {
      const storagePath = this.config.storage.path;
      await fs.mkdir(storagePath, { recursive: true });

      const filePath = path.join(storagePath, `${evidence.source}.jsonl`);
      const line = JSON.stringify(evidence) + '\n';

      await fs.appendFile(filePath, line);

      this.statistics.storageSize += line.length;
    } catch (error) {
      console.error('[EVIDENCE-RISK] Failed to store evidence:', error);
    }
  }

  /**
   * Load evidence from storage
   */
  private async loadEvidenceFromStorage(): Promise<void> {
    try {
      const storagePath = this.config.storage.path;
      const files = await fs.readdir(storagePath);

      for (const file of files) {
        if (file.endsWith('.jsonl')) {
          const filePath = path.join(storagePath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const lines = content.trim().split('\n');

          for (const line of lines) {
            try {
              const evidence: Evidence = JSON.parse(line);
              this.evidenceStore.set(evidence.id, evidence);
              this.updateIndexes(evidence);
              this.updateStatistics(evidence);
            } catch (error) {
              console.error('[EVIDENCE-RISK] Failed to parse evidence line:', error);
            }
          }
        }
      }

      console.log(`[EVIDENCE-RISK] Loaded ${this.evidenceStore.size} evidence from storage`);
    } catch (error) {
      console.error('[EVIDENCE-RISK] Failed to load evidence from storage:', error);
    }
  }

  /**
   * Start backup interval
   */
  private startBackupInterval(): void {
    setInterval(async () => {
      await this.createBackup();
    }, this.config.storage.backupIntervalMs);
  }

  /**
   * Create backup
   */
  private async createBackup(): Promise<void> {
    try {
      const backupPath = path.join(this.config.storage.path, 'backups');
      await fs.mkdir(backupPath, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupPath, `evidence-backup-${timestamp}.json`);

      const backupData = {
        timestamp: new Date().toISOString(),
        evidenceCount: this.evidenceStore.size,
        statistics: this.statistics,
        evidence: Array.from(this.evidenceStore.values())
      };

      await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2));

      console.log(`[EVIDENCE-RISK] Created backup: ${backupFile}`);
      this.emit('backupCreated', { path: backupFile, count: this.evidenceStore.size });
    } catch (error) {
      console.error('[EVIDENCE-RISK] Failed to create backup:', error);
    }
  }

  /**
   * Collect evidence with filters
   */
  public async collect(request: EvidenceCollectionRequest): Promise<EvidenceCollectionResult> {
    const startTime = Date.now();
    const evidence: Evidence[] = [];

    for (const source of request.sources) {
      const sourceSet = this.evidenceIndex.get(source);
      if (sourceSet) {
        for (const id of sourceSet) {
          const ev = this.evidenceStore.get(id);
          if (ev && this.matchesFilters(ev, request.filters)) {
            evidence.push(ev);
          }
        }
      }
    }

    // Apply max results limit
    const filteredEvidence = request.maxResults
      ? evidence.slice(0, request.maxResults)
      : evidence;

    const collectionTime = Date.now() - startTime;

    // Generate source statistics
    const sourceStats = request.sources.map(source => {
      const sourceEvidence = filteredEvidence.filter(e => e.source === source);
      return {
        source,
        count: sourceEvidence.length,
        quality: {
          critical: sourceEvidence.filter(e => e.quality === 'critical').length,
          high: sourceEvidence.filter(e => e.quality === 'high').length,
          medium: sourceEvidence.filter(e => e.quality === 'medium').length,
          low: sourceEvidence.filter(e => e.quality === 'low').length,
          unverified: sourceEvidence.filter(e => e.quality === 'unverified').length
        }
      };
    });

    return {
      evidence: filteredEvidence,
      totalCount: evidence.length,
      filteredCount: filteredEvidence.length,
      collectionTime,
      sources: sourceStats
    };
  }

  /**
   * Check if evidence matches filters
   */
  private matchesFilters(evidence: Evidence, filters?: EvidenceCollectionRequest['filters']): boolean {
    if (!filters) return true;

    if (filters.startTime && evidence.timestamp < filters.startTime) {
      return false;
    }

    if (filters.endTime && evidence.timestamp > filters.endTime) {
      return false;
    }

    if (filters.categories && !filters.categories.includes(evidence.category)) {
      return false;
    }

    if (filters.minQuality) {
      const qualityOrder: EvidenceQuality[] = ['critical', 'high', 'medium', 'low', 'unverified'];
      const evidenceLevel = qualityOrder.indexOf(evidence.quality);
      const minLevel = qualityOrder.indexOf(filters.minQuality);
      if (evidenceLevel > minLevel) {
        return false;
      }
    }

    if (filters.tags && !filters.tags.some(tag => evidence.tags.includes(tag))) {
      return false;
    }

    return true;
  }

  /**
   * Get evidence by ID
   */
  public getEvidence(id: string): Evidence | undefined {
    return this.evidenceStore.get(id);
  }

  /**
   * Get evidence by source
   */
  public getEvidenceBySource(source: EvidenceSource): Evidence[] {
    const sourceSet = this.evidenceIndex.get(source);
    if (!sourceSet) return [];

    return Array.from(sourceSet)
      .map(id => this.evidenceStore.get(id))
      .filter((e): e is Evidence => e !== undefined);
  }

  /**
   * Get evidence by category
   */
  public getEvidenceByCategory(category: string): Evidence[] {
    const categorySet = this.categoryIndex.get(category);
    if (!categorySet) return [];

    return Array.from(categorySet)
      .map(id => this.evidenceStore.get(id))
      .filter((e): e is Evidence => e !== undefined);
  }

  /**
   * Get evidence by tag
   */
  public getEvidenceByTag(tag: string): Evidence[] {
    const tagSet = this.tagIndex.get(tag);
    if (!tagSet) return [];

    return Array.from(tagSet)
      .map(id => this.evidenceStore.get(id))
      .filter((e): e is Evidence => e !== undefined);
  }

  /**
   * Get statistics
   */
  public getStatistics(): EvidenceStatistics {
    return { ...this.statistics };
  }

  /**
   * Stop evidence collection
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Clear collection intervals
    for (const interval of this.collectionIntervals.values()) {
      clearInterval(interval);
    }
    this.collectionIntervals.clear();

    // Create final backup
    if (this.config.storage.enabled) {
      await this.createBackup();
    }

    this.emit('stopped', { timestamp: new Date() });
    console.log('[EVIDENCE-RISK] Evidence collection system stopped');
  }

  /**
   * Clear all evidence
   */
  public async clear(): Promise<void> {
    this.evidenceStore.clear();
    this.evidenceIndex.clear();
    this.categoryIndex.clear();
    this.tagIndex.clear();
    this.validationCache.clear();
    this.statistics = this.createEmptyStatistics();

    this.emit('cleared', { timestamp: new Date() });
    console.log('[EVIDENCE-RISK] All evidence cleared');
  }

  /**
   * Get configuration
   */
  public getConfig(): EvidenceCollectionConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<EvidenceCollectionConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('configUpdated', { config: this.config });
    console.log('[EVIDENCE-RISK] Configuration updated');
  }
}

/**
 * Create default evidence collection system
 */
export function createDefaultEvidenceCollectionSystem(): EvidenceCollectionSystem {
  return new EvidenceCollectionSystem();
}

/**
 * Create evidence collection system from config
 */
export function createEvidenceCollectionSystemFromConfig(
  config: Partial<EvidenceCollectionConfig>
): EvidenceCollectionSystem {
  return new EvidenceCollectionSystem(config);
}
