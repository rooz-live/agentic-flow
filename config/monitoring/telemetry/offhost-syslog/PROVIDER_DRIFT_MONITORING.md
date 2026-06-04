# Provider Drift Monitoring

## Overview

Provider Drift Monitoring is a comprehensive observability infrastructure for continuous monitoring and improvement of cloud provider resources. This system provides real-time health monitoring, drift detection, alert routing, incident tracking, and WSJF-based continuous improvement for Hivelocity bare metal servers and AWS infrastructure.

## Architecture

### Components

1. **Hivelocity Monitor** - API-based monitoring of Hivelocity bare metal devices
2. **AWS Health Monitor** - Synthetic monitoring of AWS infrastructure
3. **Alert Router** - Centralized alert routing to multiple channels
4. **Incident Timeline** - Automatic event logging and incident tracking
5. **WSJF Monitoring** - Weighted Shortest Job First prioritization for improvements
6. **Monitoring Dashboard** - Real-time visualization of all metrics

### Data Flow

```
Provider APIs → Health Checks → Drift Detection → Alert Router → Incident Timeline
                                                            ↓
                                                    WSJF Monitoring → Prioritization
                                                            ↓
                                                    Dashboard Visualization
```

## Hivelocity API Monitoring

### Monitoring Capabilities

The Hivelocity Monitor provides comprehensive monitoring of bare metal devices:

- **Power State Monitoring**: Track device power state (on/off/suspended)
- **Port Configuration**: Monitor SSH, syslog, and other service ports
- **IPMI Status**: Check IPMI availability and last access time
- **Device Health**: Monitor CPU, memory, and disk usage
- **Network Connectivity**: Track network latency and bandwidth
- **Drift Detection**: Compare actual state against expected configuration

### Implementation

```typescript
import { HivelocityMonitor, createHivelocityMonitorFromEnv } from '@ruvector/agentic-flow-core/devops';

// Create monitor from environment variables
const monitor = createHivelocityMonitorFromEnv(24460);

// Check device power state
const powerState = await monitor.getPowerState();
console.log(`Power state: ${powerState.state}`);

// Check port configuration
const ports = await monitor.getPortConfiguration();
console.log(`Open ports: ${ports.map(p => p.port).join(', ')}`);

// Check IPMI status
const ipmi = await monitor.getIPMIStatus();
console.log(`IPMI available: ${ipmi.available}`);

// Check device health
const health = await monitor.getDeviceHealth();
console.log(`CPU: ${health.cpuUsage}%, Memory: ${health.memoryUsage}%`);

// Check for drift
const expectedConfig = {
  powerState: { state: 'on', lastChanged: new Date() },
  ports: [{ port: 22, protocol: 'tcp', status: 'open', purpose: 'SSH' }],
  ipmiAvailable: true,
  networkConnected: true,
  healthThresholds: {
    maxCpuUsage: 80,
    maxMemoryUsage: 85,
    maxDiskUsage: 90,
  },
};

const driftReport = await monitor.checkDrift(expectedConfig);
if (driftReport.hasDrift) {
  console.log(`Drift detected! Severity: ${driftReport.severity}`);
  driftReport.drifts.forEach(drift => console.log(`- ${drift.description}`));
}
```

### Environment Variables

- `HIVELOCITY_API_KEY`: Hivelocity API key (required)

### API Endpoints

The monitor uses the following Hivelocity API endpoints:

- `GET /device/{deviceId}/power` - Get power state
- `GET /device/{deviceId}/ports` - Get port configuration
- `GET /device/{deviceId}/ipmi` - Get IPMI status
- `GET /device/{deviceId}/metrics` - Get device health metrics
- `GET /device/{deviceId}/network` - Get network status

## AWS Health Checks

### Monitoring Capabilities

The AWS Health Monitor provides synthetic monitoring of AWS infrastructure:

- **HTTPS Endpoint Monitoring**: Check HTTPS endpoints for availability and response time
- **SSH Connectivity Monitoring**: Test SSH connectivity to instances
- **Response Time Tracking**: Track response times over time
- **Availability Percentage**: Calculate availability over time windows
- **Drift Detection**: Compare metrics against expected thresholds

### Implementation

