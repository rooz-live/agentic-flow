/**
 * Telemetry Coverage Analyzer
 * 
 * Implements telemetry coverage analysis for runtime pattern compliance
 * with comprehensive metrics collection and analysis
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  TierLevel,
  TelemetryCoverage,
  CoverageData,
  PatternMetricsIntegration,
  CoverageError
} from './types';

export interface TelemetryConfig {
  patternMetricsPath: string;
  enableRealTimeAnalysis: boolean;
  analysisWindow: number; // in hours
  minimumSampleSize: number;
  coverageThresholds: {
    excellent: number;
    good: number;
    acceptable: number;
    poor: number;
  };
  customMetrics: string[];
}

export interface RuntimePattern {
  id: string;
  name: string;
  type: string;
  circleId: string;
  tierLevel: TierLevel;
  executionCount: number;
  successCount: number;
  failureCount: number;
  averageDuration: number;
  lastExecution: Date;
  telemetryData: Record<string, any>;
  requiredTelemetry: string[];
  capturedTelemetry: string[];
}

export interface TelemetryMetrics {
  totalPatterns: number;
  patternsWithFullCoverage: number;
  averageCoverage: number;
  coverageByTier: Record<TierLevel, number>;
  coverageByCircle: Record<string, number>;
  missingTelemetryByType: Record<string, string[]>;
  complianceTrends: Array<{
    date: Date;
    coverage: number;
    compliance: number;
  }>;
}

export class TelemetryCoverageAnalyzer extends EventEmitter {
  private config: TelemetryConfig;
  private patternCache: Map<string, RuntimePattern> = new Map();
  private lastAnalysis: Date = new Date();
  private isInitialized: boolean = false;

  constructor(config: Partial<TelemetryConfig> = {}) {
    super();
    this.config = {
      patternMetricsPath: '.goalie/pattern_metrics.jsonl',
      enableRealTimeAnalysis: true,
      analysisWindow: 24, // 24 hours
      minimumSampleSize: 5,
      coverageThresholds: {
        excellent: 95,
        good: 85,
        acceptable: 70,
        poor: 50
      },
      customMetrics: [],
      ...config
    };
  }

  /**
   * Initialize telemetry analyzer
   */
  public async initialize(): Promise<void> {
    try {
      await this.loadPatternMetrics();
      this.isInitialized = true;
      this.emit('initialized', { patternCount: this.patternCache.size });
    } catch (error) {
      const initError = new CoverageError(
        'INITIALIZATION_FAILED',
        'Failed to initialize telemetry coverage analyzer',
        { error: error instanceof Error ? error.message : String(error) }
      );
      this.emit('initializationError', initError);
      throw initError;
    }
  }

  /**
   * Load pattern metrics from file
   */
  private async loadPatternMetrics(): Promise<void> {
    try {
      const filePath = path.resolve(this.config.patternMetricsPath);
      const exists = await fs.access(filePath).then(() => true).catch(() => false);

      if (!exists) {
        console.log(`[TELEMETRY] Pattern metrics file not found: ${filePath}`);
        return;
      }

      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n');

      for (const line of lines) {
        if (line.trim() === '') continue;

        try {
          const patternData = JSON.parse(line);
          const pattern = this.parsePatternData(patternData);
          if (pattern) {
            this.patternCache.set(pattern.id, pattern);
          }
        } catch (parseError) {
          console.warn(`[TELEMETRY] Failed to parse pattern line: ${line}`, parseError);
        }
      }

      console.log(`[TELEMETRY] Loaded ${this.patternCache.size} patterns from metrics file`);
    } catch (error) {
      throw new CoverageError(
        'LOAD_METRICS_FAILED',
        'Failed to load pattern metrics',
        { 
          filePath: this.config.patternMetricsPath,
          error: error instanceof Error ? error.message : String(error)
        }
      );
    }
  }

  /**
   * Parse pattern data from metrics file
   */
  private parsePatternData(data: any): RuntimePattern | null {
    try {
      // Extract required telemetry based on tier level
      const requiredTelemetry = this.getRequiredTelemetryForTier(data.tier || 'flexible');
      
      // Extract captured telemetry from the pattern data
      const capturedTelemetry = this.extractCapturedTelemetry(data);

      return {
        id: data.id || this.generateId(),
        name: data.pattern || 'Unknown Pattern',
        type: data.pattern || 'unknown',
        circleId: data.circle || 'unknown',
        tierLevel: data.tier || 'flexible',
        executionCount: 1, // Each line represents one execution
        successCount: data.status === 'completed' ? 1 : 0,
        failureCount: data.status === 'failed' ? 1 : 0,
        averageDuration: data.duration || 0,
        lastExecution: new Date(data.timestamp),
        telemetryData: data,
        requiredTelemetry,
        capturedTelemetry
      };
    } catch (error) {
      console.warn(`[TELEMETRY] Failed to parse pattern data:`, data, error);
      return null;
    }
  }

  /**
   * Get required telemetry for tier level
   */
  private getRequiredTelemetryForTier(tierLevel: TierLevel): string[] {
    const baseTelemetry = [
      'timestamp',
      'pattern',
      'status',
      'circle',
      'duration'
    ];

    switch (tierLevel) {
      case 'high-structure':
        return [
          ...baseTelemetry,
          'tags',
          'economic_impact',
          'wsjf_score',
          'cost_of_delay',
          'validation_results',
          'quality_metrics',
          'performance_metrics',
          'risk_assessment',
          'stakeholder_feedback'
        ];
      case 'medium-structure':
        return [
          ...baseTelemetry,
          'tags',
          'economic_impact',
          'wsjf_score',
          'validation_results',
          'quality_metrics'
        ];
      case 'flexible':
        return [
          ...baseTelemetry,
          'tags',
          'economic_impact'
        ];
      default:
        return baseTelemetry;
    }
  }

  /**
   * Extract captured telemetry from pattern data
   */
  private extractCapturedTelemetry(data: any): string[] {
    const captured: string[] = [];
    
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && data[key] !== null) {
        captured.push(key);
      }
    });

    return [...new Set(captured)]; // Remove duplicates
  }

  /**
   * Analyze telemetry coverage for a specific circle
   */
  public async analyzeCircleCoverage(
    circleId: string,
    tierLevel?: TierLevel
  ): Promise<TelemetryCoverage[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const circlePatterns = Array.from(this.patternCache.values())
        .filter(pattern => pattern.circleId === circleId)
        .filter(pattern => !tierLevel || pattern.tierLevel === tierLevel);

      const coverageByPattern: TelemetryCoverage[] = [];

      for (const pattern of circlePatterns) {
        const coverage = await this.analyzePatternCoverage(pattern);
        coverageByPattern.push(coverage);
      }

      this.emit('circleCoverageAnalyzed', { circleId, coverageCount: coverageByPattern.length });
      return coverageByPattern;

    } catch (error) {
      const analysisError = new CoverageError(
        'CIRCLE_COVERAGE_ANALYSIS_FAILED',
        `Failed to analyze coverage for circle: ${circleId}`,
        { 
          circleId,
          tierLevel,
          error: error instanceof Error ? error.message : String(error)
        }
      );
      this.emit('analysisError', analysisError);
      throw analysisError;
    }
  }

  /**
   * Analyze telemetry coverage for a specific pattern
   */
  private async analyzePatternCoverage(pattern: RuntimePattern): Promise<TelemetryCoverage> {
    const requiredTelemetry = pattern.requiredTelemetry;
    const capturedTelemetry = pattern.capturedTelemetry;
    
    // Calculate coverage metrics
    const telemetryCaptured = capturedTelemetry.length;
    const requiredTelemetryCount = requiredTelemetry.length;
    const coveragePercentage = (telemetryCaptured / requiredTelemetryCount) * 100;
    
    const missingTelemetry = requiredTelemetry.filter(t => !capturedTelemetry.includes(t));

    // Calculate compliance metrics
    const patternCompliance = this.calculatePatternCompliance(pattern);
    const runtimeCompliance = this.calculateRuntimeCompliance(pattern);
    const schemaCompliance = this.calculateSchemaCompliance(pattern);

    return {
      patternType: pattern.type,
      circleId: pattern.circleId,
      tierLevel: pattern.tierLevel,
      executionCount: pattern.executionCount,
      successCount: pattern.successCount,
      failureCount: pattern.failureCount,
      averageDuration: pattern.averageDuration,
      coverageMetrics: {
        telemetryCaptured,
        requiredTelemetry: requiredTelemetryCount,
        coveragePercentage,
        missingTelemetry
      },
      complianceMetrics: {
        patternCompliance,
        runtimeCompliance,
        schemaCompliance
      }
    };
  }

  /**
   * Calculate pattern compliance score
   */
  private calculatePatternCompliance(pattern: RuntimePattern): number {
    const successRate = pattern.executionCount > 0 
      ? (pattern.successCount / pattern.executionCount) * 100 
      : 0;

    // Apply tier-specific thresholds
    const thresholds = this.config.coverageThresholds;
    if (successRate >= thresholds.excellent) return 95;
    if (successRate >= thresholds.good) return 85;
    if (successRate >= thresholds.acceptable) return 70;
    if (successRate >= thresholds.poor) return 50;
    return 25;
  }

  /**
   * Calculate runtime compliance score
   */
  private calculateRuntimeCompliance(pattern: RuntimePattern): number {
    // Based on telemetry coverage percentage
    const coveragePercent = (pattern.capturedTelemetry.length / pattern.requiredTelemetry.length) * 100;
    
    // Factor in execution frequency and recency
    const timeSinceLastExecution = Date.now() - pattern.lastExecution.getTime();
    const recencyFactor = Math.max(0, 1 - (timeSinceLastExecution / (7 * 24 * 60 * 60 * 1000))); // 7 days
    
    return coveragePercent * 0.8 + (recencyFactor * 100) * 0.2;
  }

  /**
   * Calculate schema compliance score
   */
  private calculateSchemaCompliance(pattern: RuntimePattern): number {
    // Check if required fields are present and properly formatted
    const requiredFields = ['id', 'name', 'type', 'circleId', 'tierLevel'];
    const presentFields = requiredFields.filter(field => 
      pattern.telemetryData[field] !== undefined && 
      pattern.telemetryData[field] !== null
    );

    return (presentFields.length / requiredFields.length) * 100;
  }

  /**
   * Generate comprehensive telemetry metrics
   */
  public async generateTelemetryMetrics(
    circleIds?: string[],
    tierLevels?: TierLevel[]
  ): Promise<TelemetryMetrics> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      let patterns = Array.from(this.patternCache.values());

      // Apply filters
      if (circleIds) {
        patterns = patterns.filter(p => circleIds.includes(p.circleId));
      }
      if (tierLevels) {
        patterns = patterns.filter(p => tierLevels.includes(p.tierLevel));
      }

      const totalPatterns = patterns.length;
      const patternsWithFullCoverage = patterns.filter(p => 
        (p.capturedTelemetry.length / p.requiredTelemetry.length) >= 0.95
      ).length;

      const averageCoverage = totalPatterns > 0
        ? patterns.reduce((sum, p) => sum + (p.capturedTelemetry.length / p.requiredTelemetry.length), 0) / totalPatterns * 100
        : 0;

      // Coverage by tier
      const coverageByTier: Record<string, number> = {};
      ['high-structure', 'medium-structure', 'flexible'].forEach(tier => {
        const tierPatterns = patterns.filter(p => p.tierLevel === tier);
        if (tierPatterns.length > 0) {
          coverageByTier[tier] = tierPatterns.reduce((sum, p) => 
            sum + (p.capturedTelemetry.length / p.requiredTelemetry.length), 0) / tierPatterns.length * 100;
        } else {
          coverageByTier[tier] = 0;
        }
      });

      // Coverage by circle
      const coverageByCircle: Record<string, number> = {};
      const circleGroups = patterns.reduce((groups, p) => {
        if (!groups[p.circleId]) groups[p.circleId] = [];
        groups[p.circleId].push(p);
        return groups;
      }, {} as Record<string, RuntimePattern[]>);

      Object.entries(circleGroups).forEach(([circleId, circlePatterns]) => {
        coverageByCircle[circleId] = circlePatterns.reduce((sum, p) => 
          sum + (p.capturedTelemetry.length / p.requiredTelemetry.length), 0) / circlePatterns.length * 100;
      });

      // Missing telemetry by type
      const missingTelemetryByType: Record<string, string[]> = {};
      patterns.forEach(pattern => {
        const missing = pattern.requiredTelemetry.filter(t => !pattern.capturedTelemetry.includes(t));
        if (missing.length > 0) {
          if (!missingTelemetryByType[pattern.type]) {
            missingTelemetryByType[pattern.type] = [];
          }
          missingTelemetryByType[pattern.type].push(...missing);
        }
      });

      // Remove duplicates
      Object.keys(missingTelemetryByType).forEach(type => {
        missingTelemetryByType[type] = [...new Set(missingTelemetryByType[type])];
      });

      // Generate compliance trends (mock data for now)
      const complianceTrends = this.generateComplianceTrends(patterns);

      const metrics: TelemetryMetrics = {
        totalPatterns,
        patternsWithFullCoverage,
        averageCoverage,
        coverageByTier: coverageByTier as Record<TierLevel, number>,
        coverageByCircle,
        missingTelemetryByType,
        complianceTrends
      };

      this.emit('metricsGenerated', metrics);
      return metrics;

    } catch (error) {
      const metricsError = new CoverageError(
        'METRICS_GENERATION_FAILED',
        'Failed to generate telemetry metrics',
        { 
          circleIds,
          tierLevels,
          error: error instanceof Error ? error.message : String(error)
        }
      );
      this.emit('metricsError', metricsError);
      throw metricsError;
    }
  }

  /**
   * Generate compliance trends (mock implementation)
   */
  private generateComplianceTrends(patterns: RuntimePattern[]): Array<{
    date: Date;
    coverage: number;
    compliance: number;
  }> {
    const trends: Array<{ date: Date; coverage: number; compliance: number; }> = [];
    const now = new Date();

    // Generate trend data for the last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      
      // Simulate trend data with some randomness
      const baseCoverage = 75;
      const baseCompliance = 80;
      const variation = Math.sin(i / 5) * 10 + Math.random() * 10 - 5;
      
      trends.push({
        date,
        coverage: Math.max(0, Math.min(100, baseCoverage + variation)),
        compliance: Math.max(0, Math.min(100, baseCompliance + variation))
      });
    }

    return trends;
  }

  /**
   * Add or update pattern telemetry
   */
  public async addPatternTelemetry(telemetryData: any): Promise<void> {
    try {
      const pattern = this.parsePatternData(telemetryData);
      if (!pattern) {
        throw new Error('Invalid telemetry data format');
      }

      // Update existing pattern or add new one
      const existing = this.patternCache.get(pattern.id);
      if (existing) {
        existing.executionCount += pattern.executionCount;
        existing.successCount += pattern.successCount;
        existing.failureCount += pattern.failureCount;
        existing.averageDuration = (existing.averageDuration + pattern.averageDuration) / 2;
        existing.lastExecution = pattern.lastExecution;
        existing.capturedTelemetry = [...new Set([...existing.capturedTelemetry, ...pattern.capturedTelemetry])];
      } else {
        this.patternCache.set(pattern.id, pattern);
      }

      this.emit('telemetryAdded', { patternId: pattern.id, circleId: pattern.circleId });

      // Persist to file if enabled
      if (this.config.enableRealTimeAnalysis) {
        await this.persistTelemetryData(telemetryData);
      }

    } catch (error) {
      const addError = new CoverageError(
        'ADD_TELEMETRY_FAILED',
        'Failed to add pattern telemetry',
        { 
          telemetryData,
          error: error instanceof Error ? error.message : String(error)
        }
      );
      this.emit('addError', addError);
      throw addError;
    }
  }

  /**
   * Persist telemetry data to file
   */
  private async persistTelemetryData(telemetryData: any): Promise<void> {
    try {
      const filePath = path.resolve(this.config.patternMetricsPath);
      const line = JSON.stringify(telemetryData) + '\n';
      await fs.appendFile(filePath, line, 'utf-8');
    } catch (error) {
      console.warn(`[TELEMETRY] Failed to persist telemetry data:`, error);
    }
  }

  /**
   * Get coverage recommendations
   */
  public async getCoverageRecommendations(
    circleId?: string,
    tierLevel?: TierLevel
  ): Promise<string[]> {
    const metrics = await this.generateTelemetryMetrics(
      circleId ? [circleId] : undefined,
      tierLevel ? [tierLevel] : undefined
    );

    const recommendations: string[] = [];

    // Overall coverage recommendations
    if (metrics.averageCoverage < this.config.coverageThresholds.acceptable) {
      recommendations.push(`Overall telemetry coverage (${metrics.averageCoverage.toFixed(1)}%) is below acceptable threshold. Implement comprehensive telemetry collection.`);
    }

    // Tier-specific recommendations
    Object.entries(metrics.coverageByTier).forEach(([tier, coverage]) => {
      if (coverage < this.config.coverageThresholds.good) {
        recommendations.push(`${tier} tier coverage (${coverage.toFixed(1)}%) needs improvement. Focus on tier-specific telemetry requirements.`);
      }
    });

    // Circle-specific recommendations
    Object.entries(metrics.coverageByCircle).forEach(([circle, coverage]) => {
      if (coverage < this.config.coverageThresholds.acceptable) {
        recommendations.push(`${circle} circle coverage (${coverage.toFixed(1)}%) requires attention. Review telemetry collection processes.`);
      }
    });

    // Missing telemetry recommendations
    Object.entries(metrics.missingTelemetryByType).forEach(([type, missing]) => {
      if (missing.length > 0) {
        recommendations.push(`${type} patterns are missing critical telemetry: ${missing.join(', ')}. Implement collection mechanisms.`);
      }
    });

    // Sample size recommendations
    if (metrics.totalPatterns < this.config.minimumSampleSize) {
      recommendations.push(`Insufficient sample size (${metrics.totalPatterns}). Collect more pattern execution data for reliable analysis.`);
    }

    return recommendations;
  }

  /**
   * Export telemetry analysis to JSON
   */
  public async exportAnalysis(
    circleId?: string,
    tierLevel?: TierLevel
  ): Promise<string> {
    const coverage = await this.analyzeCircleCoverage(
      circleId || 'all',
      tierLevel
    );
    const metrics = await this.generateTelemetryMetrics(
      circleId ? [circleId] : undefined,
      tierLevel ? [tierLevel] : undefined
    );

    const exportData = {
      timestamp: new Date().toISOString(),
      scope: { circleId, tierLevel },
      coverage,
      metrics,
      recommendations: await this.getCoverageRecommendations(circleId, tierLevel)
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Clear pattern cache
   */
  public clearCache(): void {
    this.patternCache.clear();
    this.emit('cacheCleared');
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<TelemetryConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('configUpdated', this.config);
  }

  /**
   * Get analyzer statistics
   */
  public getStatistics(): {
    cacheSize: number;
    lastAnalysis: Date;
    isInitialized: boolean;
    config: TelemetryConfig;
  } {
    return {
      cacheSize: this.patternCache.size,
      lastAnalysis: this.lastAnalysis,
      isInitialized: this.isInitialized,
      config: this.config
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}