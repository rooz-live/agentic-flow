/**
 * Provider Health Monitor - Comprehensive Monitoring System
 *
 * Provides unified health monitoring for cloud infrastructure:
 * - AWS Lightsail: Instance health, networking, synthetic checks
 * - Hivelocity: Device status, IPMI power state, port configuration
 * - Drift detection: Configuration drift monitoring
 *
 * Infrastructure Context:
 * - Primary Provider: AWS Lightsail (syslog sink VPS)
 * - Secondary Provider: Hivelocity (stx-aio-0 bare metal at 23.92.79.2)
 *
 * @module monitoring/provider-health-monitor
 */

import * as tls from 'tls';
import * as net from 'net';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * AWS Lightsail health status
 */
export interface AWSHealthStatus {
  instanceState: 'running' | 'stopped' | 'pending' | 'terminated';
  systemChecks: 'ok' | 'impaired' | 'initializing';
  instanceChecks: 'ok' | 'impaired' | 'initializing';
  lastChecked: Date;
}

/**
 * Network status for AWS instances
 */
export interface NetworkStatus {
  publicIp?: string;
  privateIp?: string;
  ports: PortStatus[];
  firewallConfigured: boolean;
  lastChecked: Date;
}

/**
 * Port status information
 */
export interface PortStatus {
  port: number;
  protocol: 'tcp' | 'udp';
  state: 'open' | 'closed' | 'filtered';
  service?: string;
}

/**
 * Hivelocity device status
 */
export interface HivelocityStatus {
  powerState: 'on' | 'off' | 'unknown';
  networkState: 'up' | 'down' | 'unknown';
  ipmiAvailable: boolean;
  lastChecked: Date;
}

/**
 * IPMI status details
 */
export interface IPMIStatus {
  available: boolean;
  powerState: 'on' | 'off' | 'unknown';
  sensorData?: Record<string, number>;
  lastChecked: Date;
  error?: string;
}

/**
 * Hivelocity port configuration
 */
export interface HivelocityPortConfig {
  portId: string;
  vlanId?: number;
  speed: string;
  duplex: 'full' | 'half' | 'auto';
  status: 'up' | 'down' | 'unknown';
  ipAddress?: string;
  macAddress?: string;
}

/**
 * Synthetic check result
 */
export interface SyntheticCheckResult {
  success: boolean;
  latencyMs: number;
  statusCode?: number;
  error?: string;
  timestamp: Date;
}

/**
 * Drift item details
 */
export interface DriftItem {
  resource: string;
  property: string;
  expected: unknown;
  actual: unknown;
  severity: 'critical' | 'warning' | 'info';
  detectedAt: Date;
}

/**
 * Drift report
 */
export interface DriftReport {
  hasDrift: boolean;
  driftItems: DriftItem[];
  lastChecked: Date;
}

/**
 * Overall health status
 */
export interface OverallHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  providers: {
    aws?: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      instances: Map<string, AWSHealthStatus>;
    };
    hivelocity?: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      devices: Map<string, HivelocityStatus>;
    };
  };
  drift: DriftReport;
  lastChecked: Date;
}

/**
 * Expected configuration for drift detection
 */
export interface ExpectedConfiguration {
  aws?: {
    instances: Map<string, {
      state: 'running';
      ports: number[];
      sshAllowlist?: string[];
    }>;
  };
  hivelocity?: {
    devices: Map<string, {
      powerState: 'on';
      networkState: 'up';
      ipmiAvailable: boolean;
    }>;
  };
}

/**
 * Provider health monitor configuration
 */
export interface ProviderHealthMonitorConfig {
  // AWS configuration
  aws?: {
    region: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  };

  // Hivelocity configuration
  hivelocity?: {
    apiKey: string;
    apiBaseUrl?: string;
  };

  // Expected configuration for drift detection
  expectedConfig?: ExpectedConfiguration;

  // Retry configuration
  retryAttempts: number;
  retryDelayMs: number;

  // Timeout configuration
  timeoutMs: number;
}

// ============================================================================
// Provider Health Monitor Class
// ============================================================================

/**
 * Comprehensive provider health monitor
 *
 * Monitors AWS Lightsail and Hivelocity infrastructure:
 * - Instance/device health checks
 * - Synthetic HTTP/SSH monitoring
 * - Configuration drift detection
 */