```typescript
import { AWSHealthMonitor, createAWSHealthMonitorFromEnv } from '@ruvector/agentic-flow-core/devops';

// Create monitor from environment variables
const monitor = createAWSHealthMonitorFromEnv('us-east-1', 'i-1234567890abcdef0');

// Check HTTPS endpoint
const httpsResult = await monitor.checkHTTPEndpoint('https://example.com');
console.log(`Status: ${httpsResult.status}, Response time: ${httpsResult.responseTime}ms`);

// Check SSH connectivity
const sshResult = await monitor.checkSSHConnectivity('23.92.79.2', 22);
console.log(`SSH status: ${sshResult.status}`);

// Get response time
const responseTime = await monitor.getResponseTime('https://example.com');
console.log(`Average response time: ${responseTime}ms`);

// Get availability percentage
const period = {
  start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
  end: new Date(),
};
const availability = await monitor.getAvailabilityPercentage(period, 'https://example.com', 'https');
console.log(`24h availability: ${availability}%`);

// Check for drift
const expectedMetrics = {
  availabilityThreshold: 99.9,
  responseTimeThreshold: 500,
};
const driftReport = await monitor.checkDrift(expectedMetrics, 'https://example.com', 'https');
if (driftReport.hasDrift) {
  console.log(`Drift detected! Severity: ${driftReport.severity}`);
}
```

### Environment Variables

- `AWS_ACCESS_KEY_ID`: AWS access key ID (optional, can be passed directly)
- `AWS_SECRET_ACCESS_KEY`: AWS secret access key (optional, can be passed directly)

### Health Check History

The monitor maintains a history of health check results, calculating:

- **Availability**: Percentage of successful checks
- **Average Response Time**: Mean response time across all checks
- **Trend Analysis**: Changes in metrics over time

## Alert Routing

### Capabilities

The Alert Router provides centralized alert routing to multiple notification channels:

- **SNS Topics**: Route alerts to AWS SNS topics
- **Webhooks**: Route alerts to custom webhook endpoints
- **Severity-Based Routing**: Configure different routing for different severity levels
- **Multiple Channels**: Support for multiple notification channels simultaneously

### Implementation

```typescript
import { AlertRouter, createAlertRouterFromEnv, createAlertFromEvent } from '@ruvector/agentic-flow-core/devops';

// Create alert router from environment variables
const router = createAlertRouterFromEnv('us-east-1');

// Configure severity-based routing
router.configureSeverityRouting({
  critical: {
    snsTopicArn: 'arn:aws:sns:us-east-1:123456789012:critical-alerts',
    webhookUrls: ['https://hooks.slack.com/services/XXX/YYY/ZZZ'],
  },
  error: {
    snsTopicArn: 'arn:aws:sns:us-east-1:123456789012:error-alerts',
    webhookUrls: ['https://hooks.slack.com/services/XXX/YYY/ZZZ'],
  },
  warning: {
    snsTopicArn: 'arn:aws:sns:us-east-1:123456789012:warning-alerts',
  },
  info: {
    webhookUrls: ['https://hooks.slack.com/services/XXX/YYY/ZZZ'],
  },
});

// Add named webhooks
router.addWebhook('slack', 'https://hooks.slack.com/services/XXX/YYY/ZZZ');
router.addWebhook('pagerduty', 'https://events.pagerduty.com/v2/enqueue/XXX');

// Route alert to specific channel
const alert = {
  severity: 'critical',
  source: 'hivelocity',
  message: 'Device power state changed to OFF',
  details: { deviceId: 24460, previousState: 'on', currentState: 'off' },
  timestamp: new Date(),
  providerId: 'stx-aio-0',
};
await router.routeToSNS(alert, 'arn:aws:sns:us-east-1:123456789012:critical-alerts');

// Route alert based on severity
await router.routeBySeverity(alert);

// Get webhook by name
const slackWebhook = router.getWebhook('slack');
```

### Environment Variables

- `AWS_REGION`: AWS region (default: us-east-1)
- `AWS_ACCESS_KEY_ID`: AWS access key ID
- `AWS_SECRET_ACCESS_KEY`: AWS secret access key

### Severity Levels

Alerts support four severity levels:

- **info**: Informational alerts
- **warning**: Warning alerts requiring attention
- **error**: Error alerts requiring immediate action
- **critical**: Critical alerts requiring urgent action

## Incident Timeline

### Capabilities

The Incident Timeline provides automatic event logging and incident tracking:

- **Event Logging**: Log all provider events to syslog sink
- **Incident Creation**: Create and track incidents
- **Status Updates**: Track incident lifecycle (open, investigating, resolved, closed)
- **Timeline Tracking**: Maintain complete incident timeline
- **Report Generation**: Generate comprehensive incident reports with metrics and recommendations

### Implementation

```typescript
import { IncidentTimeline, createIncidentTimelineFromEnv } from '@ruvector/agentic-flow-core/devops';

// Create incident timeline from environment variables
const timeline = createIncidentTimelineFromEnv();

// Log provider event
await timeline.logProviderEvent({
  provider: 'hivelocity',
  eventType: 'power_change',
  severity: 'critical',
  message: 'Device power state changed to OFF',
  details: { deviceId: 24460, previousState: 'on', currentState: 'off' },
  timestamp: new Date(),
});

// Create incident
const incidentId = await timeline.createIncident({
  title: 'SSH Connection Timeout on Hivelocity Device',
  description: 'SSH connection to stx-aio-0.corp.interface.tag.ooo timed out',
  severity: 'critical',
  status: 'open',
  provider: 'hivelocity',
  created: new Date(),
});
console.log(`Incident created: ${incidentId}`);

// Update incident status
await timeline.updateIncident(incidentId, {
  status: 'investigating',
  notes: 'Team assigned to investigate SSH connectivity issue',
});

// Get incident timeline
const incidentEvents = await timeline.getIncidentTimeline(incidentId);
console.log('Incident timeline:', incidentEvents);

// Generate incident report
const report = await timeline.generateIncidentReport(incidentId);
console.log('Incident metrics:', report.metrics);
console.log('Recommendations:', report.recommendations);

// Get all incidents
const allIncidents = timeline.getIncidents();
console.log(`Total incidents: ${allIncidents.length}`);

// Get provider events
const recentEvents = timeline.getProviderEvents(new Date(Date.now() - 24 * 60 * 60 * 1000));
console.log(`Recent events: ${recentEvents.length}`);
```

### Environment Variables

- `SYSLOG_SINK_HOST`: Syslog sink host (default: localhost)
- `SYSLOG_SINK_PORT`: Syslog sink port (default: 6514)

### Incident Lifecycle

Incidents follow this lifecycle:

1. **open**: Incident is created and awaiting investigation
2. **investigating**: Team is actively investigating the incident
3. **resolved**: Incident has been resolved
4. **closed**: Incident is closed and documented

### Incident Metrics

Incident reports include:

- **duration**: Total incident duration
- **impact**: Impact assessment (Critical, High, Medium, Low)
- **affectedServices**: List of affected services
- **resolutionTime**: Time to resolution (if resolved)

## WSJF-Based Continuous Improvement

### WSJF Formula

WSJF (Weighted Shortest Job First) prioritizes improvements based on:

```
WSJF Score = Cost of Delay / Job Size

Cost of Delay = User Business Value + Time Criticality + Risk Reduction
```

### Capabilities

The WSJF Monitoring provides:

- **WSJF Score Calculation**: Calculate WSJF scores for improvements
- **Task Prioritization**: Prioritize monitoring tasks based on WSJF
- **Metrics Tracking**: Track improvement metrics over time
- **Trend Analysis**: Analyze improvement trends
- **Recommendations**: Generate improvement recommendations

### Implementation

