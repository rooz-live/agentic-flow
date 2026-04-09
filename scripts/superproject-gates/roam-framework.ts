/**
 * ROAM Risk Assessment Framework Orchestrator
 * 
 * Main orchestrator that integrates all ROAM framework components
 * and provides unified interface for risk assessment management
 */

import { EventEmitter } from 'events';
import { OrchestrationFramework } from '../../core/orchestration-framework';
import { WSJFCalculator } from '../../wsf/calculator';

import {
  Risk,
  Opportunity,
  Action,
  MitigationStrategy,
  RiskMatrix,
  RiskAssessmentConfig,
  RiskAssessmentReport,
  ROAMCategory,
  RiskSeverity,
  RiskProbability,
  RiskImpactArea,
  OpportunityCategory,
  ActionStatus,
  RiskAssessmentEvent
} from './types';

import { RiskIdentifier, RiskIdentificationRequest } from './risk-identifier';
import { OpportunityAnalyzer, OpportunityIdentificationRequest } from './opportunity-analyzer';
import { ActionTracker, ActionCreationRequest, ActionAssignmentRequest, ActionProgressUpdate } from './action-tracker';
import { MitigationStrategyManager, MitigationStrategyRequest } from './mitigation-strategy';
import { RiskScorer, RiskScoringRequest } from './risk-scorer';
import { RiskMatrixGenerator, RiskMatrixConfig } from './risk-matrix';

export interface ROAMFrameworkConfig {
  riskAssessment: RiskAssessmentConfig;
  riskMatrix: RiskMatrixConfig;
  enableAutoScoring: boolean;
  enableAutoPrioritization: boolean;
  enableAutoMonitoring: boolean;
  monitoringInterval: number; // in minutes
  reportingInterval: number; // in days
  integrationSettings: {
    orchestrationFramework: boolean;
    wsjfSystem: boolean;
    healthChecks: boolean;
    agentDB: boolean;
  };
}

export interface ROAMFrameworkStatus {
  initialized: boolean;
  components: {
    riskIdentifier: boolean;
    opportunityAnalyzer: boolean;
    actionTracker: boolean;
    mitigationStrategyManager: boolean;
    riskScorer: boolean;
    riskMatrixGenerator: boolean;
  };
  integration: {
    orchestrationFramework: boolean;
    wsjfSystem: boolean;
    healthChecks: boolean;
    agentDB: boolean;
  };
  metrics: {
    totalRisks: number;
    totalOpportunities: number;
    totalActions: number;
    totalStrategies: number;
    totalMatrices: number;
  };
  lastUpdated: Date;
}

export class ROAMFramework extends EventEmitter {
  private config: ROAMFrameworkConfig;
  private status: ROAMFrameworkStatus;
  
  // Core components
  private riskIdentifier: RiskIdentifier;
  private opportunityAnalyzer: OpportunityAnalyzer;
  private actionTracker: ActionTracker;
  private mitigationStrategyManager: MitigationStrategyManager;
  private riskScorer: RiskScorer;
  private riskMatrixGenerator: RiskMatrixGenerator;
  
  // Integration components
  private orchestrationFramework?: OrchestrationFramework;
  private wsjfCalculator?: WSJFCalculator;
  
  // Monitoring
  private monitoringInterval?: NodeJS.Timeout;
  private reportingInterval?: NodeJS.Timeout;

  constructor(config: ROAMFrameworkConfig) {
    super();
    this.config = config;
    this.status = {
      initialized: false,
      components: {
        riskIdentifier: false,
        opportunityAnalyzer: false,
        actionTracker: false,
        mitigationStrategyManager: false,
        riskScorer: false,
        riskMatrixGenerator: false
      },
      integration: {
        orchestrationFramework: false,
        wsjfSystem: false,
        healthChecks: false,
        agentDB: false
      },
      metrics: {
        totalRisks: 0,
        totalOpportunities: 0,
        totalActions: 0,
        totalStrategies: 0,
        totalMatrices: 0
      },
      lastUpdated: new Date()
    };

    this.initializeComponents();
  }