export class ProviderHealthMonitor {
  private config: ProviderHealthMonitorConfig;
  private awsHealthCache: Map<string, AWSHealthStatus> = new Map();
  private hivelocityHealthCache: Map<string, HivelocityStatus> = new Map();
  private lastDriftReport?: DriftReport;

  constructor(config: ProviderHealthMonitorConfig) {
    this.config = {
      retryAttempts: 3,
      retryDelayMs: 1000,
      timeoutMs: 10000,
      ...config,
    };
  }

  // ==========================================================================
  // AWS Lightsail Monitoring
  // ==========================================================================

  /**
   * Check AWS Lightsail instance health
   *
   * @param instanceId - Lightsail instance name/ID
   * @returns Health status of the instance
   */
  async checkAWSInstanceHealth(instanceId: string): Promise<AWSHealthStatus> {
    const startTime = Date.now();

    try {
      // In production, use AWS SDK:
      // const client = new LightsailClient({ region: this.config.aws?.region });
      // const response = await client.send(new GetInstanceCommand({ instanceName: instanceId }));

      // Simulated API call for development
      const instanceData = await this.awsApiRequest('GetInstance', { instanceName: instanceId });

      const status: AWSHealthStatus = {
        instanceState: this.mapInstanceState(instanceData?.instance?.state?.name),
        systemChecks: this.mapCheckStatus(instanceData?.instance?.state?.code),
        instanceChecks: this.mapCheckStatus(instanceData?.instance?.state?.code),
        lastChecked: new Date(),
      };

      this.awsHealthCache.set(instanceId, status);
      this.log('info', `AWS instance ${instanceId} health check completed in ${Date.now() - startTime}ms`);

      return status;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log('error', `Failed to check AWS instance ${instanceId}: ${errorMessage}`);

      const status: AWSHealthStatus = {
        instanceState: 'terminated',
        systemChecks: 'impaired',
        instanceChecks: 'impaired',
        lastChecked: new Date(),
      };

      this.awsHealthCache.set(instanceId, status);
      return status;
    }
  }

  /**
   * Check AWS instance networking configuration
   *
   * @param instanceId - Lightsail instance name/ID
   * @returns Network status of the instance
   */
  async checkAWSNetworking(instanceId: string): Promise<NetworkStatus> {
    try {
      // In production, use AWS SDK to get instance networking details
      const instanceData = await this.awsApiRequest('GetInstance', { instanceName: instanceId });

      const ports: PortStatus[] = [];

      // Check configured firewall ports
      const firewallRules = instanceData?.instance?.networking?.ports || [];
      for (const rule of firewallRules) {
        ports.push({
          port: rule.fromPort || 0,
          protocol: (rule.protocol || 'tcp').toLowerCase() as 'tcp' | 'udp',
          state: 'open',
          service: this.getServiceName(rule.fromPort),
        });
      }

      return {
        publicIp: instanceData?.instance?.publicIpAddress,
        privateIp: instanceData?.instance?.privateIpAddress,
        ports,
        firewallConfigured: ports.length > 0,
        lastChecked: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log('error', `Failed to check AWS networking for ${instanceId}: ${errorMessage}`);

      return {
        ports: [],
        firewallConfigured: false,
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Run synthetic HTTP check against an endpoint
   *
   * @param endpoint - URL to check
   * @returns Synthetic check result
   */
  async runSyntheticHTTPCheck(endpoint: string): Promise<SyntheticCheckResult> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

      const response = await fetch(endpoint, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'ProviderHealthMonitor/1.0',
        },
      });

      clearTimeout(timeoutId);

      return {
        success: response.ok,
        latencyMs: Date.now() - startTime,
        statusCode: response.status,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        latencyMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  /**
   * Run synthetic SSH check against a host
   *
   * @param host - Hostname or IP address
   * @param port - SSH port (default: 22)
   * @returns Synthetic check result
   */
  async runSyntheticSSHCheck(host: string, port: number = 22): Promise<SyntheticCheckResult> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const socket = new net.Socket();

      const timeout = setTimeout(() => {
        socket.destroy();
        resolve({
          success: false,
          latencyMs: Date.now() - startTime,
          error: 'Connection timeout',
          timestamp: new Date(),
        });
      }, this.config.timeoutMs);

      socket.connect(port, host, () => {
        clearTimeout(timeout);
        const latencyMs = Date.now() - startTime;
        socket.destroy();
        resolve({
          success: true,
          latencyMs,
          timestamp: new Date(),
        });
      });

      socket.on('error', (err) => {
        clearTimeout(timeout);
        socket.destroy();
        resolve({
          success: false,
          latencyMs: Date.now() - startTime,
          error: err.message,
          timestamp: new Date(),
        });
      });
    });
  }

