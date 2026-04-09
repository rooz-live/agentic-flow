/**
 * Technical Risk Analysis Component
 * 
 * Implements comprehensive technical risk analysis including security vulnerabilities,
 * performance issues, infrastructure reliability, technology obsolescence, and integration complexity
 */

import { EventEmitter } from 'events';
import {
  Risk,
  RiskSeverity,
  RiskProbability,
  RiskImpactArea,
  RiskAssessmentEvent,
  RiskAssessmentConfig
} from '../core/types';

export interface TechnicalRiskAnalysisRequest {
  systemId: string;
  components?: string[];
  includeSecurityAnalysis: boolean;
  includePerformanceAnalysis: boolean;
  includeInfrastructureAnalysis: boolean;
  includeTechnologyObsolescenceAnalysis: boolean;
  includeIntegrationAnalysis: boolean;
  includeDataIntegrityAnalysis: boolean;
  thresholds?: TechnicalRiskThresholds;
  context?: Record<string, any>;
}

export interface TechnicalRiskThresholds {
  security: {
    vulnerabilityThreshold: number; // 0-100
    complianceThreshold: number; // 0-100
  };
  performance: {
    responseTimeThreshold: number; // in milliseconds
    throughputThreshold: number; // requests per second
    errorRateThreshold: number; // percentage
  };
  infrastructure: {
    availabilityThreshold: number; // percentage (99.9, etc.)
    resourceUtilizationThreshold: number; // percentage
    backupRecoveryThreshold: number; // hours
  };
  technology: {
    endOfLifeThreshold: number; // months until EOL
    supportLevelThreshold: number; // 0-100
  };
  integration: {
    complexityThreshold: number; // 0-100
    dependencyThreshold: number; // number of dependencies
  };
  data: {
    integrityThreshold: number; // 0-100
    availabilityThreshold: number; // percentage
  };
}

export interface TechnicalRiskAnalysisResult {
  systemId: string;
  analysisTimestamp: Date;
  overallRiskScore: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  securityRisks: SecurityRisk[];
  performanceRisks: PerformanceRisk[];
  infrastructureRisks: InfrastructureRisk[];
  technologyObsolescenceRisks: TechnologyObsolescenceRisk[];
  integrationRisks: IntegrationRisk[];
  dataIntegrityRisks: DataIntegrityRisk[];
  recommendations: TechnicalRiskRecommendation[];
  confidence: number; // 0-100
  analysisDuration: number; // in milliseconds
}

export interface SecurityRisk {
  id: string;
  type: 'vulnerability' | 'compliance' | 'access_control' | 'encryption' | 'authentication';
  severity: RiskSeverity;
  probability: RiskProbability;
  description: string;
  affectedComponents: string[];
  cvssScore?: number;
  complianceFramework?: string;
  mitigation: string;
  confidence: number;
}

export interface PerformanceRisk {
  id: string;
  type: 'response_time' | 'throughput' | 'scalability' | 'resource_utilization' | 'memory_leak';
  severity: RiskSeverity;
  probability: RiskProbability;
  description: string;
  affectedComponents: string[];
  currentMetrics: {
    responseTime?: number;
    throughput?: number;
    errorRate?: number;
    resourceUtilization?: number;
  };
  thresholds: {
    responseTime?: number;
    throughput?: number;
    errorRate?: number;
    resourceUtilization?: number;
  };
  mitigation: string;
  confidence: number;
}

export interface InfrastructureRisk {
  id: string;
  type: 'availability' | 'capacity' | 'disaster_recovery' | 'network' | 'storage';
  severity: RiskSeverity;
  probability: RiskProbability;
  description: string;
  affectedComponents: string[];
  currentMetrics: {
    availability?: number;
    resourceUtilization?: number;
    backupRecoveryTime?: number;
  };
  thresholds: {
    availability?: number;
    resourceUtilization?: number;
    backupRecoveryTime?: number;
  };
  mitigation: string;
  confidence: number;
}