  private async initializeComponents(): Promise<void> {
    console.log('[ROAM-FRAMEWORK] Initializing ROAM framework components');

    try {
      // Initialize core components
      this.riskIdentifier = new RiskIdentifier(this.config.riskAssessment);
      this.opportunityAnalyzer = new OpportunityAnalyzer();
      this.actionTracker = new ActionTracker();
      this.mitigationStrategyManager = new MitigationStrategyManager();
      this.riskScorer = new RiskScorer(this.config.riskAssessment);
      this.riskMatrixGenerator = new RiskMatrixGenerator();

      // Set up component status
      this.status.components.riskIdentifier = true;
      this.status.components.opportunityAnalyzer = true;
      this.status.components.actionTracker = true;
      this.status.components.mitigationStrategyManager = true;
      this.status.components.riskScorer = true;
      this.status.components.riskMatrixGenerator = true;

      // Set up event forwarding
      this.setupEventForwarding();

      console.log('[ROAM-FRAMEWORK] Core components initialized successfully');
    } catch (error) {
      console.error('[ROAM-FRAMEWORK] Failed to initialize components:', error);
      throw error;
    }
  }

  private setupEventForwarding(): void {
    // Forward events from components to framework level
    this.riskIdentifier.on('riskIdentified', (event) => this.emit('riskIdentified', event));
    this.riskIdentifier.on('riskUpdated', (event) => this.emit('riskUpdated', event));
    this.riskIdentifier.on('riskDeleted', (event) => this.emit('riskDeleted', event));

    this.opportunityAnalyzer.on('opportunityIdentified', (event) => this.emit('opportunityIdentified', event));
    this.opportunityAnalyzer.on('opportunityAssessed', (event) => this.emit('opportunityAssessed', event));
    this.opportunityAnalyzer.on('opportunityUpdated', (event) => this.emit('opportunityUpdated', event));

    this.actionTracker.on('actionCreated', (event) => this.emit('actionCreated', event));
    this.actionTracker.on('actionAssigned', (event) => this.emit('actionAssigned', event));
    this.actionTracker.on('actionProgressUpdated', (event) => this.emit('actionProgressUpdated', event));

    this.mitigationStrategyManager.on('strategyCreated', (event) => this.emit('strategyCreated', event));
    this.mitigationStrategyManager.on('effectivenessAssessed', (event) => this.emit('effectivenessAssessed', event));

    this.riskScorer.on('riskScoreCalculated', (event) => this.emit('riskScoreCalculated', event));
    this.riskMatrixGenerator.on('matrixCreated', (event) => this.emit('matrixCreated', event));
  }

  public async initialize(
    orchestrationFramework?: OrchestrationFramework,
    wsjfCalculator?: WSJFCalculator
  ): Promise<void> {
    console.log('[ROAM-FRAMEWORK] Initializing ROAM framework');

    try {
      // Set up integrations
      if (this.config.integrationSettings.orchestrationFramework && orchestrationFramework) {
        this.orchestrationFramework = orchestrationFramework;
        this.status.integration.orchestrationFramework = true;
        await this.setupOrchestrationIntegration();
      }

      if (this.config.integrationSettings.wsjfSystem && wsjfCalculator) {
        this.wsjfCalculator = wsjfCalculator;
        this.actionTracker.setWSJFCalculator(wsjfCalculator);
        this.status.integration.wsjfSystem = true;
      }

      // Start monitoring if enabled
      if (this.config.enableAutoMonitoring) {
        this.startMonitoring();
      }

      // Start reporting if enabled
      if (this.config.reportingInterval > 0) {
        this.startReporting();
      }

      // Update status
      this.status.initialized = true;
      this.status.lastUpdated = new Date();

      // Emit initialization event
      this.emit('frameworkInitialized', {
        type: 'framework_initialized',
        timestamp: new Date(),
        data: { status: this.status },
        description: 'ROAM framework initialized successfully'
      } as RiskAssessmentEvent);

      console.log('[ROAM-FRAMEWORK] ROAM framework initialized successfully');
    } catch (error) {
      console.error('[ROAM-FRAMEWORK] Failed to initialize framework:', error);
      throw error;
    }
  }

