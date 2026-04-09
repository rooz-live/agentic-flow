/**
 * Monitoring and Analytics Factory
 * 
 * Factory class for creating and configuring complete monitoring and analytics
 * systems with all components properly integrated
 */

import { AlertingEngine, AlertingEngineConfig } from './core/alerting-engine';
import { MonitoringAnalyticsSystem, MonitoringAnalyticsConfig } from './monitoring-analytics-system';
import { MonitoringDashboard, DashboardConfig } from './monitoring-dashboard';
import { IntegrationLayer, IntegrationLayerConfig } from './integration-layer';
import { OrchestrationFramework } from '../core/orchestration-framework';
import { HealthCheckSystem } from '../core/health-checks';

export interface MonitoringAnalyticsFactoryConfig {
  alerting?: Partial<AlertingEngineConfig>;
  analytics?: Partial<MonitoringAnalyticsConfig>;
  dashboard?: Partial<DashboardConfig>;
  integration?: Partial<IntegrationLayerConfig>;
  integrations?: {
    orchestrationFramework?: boolean;
    healthChecks?: boolean;
    riskAssessment?: boolean;
    executionTracking?: boolean;
    wsjf?: boolean;
    economics?: boolean;
  };
}

export interface MonitoringAnalyticsSystem {
  alerting: AlertingEngine;
  analytics: MonitoringAnalyticsSystem;
  dashboard: MonitoringDashboard;
  integration: IntegrationLayer;
  isRunning: boolean;
}

export class MonitoringAnalyticsFactory {
  /**
   * Create complete monitoring and analytics system with all components
   */
  public static async createCompleteSystem(
    config: MonitoringAnalyticsFactoryConfig = {}
  ): Promise<MonitoringAnalyticsSystem> {
    console.log('[MONITORING_FACTORY] Creating complete monitoring and analytics system');

    // Create individual components
    const alerting = new AlertingEngine(config.alerting);
    const analytics = new MonitoringAnalyticsSystem(config.analytics);
    const dashboard = new MonitoringDashboard(config.dashboard);
    const integration = new IntegrationLayer(config.integration);

    // Set up event listeners for inter-component communication
    this.setupEventListeners(alerting, analytics, dashboard, integration);

    // Register integrations if specified
    if (config.integrations) {
      await this.registerIntegrations(integration, config.integrations);
    }

    const system: MonitoringAnalyticsSystem = {
      alerting,
      analytics,
      dashboard,
      integration,
      isRunning: false
    };

    console.log('[MONITORING_FACTORY] Complete monitoring and analytics system created');
    return system;
  }

  /**
   * Create production-ready monitoring and analytics system
   */
  public static async createProductionSystem(
    environment: string = 'production'
  ): Promise<MonitoringAnalyticsSystem> {
    console.log(`[MONITORING_FACTORY] Creating production monitoring system for ${environment}`);

    const config: MonitoringAnalyticsFactoryConfig = {
      alerting: {
        evaluationInterval: 30, // 30 seconds
        maxConcurrentEvaluations: 20,
        defaultCooldown: 300, // 5 minutes
        maxAlertsPerRule: 100,
        autoResolution: true,
        notificationBatchSize: 100,
        notificationRetryDelay: 60,
        maxNotificationRetries: 5
      },
      analytics: {
        collectionInterval: 10, // 10 seconds
        batchSize: 2000,
        compression: true,
        storageBackend: environment === 'production' ? 'database' : 'memory',
        retentionPolicies: [
          { pattern: '*', duration: 7 },
          { pattern: 'system.*', duration: 30, aggregation: '1h' },
          { pattern: 'business.*', duration: 90, aggregation: '1d' }
        ],
        maxConcurrentQueries: 20,
        queryTimeout: 60,
        cacheEnabled: true,
        cacheTimeout: 300
      },
      dashboard: {
        maxWidgets: 100,
        defaultRefreshInterval: 30,
        cacheEnabled: true,
        cacheTimeout: 300,
        enableRealTimeUpdates: true,
        maxDataPoints: 2000,
        exportFormats: ['json', 'csv', 'pdf', 'png']
      },
      integration: {
        syncInterval: 30,
        timeout: 15,
        retryAttempts: 5,
        retryDelay: 10,
        batchSize: 500,
        enableRealTimeSync: true,
        bufferSize: 2000
      },
      integrations: {
        orchestrationFramework: true,
        healthChecks: true,
        riskAssessment: true,
        executionTracking: true,
        wsjf: true,
        economics: true
      }
    };

    return this.createCompleteSystem(config);
  }

