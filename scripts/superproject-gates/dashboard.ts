/**
 * Lean-Agentic Dashboard
 * 
 * Real-time dashboard for lean-agentic workflows with progress tracking,
 * metrics visualization, and actionable insights
 */

import { EventEmitter } from 'events';
import { LeanWorkflowManager } from './lean-workflow-manager';
import { IncrementalExecutionEngine } from './incremental-execution-engine';
import { BMLCycleManager } from './bml-cycle-manager';
import {
  LeanWorkflow,
  LeanWorkflowItem,
  BMLCycle,
  LeanWorkflowMetrics,
  ThroughputMetrics,
  FlowMetrics,
  QualityMetrics,
  EfficiencyMetrics,
  ValueMetrics,
  LearningMetrics,
  FeedbackLoop,
  FeedbackInsight,
  ContinuousImprovement,
  LeanAgenticError,
  LeanAgenticEvent
} from './types';

export interface DashboardConfig {
  refreshInterval: number; // in milliseconds
  enableRealTimeUpdates: boolean;
  enableAnimations: boolean;
  enableNotifications: boolean;
  theme: 'light' | 'dark' | 'auto';
  layout: 'grid' | 'flex' | 'custom';
  widgets: DashboardWidget[];
  filters: DashboardFilter[];
}

export interface DashboardWidget {
  id: string;
  type: 'workflow_overview' | 'wip_monitor' | 'throughput_chart' | 'cycle_time_chart' | 
         'quality_metrics' | 'wsjf_prioritization' | 'bml_cycles' | 'feedback_insights' | 
         'execution_status' | 'resource_utilization' | 'improvement_tracker' | 'alerts_panel';
  title: string;
  position: WidgetPosition;
  size: WidgetSize;
  configuration: WidgetConfiguration;
  dataSource: WidgetDataSource;
  refreshInterval: number;
  visible: boolean;
}

export interface WidgetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WidgetSize {
  width: number;
  height: number;
}

export interface WidgetConfiguration {
  timeRange: TimeRange;
  aggregation: AggregationType;
  filters: string[];
  thresholds: WidgetThreshold[];
  colors: string[];
  showLegend: boolean;
  interactive: boolean;
}

export interface TimeRange {
  start: Date;
  end: Date;
  preset?: 'last_hour' | 'last_day' | 'last_week' | 'last_month' | 'custom';
}

export interface AggregationType {
  type: 'sum' | 'average' | 'min' | 'max' | 'count' | 'percentile';
  interval: 'hourly' | 'daily' | 'weekly' | 'monthly';
}

export interface WidgetThreshold {
  type: 'warning' | 'critical' | 'success';
  value: number;
  color: string;
  enabled: boolean;
}

export interface WidgetDataSource {
  type: 'workflow_metrics' | 'execution_data' | 'bml_cycles' | 'feedback_loops' | 'health_checks';
  source: string;
  query?: string;
  parameters?: Record<string, any>;
}

export interface DashboardFilter {
  id: string;
  name: string;
  field: string;
  type: 'select' | 'multiselect' | 'date' | 'text' | 'number';
  options?: FilterOption[];
  defaultValue?: any;
  required: boolean;
}

export interface FilterOption {
  label: string;
  value: any;
}

export interface DashboardData {
  timestamp: Date;
  workflows: WorkflowDashboardData[];
  metrics: MetricsDashboardData;
  executions: ExecutionDashboardData;
  bmlCycles: BMLDashboardData[];
  feedback: FeedbackDashboardData;
  alerts: AlertData[];
  insights: InsightData[];
}

export interface WorkflowDashboardData {
  id: string;
  name: string;
  status: LeanWorkflow['status'];
  totalItems: number;
  completedItems: number;
  averageCycleTime: number;
  averageLeadTime: number;
  wipUtilization: number;
  quality: number;
  efficiency: number;
  stages: StageDashboardData[];
}

export interface StageDashboardData {
  id: string;
  name: string;
  type: LeanWorkflowStage['type'];
  wipLimit: number;
  currentWIP: number;
  utilization: number;
  throughput: number;
  cycleTime: number;
  quality: number;
}

