#!/usr/bin/env node

/**
 * Duration Metrics CLI
 * 
 * Command-line interface for managing duration_ms metrics across the agentic-flow system
 * Provides comprehensive tools for monitoring, analysis, and management
 */

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { DurationTrackingSystem } from '../../agentic-flow-core/src/duration-tracking';
import { DurationValidationEngine } from '../../agentic-flow-core/src/monitoring-analytics/core/validation-engine';
import { DurationAggregationEngine } from '../../agentic-flow-core/src/duration-tracking/aggregation-engine';
import { DurationAlertingEngine } from '../../agentic-flow-core/src/monitoring-analytics/core/duration-alerting-engine';
import { DurationTrendAnalysisEngine } from '../../agentic-flow-core/src/duration-tracking/trend-analysis-engine';
import { DurationMonitoringIntegration } from '../../agentic-flow-core/src/duration-tracking/integration/monitoring-integration';
import { Environment } from '../../agentic-flow-core/src/monitoring-analytics/types';

const program = new Command();

// CLI configuration
program
  .name('duration-metrics')
  .description('CLI for managing duration_ms metrics in agentic-flow system')
  .version('1.0.0');

// Global options
program
  .option('-e, --environment <env>', 'Environment (development, staging, production)', 'development')
  .option('-v, --verbose', 'Verbose output')
  .option('-f, --format <format>', 'Output format (json, table)', 'table')
  .option('--config <path>', 'Configuration file path');

// Initialize components
let durationTracking: DurationTrackingSystem;
let validationEngine: DurationValidationEngine;
let aggregationEngine: DurationAggregationEngine;
let alertingEngine: DurationAlertingEngine;
let trendAnalysisEngine: DurationTrendAnalysisEngine;
let integration: DurationMonitoringIntegration;

/**
 * Initialize all duration tracking components
 */
async function initializeComponents() {
  const environment = (program.opts().environment as Environment) || 'development';
  
  console.log(chalk.blue(`Initializing duration metrics components for ${environment} environment...`));
  
  try {
    // Initialize individual components
    durationTracking = new DurationTrackingSystem({
      enabled: true,
      environment,
      collectionInterval: 60,
      bufferSize: 10000,
      retentionDays: 30,
      qualityThresholds: {
        minQualityScore: 70,
        minCompleteness: 80,
        minAccuracy: 85,
        minConsistency: 75,
        maxOutlierDeviation: 3,
        maxMissingDataPercentage: 10
      },
      alerting: {
        enabled: true,
        defaultRules: [],
        escalationPolicies: [],
        notificationChannels: [],
        suppressionRules: []
      },
      aggregation: {
        enabled: true,
        defaultIntervals: ['1m', '5m', '15m', '1h', '1d', '1w', '1M'],
        defaultTypes: ['sum', 'avg', 'min', 'max', 'median', 'p95', 'p99'],
        defaultDimensions: ['component', 'operation', 'status'],
        maxAggregationAge: 90
      },
      validation: {
        enabled: true,
        validationInterval: 15,
        autoCorrection: false,
        correctionRules: [],
        dataQualityChecks: []
      },
      integration: {
        systems: [],
        exportFormats: [],
        importFormats: [],
        syncInterval: 60
      }
    });

    validationEngine = new DurationValidationEngine();
    aggregationEngine = new DurationAggregationEngine();
    alertingEngine = new DurationAlertingEngine();
    trendAnalysisEngine = new DurationTrendAnalysisEngine();

    // Initialize integration
    integration = new DurationMonitoringIntegration({
      enabled: true,
      environment,
      metricsCollector: {
        collectionInterval: 60,
        bufferSize: 10000,
        aggregationInterval: 300,
        retentionDays: 30
      },
      durationTracking: {
        enabled: true,
        collectionInterval: 60,
        bufferSize: 10000,
        retentionDays: 30
      },
      validation: {
        enabled: true,
        validationInterval: 15,
        autoCorrection: false
      },
      aggregation: {
        enabled: true,
        aggregationInterval: 300,
        defaultIntervals: ['1m', '5m', '15m', '1h', '1d', '1w', '1M'],
        defaultAggregations: ['sum', 'avg', 'min', 'max', 'median', 'p95', 'p99']
      },
      alerting: {
        enabled: true,
        evaluationInterval: 60,
        maxConcurrentAlerts: 100,
        defaultCooldown: 5
      },
      trendAnalysis: {
        enabled: true,
        analysisInterval: 300,
        historicalRetention: 90,
        predictionHorizon: 60
      },
      synchronization: {
        enabled: true,
        syncInterval: 60,
        batchSize: 100,
        retryAttempts: 3
      }
    }, {} as any);

    // Start components
    await durationTracking.start();
    await validationEngine.start();
    await aggregationEngine.start();
    await alertingEngine.start();
    await trendAnalysisEngine.start();
    await integration.start();

    console.log(chalk.green('✓ All components initialized successfully'));
    
  } catch (error) {
    console.error(chalk.red('✗ Failed to initialize components:'), error);
    process.exit(1);
  }
}