  /**
   * Create development monitoring and analytics system
   */
  public static async createDevelopmentSystem(): Promise<MonitoringAnalyticsSystem> {
    console.log('[MONITORING_FACTORY] Creating development monitoring system');

    const config: MonitoringAnalyticsFactoryConfig = {
      alerting: {
        evaluationInterval: 60, // 1 minute
        maxConcurrentEvaluations: 5,
        defaultCooldown: 600, // 10 minutes
        maxAlertsPerRule: 20,
        autoResolution: true,
        notificationBatchSize: 10,
        notificationRetryDelay: 30,
        maxNotificationRetries: 2
      },
      analytics: {
        collectionInterval: 30, // 30 seconds
        batchSize: 100,
        compression: false,
        storageBackend: 'memory',
        retentionPolicies: [
          { pattern: '*', duration: 1 } // 1 day retention for dev
        ],
        maxConcurrentQueries: 5,
        queryTimeout: 30,
        cacheEnabled: true,
        cacheTimeout: 60
      },
      dashboard: {
        maxWidgets: 20,
        defaultRefreshInterval: 60,
        cacheEnabled: false,
        cacheTimeout: 60,
        enableRealTimeUpdates: true,
        maxDataPoints: 500,
        exportFormats: ['json', 'csv']
      },
      integration: {
        syncInterval: 60,
        timeout: 10,
        retryAttempts: 2,
        retryDelay: 5,
        batchSize: 50,
        enableRealTimeSync: false,
        bufferSize: 500
      },
      integrations: {
        orchestrationFramework: true,
        healthChecks: true,
        riskAssessment: false,
        executionTracking: true,
        wsjf: false,
        economics: false
      }
    };

    return this.createCompleteSystem(config);
  }

  /**
   * Create minimal monitoring and analytics system
   */
  public static async createMinimalSystem(): Promise<MonitoringAnalyticsSystem> {
    console.log('[MONITORING_FACTORY] Creating minimal monitoring system');

    const config: MonitoringAnalyticsFactoryConfig = {
      alerting: {
        evaluationInterval: 300, // 5 minutes
        maxConcurrentEvaluations: 2,
        defaultCooldown: 1800, // 30 minutes
        maxAlertsPerRule: 10,
        autoResolution: false,
        notificationBatchSize: 5,
        notificationRetryDelay: 60,
        maxNotificationRetries: 1
      },
      analytics: {
        collectionInterval: 60, // 1 minute
        batchSize: 50,
        compression: false,
        storageBackend: 'memory',
        retentionPolicies: [
          { pattern: '*', duration: 1 } // 1 day retention
        ],
        maxConcurrentQueries: 2,
        queryTimeout: 15,
        cacheEnabled: false,
        cacheTimeout: 300
      },
      dashboard: {
        maxWidgets: 10,
        defaultRefreshInterval: 300,
        cacheEnabled: false,
        cacheTimeout: 300,
        enableRealTimeUpdates: false,
        maxDataPoints: 100,
        exportFormats: ['json']
      },
      integration: {
        syncInterval: 300,
        timeout: 5,
        retryAttempts: 1,
        retryDelay: 10,
        batchSize: 25,
        enableRealTimeSync: false,
        bufferSize: 100
      },
      integrations: {
        orchestrationFramework: true,
        healthChecks: true,
        riskAssessment: false,
        executionTracking: false,
        wsjf: false,
        economics: false
      }
    };

    return this.createCompleteSystem(config);
  }

  /**
   * Start the monitoring and analytics system
   */
  public static async startSystem(system: MonitoringAnalyticsSystem): Promise<void> {
    if (system.isRunning) {
      console.log('[MONITORING_FACTORY] System already running');
      return;
    }

    console.log('[MONITORING_FACTORY] Starting monitoring and analytics system');

    try {
      // Start components in order
      await system.analytics.start();
      await system.alerting.start();
      await system.integration.start();
      
      system.isRunning = true;
      
      console.log('[MONITORING_FACTORY] Monitoring and analytics system started successfully');
      
      // Emit system started event
      system.analytics.emit('systemStarted', { timestamp: new Date() });
      
    } catch (error) {
      console.error('[MONITORING_FACTORY] Failed to start system:', error);
      throw error;
    }
  }

