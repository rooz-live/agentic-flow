/**
 * Goalie Integration Layer
 * 
 * This module provides integration between the automated governance agents,
 * WSJF prioritization, risk-aware batching, and the VS Code extension.
 * It serves as the central hub for coordinating all components.
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { GovernanceAgent } from './governance_agent.js';
import { RetroCoachEnhanced } from './retro_coach_enhanced.js';
import { WSJFCalculator } from './wsjf_calculator.js';
import { MultiDimensionalAnalytics } from './multi_dimensional_analytics.js';
import { RiskAwareBatchingSystem } from './risk_aware_batching.js';
import type { WSJFResult, BatchRecommendation, RiskAssessment } from './wsjf_calculator.js';
import type { AnalyticsSummary } from './multi_dimensional_analytics.js';
import type { BatchExecutionPlan, BatchExecutionResult } from './risk_aware_batching.js';
import type { EnhancedKanbanEntry, RealtimeUpdateMessage } from '../goalie-vscode/src/types_enhanced.js';

/**
 * Integration configuration
 */
interface IntegrationConfig {
  /** Goalie directory path */
  goalieDir: string;
  /** WebSocket configuration */
  websocket: {
    enabled: boolean;
    port: number;
    host: string;
  };
  /** Auto-refresh intervals */
  refreshIntervals: {
    kanban: number; // milliseconds
    analytics: number; // milliseconds
    patterns: number; // milliseconds
  };
  /** Batching configuration */
  batching: {
    enabled: boolean;
    autoApproveLowRisk: boolean;
    riskThreshold: number;
    maxConcurrentBatches: number;
  };
  /** WSJF configuration */
  wsjf: {
    enabled: boolean;
    weights: {
      userBusinessValue: number;
      timeCriticality: number;
      riskReduction: number;
      jobDuration: number;
    };
  };
}

/**
 * Integration event types
 */
interface IntegrationEvent {
  type: 'kanban-updated' | 'analytics-updated' | 'batch-executed' | 'governance-action' | 'retro-completed';
  data: any;
  timestamp: string;
}

/**
 * Goalie Integration Manager
 * 
 * Central coordinator for all Goalie components and VS Code extension integration
 */
export class GoalieIntegrationManager extends EventEmitter {
  private config: IntegrationConfig;
  private governanceAgent: GovernanceAgent;
  private retroCoach: RetroCoachEnhanced;
  private wsjfCalculator: WSJFCalculator;
  private analytics: MultiDimensionalAnalytics;
  private batchingSystem: RiskAwareBatchingSystem;
  private refreshTimers: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;

  constructor(config: Partial<IntegrationConfig> = {}) {
    super();
    
    // Default configuration
    this.config = {
      goalieDir: process.cwd(),
      websocket: {
        enabled: true,
        port: 8080,
        host: 'localhost'
      },
      refreshIntervals: {
        kanban: 30000, // 30 seconds
        analytics: 60000, // 1 minute
        patterns: 45000 // 45 seconds
      },
      batching: {
        enabled: true,
        autoApproveLowRisk: true,
        riskThreshold: 5,
        maxConcurrentBatches: 3
      },
      wsjf: {
        enabled: true,
        weights: {
          userBusinessValue: 1.0,
          timeCriticality: 1.0,
          riskReduction: 1.0,
          jobDuration: 1.0
        }
      },
      ...config
    };

    // Initialize components
    this.initializeComponents();
  }

  /**
   * Initialize all components
   */
  private initializeComponents(): void {
    const goalieDir = this.config.goalieDir;
    
    // Initialize governance agent
    this.governanceAgent = new GovernanceAgent(goalieDir);
    
    // Initialize retro coach
    this.retroCoach = new RetroCoachEnhanced(goalieDir);
    
    // Initialize WSJF calculator
    this.wsjfCalculator = new WSJFCalculator(goalieDir);
    
    // Initialize analytics
    this.analytics = new MultiDimensionalAnalytics(goalieDir);
    
    // Initialize batching system
    this.batchingSystem = new RiskAwareBatchingSystem(goalieDir);
    
    // Set up event handlers
    this.setupEventHandlers();
  }

  /**
   * Set up event handlers for component integration
   */
  private setupEventHandlers(): void {
    // Governance agent events
    this.governanceAgent.on('governance-action', (data) => {
      this.handleGovernanceAction(data);
    });

    // Retro coach events
    this.retroCoach.on('retro-completed', (data) => {
      this.handleRetroCompleted(data);
    });

    // Batching system events
    this.batchingSystem.on('batch-executed', (data) => {
      this.handleBatchExecuted(data);
    });

    // Analytics events
    this.analytics.on('analytics-updated', (data) => {
      this.handleAnalyticsUpdated(data);
    });
  }

