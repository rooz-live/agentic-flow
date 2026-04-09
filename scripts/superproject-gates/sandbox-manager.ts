/**
 * E2B Sandbox Manager
 *
 * Manages E2B sandbox environments for isolated, secure testing and execution.
 * Implements 5 sandbox profiles with lifecycle management, resource limits, and health monitoring.
 *
 * Applying Manthra: Directed thought-power ensures logical separation of sandbox profiles
 * Applying Yasna: Disciplined alignment through consistent interfaces and type safety
 * Applying Mithra: Binding force prevents code drift through centralized state management
 */

import { EventEmitter } from 'events';

/**
 * Sandbox profile types for different use cases
 */
export enum SandboxProfile {
  DEVELOPMENT = 'development',
  TESTING = 'testing',
  INTEGRATION_TESTING = 'integration-testing',
  PERFORMANCE_TESTING = 'performance-testing',
  SECURITY_TESTING = 'security-testing'
}

/**
 * Sandbox status tracking
 */
export enum SandboxStatus {
  CREATING = 'creating',
  RUNNING = 'running',
  STOPPED = 'stopped',
  TERMINATING = 'terminating',
  ERROR = 'error'
}

/**
 * Sandbox resource limits
 */
export interface SandboxResourceLimits {
  cpu: number;        // CPU cores (0.5 - 8)
  memory: number;      // Memory in MB (512 - 16384)
  disk: number;        // Disk in GB (10 - 100)
  timeout: number;     // Timeout in seconds (60 - 3600)
}

/**
 * Sandbox isolation configuration
 */
export interface SandboxIsolation {
  network: {
    enabled: boolean;
    allowedHosts?: string[];
    blockedHosts?: string[];
  };
  filesystem: {
    readOnlyPaths?: string[];
    writeablePaths?: string[];
  };
  environment: {
    allowedVars?: string[];
    blockedVars?: string[];
  };
}

/**
 * Sandbox health metrics
 */
export interface SandboxHealthMetrics {
  sandboxId: string;
  status: SandboxStatus;
  uptime: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  lastHeartbeat: Date;
}

/**
 * Sandbox configuration
 */
export interface SandboxConfig {
  profile: SandboxProfile;
  resourceLimits: SandboxResourceLimits;
  isolation: SandboxIsolation;
  metadata?: Record<string, any>;
}

/**
 * Sandbox instance
 */
export interface SandboxInstance {
  id: string;
  profile: SandboxProfile;
  status: SandboxStatus;
  config: SandboxConfig;
  createdAt: Date;
  startedAt?: Date;
  stoppedAt?: Date;
  healthMetrics: SandboxHealthMetrics;
  agentId?: string;  // Agent assigned to this sandbox
}

/**
 * Sandbox profile configuration
 */
export interface SandboxProfileConfig {
  name: string;
  description: string;
  resourceLimits: SandboxResourceLimits;
  isolation: SandboxIsolation;
  preInstalledTools: string[];
  enabledFeatures: string[];
}

/**
 * Sandbox analytics data
 */
export interface SandboxAnalytics {
  totalSandboxesCreated: number;
  totalSandboxesDestroyed: number;
  activeSandboxes: number;
  averageUptime: number;
  profileUsage: Record<SandboxProfile, number>;
  resourceUtilization: {
    cpu: number;
    memory: number;
    disk: number;
  };
  errorRate: number;
}

/**
 * E2B Sandbox Manager
 *
 * Manages sandbox lifecycle, profiles, health monitoring, and analytics
 */
export class E2BSandboxManager extends EventEmitter {
  private sandboxes: Map<string, SandboxInstance> = new Map();
  private profiles: Map<SandboxProfile, SandboxProfileConfig> = new Map();
  private isMonitoring: boolean = false;
  private monitorInterval: NodeJS.Timeout | null = null;
  private analytics: SandboxAnalytics = {
    totalSandboxesCreated: 0,
    totalSandboxesDestroyed: 0,
    activeSandboxes: 0,
    averageUptime: 0,
    profileUsage: {
      [SandboxProfile.DEVELOPMENT]: 0,
      [SandboxProfile.TESTING]: 0,
      [SandboxProfile.INTEGRATION_TESTING]: 0,
      [SandboxProfile.PERFORMANCE_TESTING]: 0,
      [SandboxProfile.SECURITY_TESTING]: 0
    },
    resourceUtilization: {
      cpu: 0,
      memory: 0,
      disk: 0
    },
    errorRate: 0
  };
  private apiEndpoint: string = 'https://api.e2b.dev';
  private apiKey: string | null = null;

