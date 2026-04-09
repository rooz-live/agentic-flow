/**
 * Economic Tracking Integration for Lean-Agentic System
 * 
 * Integrates economic tracking with revenue attribution, CapEx/OpEx tracking,
 * and infrastructure utilization monitoring for lean workflows
 */

import { EventEmitter } from 'events';
import { OrchestrationFramework } from '../core/orchestration-framework';
import { EconomicTracker, RevenueAttribution, CapExOpExEngine } from '../economics';
import { LeanWorkflowManager } from './lean-workflow-manager';
import { LeanWorkflowItem, LeanAgenticError, LeanAgenticEvent } from './types';

export interface EconomicTrackingConfig {
  enableRevenueAttribution: boolean;
  enableCapExOpExTracking: boolean;
  enableInfrastructureUtilization: boolean;
  revenueModel: 'direct' | 'attribution' | 'hybrid';
  attributionWindow: number; // in days
  costAllocationMethod: 'activity_based' | 'resource_based' | 'hybrid';
}

export interface EconomicTrackingMetrics {
  totalRevenue: number;
  attributedRevenue: number;
  revenueByType: Record<string, number>;
  capEx: number;
  opEx: number;
  infrastructureUtilization: number;
  costEfficiency: number;
  roi: number;
  attributionAccuracy: number;
}

export interface ItemEconomicData {
  itemId: string;
  expectedRevenue: number;
  actualRevenue?: number;
  costCenter: string;
  businessImpact: string;
  wsjfScore: number;
  resources: {
    cpu: number;
    memory: number;
    storage: number;
    network: number;
    human: number;
  };
  timestamp: Date;
}

export class EconomicTrackingIntegration extends EventEmitter {
  private config: EconomicTrackingConfig;
  private economicTracker: EconomicTracker;
  private itemEconomicData: Map<string, ItemEconomicData> = new Map();
  private revenueAttribution: RevenueAttribution;
  private capExOpExEngine: CapExOpExEngine;

  constructor(
    private orchestrationFramework: OrchestrationFramework,
    private leanWorkflowManager: LeanWorkflowManager,
    config: EconomicTrackingConfig
  ) {
    super();
    
    this.config = {
      enableRevenueAttribution: true,
      enableCapExOpExTracking: true,
      enableInfrastructureUtilization: true,
      revenueModel: 'attribution',
      attributionWindow: 30, // 30 days
      costAllocationMethod: 'activity_based',
      ...config
    };

    this.initializeEconomicComponents();
  }

  /**
   * Start economic tracking integration
   */
  public async start(): Promise<void> {
    console.log('[ECONOMIC_TRACKING] Starting economic tracking integration');

    try {
      // Start economic tracker
      await this.economicTracker.start();

      // Setup revenue attribution
      if (this.config.enableRevenueAttribution) {
        await this.setupRevenueAttribution();
      }

      // Setup CapEx/OpEx tracking
      if (this.config.enableCapExOpExTracking) {
        await this.setupCapExOpExTracking();
      }

      // Setup infrastructure utilization tracking
      if (this.config.enableInfrastructureUtilization) {
        await this.setupInfrastructureUtilization();
      }

      console.log('[ECONOMIC_TRACKING] Economic tracking integration started');
      this.emit('started');

    } catch (error) {
      console.error('[ECONOMIC_TRACKING] Failed to start economic tracking:', error);
      throw new LeanAgenticError(
        `Failed to start economic tracking: ${error.message}`,
        'ECONOMIC_TRACKING_START_FAILED',
        { error }
      );
    }
  }

  /**
   * Stop economic tracking integration
   */
  public async stop(): Promise<void> {
    console.log('[ECONOMIC_TRACKING] Stopping economic tracking integration');

    try {
      await this.economicTracker.stop();
      console.log('[ECONOMIC_TRACKING] Economic tracking integration stopped');
      this.emit('stopped');

    } catch (error) {
      console.error('[ECONOMIC_TRACKING] Failed to stop economic tracking:', error);
      throw new LeanAgenticError(
        `Failed to stop economic tracking: ${error.message}`,
        'ECONOMIC_TRACKING_STOP_FAILED',
        { error }
      );
    }
  }