```typescript
import { WSJFMonitoring, createWSJFMonitoring } from '@ruvector/agentic-flow-core/devops';

// Create WSJF monitoring instance
const wsjf = createWSJFMonitoring();

// Calculate WSJF score for improvement
const improvement = {
  title: 'Implement Automated Monitoring',
  description: 'Automate routine monitoring tasks to reduce manual effort',
  costOfDelay: 0, // Will be calculated
  userBusinessValue: 8,
  timeCriticality: 7,
  riskReduction: 6,
  riskOfFailure: 3,
};
const wsjfScore = await wsjf.calculateImprovementWSJF(improvement);
console.log(`WSJF Score: ${wsjfScore.score}`);
console.log(`Priority: ${wsjfScore.priority}`);
console.log(`Recommendation: ${wsjfScore.recommendation}`);

// Prioritize monitoring tasks
const tasks = [
  {
    id: 'task-1',
    title: 'Implement Automated Monitoring',
    description: 'Automate routine monitoring tasks to reduce manual effort',
    estimatedEffort: 8,
  },
  {
    id: 'task-2',
    title: 'Enhance Alerting Accuracy',
    description: 'Reduce false positives and improve alert relevance',
    estimatedEffort: 5,
  },
  {
    id: 'task-3',
    title: 'Expand Monitoring Coverage',
    description: 'Add monitoring for currently unmonitored services',
    estimatedEffort: 10,
  },
];
const prioritizedTasks = await wsjf.prioritizeMonitoringTasks(tasks);
console.log('Prioritized tasks:', prioritizedTasks);

// Track improvement metrics
await wsjf.trackImprovementMetrics({
  task: 'Implement Automated Monitoring',
  completed: true,
  duration: 3600000, // 1 hour in milliseconds
  impact: 'high',
  timestamp: new Date(),
});

// Get improvement trends
const period = {
  start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
  end: new Date(),
};
const trends = await wsjf.getImprovementTrends(period);
console.log('Improvement trends:', trends);

// Generate recommendations
const recommendations = await wsjf.generateRecommendations();
console.log('Improvement recommendations:', recommendations);
```

### WSJF Priority Levels

WSJF scores map to priority levels:

- **Critical**: WSJF Score ≥ 15 - Immediate action required
- **High**: 10 ≤ WSJF Score < 15 - High priority
- **Medium**: 5 ≤ WSJF Score < 10 - Medium priority
- **Low**: WSJF Score < 5 - Low priority

### Improvement Metrics

Track the following metrics for improvements:

- **task**: Task identifier
- **completed**: Whether the improvement was completed
- **duration**: Time to complete the improvement
- **impact**: Impact level (high, medium, low)
- **timestamp**: When the improvement was tracked

## Monitoring Dashboard

The monitoring dashboard provides real-time visualization of:

- **Key Metrics**: Overall health, active alerts, open incidents, response times
- **Provider Status**: Detailed status of Hivelocity and AWS resources
- **Recent Alerts**: List of recent alerts with severity levels
- **Incident Timeline**: Table of incidents with status and duration
- **WSJF Priorities**: Prioritized list of improvement tasks

### Accessing the Dashboard

Open the dashboard in a web browser:

```bash
# Serve the dashboard
cd config/telemetry/offhost-syslog
python3 -m http.server 8080

# Access at http://localhost:8080/monitoring-dashboard.html
```

### Dashboard Features

- **Real-time Updates**: Metrics refresh automatically every 30 seconds
- **Responsive Design**: Works on desktop and mobile devices
- **Color-coded Status**: Visual indicators for health status
- **Interactive Tables**: Sortable and filterable data tables
- **WSJF Visualization**: Visual representation of improvement priorities

## Troubleshooting

### Common Issues

#### Hivelocity API Errors

**Problem**: API requests failing with authentication errors

**Solution**:
1. Verify `HIVELOCITY_API_KEY` environment variable is set
2. Check API key is valid and not expired
3. Ensure API key has necessary permissions

#### AWS Health Check Failures

**Problem**: Health checks consistently failing

**Solution**:
1. Verify AWS credentials are correct
2. Check network connectivity to AWS endpoints
3. Verify instance is running and accessible
4. Check security groups allow required ports

#### Alert Routing Not Working

**Problem**: Alerts not being sent to configured channels

**Solution**:
1. Verify SNS topic ARN is correct
2. Check webhook URLs are accessible
3. Verify AWS credentials have SNS publish permissions
4. Check severity routing configuration

#### Incident Timeline Not Logging

**Problem**: Events not being logged to syslog sink

**Solution**:
1. Verify `SYSLOG_SINK_HOST` and `SYSLOG_SINK_PORT` are set
2. Check syslog sink is running and accessible
3. Verify network connectivity to syslog sink
4. Check firewall rules allow syslog traffic

#### WSJF Scores Unexpected

**Problem**: WSJF scores don't match expectations