  // ==========================================================================
  // Hivelocity Monitoring
  // ==========================================================================

  /**
   * Check Hivelocity device status
   *
   * @param deviceId - Hivelocity device ID
   * @returns Device status
   */
  async checkHivelocityDeviceStatus(deviceId: string): Promise<HivelocityStatus> {
    const startTime = Date.now();

    try {
      const deviceData = await this.hivelocityApiRequest(`/device/${deviceId}`);
      const powerData = await this.hivelocityApiRequest(`/device/${deviceId}/power`);

      const status: HivelocityStatus = {
        powerState: this.mapPowerState(powerData?.powerStatus),
        networkState: deviceData?.networkStatus === 'active' ? 'up' : 'down',
        ipmiAvailable: deviceData?.ipmiEnabled === true,
        lastChecked: new Date(),
      };

      this.hivelocityHealthCache.set(deviceId, status);
      this.log('info', `Hivelocity device ${deviceId} status check completed in ${Date.now() - startTime}ms`);

      return status;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log('error', `Failed to check Hivelocity device ${deviceId}: ${errorMessage}`);

      const status: HivelocityStatus = {
        powerState: 'unknown',
        networkState: 'unknown',
        ipmiAvailable: false,
        lastChecked: new Date(),
      };

      this.hivelocityHealthCache.set(deviceId, status);
      return status;
    }
  }