/**
 * Format output based on format option
 */
function formatOutput(data: any, format: string = 'table'): void {
  const outputFormat = program.opts().format || format;
  
  if (outputFormat === 'json') {
    console.log(JSON.stringify(data, null, 2));
  } else {
    // Default to table format
    if (Array.isArray(data)) {
      displayTable(data);
    } else {
      console.log(data);
    }
  }
}

/**
 * Display data in table format
 */
function displayTable(data: any[]): void {
  if (!data || data.length === 0) {
    console.log(chalk.yellow('No data available'));
    return;
  }

  const table = new Table({
    head: Object.keys(data[0]),
    colWidths: Object.keys(data[0]).map(() => 20)
  });

  data.forEach(item => {
    table.push(Object.values(item));
  });

  console.log(table.toString());
}

/**
 * Show command
 */
program
  .command('show')
  .description('Show duration metrics information')
  .option('-t, --type <type>', 'Type of information to show (metrics, alerts, trends, aggregations, validation)', 'metrics')
  .option('-c, --component <component>', 'Filter by component')
  .option('-o, --operation <operation>', 'Filter by operation')
  .option('--limit <limit>', 'Limit number of results', '10')
  .action(async (options) => {
    await initializeComponents();
    
    try {
      const filters: any = {};
      if (options.component) filters.component = options.component;
      if (options.operation) filters.operation = options.operation;
      if (options.limit) filters.limit = parseInt(options.limit);

      let data: any[] = [];

      switch (options.type) {
        case 'metrics':
          data = durationTracking.getMetrics(filters);
          break;
        case 'alerts':
          data = alertingEngine.getAlerts(filters);
          break;
        case 'trends':
          data = trendAnalysisEngine.getTrendData(filters);
          break;
        case 'aggregations':
          data = aggregationEngine.getAggregatedMetrics(filters);
          break;
        case 'validation':
          data = validationEngine.getValidationResults();
          break;
        default:
          console.log(chalk.red(`Unknown type: ${options.type}`));
          return;
      }

      formatOutput(data);
      
    } catch (error) {
      console.error(chalk.red('Error showing data:'), error);
    }
  });

/**
 * Validate command
 */
program
  .command('validate')
  .description('Validate duration metrics quality')
  .option('-r, --rule <rule>', 'Specific validation rule to run')
  .option('-a, --auto-fix', 'Automatically fix validation issues')
  .action(async (options) => {
    await initializeComponents();
    
    try {
      console.log(chalk.blue('Running duration metrics validation...'));
      
      if (options.rule) {
        // Run specific validation rule
        const results = validationEngine.getValidationResults(options.rule);
        formatOutput(results);
      } else {
        // Run all validation rules
        const qualityMetrics = validationEngine.getQualityMetrics();
        formatOutput(qualityMetrics);
      }
      
      if (options.autoFix) {
        console.log(chalk.yellow('Auto-fix option not yet implemented'));
      }
      
    } catch (error) {
      console.error(chalk.red('Error during validation:'), error);
    }
  });

/**
 * Aggregate command
 */
