/**
 * Integration Layer
 * 
 * Connects all existing systems (WSJF, governance, AgentDB, ontology, etc.)
 * with the execution tracking and TODO systems
 */

import { EventEmitter } from 'events';
import { OrchestrationFramework } from '../core/orchestration-framework';
import { HealthCheckSystem } from '../core/health-checks';
import { WSJFScoringService } from '../wsjf';
import { ExecutionTrackerSystem } from './execution-tracker';
import { TodoSystem } from './todo-system';
import { RelentlessExecutionEngine } from './execution-engine';
import { AgentCoordinationSystem } from './agent-coordination';
import { OntologyService } from '../ontology';
import { 
  EngineIntegration, 
  IntegrationEvent, 
  IntegrationStatus,
  ExecutionTrackingError
} from './types';

export interface SystemIntegration {
  id: string;
  name: string;
  type: 'wsjf' | 'governance' | 'affinity' | 'financial' | 'learning' | 'ontology' | 'agentdb' | 'mcp' | 'health';
  enabled: boolean;
  status: IntegrationStatus;
  configuration: Record<string, any>;
  lastSync: Date;
  errorCount: number;
  lastError?: Error;
  metrics: {
    syncCount: number;
    successCount: number;
    errorCount: number;
    averageSyncTime: number;
    lastSyncDuration: number;
  };
}

export interface IntegrationConfig {
  wsjf?: {
    enabled: boolean;
    syncInterval: number;
    autoCalculateScores: boolean;
    weightFactors: Record<string, number>;
  };
  governance?: {
    enabled: boolean;
    syncInterval: number;
    enforcePolicies: boolean;
    riskAssessment: boolean;
  };
  ontology?: {
    enabled: boolean;
    syncInterval: number;
    semanticReasoning: boolean;
    contextAwareness: boolean;
  };
  health?: {
    enabled: boolean;
    syncInterval: number;
    monitorSystemHealth: boolean;
    alertThresholds: Record<string, number>;
  };
  agentdb?: {
    enabled: boolean;
    syncInterval: number;
    persistenceEnabled: boolean;
    cacheEnabled: boolean;
  };
  mcp?: {
    enabled: boolean;
    syncInterval: number;
    toolDiscovery: boolean;
    protocolVersion: string;
  };
}

export class IntegrationLayer extends EventEmitter {
  private integrations: Map<string, SystemIntegration> = new Map();
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();
  private eventBuffer: IntegrationEvent[] = [];
  private isRunning: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(
    private orchestrationFramework: OrchestrationFramework,
    private healthCheckSystem: HealthCheckSystem,
    private wsjfService: WSJFScoringService,
    private executionTracker: ExecutionTrackerSystem,
    private todoSystem: TodoSystem,
    private executionEngine: RelentlessExecutionEngine,
    private agentCoordination: AgentCoordinationSystem,
    private ontologyService?: OntologyService
  ) {
    super();
  }

  /**
   * Start integration layer
   */
  public async start(config: IntegrationConfig = {}): Promise<void> {
    if (this.isRunning) {
      console.log('[INTEGRATION] Integration layer already running');
      return;
    }

    this.isRunning = true;
    console.log('[INTEGRATION] Starting integration layer');

    // Initialize integrations based on config
    await this.initializeIntegrations(config);

    // Start event processing
    this.processingInterval = setInterval(() => {
      this.processEventBuffer();
    }, 1000); // Process events every second

    // Set up event listeners for all systems
    this.setupEventListeners();

    console.log('[INTEGRATION] Integration layer started');
    this.emit('integrationLayerStarted');
  }

  /**
   * Stop integration layer
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Clear all sync intervals
    for (const [id, interval] of this.syncIntervals) {
      clearInterval(interval);
    }
    this.syncIntervals.clear();

    // Clear processing interval
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    // Process remaining events
    await this.processEventBuffer();

    console.log('[INTEGRATION] Integration layer stopped');
    this.emit('integrationLayerStopped');
  }

  /**
   * Get integration by ID
   */
  public getIntegration(integrationId: string): SystemIntegration | undefined {
    return this.integrations.get(integrationId);
  }

  /**
   * Get all integrations
   */
  public getIntegrations(): SystemIntegration[] {
    return Array.from(this.integrations.values());
  }

