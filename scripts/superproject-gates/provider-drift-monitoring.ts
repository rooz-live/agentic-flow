/**
 * Provider Drift Monitoring Examples - Phase 5
 *
 * Examples demonstrating:
 * - Hivelocity device monitoring
 * - AWS Lightsail health checks
 * - Alert routing and notification
 * - Incident timeline management
 * - WSJF priority calculation
 *
 * Usage:
 *   ts-node examples/provider-drift-monitoring.ts
 */

import {
  // Monitors
  HivelocityMonitor,
  AWSHealthMonitor,
  ProviderDriftMonitor,
  // Alert Router
  AlertRouter,
  // Factory functions
  createHivelocityMonitorFromEnv,
  createAWSHealthMonitorFromEnv,
  createMonitorFromEnv,
  createDefaultAlertRouter,
  createAlertRouterFromEnv,
  createSyslogSinkMonitorConfig,
  createStarlingXMonitorConfig,
  createSyslogSinkAlertRouter,
  // Types
  type DriftMonitorConfig,
  type AlertRouterConfig,
  type ProviderEvent,
  type HealthCheckResult,
  type IncidentTimeline,
  type ExpectedConfig,
  type ExpectedMetrics,
  type TimeWindow,
  type AlertMessage,
} from '../src/devops';

// ============================================================================
// Example 1: Hivelocity Device Monitoring
// ============================================================================

/**
 * Example: Monitor Hivelocity device health
 *
 * Demonstrates:
 * - Creating Hivelocity monitor
 * - Checking device power state
 * - Checking port configuration
 * - Checking IPMI availability
 * - Detecting configuration drift
 */
async function example1_HivelocityMonitoring() {
  console.log('=== Example 1: Hivelocity Device Monitoring ===\n');

  // Create Hivelocity monitor from environment variables
  const deviceId = parseInt(process.env.HIVELOCITY_DEVICE_ID || '24460', 10);
  const hvMonitor = createHivelocityMonitorFromEnv(deviceId);

  console.log('Checking Hivelocity device health...\n');

  // Check power state
  try {
    const powerState = await hvMonitor.getPowerState();
    console.log(`Power State: ${powerState.state}`);
    console.log(`Last Changed: ${powerState.lastChanged.toISOString()}`);
  } catch (error) {
    console.error('Failed to get power state:', error);
  }

  console.log('');

  // Check port configuration
  try {
    const ports = await hvMonitor.getPortConfiguration();
    console.log(`Port Configuration: ${ports.length} ports`);
    ports.forEach(port => {
      console.log(`  - Port ${port.port}: ${port.status} (${port.protocol})`);
    });
  } catch (error) {
    console.error('Failed to get port configuration:', error);
  }

  console.log('');

  // Check IPMI status
  try {
    const ipmiStatus = await hvMonitor.getIPMIStatus();
    console.log(`IPMI Status: ${ipmiStatus.available ? 'Available' : 'Unavailable'}`);
    console.log(`IP Address: ${ipmiStatus.ip}`);
  } catch (error) {
    console.error('Failed to get IPMI status:', error);
  }

  console.log('');

  // Check for configuration drift
  const expectedConfig: ExpectedConfig = {
    powerState: { state: 'on', lastChanged: new Date() },
    ports: [
      { port: 22, protocol: 'tcp', status: 'open', purpose: 'ssh' },
      { port: 6514, protocol: 'tcp', status: 'open', purpose: 'syslog' },
    ],
    ipmiAvailable: true,
    networkConnected: true,
    healthThresholds: {
      maxCpuUsage: 80,
      maxMemoryUsage: 85,
      maxDiskUsage: 90,
    },
  };

  try {
    const driftReport = await hvMonitor.checkDrift(expectedConfig);
    console.log('Configuration Drift Report:');
    console.log(`  Has Drift: ${driftReport.hasDrift}`);
    console.log(`  Severity: ${driftReport.severity}`);
    if (driftReport.hasDrift) {
      console.log(`  Drifts Detected: ${driftReport.drifts.length}`);
      driftReport.drifts.forEach(drift => {
        console.log(`    - [${drift.severity}] ${drift.description}`);
      });
    }
  } catch (error) {
    console.error('Failed to check drift:', error);
  }

  console.log('\n');
}

// ============================================================================
// Example 2: AWS Lightsail Health Checks
// ============================================================================