  /**
   * Check Hivelocity IPMI power state
   *
   * @param deviceId - Hivelocity device ID
   * @returns IPMI status
   */
  async checkIPMIPowerState(deviceId: string): Promise<IPMIStatus> {
    try {
      const ipmiData = await this.hivelocityApiRequest(`/device/${deviceId}/ipmi`);

      return {
        available: ipmiData?.available === true || ipmiData?.status === 'available',
        powerState: this.mapPowerState(ipmiData?.powerState),
        sensorData: ipmiData?.sensors,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        available: false,
        powerState: 'unknown',
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check Hivelocity port configuration
   *
   * @param deviceId - Hivelocity device ID
   * @returns Port status array
   */
  async checkHivelocityPortConfig(deviceId: string): Promise<HivelocityPortConfig[]> {
    try {
      const portData = await this.hivelocityApiRequest(`/device/${deviceId}/ports`);

      return (portData?.ports || []).map((port: Record<string, unknown>) => ({
        portId: String(port.portId || port.id),
        vlanId: port.vlanId as number | undefined,
        speed: String(port.speed || 'unknown'),
        duplex: (port.duplex as 'full' | 'half' | 'auto') || 'auto',
        status: this.mapPortStatus(port.status as string),
        ipAddress: port.ipAddress as string | undefined,
        macAddress: port.macAddress as string | undefined,
      }));
    } catch (error) {
      this.log('error', `Failed to check Hivelocity port config for ${deviceId}: ${error}`);
      return [];
    }
  }

  // ==========================================================================
  // Drift Detection
  // ==========================================================================

  /**
   * Detect configuration drift across all providers
   *
   * @returns Drift report
   */
  async detectConfigurationDrift(): Promise<DriftReport> {
    const driftItems: DriftItem[] = [];
    const expectedConfig = this.config.expectedConfig;

    if (!expectedConfig) {
      return {
        hasDrift: false,
        driftItems: [],
        lastChecked: new Date(),
      };
    }

    // Check AWS instances
    if (expectedConfig.aws?.instances) {
      for (const [instanceId, expected] of expectedConfig.aws.instances) {
        const actual = await this.checkAWSInstanceHealth(instanceId);

        if (actual.instanceState !== expected.state) {
          driftItems.push({
            resource: `aws:${instanceId}`,
            property: 'instanceState',
            expected: expected.state,
            actual: actual.instanceState,
            severity: 'critical',
            detectedAt: new Date(),
          });
        }

        // Check port configuration
        const networking = await this.checkAWSNetworking(instanceId);
        const actualPorts = networking.ports.map(p => p.port);
        const missingPorts = expected.ports.filter(p => !actualPorts.includes(p));

        for (const port of missingPorts) {
          driftItems.push({
            resource: `aws:${instanceId}`,
            property: 'port',
            expected: port,
            actual: 'missing',
            severity: 'warning',
            detectedAt: new Date(),
          });
        }
      }
    }

    // Check Hivelocity devices
    if (expectedConfig.hivelocity?.devices) {
      for (const [deviceId, expected] of expectedConfig.hivelocity.devices) {
        const actual = await this.checkHivelocityDeviceStatus(deviceId);

        if (actual.powerState !== expected.powerState) {
          driftItems.push({
            resource: `hivelocity:${deviceId}`,
            property: 'powerState',
            expected: expected.powerState,
            actual: actual.powerState,
            severity: 'critical',
            detectedAt: new Date(),
          });
        }

        if (actual.networkState !== expected.networkState) {
          driftItems.push({
            resource: `hivelocity:${deviceId}`,
            property: 'networkState',
            expected: expected.networkState,
            actual: actual.networkState,
            severity: 'critical',
            detectedAt: new Date(),
          });
        }

        if (actual.ipmiAvailable !== expected.ipmiAvailable) {
          driftItems.push({
            resource: `hivelocity:${deviceId}`,
            property: 'ipmiAvailable',
            expected: expected.ipmiAvailable,
            actual: actual.ipmiAvailable,
            severity: 'warning',
            detectedAt: new Date(),
          });
        }
      }
    }

    const report: DriftReport = {
      hasDrift: driftItems.length > 0,
      driftItems,
      lastChecked: new Date(),
    };

    this.lastDriftReport = report;
    return report;
  }

  // ==========================================================================
  // Unified Health
  // ==========================================================================

  /**
   * Get overall health status across all providers
   *
   * @returns Overall health status
   */
  async getOverallHealth(): Promise<OverallHealthStatus> {
    const drift = await this.detectConfigurationDrift();

    let awsStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let hivelocityStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Evaluate AWS health
    for (const [, status] of this.awsHealthCache) {
      if (status.instanceState !== 'running') {
        awsStatus = 'unhealthy';
        break;
      }
      if (status.systemChecks !== 'ok' || status.instanceChecks !== 'ok') {
        awsStatus = 'degraded';
      }
    }

    // Evaluate Hivelocity health
    for (const [, status] of this.hivelocityHealthCache) {
      if (status.powerState !== 'on' || status.networkState !== 'up') {
        hivelocityStatus = 'unhealthy';
        break;
      }
      if (!status.ipmiAvailable) {
        hivelocityStatus = 'degraded';
      }
    }

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (awsStatus === 'unhealthy' || hivelocityStatus === 'unhealthy') {
      overallStatus = 'unhealthy';
    } else if (awsStatus === 'degraded' || hivelocityStatus === 'degraded' || drift.hasDrift) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      providers: {
        aws: this.config.aws ? {
          status: awsStatus,
          instances: this.awsHealthCache,
        } : undefined,
        hivelocity: this.config.hivelocity ? {
          status: hivelocityStatus,
          devices: this.hivelocityHealthCache,
        } : undefined,
      },
      drift,
      lastChecked: new Date(),
    };
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  /**
   * Make AWS API request (simulated for development)
   */
  private async awsApiRequest(action: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
    // In production, use AWS SDK
    this.log('debug', `[AWS] ${action}`, params);

    // Simulated response
    if (action === 'GetInstance') {
      return {
        instance: {
          name: params.instanceName,
          state: { name: 'running', code: 16 },
          publicIpAddress: '0.0.0.0',
          privateIpAddress: '10.0.0.1',
          networking: {
            ports: [
              { fromPort: 22, toPort: 22, protocol: 'tcp' },
              { fromPort: 6514, toPort: 6514, protocol: 'tcp' },
            ],
          },
        },
      };
    }

    return {};
  }

  /**
   * Make Hivelocity API request
   */
  private async hivelocityApiRequest(endpoint: string): Promise<Record<string, unknown>> {
    if (!this.config.hivelocity?.apiKey) {
      throw new Error('Hivelocity API key not configured');
    }

    const baseUrl = this.config.hivelocity.apiBaseUrl || 'https://core.hivelocity.net/api/v2';
    const url = `${baseUrl}${endpoint}`;

    const response = await this.retryWithBackoff(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'X-API-KEY': this.config.hivelocity!.apiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`Hivelocity API error: ${res.status} ${res.statusText}`);
        }

        return res.json();
      } finally {
        clearTimeout(timeoutId);
      }
    });

