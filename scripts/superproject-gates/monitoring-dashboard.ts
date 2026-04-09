/**
 * Real-time Monitoring and Dashboard Interfaces
 * 
 * Implements dashboard widgets, data visualization,
 * and real-time monitoring capabilities
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  MonitoringDashboard,
  DashboardLayout,
  DashboardWidget,
  WidgetType,
  ChartType,
  WidgetPosition,
  WidgetSize,
  WidgetConfiguration,
  WidgetDataSource,
  TimeRange,
  AggregationType,
  DataTransformation,
  DashboardFilter,
  FilterOption,
  ExecutionTrackingError
} from './types';
import { OrchestrationFramework } from '../core/orchestration-framework';
import { ExecutionTrackerSystem } from './execution-tracker';
import { TodoSystem } from './todo-system';
import { RelentlessExecutionEngine } from './execution-engine';
import { AgentCoordinationSystem } from './agent-coordination';
import { IntegrationLayer } from './integration-layer';

export interface DashboardData {
  timestamp: Date;
  executionMetrics: any;
  todoMetrics: any;
  agentMetrics: any;
  systemMetrics: any;
  integrationStatus: any;
}

export interface WidgetData {
  widgetId: string;
  data: any;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface DashboardSubscription {
  id: string;
  dashboardId: string;
  clientId: string;
  filters: DashboardFilter[];
  refreshInterval: number;
  lastUpdate: Date;
}

export class MonitoringDashboardSystem extends EventEmitter {
  private dashboards: Map<string, MonitoringDashboard> = new Map();
  private widgets: Map<string, DashboardWidget> = new Map();
  private subscriptions: Map<string, DashboardSubscription> = new Map();
  private dataCache: Map<string, DashboardData[]> = new Map();
  private isRunning: boolean = false;
  private dataCollectionInterval: NodeJS.Timeout | null = null;
  private refreshInterval: NodeJS.Timeout | null = null;

  constructor(
    private orchestrationFramework: OrchestrationFramework,
    private executionTracker: ExecutionTrackerSystem,
    private todoSystem: TodoSystem,
    private executionEngine: RelentlessExecutionEngine,
    private agentCoordination: AgentCoordinationSystem,
    private integrationLayer: IntegrationLayer
  ) {
    super();
  }

  /**
   * Start monitoring dashboard system
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[MONITORING_DASHBOARD] System already running');
      return;
    }

    this.isRunning = true;
    console.log('[MONITORING_DASHBOARD] Starting monitoring dashboard system');

    // Start data collection
    this.dataCollectionInterval = setInterval(() => {
      this.collectDashboardData();
    }, 5000); // Collect data every 5 seconds

    // Start refresh interval
    this.refreshInterval = setInterval(() => {
      this.refreshSubscriptions();
    }, 1000); // Refresh subscriptions every second

    // Create default dashboard if none exists
    if (this.dashboards.size === 0) {
      await this.createDefaultDashboard();
    }

    console.log('[MONITORING_DASHBOARD] Monitoring dashboard system started');
    this.emit('systemStarted');
  }

  /**
   * Stop monitoring dashboard system
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.dataCollectionInterval) {
      clearInterval(this.dataCollectionInterval);
      this.dataCollectionInterval = null;
    }

    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }

    console.log('[MONITORING_DASHBOARD] Monitoring dashboard system stopped');
    this.emit('systemStopped');
  }

  /**
   * Create a new dashboard
   */
  public async createDashboard(
    name: string,
    description: string = '',
    layout: Partial<DashboardLayout> = {}
  ): Promise<MonitoringDashboard> {
    const defaultLayout: DashboardLayout = {
      type: 'grid',
      columns: 4,
      rows: 3,
      gap: 16,
      responsive: true
    };

    const dashboard: MonitoringDashboard = {
      id: uuidv4(),
      name,
      description,
      layout: { ...defaultLayout, ...layout },
      widgets: [],
      filters: [],
      refreshInterval: 30000, // 30 seconds default
      lastUpdated: new Date()
    };

    this.dashboards.set(dashboard.id, dashboard);

    console.log(`[MONITORING_DASHBOARD] Created dashboard: ${dashboard.name} (${dashboard.id})`);
    this.emit('dashboardCreated', dashboard);

    return dashboard;
  }

  /**
   * Add widget to dashboard
   */
  public async addWidget(
    dashboardId: string,
    type: WidgetType,
    title: string,
    position: WidgetPosition,
    size: WidgetSize,
    configuration: WidgetConfiguration = {},
    dataSource: WidgetDataSource
  ): Promise<DashboardWidget> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new ExecutionTrackingError(
        `Dashboard not found: ${dashboardId}`,
        'DASHBOARD_NOT_FOUND',
        dashboardId
      );
    }

    const widget: DashboardWidget = {
      id: uuidv4(),
      type,
      title,
      position,
      size,
      configuration,
      dataSource,
      refreshInterval: 30000 // 30 seconds default
    };

    dashboard.widgets.push(widget);
    dashboard.lastUpdated = new Date();
    this.widgets.set(widget.id, widget);

    console.log(`[MONITORING_DASHBOARD] Added widget: ${widget.title} (${widget.id}) to dashboard: ${dashboard.name}`);
    this.emit('widgetAdded', { dashboard, widget });

    return widget;
  }

  /**
   * Update widget
   */
  public async updateWidget(
    widgetId: string,
    updates: Partial<DashboardWidget>
  ): Promise<DashboardWidget> {
    const widget = this.widgets.get(widgetId);
    if (!widget) {
      throw new ExecutionTrackingError(
        `Widget not found: ${widgetId}`,
        'WIDGET_NOT_FOUND',
        widgetId
      );
    }

    Object.assign(widget, updates);

    // Update dashboard last updated time
    for (const dashboard of this.dashboards.values()) {
      if (dashboard.widgets.some(w => w.id === widgetId)) {
        dashboard.lastUpdated = new Date();
        break;
      }
    }

    console.log(`[MONITORING_DASHBOARD] Updated widget: ${widget.title} (${widgetId})`);
    this.emit('widgetUpdated', widget);

    return widget;
  }

  /**
   * Remove widget from dashboard
   */
  public async removeWidget(widgetId: string): Promise<void> {
    const widget = this.widgets.get(widgetId);
    if (!widget) {
      throw new ExecutionTrackingError(
        `Widget not found: ${widgetId}`,
        'WIDGET_NOT_FOUND',
        widgetId
      );
    }

    // Remove from widgets map
    this.widgets.delete(widgetId);

    // Remove from dashboard
    for (const dashboard of this.dashboards.values()) {
      const widgetIndex = dashboard.widgets.findIndex(w => w.id === widgetId);
      if (widgetIndex !== -1) {
        dashboard.widgets.splice(widgetIndex, 1);
        dashboard.lastUpdated = new Date();
        break;
      }
    }

    console.log(`[MONITORING_DASHBOARD] Removed widget: ${widget.title} (${widgetId})`);
    this.emit('widgetRemoved', widget);
  }

  /**
   * Get dashboard by ID
   */
  public getDashboard(dashboardId: string): MonitoringDashboard | undefined {
    return this.dashboards.get(dashboardId);
  }

  /**
   * Get all dashboards
   */
  public getDashboards(): MonitoringDashboard[] {
    return Array.from(this.dashboards.values());
  }

  /**
   * Get widget by ID
   */
  public getWidget(widgetId: string): DashboardWidget | undefined {
    return this.widgets.get(widgetId);
  }

  /**
   * Get widgets for dashboard
   */
  public getDashboardWidgets(dashboardId: string): DashboardWidget[] {
    const dashboard = this.dashboards.get(dashboardId);
    return dashboard ? dashboard.widgets : [];
  }

  /**
   * Subscribe to dashboard updates
   */
  public async subscribeToDashboard(
    dashboardId: string,
    clientId: string,
    filters: DashboardFilter[] = [],
    refreshInterval: number = 30000
  ): Promise<string> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new ExecutionTrackingError(
        `Dashboard not found: ${dashboardId}`,
        'DASHBOARD_NOT_FOUND',
        dashboardId
      );
    }

    const subscription: DashboardSubscription = {
      id: uuidv4(),
      dashboardId,
      clientId,
      filters,
      refreshInterval,
      lastUpdate: new Date()
    };

    this.subscriptions.set(subscription.id, subscription);

    console.log(`[MONITORING_DASHBOARD] Client ${clientId} subscribed to dashboard: ${dashboard.name}`);
    this.emit('subscriptionCreated', subscription);

    return subscription.id;
  }

  /**
   * Unsubscribe from dashboard
   */
  public async unsubscribeFromDashboard(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new ExecutionTrackingError(
        `Subscription not found: ${subscriptionId}`,
        'SUBSCRIPTION_NOT_FOUND',
        subscriptionId
      );
    }

    this.subscriptions.delete(subscriptionId);

    console.log(`[MONITORING_DASHBOARD] Client ${subscription.clientId} unsubscribed from dashboard`);
    this.emit('subscriptionRemoved', subscription);
  }

  /**
   * Get dashboard data for subscription
   */
  public async getDashboardData(subscriptionId: string): Promise<WidgetData[]> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new ExecutionTrackingError(
        `Subscription not found: ${subscriptionId}`,
        'SUBSCRIPTION_NOT_FOUND',
        subscriptionId
      );
    }

    const dashboard = this.dashboards.get(subscription.dashboardId);
    if (!dashboard) {
      return [];
    }

    const widgetData: WidgetData[] = [];

    for (const widget of dashboard.widgets) {
      const data = await this.getWidgetData(widget, subscription.filters);
      
      widgetData.push({
        widgetId: widget.id,
        data,
        timestamp: new Date(),
        metadata: {
          widgetType: widget.type,
          refreshInterval: widget.refreshInterval
        }
      });
    }

    subscription.lastUpdate = new Date();

    return widgetData;
  }

  /**
   * Create default dashboard
   */
  private async createDefaultDashboard(): Promise<void> {
    const dashboard = await this.createDashboard(
      'Default Execution Dashboard',
      'Real-time monitoring of execution tracking, TODOs, and system health'
    );

    // Add default widgets
    await this.addWidget(dashboard.id, 'metric', 'Active Executions', { x: 0, y: 0 }, { width: 2, height: 1 }, {
      metric: 'activeExecutions',
      format: 'number',
      thresholds: [5, 10, 15]
    }, {
      type: 'query',
      source: 'execution_engine',
      query: 'activeExecutions'
    });

    await this.addWidget(dashboard.id, 'chart', 'Execution Trends', { x: 2, y: 0 }, { width: 2, height: 1 }, {
      chartType: 'line',
      timeRange: { preset: 'last_hour' as any },
      aggregation: 'sum'
    }, {
      type: 'query',
      source: 'execution_tracker',
      query: 'executionTrends'
    });

    await this.addWidget(dashboard.id, 'gauge', 'System Health', { x: 0, y: 1 }, { width: 1, height: 1 }, {
      min: 0,
      max: 100,
      thresholds: [70, 85, 95]
    }, {
      type: 'metric',
      source: 'health_check',
      metric: 'overallHealth'
    });

    await this.addWidget(dashboard.id, 'table', 'Recent TODOs', { x: 1, y: 1 }, { width: 2, height: 1 }, {
      columns: ['title', 'status', 'priority', 'assignee'],
      maxRows: 10,
      sortable: true
    }, {
      type: 'query',
      source: 'todo_system',
      query: 'recentTodos'
    });

    await this.addWidget(dashboard.id, 'progress', 'TODO Completion Rate', { x: 3, y: 1 }, { width: 1, height: 1 }, {
      showPercentage: true,
      showLabel: true
    }, {
      type: 'metric',
      source: 'todo_system',
      metric: 'completionRate'
    });

    await this.addWidget(dashboard.id, 'alert', 'System Alerts', { x: 0, y: 2 }, { width: 4, height: 1 }, {
      maxAlerts: 10,
      severityLevels: ['low', 'medium', 'high', 'critical']
    }, {
      type: 'stream',
      source: 'integration_layer',
      stream: 'alerts'
    });
  }

  /**
   * Collect dashboard data
   */
  private async collectDashboardData(): Promise<void> {
    try {
      const data: DashboardData = {
        timestamp: new Date(),
        executionMetrics: await this.collectExecutionMetrics(),
        todoMetrics: await this.collectTodoMetrics(),
        agentMetrics: await this.collectAgentMetrics(),
        systemMetrics: await this.collectSystemMetrics(),
        integrationStatus: await this.collectIntegrationStatus()
      };

      // Store in cache
      for (const dashboardId of this.dashboards.keys()) {
        const cache = this.dataCache.get(dashboardId) || [];
        cache.push(data);
        
        // Keep only last 100 data points
        if (cache.length > 100) {
          cache.splice(0, cache.length - 100);
        }
        
        this.dataCache.set(dashboardId, cache);
      }

      this.emit('dataCollected', data);

    } catch (error) {
      console.error('[MONITORING_DASHBOARD] Error collecting dashboard data:', error);
      this.emit('dataCollectionError', error);
    }
  }

  /**
   * Refresh subscriptions
   */
  private async refreshSubscriptions(): Promise<void> {
    const now = Date.now();

    for (const subscription of this.subscriptions.values()) {
      if (now - subscription.lastUpdate.getTime() >= subscription.refreshInterval) {
        try {
          const widgetData = await this.getDashboardData(subscription.id);
          
          this.emit('subscriptionUpdate', {
            subscriptionId: subscription.id,
            clientId: subscription.clientId,
            widgetData
          });

        } catch (error) {
          console.error(`[MONITORING_DASHBOARD] Error refreshing subscription ${subscription.id}:`, error);
          this.emit('subscriptionError', { subscriptionId: subscription.id, error });
        }
      }
    }
  }

  /**
   * Get widget data
   */
  private async getWidgetData(widget: DashboardWidget, filters: DashboardFilter[] = []): Promise<any> {
    switch (widget.type) {
      case 'metric':
        return await this.getMetricWidgetData(widget);
      
      case 'chart':
        return await this.getChartWidgetData(widget, filters);
      
      case 'table':
        return await this.getTableWidgetData(widget, filters);
      
      case 'gauge':
        return await this.getGaugeWidgetData(widget);
      
      case 'progress':
        return await this.getProgressWidgetData(widget);
      
      case 'alert':
        return await this.getAlertWidgetData(widget);
      
      case 'log':
        return await this.getLogWidgetData(widget, filters);
      
      case 'status':
        return await this.getStatusWidgetData(widget);
      
      default:
        return null;
    }
  }

  /**
   * Get metric widget data
   */
  private async getMetricWidgetData(widget: DashboardWidget): Promise<any> {
    const { metric, format = 'number' } = widget.configuration;
    let value = 0;

    switch (widget.dataSource.source) {
      case 'execution_engine':
        const queueStatus = this.executionEngine.getQueueStatus();
        value = (queueStatus as any)[metric] || 0;
        break;
      
      case 'todo_system':
        const todoStats = this.todoSystem.getTodoStatistics();
        value = (todoStats as any)[metric] || 0;
        break;
      
      case 'health_check':
        const health = await this.healthCheckSystem.performHealthChecks();
        value = (health as any)[metric] || 0;
        break;
      
      default:
        value = 0;
    }

    return {
      value,
      formatted: this.formatMetricValue(value, format),
      timestamp: new Date()
    };
  }

  /**
   * Get chart widget data
   */
  private async getChartWidgetData(widget: DashboardWidget, filters: DashboardFilter[]): Promise<any> {
    const { chartType = 'line', timeRange, aggregation = 'average' } = widget.configuration;
    
    // Get time-based data
    const timeData = await this.getTimeSeriesData(widget.dataSource, timeRange, filters);
    
    // Apply aggregation
    const aggregatedData = this.aggregateData(timeData, aggregation);
    
    return {
      chartType,
      data: aggregatedData,
      timeRange,
      aggregation,
      timestamp: new Date()
    };
  }

  /**
   * Get table widget data
   */
  private async getTableWidgetData(widget: DashboardWidget, filters: DashboardFilter[]): Promise<any> {
    const { columns, maxRows = 10, sortable = true } = widget.configuration;
    
    let data: any[] = [];

    switch (widget.dataSource.source) {
      case 'todo_system':
        if (widget.dataSource.query === 'recentTodos') {
          const todoResult = await this.todoSystem.queryTodos(filters, { limit: maxRows });
          data = todoResult.results.map(todo => ({
            id: todo.id,
            title: todo.title,
            status: todo.status,
            priority: todo.priority,
            assignee: todo.assignee,
            dueDate: todo.dueDate,
            createdAt: todo.createdAt
          }));
        }
        break;
      
      case 'execution_tracker':
        if (widget.dataSource.query === 'recentExecutions') {
          const executions = await this.executionTracker.getExecutionHistory(undefined, {
            limit: maxRows,
            ...filters
          });
          data = executions.map(exec => ({
            id: exec.id,
            phase: exec.phase,
            status: exec.status,
            progress: exec.progress,
            startTime: exec.startTime,
            duration: exec.duration
          }));
        }
        break;
    }

    // Apply sorting if enabled
    if (sortable && data.length > 0) {
      const sortColumn = columns[0]; // Sort by first column by default
      data.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
        return 0;
      });
    }

    return {
      columns,
      data,
      totalRows: data.length,
      timestamp: new Date()
    };
  }

  /**
   * Get gauge widget data
   */
  private async getGaugeWidgetData(widget: DashboardWidget): Promise<any> {
    const { min = 0, max = 100, thresholds = [] } = widget.configuration;
    let value = 0;

    switch (widget.dataSource.source) {
      case 'health_check':
        const health = await this.healthCheckSystem.performHealthChecks();
        if (widget.dataSource.metric === 'overallHealth') {
          value = health.overall === 'healthy' ? 100 : 
                   health.overall === 'warning' ? 70 : 30;
        }
        break;
      
      default:
        value = 50; // Default middle value
    }

    return {
      value,
      min,
      max,
      thresholds,
      percentage: ((value - min) / (max - min)) * 100,
      timestamp: new Date()
    };
  }

  /**
   * Get progress widget data
   */
  private async getProgressWidgetData(widget: DashboardWidget): Promise<any> {
    const { showPercentage = true, showLabel = true } = widget.configuration;
    let value = 0;
    let label = '';

    switch (widget.dataSource.source) {
      case 'todo_system':
        const todoStats = this.todoSystem.getTodoStatistics();
        if (widget.dataSource.metric === 'completionRate') {
          value = todoStats.completionRate;
          label = 'TODO Completion Rate';
        }
        break;
      
      default:
        value = 0;
        label = 'Progress';
    }

    return {
      value,
      percentage: showPercentage ? value : undefined,
      label: showLabel ? label : undefined,
      timestamp: new Date()
    };
  }

  /**
   * Get alert widget data
   */
  private async getAlertWidgetData(widget: DashboardWidget): Promise<any> {
    const { maxAlerts = 10, severityLevels = ['low', 'medium', 'high', 'critical'] } = widget.configuration;
    
    // Get recent alerts from integration layer
    const integrationHealth = this.integrationLayer.getIntegrationHealth();
    const alerts: any[] = [];

    // Convert integration issues to alerts
    for (const issue of integrationHealth.issues) {
      alerts.push({
        id: uuidv4(),
        message: issue,
        severity: this.mapIssueToSeverity(issue),
        timestamp: new Date(),
        source: 'integration'
      });
    }

    // Get system alerts
    const systemHealth = await this.healthCheckSystem.performHealthChecks();
    for (const incident of systemHealth.incidents) {
      if (!incident.resolved) {
        alerts.push({
          id: uuidv4(),
          message: incident.description,
          severity: incident.severity,
          timestamp: incident.timestamp,
          source: 'system'
        });
      }
    }

    // Sort by timestamp and limit
    alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const limitedAlerts = alerts.slice(0, maxAlerts);

    return {
      alerts: limitedAlerts,
      totalAlerts: alerts.length,
      severityLevels,
      timestamp: new Date()
    };
  }

  /**
   * Get log widget data
   */
  private async getLogWidgetData(widget: DashboardWidget, filters: DashboardFilter[]): Promise<any> {
    const { maxEntries = 50, levels = ['info', 'warning', 'error'] } = widget.configuration;
    
    // This would get actual log data
    // For now, return mock data
    const logs = [
      { timestamp: new Date(), level: 'info', message: 'System started successfully' },
      { timestamp: new Date(Date.now() - 60000), level: 'warning', message: 'High memory usage detected' },
      { timestamp: new Date(Date.now() - 120000), level: 'error', message: 'Failed to connect to external service' }
    ].filter(log => levels.includes(log.level))
     .slice(0, maxEntries);

    return {
      logs,
      totalEntries: logs.length,
      timestamp: new Date()
    };
  }

  /**
   * Get status widget data
   */
  private async getStatusWidgetData(widget: DashboardWidget): Promise<any> {
    // Get status of various components
    const components = [
      { name: 'Execution Engine', status: 'healthy' },
      { name: 'TODO System', status: 'healthy' },
      { name: 'Agent Coordination', status: 'healthy' },
      { name: 'Integration Layer', status: 'warning' }
    ];

    return {
      components,
      overall: components.every(c => c.status === 'healthy') ? 'healthy' : 'warning',
      timestamp: new Date()
    };
  }

  /**
   * Collect execution metrics
   */
  private async collectExecutionMetrics(): Promise<any> {
    const queueStatus = this.executionEngine.getQueueStatus();
    const resourceUtilization = this.executionEngine.getResourceUtilization();
    const executionHistory = this.executionEngine.getExecutionHistory(10);

    return {
      queueStatus,
      resourceUtilization,
      recentExecutions: executionHistory,
      averageExecutionTime: executionHistory.reduce((sum, exec) => sum + exec.executionTime, 0) / executionHistory.length
    };
  }

  /**
   * Collect TODO metrics
   */
  private async collectTodoMetrics(): Promise<any> {
    const todoStats = this.todoSystem.getTodoStatistics();
    const recentTodos = await this.todoSystem.queryTodos({}, { limit: 10 });

    return {
      statistics: todoStats,
      recentTodos: recentTodos.results
    };
  }

  /**
   * Collect agent metrics
   */
  private async collectAgentMetrics(): Promise<any> {
    const agents = this.agentCoordination.getAgents();
    const activeSessions = this.agentCoordination.getActiveSessions();

    return {
      totalAgents: agents.length,
      onlineAgents: agents.filter(a => a.status === 'online').length,
      activeSessions: activeSessions.length,
      averageCollaborationScore: agents.reduce((sum, a) => sum + a.metrics.collaborationScore, 0) / agents.length
    };
  }

  /**
   * Collect system metrics
   */
  private async collectSystemMetrics(): Promise<any> {
    const health = await this.healthCheckSystem.performHealthChecks();
    
    return {
      overall: health.overall,
      components: health.components,
      metrics: health.metrics,
      incidents: health.incidents
    };
  }

  /**
   * Collect integration status
   */
  private async collectIntegrationStatus(): Promise<any> {
    const integrationHealth = this.integrationLayer.getIntegrationHealth();
    const integrations = this.integrationLayer.getIntegrations();

    return {
      overall: integrationHealth.overall,
      integrations: integrations,
      issues: integrationHealth.issues,
      recommendations: integrationHealth.recommendations
    };
  }

  /**
   * Get time series data
   */
  private async getTimeSeriesData(dataSource: WidgetDataSource, timeRange?: TimeRange, filters: DashboardFilter[] = []): Promise<any[]> {
    // This would get actual time series data
    // For now, return mock data
    const now = new Date();
    const dataPoints = [];
    
    const hours = timeRange?.preset === 'last_hour' ? 1 : 
                  timeRange?.preset === 'last_day' ? 24 : 
                  timeRange?.preset === 'last_week' ? 168 : 1;

    for (let i = 0; i < hours; i++) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      dataPoints.push({
        timestamp,
        value: Math.random() * 100,
        metadata: {}
      });
    }

    return dataPoints.reverse();
  }

  /**
   * Aggregate data
   */
  private aggregateData(data: any[], aggregation: AggregationType): any[] {
    if (data.length === 0) return [];

    switch (aggregation) {
      case 'sum':
        return data.map(d => ({ ...d, value: d.value }));
      
      case 'average':
        return data.map(d => ({ ...d, value: d.value }));
      
      case 'min':
        return data.map(d => ({ ...d, value: d.value }));
      
      case 'max':
        return data.map(d => ({ ...d, value: d.value }));
      
      case 'count':
        return data.map(d => ({ ...d, value: 1 }));
      
      case 'percentile':
        return data.map(d => ({ ...d, value: d.value }));
      
      default:
        return data;
    }
  }

  /**
   * Format metric value
   */
  private formatMetricValue(value: number, format: string): string {
    switch (format) {
      case 'number':
        return value.toFixed(0);
      
      case 'percentage':
        return `${value.toFixed(1)}%`;
      
      case 'duration':
        return `${(value / 1000).toFixed(1)}s`;
      
      case 'bytes':
        return this.formatBytes(value);
      
      default:
        return value.toString();
    }
  }

  /**
   * Format bytes
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Map issue to severity
   */
  private mapIssueToSeverity(issue: string): string {
    if (issue.toLowerCase().includes('critical')) return 'critical';
    if (issue.toLowerCase().includes('error')) return 'high';
    if (issue.toLowerCase().includes('warning')) return 'medium';
    return 'low';
  }
}