program
  .command('aggregate')
  .description('Generate duration metrics aggregations')
  .option('-i, --interval <interval>', 'Aggregation interval (1m, 5m, 15m, 1h, 1d, 1w, 1M)', '1h')
  .option('-t, --type <type>', 'Aggregation type (sum, avg, min, max, median, p95, p99)', 'avg')
  .option('-r, --report', 'Generate aggregation report')
  .action(async (options) => {
    await initializeComponents();
    
    try {
      console.log(chalk.blue(`Generating ${options.type} aggregation for ${options.interval} interval...`));
      
      if (options.report) {
        const report = await aggregationEngine.generateAggregationReport(
          `Duration Aggregation Report - ${options.interval}`,
          `Aggregated duration metrics using ${options.type} over ${options.interval}`,
          {
            start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            end: new Date()
          },
          {
            interval: options.interval,
            aggregation: options.type
          }
        );
        
        formatOutput({
          id: report.id,
          name: report.name,
          totalMetrics: report.summary.totalMetrics,
          avgDuration: report.summary.avgDuration,
          minDuration: report.summary.minDuration,
          maxDuration: report.summary.maxDuration,
          p95Duration: report.summary.p95Duration,
          p99Duration: report.summary.p99Duration,
          insights: report.insights.length,
          recommendations: report.recommendations.length,
          generatedAt: report.generatedAt
        });
      } else {
        const metrics = aggregationEngine.getAggregatedMetrics({
          interval: options.interval,
          aggregation: options.type
        });
        
        formatOutput(metrics.slice(0, parseInt(program.opts().limit || '10')));
      }
      
    } catch (error) {
      console.error(chalk.red('Error during aggregation:'), error);
    }
  });

/**
 * Alert command
 */
program
  .command('alert')
  .description('Manage duration metrics alerts')
  .option('-l, --list', 'List active alerts')
  .option('-a, --acknowledge <id>', 'Acknowledge an alert by ID')
  .option('-r, --resolve <id>', 'Resolve an alert by ID')
  .option('-s, --suppress <id>', 'Suppress an alert by ID')
  .option('--duration <minutes>', 'Suppression duration in minutes', '60')
  .option('-c, --create', 'Create new alert rule')
  .action(async (options) => {
    await initializeComponents();
    
    try {
      if (options.list) {
        const alerts = alertingEngine.getActiveAlerts();
        formatOutput(alerts.map(alert => ({
          id: alert.id,
          rule: alert.ruleName,
          severity: alert.severity,
          component: alert.component,
          operation: alert.operation,
          value: alert.currentValue,
          threshold: alert.thresholdValue,
          message: alert.message,
          createdAt: alert.createdAt
        })));
      } else if (options.acknowledge) {
        const success = await alertingEngine.acknowledgeAlert(options.acknowledge, 'CLI User');
        if (success) {
          console.log(chalk.green(`✓ Alert ${options.acknowledge} acknowledged`));
        } else {
          console.log(chalk.red(`✗ Failed to acknowledge alert ${options.acknowledge}`));
        }
      } else if (options.resolve) {
        const success = await alertingEngine.resolveAlert(options.resolve, 'CLI User', 'Resolved via CLI');
        if (success) {
          console.log(chalk.green(`✓ Alert ${options.resolve} resolved`));
        } else {
          console.log(chalk.red(`✗ Failed to resolve alert ${options.resolve}`));
        }
      } else if (options.suppress) {
        const duration = parseInt(options.duration || '60');
        const success = await alertingEngine.suppressAlert(options.suppress, duration);
        if (success) {
          console.log(chalk.green(`✓ Alert ${options.suppress} suppressed for ${duration} minutes`));
        } else {
          console.log(chalk.red(`✗ Failed to suppress alert ${options.suppress}`));
        }
      } else if (options.create) {
        console.log(chalk.yellow('Alert rule creation not yet implemented'));
      } else {
        console.log(chalk.yellow('Please specify an action: --list, --acknowledge, --resolve, --suppress, or --create'));
      }
      
    } catch (error) {
      console.error(chalk.red('Error managing alerts:'), error);
    }
  });

/**
 * Trend command
 */