    return response;
  }

  /**
   * Retry an operation with exponential backoff
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.retryAttempts,
    baseDelayMs: number = this.config.retryDelayMs
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          const delay = baseDelayMs * Math.pow(2, attempt);
          this.log('warn', `Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms: ${lastError.message}`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Map AWS instance state string to type
   */
  private mapInstanceState(state?: string): AWSHealthStatus['instanceState'] {
    const stateMap: Record<string, AWSHealthStatus['instanceState']> = {
      running: 'running',
      stopped: 'stopped',
      pending: 'pending',
      terminated: 'terminated',
      'shutting-down': 'terminated',
    };
    return stateMap[state?.toLowerCase() || ''] || 'terminated';
  }

  /**
   * Map AWS check status code to string
   */
  private mapCheckStatus(code?: number): AWSHealthStatus['systemChecks'] {
    if (code === 16) return 'ok'; // running
    if (code === 0) return 'initializing'; // pending
    return 'impaired';
  }

  /**
   * Map power state string to type
   */
  private mapPowerState(state?: string): 'on' | 'off' | 'unknown' {
    const stateMap: Record<string, 'on' | 'off' | 'unknown'> = {
      on: 'on',
      off: 'off',
      running: 'on',
      stopped: 'off',
    };
    return stateMap[state?.toLowerCase() || ''] || 'unknown';
  }

  /**
   * Map port status string to type
   */
  private mapPortStatus(status?: string): 'up' | 'down' | 'unknown' {
    const statusMap: Record<string, 'up' | 'down' | 'unknown'> = {
      up: 'up',
      down: 'down',
      active: 'up',
      inactive: 'down',
    };
    return statusMap[status?.toLowerCase() || ''] || 'unknown';
  }

  /**
   * Get service name for common ports
   */
  private getServiceName(port?: number): string | undefined {
    const services: Record<number, string> = {
      22: 'ssh',
      80: 'http',
      443: 'https',
      6514: 'syslog-tls',
      514: 'syslog',
    };
    return port ? services[port] : undefined;
  }

  /**
   * Log message
   */
  private log(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: unknown): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [ProviderHealthMonitor] [${level.toUpperCase()}] ${message}`;
    
    if (data) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create provider health monitor from environment variables
 */
export function createProviderHealthMonitorFromEnv(): ProviderHealthMonitor {
  const config: ProviderHealthMonitorConfig = {
    retryAttempts: parseInt(process.env.MONITOR_RETRY_ATTEMPTS || '3', 10),
    retryDelayMs: parseInt(process.env.MONITOR_RETRY_DELAY_MS || '1000', 10),
    timeoutMs: parseInt(process.env.MONITOR_TIMEOUT_MS || '10000', 10),
  };

  // Configure AWS if credentials are available
  if (process.env.AWS_REGION) {
    config.aws = {
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  }

  // Configure Hivelocity if API key is available
  if (process.env.HIVELOCITY_API_KEY) {
    config.hivelocity = {
      apiKey: process.env.HIVELOCITY_API_KEY,
      apiBaseUrl: process.env.HIVELOCITY_API_URL,
    };
  }

  return new ProviderHealthMonitor(config);
}

/**
 * Create provider health monitor for syslog sink monitoring
 */
export function createSyslogSinkHealthMonitor(
  awsInstanceId: string,
  hivelocityDeviceId?: string
): ProviderHealthMonitor {
  const config: ProviderHealthMonitorConfig = {
    retryAttempts: 3,
    retryDelayMs: 1000,
    timeoutMs: 10000,
    aws: {
      region: process.env.AWS_REGION || 'us-east-1',
    },
    expectedConfig: {
      aws: {
        instances: new Map([
          [awsInstanceId, {
            state: 'running' as const,
            ports: [22, 6514], // SSH and syslog-TLS
          }],
        ]),
      },
    },
  };

  // Add Hivelocity configuration if device ID provided
  if (hivelocityDeviceId && process.env.HIVELOCITY_API_KEY) {
    config.hivelocity = {
      apiKey: process.env.HIVELOCITY_API_KEY,
    };
    config.expectedConfig!.hivelocity = {
      devices: new Map([
        [hivelocityDeviceId, {
          powerState: 'on' as const,
          networkState: 'up' as const,
          ipmiAvailable: true,
        }],
      ]),
    };
  }

  return new ProviderHealthMonitor(config);
}