export interface TechnologyObsolescenceRisk {
  id: string;
  type: 'end_of_life' | 'deprecated' | 'unsupported' | 'compatibility';
  severity: RiskSeverity;
  probability: RiskProbability;
  description: string;
  affectedComponents: string[];
  technology: {
    name: string;
    version: string;
    endOfLifeDate?: Date;
    supportLevel: number; // 0-100
    lastUpdateDate?: Date;
  };
  mitigation: string;
  confidence: number;
}

export interface IntegrationRisk {
  id: string;
  type: 'api_compatibility' | 'data_format' | 'dependency' | 'version_conflict' | 'latency';
  severity: RiskSeverity;
  probability: RiskProbability;
  description: string;
  affectedComponents: string[];
  integration: {
    source: string;
    target: string;
    protocol: string;
    complexity: number; // 0-100
    dependencies: number;
  };
  mitigation: string;
  confidence: number;
}

export interface DataIntegrityRisk {
  id: string;
  type: 'corruption' | 'loss' | 'inconsistency' | 'unauthorized_access' | 'backup_failure';
  severity: RiskSeverity;
  probability: RiskProbability;
  description: string;
  affectedComponents: string[];
  currentMetrics: {
    integrityScore?: number;
    availability?: number;
    backupSuccessRate?: number;
  };
  thresholds: {
    integrityScore?: number;
    availability?: number;
    backupSuccessRate?: number;
  };
  mitigation: string;
  confidence: number;
}

export interface TechnicalRiskRecommendation {
  id: string;
  category: 'security' | 'performance' | 'infrastructure' | 'technology' | 'integration' | 'data';
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  estimatedEffort: number; // in story points or days
  estimatedCost: number;
  riskReduction: number; // percentage
  dependencies: string[];
  implementationPlan: string[];
}

export class TechnicalRiskAnalyzer extends EventEmitter {
  private config: RiskAssessmentConfig;
  private defaultThresholds: TechnicalRiskThresholds;

  constructor(config: RiskAssessmentConfig) {
    super();
    this.config = config;
    this.defaultThresholds = {
      security: {
        vulnerabilityThreshold: 70,
        complianceThreshold: 80
      },
      performance: {
        responseTimeThreshold: 2000, // 2 seconds
        throughputThreshold: 1000, // 1000 req/s
        errorRateThreshold: 1 // 1%
      },
      infrastructure: {
        availabilityThreshold: 99.9,
        resourceUtilizationThreshold: 80,
        backupRecoveryThreshold: 4 // 4 hours
      },
      technology: {
        endOfLifeThreshold: 12, // 12 months
        supportLevelThreshold: 60
      },
      integration: {
        complexityThreshold: 70,
        dependencyThreshold: 10
      },
      data: {
        integrityThreshold: 95,
        availabilityThreshold: 99.5
      }
    };
  }