/**
 * Example: Monitor AWS Lightsail instance health
 *
 * Demonstrates:
 * - Creating AWS health monitor
 * - Checking HTTPS endpoint availability
 * - Checking SSH connectivity
 * - Monitoring response times
 * - Detecting availability drift
 */
async function example2_AWSHealthMonitoring() {
  console.log('=== Example 2: AWS Lightsail Health Checks ===\n');

  // Create AWS health monitor
  const region = process.env.AWS_REGION || 'us-east-1';
  const instanceId = process.env.AWS_INSTANCE_ID || 'syslog-sink-instance';
  const awsMonitor = createAWSHealthMonitorFromEnv(region, instanceId);

  console.log('Checking AWS Lightsail health...\n');

  // Check HTTPS endpoint
  const httpsUrl = process.env.AWS_HTTPS_URL || 'https://example.com';
  try {
    const httpsResult = await awsMonitor.checkHTTPEndpoint(httpsUrl);
    console.log(`HTTPS Check (${httpsUrl}):`);
    console.log(`  Status: ${httpsResult.status}`);
    console.log(`  Response Time: ${httpsResult.responseTime}ms`);
    if (httpsResult.statusCode) {
      console.log(`  Status Code: ${httpsResult.statusCode}`);
    }
    if (httpsResult.error) {
      console.log(`  Error: ${httpsResult.error}`);
    }
  } catch (error) {
    console.error('Failed HTTPS check:', error);
  }

  console.log('');

  // Check SSH connectivity
  const sshHost = process.env.AWS_SSH_HOST || '192.168.1.1';
  const sshPort = parseInt(process.env.AWS_SSH_PORT || '22', 10);
  try {
    const sshResult = await awsMonitor.checkSSHConnectivity(sshHost, sshPort);
    console.log(`SSH Check (${sshHost}:${sshPort}):`);
    console.log(`  Status: ${sshResult.status}`);
    console.log(`  Response Time: ${sshResult.responseTime}ms`);
    if (sshResult.error) {
      console.log(`  Error: ${sshResult.error}`);
    }
  } catch (error) {
    console.error('Failed SSH check:', error);
  }

  console.log('');

  // Check for availability drift
  const timeWindow: TimeWindow = {
    start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
    end: new Date(),
  };

  const expectedMetrics: ExpectedMetrics = {
    availabilityThreshold: 99.5,
    responseTimeThreshold: 500,
  };

  try {
    const driftReport = await awsMonitor.checkDrift(
      expectedMetrics,
      httpsUrl,
      'https'
    );
    console.log('Availability Drift Report:');
    console.log(`  Has Drift: ${driftReport.hasDrift}`);
    console.log(`  Severity: ${driftReport.severity}`);
    if (driftReport.hasDrift) {
      console.log(`  Drifts Detected: ${driftReport.drifts.length}`);
      driftReport.drifts.forEach(drift => {
        console.log(`    - [${drift.severity}] ${drift.description}`);
      });
    }
  } catch (error) {
    console.error('Failed to check drift:', error);
  }

  console.log('\n');
}

// ============================================================================
// Example 3: Unified Provider Drift Monitor
// ============================================================================

/**
 * Example: Unified monitoring for both Hivelocity and AWS
 *
 * Demonstrates:
 * - Creating unified drift monitor
 * - Running health checks
 * - Getting health summaries
 * - Managing check lifecycle
 */
async function example3_UnifiedMonitoring() {
  console.log('=== Example 3: Unified Provider Drift Monitor ===\n');

  // Create unified monitor from environment
  const monitor = createMonitorFromEnv();

  console.log('Starting unified provider drift monitor...\n');

  // Get current health summary
  const summary = monitor.getHealthSummary();
  console.log('Health Summary:');
  console.log(`  Total Checks: ${summary.total}`);
  console.log(`  Healthy: ${summary.healthy}`);
  console.log(`  Degraded: ${summary.degraded}`);
  console.log(`  Unhealthy: ${summary.unhealthy}`);

  console.log('\n');

  // Run a single health check
  const healthChecks = monitor['config'].healthChecks;
  if (healthChecks && healthChecks.length > 0) {
    const check = healthChecks[0];
    console.log(`Running health check: ${check.checkType} for ${check.target}`);

    try {
      const result = await monitor.runHealthCheck(check);
      console.log(`  Check ID: ${result.checkId}`);
      console.log(`  Status: ${result.status}`);
      console.log(`  Response Time: ${result.responseTime}ms`);
      console.log(`  Timestamp: ${result.timestamp.toISOString()}`);
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Health check failed:', error);
    }
  }

  console.log('\n');
}