  private async setupOrchestrationIntegration(): Promise<void> {
    if (!this.orchestrationFramework) {
      return;
    }

    console.log('[ROAM-FRAMEWORK] Setting up orchestration framework integration');

    // Create ROAM-specific purpose if not exists
    const roamPurpose = this.orchestrationFramework.getPurpose('roam-risk-assessment');
    if (!roamPurpose) {
      this.orchestrationFramework.createPurpose({
        name: 'ROAM Risk Assessment',
        description: 'Comprehensive risk assessment and management using ROAM framework',
        objectives: [
          'Identify and assess risks across all impact areas',
          'Develop and implement effective mitigation strategies',
          'Monitor and track risk mitigation progress',
          'Optimize risk-reward balance through opportunity analysis'
        ],
        keyResults: [
          '90% of risks assessed within 24 hours',
          '80% of high-priority risks mitigated within 30 days',
          'Risk reduction of 60% for critical risks',
          'Opportunity realization rate of 75%'
        ]
      });
    }

    // Create ROAM-specific domain if not exists
    const roamDomain = this.orchestrationFramework.getDomain('roam-risk-management');
    if (!roamDomain) {
      this.orchestrationFramework.createDomain({
        name: 'ROAM Risk Management',
        purpose: 'roam-risk-assessment',
        boundaries: [
          'Risk identification and assessment',
          'Mitigation strategy development',
          'Action tracking and management',
          'Opportunity analysis and prioritization'
        ],
        accountabilities: [
          'risk-assessment-lead',
          'mitigation-strategist',
          'action-coordinator',
          'opportunity-analyst'
        ]
      });
    }
  }

  private startMonitoring(): void {
    console.log(`[ROAM-FRAMEWORK] Starting auto-monitoring (interval: ${this.config.monitoringInterval} minutes)`);

    this.monitoringInterval = setInterval(async () => {
      await this.performAutoMonitoring();
    }, this.config.monitoringInterval * 60 * 1000);
  }

  private async performAutoMonitoring(): Promise<void> {
    try {
      console.log('[ROAM-FRAMEWORK] Performing automatic monitoring');

      // Monitor mitigation strategies
      if (this.config.enableAutoMonitoring) {
        await this.mitigationStrategyManager.monitorStrategyEffectiveness();
      }

      // Recalculate WSJF scores if enabled
      if (this.config.integrationSettings.wsjfSystem && this.config.enableAutoPrioritization) {
        await this.actionTracker.recalculateWSJFScores();
      }

      // Update metrics
      this.updateMetrics();

    } catch (error) {
      console.error('[ROAM-FRAMEWORK] Auto-monitoring failed:', error);
    }
  }

  private startReporting(): void {
    console.log(`[ROAM-FRAMEWORK] Starting periodic reporting (interval: ${this.config.reportingInterval} days)`);

    this.reportingInterval = setInterval(async () => {
      await this.generatePeriodicReport();
    }, this.config.reportingInterval * 24 * 60 * 60 * 1000);
  }

  private async generatePeriodicReport(): Promise<void> {
    try {
      console.log('[ROAM-FRAMEWORK] Generating periodic report');

      const report = await this.generateAssessmentReport();
      
      this.emit('periodicReportGenerated', {
        type: 'report_generated',
        timestamp: new Date(),
        data: { report },
        description: 'Periodic ROAM assessment report generated'
      } as RiskAssessmentEvent);

    } catch (error) {
      console.error('[ROAM-FRAMEWORK] Periodic report generation failed:', error);
    }
  }

  private updateMetrics(): void {
    this.status.metrics = {
      totalRisks: this.riskIdentifier.getAllRisks().length,
      totalOpportunities: this.opportunityAnalyzer.getAllOpportunities().length,
      totalActions: this.actionTracker.getAllActions().length,
      totalStrategies: this.mitigationStrategyManager.getAllStrategies().length,
      totalMatrices: this.riskMatrixGenerator.getAllMatrices().length
    };
    this.status.lastUpdated = new Date();
  }

  // Public API methods

  public async identifyRisk(request: RiskIdentificationRequest): Promise<Risk> {
    const risk = await this.riskIdentifier.identifyRisk(request);
    
    // Auto-score if enabled
    if (this.config.enableAutoScoring) {
      await this.scoreRisk(risk.id);
    }
    
    this.updateMetrics();
    return risk;
  }