program
  .command('trend')
  .description('Analyze duration metrics trends')
  .option('-w, --window <window>', 'Trend analysis window in minutes', '60')
  .option('-p, --predict', 'Generate predictions')
  .option('-h, --horizon <minutes>', 'Prediction horizon in minutes', '60')
  .option('-r, --report', 'Generate trend analysis report')
  .option('--anomalies', 'Show detected anomalies')
  .option('--patterns', 'Show detected patterns')
  .action(async (options) => {
    await initializeComponents();
    
    try {
      console.log(chalk.blue(`Analyzing duration trends with ${options.window} minute window...`));
      
      if (options.report) {
        const report = await trendAnalysisEngine.generateTrendReport(
          `Duration Trend Analysis Report`,
          `Trend analysis of duration metrics over various time windows`,
          {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            end: new Date()
          }
        );
        
        formatOutput({
          id: report.id,
          name: report.name,
          totalMetrics: report.summary.totalMetrics,
          totalAnomalies: report.summary.totalAnomalies,
          totalPatterns: report.summary.totalPatterns,
          avgTrendSlope: report.summary.avgTrendSlope,
          avgConfidence: report.summary.avgConfidence,
          predictionAccuracy: report.summary.predictionAccuracy,
          insights: report.insights.length,
          recommendations: report.recommendations.length,
          generatedAt: report.generatedAt
        });
      } else if (options.anomalies) {
        const anomalies = trendAnalysisEngine.getAnomalies();
        formatOutput(anomalies.slice(0, parseInt(program.opts().limit || '10')).map(anomaly => ({
          id: anomaly.id,
          timestamp: anomaly.timestamp,
          value: anomaly.value,
          expectedValue: anomaly.expectedValue,
          deviation: anomaly.deviation,
          score: anomaly.score,
          severity: anomaly.severity,
          type: anomaly.type,
          description: anomaly.description
        })));
      } else if (options.patterns) {
        const patterns = trendAnalysisEngine.getPatterns();
        formatOutput(patterns.slice(0, parseInt(program.opts().limit || '10')).map(pattern => ({
          id: pattern.id,
          type: pattern.type,
          description: pattern.description,
          confidence: pattern.confidence,
          frequency: pattern.frequency,
          occurrences: pattern.occurrences,
          duration: pattern.duration,
          firstSeen: pattern.firstSeen,
          lastSeen: pattern.lastSeen
        })));
      } else {
        const trends = trendAnalysisEngine.getTrendData();
        formatOutput(trends.slice(0, parseInt(program.opts().limit || '10')).map(trend => ({
          metricId: trend.metricId,
          component: trend.component,
          operation: trend.operation,
          value: trend.value,
          trend: trend.trend.direction,
          slope: trend.trend.slope,
          confidence: trend.trend.confidence,
          timestamp: trend.timestamp
        })));
      }
      
    } catch (error) {
      console.error(chalk.red('Error analyzing trends:'), error);
    }
  });

/**
 * Status command
 */
program
  .command('status')
  .description('Show duration metrics system status')
  .option('-c, --components', 'Show individual component status')
  .option('-s, --sync', 'Show synchronization status')
  .option('-h, --health', 'Show system health')
  .action(async (options) => {
    await initializeComponents();
    
    try {
      if (options.components) {
        const componentStatus = integration.getComponentStatus();
        formatOutput([
          { component: 'Duration Tracking', status: componentStatus.durationTracking ? 'Running' : 'Stopped' },
          { component: 'Validation Engine', status: componentStatus.validation ? 'Running' : 'Stopped' },
          { component: 'Aggregation Engine', status: componentStatus.aggregation ? 'Running' : 'Stopped' },
          { component: 'Alerting Engine', status: componentStatus.alerting ? 'Running' : 'Stopped' },
          { component: 'Trend Analysis', status: componentStatus.trendAnalysis ? 'Running' : 'Stopped' },
          { component: 'Metrics Collector', status: componentStatus.metricsCollector ? 'Running' : 'Stopped' }
        ]);
      } else if (options.sync) {
        const syncStatus = integration.getSyncStatus();
        formatOutput([
          { metric: 'Last Sync', value: syncStatus.lastSync.toISOString() },
          { metric: 'Total Synced', value: syncStatus.totalSynced },
          { metric: 'Failed Syncs', value: syncStatus.failedSyncs },
          { metric: 'Average Sync Duration', value: `${syncStatus.averageSyncDuration.toFixed(2)}ms` }
        ]);
      } else if (options.health) {
        const health = integration.getSystemHealth();
        formatOutput([
          { component: 'Duration Tracking', status: health.durationTracking },
          { component: 'Validation', status: health.validation },
          { component: 'Aggregation', status: health.aggregation },
          { component: 'Alerting', status: health.alerting },
          { component: 'Trend Analysis', status: health.trendAnalysis }
        ]);
      } else {
        // Show overall status
        const metrics = integration.getIntegrationMetrics();
        formatOutput([
          { metric: 'Total Duration Metrics', value: metrics.totalDurationMetrics },
          { metric: 'Total Validation Results', value: metrics.totalValidationResults },
          { metric: 'Total Aggregated Metrics', value: metrics.totalAggregatedMetrics },
          { metric: 'Total Alerts', value: metrics.totalAlerts },
          { metric: 'Total Trends', value: metrics.totalTrends }
        ]);
      }
      
    } catch (error) {
      console.error(chalk.red('Error getting status:'), error);
    }
  });