  public async analyzeTechnicalRisks(request: TechnicalRiskAnalysisRequest): Promise<TechnicalRiskAnalysisResult> {
    console.log(`[TECHNICAL-RISK-ANALYZER] Analyzing technical risks for system: ${request.systemId}`);
    const startTime = Date.now();

    const thresholds = { ...this.defaultThresholds, ...request.thresholds };
    const results: TechnicalRiskAnalysisResult = {
      systemId: request.systemId,
      analysisTimestamp: new Date(),
      overallRiskScore: 0,
      riskLevel: 'low',
      securityRisks: [],
      performanceRisks: [],
      infrastructureRisks: [],
      technologyObsolescenceRisks: [],
      integrationRisks: [],
      dataIntegrityRisks: [],
      recommendations: [],
      confidence: 0,
      analysisDuration: 0
    };

    try {
      // Security analysis
      if (request.includeSecurityAnalysis) {
        results.securityRisks = await this.analyzeSecurityRisks(request, thresholds);
      }

      // Performance analysis
      if (request.includePerformanceAnalysis) {
        results.performanceRisks = await this.analyzePerformanceRisks(request, thresholds);
      }

      // Infrastructure analysis
      if (request.includeInfrastructureAnalysis) {
        results.infrastructureRisks = await this.analyzeInfrastructureRisks(request, thresholds);
      }

      // Technology obsolescence analysis
      if (request.includeTechnologyObsolescenceAnalysis) {
        results.technologyObsolescenceRisks = await this.analyzeTechnologyObsolescenceRisks(request, thresholds);
      }

      // Integration analysis
      if (request.includeIntegrationAnalysis) {
        results.integrationRisks = await this.analyzeIntegrationRisks(request, thresholds);
      }

      // Data integrity analysis
      if (request.includeDataIntegrityAnalysis) {
        results.dataIntegrityRisks = await this.analyzeDataIntegrityRisks(request, thresholds);
      }

      // Calculate overall risk score and level
      results.overallRiskScore = this.calculateOverallRiskScore(results);
      results.riskLevel = this.determineRiskLevel(results.overallRiskScore);

      // Generate recommendations
      results.recommendations = this.generateTechnicalRiskRecommendations(results, thresholds);

      // Calculate confidence
      results.confidence = this.calculateAnalysisConfidence(results, request);

      results.analysisDuration = Date.now() - startTime;

      // Emit event
      this.emit('technicalRiskAnalysisCompleted', {
        type: 'technical_risk_analysis_completed',
        timestamp: new Date(),
        data: { result: results, request },
        description: `Technical risk analysis completed for system: ${request.systemId}`
      } as RiskAssessmentEvent);

      console.log(`[TECHNICAL-RISK-ANALYZER] Analysis completed in ${results.analysisDuration}ms, Score: ${results.overallRiskScore}`);

      return results;
    } catch (error) {
      console.error(`[TECHNICAL-RISK-ANALYZER] Analysis failed for system ${request.systemId}:`, error);
      throw error;
    }
  }

  private async analyzeSecurityRisks(request: TechnicalRiskAnalysisRequest, thresholds: TechnicalRiskThresholds): Promise<SecurityRisk[]> {
    console.log(`[TECHNICAL-RISK-ANALYZER] Analyzing security risks for system: ${request.systemId}`);
    const risks: SecurityRisk[] = [];

    // Simulate security vulnerability detection
    const vulnerabilityRisk: SecurityRisk = {
      id: this.generateId('sec-risk'),
      type: 'vulnerability',
      severity: 'high',
      probability: 'medium',
      description: 'Potential SQL injection vulnerability in authentication module',
      affectedComponents: ['auth-service', 'user-management'],
      cvssScore: 7.5,
      complianceFramework: 'OWASP Top 10',
      mitigation: 'Implement parameterized queries and input validation',
      confidence: 85
    };
    risks.push(vulnerabilityRisk);

    // Simulate compliance risk
    const complianceRisk: SecurityRisk = {
      id: this.generateId('sec-risk'),
      type: 'compliance',
      severity: 'medium',
      probability: 'low',
      description: 'GDPR compliance gaps in data handling',
      affectedComponents: ['data-processing', 'user-data'],
      complianceFramework: 'GDPR',
      mitigation: 'Update data handling procedures and implement consent management',
      confidence: 75
    };
    risks.push(complianceRisk);

    return risks;
  }

  private async analyzePerformanceRisks(request: TechnicalRiskAnalysisRequest, thresholds: TechnicalRiskThresholds): Promise<PerformanceRisk[]> {
    console.log(`[TECHNICAL-RISK-ANALYZER] Analyzing performance risks for system: ${request.systemId}`);
    const risks: PerformanceRisk[] = [];

    // Simulate response time risk
    const responseTimeRisk: PerformanceRisk = {
      id: this.generateId('perf-risk'),
      type: 'response_time',
      severity: 'medium',
      probability: 'high',
      description: 'API response times exceeding acceptable thresholds during peak load',
      affectedComponents: ['api-gateway', 'order-service'],
      currentMetrics: {
        responseTime: 2500, // 2.5 seconds
        errorRate: 0.5
      },
      thresholds: {
        responseTime: thresholds.performance.responseTimeThreshold,
        errorRate: thresholds.performance.errorRateThreshold
      },
      mitigation: 'Implement caching and optimize database queries',
      confidence: 90
    };
    risks.push(responseTimeRisk);

    // Simulate scalability risk
    const scalabilityRisk: PerformanceRisk = {
      id: this.generateId('perf-risk'),
      type: 'scalability',
      severity: 'high',
      probability: 'medium',
      description: 'System unable to handle projected load increase',
      affectedComponents: ['load-balancer', 'application-servers'],
      currentMetrics: {
        throughput: 800,
        resourceUtilization: 85
      },
      thresholds: {
        throughput: thresholds.performance.throughputThreshold,
        resourceUtilization: thresholds.performance.errorRateThreshold
      },
      mitigation: 'Implement horizontal scaling and load balancing optimization',
      confidence: 80
    };
    risks.push(scalabilityRisk);

    return risks;
  }