  /**
   * Start the integration manager
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    
    // Start periodic refresh timers
    this.startRefreshTimers();
    
    // Initialize WebSocket server if enabled
    if (this.config.websocket.enabled) {
      await this.startWebSocketServer();
    }
    
    // Perform initial data sync
    await this.performInitialSync();
    
    this.emit('integration-started', { timestamp: new Date().toISOString() });
  }

  /**
   * Stop the integration manager
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    // Clear refresh timers
    for (const timer of this.refreshTimers.values()) {
      clearTimeout(timer);
    }
    this.refreshTimers.clear();
    
    // Stop WebSocket server
    await this.stopWebSocketServer();
    
    this.emit('integration-stopped', { timestamp: new Date().toISOString() });
  }

  /**
   * Start periodic refresh timers
   */
  private startRefreshTimers(): void {
    // Kanban board refresh
    const kanbanTimer = setInterval(async () => {
      await this.refreshKanbanBoard();
    }, this.config.refreshIntervals.kanban);
    this.refreshTimers.set('kanban', kanbanTimer);

    // Analytics refresh
    const analyticsTimer = setInterval(async () => {
      await this.refreshAnalytics();
    }, this.config.refreshIntervals.analytics);
    this.refreshTimers.set('analytics', analyticsTimer);

    // Pattern metrics refresh
    const patternsTimer = setInterval(async () => {
      await this.refreshPatternMetrics();
    }, this.config.refreshIntervals.patterns);
    this.refreshTimers.set('patterns', patternsTimer);
  }

  /**
   * Perform initial data synchronization
   */
  private async performInitialSync(): Promise<void> {
    try {
      // Load existing Kanban board
      await this.loadKanbanBoard();
      
      // Load pattern metrics
      await this.loadPatternMetrics();
      
      // Generate initial analytics
      await this.generateAnalytics();
      
      // Check for pending batch executions
      await this.checkPendingBatches();
      
      this.emit('initial-sync-completed', { timestamp: new Date().toISOString() });
    } catch (error) {
      this.emit('initial-sync-error', { error: error.message, timestamp: new Date().toISOString() });
    }
  }

  /**
   * Refresh Kanban board with latest data
   */
  private async refreshKanbanBoard(): Promise<void> {
    try {
      const kanbanPath = path.join(this.config.goalieDir, 'KANBAN_BOARD.yaml');
      
      if (!fs.existsSync(kanbanPath)) {
        return;
      }
      
      // Load current Kanban board
      const kanbanData = this.loadKanbanData();
      
      // Enhance entries with WSJF scores and risk assessments
      const enhancedEntries = await this.enhanceKanbanEntries(kanbanData);
      
      // Save enhanced Kanban board
      this.saveKanbanData(enhancedEntries);
      
      // Emit update event
      this.emit('kanban-updated', { data: enhancedEntries, timestamp: new Date().toISOString() });
      
      // Send WebSocket update
      this.sendWebSocketUpdate({
        type: 'kanban-update',
        payload: enhancedEntries,
        timestamp: new Date().toISOString(),
        source: 'integration-manager'
      });
    } catch (error) {
      this.emit('kanban-refresh-error', { error: error.message, timestamp: new Date().toISOString() });
    }
  }

  /**
   * Refresh analytics data
   */
  private async refreshAnalytics(): Promise<void> {
    try {
      // Load pattern data and batch history
      const patternData = this.loadPatternData();
      const batchHistory = this.loadBatchHistory();
      
      // Generate analytics summary
      const analyticsSummary = await this.analytics.generateAnalytics(
        patternData,
        batchHistory,
        30 // 30-day window
      );
      
      // Emit update event
      this.emit('analytics-updated', { data: analyticsSummary, timestamp: new Date().toISOString() });
      
      // Send WebSocket update
      this.sendWebSocketUpdate({
        type: 'analytics-update',
        payload: analyticsSummary,
        timestamp: new Date().toISOString(),
        source: 'integration-manager'
      });
    } catch (error) {
      this.emit('analytics-refresh-error', { error: error.message, timestamp: new Date().toISOString() });
    }
  }

