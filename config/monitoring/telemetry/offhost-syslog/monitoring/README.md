# Provider Drift Monitoring - Phase 5

## Overview

The Provider Drift Monitoring system provides high-WSJF continuous monitoring for cloud provider infrastructure. This system monitors Hivelocity bare metal devices and AWS Lightsail instances, detects configuration drift, routes alerts to multiple destinations, and maintains an incident timeline.

### Key Features

- **Hivelocity API Monitoring**: Device power state, port configuration, IPMI availability
- **AWS Health Checks**: External synthetic monitoring (HTTPS/SSH) with CloudWatch integration
- **Alert Routing**: SNS/webhooks integration with deduplication and aggregation
- **Incident Timeline**: Automatic logging of all provider events to syslog sink
- **WSJF Prioritization**: Weighted Shortest Job First priority calculation for remediation

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Provider Drift Monitor                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Hivelocity   │  │     AWS      │  │  Alert       │ │
│  │   Monitor     │  │   Monitor     │  │   Router     │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                    │                   │            │
│         ▼                    ▼                   ▼            │
│  ┌────────────────────────────────────────────────────────────┐         │
│  │            Health Check Results                │         │
│  └────────────────────────────────────────────────────────────┘         │
│         │                    │                   │            │
│         ▼                    ▼                   ▼            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Syslog     │  │     SNS      │  │   Webhooks   │ │
│  │    Sink      │  │   Topic      │  │   (Slack,   │ │
│  │              │  │              │  │ PagerDuty)   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Configuration

### Monitoring Intervals

| Setting | Default | Description |
|---------|----------|-------------|
| `health_check_interval` | 300s (5 min) | Frequency of health checks |
| `drift_detection_interval` | 900s (15 min) | Frequency of drift detection |
| `incident_retention_days` | 90 | Days to retain incident data |

### Alert Thresholds

| Severity | Description | Triggers |
|----------|-------------|----------|
| `info` | Informational events | Configuration changes, normal operations |
| `warning` | Warning conditions | Degraded performance, minor drift |
| `error` | Error conditions | Failed health checks, significant drift |
| `critical` | Critical conditions | Device down, security violations, major drift |

### Hivelocity Monitoring

The Hivelocity monitor tracks:

- **Power State**: Device on/off/rebooting status
- **Port Configuration**: Network port status and configuration
- **IPMI Availability**: BMC interface availability and status
- **Device Health**: CPU, memory, disk usage metrics
- **Network Connectivity**: Latency, packet loss, bandwidth

#### Health Thresholds

| Metric | Threshold | Alert Severity |
|--------|-----------|----------------|
| CPU Usage | > 80% | warning |
| Memory Usage | > 85% | warning |
| Disk Usage | > 90% | error |
| Packet Loss | > 5% | warning |
| Latency | > 500ms | warning |

### AWS Lightsail Monitoring

The AWS monitor tracks:

- **Instance State**: Running/stopped/pending status
- **HTTPS Endpoint**: HTTP status code and response time
- **SSH Connectivity**: TCP connection status
- **CloudWatch Metrics**: CPU, network, custom metrics
- **Availability**: Percentage of successful checks

#### Health Thresholds

| Metric | Threshold | Alert Severity |
|--------|-----------|----------------|
| Availability | < 99.5% | error |
| Response Time | > 500ms | warning |
| CPU Utilization | > 90% | warning |

## Alert Types

### Configuration Drift

Detected when actual configuration differs from expected state:

- **Power State Mismatch**: Device not in expected power state
- **Port Configuration Drift**: Ports not matching expected configuration
- **IPMI Unavailability**: IPMI not accessible when expected
- **Network Drift**: Connectivity issues beyond thresholds

### Cost Drift

Detected when actual costs exceed budget:

- **Budget Exceeded**: Monthly costs exceed allocated budget
- **Usage Spike**: Unusual increase in resource usage
- **Billing Anomaly**: Unexpected billing patterns

### Availability Drift

Detected when availability falls below expected levels:

- **Uptime Degradation**: Availability percentage drops
- **Response Time Increase**: Latency exceeds thresholds
- **Check Failures**: Consecutive health check failures

### Security Drift

Detected when security configurations change unexpectedly:

- **Port Opened**: Unexpected port opened
- **Firewall Change**: Security rule modifications
- **Access Pattern**: Unusual access patterns
- **Credential Change**: Unexpected credential changes

## Incident Response Procedures

### Level 1: Warning (15 minutes)

1. **Assess**: Review alert details and check current status
2. **Notify**: Send notification to monitoring team
3. **Monitor**: Increase monitoring frequency to every minute
4. **Document**: Log initial assessment in incident timeline

### Level 2: Error (30 minutes)

1. **Investigate**: Check logs, metrics, and recent changes
2. **Escalate**: Notify on-call engineer
3. **Mitigate**: Apply temporary fixes if possible
4. **Update**: Document investigation findings

### Level 3: Critical (60 minutes)

1. **Mobilize**: Engage full incident response team
2. **Communicate**: Notify stakeholders of critical status
3. **Execute**: Run emergency procedures
4. **Recover**: Restore service to normal operation

## WSJF Priority Calculation

WSJF (Weighted Shortest Job First) is calculated as:

```
WSJF = Cost of Delay / Job Size

Cost of Delay = User Business Value + Time Criticality + Risk Reduction
```

### WSJF Components

| Component | Range | Description |
|-----------|-------|-------------|
| User Business Value | 1-10 | Value delivered to users |
| Time Criticality | 1-10 | How time-sensitive is the task |
| Risk Reduction | 1-10 | Risk mitigation value |
| Job Size | 1-100 | Effort/complexity estimate |

### Priority Levels