  private async analyzeInfrastructureRisks(request: TechnicalRiskAnalysisRequest, thresholds: TechnicalRiskThresholds): Promise<InfrastructureRisk[]> {
    console.log(`[TECHNICAL-RISK-ANALYZER] Analyzing infrastructure risks for system: ${request.systemId}`);
    const risks: InfrastructureRisk[] = [];

    // Simulate availability risk
    const availabilityRisk: InfrastructureRisk = {
      id: this.generateId('infra-risk'),
      type: 'availability',
      severity: 'high',
      probability: 'medium',
      description: 'Single point of failure in primary database cluster',
      affectedComponents: ['primary-database', 'database-cluster'],
      currentMetrics: {
        availability: 99.5,
        resourceUtilization: 75
      },
      thresholds: {
        availability: thresholds.infrastructure.availabilityThreshold,
        resourceUtilization: thresholds.infrastructure.resourceUtilizationThreshold
      },
      mitigation: 'Implement database clustering and failover mechanisms',
      confidence: 95
    };
    risks.push(availabilityRisk);

    // Simulate capacity risk
    const capacityRisk: InfrastructureRisk = {
      id: this.generateId('infra-risk'),
      type: 'capacity',
      severity: 'medium',
      probability: 'high',
      description: 'Storage capacity approaching limits',
      affectedComponents: ['storage-system', 'backup-storage'],
      currentMetrics: {
        resourceUtilization: 85
      },
      thresholds: {
        resourceUtilization: thresholds.infrastructure.resourceUtilizationThreshold
      },
      mitigation: 'Implement storage expansion and data archiving policies',
      confidence: 85
    };
    risks.push(capacityRisk);

    return risks;
  }

  private async analyzeTechnologyObsolescenceRisks(request: TechnicalRiskAnalysisRequest, thresholds: TechnicalRiskThresholds): Promise<TechnologyObsolescenceRisk[]> {
    console.log(`[TECHNICAL-RISK-ANALYZER] Analyzing technology obsolescence risks for system: ${request.systemId}`);
    const risks: TechnologyObsolescenceRisk[] = [];

    // Simulate end-of-life risk
    const eolRisk: TechnologyObsolescenceRisk = {
      id: this.generateId('tech-risk'),
      type: 'end_of_life',
      severity: 'high',
      probability: 'medium',
      description: 'Node.js version approaching end of life',
      affectedComponents: ['application-runtime', 'build-system'],
      technology: {
        name: 'Node.js',
        version: '16.x',
        endOfLifeDate: new Date('2023-09-11'),
        supportLevel: 40,
        lastUpdateDate: new Date('2023-04-10')
      },
      mitigation: 'Upgrade to supported Node.js version and update dependencies',
      confidence: 90
    };
    risks.push(eolRisk);

    // Simulate deprecated framework risk
    const deprecatedRisk: TechnologyObsolescenceRisk = {
      id: this.generateId('tech-risk'),
      type: 'deprecated',
      severity: 'medium',
      probability: 'low',
      description: 'Using deprecated authentication library',
      affectedComponents: ['auth-service', 'security-module'],
      technology: {
        name: 'Passport.js',
        version: '0.4.x',
        supportLevel: 55,
        lastUpdateDate: new Date('2022-06-15')
      },
      mitigation: 'Migrate to current version of authentication framework',
      confidence: 80
    };
    risks.push(deprecatedRisk);

    return risks;
  }