  /**
   * Refresh pattern metrics
   */
  private async refreshPatternMetrics(): Promise<void> {
    try {
      // Load pattern data
      const patternData = this.loadPatternData();
      
      // Calculate WSJF scores for patterns
      const enhancedPatterns = await this.calculatePatternWSJF(patternData);
      
      // Update pattern metrics file
      this.savePatternMetrics(enhancedPatterns);
      
      // Emit update event
      this.emit('pattern-metrics-updated', { data: enhancedPatterns, timestamp: new Date().toISOString() });
      
      // Send WebSocket update
      this.sendWebSocketUpdate({
        type: 'pattern-metrics-update',
        payload: enhancedPatterns,
        timestamp: new Date().toISOString(),
        source: 'integration-manager'
      });
    } catch (error) {
      this.emit('pattern-metrics-refresh-error', { error: error.message, timestamp: new Date().toISOString() });
    }
  }

  /**
   * Load and enhance Kanban entries with WSJF and risk data
   */
  private async enhanceKanbanEntries(kanbanData: any): Promise<any> {
    const enhanced = { ...kanbanData };
    
    for (const section of ['NOW', 'NEXT', 'LATER']) {
      if (enhanced[section] && Array.isArray(enhanced[section])) {
        enhanced[section] = await Promise.all(
          enhanced[section].map(async (entry: any) => {
            // Calculate WSJF score
            const wsjfResult = await this.wsjfCalculator.calculateWSJF(entry);
            
            // Assess risk
            const riskAssessment = await this.wsjfCalculator.assessRisk(entry);
            
            // Get batch recommendation
            const batchRecommendation = await this.wsjfCalculator.recommendBatch(entry, riskAssessment);
            
            return {
              ...entry,
              wsjfScore: wsjfResult.wsjfScore,
              riskLevel: riskAssessment.overallRisk,
              batchRecommendation,
              lastUpdated: new Date().toISOString()
            };
          })
        );
      }
    }
    
    return enhanced;
  }

  /**
   * Calculate WSJF scores for patterns
   */
  private async calculatePatternWSJF(patternData: any[]): Promise<any[]> {
    return Promise.all(
      patternData.map(async (pattern: any) => {
        const wsjfResult = await this.wsjfCalculator.calculateWSJF(pattern);
        return {
          ...pattern,
          wsjfScore: wsjfResult.wsjfScore,
          lastUpdated: new Date().toISOString()
        };
      })
    );
  }