  /**
   * Enable integration
   */
  public async enableIntegration(integrationId: string): Promise<void> {
    const integration = this.integrations.get(integrationId);
    if (!integration) {
      throw new ExecutionTrackingError(
        `Integration not found: ${integrationId}`,
        'INTEGRATION_NOT_FOUND',
        integrationId
      );
    }

    if (integration.enabled) {
      return; // Already enabled
    }

    integration.enabled = true;
    integration.status = 'active';
    integration.lastSync = new Date();

    // Start sync interval
    await this.startSyncInterval(integration);

    console.log(`[INTEGRATION] Enabled integration: ${integration.name} (${integrationId})`);
    this.emit('integrationEnabled', integration);
  }

  /**
   * Disable integration
   */
  public async disableIntegration(integrationId: string): Promise<void> {
    const integration = this.integrations.get(integrationId);
    if (!integration) {
      throw new ExecutionTrackingError(
        `Integration not found: ${integrationId}`,
        'INTEGRATION_NOT_FOUND',
        integrationId
      );
    }

    if (!integration.enabled) {
      return; // Already disabled
    }

    integration.enabled = false;
    integration.status = 'inactive';

    // Stop sync interval
    const interval = this.syncIntervals.get(integrationId);
    if (interval) {
      clearInterval(interval);
      this.syncIntervals.delete(integrationId);
    }

    console.log(`[INTEGRATION] Disabled integration: ${integration.name} (${integrationId})`);
    this.emit('integrationDisabled', integration);
  }

  /**
   * Sync integration manually
   */
  public async syncIntegration(integrationId: string): Promise<void> {
    const integration = this.integrations.get(integrationId);
    if (!integration) {
      throw new ExecutionTrackingError(
        `Integration not found: ${integrationId}`,
        'INTEGRATION_NOT_FOUND',
        integrationId
      );
    }

    if (!integration.enabled) {
      throw new ExecutionTrackingError(
        `Integration is disabled: ${integrationId}`,
        'INTEGRATION_DISABLED',
        integrationId
      );
    }

    const startTime = Date.now();
    try {
      await this.performIntegrationSync(integration);
      
      const duration = Date.now() - startTime;
      integration.lastSync = new Date();
      integration.metrics.syncCount++;
      integration.metrics.successCount++;
      integration.metrics.lastSyncDuration = duration;
      integration.metrics.averageSyncTime = 
        (integration.metrics.averageSyncTime * (integration.metrics.syncCount - 1) + duration) / integration.metrics.syncCount;
      
      integration.errorCount = 0; // Reset error count on successful sync
      delete integration.lastError;

      console.log(`[INTEGRATION] Synced integration: ${integration.name} (${integrationId}) in ${duration}ms`);
      this.emit('integrationSynced', { integration, duration });

    } catch (error) {
      const duration = Date.now() - startTime;
      integration.errorCount++;
      integration.lastError = error as Error;
      integration.metrics.errorCount++;
      integration.metrics.lastSyncDuration = duration;

      console.error(`[INTEGRATION] Failed to sync integration: ${integration.name} (${integrationId})`, error);
      this.emit('integrationSyncFailed', { integration, error, duration });
    }
  }

  /**
   * Get integration health status
   */
  public getIntegrationHealth(): {
    overall: 'healthy' | 'warning' | 'critical';
    integrations: Record<string, IntegrationStatus>;
    issues: string[];
    recommendations: string[];
  } {
    const integrations = Array.from(this.integrations.values());
    const statusCounts = {
      healthy: 0,
      warning: 0,
      critical: 0,
      inactive: 0,
      error: 0,
      unknown: 0
    };

    const integrationStatuses: Record<string, IntegrationStatus> = {};
    const issues: string[] = [];
    const recommendations: string[] = [];

    for (const integration of integrations) {
      integrationStatuses[integration.id] = integration.status;
      statusCounts[integration.status]++;

      // Check for issues
      if (integration.errorCount > 5) {
        issues.push(`Integration ${integration.name} has ${integration.errorCount} consecutive errors`);
        recommendations.push(`Check ${integration.name} configuration and connectivity`);
      }

      if (integration.lastError && (Date.now() - integration.lastError.getTime()) < 300000) { // 5 minutes
        issues.push(`Integration ${integration.name} had recent error: ${integration.lastError.message}`);
      }

      if (!integration.enabled && integration.type !== 'health') {
        recommendations.push(`Consider enabling ${integration.name} integration for full functionality`);
      }
    }

    // Determine overall status
    let overall: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (statusCounts.critical > 0 || statusCounts.error > 2) {
      overall = 'critical';
    } else if (statusCounts.warning > 0 || statusCounts.error > 0) {
      overall = 'warning';
    }

    return {
      overall,
      integrations: integrationStatuses,
      issues,
      recommendations
    };
  }

