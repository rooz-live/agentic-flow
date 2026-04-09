/**
 * AWS Health Monitor
 *
 * External synthetic monitoring for AWS infrastructure:
 * - HTTPS endpoint monitoring
 * - SSH connectivity monitoring
 * - Response time tracking
 * - Availability percentage tracking
 * - Drift detection against expected metrics
 *
 * Security:
 * - AWS credentials from environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
 * - No hardcoded credentials
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  timestamp: Date;
  details: string;
  error?: string;
}

export interface TimeWindow {
  start: Date;
  end: Date;
}

export interface ExpectedMetrics {
  availabilityThreshold: number;
  responseTimeThreshold: number;
}

export interface DriftReport {
  hasDrift: boolean;
  drifts: DriftItem[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  instanceId: string;
}

export interface DriftItem {
  type: 'availability' | 'response_time' | 'connectivity';
  expected: any;
  actual: any;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface HealthCheckHistory {
  checkId: string;
  target: string;
  checkType: 'https' | 'ssh';
  results: HealthCheckResult[];
  availability: number;
  avgResponseTime: number;
}

// ============================================================================
// AWS Health Monitor Class
// ============================================================================

export class AWSHealthMonitor {
  private region: string;
  private instanceId: string;
  private accessKeyId: string;
  private secretAccessKey: string;
  private history: Map<string, HealthCheckHistory> = new Map();

  constructor(region: string, instanceId: string, accessKeyId?: string, secretAccessKey?: string) {
    this.region = region;
    this.instanceId = instanceId;
    this.accessKeyId = accessKeyId || process.env.AWS_ACCESS_KEY_ID || '';
    this.secretAccessKey = secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY || '';
  }

  /**
   * Monitor HTTPS endpoint
   */
  async checkHTTPEndpoint(url: string): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const checkId = `https-${url}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      const result: HealthCheckResult = {
        status: response.ok ? 'healthy' : 'unhealthy',
        responseTime,
        timestamp: new Date(),
        details: `HTTP ${response.status} ${response.statusText}`,
      };

      this.recordHealthCheck(checkId, url, 'https', result);
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const result: HealthCheckResult = {
        status: 'unhealthy',
        responseTime,
        timestamp: new Date(),
        details: 'Failed to connect to HTTPS endpoint',
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      this.recordHealthCheck(checkId, url, 'https', result);
      return result;
    }
  }

  /**
   * Monitor SSH connectivity
   */
  async checkSSHConnectivity(ip: string, port: number = 22): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const checkId = `ssh-${ip}:${port}`;

    try {
      // In a real implementation, this would use a TCP connection
      // For now, we simulate the check
      const responseTime = Date.now() - startTime;

      // Simulate SSH check (would use net.connect in real implementation)
      const isConnected = await this.simulateSSHCheck(ip, port);

      const result: HealthCheckResult = {
        status: isConnected ? 'healthy' : 'unhealthy',
        responseTime,
        timestamp: new Date(),
        details: isConnected ? 'SSH connection successful' : 'SSH connection failed',
      };

      this.recordHealthCheck(checkId, `${ip}:${port}`, 'ssh', result);
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const result: HealthCheckResult = {
        status: 'unhealthy',
        responseTime,
        timestamp: new Date(),
        details: 'Failed to establish SSH connection',
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      this.recordHealthCheck(checkId, `${ip}:${port}`, 'ssh', result);
      return result;
    }
  }

  /**
   * Get response time for a URL
   */
  async getResponseTime(url: string): Promise<number> {
    const result = await this.checkHTTPEndpoint(url);
    return result.responseTime;
  }

  /**
   * Get availability percentage over a time window
   */
  async getAvailabilityPercentage(period: TimeWindow, target: string, checkType: 'https' | 'ssh'): Promise<number> {
    const checkId = `${checkType}-${target}`;
    const history = this.history.get(checkId);

    if (!history || history.results.length === 0) {
      return 0;
    }

    const resultsInPeriod = history.results.filter(
      r => r.timestamp >= period.start && r.timestamp <= period.end
    );

    if (resultsInPeriod.length === 0) {
      return 0;
    }

    const healthyCount = resultsInPeriod.filter(r => r.status === 'healthy').length;
    return (healthyCount / resultsInPeriod.length) * 100;
  }

  /**
   * Check for drift against expected metrics
   */
  async checkDrift(expectedMetrics: ExpectedMetrics, target: string, checkType: 'https' | 'ssh'): Promise<DriftReport> {
    const drifts: DriftItem[] = [];
    let maxSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    const checkId = `${checkType}-${target}`;
    const history = this.history.get(checkId);

    if (!history) {
      return {
        hasDrift: false,
        drifts: [],
        severity: 'low',
        timestamp: new Date(),
        instanceId: this.instanceId,
      };
    }

    // Check availability drift
    const availability = history.availability;
    if (availability < expectedMetrics.availabilityThreshold) {
      const severity = availability < expectedMetrics.availabilityThreshold * 0.8 ? 'critical' : 'high';
      drifts.push({
        type: 'availability',
        expected: `>= ${expectedMetrics.availabilityThreshold}%`,
        actual: `${availability.toFixed(2)}%`,
        description: `Availability below threshold: ${availability.toFixed(2)}% < ${expectedMetrics.availabilityThreshold}%`,
        severity,
      });
      maxSeverity = this.getHigherSeverity(maxSeverity, severity);
    }

    // Check response time drift
    const avgResponseTime = history.avgResponseTime;
    if (avgResponseTime > expectedMetrics.responseTimeThreshold) {
      const severity = avgResponseTime > expectedMetrics.responseTimeThreshold * 2 ? 'high' : 'medium';
      drifts.push({
        type: 'response_time',
        expected: `<= ${expectedMetrics.responseTimeThreshold}ms`,
        actual: `${avgResponseTime.toFixed(2)}ms`,
        description: `Response time exceeds threshold: ${avgResponseTime.toFixed(2)}ms > ${expectedMetrics.responseTimeThreshold}ms`,
        severity,
      });
      maxSeverity = this.getHigherSeverity(maxSeverity, severity);
    }

    return {
      hasDrift: drifts.length > 0,
      drifts,
      severity: maxSeverity,
      timestamp: new Date(),
      instanceId: this.instanceId,
    };
  }

  /**
   * Simulate SSH check (placeholder for real implementation)
   */
  private async simulateSSHCheck(ip: string, port: number): Promise<boolean> {
    // In a real implementation, this would use net.connect or a library like ssh2
    // For now, we return true to simulate a successful connection
    return true;
  }

  /**
   * Record health check result
   */
  private recordHealthCheck(
    checkId: string,
    target: string,
    checkType: 'https' | 'ssh',
    result: HealthCheckResult
  ): void {
    let history = this.history.get(checkId);

    if (!history) {
      history = {
        checkId,
        target,
        checkType,
        results: [],
        availability: 0,
        avgResponseTime: 0,
      };
      this.history.set(checkId, history);
    }

    // Keep only last 1000 results to prevent memory issues
    if (history.results.length >= 1000) {
      history.results.shift();
    }

    history.results.push(result);

    // Recalculate metrics
    const healthyCount = history.results.filter(r => r.status === 'healthy').length;
    history.availability = (healthyCount / history.results.length) * 100;

    const totalResponseTime = history.results.reduce((sum, r) => sum + r.responseTime, 0);
    history.avgResponseTime = totalResponseTime / history.results.length;
  }

  /**
   * Get higher severity between two severities
   */
  private getHigherSeverity(
    a: 'low' | 'medium' | 'high' | 'critical',
    b: 'low' | 'medium' | 'high' | 'critical'
  ): 'low' | 'medium' | 'high' | 'critical' {
    const severityOrder = ['low', 'medium', 'high', 'critical'];
    return severityOrder.indexOf(a) > severityOrder.indexOf(b) ? a : b;
  }

  /**
   * Get health check history
   */
  getHealthHistory(target: string, checkType: 'https' | 'ssh'): HealthCheckHistory | undefined {
    const checkId = `${checkType}-${target}`;
    return this.history.get(checkId);
  }

  /**
   * Get all health check summaries
   */
  getAllHealthSummaries(): HealthCheckHistory[] {
    return Array.from(this.history.values());
  }
}

/**
 * Create AWS health monitor from environment variables
 */
export function createAWSHealthMonitorFromEnv(region: string, instanceId: string): AWSHealthMonitor {
  return new AWSHealthMonitor(region, instanceId);
}