  public async identifyOpportunity(request: OpportunityIdentificationRequest): Promise<Opportunity> {
    const opportunity = await this.opportunityAnalyzer.identifyOpportunity(request);
    
    // Auto-assess if enabled
    if (this.config.enableAutoPrioritization) {
      await this.opportunityAnalyzer.assessOpportunity(opportunity.id);
    }
    
    this.updateMetrics();
    return opportunity;
  }

  public async createAction(request: ActionCreationRequest): Promise<Action> {
    const action = await this.actionTracker.createAction(request);
    this.updateMetrics();
    return action;
  }

  public async assignAction(request: ActionAssignmentRequest): Promise<Action | undefined> {
    const action = await this.actionTracker.assignAction(request);
    this.updateMetrics();
    return action;
  }

  public async updateActionProgress(update: ActionProgressUpdate): Promise<Action | undefined> {
    const action = await this.actionTracker.updateProgress(update);
    this.updateMetrics();
    return action;
  }

  public async createMitigationStrategy(request: MitigationStrategyRequest): Promise<MitigationStrategy> {
    const strategy = await this.mitigationStrategyManager.createMitigationStrategy(request);
    this.updateMetrics();
    return strategy;
  }

  public async scoreRisk(riskId: string): Promise<void> {
    const risk = this.riskIdentifier.getRisk(riskId);
    if (!risk) {
      throw new Error(`Risk not found: ${riskId}`);
    }

    const scoringRequest: RiskScoringRequest = {
      riskId,
      probability: risk.probability,
      severity: risk.severity,
      impactArea: risk.impactArea,
      businessImpact: risk.businessImpact,
      technicalImpact: risk.technicalImpact,
      operationalImpact: risk.operationalImpact,
      financialImpact: risk.financialImpact,
      estimatedCostOfDelay: risk.estimatedCostOfDelay
    };

    await this.riskScorer.calculateRiskScore(scoringRequest);
    this.updateMetrics();
  }

  public async createRiskMatrix(riskIds?: string[]): Promise<RiskMatrix> {
    const risks = riskIds ? 
      riskIds.map(id => this.riskIdentifier.getRisk(id)).filter(Boolean) as Risk[] :
      this.riskIdentifier.getAllRisks();

    const matrix = await this.riskMatrixGenerator.createRiskMatrix(risks, this.config.riskMatrix);
    this.updateMetrics();
    return matrix;
  }

  public async generateAssessmentReport(): Promise<RiskAssessmentReport> {
    console.log('[ROAM-FRAMEWORK] Generating assessment report');

    const risks = this.riskIdentifier.getAllRisks();
    const opportunities = this.opportunityAnalyzer.getAllOpportunities();
    const actions = this.actionTracker.getAllActions();

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentRisks = risks.filter(risk => risk.identifiedAt >= thirtyDaysAgo);
    const recentOpportunities = opportunities.filter(opp => opp.identifiedAt >= thirtyDaysAgo);
    const recentActions = actions.filter(action => action.createdAt >= thirtyDaysAgo);

    // Calculate summary statistics
    const riskStats = this.riskIdentifier.getRiskStatistics();
    const opportunityStats = this.opportunityAnalyzer.getOpportunityStatistics();
    const actionStats = this.actionTracker.getActionStatistics();

    // Determine trends
    const riskTrend = recentRisks.length > riskStats.total * 0.3 ? 'increasing' : 
                     recentRisks.length < riskStats.total * 0.1 ? 'decreasing' : 'stable';

    const resolutionTrend = actionStats.completed > actionStats.total * 0.7 ? 'improving' :
                          actionStats.completed < actionStats.total * 0.3 ? 'deteriorating' : 'stable';

    // Generate recommendations
    const recommendations = this.generateFrameworkRecommendations(riskStats, opportunityStats, actionStats);

    const report: RiskAssessmentReport = {
      id: this.generateId('report'),
      name: 'ROAM Risk Assessment Report',
      description: 'Comprehensive risk assessment and opportunity analysis report',
      generatedAt: now,
      period: {
        start: thirtyDaysAgo,
        end: now
      },
      summary: {
        totalRisks: riskStats.total,
        byCategory: riskStats.byCategory,
        bySeverity: riskStats.bySeverity,
        byImpactArea: riskStats.byImpactArea,
        averageRiskScore: riskStats.averageScore,
        criticalRisks: riskStats.bySeverity.critical,
        highRisks: riskStats.bySeverity.high
      },
      opportunities: {
        totalOpportunities: opportunityStats.total,
        totalValue: opportunityStats.totalValue,
        byCategory: opportunityStats.byCategory,
        averageScore: opportunityStats.averageScore
      },
      actions: {
        totalActions: actionStats.total,
        completed: actionStats.byStatus.completed,
        inProgress: actionStats.byStatus.in_progress,
        blocked: actionStats.byStatus.blocked,
        overdue: actionStats.overdue
      },
      trends: {
        riskScoreTrend: riskTrend,
        newRisksTrend: riskTrend,
        resolutionRateTrend: resolutionTrend
      },
      recommendations,
      metadata: {
        frameworkVersion: '1.0.0',
        configVersion: this.config.riskAssessment.id || 'default'
      }
    };

    return report;
  }