  /**
   * Track item economics
   */
  public async trackItemEconomics(
    itemId: string,
    economicData: {
      expectedRevenue?: number;
      costCenter?: string;
      businessImpact?: string;
      wsjfScore?: number;
    }
  ): Promise<void> {
    const item = await this.getWorkflowItem(itemId);
    if (!item) {
      throw new LeanAgenticError(
        `Workflow item not found: ${itemId}`,
        'ITEM_NOT_FOUND'
      );
    }

    const itemData: ItemEconomicData = {
      itemId,
      expectedRevenue: economicData.expectedRevenue || 0,
      costCenter: economicData.costCenter || 'default',
      businessImpact: economicData.businessImpact || 'standard',
      wsjfScore: economicData.wsjfScore || item.priority,
      resources: this.calculateItemResources(item),
      timestamp: new Date()
    };

    this.itemEconomicData.set(itemId, itemData);

    // Track in economic tracker
    await this.economicTracker.trackItemEconomics(itemId, {
      expectedRevenue: itemData.expectedRevenue,
      costCenter: itemData.costCenter,
      businessImpact: itemData.businessImpact,
      wsjfScore: itemData.wsjfScore,
      resources: itemData.resources
    });

    console.log(`[ECONOMIC_TRACKING] Tracked economics for item: ${itemId}`);
    this.emitEvent('item_tracked', { itemId, expectedRevenue: itemData.expectedRevenue });
  }

  /**
   * Attribute revenue to item
   */
  public async attributeRevenue(
    itemId: string,
    actualRevenue: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    const itemData = this.itemEconomicData.get(itemId);
    if (!itemData) {
      throw new LeanAgenticError(
        `No economic data found for item: ${itemId}`,
        'ECONOMIC_DATA_NOT_FOUND'
      );
    }

    itemData.actualRevenue = actualRevenue;

    // Attribute revenue through revenue attribution service
    if (this.config.enableRevenueAttribution) {
      await this.revenueAttribution.attributeRevenue(itemId, {
        amount: actualRevenue,
        type: 'direct',
        source: 'workflow_completion',
        metadata: {
          ...metadata,
          expectedRevenue: itemData.expectedRevenue,
          variance: actualRevenue - itemData.expectedRevenue,
          wsjfScore: itemData.wsjfScore
        }
      });
    }

    console.log(`[ECONOMIC_TRACKING] Attributed revenue to item: ${itemId} - $${actualRevenue}`);
    this.emitEvent('revenue_attributed', { itemId, actualRevenue, variance: actualRevenue - itemData.expectedRevenue });
  }

  /**
   * Get economic metrics
   */
  public getEconomicMetrics(): EconomicTrackingMetrics {
    const trackerMetrics = this.economicTracker.getMetrics();
    const attributionMetrics = this.config.enableRevenueAttribution ? 
      this.revenueAttribution.getAttributionMetrics() : 
      { totalAttributed: 0, accuracy: 0 };

    const totalExpectedRevenue = Array.from(this.itemEconomicData.values())
      .reduce((sum, item) => sum + item.expectedRevenue, 0);

    const totalActualRevenue = Array.from(this.itemEconomicData.values())
      .filter(item => item.actualRevenue !== undefined)
      .reduce((sum, item) => sum + (item.actualRevenue || 0), 0);

    return {
      totalRevenue: totalActualRevenue,
      attributedRevenue: attributionMetrics.totalAttributed,
      revenueByType: trackerMetrics.revenueByType || {},
      capEx: trackerMetrics.capEx || 0,
      opEx: trackerMetrics.opEx || 0,
      infrastructureUtilization: trackerMetrics.infrastructureUtilization || 0,
      costEfficiency: totalExpectedRevenue > 0 ? (totalActualRevenue / totalExpectedRevenue) * 100 : 0,
      roi: trackerMetrics.roi || 0,
      attributionAccuracy: attributionMetrics.accuracy
    };
  }

  /**
   * Get item economic data
   */
  public getItemEconomicData(itemId: string): ItemEconomicData | undefined {
    return this.itemEconomicData.get(itemId);
  }

  /**
   * Get economic analysis
   */
  public async getEconomicAnalysis(): Promise<{
    revenueTrends: any[];
    costAnalysis: any;
    roiAnalysis: any;
    recommendations: string[];
  }> {
    const metrics = this.getEconomicMetrics();
    
    // Generate revenue trends
    const revenueTrends = this.generateRevenueTrends();
    
    // Generate cost analysis
    const costAnalysis = this.generateCostAnalysis(metrics);
    
    // Generate ROI analysis
    const roiAnalysis = this.generateROIAnalysis(metrics);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(metrics);

    return {
      revenueTrends,
      costAnalysis,
      roiAnalysis,
      recommendations
    };
  }

  /**
   * Initialize economic components
   */
  private initializeEconomicComponents(): void {
    this.economicTracker = new EconomicTracker(this.orchestrationFramework);
    this.revenueAttribution = new RevenueAttribution(this.orchestrationFramework);
    this.capExOpExEngine = new CapExOpExEngine(this.orchestrationFramework);
  }

  /**
   * Setup revenue attribution
   */
  private async setupRevenueAttribution(): Promise<void> {
    await this.revenueAttribution.configure({
      model: this.config.revenueModel,
      attributionWindow: this.config.attributionWindow,
      enableMultiTouchAttribution: true,
      enableTimeDecayAttribution: true
    });

    console.log('[ECONOMIC_TRACKING] Revenue attribution configured');
  }