| Normalized Score | Priority | Action |
|-----------------|----------|--------|
| >= 75 | Critical | Immediate action, full team support |
| >= 50 | High | Next available slot, parallel execution |
| >= 25 | Medium | Regular sprint planning |
| < 25 | Low | Schedule during low-demand periods |

## Troubleshooting Guide

### Common Issues

#### Hivelocity API Errors

**Symptom**: API requests failing

**Steps**:
1. Check API key validity: `echo $HIVELOCITY_API_KEY`
2. Verify network connectivity to `core.hivelocity.net`
3. Check API status page: https://status.hivelocity.net
4. Review rate limits and quotas

**Resolution**: Update API key or wait for rate limit reset

#### Syslog Sink Connection Failures

**Symptom**: Events not reaching syslog sink

**Steps**:
1. Verify syslog server is running: `telnet $SYSLOG_SINK_HOST $SYSLOG_SINK_PORT`
2. Check firewall rules allow outbound connections
3. Verify TLS certificates if using TLS protocol
4. Check syslog server logs for connection attempts

**Resolution**: Fix network/firewall issues or update TLS configuration

#### Alert Not Received

**Symptom**: Alerts generated but not delivered

**Steps**:
1. Check alert router delivery logs: `router.getDeliveryLog()`
2. Verify webhook URLs are accessible
3. Check SNS topic permissions and subscriptions
4. Review alert severity thresholds

**Resolution**: Update webhook URLs, fix SNS permissions, or adjust thresholds

#### High False Positive Rate

**Symptom**: Too many alerts for non-issues

**Steps**:
1. Review health check thresholds in config
2. Check suppression window settings
3. Adjust deduplication key fields
4. Consider increasing thresholds for noisy metrics

**Resolution**: Update configuration with appropriate thresholds

### Debug Mode

Enable debug logging:

```bash
export LOG_LEVEL=debug
npm run monitor
```

Debug logs include:
- Full API request/response details
- Health check execution traces
- Alert routing decisions
- Syslog message formatting

## Monitoring Dashboard

### Key Metrics to Monitor

1. **Health Check Success Rate**
   - Target: > 99%
   - Alert if: < 95%

2. **Alert Delivery Rate**
   - Target: > 99%
   - Alert if: < 95%

3. **Incident Resolution Time**
   - Target: < 1 hour for critical
   - Alert if: > 4 hours

4. **Drift Detection Accuracy**
   - Target: < 5% false positives
   - Alert if: > 10% false positives

### Health Status Summary

The system provides a health summary:

```typescript
{
  healthy: number,    // Number of healthy checks
  degraded: number,   // Number of degraded checks
  unhealthy: number,   // Number of unhealthy checks
  total: number        // Total number of checks
}
```

## Integration Examples

### Starting Monitor

```typescript
import { createMonitorFromEnv } from '@ruvector/agentic-flow-core';

// Create monitor from environment variables
const monitor = createMonitorFromEnv();

// Start health checks
monitor.start();

console.log('Monitoring started');
console.log('Health summary:', monitor.getHealthSummary());
```

### Creating Custom Alert Router

```typescript
import { AlertRouter, createSyslogSinkAlertRouter } from '@ruvector/agentic-flow-core';

// Create alert router for syslog sink
const router = createSyslogSinkAlertRouter(
  'syslog.example.com',
  'arn:aws:sns:us-east-1:123456789:alerts',
  'https://hooks.slack.com/services/XXX/XXX'
);

// Send alert
await router.sendSNSAlert('arn:aws:sns:us-east-1:123456789:alerts', {
  severity: 'critical',
  source: 'hivelocity',
  title: 'Device Down',
  description: 'Device 24460 is not responding',
  deviceId: 'device-24460',
  timestamp: new Date(),
});
```

### Checking Drift

```typescript
import { HivelocityMonitor, createHivelocityMonitorFromEnv } from '@ruvector/agentic-flow-core';

const monitor = createHivelocityMonitorFromEnv(24460);

const driftReport = await monitor.checkDrift({
  powerState: { state: 'on', lastChanged: new Date() },
  ipmiAvailable: true,
  networkConnected: true,
});

if (driftReport.hasDrift) {
  console.error('Configuration drift detected:', driftReport.drifts);
}
```

## Maintenance

### Log Rotation

Logs are automatically rotated:
- Maximum file size: 100MB
- Maximum files: 10
- Compression: Enabled
- Retention: 90 days

### Backup Configuration

Before making changes:
1. Backup current configuration: `cp config.yml config.yml.backup`
2. Test new configuration in staging
3. Deploy to production
4. Monitor for issues
5. Rollback if needed

## Security Considerations

### Credential Management

- All credentials loaded from environment variables
- No hardcoded credentials in code
- Use secret management systems (AWS Secrets Manager, HashiCorp Vault)
- Rotate API keys regularly

### Network Security

- Use TLS for syslog transport
- Verify syslog server certificates
- Restrict webhook URLs to HTTPS only
- Implement IP allowlists for alert endpoints

### Audit Trail

All monitoring events logged to:
- Syslog sink (primary audit trail)
- Local log files (backup)
- Incident timeline (structured records)

## Support

For issues or questions:

1. Check this documentation first
2. Review example files: `agentic-flow-core/examples/provider-drift-monitoring.ts`
3. Check test coverage: `agentic-flow-core/src/tests/provider-drift-monitoring.test.ts`
4. Review source code: `agentic-flow-core/src/devops/`

### Getting Help

- Create incident in monitoring system
- Include error messages and logs
- Provide configuration details
- Describe expected vs actual behavior

## Version History

- **Phase 5**: Initial implementation
  - Hivelocity API monitoring
  - AWS Lightsail health checks
  - Alert routing with SNS/webhooks
  - Syslog sink integration
  - WSJF priority calculation
  - Incident timeline management