  private async analyzeIntegrationRisks(request: TechnicalRiskAnalysisRequest, thresholds: TechnicalRiskThresholds): Promise<IntegrationRisk[]> {
    console.log(`[TECHNICAL-RISK-ANALYZER] Analyzing integration risks for system: ${request.systemId}`);
    const risks: IntegrationRisk[] = [];

    // Simulate API compatibility risk
    const apiCompatibilityRisk: IntegrationRisk = {
      id: this.generateId('int-risk'),
      type: 'api_compatibility',
      severity: 'medium',
      probability: 'medium',
      description: 'Third-party API version compatibility issues',
      affectedComponents: ['payment-service', 'external-api'],
      integration: {
        source: 'payment-service',
        target: 'external-payment-provider',
        protocol: 'REST/JSON',
        complexity: 65,
        dependencies: 8
      },
      mitigation: 'Implement API versioning and compatibility layer',
      confidence: 75
    };
    risks.push(apiCompatibilityRisk);

    // Simulate dependency risk
    const dependencyRisk: IntegrationRisk = {
      id: this.generateId('int-risk'),
      type: 'dependency',
      severity: 'high',
      probability: 'low',
      description: 'Critical dependency on single vendor for messaging system',
      affectedComponents: ['messaging-service', 'notification-system'],
      integration: {
        source: 'messaging-service',
        target: 'vendor-messaging-platform',
        protocol: 'AMQP',
        complexity: 45,
        dependencies: 12
      },
      mitigation: 'Implement vendor-agnostic messaging abstraction layer',
      confidence: 85
    };
    risks.push(dependencyRisk);

    return risks;
  }

  private async analyzeDataIntegrityRisks(request: TechnicalRiskAnalysisRequest, thresholds: TechnicalRiskThresholds): Promise<DataIntegrityRisk[]> {
    console.log(`[TECHNICAL-RISK-ANALYZER] Analyzing data integrity risks for system: ${request.systemId}`);
    const risks: DataIntegrityRisk[] = [];

    // Simulate data corruption risk
    const corruptionRisk: DataIntegrityRisk = {
      id: this.generateId('data-risk'),
      type: 'corruption',
      severity: 'medium',
      probability: 'low',
      description: 'Potential data corruption in distributed transactions',
      affectedComponents: ['transaction-service', 'database-cluster'],
      currentMetrics: {
        integrityScore: 92,
        backupSuccessRate: 98
      },
      thresholds: {
        integrityScore: thresholds.data.integrityThreshold,
        backupSuccessRate: thresholds.data.availabilityThreshold
      },
      mitigation: 'Implement distributed transaction management and data validation',
      confidence: 70
    };
    risks.push(corruptionRisk);

    // Simulate backup failure risk
    const backupRisk: DataIntegrityRisk = {
      id: this.generateId('data-risk'),
      type: 'backup_failure',
      severity: 'high',
      probability: 'medium',
      description: 'Backup system reliability issues',
      affectedComponents: ['backup-system', 'disaster-recovery'],
      currentMetrics: {
        backupSuccessRate: 94,
        availability: 97
      },
      thresholds: {
        backupSuccessRate: thresholds.data.availabilityThreshold,
        availability: thresholds.data.availabilityThreshold
      },
      mitigation: 'Upgrade backup system and implement multi-location backups',
      confidence: 80
    };
    risks.push(backupRisk);

    return risks;
  }

  private calculateOverallRiskScore(result: TechnicalRiskAnalysisResult): number {
    const allRisks = [
      ...result.securityRisks,
      ...result.performanceRisks,
      ...result.infrastructureRisks,
      ...result.technologyObsolescenceRisks,
      ...result.integrationRisks,
      ...result.dataIntegrityRisks
    ];

    if (allRisks.length === 0) {
      return 0;
    }

    const severityScores = { critical: 100, high: 75, medium: 50, low: 25 };
    const probabilityScores = { very_high: 100, high: 75, medium: 50, low: 25, very_low: 10 };

    let totalScore = 0;
    for (const risk of allRisks) {
      const severityScore = severityScores[risk.severity];
      const probabilityScore = probabilityScores[risk.probability];
      const riskScore = (severityScore + probabilityScore) / 2;
      totalScore += riskScore * (risk.confidence / 100);
    }

    return Math.round(totalScore / allRisks.length);
  }

