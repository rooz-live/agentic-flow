/**
 * Dashboard System
 * 
 * Provides real-time dashboard creation, management, and data visualization
 * with support for multiple widget types and interactive filtering
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  Dashboard,
  Widget,
  WidgetType,
  WidgetPosition,
  WidgetSize,
  WidgetConfiguration,
  WidgetDataSource,
  DashboardFilter,
  FilterOption,
  TimeRange,
  MonitoringError,
  MetricValue,
  Alert
} from '../types';

export interface DashboardSystemConfig {
  refreshInterval: number; // in seconds
  maxConcurrentSubscriptions: number;
  cacheSize: number;
  enableRealTime: boolean;
}

export interface WidgetData {
  widgetId: string;
  data: any;
  timestamp: Date;
  error?: string;
  metadata?: Record<string, any>;
}

export interface DashboardSubscription {
  id: string;
  dashboardId: string;
  clientId: string;
  filters: DashboardFilter[];
  refreshInterval: number;
  lastUpdate: Date;
  active: boolean;
}

export class DashboardSystem extends EventEmitter {
  private dashboards: Map<string, Dashboard> = new Map();
  private widgets: Map<string, Widget> = new Map();
  private subscriptions: Map<string, DashboardSubscription> = new Map();
  private dataCache: Map<string, WidgetData[]> = new Map();
  private refreshInterval?: NodeJS.Timeout;
  private isRunning: boolean = false;

  constructor(
    private config: DashboardSystemConfig,
    private metricsProvider: MetricsProvider,
    private alertProvider: AlertProvider
  ) {
    super();
  }

  /**
   * Start the dashboard system
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[DASHBOARD_SYSTEM] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[DASHBOARD_SYSTEM] Starting dashboard system');

    // Start refresh interval
    this.refreshInterval = setInterval(async () => {
      await this.refreshActiveSubscriptions();
    }, this.config.refreshInterval * 1000);

    // Create default dashboards if none exist
    if (this.dashboards.size === 0) {
      await this.createDefaultDashboards();
    }

    console.log('[DASHBOARD_SYSTEM] Started successfully');
    this.emit('started');
  }

  /**
   * Stop the dashboard system
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = undefined;
    }

    console.log('[DASHBOARD_SYSTEM] Stopped');
    this.emit('stopped');
  }

  /**
   * Create a new dashboard
   */
  public async createDashboard(
    name: string,
    description: string = '',
    environment: string = 'development'
  ): Promise<Dashboard> {
    const dashboard: Dashboard = {
      id: this.generateId('dashboard'),
      name,
      description,
      environment: environment as any,
      layout: {
        type: 'grid',
        columns: 4,
        rows: 3,
        gap: 16,
        responsive: true
      },
      widgets: [],
      filters: [],
      refreshInterval: 30,
      permissions: {
        view: ['*'],
        edit: ['admin'],
        share: ['admin'],
        public: false
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.dashboards.set(dashboard.id, dashboard);

    console.log(`[DASHBOARD_SYSTEM] Created dashboard: ${dashboard.name} (${dashboard.id})`);
    this.emit('dashboardCreated', { dashboard });

    return dashboard;
  }

  /**
   * Update a dashboard
   */
  public async updateDashboard(id: string, updates: Partial<Dashboard>): Promise<Dashboard | undefined> {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) {
      return undefined;
    }

    const updatedDashboard = { ...dashboard, ...updates, updatedAt: new Date() };
    this.dashboards.set(id, updatedDashboard);

    console.log(`[DASHBOARD_SYSTEM] Updated dashboard: ${updatedDashboard.name} (${id})`);
    this.emit('dashboardUpdated', { dashboard: updatedDashboard });

    return updatedDashboard;
  }

  /**
   * Delete a dashboard
   */
  public async deleteDashboard(id: string): Promise<boolean> {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) {
      return false;
    }

    // Remove widgets
    for (const widget of dashboard.widgets) {
      this.widgets.delete(widget.id);
    }

    // Remove subscriptions
    const subscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.dashboardId === id);
    for (const subscription of subscriptions) {
      this.subscriptions.delete(subscription.id);
    }

    // Remove data cache
    this.dataCache.delete(id);

    this.dashboards.delete(id);

    console.log(`[DASHBOARD_SYSTEM] Deleted dashboard: ${dashboard.name} (${id})`);
    this.emit('dashboardDeleted', { dashboardId: id, dashboardName: dashboard.name });

    return true;
  }

  /**
   * Add a widget to a dashboard
   */
  public async addWidget(
    dashboardId: string,
    type: WidgetType,
    title: string,
    position: WidgetPosition,
    size: WidgetSize,
    configuration: WidgetConfiguration = {},
    dataSource: WidgetDataSource
  ): Promise<Widget> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new MonitoringError(
        `Dashboard not found: ${dashboardId}`,
        'DASHBOARD_NOT_FOUND',
        { dashboardId }
      );
    }

    const widget: Widget = {
      id: this.generateId('widget'),
      type,
      title,
      position,
      size,
      configuration,
      dataSource,
      refreshInterval: 30,
      visible: true
    };

    dashboard.widgets.push(widget);
    dashboard.updatedAt = new Date();
    this.widgets.set(widget.id, widget);

    console.log(`[DASHBOARD_SYSTEM] Added widget: ${widget.title} (${widget.id}) to dashboard: ${dashboard.name}`);
    this.emit('widgetAdded', { dashboard, widget });

    return widget;
  }

  /**
   * Update a widget
   */
  public async updateWidget(id: string, updates: Partial<Widget>): Promise<Widget | undefined> {
    const widget = this.widgets.get(id);
    if (!widget) {
      return undefined;
    }

    Object.assign(widget, updates);

    // Update dashboard timestamp
    for (const dashboard of this.dashboards.values()) {
      if (dashboard.widgets.some(w => w.id === id)) {
        dashboard.updatedAt = new Date();
        break;
      }
    }

    console.log(`[DASHBOARD_SYSTEM] Updated widget: ${widget.title} (${id})`);
    this.emit('widgetUpdated', { widget });

    return widget;
  }

  /**
   * Remove a widget from a dashboard
   */
  public async removeWidget(id: string): Promise<boolean> {
    const widget = this.widgets.get(id);
    if (!widget) {
      return false;
    }

    this.widgets.delete(id);

    // Remove from dashboard
    for (const dashboard of this.dashboards.values()) {
      const widgetIndex = dashboard.widgets.findIndex(w => w.id === id);
      if (widgetIndex !== -1) {
        dashboard.widgets.splice(widgetIndex, 1);
        dashboard.updatedAt = new Date();
        break;
      }
    }

    console.log(`[DASHBOARD_SYSTEM] Removed widget: ${widget.title} (${id})`);
    this.emit('widgetRemoved', { widget });

    return true;
  }

  /**
   * Subscribe to dashboard updates
   */
  public async subscribeToDashboard(
    dashboardId: string,
    clientId: string,
    filters: DashboardFilter[] = [],
    refreshInterval: number = 30
  ): Promise<string> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new MonitoringError(
        `Dashboard not found: ${dashboardId}`,
        'DASHBOARD_NOT_FOUND',
        { dashboardId }
      );
    }

    if (this.subscriptions.size >= this.config.maxConcurrentSubscriptions) {
      throw new MonitoringError(
        'Maximum concurrent subscriptions reached',
        'MAX_SUBSCRIPTIONS_REACHED'
      );
    }

    const subscription: DashboardSubscription = {
      id: this.generateId('subscription'),
      dashboardId,
      clientId,
      filters,
      refreshInterval,
      lastUpdate: new Date(),
      active: true
    };

    this.subscriptions.set(subscription.id, subscription);

    console.log(`[DASHBOARD_SYSTEM] Client ${clientId} subscribed to dashboard: ${dashboard.name}`);
    this.emit('subscriptionCreated', { subscription });

    return subscription.id;
  }

  /**
   * Unsubscribe from dashboard updates
   */
  public async unsubscribeFromDashboard(subscriptionId: string): Promise<boolean> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    this.subscriptions.delete(subscriptionId);

    console.log(`[DASHBOARD_SYSTEM] Client ${subscription.clientId} unsubscribed from dashboard`);
    this.emit('subscriptionRemoved', { subscription });

    return true;
  }

  /**
   * Get dashboard data for a subscription
   */
  public async getDashboardData(subscriptionId: string): Promise<WidgetData[]> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription || !subscription.active) {
      throw new MonitoringError(
        `Subscription not found or inactive: ${subscriptionId}`,
        'SUBSCRIPTION_NOT_FOUND',
        { subscriptionId }
      );
    }

    const dashboard = this.dashboards.get(subscription.dashboardId);
    if (!dashboard) {
      return [];
    }

    const widgetData: WidgetData[] = [];

    for (const widget of dashboard.widgets.filter(w => w.visible)) {
      try {
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
      } catch (error) {
        widgetData.push({
          widgetId: widget.id,
          data: null,
          timestamp: new Date(),
          error: error instanceof Error ? error.message : String(error),
          metadata: {
            widgetType: widget.type,
            refreshInterval: widget.refreshInterval
          }
        });
      }
    }

    subscription.lastUpdate = new Date();

    // Cache the data
    const cache = this.dataCache.get(subscription.dashboardId) || [];
    cache.push(...widgetData);
    
    // Keep cache size limited
    if (cache.length > this.config.cacheSize) {
      cache.splice(0, cache.length - this.config.cacheSize);
    }
    
    this.dataCache.set(subscription.dashboardId, cache);

    return widgetData;
  }

  /**
   * Get all dashboards
   */
  public getDashboards(): Dashboard[] {
    return Array.from(this.dashboards.values());
  }

  /**
   * Get dashboard by ID
   */
  public getDashboard(id: string): Dashboard | undefined {
    return this.dashboards.get(id);
  }

  /**
   * Get widget by ID
   */
  public getWidget(id: string): Widget | undefined {
    return this.widgets.get(id);
  }

  /**
   * Get all subscriptions
   */
  public getSubscriptions(): DashboardSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Get data for a specific widget
   */
  private async getWidgetData(widget: Widget, filters: DashboardFilter[]): Promise<any> {
    switch (widget.type) {
      case 'metric':
        return await this.getMetricWidgetData(widget, filters);
      case 'chart':
        return await this.getChartWidgetData(widget, filters);
      case 'table':
        return await this.getTableWidgetData(widget, filters);
      case 'gauge':
        return await this.getGaugeWidgetData(widget, filters);
      case 'progress':
        return await this.getProgressWidgetData(widget, filters);
      case 'alert':
        return await this.getAlertWidgetData(widget, filters);
      case 'status':
        return await this.getStatusWidgetData(widget, filters);
      case 'heatmap':
        return await this.getHeatmapWidgetData(widget, filters);
      case 'funnel':
        return await this.getFunnelWidgetData(widget, filters);
      case 'histogram':
        return await this.getHistogramWidgetData(widget, filters);
      case 'scatter':
        return await this.getScatterWidgetData(widget, filters);
      case 'annotation':
        return await this.getAnnotationWidgetData(widget, filters);
      case 'markdown':
        return await this.getMarkdownWidgetData(widget, filters);
      default:
        throw new MonitoringError(
          `Unsupported widget type: ${widget.type}`,
          'UNSUPPORTED_WIDGET_TYPE',
          { widgetType: widget.type }
        );
    }
  }

  /**
   * Get metric widget data
   */
  private async getMetricWidgetData(widget: Widget, filters: DashboardFilter[]): Promise<any> {
    const { metric, format = 'number' } = widget.configuration;
    
    if (!metric) {
      throw new MonitoringError('Metric widget requires metric configuration', 'MISSING_CONFIG');
    }

    const values = await this.metricsProvider.getMetricValues(metric, this.getTimeRange(widget), filters);
    const latestValue = values.length > 0 ? values[values.length - 1].value : 0;

    return {
      value: latestValue,
      formatted: this.formatValue(latestValue, format),
      timestamp: new Date()
    };
  }

  /**
   * Get chart widget data
   */
  private async getChartWidgetData(widget: Widget, filters: DashboardFilter[]): Promise<any> {
    const { chartType = 'line', timeRange, aggregation = 'average' } = widget.configuration;
    
    if (!widget.dataSource.metrics) {
      throw new MonitoringError('Chart widget requires metrics configuration', 'MISSING_CONFIG');
    }

    const data = [];
    for (const metricId of widget.dataSource.metrics) {
      const series = await this.metricsProvider.getMetricSeries(metricId, this.getTimeRange(widget), aggregation, filters);
      data.push({
        name: series.name,
        data: series.dataPoints.map(dp => ({
          timestamp: dp.timestamp,
          value: dp.value
        }))
      });
    }

    return {
      chartType,
      data,
      timeRange,
      aggregation,
      timestamp: new Date()
    };
  }

  /**
   * Get table widget data
   */
  private async getTableWidgetData(widget: Widget, filters: DashboardFilter[]): Promise<any> {
    const { columns = [], maxRows = 10, query } = widget.configuration;
    
    if (widget.dataSource.type === 'query' && query) {
      // Execute query
      const results = await this.metricsProvider.executeQuery(query, filters);
      return {
        columns,
        data: results.slice(0, maxRows),
        totalRows: results.length,
        timestamp: new Date()
      };
    }

    return {
      columns,
      data: [],
      totalRows: 0,
      timestamp: new Date()
    };
  }

  /**
   * Get gauge widget data
   */
  private async getGaugeWidgetData(widget: Widget, filters: DashboardFilter[]): Promise<any> {
    const { min = 0, max = 100, thresholds = [] } = widget.configuration;
    
    if (!widget.dataSource.metrics || widget.dataSource.metrics.length === 0) {
      throw new MonitoringError('Gauge widget requires metrics configuration', 'MISSING_CONFIG');
    }

    const metricId = widget.dataSource.metrics[0];
    const values = await this.metricsProvider.getMetricValues(metricId, this.getTimeRange(widget), filters);
    const value = values.length > 0 ? values[values.length - 1].value : 0;

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
  private async getProgressWidgetData(widget: Widget, filters: DashboardFilter[]): Promise<any> {
    const { showPercentage = true, showLabel = true } = widget.configuration;
    
    if (!widget.dataSource.metrics || widget.dataSource.metrics.length === 0) {
      throw new MonitoringError('Progress widget requires metrics configuration', 'MISSING_CONFIG');
    }

    const metricId = widget.dataSource.metrics[0];
    const values = await this.metricsProvider.getMetricValues(metricId, this.getTimeRange(widget), filters);
    const value = values.length > 0 ? values[values.length - 1].value : 0;

    return {
      value,
      percentage: showPercentage ? value : undefined,
      label: showLabel ? widget.title : undefined,
      timestamp: new Date()
    };
  }

  /**
   * Get alert widget data
   */
  private async getAlertWidgetData(widget: Widget, filters: DashboardFilter[]): Promise<any> {
    const { maxAlerts = 10, severityLevels = ['error', 'critical'] } = widget.configuration;
    
    const alerts = await this.alertProvider.getAlerts({
      severity: severityLevels as any,
      status: 'active'
    });

    const limitedAlerts = alerts.slice(0, maxAlerts);

    return {
      alerts: limitedAlerts,
      totalAlerts: alerts.length,
      severityLevels,
      timestamp: new Date()
    };
  }

  /**
   * Get status widget data
   */
  private async getStatusWidgetData(widget: Widget, filters: DashboardFilter[]): Promise<any> {
    const components = await this.metricsProvider.getSystemHealth();
    
    return {
      components,
      overall: components.every(c => c.status === 'healthy') ? 'healthy' : 'warning',
      timestamp: new Date()
    };
  }

  /**
   * Get heatmap widget data
   */
  private async getHeatmapWidgetData(widget: Widget, filters: DashboardFilter[]): Promise<any> {
    // Mock heatmap data
    return {
      data: Array.from({ length: 10 }, (_, i) =>
        Array.from({ length: 10 }, (_, j) => ({
          x: i,
          y: j,
          value: Math.random() * 100
        }))
      ).flat(),
      timestamp: new Date()
    };
  }

  /**
   * Get funnel widget data
   */
  private async getFunnelWidgetData(widget: Widget, filters: DashboardFilter[]): Promise<any> {
    // Mock funnel data
    return {
      steps: [
        { name: 'Visitors', value: 1000 },
        { name: 'Signups', value: 200 },
        { name: 'Activations', value: 150 },
        { name: 'Conversions', value: 50 }
      ],
      timestamp: new Date()
    };
  }

  /**
   * Get histogram widget data
   */
  private async getHistogramWidgetData(widget: Widget, filters: DashboardFilter[]): Promise<any> {
    if (!widget.dataSource.metrics || widget.dataSource.metrics.length === 0) {
      throw new MonitoringError('Histogram widget requires metrics configuration', 'MISSING_CONFIG');
    }

    const metricId = widget.dataSource.metrics[0];
    const values = await this.metricsProvider.getMetricValues(metricId, this.getTimeRange(widget), filters);
    
    // Create histogram buckets
    const buckets = 10;
    const min = Math.min(...values.map(v => v.value));
    const max = Math.max(...values.map(v => v.value));
    const bucketSize = (max - min) / buckets;
    
    const histogram = Array.from({ length: buckets }, (_, i) => ({
      min: min + i * bucketSize,
      max: min + (i + 1) * bucketSize,
      count: 0
    }));

    for (const value of values) {
      const bucketIndex = Math.min(Math.floor((value.value - min) / bucketSize), buckets - 1);
      histogram[bucketIndex].count++;
    }

    return {
      histogram,
      timestamp: new Date()
    };
  }

  /**
   * Get scatter widget data
   */
  private async getScatterWidgetData(widget: Widget, filters: DashboardFilter[]): Promise<any> {
    if (!widget.dataSource.metrics || widget.dataSource.metrics.length < 2) {
      throw new MonitoringError('Scatter widget requires at least 2 metrics', 'MISSING_CONFIG');
    }

    const [xMetric, yMetric] = widget.dataSource.metrics;
    const xValues = await this.metricsProvider.getMetricValues(xMetric, this.getTimeRange(widget), filters);
    const yValues = await this.metricsProvider.getMetricValues(yMetric, this.getTimeRange(widget), filters);

    // Align data points by timestamp
    const data = [];
    for (let i = 0; i < Math.min(xValues.length, yValues.length); i++) {
      data.push({
        x: xValues[i].value,
        y: yValues[i].value,
        timestamp: xValues[i].timestamp
      });
    }

    return {
      data,
      xMetric: xMetric,
      yMetric: yMetric,
      timestamp: new Date()
    };
  }

  /**
   * Get annotation widget data
   */
  private async getAnnotationWidgetData(widget: Widget, filters: DashboardFilter[]): Promise<any> {
    return {
      annotations: widget.configuration.annotations || [],
      timestamp: new Date()
    };
  }

  /**
   * Get markdown widget data
   */
  private async getMarkdownWidgetData(widget: Widget, filters: DashboardFilter[]): Promise<any> {
    return {
      content: widget.configuration.content || '',
      timestamp: new Date()
    };
  }

  /**
   * Get time range from widget configuration
   */
  private getTimeRange(widget: Widget): { start: Date; end: Date } {
    const { timeRange } = widget.configuration;
    const end = new Date();
    let start: Date;

    if (timeRange?.preset) {
      switch (timeRange.preset) {
        case 'last_hour':
          start = new Date(end.getTime() - 60 * 60 * 1000);
          break;
        case 'last_6hours':
          start = new Date(end.getTime() - 6 * 60 * 60 * 1000);
          break;
        case 'last_12hours':
          start = new Date(end.getTime() - 12 * 60 * 60 * 1000);
          break;
        case 'last_day':
          start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'last_week':
          start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'last_month':
          start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          start = new Date(end.getTime() - 60 * 60 * 1000);
      }
    } else if (timeRange?.start && timeRange?.end) {
      start = timeRange.start;
      end.setTime(timeRange.end.getTime());
    } else {
      start = new Date(end.getTime() - 60 * 60 * 1000);
    }

    return { start, end };
  }

  /**
   * Format value for display
   */
  private formatValue(value: number, format: string): string {
    switch (format) {
      case 'number':
        return value.toFixed(0);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'duration':
        return `${(value / 1000).toFixed(1)}s`;
      case 'bytes':
        return this.formatBytes(value);
      case 'currency':
        return `$${value.toFixed(2)}`;
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
   * Refresh active subscriptions
   */
  private async refreshActiveSubscriptions(): Promise<void> {
    const now = Date.now();

    for (const subscription of this.subscriptions.values()) {
      if (!subscription.active) {
        continue;
      }

      if (now - subscription.lastUpdate.getTime() >= subscription.refreshInterval * 1000) {
        try {
          const widgetData = await this.getDashboardData(subscription.id);
          
          this.emit('subscriptionUpdate', {
            subscriptionId: subscription.id,
            clientId: subscription.clientId,
            widgetData
          });

        } catch (error) {
          console.error(`[DASHBOARD_SYSTEM] Error refreshing subscription ${subscription.id}:`, error);
          this.emit('subscriptionError', {
            subscriptionId: subscription.id,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }
  }

  /**
   * Create default dashboards
   */
  private async createDefaultDashboards(): Promise<void> {
    // System Overview Dashboard
    const systemDashboard = await this.createDashboard(
      'System Overview',
      'Real-time system health and performance metrics',
      'production'
    );

    await this.addWidget(systemDashboard.id, 'gauge', 'CPU Usage', { x: 0, y: 0 }, { width: 1, height: 1 }, {
      min: 0,
      max: 100,
      thresholds: [70, 85, 95]
    }, {
      type: 'metric',
      source: 'system_cpu_usage'
    });

    await this.addWidget(systemDashboard.id, 'gauge', 'Memory Usage', { x: 1, y: 0 }, { width: 1, height: 1 }, {
      min: 0,
      max: 100,
      thresholds: [70, 85, 95]
    }, {
      type: 'metric',
      source: 'system_memory_usage'
    });

    await this.addWidget(systemDashboard.id, 'chart', 'Response Time', { x: 2, y: 0 }, { width: 2, height: 1 }, {
      chartType: 'line',
      timeRange: { preset: 'last_hour' as any },
      aggregation: 'average'
    }, {
      type: 'query',
      source: 'app_response_time',
      metrics: ['app_response_time']
    });

    await this.addWidget(systemDashboard.id, 'alert', 'Active Alerts', { x: 0, y: 1 }, { width: 4, height: 1 }, {
      maxAlerts: 10,
      severityLevels: ['warning', 'error', 'critical']
    }, {
      type: 'stream',
      source: 'alerts'
    });

    // Business Metrics Dashboard
    const businessDashboard = await this.createDashboard(
      'Business Metrics',
      'Key business indicators and user analytics',
      'production'
    );

    await this.addWidget(businessDashboard.id, 'metric', 'Active Users', { x: 0, y: 0 }, { width: 1, height: 1 }, {
      format: 'number'
    }, {
      type: 'metric',
      source: 'business_active_users'
    });

    await this.addWidget(businessDashboard.id, 'metric', 'Conversion Rate', { x: 1, y: 0 }, { width: 1, height: 1 }, {
      format: 'percentage'
    }, {
      type: 'metric',
      source: 'business_conversion_rate'
    });

    await this.addWidget(businessDashboard.id, 'funnel', 'User Funnel', { x: 2, y: 0 }, { width: 2, height: 1 }, {}, {
      type: 'query',
      source: 'user_funnel'
    });

    await this.addWidget(businessDashboard.id, 'chart', 'Revenue Trend', { x: 0, y: 1 }, { width: 4, height: 1 }, {
      chartType: 'area',
      timeRange: { preset: 'last_day' as any },
      aggregation: 'sum'
    }, {
      type: 'query',
      source: 'business_revenue',
      metrics: ['business_revenue']
    });
  }

  /**
   * Generate unique ID
   */
  private generateId(type: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${type}-${timestamp}-${random}`;
  }

  /**
   * Get system status
   */
  public getStatus(): {
    isRunning: boolean;
    dashboardsCount: number;
    widgetsCount: number;
    activeSubscriptionsCount: number;
    lastRefresh?: Date;
  } {
    const activeSubscriptions = Array.from(this.subscriptions.values()).filter(s => s.active);

    return {
      isRunning: this.isRunning,
      dashboardsCount: this.dashboards.size,
      widgetsCount: this.widgets.size,
      activeSubscriptionsCount: activeSubscriptions.length,
      lastRefresh: new Date() // Would be tracked during refresh
    };
  }
}

/**
 * Metrics Provider Interface
 */
export interface MetricsProvider {
  getMetricValues(metricId: string, timeRange: { start: Date; end: Date }, filters?: DashboardFilter[]): Promise<MetricValue[]>;
  getMetricSeries(metricId: string, timeRange: { start: Date; end: Date }, aggregation: string, filters?: DashboardFilter[]): Promise<any>;
  executeQuery(query: string, filters?: DashboardFilter[]): Promise<any[]>;
  getSystemHealth(): Promise<any[]>;
}

/**
 * Alert Provider Interface
 */
export interface AlertProvider {
  getAlerts(filter?: { severity?: AlertSeverity[]; status?: string }): Promise<Alert[]>;
}