  /**
   * Stop the monitoring and analytics system
   */
  public static async stopSystem(system: MonitoringAnalyticsSystem): Promise<void> {
    if (!system.isRunning) {
      console.log('[MONITORING_FACTORY] System already stopped');
      return;
    }

    console.log('[MONITORING_FACTORY] Stopping monitoring and analytics system');

    try {
      // Stop components in reverse order
      await system.integration.stop();
      await system.alerting.stop();
      await system.analytics.stop();
      
      system.isRunning = false;
      
      console.log('[MONITORING_FACTORY] Monitoring and analytics system stopped successfully');
      
      // Emit system stopped event
      system.analytics.emit('systemStopped', { timestamp: new Date() });
      
    } catch (error) {
      console.error('[MONITORING_FACTORY] Failed to stop system:', error);
      throw error;
    }
  }

  /**
   * Get system health status
   */
  public static async getSystemHealth(system: MonitoringAnalyticsSystem): Promise<{
    overall: 'healthy' | 'warning' | 'critical';
    components: {
      alerting: 'healthy' | 'warning' | 'critical';
      analytics: 'healthy' | 'warning' | 'critical';
      dashboard: 'healthy' | 'warning' | 'critical';
      integration: 'healthy' | 'warning' | 'critical';
    };
    metrics: {
      uptime: number;
      totalAlerts: number;
      totalMetrics: number;
      totalIntegrations: number;
      memoryUsage: number;
    };
  }> {
    const alertingStats = system.alerting.getStatistics();
    const analyticsStats = system.analytics.getStatistics();
    const dashboardStats = system.dashboard.getDashboardStatistics();
    const integrationStats = system.integration.getIntegrationStatistics();

    // Determine component health
    const alertingHealth = this.determineComponentHealth(alertingStats, {
      criticalThreshold: { firingAlerts: 50, failedNotifications: 20 },
      warningThreshold: { firingAlerts: 20, failedNotifications: 10 }
    });

    const analyticsHealth = this.determineComponentHealth(analyticsStats, {
      criticalThreshold: { memoryUsage: 1000 }, // 1GB
      warningThreshold: { memoryUsage: 500 } // 500MB
    });

    const dashboardHealth = this.determineComponentHealth(dashboardStats, {
      criticalThreshold: { memoryUsage: 500 }, // 500MB
      warningThreshold: { memoryUsage: 250 } // 250MB
    });

    const integrationHealth = this.determineComponentHealth(integrationStats, {
      criticalThreshold: { errorIntegrations: 3 },
      warningThreshold: { errorIntegrations: 1 }
    });

    // Determine overall health
    const componentHealths = [alertingHealth, analyticsHealth, dashboardHealth, integrationHealth];
    const criticalCount = componentHealths.filter(h => h === 'critical').length;
    const warningCount = componentHealths.filter(h => h === 'warning').length;

    let overall: 'healthy' | 'warning' | 'critical';
    if (criticalCount > 0) {
      overall = 'critical';
    } else if (warningCount > 0) {
      overall = 'warning';
    } else {
      overall = 'healthy';
    }

    return {
      overall,
      components: {
        alerting: alertingHealth,
        analytics: analyticsHealth,
        dashboard: dashboardHealth,
        integration: integrationHealth
      },
      metrics: {
        uptime: system.isRunning ? Date.now() : 0, // Simplified uptime
        totalAlerts: alertingStats.totalAlerts,
        totalMetrics: analyticsStats.totalMetrics,
        totalIntegrations: integrationStats.totalIntegrations,
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024 // MB
      }
    };
  }