  constructor(config?: { apiEndpoint?: string; apiKey?: string }) {
    super();
    this.apiEndpoint = config?.apiEndpoint || this.apiEndpoint;
    this.apiKey = config?.apiKey || process.env.E2B_API_KEY || null;
    
    // Initialize default profiles
    this.initializeDefaultProfiles();
    
    console.log('[E2B] Sandbox Manager initialized');
  }

  /**
   * Initialize default sandbox profiles
   */
  private initializeDefaultProfiles(): void {
    // Development Profile: Minimal resources, fast startup, debugging enabled
    this.profiles.set(SandboxProfile.DEVELOPMENT, {
      name: 'Development Profile',
      description: 'Minimal resources for fast development and debugging',
      resourceLimits: {
        cpu: 1,
        memory: 1024,
        disk: 10,
        timeout: 300
      },
      isolation: {
        network: {
          enabled: true,
          allowedHosts: ['*.github.com', '*.npmjs.org', '*.e2b.dev']
        },
        filesystem: {
          writeablePaths: ['/workspace', '/tmp']
        },
        environment: {
          allowedVars: ['NODE_ENV', 'PATH', 'HOME']
        }
      },
      preInstalledTools: ['node', 'npm', 'git', 'vim', 'curl', 'wget'],
      enabledFeatures: ['debugging', 'hot-reload', 'fast-startup']
    });

    // Testing Profile: Standard resources, testing tools pre-installed
    this.profiles.set(SandboxProfile.TESTING, {
      name: 'Testing Profile',
      description: 'Standard resources with comprehensive testing tools',
      resourceLimits: {
        cpu: 2,
        memory: 2048,
        disk: 20,
        timeout: 600
      },
      isolation: {
        network: {
          enabled: true,
          allowedHosts: ['*']
        },
        filesystem: {
          writeablePaths: ['/workspace', '/tmp', '/test-results']
        },
        environment: {
          allowedVars: ['NODE_ENV', 'PATH', 'HOME', 'CI', 'TEST_ENV']
        }
      },
      preInstalledTools: ['node', 'npm', 'jest', 'vitest', 'mocha', 'cypress', 'playwright', 'git'],
      enabledFeatures: ['testing', 'coverage', 'mocking']
    });

    // Integration Testing Profile: Production-like resources, all systems integrated
    this.profiles.set(SandboxProfile.INTEGRATION_TESTING, {
      name: 'Integration Testing Profile',
      description: 'Production-like resources for full system integration testing',
      resourceLimits: {
        cpu: 4,
        memory: 4096,
        disk: 40,
        timeout: 1200
      },
      isolation: {
        network: {
          enabled: true,
          allowedHosts: ['*']
        },
        filesystem: {
          writeablePaths: ['/workspace', '/tmp', '/test-results', '/logs']
        },
        environment: {
          allowedVars: ['*']
        }
      },
      preInstalledTools: ['node', 'npm', 'docker', 'docker-compose', 'postgres', 'redis', 'mongodb', 'git'],
      enabledFeatures: ['integration', 'database', 'services', 'networking']
    });

    // Performance Testing Profile: High resources, profiling tools enabled
    this.profiles.set(SandboxProfile.PERFORMANCE_TESTING, {
      name: 'Performance Testing Profile',
      description: 'High resources with profiling and benchmarking tools',
      resourceLimits: {
        cpu: 8,
        memory: 8192,
        disk: 50,
        timeout: 1800
      },
      isolation: {
        network: {
          enabled: true,
          allowedHosts: ['*']
        },
        filesystem: {
          writeablePaths: ['/workspace', '/tmp', '/benchmark-results', '/profiles']
        },
        environment: {
          allowedVars: ['*']
        }
      },
      preInstalledTools: ['node', 'npm', 'artillery', 'k6', 'autocannon', 'clinic', 'flamegraph', 'git'],
      enabledFeatures: ['profiling', 'benchmarking', 'load-testing', 'monitoring']
    });

    // Security Testing Profile: Security tools pre-installed, scanning enabled
    this.profiles.set(SandboxProfile.SECURITY_TESTING, {
      name: 'Security Testing Profile',
      description: 'Security-focused environment with scanning and analysis tools',
      resourceLimits: {
        cpu: 4,
        memory: 4096,
        disk: 30,
        timeout: 900
      },
      isolation: {
        network: {
          enabled: true,
          blockedHosts: ['malicious-domains.com']
        },
        filesystem: {
          readOnlyPaths: ['/etc', '/usr/bin'],
          writeablePaths: ['/workspace', '/tmp', '/security-reports']
        },
        environment: {
          blockedVars: ['PASSWORD', 'SECRET', 'TOKEN', 'API_KEY']
        }
      },
      preInstalledTools: ['node', 'npm', 'npm-audit', 'snyk', 'owasp-zap', 'burpsuite', 'git'],
      enabledFeatures: ['security-scanning', 'vulnerability-detection', 'audit', 'compliance']
    });

    console.log('[E2B] Default sandbox profiles initialized');
  }