export interface MetricsDashboardData {
  throughput: ThroughputMetrics;
  flow: FlowMetrics;
  quality: QualityMetrics;
  efficiency: EfficiencyMetrics;
  value: ValueMetrics;
  learning: LearningMetrics;
  trends: MetricTrend[];
}

export interface MetricTrend {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  change: number;
  changePercent: number;
  period: number;
}

export interface ExecutionDashboardData {
  total: number;
  active: number;
  completed: number;
  failed: number;
  success: number;
  averageDuration: number;
  throughput: number;
  resourceUtilization: ResourceUtilizationData;
}

export interface ResourceUtilizationData {
  cpu: number;
  memory: number;
  network: number;
  storage: number;
  overall: number;
}

export interface BMLDashboardData {
  id: string;
  name: string;
  status: BMLCycle['status'];
  phase: BMLCycle['phase'];
  hypothesis: string;
  confidence: number;
  duration: number;
  progress: number;
  learnings: number;
}

export interface FeedbackDashboardData {
  id: string;
  name: string;
  type: FeedbackLoop['type'];
  status: FeedbackLoop['status'];
  insights: number;
  actions: number;
  lastRun: Date;
  nextRun: Date;
}

export interface AlertData {
  id: string;
  type: 'wip_violation' | 'quality_gate_failure' | 'execution_failure' | 'system_error' | 'insight_generated';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  resolved: boolean;
}

export interface InsightData {
  id: string;
  type: 'pattern' | 'trend' | 'recommendation' | 'anomaly';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  actionable: boolean;
  category: string;
  timestamp: Date;
}

export class LeanAgenticDashboard extends EventEmitter {
  private config: DashboardConfig;
  private isRunning: boolean = false;
  private refreshInterval: NodeJS.Timeout | null = null;
  private currentData: DashboardData;
  private subscribers: Map<string, DashboardSubscriber> = new Map();

  constructor(
    private leanWorkflowManager: LeanWorkflowManager,
    private incrementalExecutionEngine: IncrementalExecutionEngine,
    private bmlCycleManager: BMLCycleManager,
    config: Partial<DashboardConfig> = {}
  ) {
    super();
    
    this.config = {
      refreshInterval: 30000, // 30 seconds
      enableRealTimeUpdates: true,
      enableAnimations: true,
      enableNotifications: true,
      theme: 'auto',
      layout: 'grid',
      widgets: this.createDefaultWidgets(),
      filters: this.createDefaultFilters(),
      ...config
    };

    this.currentData = this.initializeEmptyData();
  }

  /**
   * Start dashboard
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[DASHBOARD] Dashboard already running');
      return;
    }

    this.isRunning = true;
    console.log('[DASHBOARD] Starting lean-agentic dashboard');

    // Start real-time updates
    if (this.config.enableRealTimeUpdates) {
      this.startRealTimeUpdates();
    }

    // Perform initial data load
    await this.refreshData();

    console.log('[DASHBOARD] Lean-agentic dashboard started');
    this.emit('dashboardStarted');
  }

  /**
   * Stop dashboard
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }

    console.log('[DASHBOARD] Lean-agentic dashboard stopped');
    this.emit('dashboardStopped');
  }

  /**
   * Get current dashboard data
   */
  public getCurrentData(): DashboardData {
    return { ...this.currentData };
  }

  /**
   * Get dashboard configuration
   */
  public getConfig(): DashboardConfig {
    return { ...this.config };
  }

  /**
   * Update dashboard configuration
   */
  public updateConfig(updates: Partial<DashboardConfig>): void {
    this.config = { ...this.config, ...updates };
    
    // Restart real-time updates if configuration changed
    if (this.isRunning && updates.enableRealTimeUpdates !== undefined) {
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
        this.refreshInterval = null;
      }
      
      if (this.config.enableRealTimeUpdates) {
        this.startRealTimeUpdates();
      }
    }