  private static setupEventListeners(
    alerting: AlertingEngine,
    analytics: MonitoringAnalyticsSystem,
    dashboard: MonitoringDashboard,
    integration: IntegrationLayer
  ): void {
    // Forward metrics from integration to analytics
    integration.on('metricsBuffered', (metrics) => {
      analytics.addMetrics(metrics);
    });

    // Forward metrics from analytics to alerting
    analytics.on('metricsCollected', (metrics) => {
      alerting.addMetrics(metrics);
    });

    // Forward alerts from alerting to dashboard
    alerting.on('alertTriggered', (alert) => {
      dashboard.emit('alertTriggered', alert);
    });

    alerting.on('alertResolved', (alert) => {
      dashboard.emit('alertResolved', alert);
    });

    // Forward integration events to dashboard
    integration.on('integrationSynced', (result) => {
      dashboard.emit('integrationSynced', result);
    });

    integration.on('integrationSyncFailed', (result) => {
      dashboard.emit('integrationSyncFailed', result);
    });

    console.log('[MONITORING_FACTORY] Event listeners configured');
  }

  private static async registerIntegrations(
    integration: IntegrationLayer,
    integrations: NonNullable<MonitoringAnalyticsFactoryConfig['integrations']>
  ): Promise<void> {
    console.log('[MONITORING_FACTORY] Registering system integrations');

    // Register orchestration framework integration
    if (integrations.orchestrationFramework) {
      const orchestration = new OrchestrationFramework();
      await orchestration.initializeFramework();
      
      integration.registerIntegration(
        'orchestration-framework',
        'Orchestration Framework',
        'orchestration',
        orchestration,
        {
          enabled: true,
          config: {
            syncInterval: 30
          }
        }
      );
    }

    // Register health checks integration
    if (integrations.healthChecks) {
      const healthChecks = new HealthCheckSystem();
      await healthChecks.start();
      
      integration.registerIntegration(
        'health-checks',
        'Health Checks System',
        'health-checks',
        healthChecks,
        {
          enabled: true,
          config: {
            syncInterval: 30
          }
        }
      );
    }

    // Note: Other integrations (risk-assessment, execution-tracking, wsjf, economics)
    // would be registered here if their systems were available
    // For now, they're mocked in the integration layer

    console.log('[MONITORING_FACTORY] System integrations registered');
  }

  private static determineComponentHealth(
    stats: any,
    thresholds: { criticalThreshold: any; warningThreshold: any }
  ): 'healthy' | 'warning' | 'critical' {
    let criticalViolations = 0;
    let warningViolations = 0;

    for (const [key, value] of Object.entries(stats)) {
      if (typeof value === 'number') {
        if (thresholds.criticalThreshold[key] !== undefined) {
          if (value >= thresholds.criticalThreshold[key]) {
            criticalViolations++;
          } else if (thresholds.warningThreshold[key] !== undefined && 
                     value >= thresholds.warningThreshold[key]) {
            warningViolations++;
          }
        }
      }
    }

    if (criticalViolations > 0) {
      return 'critical';
    } else if (warningViolations > 0) {
      return 'warning';
    } else {
      return 'healthy';
    }
  }

  /**
   * Get system configuration template
   */
  public static getConfigurationTemplate(): MonitoringAnalyticsFactoryConfig {
    return {
      alerting: {
        evaluationInterval: 30,
        maxConcurrentEvaluations: 10,
        defaultCooldown: 300,
        maxAlertsPerRule: 100,
        autoResolution: true,
        notificationBatchSize: 50,
        notificationRetryDelay: 60,
        maxNotificationRetries: 3
      },
      analytics: {
        collectionInterval: 10,
        batchSize: 1000,
        compression: true,
        storageBackend: 'memory',
        retentionPolicies: [
          { pattern: '*', duration: 7 }
        ],
        maxConcurrentQueries: 10,
        queryTimeout: 30,
        cacheEnabled: true,
        cacheTimeout: 300
      },
      dashboard: {
        maxWidgets: 50,
        defaultRefreshInterval: 30,
        cacheEnabled: true,
        cacheTimeout: 300,
        enableRealTimeUpdates: true,
        maxDataPoints: 1000,
        exportFormats: ['json', 'csv']
      },
      integration: {
        syncInterval: 30,
        timeout: 10,
        retryAttempts: 3,
        retryDelay: 5,
        batchSize: 100,
        enableRealTimeSync: true,
        bufferSize: 1000
      },
      integrations: {
        orchestrationFramework: true,
        healthChecks: true,
        riskAssessment: true,
        executionTracking: true,
        wsjf: true,
        economics: true
      }
    };
  }
}