/**
 * Syslog Health Monitor - Log Ingestion Monitoring
 *
 * Monitors syslog sink health and log ingestion:
 * - TLS connection health
 * - Certificate expiry monitoring
 * - Log ingestion rate tracking
 * - Log retention monitoring
 * - Ingestion anomaly detection
 *
 * Target System:
 * - Syslog sink VPS (AWS Lightsail)
 * - TLS port 6514
 * - Sources: StarlingX (23.92.79.2)
 *
 * @module monitoring/syslog-health-monitor
 */

import * as tls from 'tls';
import * as net from 'net';
import * as crypto from 'crypto';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * TLS connection status
 */
export interface TLSStatus {
  connected: boolean;
  protocol?: string;
  cipher?: string;
  authorized: boolean;
  peerCertificate?: {
    subject: string;
    issuer: string;
    validFrom: Date;
    validTo: Date;
    fingerprint: string;
  };
  latencyMs: number;
  error?: string;
  lastChecked: Date;
}

/**
 * Certificate status
 */
export interface CertStatus {
  valid: boolean;
  expiresAt: Date;
  daysUntilExpiry: number;
  subject: string;
  issuer: string;
  fingerprint: string;
  warningLevel: 'ok' | 'warning' | 'critical';
  error?: string;
  lastChecked: Date;
}

/**
 * Log ingestion metrics
 */
export interface IngestionMetrics {
  authLogsPerMinute: number;
  systemLogsPerMinute: number;
  totalLogsPerMinute: number;
  lastReceivedAuthLog: Date;
  lastReceivedSystemLog: Date;
  bytesReceivedPerMinute: number;
  droppedLogs: number;
  averageLatencyMs: number;
  lastUpdated: Date;
}

/**
 * Log retention status
 */
export interface RetentionStatus {
  totalSizeBytes: number;
  totalSizeHuman: string;
  oldestLog: Date;
  newestLog: Date;
  retentionDays: number;
  diskUsagePercent: number;
  rotationEnabled: boolean;
  compressionEnabled: boolean;
  lastRotation?: Date;
  lastChecked: Date;
}

/**
 * Ingestion anomaly report
 */
export interface AnomalyReport {
  hasAnomaly: boolean;
  anomalies: Anomaly[];
  baseline: IngestionBaseline;
  currentMetrics: IngestionMetrics;
  lastChecked: Date;
}

/**
 * Individual anomaly detection
 */
export interface Anomaly {
  type: 'rate_drop' | 'rate_spike' | 'source_missing' | 'latency_high' | 'gap_detected';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  detectedAt: Date;
  details: Record<string, unknown>;
}

/**
 * Baseline for anomaly detection
 */
export interface IngestionBaseline {
  expectedAuthLogsPerMinute: number;
  expectedSystemLogsPerMinute: number;
  maxLatencyMs: number;
  maxGapSeconds: number;
  minRateThreshold: number; // Percentage of expected
  maxRateThreshold: number; // Percentage of expected
}

/**
 * Syslog source configuration
 */
export interface SyslogSource {
  name: string;
  host: string;
  expectedLogsPerMinute: number;
  lastSeen?: Date;
  logTypes: ('auth' | 'system' | 'application')[];
}

/**
 * Syslog health monitor configuration
 */
export interface SyslogHealthMonitorConfig {
  sinkHost: string;
  sinkPort: number;
  protocol: 'tcp' | 'tls';

  // TLS options
  tlsOptions?: tls.ConnectionOptions;

  // Certificate monitoring
  certExpiryWarningDays: number;
  certExpiryCriticalDays: number;

  // Ingestion monitoring
  sources: SyslogSource[];
  baseline: IngestionBaseline;

  // Timeouts
  connectionTimeoutMs: number;
  readTimeoutMs: number;
}

// ============================================================================
// Syslog Health Monitor Class
// ============================================================================

/**
 * Syslog ingestion health monitor
 *
 * Provides comprehensive monitoring for syslog sinks:
 * - TLS connection health
 * - Certificate expiry
 * - Log ingestion rate
 * - Anomaly detection
 */