  /**
   * Handle governance action from agent
   */
  private handleGovernanceAction(data: any): void {
    // Update Kanban board if needed
    if (data.kanbanUpdate) {
      this.refreshKanbanBoard();
    }
    
    // Emit integration event
    this.emit('governance-action', {
      type: 'governance-action',
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle retro completion from coach
   */
  private handleRetroCompleted(data: any): void {
    // Update analytics with retro insights
    this.refreshAnalytics();
    
    // Update pattern metrics if new patterns identified
    if (data.newPatterns) {
      this.refreshPatternMetrics();
    }
    
    // Emit integration event
    this.emit('retro-completed', {
      type: 'retro-completed',
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle batch execution from batching system
   */
  private handleBatchExecuted(data: BatchExecutionResult): void {
    // Update Kanban board with execution results
    this.refreshKanbanBoard();
    
    // Update analytics with batch performance
    this.refreshAnalytics();
    
    // Emit integration event
    this.emit('batch-executed', {
      type: 'batch-executed',
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle analytics update
   */
  private handleAnalyticsUpdated(data: AnalyticsSummary): void {
    // Check if any items need prioritization updates
    if (data.recommendations.some(r => r.type === 'priority')) {
      this.refreshKanbanBoard();
    }
    
    // Emit integration event
    this.emit('analytics-updated', {
      type: 'analytics-updated',
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Load Kanban data from file
   */
  private loadKanbanData(): any {
    const kanbanPath = path.join(this.config.goalieDir, 'KANBAN_BOARD.yaml');
    
    if (!fs.existsSync(kanbanPath)) {
      return { NOW: [], NEXT: [], LATER: [] };
    }
    
    try {
      const yaml = require('yaml');
      const content = fs.readFileSync(kanbanPath, 'utf8');
      return yaml.parse(content) || { NOW: [], NEXT: [], LATER: [] };
    } catch (error) {
      console.error('Failed to load Kanban data:', error);
      return { NOW: [], NEXT: [], LATER: [] };
    }
  }

  /**
   * Save Kanban data to file
   */
  private saveKanbanData(data: any): void {
    const kanbanPath = path.join(this.config.goalieDir, 'KANBAN_BOARD.yaml');
    
    try {
      const yaml = require('yaml');
      const content = yaml.stringify(data, { indent: 2 });
      fs.writeFileSync(kanbanPath, content, 'utf8');
    } catch (error) {
      console.error('Failed to save Kanban data:', error);
    }
  }

  /**
   * Load pattern data from file
   */
  private loadPatternData(): any[] {
    const patternPath = path.join(this.config.goalieDir, 'pattern_metrics.jsonl');
    
    if (!fs.existsSync(patternPath)) {
      return [];
    }
    
    try {
      const lines = fs.readFileSync(patternPath, 'utf8').split(/\r?\n/).filter(Boolean);
      return lines.map(line => JSON.parse(line));
    } catch (error) {
      console.error('Failed to load pattern data:', error);
      return [];
    }
  }

  /**
   * Save pattern metrics to file
   */
  private savePatternMetrics(patterns: any[]): void {
    const patternPath = path.join(this.config.goalieDir, 'pattern_metrics.jsonl');
    
    try {
      const lines = patterns.map(pattern => JSON.stringify(pattern)).join('\n');
      fs.writeFileSync(patternPath, lines + '\n', 'utf8');
    } catch (error) {
      console.error('Failed to save pattern metrics:', error);
    }
  }

  /**
   * Load batch history
   */
  private loadBatchHistory(): BatchExecutionResult[] {
    const historyPath = path.join(this.config.goalieDir, 'batch_history.json');
    
    if (!fs.existsSync(historyPath)) {
      return [];
    }
    
    try {
      const content = fs.readFileSync(historyPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to load batch history:', error);
      return [];
    }
  }

  /**
   * Check for pending batch executions
   */
  private async checkPendingBatches(): Promise<void> {
    try {
      const pendingPlans = await this.batchingSystem.getPendingPlans();
      
      for (const plan of pendingPlans) {
        // Auto-approve low-risk items if configured
        if (this.config.batching.autoApproveLowRisk) {
          const lowRiskItems = plan.items.filter(item => 
            item.riskLevel && item.riskLevel <= this.config.batching.riskThreshold
          );
          
          for (const item of lowRiskItems) {
            await this.batchingSystem.approveItem(plan.id, item.id);
          }
        }
        
        // Execute plan if all items are approved
        const approvedItems = plan.items.filter(item => item.approvalStatus === 'approved');
        if (approvedItems.length === plan.items.length) {
          await this.batchingSystem.executePlan(plan.id);
        }
      }
    } catch (error) {
      console.error('Failed to check pending batches:', error);
    }
  }

  /**
   * Start WebSocket server for real-time updates
   */
  private async startWebSocketServer(): Promise<void> {
    // WebSocket server implementation would go here
    // For now, we'll emit events that can be consumed by the VS Code extension
    console.log('WebSocket server would be started here');
  }

  /**
   * Stop WebSocket server
   */
  private async stopWebSocketServer(): Promise<void> {
    // WebSocket server shutdown would go here
    console.log('WebSocket server would be stopped here');
  }

  /**
   * Send WebSocket update to connected clients
   */
  private sendWebSocketUpdate(message: RealtimeUpdateMessage): void {
    // WebSocket message sending would go here
    // For now, we'll emit events that can be consumed by the VS Code extension
    this.emit('websocket-update', message);
  }

  /**
   * Load Kanban board (alias for refreshKanbanBoard)
   */
  private async loadKanbanBoard(): Promise<void> {
    await this.refreshKanbanBoard();
  }

  /**
   * Load pattern metrics (alias for refreshPatternMetrics)
   */
  private async loadPatternMetrics(): Promise<void> {
    await this.refreshPatternMetrics();
  }

  /**
   * Generate analytics (alias for refreshAnalytics)
   */
  private async generateAnalytics(): Promise<void> {
    await this.refreshAnalytics();
  }

  /**
   * Get current integration status
   */
  getStatus(): {
    isRunning: boolean;
    components: {
      governanceAgent: boolean;
      retroCoach: boolean;
      wsjfCalculator: boolean;
      analytics: boolean;
      batchingSystem: boolean;
    };
    lastUpdate: string;
  } {
    return {
      isRunning: this.isRunning,
      components: {
        governanceAgent: !!this.governanceAgent,
        retroCoach: !!this.retroCoach,
        wsjfCalculator: !!this.wsjfCalculator,
        analytics: !!this.analytics,
        batchingSystem: !!this.batchingSystem
      },
      lastUpdate: new Date().toISOString()
    };
  }
}

/**
 * Export the integration manager as default
 */
export default GoalieIntegrationManager;