  private determineRiskLevel(score: number): 'critical' | 'high' | 'medium' | 'low' {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  private generateTechnicalRiskRecommendations(result: TechnicalRiskAnalysisResult, thresholds: TechnicalRiskThresholds): TechnicalRiskRecommendation[] {
    const recommendations: TechnicalRiskRecommendation[] = [];

    // Security recommendations
    if (result.securityRisks.length > 0) {
      recommendations.push({
        id: this.generateId('rec'),
        category: 'security',
        priority: 'high',
        description: 'Implement comprehensive security assessment and remediation program',
        estimatedEffort: 21,
        estimatedCost: 50000,
        riskReduction: 40,
        dependencies: ['security-team', 'dev-team'],
        implementationPlan: [
          'Conduct security audit',
          'Implement security scanning in CI/CD',
          'Address critical vulnerabilities',
          'Establish security monitoring'
        ]
      });
    }

    // Performance recommendations
    if (result.performanceRisks.length > 0) {
      recommendations.push({
        id: this.generateId('rec'),
        category: 'performance',
        priority: 'medium',
        description: 'Optimize system performance and implement monitoring',
        estimatedEffort: 14,
        estimatedCost: 30000,
        riskReduction: 35,
        dependencies: ['dev-team', 'ops-team'],
        implementationPlan: [
          'Implement performance monitoring',
          'Optimize database queries',
          'Implement caching strategy',
          'Conduct load testing'
        ]
      });
    }

    // Infrastructure recommendations
    if (result.infrastructureRisks.length > 0) {
      recommendations.push({
        id: this.generateId('rec'),
        category: 'infrastructure',
        priority: 'high',
        description: 'Improve infrastructure reliability and redundancy',
        estimatedEffort: 28,
        estimatedCost: 75000,
        riskReduction: 50,
        dependencies: ['ops-team', 'infrastructure-team'],
        implementationPlan: [
          'Implement high availability architecture',
          'Upgrade backup systems',
          'Implement disaster recovery',
          'Expand capacity planning'
        ]
      });
    }

    return recommendations;
  }

  private calculateAnalysisConfidence(result: TechnicalRiskAnalysisResult, request: TechnicalRiskAnalysisRequest): number {
    let confidence = 70; // Base confidence

    // Adjust based on data completeness
    const analysisTypes = [
      request.includeSecurityAnalysis,
      request.includePerformanceAnalysis,
      request.includeInfrastructureAnalysis,
      request.includeTechnologyObsolescenceAnalysis,
      request.includeIntegrationAnalysis,
      request.includeDataIntegrityAnalysis
    ];

    const completedAnalyses = analysisTypes.filter(Boolean).length;
    confidence += (completedAnalyses / analysisTypes.length) * 20;

    // Adjust based on risk data quality
    const allRisks = [
      ...result.securityRisks,
      ...result.performanceRisks,
      ...result.infrastructureRisks,
      ...result.technologyObsolescenceRisks,
      ...result.integrationRisks,
      ...result.dataIntegrityRisks
    ];

    if (allRisks.length > 0) {
      const avgConfidence = allRisks.reduce((sum, risk) => sum + risk.confidence, 0) / allRisks.length;
      confidence = (confidence + avgConfidence) / 2;
    }

    return Math.round(Math.min(100, Math.max(0, confidence)));
  }

  public async batchAnalyzeTechnicalRisks(requests: TechnicalRiskAnalysisRequest[]): Promise<TechnicalRiskAnalysisResult[]> {
    console.log(`[TECHNICAL-RISK-ANALYZER] Batch analyzing ${requests.length} systems`);
    const results: TechnicalRiskAnalysisResult[] = [];

    for (const request of requests) {
      const result = await this.analyzeTechnicalRisks(request);
      results.push(result);
    }

    // Emit batch completion event
    this.emit('batchTechnicalRiskAnalysisCompleted', {
      type: 'batch_technical_risk_analysis_completed',
      timestamp: new Date(),
      data: { results, count: requests.length },
      description: `Batch technical risk analysis completed for ${requests.length} systems`
    } as RiskAssessmentEvent);

    return results;
  }

  public getTechnicalRiskTrends(historicalResults: TechnicalRiskAnalysisResult[]): {
    trend: 'improving' | 'stable' | 'deteriorating';
    changeRate: number;
    categoryTrends: Record<string, 'improving' | 'stable' | 'deteriorating'>;
  } {
    if (historicalResults.length < 2) {
      return {
        trend: 'stable',
        changeRate: 0,
        categoryTrends: {}
      };
    }

    const recentScores = historicalResults.slice(-3).map(r => r.overallRiskScore);
    const olderScores = historicalResults.slice(0, -3).map(r => r.overallRiskScore);

    const recentAverage = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
    const olderAverage = olderScores.reduce((sum, score) => sum + score, 0) / olderScores.length;

    const changeRate = ((recentAverage - olderAverage) / olderAverage) * 100;

    let trend: 'improving' | 'stable' | 'deteriorating';
    if (Math.abs(changeRate) < 5) {
      trend = 'stable';
    } else if (changeRate > 0) {
      trend = 'deteriorating';
    } else {
      trend = 'improving';
    }

    // Calculate category trends
    const categoryTrends: Record<string, 'improving' | 'stable' | 'deteriorating'> = {
      security: this.calculateCategoryTrend(historicalResults, 'securityRisks'),
      performance: this.calculateCategoryTrend(historicalResults, 'performanceRisks'),
      infrastructure: this.calculateCategoryTrend(historicalResults, 'infrastructureRisks'),
      technology: this.calculateCategoryTrend(historicalResults, 'technologyObsolescenceRisks'),
      integration: this.calculateCategoryTrend(historicalResults, 'integrationRisks'),
      data: this.calculateCategoryTrend(historicalResults, 'dataIntegrityRisks')
    };

    return {
      trend,
      changeRate: Math.round(changeRate),
      categoryTrends
    };
  }

  private calculateCategoryTrend(results: TechnicalRiskAnalysisResult[], category: keyof TechnicalRiskAnalysisResult): 'improving' | 'stable' | 'deteriorating' {
    const recentCount = results.slice(-3).reduce((sum, result) => sum + (result[category] as any[]).length, 0);
    const olderCount = results.slice(0, -3).reduce((sum, result) => sum + (result[category] as any[]).length, 0);

    if (Math.abs(recentCount - olderCount) <= 1) {
      return 'stable';
    } else if (recentCount > olderCount) {
      return 'deteriorating';
    } else {
      return 'improving';
    }
  }

  private generateId(type: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${type}-${timestamp}-${random}`;
  }

  public updateConfig(config: Partial<RiskAssessmentConfig>): void {
    this.config = { ...this.config, ...config };
    
    this.emit('configUpdated', {
      type: 'config_updated',
      timestamp: new Date(),
      data: { config: this.config },
      description: 'Technical risk analyzer configuration updated'
    } as RiskAssessmentEvent);
  }

  public getConfig(): RiskAssessmentConfig {
    return this.config;
  }

  public getDefaultThresholds(): TechnicalRiskThresholds {
    return this.defaultThresholds;
  }

  public updateDefaultThresholds(thresholds: Partial<TechnicalRiskThresholds>): void {
    this.defaultThresholds = { ...this.defaultThresholds, ...thresholds };
    
    this.emit('thresholdsUpdated', {
      type: 'thresholds_updated',
      timestamp: new Date(),
      data: { thresholds: this.defaultThresholds },
      description: 'Technical risk thresholds updated'
    } as RiskAssessmentEvent);
  }
}