  /**
   * Initialize integrations
   */
  private async initializeIntegrations(config: IntegrationConfig): Promise<void> {
    // WSJF Integration
    if (config.wsjf?.enabled !== false) {
      await this.createIntegration({
        id: 'wsjf',
        name: 'WSJF Prioritization',
        type: 'wsjf',
        enabled: config.wsjf?.enabled ?? true,
        configuration: {
          syncInterval: config.wsjf?.syncInterval || 60000,
          autoCalculateScores: config.wsjf?.autoCalculateScores ?? true,
          weightFactors: config.wsjf?.weightFactors || {}
        }
      });
    }

    // Governance Integration
    if (config.governance?.enabled !== false) {
      await this.createIntegration({
        id: 'governance',
        name: 'Governance System',
        type: 'governance',
        enabled: config.governance?.enabled ?? true,
        configuration: {
          syncInterval: config.governance?.syncInterval || 30000,
          enforcePolicies: config.governance?.enforcePolicies ?? true,
          riskAssessment: config.governance?.riskAssessment ?? true
        }
      });
    }

    // Ontology Integration
    if (this.ontologyService && config.ontology?.enabled !== false) {
      await this.createIntegration({
        id: 'ontology',
        name: 'Ontology Service',
        type: 'ontology',
        enabled: config.ontology?.enabled ?? true,
        configuration: {
          syncInterval: config.ontology?.syncInterval || 45000,
          semanticReasoning: config.ontology?.semanticReasoning ?? true,
          contextAwareness: config.ontology?.contextAwareness ?? true
        }
      });
    }

    // Health Check Integration
    if (config.health?.enabled !== false) {
      await this.createIntegration({
        id: 'health',
        name: 'Health Check System',
        type: 'health',
        enabled: config.health?.enabled ?? true,
        configuration: {
          syncInterval: config.health?.syncInterval || 30000,
          monitorSystemHealth: config.health?.monitorSystemHealth ?? true,
          alertThresholds: config.health?.alertThresholds || {}
        }
      });
    }

    // AgentDB Integration (mock for now)
    if (config.agentdb?.enabled !== false) {
      await this.createIntegration({
        id: 'agentdb',
        name: 'AgentDB Memory System',
        type: 'agentdb',
        enabled: config.agentdb?.enabled ?? true,
        configuration: {
          syncInterval: config.agentdb?.syncInterval || 60000,
          persistenceEnabled: config.agentdb?.persistenceEnabled ?? true,
          cacheEnabled: config.agentdb?.cacheEnabled ?? true
        }
      });
    }

    // MCP Integration (mock for now)
    if (config.mcp?.enabled !== false) {
      await this.createIntegration({
        id: 'mcp',
        name: 'MCP Protocol',
        type: 'mcp',
        enabled: config.mcp?.enabled ?? true,
        configuration: {
          syncInterval: config.mcp?.syncInterval || 30000,
          toolDiscovery: config.mcp?.toolDiscovery ?? true,
          protocolVersion: config.mcp?.protocolVersion || '1.0'
        }
      });
    }
  }

  /**
   * Create integration
   */
  private async createIntegration(integrationData: Omit<SystemIntegration, 'status' | 'lastSync' | 'errorCount' | 'metrics'>): Promise<void> {
    const integration: SystemIntegration = {
      status: 'inactive',
      lastSync: new Date(),
      errorCount: 0,
      metrics: {
        syncCount: 0,
        successCount: 0,
        errorCount: 0,
        averageSyncTime: 0,
        lastSyncDuration: 0
      },
      ...integrationData
    };

    this.integrations.set(integration.id, integration);

    // Start sync interval if enabled
    if (integration.enabled) {
      await this.enableIntegration(integration.id);
    }

    console.log(`[INTEGRATION] Created integration: ${integration.name} (${integration.id})`);
    this.emit('integrationCreated', integration);
  }

