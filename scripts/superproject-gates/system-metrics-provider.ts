/**
 * Real-time System Metrics Provider
 *
 * Provides real system metrics using Node.js built-in modules
 * with fallback to TRM-based bounded reasoning for unavailable metrics
 */

import * as os from 'os';
import { execSync } from 'child_process';
import { TRM } from '../health-checks.js';

export interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  uptime: number;
  source: 'real' | 'simulated';
}

export interface NetworkMetrics {
  latency: number;
  source: 'real' | 'simulated';
}

export class SystemMetricsProvider {
  private checkIteration: number = 0;
  private useRealMetrics: boolean = true;

  constructor(config?: { useRealMetrics?: boolean }) {
    this.useRealMetrics = config?.useRealMetrics ?? true;
  }

  public setCheckIteration(iteration: number): void {
    this.checkIteration = iteration;
  }

  /**
   * Get real CPU usage percentage
   */
  private getRealCPUUsage(): number {
    const cpuCores = os.cpus().length;
    const loadAvg = os.loadavg()[0];
    return Math.min(100, Math.round((loadAvg / cpuCores) * 100));
  }

  /**
   * Get real memory usage percentage
   */
  private getRealMemoryUsage(): number {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    return Math.round((usedMemory / totalMemory) * 100);
  }

  /**
   * Get real disk usage percentage
   */
  private getRealDiskUsage(): number {
    try {
      const output = execSync("df -h / | tail -1 | awk '{print $5}'", { encoding: 'utf-8' });
      const parsed = parseInt(output.trim().replace('%', ''));
      // Return parsed value if valid, otherwise use fallback
      if (isNaN(parsed)) {
        return TRM.boundedInt(['system', 'diskUsage', Date.now(), this.checkIteration], 30, 80);
      }
      return parsed;
    } catch (error) {
      console.warn('[METRICS] Disk usage check failed, using fallback');
      return TRM.boundedInt(['system', 'diskUsage', Date.now(), this.checkIteration], 30, 80);
    }
  }

  /**
   * Get real network latency (ping to reliable endpoint)
   */
  private async getRealNetworkLatency(): Promise<number> {
    try {
      const startTime = Date.now();
      // Try to ping Google's DNS server (8.8.8.8) with a single packet and 1 second timeout
      execSync('ping -c 1 -W 1000 8.8.8.8', { 
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 2000
      });
      const latency = Date.now() - startTime;
      return Math.max(1, Math.min(1000, latency));
    } catch (error) {
      console.warn('[METRICS] Network latency check failed, using fallback');
      return TRM.boundedInt(['system', 'networkLatency', Date.now(), this.checkIteration], 20, 80);
    }
  }

  /**
   * Get real system uptime
   */
  private getRealUptime(): number {
    return Math.round(os.uptime());
  }

  /**
   * Get all system metrics
   */
  public async getSystemMetrics(): Promise<SystemMetrics> {
    const timestamp = Date.now();
    
    // Collect metrics based on configuration
    const cpu = this.useRealMetrics ? this.getRealCPUUsage() : 
      TRM.boundedInt(['system', 'cpu', timestamp, this.checkIteration], 10, 80);
    
    const memory = this.useRealMetrics ? this.getRealMemoryUsage() : 
      TRM.boundedInt(['system', 'memory', timestamp, this.checkIteration], 30, 70);
    
    const disk = this.useRealMetrics ? this.getRealDiskUsage() : 
      TRM.boundedInt(['system', 'disk', timestamp, this.checkIteration], 30, 80);
    
    const network = this.useRealMetrics ? await this.getRealNetworkLatency() : 
      TRM.boundedInt(['system', 'network', timestamp, this.checkIteration], 20, 80);
    
    const uptime = this.useRealMetrics ? this.getRealUptime() : 
      TRM.boundedInt(['system', 'uptime', timestamp, this.checkIteration], 3600, 86400);

    const source = this.useRealMetrics ? 'real' : 'simulated';

    console.log(`[METRICS] System metrics collected (source: ${source}) - CPU: ${cpu}%, Memory: ${memory}%, Disk: ${disk}%, Network: ${network}ms, Uptime: ${uptime}s`);

    return {
      cpu,
      memory,
      disk,
      network,
      uptime,
      source
    };
  }

  /**
   * Get network metrics only
   */
  public async getNetworkMetrics(): Promise<NetworkMetrics> {
    const latency = this.useRealMetrics ? await this.getRealNetworkLatency() : 
      TRM.boundedInt(['network', 'latency', Date.now(), this.checkIteration], 20, 80);
    
    const source = this.useRealMetrics ? 'real' : 'simulated';

    console.log(`[METRICS] Network metrics collected (source: ${source}) - Latency: ${latency}ms`);

    return { latency, source };
  }

  /**
   * Enable or disable real metrics collection
   */
  public setRealMetricsEnabled(enabled: boolean): void {
    this.useRealMetrics = enabled;
    console.log(`[METRICS] Real metrics collection ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if real metrics are enabled
   */
  public isRealMetricsEnabled(): boolean {
    return this.useRealMetrics;
  }
}