    console.log('[DASHBOARD] Dashboard configuration updated');
    this.emit('configUpdated', updates);
  }

  /**
   * Subscribe to dashboard updates
   */
  public subscribe(subscriber: DashboardSubscriber): string {
    const subscriptionId = this.generateId('subscription');
    this.subscribers.set(subscriptionId, subscriber);
    
    console.log(`[DASHBOARD] Added subscriber: ${subscriptionId}`);
    return subscriptionId;
  }

  /**
   * Unsubscribe from dashboard updates
   */
  public unsubscribe(subscriptionId: string): void {
    this.subscribers.delete(subscriptionId);
    console.log(`[DASHBOARD] Removed subscriber: ${subscriptionId}`);
  }

  /**
   * Get workflow overview widget data
   */
  public async getWorkflowOverviewData(timeRange?: TimeRange): Promise<WorkflowDashboardData[]> {
    const workflows = this.leanWorkflowManager.getWorkflows();
    const data: WorkflowDashboardData[] = [];

    for (const workflow of workflows) {
      const metrics = await this.leanWorkflowManager.getWorkflowMetrics(workflow.id);
      const totalItems = workflow.stages.reduce((sum, stage) => sum + stage.items.length, 0);
      const completedItems = workflow.stages
        .flatMap(s => s.items)
        .filter(i => i.status === 'completed').length;

      data.push({
        id: workflow.id,
        name: workflow.name,
        status: workflow.status,
        totalItems,
        completedItems,
        averageCycleTime: metrics.flow.averageCycleTime,
        averageLeadTime: metrics.flow.averageLeadTime,
        wipUtilization: this.calculateWIPUtilization(workflow),
        quality: metrics.quality.defectRate > 0 ? 100 - metrics.quality.defectRate : 100,
        efficiency: metrics.efficiency.processEfficiency,
        stages: workflow.stages.map(stage => ({
          id: stage.id,
          name: stage.name,
          type: stage.type,
          wipLimit: stage.wipLimit,
          currentWIP: stage.currentWIP,
          utilization: this.calculateStageUtilization(stage),
          throughput: stage.metrics.throughput,
          cycleTime: stage.metrics.cycleTime,
          quality: stage.metrics.quality
        }))
      });
    }

    return data;
  }

  /**
   * Get WIP monitor widget data
   */
  public async getWIPMonitorData(): Promise<{
    workflows: WorkflowDashboardData[];
    violations: any[];
    limits: any[];
  }> {
    const workflows = this.leanWorkflowManager.getWorkflows();
    const workflowData = await this.getWorkflowOverviewData();
    
    // Get WIP violations from execution engine
    const violations = this.incrementalExecutionEngine.getWIPViolations();
    
    // Get WIP limits
    const limits = workflows.map(workflow => ({
      workflowId: workflow.id,
      workflowName: workflow.name,
      overall: workflow.wipLimits.overall,
      byStage: workflow.wipLimits.byStage,
      byCircle: workflow.wipLimits.byCircle,
      byDomain: workflow.wipLimits.byDomain
    }));

    return {
      workflows: workflowData,
      violations,
      limits
    };
  }

  /**
   * Get throughput chart data
   */
  public async getThroughputChartData(timeRange?: TimeRange): Promise<{
    labels: string[];
    datasets: ChartDataset[];
  }> {
    const workflows = this.leanWorkflowManager.getWorkflows();
    const labels: string[] = [];
    const datasets: ChartDataset[] = [];

    // Generate time-based labels
    const timePoints = this.generateTimePoints(timeRange);
    labels.push(...timePoints.map(point => point.label));

    // Generate datasets for each workflow
    for (const workflow of workflows) {
      const metrics = await this.leanWorkflowManager.getWorkflowMetrics(workflow.id);
      const data = timePoints.map((point, index) => {
        // This would get actual historical data points
        // For now, generate mock data based on current metrics
        const baseValue = metrics.throughput.completed;
        const variation = Math.sin(index * 0.5) * baseValue * 0.2;
        return baseValue + variation;
      });

      datasets.push({
        label: workflow.name,
        data,
        backgroundColor: this.getWorkflowColor(workflow.id),
        borderColor: this.getWorkflowColor(workflow.id),
        borderWidth: 2,
        fill: false
      });
    }

    return { labels, datasets };
  }

  /**
   * Get BML cycles widget data
   */
  public async getBMLCyclesData(): Promise<BMLDashboardData[]> {
    const cycles = this.bmlCycleManager.getBMLCycles();
    const data: BMLDashboardData[] = [];

    for (const cycle of cycles) {
      data.push({
        id: cycle.id,
        name: cycle.name,
        status: cycle.status,
        phase: cycle.phase,
        hypothesis: cycle.hypothesis.statement,
        confidence: cycle.hypothesis.confidence,
        duration: cycle.experiment.duration,
        progress: this.calculateCycleProgress(cycle),
        learnings: cycle.learnings.length
      });
    }

    return data;
  }

  /**
   * Get feedback insights widget data
   */
  public async getFeedbackInsightsData(): Promise<{
    insights: InsightData[];
    actions: any[];
  trends: any[];
  }> {
    const feedbackLoops = this.bmlCycleManager.getFeedbackLoops();
    const insights: InsightData[] = [];
    const actions: any[] = [];
    const trends: any[] = [];

    for (const feedbackLoop of feedbackLoops) {
      // Convert feedback insights to dashboard format
      for (const insight of feedbackLoop.insights) {
        insights.push({
          id: insight.id,
          type: insight.type,
          title: insight.title,
          description: insight.description,
          impact: insight.impact,
          confidence: insight.confidence,
          actionable: insight.actionable,
          category: insight.category,
          timestamp: insight.timestamp
        });
      }

      // Convert feedback actions to dashboard format
      for (const action of feedbackLoop.actions) {
        actions.push({
          id: action.id,
          type: action.type,
          description: action.description,
          priority: action.priority,
          status: action.status,
          createdAt: action.createdAt
        });
      }
    }

    return { insights, actions, trends };
  }

  /**
   * Start real-time updates
   */
  private startRealTimeUpdates(): void {
    this.refreshInterval = setInterval(() => {
      this.refreshData();
    }, this.config.refreshInterval);
  }

  /**
   * Refresh dashboard data
   */
  private async refreshData(): Promise<void> {
    try {
      // Get workflow data
      const workflows = await this.getWorkflowOverviewData();
      
      // Get metrics data
      const metrics = await this.getMetricsData();
      
      // Get execution data
      const executions = await this.getExecutionData();
      
      // Get BML cycles data
      const bmlCycles = await this.getBMLCyclesData();
      
      // Get feedback data
      const feedback = await this.getFeedbackInsightsData();
      
      // Get alerts
      const alerts = await this.getAlertsData();

      this.currentData = {
        timestamp: new Date(),
        workflows,
        metrics,
        executions,
        bmlCycles,
        feedback,
        alerts,
        insights: feedback.insights
      };

      // Notify subscribers
      this.notifySubscribers();

      console.log('[DASHBOARD] Dashboard data refreshed');
      this.emit('dataUpdated', this.currentData);

    } catch (error) {
      console.error('[DASHBOARD] Error refreshing dashboard data:', error);
      this.emit('error', error);
    }
  }

  /**
   * Get metrics data
   */
  private async getMetricsData(): Promise<MetricsDashboardData> {
    const workflows = this.leanWorkflowManager.getWorkflows();
    
    if (workflows.length === 0) {
      return this.initializeEmptyMetricsData();
    }

    // Aggregate metrics across all workflows
    const allMetrics = await Promise.all(
      workflows.map(workflow => this.leanWorkflowManager.getWorkflowMetrics(workflow.id))
    );

    return this.aggregateMetricsData(allMetrics);
  }

  /**
   * Get execution data
   */
  private async getExecutionData(): Promise<ExecutionDashboardData> {
    const status = this.incrementalExecutionEngine.getExecutionStatus();
    
    return {
      total: status.activeExecutions + status.availableSlots,
      active: status.activeExecutions,
      completed: 0, // Would get from actual execution data
      failed: 0, // Would get from actual execution data
      success: 100, // Would calculate from actual data
      averageDuration: 0, // Would calculate from actual data
      throughput: status.throughput,
      resourceUtilization: {
        cpu: 0,
        memory: 0,
        network: 0,
        storage: 0,
        overall: status.activeExecutions > 0 ? 75 : 0
      }
    };
  }

  /**
   * Get alerts data
   */
  private async getAlertsData(): Promise<AlertData[]> {
    const alerts: AlertData[] = [];

    // Get WIP violations as alerts
    const wipViolations = this.incrementalExecutionEngine.getWIPViolations();
    for (const violation of wipViolations) {
      if (!violation.resolved) {
        alerts.push({
          id: violation.id,
          type: 'wip_violation',
          severity: violation.severity,
          title: `WIP Limit Violation in ${violation.stageId || 'Overall'}`,
          message: `Current WIP (${violation.currentWIP}) exceeds limit (${violation.limit})`,
          timestamp: violation.timestamp,
          acknowledged: false,
          resolved: false
        });
      }
    }

    return alerts;
  }

  /**
   * Notify subscribers
   */
  private notifySubscribers(): void {
    for (const [subscriptionId, subscriber] of this.subscribers.entries()) {
      try {
        subscriber.onUpdate(this.currentData);
      } catch (error) {
        console.error(`[DASHBOARD] Error notifying subscriber ${subscriptionId}:`, error);
      }
    }
  }

  /**
   * Create default widgets
   */
  private createDefaultWidgets(): DashboardWidget[] {
    return [
      {
        id: 'workflow-overview',
        type: 'workflow_overview',
        title: 'Workflow Overview',
        position: { x: 0, y: 0, width: 12, height: 6 },
        size: { width: 12, height: 6 },
        configuration: {
          timeRange: { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() },
          aggregation: { type: 'average', interval: 'daily' },
          filters: [],
          thresholds: [],
          colors: [],
          showLegend: true,
          interactive: true
        },
        dataSource: {
          type: 'workflow_metrics',
          source: 'all_workflows'
        },
        refreshInterval: 30000,
        visible: true
      },
      {
        id: 'wip-monitor',
        type: 'wip_monitor',
        title: 'WIP Monitor',
        position: { x: 0, y: 6, width: 6, height: 6 },
        size: { width: 6, height: 6 },
        configuration: {
          timeRange: { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() },
          aggregation: { type: 'sum', interval: 'hourly' },
          filters: [],
          thresholds: [
            { type: 'warning', value: 80, color: '#ff9800', enabled: true },
            { type: 'critical', value: 95, color: '#ff5722', enabled: true }
          ],
          colors: [],
          showLegend: true,
          interactive: true
        },
        dataSource: {
          type: 'execution_data',
          source: 'wip_status'
        },
        refreshInterval: 10000,
        visible: true
      },
      {
        id: 'throughput-chart',
        type: 'throughput_chart',
        title: 'Throughput Trends',
        position: { x: 6, y: 0, width: 6, height: 6 },
        size: { width: 6, height: 6 },
        configuration: {
          timeRange: { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() },
          aggregation: { type: 'sum', interval: 'daily' },
          filters: [],
          thresholds: [],
          colors: [],
          showLegend: true,
          interactive: true
        },
        dataSource: {
          type: 'workflow_metrics',
          source: 'throughput_data'
        },
        refreshInterval: 60000,
        visible: true
      },
      {
        id: 'bml-cycles',
        type: 'bml_cycles',
        title: 'BML Cycles',
        position: { x: 6, y: 6, width: 6, height: 6 },
        size: { width: 6, height: 6 },
        configuration: {
          timeRange: { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() },
          aggregation: { type: 'average', interval: 'daily' },
          filters: [],
          thresholds: [],
          colors: [],
          showLegend: true,
          interactive: true
        },
        dataSource: {
          type: 'bml_cycles',
          source: 'active_cycles'
        },
        refreshInterval: 30000,
        visible: true
      }
    ];
  }

  /**
   * Create default filters
   */
  private createDefaultFilters(): DashboardFilter[] {
    return [
      {
        id: 'workflow-filter',
        name: 'Workflow',
        field: 'workflowId',
        type: 'select',
        options: [
          { label: 'All Workflows', value: '' },
          // Would populate with actual workflows
        ],
        defaultValue: '',
        required: false
      },
      {
        id: 'time-range',
        name: 'Time Range',
        field: 'timeRange',
        type: 'select',
        options: [
          { label: 'Last Hour', value: 'last_hour' },
          { label: 'Last Day', value: 'last_day' },
          { label: 'Last Week', value: 'last_week' },
          { label: 'Last Month', value: 'last_month' },
          { label: 'Custom', value: 'custom' }
        ],
        defaultValue: 'last_week',
        required: false
      },
      {
        id: 'status-filter',
        name: 'Status',
        field: 'status',
        type: 'multiselect',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Paused', value: 'paused' },
          { label: 'Completed', value: 'completed' }
        ],
        defaultValue: ['active'],
        required: false
      }
    ];
  }

  /**
   * Initialize empty data
   */
  private initializeEmptyData(): DashboardData {
    return {
      timestamp: new Date(),
      workflows: [],
      metrics: this.initializeEmptyMetricsData(),
      executions: {
        total: 0,
        active: 0,
        completed: 0,
        failed: 0,
        success: 0,
        averageDuration: 0,
        throughput: 0,
        resourceUtilization: {
          cpu: 0,
          memory: 0,
          network: 0,
          storage: 0,
          overall: 0
        }
      },
      bmlCycles: [],
      feedback: {
        insights: [],
        actions: [],
        trends: []
      },
      alerts: [],
      insights: []
    };
  }

  /**
   * Initialize empty metrics data
   */
  private initializeEmptyMetricsData(): MetricsDashboardData {
    return {
      throughput: {
        total: 0,
        completed: 0,
        averagePerDay: 0,
        averagePerWeek: 0,
        trend: 'stable',
        byType: {},
        byStage: {}
      },
      flow: {
        averageCycleTime: 0,
        averageLeadTime: 0,
        workInProgress: 0,
        efficiency: 0,
        blockedTime: 0,
        waitTime: 0,
        flowEfficiency: 0,
        byStage: {}
      },
      quality: {
        defectRate: 0,
        reworkRate: 0,
        customerSatisfaction: 0,
        qualityGatePassRate: 0,
        testCoverage: 0,
        bySeverity: {}
      },
      efficiency: {
        resourceUtilization: 0,
        processEfficiency: 0,
        automationRate: 0,
        wasteReduction: 0,
        costEfficiency: 0,
        timeEfficiency: 0
      },
      value: {
        businessValue: 0,
        customerValue: 0,
        strategicAlignment: 0,
        innovation: 0,
        riskReduction: 0,
        opportunityEnablement: 0,
        roi: 0
      },
      learning: {
        insightsGenerated: 0,
        insightsImplemented: 0,
        experimentsRun: 0,
        experimentsSuccessful: 0,
        hypothesisValidated: 0,
        improvementRate: 0,
        adaptationSpeed: 0
      },
      trends: []
    };
  }

  /**
   * Calculate WIP utilization
   */
  private calculateWIPUtilization(workflow: LeanWorkflow): number {
    const totalWIP = workflow.stages.reduce((sum, stage) => sum + stage.currentWIP, 0);
    const totalLimit = workflow.stages.reduce((sum, stage) => sum + stage.wipLimit, 0);
    
    return totalLimit > 0 ? (totalWIP / totalLimit) * 100 : 0;
  }

  /**
   * Calculate stage utilization
   */
  private calculateStageUtilization(stage: LeanWorkflowStage): number {
    return stage.wipLimit > 0 ? (stage.currentWIP / stage.wipLimit) * 100 : 0;
  }

  /**
   * Calculate cycle progress
   */
  private calculateCycleProgress(cycle: BMLCycle): number {
    switch (cycle.phase) {
      case 'planning': return 10;
      case 'build': return 30;
      case 'measuring': return 60;
      case 'learning': return 90;
      case 'completed': return 100;
      default: return 0;
    }
  }

  /**
   * Generate time points for charts
   */
  private generateTimePoints(timeRange?: TimeRange): Array<{ label: string; timestamp: Date }> {
    const points: Array<{ label: string; timestamp: Date }> = [];
    const now = new Date();
    
    if (timeRange?.preset) {
      switch (timeRange.preset) {
        case 'last_hour':
          for (let i = 0; i < 12; i++) {
            const timestamp = new Date(now.getTime() - (11 - i) * 5 * 60 * 1000);
            points.push({
              label: timestamp.toLocaleTimeString(),
              timestamp
            });
          }
          break;
        case 'last_day':
          for (let i = 0; i < 24; i++) {
            const timestamp = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
            points.push({
              label: timestamp.toLocaleDateString(),
              timestamp
            });
          }
          break;
        case 'last_week':
          for (let i = 0; i < 7; i++) {
            const timestamp = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
            points.push({
              label: timestamp.toLocaleDateString(),
              timestamp
            });
          }
          break;
        case 'last_month':
          for (let i = 0; i < 30; i++) {
            const timestamp = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
            points.push({
              label: timestamp.toLocaleDateString(),
              timestamp
            });
          }
          break;
      }
    } else if (timeRange?.start && timeRange?.end) {
      const days = Math.ceil((timeRange.end.getTime() - timeRange.start.getTime()) / (24 * 60 * 60 * 1000));
      const intervalMs = (timeRange.end.getTime() - timeRange.start.getTime()) / Math.min(days, 10);
      
      for (let i = 0; i <= Math.min(days, 10); i++) {
        const timestamp = new Date(timeRange.start.getTime() + i * intervalMs);
        points.push({
          label: timestamp.toLocaleDateString(),
          timestamp
        });
      }
    }

    return points;
  }

  /**
   * Get workflow color
   */
  private getWorkflowColor(workflowId: string): string {
    const colors = [
      '#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8', '#6f42c1'
    ];
    const hash = workflowId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * Aggregate metrics data
   */
  private aggregateMetricsData(allMetrics: LeanWorkflowMetrics[]): MetricsDashboardData {
    if (allMetrics.length === 0) {
      return this.initializeEmptyMetricsData();
    }

    // Aggregate throughput metrics
    const throughput: ThroughputMetrics = {
      total: allMetrics.reduce((sum, m) => sum + m.throughput.total, 0),
      completed: allMetrics.reduce((sum, m) => sum + m.throughput.completed, 0),
      averagePerDay: allMetrics.reduce((sum, m) => sum + m.throughput.averagePerDay, 0) / allMetrics.length,
      averagePerWeek: allMetrics.reduce((sum, m) => sum + m.throughput.averagePerWeek, 0) / allMetrics.length,
      trend: 'stable', // Would calculate from historical data
      byType: {},
      byStage: {}
    };

    // Aggregate other metrics similarly...
    const flow = this.aggregateFlowMetrics(allMetrics);
    const quality = this.aggregateQualityMetrics(allMetrics);
    const efficiency = this.aggregateEfficiencyMetrics(allMetrics);
    const value = this.aggregateValueMetrics(allMetrics);
    const learning = this.aggregateLearningMetrics(allMetrics);

    return {
      throughput,
      flow,
      quality,
      efficiency,
      value,
      learning,
      trends: [] // Would calculate from historical data
    };
  }

  /**
   * Aggregate flow metrics
   */
  private aggregateFlowMetrics(allMetrics: LeanWorkflowMetrics[]): FlowMetrics {
    return {
      averageCycleTime: allMetrics.reduce((sum, m) => sum + m.flow.averageCycleTime, 0) / allMetrics.length,
      averageLeadTime: allMetrics.reduce((sum, m) => sum + m.flow.averageLeadTime, 0) / allMetrics.length,
      workInProgress: allMetrics.reduce((sum, m) => sum + m.flow.workInProgress, 0),
      efficiency: allMetrics.reduce((sum, m) => sum + m.flow.efficiency, 0) / allMetrics.length,
      blockedTime: allMetrics.reduce((sum, m) => sum + m.flow.blockedTime, 0) / allMetrics.length,
      waitTime: allMetrics.reduce((sum, m) => sum + m.flow.waitTime, 0) / allMetrics.length,
      flowEfficiency: allMetrics.reduce((sum, m) => sum + m.flow.flowEfficiency, 0) / allMetrics.length,
      byStage: {}
    };
  }

  /**
   * Aggregate quality metrics
   */
  private aggregateQualityMetrics(allMetrics: LeanWorkflowMetrics[]): QualityMetrics {
    return {
      defectRate: allMetrics.reduce((sum, m) => sum + m.quality.defectRate, 0) / allMetrics.length,
      reworkRate: allMetrics.reduce((sum, m) => sum + m.quality.reworkRate, 0) / allMetrics.length,
      customerSatisfaction: allMetrics.reduce((sum, m) => sum + m.quality.customerSatisfaction, 0) / allMetrics.length,
      qualityGatePassRate: allMetrics.reduce((sum, m) => sum + m.quality.qualityGatePassRate, 0) / allMetrics.length,
      testCoverage: allMetrics.reduce((sum, m) => sum + m.quality.testCoverage, 0) / allMetrics.length,
      bySeverity: {}
    };
  }

  /**
   * Aggregate efficiency metrics
   */
  private aggregateEfficiencyMetrics(allMetrics: LeanWorkflowMetrics[]): EfficiencyMetrics {
    return {
      resourceUtilization: allMetrics.reduce((sum, m) => sum + m.efficiency.resourceUtilization, 0) / allMetrics.length,
      processEfficiency: allMetrics.reduce((sum, m) => sum + m.efficiency.processEfficiency, 0) / allMetrics.length,
      automationRate: allMetrics.reduce((sum, m) => sum + m.efficiency.automationRate, 0) / allMetrics.length,
      wasteReduction: allMetrics.reduce((sum, m) => sum + m.efficiency.wasteReduction, 0) / allMetrics.length,
      costEfficiency: allMetrics.reduce((sum, m) => sum + m.efficiency.costEfficiency, 0) / allMetrics.length,
      timeEfficiency: allMetrics.reduce((sum, m) => sum + m.efficiency.timeEfficiency, 0) / allMetrics.length
    };
  }

  /**
   * Aggregate value metrics
   */
  private aggregateValueMetrics(allMetrics: LeanWorkflowMetrics[]): ValueMetrics {
    return {
      businessValue: allMetrics.reduce((sum, m) => sum + m.value.businessValue, 0) / allMetrics.length,
      customerValue: allMetrics.reduce((sum, m) => sum + m.value.customerValue, 0) / allMetrics.length,
      strategicAlignment: allMetrics.reduce((sum, m) => sum + m.value.strategicAlignment, 0) / allMetrics.length,
      innovation: allMetrics.reduce((sum, m) => sum + m.value.innovation, 0) / allMetrics.length,
      riskReduction: allMetrics.reduce((sum, m) => sum + m.value.riskReduction, 0) / allMetrics.length,
      opportunityEnablement: allMetrics.reduce((sum, m) => sum + m.value.opportunityEnablement, 0) / allMetrics.length,
      roi: allMetrics.reduce((sum, m) => sum + m.value.roi, 0) / allMetrics.length
    };
  }

  /**
   * Aggregate learning metrics
   */
  private aggregateLearningMetrics(allMetrics: LeanWorkflowMetrics[]): LearningMetrics {
    return {
      insightsGenerated: allMetrics.reduce((sum, m) => sum + m.learning.insightsGenerated, 0) / allMetrics.length,
      insightsImplemented: allMetrics.reduce((sum, m) => sum + m.learning.insightsImplemented, 0) / allMetrics.length,
      experimentsRun: allMetrics.reduce((sum, m) => sum + m.learning.experimentsRun, 0) / allMetrics.length,
      experimentsSuccessful: allMetrics.reduce((sum, m) => sum + m.learning.experimentsSuccessful, 0) / allMetrics.length,
      hypothesisValidated: allMetrics.reduce((sum, m) => sum + m.learning.hypothesisValidated, 0) / allMetrics.length,
      improvementRate: allMetrics.reduce((sum, m) => sum + m.learning.improvementRate, 0) / allMetrics.length,
      adaptationSpeed: allMetrics.reduce((sum, m) => sum + m.learning.adaptationSpeed, 0) / allMetrics.length
    };
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

// Additional interfaces for chart data
export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  fill: boolean;
}

export interface DashboardSubscriber {
  onUpdate: (data: DashboardData) => void;
}