  private generateFrameworkRecommendations(
    riskStats: any,
    opportunityStats: any,
    actionStats: any
  ): string[] {
    const recommendations: string[] = [];

    // Risk-based recommendations
    if (riskStats.bySeverity.critical > 5) {
      recommendations.push('Critical risk count is high - consider executive risk committee activation');
    }

    if (riskStats.averageScore > 70) {
      recommendations.push('Average risk score is elevated - enhance risk mitigation efforts');
    }

    // Opportunity-based recommendations
    if (opportunityStats.totalValue > 100000 && opportunityStats.averageScore < 60) {
      recommendations.push('High opportunity value with low scores - improve opportunity assessment process');
    }

    // Action-based recommendations
    if (actionStats.overdue > actionStats.total * 0.2) {
      recommendations.push('High percentage of overdue actions - review resource allocation and priorities');
    }

    if (actionStats.byStatus.blocked > actionStats.total * 0.15) {
      recommendations.push('Many blocked actions - address blockers and improve dependency management');
    }

    // General recommendations
    if (riskStats.total > opportunityStats.total * 2) {
      recommendations.push('Risk-to-opportunity ratio is high - focus on opportunity identification');
    }

    return recommendations;
  }

  // Status and configuration methods

  public getStatus(): ROAMFrameworkStatus {
    this.updateMetrics();
    return this.status;
  }

  public getConfig(): ROAMFrameworkConfig {
    return this.config;
  }

  public updateConfig(config: Partial<ROAMFrameworkConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart monitoring if interval changed
    if (config.monitoringInterval && this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.startMonitoring();
    }

    // Restart reporting if interval changed
    if (config.reportingInterval && this.reportingInterval) {
      clearInterval(this.reportingInterval);
      this.startReporting();
    }

    this.emit('configUpdated', {
      type: 'config_updated',
      timestamp: new Date(),
      data: { config: this.config },
      description: 'ROAM framework configuration updated'
    } as RiskAssessmentEvent);
  }

  // Component access methods

  public getRiskIdentifier(): RiskIdentifier {
    return this.riskIdentifier;
  }

  public getOpportunityAnalyzer(): OpportunityAnalyzer {
    return this.opportunityAnalyzer;
  }

  public getActionTracker(): ActionTracker {
    return this.actionTracker;
  }

  public getMitigationStrategyManager(): MitigationStrategyManager {
    return this.mitigationStrategyManager;
  }

  public getRiskScorer(): RiskScorer {
    return this.riskScorer;
  }

  public getRiskMatrixGenerator(): RiskMatrixGenerator {
    return this.riskMatrixGenerator;
  }

  // Cleanup methods

  public async shutdown(): Promise<void> {
    console.log('[ROAM-FRAMEWORK] Shutting down ROAM framework');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
      this.reportingInterval = undefined;
    }

    this.status.initialized = false;
    this.status.lastUpdated = new Date();

    this.emit('frameworkShutdown', {
      type: 'framework_shutdown',
      timestamp: new Date(),
      data: { status: this.status },
      description: 'ROAM framework shutdown completed'
    } as RiskAssessmentEvent);

    console.log('[ROAM-FRAMEWORK] ROAM framework shutdown completed');
  }

  private generateId(type: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${type}-${timestamp}-${random}`;
  }
}