  /**
   * Setup event listeners for all systems
   */
  private setupEventListeners(): void {
    // Execution Tracker Events
    this.executionTracker.on('executionStarted', (data) => {
      this.bufferEvent('execution_tracker', 'execution_started', data);
    });

    this.executionTracker.on('executionCompleted', (data) => {
      this.bufferEvent('execution_tracker', 'execution_completed', data);
    });

    // TODO System Events
    this.todoSystem.on('todoCreated', (todo) => {
      this.bufferEvent('todo_system', 'todo_created', todo);
    });

    this.todoSystem.on('todoCompleted', (todo) => {
      this.bufferEvent('todo_system', 'todo_completed', todo);
    });

    // Execution Engine Events
    this.executionEngine.on('executionStarted', (data) => {
      this.bufferEvent('execution_engine', 'execution_started', data);
    });

    this.executionEngine.on('executionCompleted', (data) => {
      this.bufferEvent('execution_engine', 'execution_completed', data);
    });

    // Agent Coordination Events
    this.agentCoordination.on('sessionCreated', (session) => {
      this.bufferEvent('agent_coordination', 'session_created', session);
    });

    this.agentCoordination.on('sessionEnded', (data) => {
      this.bufferEvent('agent_coordination', 'session_ended', data);
    });

    // Orchestration Framework Events
    this.orchestrationFramework.on('planCreated', (plan) => {
      this.bufferEvent('orchestration', 'plan_created', plan);
    });

    this.orchestrationFramework.on('doCreated', (doItem) => {
      this.bufferEvent('orchestration', 'do_created', doItem);
    });

    this.orchestrationFramework.on('actCreated', (act) => {
      this.bufferEvent('orchestration', 'act_created', act);
    });

    // Health Check Events
    this.healthCheckSystem.on('healthUpdate', (health) => {
      this.bufferEvent('health_check', 'health_update', health);
    });

    // Ontology Events (if available)
    if (this.ontologyService) {
      this.ontologyService.on('reasoningComplete', (data) => {
        this.bufferEvent('ontology', 'reasoning_complete', data);
      });

      this.ontologyService.on('contextUpdate', (context) => {
        this.bufferEvent('ontology', 'context_update', context);
      });
    }
  }

  /**
   * Buffer event for processing
   */
  private bufferEvent(source: string, type: string, data: any): void {
    const event: IntegrationEvent = {
      id: this.generateId('event'),
      timestamp: new Date(),
      source,
      type,
      data
    };

    this.eventBuffer.push(event);

    // Limit buffer size
    if (this.eventBuffer.length > 1000) {
      this.eventBuffer = this.eventBuffer.slice(-500); // Keep last 500 events
    }
  }