/**
 * Export command
 */
program
  .command('export')
  .description('Export duration metrics data')
  .option('-f, --format <format>', 'Export format (json, csv, prometheus)', 'json')
  .option('-o, --output <file>', 'Output file path')
  .option('-t, --type <type>', 'Data type to export (metrics, alerts, trends, aggregations)', 'metrics')
  .option('--start <date>', 'Start date (ISO format)')
  .option('--end <date>', 'End date (ISO format)')
  .action(async (options) => {
    await initializeComponents();
    
    try {
      console.log(chalk.blue(`Exporting ${options.type} data in ${options.format} format...`));
      
      const timeRange = {
        start: options.start ? new Date(options.start) : new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: options.end ? new Date(options.end) : new Date()
      };

      let data: any[] = [];

      switch (options.type) {
        case 'metrics':
          data = durationTracking.getMetrics({ timeRange });
          break;
        case 'alerts':
          data = alertingEngine.getAlerts({ timeRange });
          break;
        case 'trends':
          data = trendAnalysisEngine.getTrendData({ timeRange });
          break;
        case 'aggregations':
          data = aggregationEngine.getAggregatedMetrics({ timeRange });
          break;
        default:
          console.log(chalk.red(`Unknown type: ${options.type}`));
          return;
      }

      let output: string;
      
      switch (options.format) {
        case 'csv':
          output = convertToCSV(data);
          break;
        case 'prometheus':
          output = convertToPrometheus(data);
          break;
        case 'json':
        default:
          output = JSON.stringify(data, null, 2);
          break;
      }

      if (options.output) {
        require('fs').writeFileSync(options.output, output);
        console.log(chalk.green(`✓ Data exported to ${options.output}`));
      } else {
        console.log(output);
      }
      
    } catch (error) {
      console.error(chalk.red('Error exporting data:'), error);
    }
  });

/**
 * Config command
 */
program
  .command('config')
  .description('Manage duration metrics configuration')
  .option('-s, --show', 'Show current configuration')
  .option('-r, --reset', 'Reset to default configuration')
  .action(async (options) => {
    if (options.show) {
      console.log(chalk.blue('Current configuration:'));
      // This would show actual configuration
      console.log(JSON.stringify({
        environment: program.opts().environment || 'development',
        collectionInterval: 60,
        bufferSize: 10000,
        retentionDays: 30,
        validationInterval: 15,
        aggregationInterval: 300,
        alertingInterval: 60,
        trendAnalysisInterval: 300
      }, null, 2));
    } else if (options.reset) {
      console.log(chalk.yellow('Configuration reset not yet implemented'));
    } else {
      console.log(chalk.yellow('Please specify an action: --show or --reset'));
    }
  });

/**
 * Convert data to CSV format
 */
function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  
  for (const item of data) {
    const row = headers.map(header => {
      const value = item[header];
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`;
      }
      return value;
    });
    csvRows.push(row.join(','));
  }
  
  return csvRows.join('\n');
}

/**
 * Convert data to Prometheus format
 */
function convertToPrometheus(data: any[]): string {
  if (!data || data.length === 0) return '';
  
  const prometheusLines: string[] = [];
  
  for (const item of data) {
    const metricName = `duration_${item.metricId || 'unknown'}`;
    const labels = [
      `component="${item.component || 'unknown'}"`,
      `operation="${item.operation || 'unknown'}"`,
      `environment="${item.environment || 'unknown'}"`
    ].join(',');
    
    prometheusLines.push(`${metricName}{${labels}} ${item.value}`);
  }
  
  return prometheusLines.join('\n');
}

/**
 * Cleanup on exit
 */
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\nShutting down duration metrics components...'));
  
  try {
    if (integration) {
      await integration.stop();
    }
    if (trendAnalysisEngine) {
      await trendAnalysisEngine.stop();
    }
    if (alertingEngine) {
      await alertingEngine.stop();
    }
    if (aggregationEngine) {
      await aggregationEngine.stop();
    }
    if (validationEngine) {
      await validationEngine.stop();
    }
    if (durationTracking) {
      await durationTracking.stop();
    }
    
    console.log(chalk.green('✓ All components stopped successfully'));
  } catch (error) {
    console.error(chalk.red('Error during shutdown:'), error);
  }
  
  process.exit(0);
});

// Parse command line arguments
program.parse();