// ============================================================================
// Example 4: Alert Routing
// ============================================================================

/**
 * Example: Route alerts to multiple destinations
 *
 * Demonstrates:
 * - Creating alert router
 * - Sending SNS alerts
 * - Sending webhook alerts
 * - Logging to syslog sink
 * - Managing incident timelines
 */
async function example4_AlertRouting() {
  console.log('=== Example 4: Alert Routing ===\n');

  // Create alert router from environment
  const router = createAlertRouterFromEnv();

  console.log('Setting up alert routing...\n');

  // Create a test alert
  const alertMessage: AlertMessage = {
    severity: 'critical',
    source: 'hivelocity',
    title: 'Device Power State Changed',
    description: 'Device 24460 powered off unexpectedly',
    deviceId: 'device-24460',
    timestamp: new Date(),
    metadata: {
      previousState: 'on',
      currentState: 'off',
      detectedAt: new Date().toISOString(),
    },
  };

  // Log to syslog sink
  const providerEvent: ProviderEvent = {
    eventId: `evt-${Date.now()}`,
    provider: 'hivelocity',
    eventType: 'alert',
    severity: 'critical',
    timestamp: alertMessage.timestamp,
    message: alertMessage.title,
    details: {
      alert: alertMessage,
    },
  };

  try {
    await router.logToSyslogSink(providerEvent);
    console.log('Alert logged to syslog sink');
  } catch (error) {
    console.error('Failed to log to syslog sink:', error);
  }

  console.log('\n');

  // Create incident timeline from events
  const events: ProviderEvent[] = [
    {
      eventId: 'evt-1',
      provider: 'hivelocity',
      eventType: 'health_change',
      severity: 'error',
      timestamp: new Date(Date.now() - 60000),
      message: 'Device became unreachable',
      details: { deviceId: 'device-24460' },
    },
    providerEvent,
  ];

  try {
    const timeline = router.createIncidentTimeline(events);
    console.log('Incident Timeline Created:');
    console.log(`  Incident ID: ${timeline.incidentId}`);
    console.log(`  Status: ${timeline.status}`);
    console.log(`  Start Time: ${timeline.startTime.toISOString()}`);
    console.log(`  Events: ${timeline.events.length}`);
    console.log(`  Affected Resources: ${timeline.affectedResources.join(', ')}`);

    // Get active incidents
    const activeIncidents = router.getActiveIncidents();
    console.log(`\nActive Incidents: ${activeIncidents.length}`);
  } catch (error) {
    console.error('Failed to create incident timeline:', error);
  }

  console.log('\n');
}

// ============================================================================
// Example 5: Full Monitoring Workflow
// ============================================================================

/**
 * Example: Complete monitoring and alerting workflow
 *
 * Demonstrates:
 * - Creating monitor and alert router
 * - Running health checks
 * - Detecting drift
 * - Sending alerts
 * - Managing incidents
 */