export class SyslogHealthMonitor {
  private config: SyslogHealthMonitorConfig;
  private metricsHistory: IngestionMetrics[] = [];
  private lastMetrics?: IngestionMetrics;
  private anomalyHistory: Anomaly[] = [];

  constructor(config: SyslogHealthMonitorConfig) {
    this.config = {
      connectionTimeoutMs: 10000,
      readTimeoutMs: 5000,
      certExpiryWarningDays: 30,
      certExpiryCriticalDays: 7,
      ...config,
    };
  }

  // ==========================================================================
  // Connection Health
  // ==========================================================================

  /**
   * Check TLS connection to syslog sink
   *
   * @param host - Syslog sink host
   * @param port - Syslog sink port
   * @returns TLS connection status
   */
  async checkTLSConnection(host: string, port: number): Promise<TLSStatus> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          connected: false,
          authorized: false,
          latencyMs: Date.now() - startTime,
          error: 'Connection timeout',
          lastChecked: new Date(),
        });
      }, this.config.connectionTimeoutMs);

      const socket = tls.connect({
        host,
        port,
        rejectUnauthorized: false, // Allow self-signed for monitoring
        ...this.config.tlsOptions,
      }, () => {
        clearTimeout(timeout);
        const latencyMs = Date.now() - startTime;

        const cert = socket.getPeerCertificate();
        const status: TLSStatus = {
          connected: true,
          protocol: socket.getProtocol() || undefined,
          cipher: socket.getCipher()?.name,
          authorized: socket.authorized,
          latencyMs,
          lastChecked: new Date(),
        };

        if (cert && Object.keys(cert).length > 0) {
          status.peerCertificate = {
            subject: this.formatDN(cert.subject),
            issuer: this.formatDN(cert.issuer),
            validFrom: new Date(cert.valid_from),
            validTo: new Date(cert.valid_to),
            fingerprint: cert.fingerprint || '',
          };
        }

        socket.destroy();
        resolve(status);
      });

      socket.on('error', (err) => {
        clearTimeout(timeout);
        socket.destroy();
        resolve({
          connected: false,
          authorized: false,
          latencyMs: Date.now() - startTime,
          error: err.message,
          lastChecked: new Date(),
        });
      });
    });
  }

  /**
   * Check certificate expiry
   *
   * @param host - Syslog sink host
   * @param port - Syslog sink port
   * @returns Certificate status
   */
  async checkCertificateExpiry(host: string, port: number): Promise<CertStatus> {
    const tlsStatus = await this.checkTLSConnection(host, port);

    if (!tlsStatus.connected || !tlsStatus.peerCertificate) {
      return {
        valid: false,
        expiresAt: new Date(0),
        daysUntilExpiry: -1,
        subject: 'unknown',
        issuer: 'unknown',
        fingerprint: '',
        warningLevel: 'critical',
        error: tlsStatus.error || 'Could not retrieve certificate',
        lastChecked: new Date(),
      };
    }

    const cert = tlsStatus.peerCertificate;
    const now = new Date();
    const daysUntilExpiry = Math.floor(
      (cert.validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    let warningLevel: 'ok' | 'warning' | 'critical' = 'ok';
    if (daysUntilExpiry <= this.config.certExpiryCriticalDays) {
      warningLevel = 'critical';
    } else if (daysUntilExpiry <= this.config.certExpiryWarningDays) {
      warningLevel = 'warning';
    }

    const valid = cert.validFrom <= now && now <= cert.validTo;

    return {
      valid,
      expiresAt: cert.validTo,
      daysUntilExpiry,
      subject: cert.subject,
      issuer: cert.issuer,
      fingerprint: cert.fingerprint,
      warningLevel,
      lastChecked: new Date(),
    };
  }

  // ==========================================================================
  // Ingestion Metrics
  // ==========================================================================

  /**
   * Get log ingestion rate metrics
   *
   * In production, this would query the syslog server's metrics endpoint
   * or parse log files to calculate rates.
   */
  async getLogIngestionRate(): Promise<IngestionMetrics> {
    // In production, query metrics from:
    // - rsyslog impstats module
    // - Prometheus metrics endpoint
    // - Log file line counting

    // Simulated metrics for development
    const now = new Date();
    const metrics: IngestionMetrics = {
      authLogsPerMinute: this.config.baseline.expectedAuthLogsPerMinute * (0.9 + Math.random() * 0.2),
      systemLogsPerMinute: this.config.baseline.expectedSystemLogsPerMinute * (0.9 + Math.random() * 0.2),
      totalLogsPerMinute: 0,
      lastReceivedAuthLog: new Date(now.getTime() - Math.random() * 60000),
      lastReceivedSystemLog: new Date(now.getTime() - Math.random() * 60000),
      bytesReceivedPerMinute: Math.floor(50000 + Math.random() * 10000),
      droppedLogs: Math.floor(Math.random() * 5),
      averageLatencyMs: Math.floor(5 + Math.random() * 10),
      lastUpdated: now,
    };

    metrics.totalLogsPerMinute = metrics.authLogsPerMinute + metrics.systemLogsPerMinute;

    // Store metrics for history
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > 60) {
      this.metricsHistory = this.metricsHistory.slice(-60);
    }

    this.lastMetrics = metrics;
    return metrics;
  }

  /**
   * Check log retention status
   *
   * In production, this would check disk usage and log rotation status.
   */
  async checkLogRetention(): Promise<RetentionStatus> {
    // In production, check:
    // - Disk usage with df/du
    // - Log file sizes
    // - Rotation configuration

    // Simulated status for development
    const now = new Date();
    const retentionDays = parseInt(process.env.LOG_RETENTION_DAYS || '90', 10);

    return {
      totalSizeBytes: 1024 * 1024 * 500, // 500MB
      totalSizeHuman: '500 MB',
      oldestLog: new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000),
      newestLog: now,
      retentionDays,
      diskUsagePercent: 25,
      rotationEnabled: true,
      compressionEnabled: true,
      lastRotation: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      lastChecked: now,
    };
  }

  // ==========================================================================
  // Anomaly Detection
  // ==========================================================================

  /**
   * Detect ingestion anomalies
   *
   * Checks for:
   * - Rate drops below threshold
   * - Rate spikes above threshold
   * - Missing sources
   * - High latency
   * - Gaps in log reception
   */
  async detectIngestionAnomaly(): Promise<AnomalyReport> {
    const metrics = await this.getLogIngestionRate();
    const anomalies: Anomaly[] = [];
    const baseline = this.config.baseline;
    const now = new Date();

    // Check for rate drop
    const expectedTotal = baseline.expectedAuthLogsPerMinute + baseline.expectedSystemLogsPerMinute;
    const rateRatio = metrics.totalLogsPerMinute / expectedTotal;

    if (rateRatio < baseline.minRateThreshold / 100) {
      anomalies.push({
        type: 'rate_drop',
        severity: rateRatio < 0.5 ? 'critical' : 'warning',
        message: `Log ingestion rate dropped to ${(rateRatio * 100).toFixed(1)}% of expected`,
        detectedAt: now,
        details: {
          expected: expectedTotal,
          actual: metrics.totalLogsPerMinute,
          ratio: rateRatio,
        },
      });
    }

    // Check for rate spike
    if (rateRatio > baseline.maxRateThreshold / 100) {
      anomalies.push({
        type: 'rate_spike',
        severity: 'warning',
        message: `Log ingestion rate spiked to ${(rateRatio * 100).toFixed(1)}% of expected`,
        detectedAt: now,
        details: {
          expected: expectedTotal,
          actual: metrics.totalLogsPerMinute,
          ratio: rateRatio,
        },
      });
    }

    // Check for high latency
    if (metrics.averageLatencyMs > baseline.maxLatencyMs) {
      anomalies.push({
        type: 'latency_high',
        severity: metrics.averageLatencyMs > baseline.maxLatencyMs * 2 ? 'critical' : 'warning',
        message: `Log ingestion latency is high: ${metrics.averageLatencyMs}ms`,
        detectedAt: now,
        details: {
          current: metrics.averageLatencyMs,
          threshold: baseline.maxLatencyMs,
        },
      });
    }

    // Check for gaps in log reception
    const authGapSeconds = (now.getTime() - metrics.lastReceivedAuthLog.getTime()) / 1000;
    if (authGapSeconds > baseline.maxGapSeconds) {
      anomalies.push({
        type: 'gap_detected',
        severity: authGapSeconds > baseline.maxGapSeconds * 2 ? 'critical' : 'warning',
        message: `No auth logs received for ${Math.floor(authGapSeconds)} seconds`,
        detectedAt: now,
        details: {
          logType: 'auth',
          gapSeconds: authGapSeconds,
          threshold: baseline.maxGapSeconds,
          lastReceived: metrics.lastReceivedAuthLog,
        },
      });
    }

    const systemGapSeconds = (now.getTime() - metrics.lastReceivedSystemLog.getTime()) / 1000;
    if (systemGapSeconds > baseline.maxGapSeconds) {
      anomalies.push({
        type: 'gap_detected',
        severity: systemGapSeconds > baseline.maxGapSeconds * 2 ? 'critical' : 'warning',
        message: `No system logs received for ${Math.floor(systemGapSeconds)} seconds`,
        detectedAt: now,
        details: {
          logType: 'system',
          gapSeconds: systemGapSeconds,
          threshold: baseline.maxGapSeconds,
          lastReceived: metrics.lastReceivedSystemLog,
        },
      });
    }

    // Check for missing sources
    for (const source of this.config.sources) {
      if (source.lastSeen) {
        const sourceGapSeconds = (now.getTime() - source.lastSeen.getTime()) / 1000;
        if (sourceGapSeconds > baseline.maxGapSeconds) {
          anomalies.push({
            type: 'source_missing',
            severity: 'critical',
            message: `No logs from source ${source.name} for ${Math.floor(sourceGapSeconds)} seconds`,
            detectedAt: now,
            details: {
              source: source.name,
              host: source.host,
              gapSeconds: sourceGapSeconds,
              lastSeen: source.lastSeen,
            },
          });
        }
      }
    }

    // Store anomalies
    this.anomalyHistory.push(...anomalies);
    if (this.anomalyHistory.length > 100) {
      this.anomalyHistory = this.anomalyHistory.slice(-100);
    }

    return {
      hasAnomaly: anomalies.length > 0,
      anomalies,
      baseline,
      currentMetrics: metrics,
      lastChecked: now,
    };
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Get metrics history
   */
  getMetricsHistory(): IngestionMetrics[] {
    return [...this.metricsHistory];
  }

  /**
   * Get anomaly history
   */
  getAnomalyHistory(since?: Date): Anomaly[] {
    if (!since) return [...this.anomalyHistory];
    return this.anomalyHistory.filter(a => a.detectedAt >= since);
  }

  /**
   * Update source last seen timestamp
   */
  updateSourceLastSeen(sourceName: string): void {
    const source = this.config.sources.find(s => s.name === sourceName);
    if (source) {
      source.lastSeen = new Date();
    }
  }

  /**
   * Run comprehensive health check
   */
  async runHealthCheck(): Promise<{
    tlsStatus: TLSStatus;
    certStatus: CertStatus;
    metrics: IngestionMetrics;
    retention: RetentionStatus;
    anomalies: AnomalyReport;
    overallHealth: 'healthy' | 'degraded' | 'unhealthy';
  }> {
    const tlsStatus = await this.checkTLSConnection(
      this.config.sinkHost,
      this.config.sinkPort
    );

    const certStatus = await this.checkCertificateExpiry(
      this.config.sinkHost,
      this.config.sinkPort
    );

    const metrics = await this.getLogIngestionRate();
    const retention = await this.checkLogRetention();
    const anomalies = await this.detectIngestionAnomaly();

    // Determine overall health
    let overallHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (!tlsStatus.connected || !certStatus.valid) {
      overallHealth = 'unhealthy';
    } else if (
      certStatus.warningLevel !== 'ok' ||
      anomalies.anomalies.some(a => a.severity === 'critical')
    ) {
      overallHealth = 'unhealthy';
    } else if (
      anomalies.anomalies.some(a => a.severity === 'warning') ||
      metrics.droppedLogs > 0
    ) {
      overallHealth = 'degraded';
    }

    return {
      tlsStatus,
      certStatus,
      metrics,
      retention,
      anomalies,
      overallHealth,
    };
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  /**
   * Format distinguished name from certificate
   */
  private formatDN(dn: Record<string, string | string[]>): string {
    if (!dn) return 'unknown';

    return Object.entries(dn)
      .map(([key, value]) => {
        const val = Array.isArray(value) ? value.join(', ') : value;
        return `${key}=${val}`;
      })
      .join(', ');
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create syslog health monitor from environment variables
 */
export function createSyslogHealthMonitorFromEnv(): SyslogHealthMonitor {
  const host = process.env.SYSLOG_SINK_HOST;
  if (!host) {
    throw new Error('SYSLOG_SINK_HOST environment variable is required');
  }

  const config: SyslogHealthMonitorConfig = {
    sinkHost: host,
    sinkPort: parseInt(process.env.SYSLOG_SINK_PORT || '6514', 10),
    protocol: (process.env.SYSLOG_PROTOCOL as 'tcp' | 'tls') || 'tls',
    certExpiryWarningDays: parseInt(process.env.CERT_EXPIRY_WARNING_DAYS || '30', 10),
    certExpiryCriticalDays: parseInt(process.env.CERT_EXPIRY_CRITICAL_DAYS || '7', 10),
    connectionTimeoutMs: parseInt(process.env.SYSLOG_CONNECTION_TIMEOUT_MS || '10000', 10),
    readTimeoutMs: parseInt(process.env.SYSLOG_READ_TIMEOUT_MS || '5000', 10),
    sources: [],
    baseline: {
      expectedAuthLogsPerMinute: parseInt(process.env.EXPECTED_AUTH_LOGS_PER_MINUTE || '10', 10),
      expectedSystemLogsPerMinute: parseInt(process.env.EXPECTED_SYSTEM_LOGS_PER_MINUTE || '20', 10),
      maxLatencyMs: parseInt(process.env.LOG_MAX_LATENCY_MS || '100', 10),
      maxGapSeconds: parseInt(process.env.LOG_MAX_GAP_SECONDS || '300', 10),
      minRateThreshold: parseInt(process.env.LOG_MIN_RATE_THRESHOLD || '50', 10),
      maxRateThreshold: parseInt(process.env.LOG_MAX_RATE_THRESHOLD || '200', 10),
    },
  };

  // Add StarlingX source if configured
  if (process.env.STX_HOST) {
    config.sources.push({
      name: 'starlingx',
      host: process.env.STX_HOST,
      expectedLogsPerMinute: parseInt(process.env.LOG_INGESTION_MIN_RATE || '1', 10),
      logTypes: ['auth', 'system'],
    });
  }

  return new SyslogHealthMonitor(config);
}

/**
 * Create syslog health monitor for specific sink
 */
export function createSyslogHealthMonitorForSink(
  sinkHost: string,
  sinkPort: number = 6514,
  sources: SyslogSource[] = []
): SyslogHealthMonitor {
  return new SyslogHealthMonitor({
    sinkHost,
    sinkPort,
    protocol: 'tls',
    certExpiryWarningDays: 30,
    certExpiryCriticalDays: 7,
    connectionTimeoutMs: 10000,
    readTimeoutMs: 5000,
    sources,
    baseline: {
      expectedAuthLogsPerMinute: 10,
      expectedSystemLogsPerMinute: 20,
      maxLatencyMs: 100,
      maxGapSeconds: 300,
      minRateThreshold: 50,
      maxRateThreshold: 200,
    },
  });
}

/**
 * Create syslog health monitor for production syslog sink
 */
export function createProductionSyslogMonitor(sinkHost: string): SyslogHealthMonitor {
  return new SyslogHealthMonitor({
    sinkHost,
    sinkPort: 6514,
    protocol: 'tls',
    certExpiryWarningDays: 30,
    certExpiryCriticalDays: 7,
    connectionTimeoutMs: 10000,
    readTimeoutMs: 5000,
    sources: [
      {
        name: 'starlingx-stx-aio-0',
        host: '23.92.79.2',
        expectedLogsPerMinute: 30,
        logTypes: ['auth', 'system'],
      },
    ],
    baseline: {
      expectedAuthLogsPerMinute: 10,
      expectedSystemLogsPerMinute: 20,
      maxLatencyMs: 100,
      maxGapSeconds: 300,
      minRateThreshold: 50,
      maxRateThreshold: 200,
    },
  });
}