  /**
   * Create a new sandbox instance
   */
  async createSandbox(config: Partial<SandboxConfig> = {}): Promise<SandboxInstance> {
    const profile = config.profile || SandboxProfile.DEVELOPMENT;
    const profileConfig = this.profiles.get(profile);
    
    if (!profileConfig) {
      throw new Error(`Sandbox profile ${profile} not found`);
    }

    const sandboxId = this.generateSandboxId();
    const fullConfig: SandboxConfig = {
      profile,
      resourceLimits: config.resourceLimits || profileConfig.resourceLimits,
      isolation: config.isolation || profileConfig.isolation,
      metadata: config.metadata || {}
    };

    const sandbox: SandboxInstance = {
      id: sandboxId,
      profile,
      status: SandboxStatus.CREATING,
      config: fullConfig,
      createdAt: new Date(),
      healthMetrics: {
        sandboxId,
        status: SandboxStatus.CREATING,
        uptime: 0,
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        networkLatency: 0,
        lastHeartbeat: new Date()
      }
    };

    this.sandboxes.set(sandboxId, sandbox);
    this.emit('sandboxCreating', sandbox);

    console.log(`[E2B] Creating sandbox ${sandboxId} with profile ${profile}`);

    try {
      // Simulate sandbox creation (replace with actual E2B API call)
      await this.simulateSandboxCreation(sandbox);

      sandbox.status = SandboxStatus.RUNNING;
      sandbox.startedAt = new Date();
      sandbox.healthMetrics.status = SandboxStatus.RUNNING;
      sandbox.healthMetrics.lastHeartbeat = new Date();

      this.analytics.totalSandboxesCreated++;
      this.analytics.activeSandboxes++;
      this.analytics.profileUsage[profile]++;

      this.emit('sandboxCreated', sandbox);
      console.log(`[E2B] Sandbox ${sandboxId} created and running`);

      return sandbox;
    } catch (error) {
      sandbox.status = SandboxStatus.ERROR;
      this.sandboxes.delete(sandboxId);
      this.analytics.errorRate++;
      this.emit('sandboxError', { sandboxId, error });
      throw error;
    }
  }

  /**
   * Start a stopped sandbox
   */
  async startSandbox(sandboxId: string): Promise<void> {
    const sandbox = this.sandboxes.get(sandboxId);
    
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }

    if (sandbox.status === SandboxStatus.RUNNING) {
      console.log(`[E2B] Sandbox ${sandboxId} is already running`);
      return;
    }

    console.log(`[E2B] Starting sandbox ${sandboxId}`);
    sandbox.status = SandboxStatus.CREATING;
    this.emit('sandboxStarting', sandbox);

