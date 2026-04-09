import { spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  reachable: boolean;
  latency?: number;
  lastCheck?: Date;
  details?: string;
  host?: string;
}

export interface InfrastructureMetrics {
  ssh: HealthStatus;
  services?: ServiceStatus[];
  resources?: ResourceMetrics;
  overallHealth: 'healthy' | 'degraded' | 'critical' | 'unknown';
  lastCheckTime?: Date;
}

export interface ServiceStatus {
  name: string;
  running: boolean;
  status: string;
}

export interface ResourceMetrics {
  cpu: number;
  memory: number;
  disk: number;
}

export interface RecommendedAction {
  key: number;
  description: string;
  command: string;
  args: string[];
  wsjfScore: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  causalInsight?: string;
}

const HEALTH_CHECK_CACHE_FILE = join(process.cwd(), '.db', 'infrastructure-health.json');
const HEALTH_CHECK_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

export class InfrastructureHealthChecker {
  private projectRoot: string;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
  }

  /**
   * Check SSH connectivity to the infrastructure host
   */
  async checkSSHConnectivity(host?: string): Promise<HealthStatus> {
    const targetHost = host || 'stx-aio';
    const startTime = Date.now();

    return new Promise((resolve) => {
      // Run the SSH probe script
      const sshProbeScript = join(this.projectRoot, 'scripts', 'ay-yo.sh');
      
      if (!existsSync(sshProbeScript)) {
        resolve({
          status: 'unknown',
          reachable: false,
          details: 'SSH probe script not found',
          lastCheck: new Date()
        });
        return;
      }

      const child = spawn(sshProbeScript, ['ssh-probe'], {
        cwd: this.projectRoot,
        stdio: 'pipe',
        shell: true
      });

      let output = '';
      let errorOutput = '';

      child.stdout?.on('data', (data) => {
        output += data.toString();
      });

      child.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        const latency = Date.now() - startTime;
        const isSuccess = code === 0 && output.includes('__AF_OK__');

        resolve({
          status: isSuccess ? 'healthy' : 'down',
          reachable: isSuccess,
          latency,
          lastCheck: new Date(),
          details: isSuccess ? `SSH probe successful (${latency}ms)` : 'SSH probe failed',
          host: targetHost
        });
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        child.kill();
        resolve({
          status: 'down',
          reachable: false,
          latency: Date.now() - startTime,
          lastCheck: new Date(),
          details: 'SSH probe timeout (>30s)',
          host: targetHost
        });
      }, 30000);
    });
  }

  /**
   * Get cached health status if available and recent
   */
  private getCachedHealth(): InfrastructureMetrics | null {
    try {
      if (!existsSync(HEALTH_CHECK_CACHE_FILE)) {
        return null;
      }

      const cached = JSON.parse(readFileSync(HEALTH_CHECK_CACHE_FILE, 'utf-8'));
      
      if (!cached.lastCheckTime) {
        return null;
      }

      const cacheAge = Date.now() - new Date(cached.lastCheckTime).getTime();
      
      // Cache is valid for 1 hour
      if (cacheAge < HEALTH_CHECK_COOLDOWN_MS) {
        // Convert date strings back to Date objects
        if (cached.ssh?.lastCheck) {
          cached.ssh.lastCheck = new Date(cached.ssh.lastCheck);
        }
        if (cached.lastCheckTime) {
          cached.lastCheckTime = new Date(cached.lastCheckTime);
        }
        return cached;
      }

      return null;
    } catch (error) {
      console.error('Error reading health cache:', error);
      return null;
    }
  }

  /**
   * Cache health metrics for future use
   */
  private cacheHealth(metrics: InfrastructureMetrics): void {
    try {
      // Ensure .db directory exists
      const dbDir = join(this.projectRoot, '.db');
      if (!existsSync(dbDir)) {
        require('fs').mkdirSync(dbDir, { recursive: true });
      }

      writeFileSync(HEALTH_CHECK_CACHE_FILE, JSON.stringify(metrics, null, 2));
    } catch (error) {
      console.error('Error writing health cache:', error);
    }
  }

  /**
   * Get overall infrastructure health metrics
   */
  async getOverallHealth(forceRefresh = false): Promise<InfrastructureMetrics> {
    // Check cache first unless force refresh
    if (!forceRefresh) {
      const cached = this.getCachedHealth();
      if (cached) {
        return cached;
      }
    }

    const sshHealth = await this.checkSSHConnectivity();

    const metrics: InfrastructureMetrics = {
      ssh: sshHealth,
      overallHealth: this.calculateOverallHealth(sshHealth),
      lastCheckTime: new Date()
    };

    // Cache the results
    this.cacheHealth(metrics);

    return metrics;
  }

  /**
   * Calculate overall health status from individual metrics
   */
  private calculateOverallHealth(sshHealth: HealthStatus): 'healthy' | 'degraded' | 'critical' | 'unknown' {
    if (sshHealth.status === 'unknown') {
      return 'unknown';
    }

    if (!sshHealth.reachable || sshHealth.status === 'down') {
      return 'critical';
    }

    if (sshHealth.status === 'degraded') {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Get recommended actions based on infrastructure health
   */
  async getRecommendedActions(): Promise<RecommendedAction[]> {
    const health = await this.getOverallHealth();
    const actions: RecommendedAction[] = [];

    // Check if last check is older than 1 hour
    const needsCheck = !health.lastCheckTime || 
      (Date.now() - health.lastCheckTime.getTime() > HEALTH_CHECK_COOLDOWN_MS);

    // Critical: Infrastructure is down or unreachable
    if (health.overallHealth === 'critical') {
      actions.push({
        key: 1,
        description: '🚨 Infrastructure unreachable - Deep resolution with ceremonies',
        command: './scripts/ay-yo-resolve-action.sh',
        args: ['infrastructure'],
        wsjfScore: 95.0, // Critical blocker
        urgency: 'critical',
        causalInsight: '💡 Infrastructure connectivity is foundational - all ceremonies require healthy infrastructure'
      });
    }
    // High: Infrastructure not checked recently
    else if (needsCheck) {
      const hoursAgo = health.lastCheckTime 
        ? Math.floor((Date.now() - health.lastCheckTime.getTime()) / (1000 * 60 * 60))
        : 999;

      actions.push({
        key: 1,
        description: `⚠️  Infrastructure health check needed (last check: ${hoursAgo}h ago)`,
        command: './scripts/ay-yo.sh',
        args: ['ssh-probe'],
        wsjfScore: 50.0, // High priority but not critical
        urgency: 'high',
        causalInsight: '💡 Regular infrastructure checks prevent ceremony failures'
      });
    }
    // Degraded: Infrastructure responding slowly
    else if (health.overallHealth === 'degraded') {
      actions.push({
        key: 1,
        description: '⚠️  Infrastructure degraded - performance check recommended',
        command: './scripts/ay-yo.sh',
        args: ['ssh-probe'],
        wsjfScore: 30.0,
        urgency: 'medium',
        causalInsight: '💡 Degraded infrastructure can cause ceremony timeouts'
      });
    }

    return actions;
  }

  /**
   * Get a human-readable status icon
   */
  getStatusIcon(status: string): string {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'degraded':
        return '⚠️ ';
      case 'critical':
      case 'down':
        return '❌';
      default:
        return '❓';
    }
  }

  /**
   * Get a human-readable time ago string
   */
  getTimeAgo(date?: Date): string {
    if (!date) {
      return 'never';
    }

    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) {
      return `${seconds}s ago`;
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  /**
   * Run SSH probe and store episode for causal learning
   */
  async runSSHProbeWithEpisode(): Promise<{ success: boolean; episodeFile?: string }> {
    const startTime = Date.now();
    const health = await this.checkSSHConnectivity();
    const executionTime = Date.now() - startTime;

    // Import reward calculator
    const { calculateReward } = await import('./reward-calculator');
    
    // Calculate detailed reward with factors
    const expectedLatency = 500; // 500ms expected for SSH probe
    const qualityScore = health.reachable ? 
      (health.latency && health.latency < expectedLatency ? 1.0 : 0.9) : 0.0;
    
    const reward = await calculateReward({
      success: health.reachable,
      duration_ms: executionTime,
      expected_duration_ms: expectedLatency,
      quality_score: qualityScore,
      test_coverage: health.reachable ? 1.0 : 0.0,
      difficulty: 0.3, // SSH probe is low difficulty
      complexity_score: 0.2, // Low complexity
      memory_usage_mb: 50,
      cpu_usage_percent: 10
    });

    // Store episode for causal learning
    const episodeId = `ssh_probe_${Date.now()}`;
    const episodeFile = `/tmp/ay-ssh-probe-episode-${episodeId}.json`;

    const episode = {
      name: episodeId,
      task: 'Infrastructure SSH connectivity check',
      reward: reward,
      trajectory: [
        {
          state: 'Checking SSH connectivity',
          action: 'ssh_probe',
          reward: reward
        }
      ],
      metadata: {
        infrastructure: health.host || 'stx-aio',
        health: health.status,
        reachable: health.reachable,
        latency: health.latency,
        executionTime,
        qualityScore,
        patterns: ['ssh-probe', 'infrastructure', 'health-check']
      }
    };

    try {
      writeFileSync(episodeFile, JSON.stringify(episode, null, 2));
      return { success: health.reachable, episodeFile };
    } catch (error) {
      console.error('Error storing SSH probe episode:', error);
      return { success: health.reachable };
    }
  }
}