  /**
   * Process event buffer
   */
  private async processEventBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) {
      return;
    }

    const events = this.eventBuffer.splice(0); // Get all events
    this.eventBuffer = [];

    for (const event of events) {
      await this.processEvent(event);
    }
  }

  /**
   * Process individual event
   */
  private async processEvent(event: IntegrationEvent): Promise<void> {
    try {
      // Route event to relevant integrations
      for (const integration of this.integrations.values()) {
        if (!integration.enabled) continue;

        await this.routeEventToIntegration(event, integration);
      }
    } catch (error) {
      console.error(`[INTEGRATION] Error processing event: ${event.type}`, error);
      this.emit('eventProcessingError', { event, error });
    }
  }

  /**
   * Route event to specific integration
   */
  private async routeEventToIntegration(event: IntegrationEvent, integration: SystemIntegration): Promise<void> {
    switch (integration.type) {
      case 'wsjf':
        await this.routeToWSJF(event, integration);
        break;
      
      case 'governance':
        await this.routeToGovernance(event, integration);
        break;
      
      case 'ontology':
        await this.routeToOntology(event, integration);
        break;
      
      case 'health':
        await this.routeToHealth(event, integration);
        break;
      
      case 'agentdb':
        await this.routeToAgentDB(event, integration);
        break;
      
      case 'mcp':
        await this.routeToMCP(event, integration);
        break;
    }
  }

  /**
   * Route event to WSJF integration
   */
  private async routeToWSJF(event: IntegrationEvent, integration: SystemIntegration): Promise<void> {
    const config = integration.configuration;
    
    switch (event.source) {
      case 'todo_system':
        if (event.type === 'todo_created' && config.autoCalculateScores) {
          // Calculate WSJF score for new TODO
          const todo = event.data;
          // This would call actual WSJF service
          console.log(`[INTEGRATION] Calculating WSJF score for TODO: ${todo.id}`);
        }
        break;
      
      case 'execution_tracker':
        if (event.type === 'execution_completed') {
          // Update WSJF parameters based on execution results
          console.log(`[INTEGRATION] Updating WSJF parameters based on execution: ${event.data.executionState.id}`);
        }
        break;
    }
  }

  /**
   * Route event to governance integration
   */
  private async routeToGovernance(event: IntegrationEvent, integration: SystemIntegration): Promise<void> {
    const config = integration.configuration;
    
    if (!config.enforcePolicies) return;

    switch (event.source) {
      case 'todo_system':
        if (event.type === 'todo_created' && config.riskAssessment) {
          // Perform risk assessment for new TODO
          const todo = event.data;
          console.log(`[INTEGRATION] Performing risk assessment for TODO: ${todo.id}`);
        }
        break;
      
      case 'execution_engine':
        if (event.type === 'execution_started') {
          // Check governance policies before execution
          console.log(`[INTEGRATION] Checking governance policies for execution: ${event.data.request.id}`);
        }
        break;
    }
  }

  /**
   * Route event to ontology integration
   */
  private async routeToOntology(event: IntegrationEvent, integration: SystemIntegration): Promise<void> {
    if (!this.ontologyService) return;

    const config = integration.configuration;
    
    if (!config.semanticReasoning) return;

    switch (event.source) {
      case 'todo_system':
        if (event.type === 'todo_created' && config.contextAwareness) {
          // Add semantic context to TODO
          const todo = event.data;
          console.log(`[INTEGRATION] Adding semantic context to TODO: ${todo.id}`);
        }
        break;
      
      case 'agent_coordination':
        if (event.type === 'session_created') {
          // Add semantic reasoning to coordination session
          const session = event.data;
          console.log(`[INTEGRATION] Adding semantic reasoning to session: ${session.id}`);
        }
        break;
    }
  }

  /**
   * Route event to health check integration
   */
  private async routeToHealth(event: IntegrationEvent, integration: SystemIntegration): Promise<void> {
    const config = integration.configuration;
    
    if (!config.monitorSystemHealth) return;

    // Update health metrics based on events
    switch (event.type) {
      case 'execution_completed':
        // Update execution health metrics
        console.log(`[INTEGRATION] Updating health metrics for execution: ${event.data.result.id}`);
        break;
      
      case 'todo_completed':
        // Update TODO health metrics
        console.log(`[INTEGRATION] Updating health metrics for TODO: ${event.data.todo.id}`);
        break;
    }
  }

  /**
   * Route event to AgentDB integration
   */
  private async routeToAgentDB(event: IntegrationEvent, integration: SystemIntegration): Promise<void> {
    const config = integration.configuration;
    
    if (!config.persistenceEnabled) return;

    // Store events in AgentDB for persistence and learning
    console.log(`[INTEGRATION] Storing event in AgentDB: ${event.type} from ${event.source}`);
    
    // This would integrate with actual AgentDB
    // For now, just log the event
  }

  /**
   * Route event to MCP integration
   */
  private async routeToMCP(event: IntegrationEvent, integration: SystemIntegration): Promise<void> {
    const config = integration.configuration;
    
    if (!config.toolDiscovery) return;

    // Discover and route to appropriate MCP tools
    console.log(`[INTEGRATION] Routing event to MCP tools: ${event.type} from ${event.source}`);
    
    // This would integrate with actual MCP protocol
    // For now, just log the event
  }

  /**
   * Start sync interval for integration
   */
  private async startSyncInterval(integration: SystemIntegration): Promise<void> {
    const interval = integration.configuration.syncInterval || 60000;
    
    const syncInterval = setInterval(() => {
      this.syncIntegration(integration.id).catch(error => {
        console.error(`[INTEGRATION] Auto-sync failed for ${integration.name}:`, error);
      });
    }, interval);

    this.syncIntervals.set(integration.id, syncInterval);
  }

  /**
   * Perform integration sync
   */
  private async performIntegrationSync(integration: SystemIntegration): Promise<void> {
    switch (integration.type) {
      case 'wsjf':
        await this.syncWSJF(integration);
        break;
      
      case 'governance':
        await this.syncGovernance(integration);
        break;
      
      case 'ontology':
        await this.syncOntology(integration);
        break;
      
      case 'health':
        await this.syncHealth(integration);
        break;
      
      case 'agentdb':
        await this.syncAgentDB(integration);
        break;
      
      case 'mcp':
        await this.syncMCP(integration);
        break;
    }
  }

  /**
   * Sync WSJF integration
   */
  private async syncWSJF(integration: SystemIntegration): Promise<void> {
    // Sync TODO items with WSJF service
    const todos = await this.todoSystem.queryTodos();
    
    for (const todo of todos.results) {
      if (todo.wsjfScore === undefined) {
        // Calculate WSJF score
        const score = await this.wsjfService.calculateScore({
          userBusinessValue: this.mapPriorityToValue(todo.priority),
          timeCriticality: this.getTimeCriticality(todo),
          customerValue: this.mapCategoryToValue(todo.category),
          riskReduction: this.getRiskReduction(todo),
          opportunityEnablement: this.getOpportunityEnablement(todo)
        });
        
        await this.todoSystem.updateTodo(todo.id, { wsjfScore: score });
      }
    }
  }

  /**
   * Sync governance integration
   */
  private async syncGovernance(integration: SystemIntegration): Promise<void> {
    // Sync governance policies and perform risk assessments
    console.log(`[INTEGRATION] Syncing governance integration`);
    
    // This would integrate with actual governance system
    // For now, just perform mock operations
  }

  /**
   * Sync ontology integration
   */
  private async syncOntology(integration: SystemIntegration): Promise<void> {
    if (!this.ontologyService) return;

    // Sync semantic context and reasoning
    console.log(`[INTEGRATION] Syncing ontology integration`);
    
    // This would integrate with actual ontology service
    // For now, just perform mock operations
  }

  /**
   * Sync health check integration
   */
  private async syncHealth(integration: SystemIntegration): Promise<void> {
    // Sync health metrics and perform health checks
    const health = await this.healthCheckSystem.performHealthChecks();
    
    // Check alert thresholds
    const thresholds = integration.configuration.alertThresholds;
    for (const [metric, threshold] of Object.entries(thresholds)) {
      const value = (health.metrics as any)[metric];
      if (value > threshold) {
        console.log(`[INTEGRATION] Health alert: ${metric} = ${value} (threshold: ${threshold})`);
        this.emit('healthAlert', { metric, value, threshold });
      }
    }
  }

  /**
   * Sync AgentDB integration
   */
  private async syncAgentDB(integration: SystemIntegration): Promise<void> {
    // Sync data with AgentDB for persistence
    console.log(`[INTEGRATION] Syncing AgentDB integration`);
    
    // This would integrate with actual AgentDB
    // For now, just perform mock operations
  }

  /**
   * Sync MCP integration
   */
  private async syncMCP(integration: SystemIntegration): Promise<void> {
    // Sync with MCP servers and discover tools
    console.log(`[INTEGRATION] Syncing MCP integration`);
    
    // This would integrate with actual MCP protocol
    // For now, just perform mock operations
  }

  /**
   * Helper methods for WSJF calculation
   */
  private mapPriorityToValue(priority: string): number {
    const mapping: Record<string, number> = {
      'critical': 20,
      'highest': 16,
      'high': 12,
      'medium': 8,
      'low': 4,
      'lowest': 1
    };
    return mapping[priority] || 5;
  }

  private getTimeCriticality(todo: any): number {
    if (!todo.dueDate) return 5;
    
    const now = new Date();
    const daysUntilDue = (todo.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysUntilDue < 0) return 20; // Overdue
    if (daysUntilDue < 1) return 18; // Due today
    if (daysUntilDue < 7) return 15; // Due this week
    if (daysUntilDue < 30) return 10; // Due this month
    return 5; // Due later
  }

  private mapCategoryToValue(category: string): number {
    const mapping: Record<string, number> = {
      'bug': 15,
      'feature': 12,
      'improvement': 8,
      'research': 6,
      'documentation': 4,
      'testing': 10,
      'deployment': 14,
      'maintenance': 7
    };
    return mapping[category] || 8;
  }

  private getRiskReduction(todo: any): number {
    // Mock risk reduction calculation
    return Math.random() * 10;
  }

  private getOpportunityEnablement(todo: any): number {
    // Mock opportunity enablement calculation
    return Math.random() * 10;
  }

  /**
   * Generate unique ID
   */
  private generateId(type: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${type}-${timestamp}-${random}`;
  }
}