**Solution**:
1. Review input values for user business value, time criticality, and risk reduction
2. Verify job size (risk of failure) is accurate
3. Check WSJF formula: Cost of Delay / Job Size
4. Review heuristics for automatic value estimation

### Debug Mode

Enable debug logging:

```typescript
// Set environment variable
process.env.DEBUG = 'true';

// Run monitoring
const monitor = createHivelocityMonitorFromEnv(24460);
// Debug logs will be printed to console
```

### Health Check Verification

Verify health checks are working:

```bash
# Test Hivelocity API
curl -H "X-API-KEY: $HIVELOCITY_API_KEY" \
  https://api.hivelocity.net/api/v2/device/24460/power

# Test AWS endpoint
curl -I https://example.com

# Test SSH connectivity
ssh -o ConnectTimeout=5 user@23.92.79.2
```

## Security Best Practices

### Credential Management

- **Never hardcode credentials**: Always use environment variables
- **Rotate credentials regularly**: Update API keys and access keys
- **Use least privilege**: Grant minimum required permissions
- **Monitor access**: Log and review credential usage

### Network Security

- **Use TLS**: All syslog connections use TLS encryption
- **Firewall rules**: Restrict access to monitoring endpoints
- **VPN access**: Access dashboard through VPN
- **Rate limiting**: Implement rate limiting on API endpoints

### Data Protection

- **Encrypt at rest**: All stored data encrypted
- **Encrypt in transit**: TLS for all network communication
- **Access logging**: Log all access to monitoring systems
- **Audit trails**: Maintain audit trails for all changes

## Performance Considerations

### Monitoring Overhead

- **Health check intervals**: Balance between responsiveness and overhead
- **Data retention**: Limit history to prevent memory issues
- **Concurrent checks**: Use async operations for parallel checks
- **Caching**: Cache results where appropriate

### Scalability

- **Horizontal scaling**: Distribute monitoring across multiple instances
- **Load balancing**: Balance health check load
- **Database sharding**: Split incident data across databases
- **Indexing**: Optimize database queries with proper indexes

## Integration with Existing Systems

### CI/CD Integration

Integrate monitoring with CI/CD pipelines:

```yaml
# .github/workflows/deploy.yml
name: Deploy
on: [push]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy application
        run: ./deploy.sh
      
      - name: Verify health
        run: |
          npm run verify-health
      
      - name: Check for drift
        run: |
          npm run check-drift
```

### Slack Integration

Send alerts to Slack:

```typescript
router.addWebhook('slack', 'https://hooks.slack.com/services/XXX/YYY/ZZZ');
router.configureSeverityRouting({
  critical: {
    webhookUrls: ['slack'],
  },
});
```

### PagerDuty Integration

Route critical alerts to PagerDuty:

```typescript
router.addWebhook('pagerduty', 'https://events.pagerduty.com/v2/enqueue/XXX');
router.configureSeverityRouting({
  critical: {
    webhookUrls: ['pagerduty'],
  },
});
```

## Maintenance

### Regular Tasks

- **Review alerts**: Daily review of alert patterns
- **Update thresholds**: Weekly review of alert thresholds
- **Analyze incidents**: Monthly incident review and post-mortems
- **Update documentation**: Quarterly documentation updates
- **Security audit**: Annual security audit

### Backup and Recovery

- **Database backups**: Daily backups of incident data
- **Configuration backups**: Version control for all configurations
- **Disaster recovery**: Test disaster recovery procedures quarterly
- **Restore testing**: Regular restore testing

## References

- [Hivelocity API Documentation](https://www.hivelocity.net/api-docs/)
- [AWS CloudWatch Documentation](https://docs.aws.amazon.com/cloudwatch/)
- [WSJF Prioritization](https://www.scaledagileframework.com/wsjf/)
- [Syslog Protocol](https://tools.ietf.org/html/rfc5424)

## Support

For issues or questions:

1. Check this documentation
2. Review troubleshooting section
3. Check GitHub issues
4. Contact support team

## Version History

- **v1.0.0** (2024-01-01): Initial release
  - Hivelocity API monitoring
  - AWS health checks
  - Alert routing
  - Incident timeline
  - WSJF monitoring
  - Monitoring dashboard
