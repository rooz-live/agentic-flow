/**
 * Hivelocity API Monitor
 *
 * Comprehensive monitoring for Hivelocity bare metal devices:
 * - Device power state (on/off/suspended)
 * - Port configuration (SSH, syslog, etc.)
 * - IPMI availability and status
 * - Device health metrics
 * - Network connectivity status
 * - Drift detection against expected configuration
 *
 * Security:
 * - API key from environment variables (HIVELOCITY_API_KEY)
 * - No hardcoded credentials
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface PowerState {
  state: 'on' | 'off' | 'suspended';
  lastChanged: Date;
}

export interface PortConfig {
  port: number;
  protocol: 'tcp' | 'udp';
  status: 'open' | 'closed' | 'filtered';
  purpose: string;
}

export interface IPMIStatus {
  available: boolean;
  lastAccess: Date;
  ip: string;
}

export interface DeviceHealth {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  uptime: number;
}

export interface NetworkStatus {
  connected: boolean;
  latency: number;
  bandwidth: number;
}

export interface DriftItem {
  type: 'power' | 'port' | 'ipmi' | 'network' | 'health';
  expected: any;
  actual: any;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DriftReport {
  hasDrift: boolean;
  drifts: DriftItem[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  deviceId: number;
}

export interface ExpectedConfig {
  powerState?: PowerState;
  ports?: PortConfig[];
  ipmiAvailable?: boolean;
  networkConnected?: boolean;
  healthThresholds?: {
    maxCpuUsage?: number;
    maxMemoryUsage?: number;
    maxDiskUsage?: number;
  };
}

// ============================================================================
// Hivelocity Monitor Class
// ============================================================================

export class HivelocityMonitor {
  private apiKey: string;
  private deviceId: number;
  private apiBaseUrl: string;

  constructor(apiKey: string, deviceId: number) {
    this.apiKey = apiKey;
    this.deviceId = deviceId;
    this.apiBaseUrl = 'https://api.hivelocity.net/api/v2';
  }

  /**
   * Monitor device power state
   */
  async getPowerState(): Promise<PowerState> {
    try {
      const response = await this.apiRequest(`/device/${this.deviceId}/power`);
      
      return {
        state: response.power_status || 'on',
        lastChanged: new Date(response.last_power_change || Date.now()),
      };
    } catch (error) {
      throw new Error(`Failed to get power state: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Monitor port configuration
   */
  async getPortConfiguration(): Promise<PortConfig[]> {
    try {
      const response = await this.apiRequest(`/device/${this.deviceId}/ports`);
      
      return response.ports?.map((port: any) => ({
        port: port.port_number,
        protocol: port.protocol || 'tcp',
        status: port.status || 'closed',
        purpose: port.purpose || 'unknown',
      })) || [];
    } catch (error) {
      throw new Error(`Failed to get port configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Monitor IPMI status
   */
  async getIPMIStatus(): Promise<IPMIStatus> {
    try {
      const response = await this.apiRequest(`/device/${this.deviceId}/ipmi`);
      
      return {
        available: response.available || false,
        lastAccess: new Date(response.last_access || Date.now()),
        ip: response.ip_address || '',
      };
    } catch (error) {
      throw new Error(`Failed to get IPMI status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Monitor device health
   */
  async getDeviceHealth(): Promise<DeviceHealth> {
    try {
      const response = await this.apiRequest(`/device/${this.deviceId}/metrics`);
      
      return {
        cpuUsage: response.cpu_usage || 0,
        memoryUsage: response.memory_usage || 0,
        diskUsage: response.disk_usage || 0,
        uptime: response.uptime || 0,
      };
    } catch (error) {
      throw new Error(`Failed to get device health: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Monitor network connectivity
   */
  async getNetworkStatus(): Promise<NetworkStatus> {
    try {
      const response = await this.apiRequest(`/device/${this.deviceId}/network`);
      
      return {
        connected: response.connected || false,
        latency: response.latency || 0,
        bandwidth: response.bandwidth || 0,
      };
    } catch (error) {
      throw new Error(`Failed to get network status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check for configuration drift
   */
  async checkDrift(expectedConfig: ExpectedConfig): Promise<DriftReport> {
    const drifts: DriftItem[] = [];
    let maxSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Check power state drift
    if (expectedConfig.powerState) {
      const actualPowerState = await this.getPowerState();
      if (actualPowerState.state !== expectedConfig.powerState.state) {
        const severity = expectedConfig.powerState.state === 'off' ? 'critical' : 'high';
        drifts.push({
          type: 'power',
          expected: expectedConfig.powerState.state,
          actual: actualPowerState.state,
          description: `Power state mismatch: expected ${expectedConfig.powerState.state}, got ${actualPowerState.state}`,
          severity,
        });
        maxSeverity = this.getHigherSeverity(maxSeverity, severity);
      }
    }

    // Check port configuration drift
    if (expectedConfig.ports) {
      const actualPorts = await this.getPortConfiguration();
      const portDrifts = this.comparePorts(expectedConfig.ports, actualPorts);
      drifts.push(...portDrifts);
      if (portDrifts.length > 0) {
        maxSeverity = this.getHigherSeverity(maxSeverity, 'medium');
      }
    }

    // Check IPMI availability drift
    if (expectedConfig.ipmiAvailable !== undefined) {
      const actualIPMI = await this.getIPMIStatus();
      if (actualIPMI.available !== expectedConfig.ipmiAvailable) {
        const severity = expectedConfig.ipmiAvailable ? 'high' : 'medium';
        drifts.push({
          type: 'ipmi',
          expected: expectedConfig.ipmiAvailable,
          actual: actualIPMI.available,
          description: `IPMI availability mismatch: expected ${expectedConfig.ipmiAvailable}, got ${actualIPMI.available}`,
          severity,
        });
        maxSeverity = this.getHigherSeverity(maxSeverity, severity);
      }
    }

    // Check network connectivity drift
    if (expectedConfig.networkConnected !== undefined) {
      const actualNetwork = await this.getNetworkStatus();
      if (actualNetwork.connected !== expectedConfig.networkConnected) {
        const severity = expectedConfig.networkConnected ? 'critical' : 'high';
        drifts.push({
          type: 'network',
          expected: expectedConfig.networkConnected,
          actual: actualNetwork.connected,
          description: `Network connectivity mismatch: expected ${expectedConfig.networkConnected}, got ${actualNetwork.connected}`,
          severity,
        });
        maxSeverity = this.getHigherSeverity(maxSeverity, severity);
      }
    }

    // Check health thresholds drift
    if (expectedConfig.healthThresholds) {
      const actualHealth = await this.getDeviceHealth();
      const healthDrifts = this.compareHealth(expectedConfig.healthThresholds, actualHealth);
      drifts.push(...healthDrifts);
      if (healthDrifts.length > 0) {
        maxSeverity = this.getHigherSeverity(maxSeverity, 'medium');
      }
    }

    return {
      hasDrift: drifts.length > 0,
      drifts,
      severity: maxSeverity,
      timestamp: new Date(),
      deviceId: this.deviceId,
    };
  }

  /**
   * Compare expected and actual port configurations
   */
  private comparePorts(expected: PortConfig[], actual: PortConfig[]): DriftItem[] {
    const drifts: DriftItem[] = [];
    
    for (const expectedPort of expected) {
      const actualPort = actual.find(p => p.port === expectedPort.port);
      
      if (!actualPort) {
        drifts.push({
          type: 'port',
          expected: expectedPort,
          actual: null,
          description: `Port ${expectedPort.port} not found in actual configuration`,
          severity: 'medium',
        });
      } else if (actualPort.status !== expectedPort.status) {
        drifts.push({
          type: 'port',
          expected: expectedPort.status,
          actual: actualPort.status,
          description: `Port ${expectedPort.port} status mismatch: expected ${expectedPort.status}, got ${actualPort.status}`,
          severity: 'low',
        });
      }
    }
    
    return drifts;
  }

  /**
   * Compare health metrics against thresholds
   */
  private compareHealth(thresholds: ExpectedConfig['healthThresholds'], actual: DeviceHealth): DriftItem[] {
    const drifts: DriftItem[] = [];
    
    if (thresholds?.maxCpuUsage && actual.cpuUsage > thresholds.maxCpuUsage) {
      drifts.push({
        type: 'health',
        expected: `<= ${thresholds.maxCpuUsage}%`,
        actual: `${actual.cpuUsage}%`,
        description: `CPU usage exceeds threshold: ${actual.cpuUsage}% > ${thresholds.maxCpuUsage}%`,
        severity: 'medium',
      });
    }
    
    if (thresholds?.maxMemoryUsage && actual.memoryUsage > thresholds.maxMemoryUsage) {
      drifts.push({
        type: 'health',
        expected: `<= ${thresholds.maxMemoryUsage}%`,
        actual: `${actual.memoryUsage}%`,
        description: `Memory usage exceeds threshold: ${actual.memoryUsage}% > ${thresholds.maxMemoryUsage}%`,
        severity: 'medium',
      });
    }
    
    if (thresholds?.maxDiskUsage && actual.diskUsage > thresholds.maxDiskUsage) {
      drifts.push({
        type: 'health',
        expected: `<= ${thresholds.maxDiskUsage}%`,
        actual: `${actual.diskUsage}%`,
        description: `Disk usage exceeds threshold: ${actual.diskUsage}% > ${thresholds.maxDiskUsage}%`,
        severity: 'high',
      });
    }
    
    return drifts;
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
   * Make authenticated API request
   */
  private async apiRequest(endpoint: string): Promise<any> {
    const url = `${this.apiBaseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-KEY': this.apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}

/**
 * Create Hivelocity monitor from environment variables
 */
export function createHivelocityMonitorFromEnv(deviceId: number): HivelocityMonitor {
  const apiKey = process.env.HIVELOCITY_API_KEY;
  
  if (!apiKey) {
    throw new Error('HIVELOCITY_API_KEY environment variable is required');
  }
  
  return new HivelocityMonitor(apiKey, deviceId);
}