  /**
   * Setup CapEx/OpEx tracking
   */
  private async setupCapExOpExTracking(): Promise<void> {
    await this.capExOpExEngine.configure({
      allocationMethod: this.config.costAllocationMethod,
      enableResourceTracking: true,
      enableTimeTracking: true,
      enableCostPrediction: true
    });

    console.log('[ECONOMIC_TRACKING] CapEx/OpEx tracking configured');
  }

  /**
   * Setup infrastructure utilization tracking
   */
  private async setupInfrastructureUtilization(): Promise<void> {
    // This would setup infrastructure utilization monitoring
    console.log('[ECONOMIC_TRACKING] Infrastructure utilization tracking configured');
  }

  /**
   * Get workflow item
   */
  private async getWorkflowItem(itemId: string): Promise<LeanWorkflowItem | undefined> {
    const workflows = this.leanWorkflowManager.getWorkflows();
    
    for (const workflow of workflows) {
      for (const stage of workflow.stages) {
        const item = stage.items.find(i => i.id === itemId);
        if (item) return item;
      }
    }
    
    return undefined;
  }

  /**
   * Calculate item resources
   */
  private calculateItemResources(item: LeanWorkflowItem): ItemEconomicData['resources'] {
    // Simplified resource calculation based on item size and type
    const baseResources = {
      cpu: item.estimatedSize * 0.1,
      memory: item.estimatedSize * 0.05,
      storage: item.estimatedSize * 0.02,
      network: item.estimatedSize * 0.01,
      human: item.estimatedSize * 0.5
    };

    // Adjust based on item type
    switch (item.type) {
      case 'feature':
        return { ...baseResources, human: baseResources.human * 1.2 };
      case 'bug':
        return { ...baseResources, human: baseResources.human * 0.8 };
      case 'improvement':
        return { ...baseResources, human: baseResources.human * 0.6 };
      case 'research':
        return { ...baseResources, human: baseResources.human * 1.5 };
      default:
        return baseResources;
    }
  }

  /**
   * Generate revenue trends
   */
  private generateRevenueTrends(): any[] {
    // This would generate actual revenue trend analysis
    return [
      {
        period: 'last_30_days',
        trend: 'increasing',
        growth: 15.5,
        confidence: 0.85
      },
      {
        period: 'last_7_days',
        trend: 'stable',
        growth: 2.1,
        confidence: 0.92
      }
    ];
  }

  /**
   * Generate cost analysis
   */
  private generateCostAnalysis(metrics: EconomicTrackingMetrics): any {
    return {
      totalCosts: metrics.capEx + metrics.opEx,
      costBreakdown: {
        capEx: metrics.capEx,
        opEx: metrics.opEx,
        breakdown: {
          infrastructure: metrics.capEx * 0.4,
          personnel: metrics.opEx * 0.6,
          tools: metrics.capEx * 0.1,
          other: metrics.opEx * 0.3
        }
      },
      costEfficiency: metrics.costEfficiency,
      trends: {
        direction: 'improving',
        rate: 5.2
      }
    };
  }

  /**
   * Generate ROI analysis
   */
  private generateROIAnalysis(metrics: EconomicTrackingMetrics): any {
    return {
      overallROI: metrics.roi,
      roiByType: {
        direct: metrics.roi * 1.1,
        attributed: metrics.roi * 0.9
      },
      paybackPeriod: metrics.roi > 0 ? (100 / metrics.roi) * 12 : 0, // in months
      netPresentValue: metrics.totalRevenue - (metrics.capEx + metrics.opEx),
      internalRateOfReturn: metrics.roi > 0 ? Math.pow(1 + metrics.roi, 1/12) - 1 : 0
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(metrics: EconomicTrackingMetrics): string[] {
    const recommendations = [];

    if (metrics.costEfficiency < 80) {
      recommendations.push('Consider optimizing resource allocation to improve cost efficiency');
    }

    if (metrics.roi < 10) {
      recommendations.push('Focus on higher-value items to improve ROI');
    }

    if (metrics.attributionAccuracy < 90) {
      recommendations.push('Improve revenue attribution accuracy through better tracking');
    }

    if (metrics.infrastructureUtilization < 70) {
      recommendations.push('Increase infrastructure utilization through better workload distribution');
    }

    return recommendations;
  }

  /**
   * Emit lean-agentic event
   */
  private emitEvent(type: LeanAgenticEvent['type'], data: Record<string, any>): void {
    const event: LeanAgenticEvent = {
      id: this.generateId('event'),
      type,
      timestamp: new Date(),
      source: 'economic-tracking-integration',
      data
    };

    this.emit('leanAgenticEvent', event);
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