async function example5_FullWorkflow() {
  console.log('=== Example 5: Full Monitoring Workflow ===\n');

  // Create syslog sink monitor configuration
  const sinkHost = process.env.SYSLOG_SINK_HOST || 'syslog.example.com';
  const monitorConfig = createSyslogSinkMonitorConfig(sinkHost);

  // Create drift monitor
  const driftMonitor = new ProviderDriftMonitor(monitorConfig);

  // Create alert router
  const alertRouter = createSyslogSinkAlertRouter(
    sinkHost,
    process.env.SNS_TOPIC_ARN,
    process.env.ALERT_WEBHOOK_URL
  );

  console.log('Starting full monitoring workflow...\n');

  // Start health checks
  driftMonitor.start();
  console.log('Health checks started');

  // Run checks for demonstration
  const healthChecks = monitorConfig.healthChecks;
  for (const check of healthChecks) {
    console.log(`\nRunning check: ${check.checkType} for ${check.target}`);

    try {
      const result = await driftMonitor.runHealthCheck(check);
      console.log(`  Status: ${result.status}`);
      console.log(`  Response Time: ${result.responseTime}ms`);

      // Send alert if unhealthy
      if (result.status === 'unhealthy' || result.status === 'degraded') {
        const alertMessage: AlertMessage = {
          severity: result.status === 'unhealthy' ? 'critical' : 'warning',
          source: check.provider,
          title: `Health Check Failed: ${check.checkType}`,
          description: result.error || 'Check failed',
          deviceId: check.target,
          timestamp: new Date(),
        };

        const providerEvent: ProviderEvent = {
          eventId: `evt-${Date.now()}`,
          provider: check.provider,
          eventType: 'alert',
          severity: alertMessage.severity === 'critical' ? 'critical' : 'warning',
          timestamp: alertMessage.timestamp,
          message: alertMessage.title,
          details: { checkResult: result },
        };

        // Log to syslog sink
        await alertRouter.logToSyslogSink(providerEvent);
        console.log(`  Alert sent to syslog sink`);
      }
    } catch (error) {
      console.error('Check failed:', error);
    }
  }

  // Get final health summary
  const summary = driftMonitor.getHealthSummary();
  console.log('\nFinal Health Summary:');
  console.log(`  Total: ${summary.total}`);
  console.log(`  Healthy: ${summary.healthy}`);
  console.log(`  Degraded: ${summary.degraded}`);
  console.log(`  Unhealthy: ${summary.unhealthy}`);

  // Get delivery statistics
  const deliveryStats = alertRouter.getDeliveryStats();
  console.log('\nAlert Delivery Statistics:');
  console.log(`  Total Alerts: ${deliveryStats.total}`);
  console.log(`  Successful: ${deliveryStats.successful}`);
  console.log(`  Failed: ${deliveryStats.failed}`);

  if (deliveryStats.byChannel.syslog) {
    console.log(`  Syslog: ${deliveryStats.byChannel.syslog.success} sent, ${deliveryStats.byChannel.syslog.failed} failed`);
  }

  // Stop health checks
  driftMonitor.stop();
  console.log('\nHealth checks stopped');

  console.log('\n');
}

// ============================================================================
// Example 6: StarlingX Source Monitoring
// ============================================================================

/**
 * Example: Monitor StarlingX source server
 *
 * Demonstrates:
 * - Creating StarlingX monitor config
 * - Monitoring device power state
 * - Checking IPMI availability
 * - Detecting configuration drift
 */
async function example6_StarlingXMonitoring() {
  console.log('=== Example 6: StarlingX Source Monitoring ===\n');

  const sourceHost = process.env.STX_SOURCE_HOST || 'stx-aio-0.corp.interface.tag.ooo';
  const hivelocityApiKey = process.env.HIVELOCITY_API_KEY;
  const deviceId = process.env.STX_DEVICE_ID || '24460';

  // Create StarlingX monitor configuration
  const monitorConfig = createStarlingXMonitorConfig(
    sourceHost,
    hivelocityApiKey,
    deviceId
  );

  // Create drift monitor
  const monitor = new ProviderDriftMonitor(monitorConfig);

  console.log('Monitoring StarlingX source server...\n');
  console.log(`Source Host: ${sourceHost}`);
  console.log(`Device ID: ${deviceId}`);

  // Run health checks
  const healthChecks = monitorConfig.healthChecks;
  for (const check of healthChecks) {
    console.log(`\nRunning check: ${check.checkType}`);

    try {
      const result = await monitor.runHealthCheck(check);
      console.log(`  Target: ${check.target}`);
      console.log(`  Status: ${result.status}`);
      console.log(`  Response Time: ${result.responseTime}ms`);

      if (result.status !== 'healthy') {
        console.log(`  ⚠️  Health issue detected!`);
      }
    } catch (error) {
      console.error('Check failed:', error);
    }
  }

  // Get health summary
  const summary = monitor.getHealthSummary();
  console.log('\nHealth Summary:');
  console.log(`  Total Checks: ${summary.total}`);
  console.log(`  Healthy: ${summary.healthy}`);
  console.log(`  Unhealthy: ${summary.unhealthy}`);

  console.log('\n');
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Main function to run all examples
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Provider Drift Monitoring - Phase 5 Examples                      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Run examples sequentially
  await example1_HivelocityMonitoring();
  await example2_AWSHealthMonitoring();
  await example3_UnifiedMonitoring();
  await example4_AlertRouting();
  await example5_FullWorkflow();
  await example6_StarlingXMonitoring();

  console.log('═════════════════════════════════════════════════════════');
  console.log('All examples completed!');
  console.log('═════════════════════════════════════════════════════\n');
}

// Run examples if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Error running examples:', error);
    process.exit(1);
  });
}

export {
  example1_HivelocityMonitoring,
  example2_AWSHealthMonitoring,
  example3_UnifiedMonitoring,
  example4_AlertRouting,
  example5_FullWorkflow,
  example6_StarlingXMonitoring,
};