    try {
      // Simulate sandbox start (replace with actual E2B API call)
      await this.simulateSandboxStart(sandbox);

      sandbox.status = SandboxStatus.RUNNING;
      sandbox.startedAt = new Date();
      sandbox.healthMetrics.status = SandboxStatus.RUNNING;
      sandbox.healthMetrics.lastHeartbeat = new Date();

      this.analytics.activeSandboxes++;
      this.emit('sandboxStarted', sandbox);
      console.log(`[E2B] Sandbox ${sandboxId} started`);
    } catch (error) {
      sandbox.status = SandboxStatus.ERROR;
      this.analytics.errorRate++;
      this.emit('sandboxError', { sandboxId, error });
      throw error;
    }
  }

  /**
   * Stop a running sandbox
   */
  async stopSandbox(sandboxId: string): Promise<void> {
    const sandbox = this.sandboxes.get(sandboxId);
    
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }

    if (sandbox.status === SandboxStatus.STOPPED) {
      console.log(`[E2B] Sandbox ${sandboxId} is already stopped`);
      return;
    }

    console.log(`[E2B] Stopping sandbox ${sandboxId}`);
    sandbox.status = SandboxStatus.TERMINATING;
    this.emit('sandboxStopping', sandbox);

    try {
      // Simulate sandbox stop (replace with actual E2B API call)
      await this.simulateSandboxStop(sandbox);

      sandbox.status = SandboxStatus.STOPPED;
      sandbox.stoppedAt = new Date();
      sandbox.healthMetrics.status = SandboxStatus.STOPPED;

      this.analytics.activeSandboxes--;
      this.emit('sandboxStopped', sandbox);
      console.log(`[E2B] Sandbox ${sandboxId} stopped`);
    } catch (error) {
      sandbox.status = SandboxStatus.ERROR;
      this.analytics.errorRate++;
      this.emit('sandboxError', { sandboxId, error });
      throw error;
    }
  }

  /**
   * Destroy a sandbox instance
   */
  async destroySandbox(sandboxId: string): Promise<void> {
    const sandbox = this.sandboxes.get(sandboxId);
    
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }

    console.log(`[E2B] Destroying sandbox ${sandboxId}`);
    this.emit('sandboxDestroying', sandbox);

    try {
      // Stop if running
      if (sandbox.status === SandboxStatus.RUNNING) {
        await this.stopSandbox(sandboxId);
      }

      // Simulate sandbox destruction (replace with actual E2B API call)
      await this.simulateSandboxDestruction(sandbox);

      this.sandboxes.delete(sandboxId);
      this.analytics.totalSandboxesDestroyed++;
      
      this.emit('sandboxDestroyed', sandbox);
      console.log(`[E2B] Sandbox ${sandboxId} destroyed`);
    } catch (error) {
      this.analytics.errorRate++;
      this.emit('sandboxError', { sandboxId, error });
      throw error;
    }
  }

  /**
   * Get sandbox instance by ID
   */
  getSandbox(sandboxId: string): SandboxInstance | undefined {
    return this.sandboxes.get(sandboxId);
  }

  /**
   * Get all sandboxes
   */
  getAllSandboxes(): SandboxInstance[] {
    return Array.from(this.sandboxes.values());
  }

  /**
   * Get sandboxes by status
   */
  getSandboxesByStatus(status: SandboxStatus): SandboxInstance[] {
    return this.getAllSandboxes().filter(s => s.status === status);
  }

  /**
   * Get sandbox profile configuration
   */
  getProfile(profile: SandboxProfile): SandboxProfileConfig | undefined {
    return this.profiles.get(profile);
  }

  /**
   * Get all profiles
   */
  getAllProfiles(): SandboxProfileConfig[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Update sandbox resource limits
   */
  async updateResourceLimits(sandboxId: string, limits: Partial<SandboxResourceLimits>): Promise<void> {
    const sandbox = this.sandboxes.get(sandboxId);
    
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }

    console.log(`[E2B] Updating resource limits for sandbox ${sandboxId}`);
    sandbox.config.resourceLimits = { ...sandbox.config.resourceLimits, ...limits };
    this.emit('resourceLimitsUpdated', { sandboxId, limits });
  }

  /**
   * Update sandbox isolation settings
   */
  async updateIsolation(sandboxId: string, isolation: Partial<SandboxIsolation>): Promise<void> {
    const sandbox = this.sandboxes.get(sandboxId);
    
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }

    console.log(`[E2B] Updating isolation for sandbox ${sandboxId}`);
    sandbox.config.isolation = { ...sandbox.config.isolation, ...isolation };
    this.emit('isolationUpdated', { sandboxId, isolation });
  }

  /**
   * Assign agent to sandbox
   */
  async assignAgent(sandboxId: string, agentId: string): Promise<void> {
    const sandbox = this.sandboxes.get(sandboxId);
    
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }

    console.log(`[E2B] Assigning agent ${agentId} to sandbox ${sandboxId}`);
    sandbox.agentId = agentId;
    this.emit('agentAssigned', { sandboxId, agentId });
  }

  /**
   * Unassign agent from sandbox
   */
  async unassignAgent(sandboxId: string): Promise<void> {
    const sandbox = this.sandboxes.get(sandboxId);
    
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }

    console.log(`[E2B] Unassigning agent from sandbox ${sandboxId}`);
    const agentId = sandbox.agentId;
    sandbox.agentId = undefined;
    this.emit('agentUnassigned', { sandboxId, agentId });
  }

  /**
   * Get sandbox health metrics
   */
  getHealthMetrics(sandboxId: string): SandboxHealthMetrics | undefined {
    const sandbox = this.sandboxes.get(sandboxId);
    return sandbox?.healthMetrics;
  }

  /**
   * Get all health metrics
   */
  getAllHealthMetrics(): SandboxHealthMetrics[] {
    return this.getAllSandboxes().map(s => s.healthMetrics);
  }

  /**
   * Start health monitoring
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) {
      console.log('[E2B] Health monitoring already running');
      return;
    }

    this.isMonitoring = true;
    this.monitorInterval = setInterval(() => {
      this.performHealthChecks();
    }, intervalMs);

    console.log(`[E2B] Health monitoring started (interval: ${intervalMs}ms)`);
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    console.log('[E2B] Health monitoring stopped');
  }

  /**
   * Perform health checks on all sandboxes
   */
  private async performHealthChecks(): Promise<void> {
    const sandboxes = this.getAllSandboxes();
    
    for (const sandbox of sandboxes) {
      if (sandbox.status === SandboxStatus.RUNNING) {
        await this.updateHealthMetrics(sandbox);
      }
    }

    this.emit('healthCheckCompleted', this.getAllHealthMetrics());
  }

  /**
   * Update health metrics for a sandbox
   */
  private async updateHealthMetrics(sandbox: SandboxInstance): Promise<void> {
    const now = new Date();
    const uptime = sandbox.startedAt ? now.getTime() - sandbox.startedAt.getTime() : 0;

    // Simulate health metrics (replace with actual E2B API call)
    sandbox.healthMetrics = {
      sandboxId: sandbox.id,
      status: sandbox.status,
      uptime,
      cpuUsage: Math.random() * sandbox.config.resourceLimits.cpu,
      memoryUsage: Math.random() * sandbox.config.resourceLimits.memory,
      diskUsage: Math.random() * sandbox.config.resourceLimits.disk,
      networkLatency: Math.random() * 100,
      lastHeartbeat: now
    };

    // Update aggregate analytics
    this.updateAggregateMetrics();
  }

  /**
   * Update aggregate metrics for analytics
   */
  private updateAggregateMetrics(): void {
    const runningSandboxes = this.getSandboxesByStatus(SandboxStatus.RUNNING);
    const totalUptime = runningSandboxes.reduce((sum, s) => sum + s.healthMetrics.uptime, 0);
    
    this.analytics.averageUptime = runningSandboxes.length > 0 
      ? totalUptime / runningSandboxes.length 
      : 0;

    this.analytics.resourceUtilization = {
      cpu: runningSandboxes.reduce((sum, s) => sum + s.healthMetrics.cpuUsage, 0) / (runningSandboxes.length || 1),
      memory: runningSandboxes.reduce((sum, s) => sum + s.healthMetrics.memoryUsage, 0) / (runningSandboxes.length || 1),
      disk: runningSandboxes.reduce((sum, s) => sum + s.healthMetrics.diskUsage, 0) / (runningSandboxes.length || 1)
    };
  }

  /**
   * Get analytics
   */
  getAnalytics(): SandboxAnalytics {
    return { ...this.analytics };
  }

  /**
   * Reset analytics
   */
  resetAnalytics(): void {
    this.analytics = {
      totalSandboxesCreated: 0,
      totalSandboxesDestroyed: 0,
      activeSandboxes: this.getSandboxesByStatus(SandboxStatus.RUNNING).length,
      averageUptime: 0,
      profileUsage: {
        [SandboxProfile.DEVELOPMENT]: 0,
        [SandboxProfile.TESTING]: 0,
        [SandboxProfile.INTEGRATION_TESTING]: 0,
        [SandboxProfile.PERFORMANCE_TESTING]: 0,
        [SandboxProfile.SECURITY_TESTING]: 0
      },
      resourceUtilization: {
        cpu: 0,
        memory: 0,
        disk: 0
      },
      errorRate: 0
    };
    console.log('[E2B] Analytics reset');
  }

  /**
   * Generate sandbox ID
   */
  private generateSandboxId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `sandbox-${timestamp}-${random}`;
  }

  /**
   * Simulate sandbox creation (replace with actual E2B API call)
   */
  private async simulateSandboxCreation(sandbox: SandboxInstance): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * Simulate sandbox start (replace with actual E2B API call)
   */
  private async simulateSandboxStart(sandbox: SandboxInstance): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  /**
   * Simulate sandbox stop (replace with actual E2B API call)
   */
  private async simulateSandboxStop(sandbox: SandboxInstance): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  /**
   * Simulate sandbox destruction (replace with actual E2B API call)
   */
  private async simulateSandboxDestruction(sandbox: SandboxInstance): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

export default E2BSandboxManager;
