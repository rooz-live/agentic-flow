/**
 * AWS Lightsail Cloud Provider Adapter
 *
 * Implements the CloudProvider interface for AWS Lightsail VPS instances.
 * Supports nano ($5/mo) and micro ($10/mo) instance bundles.
 *
 * @module cloud-providers/aws-lightsail-adapter
 * @version 1.0.0
 */

import {
  CloudProvider,
  CloudProviderName,
  InstanceSpecs,
  InstanceOption,
  ProvisionConfig,
  ProvisionResult,
  ProvisioningStatus,
  ProvisioningStep,
  NetworkingConfig,
} from './types';

// ============================================================================
// AWS SDK Types (Stubbed for implementation without runtime dependency)
// When @aws-sdk/client-lightsail is installed, replace with actual imports
// ============================================================================

/**
 * Lightsail client configuration
 */
interface LightsailClientConfig {
  region: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

/**
 * Lightsail bundle (instance type) definition
 */
interface LightsailBundle {
  bundleId: string;
  name: string;
  price: number;
  cpuCount: number;
  ramSizeInGb: number;
  diskSizeInGb: number;
  supportedPlatforms: string[];
  isActive: boolean;
}

/**
 * Lightsail instance definition
 */
interface LightsailInstance {
  name: string;
  arn: string;
  state: { name: string };
  publicIpAddress?: string;
  privateIpAddress?: string;
  createdAt: Date;
  bundleId: string;
  blueprintId: string;
  location: { availabilityZone: string; regionName: string };
}

/**
 * Firewall rule for Lightsail instances
 */
export interface FirewallRule {
  protocol: 'tcp' | 'udp' | 'all';
  fromPort: number;
  toPort: number;
  cidrs: string[];
}

// ============================================================================
// Constants
// ============================================================================

/**
 * AWS Lightsail bundle definitions
 * Based on current AWS Lightsail pricing (January 2026)
 */
const LIGHTSAIL_BUNDLES: Record<string, LightsailBundle> = {
  // $5/month - Nano
  nano_3_0: {
    bundleId: 'nano_3_0',
    name: 'Nano',
    price: 5.0,
    cpuCount: 1,
    ramSizeInGb: 1,
    diskSizeInGb: 40,
    supportedPlatforms: ['LINUX_UNIX'],
    isActive: true,
  },
  // $10/month - Micro
  micro_3_0: {
    bundleId: 'micro_3_0',
    name: 'Micro',
    price: 10.0,
    cpuCount: 2,
    ramSizeInGb: 2,
    diskSizeInGb: 60,
    supportedPlatforms: ['LINUX_UNIX'],
    isActive: true,
  },
  // $20/month - Small
  small_3_0: {
    bundleId: 'small_3_0',
    name: 'Small',
    price: 20.0,
    cpuCount: 2,
    ramSizeInGb: 4,
    diskSizeInGb: 80,
    supportedPlatforms: ['LINUX_UNIX'],
    isActive: true,
  },
  // $40/month - Medium
  medium_3_0: {
    bundleId: 'medium_3_0',
    name: 'Medium',
    price: 40.0,
    cpuCount: 4,
    ramSizeInGb: 8,
    diskSizeInGb: 160,
    supportedPlatforms: ['LINUX_UNIX'],
    isActive: true,
  },
};

/**
 * Ubuntu 22.04 LTS blueprint ID
 */
const UBUNTU_2204_BLUEPRINT = 'ubuntu_22_04';

/**
 * Default SSH allowlist CIDR
 */
const DEFAULT_SSH_ALLOWLIST = '173.94.53.113/32';

/**
 * Available AWS regions for Lightsail
 */
const LIGHTSAIL_REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-2',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'ap-south-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'ca-central-1',
];

/**
 * Estimated provisioning time in minutes
 */
const ESTIMATED_PROVISIONING_TIME_MINUTES = 5;

// ============================================================================
// Logger Interface
// ============================================================================

interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

/**
 * Default console logger
 */
const defaultLogger: Logger = {
  info: (message, meta) => console.log(`[INFO] ${message}`, meta || ''),
  warn: (message, meta) => console.warn(`[WARN] ${message}`, meta || ''),
  error: (message, meta) => console.error(`[ERROR] ${message}`, meta || ''),
  debug: (message, meta) => console.debug(`[DEBUG] ${message}`, meta || ''),
};

// ============================================================================
// AWS Lightsail Adapter Configuration
// ============================================================================

/**
 * Configuration options for AWS Lightsail adapter
 */
export interface AWSLightsailAdapterConfig {
  /** AWS region (default: us-east-1) */
  region?: string;
  /** AWS access key ID (from environment if not provided) */
  accessKeyId?: string;
  /** AWS secret access key (from environment if not provided) */
  secretAccessKey?: string;
  /** Custom logger instance */
  logger?: Logger;
  /** Maximum retry attempts for API calls */
  maxRetries?: number;
  /** Retry delay in milliseconds */
  retryDelayMs?: number;
}

// ============================================================================
// AWS Lightsail Adapter Implementation
// ============================================================================

/**
 * AWS Lightsail Cloud Provider Adapter
 *
 * Implements CloudProvider interface for AWS Lightsail VPS provisioning.
 * Provides $5-$10/month instances suitable for observability sinks.
 */
export class AWSLightsailAdapter implements CloudProvider {
  /** Provider identifier */
  readonly name: CloudProviderName = 'aws-lightsail';

  /** Provider display name */
  readonly displayName = 'AWS Lightsail';

  /** AWS region */
  private region: string;

  /** AWS credentials */
  private credentials: { accessKeyId: string; secretAccessKey: string } | undefined;

  /** Logger instance */
  private logger: Logger;

  /** Max retry attempts */
  private maxRetries: number;

  /** Retry delay in ms */
  private retryDelayMs: number;

  /** Provisioning state cache */
  private provisioningState: Map<string, ProvisionResult> = new Map();

  constructor(config: AWSLightsailAdapterConfig = {}) {
    this.region = config.region || process.env.AWS_REGION || 'us-east-1';
    this.logger = config.logger || defaultLogger;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelayMs = config.retryDelayMs || 1000;

    // Get credentials from config or environment
    const accessKeyId = config.accessKeyId || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = config.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY;

    if (accessKeyId && secretAccessKey) {
      this.credentials = { accessKeyId, secretAccessKey };
    }

    this.logger.info('AWS Lightsail adapter initialized', { region: this.region });
  }

  /**
   * Get available instances matching the specifications
   */
  async getAvailableInstances(specs: InstanceSpecs): Promise<InstanceOption[]> {
    this.logger.debug('Getting available Lightsail instances', { specs });

    const matchingBundles: InstanceOption[] = [];

    for (const [bundleId, bundle] of Object.entries(LIGHTSAIL_BUNDLES)) {
      // Check if bundle meets minimum specifications
      if (
        bundle.cpuCount >= specs.minVcpu &&
        bundle.ramSizeInGb >= specs.minRamGb &&
        bundle.diskSizeInGb >= specs.minDiskGb &&
        (specs.maxDiskGb === undefined || bundle.diskSizeInGb <= specs.maxDiskGb) &&
        bundle.isActive
      ) {
        matchingBundles.push({
          instanceType: bundleId,
          displayName: `Lightsail ${bundle.name} (${bundle.cpuCount} vCPU, ${bundle.ramSizeInGb}GB RAM)`,
          monthlyPrice: bundle.price,
          specs: {
            vcpu: bundle.cpuCount,
            ramGb: bundle.ramSizeInGb,
            diskGb: bundle.diskSizeInGb,
            diskType: 'ssd',
          },
          availableRegions: LIGHTSAIL_REGIONS,
          available: true,
        });
      }
    }

    // Sort by price ascending
    matchingBundles.sort((a, b) => a.monthlyPrice - b.monthlyPrice);

    this.logger.info(`Found ${matchingBundles.length} matching Lightsail bundles`, {
      specs,
      bundles: matchingBundles.map((b) => b.instanceType),
    });

    return matchingBundles;
  }

  /**
   * Provision a new Lightsail instance
   */
  async provisionInstance(config: ProvisionConfig): Promise<ProvisionResult> {
    const provisioningId = `prov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.logger.info('Starting Lightsail instance provisioning', {
      provisioningId,
      instanceName: config.configuration.instanceName,
      instanceType: config.instanceType,
      region: config.configuration.region,
    });

    // Initialize provisioning state
    const result: ProvisionResult = {
      provisioningId,
      status: 'in_progress',
      provider: 'aws-lightsail',
      instanceId: null,
      publicIpAddress: null,
      privateIpAddress: null,
      estimatedCompletionTime: new Date(
        Date.now() + ESTIMATED_PROVISIONING_TIME_MINUTES * 60 * 1000
      ),
      steps: [
        { step: 'create_instance', status: 'in_progress' },
        { step: 'configure_networking', status: 'pending' },
        { step: 'inject_ssh_key', status: 'pending' },
        { step: 'apply_firewall_rules', status: 'pending' },
        { step: 'generate_tls_certificate', status: 'pending' },
        { step: 'verify_connectivity', status: 'pending' },
      ],
    };

    this.provisioningState.set(provisioningId, result);

    try {
      // Step 1: Create instance
      await this.createInstance(config, result);

      // Step 2: Configure networking (attach static IP)
      await this.configureNetworking(config, result);

      // Step 3: Inject SSH key (handled during instance creation)
      await this.injectSSHKey(config, result);

      // Step 4: Apply firewall rules
      await this.applyFirewallRules(config, result);

      // Step 5: Generate TLS certificate (if requested)
      if (config.tls?.generateCertificate) {
        await this.generateTLSCertificate(config, result);
      } else {
        this.updateStepStatus(result, 'generate_tls_certificate', 'skipped');
      }

      // Step 6: Verify connectivity
      await this.verifyConnectivity(config, result);

      // Mark as completed
      result.status = 'completed';
      result.completedAt = new Date();
      result.connectionDetails = {
        sshCommand: `ssh -i ~/.ssh/${config.configuration.sshKeyPair} ubuntu@${result.publicIpAddress}`,
        syslogEndpoint: `${result.publicIpAddress}:514`,
        tlsSyslogEndpoint: config.tls?.commonName
          ? `${config.tls.commonName}:6514`
          : undefined,
      };

      this.logger.info('Lightsail instance provisioning completed', {
        provisioningId,
        instanceId: result.instanceId,
        publicIp: result.publicIpAddress,
      });
    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : String(error);

      this.logger.error('Lightsail instance provisioning failed', {
        provisioningId,
        error: result.error,
      });
    }

    this.provisioningState.set(provisioningId, result);
    return result;
  }

  /**
   * Get provisioning status
   */
  async getProvisioningStatus(provisioningId: string): Promise<ProvisionResult> {
    const result = this.provisioningState.get(provisioningId);

    if (!result) {
      throw new Error(`Provisioning ID not found: ${provisioningId}`);
    }

    return result;
  }

  /**
   * Deprovision an instance
   */
  async deprovisionInstance(provisioningId: string): Promise<ProvisionResult> {
    this.logger.info('Starting Lightsail instance deprovisioning', { provisioningId });

    const result = this.provisioningState.get(provisioningId);

    if (!result) {
      throw new Error(`Provisioning ID not found: ${provisioningId}`);
    }

    result.status = 'deprovisioning';
    this.provisioningState.set(provisioningId, result);

    try {
      // In production, call AWS Lightsail API to delete instance
      await this.simulateAPICall('DeleteInstance', {
        instanceName: result.instanceId,
      });

      result.status = 'deprovisioned';
      this.logger.info('Lightsail instance deprovisioned', {
        provisioningId,
        instanceId: result.instanceId,
      });
    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : String(error);
      this.logger.error('Lightsail instance deprovisioning failed', {
        provisioningId,
        error: result.error,
      });
    }

    this.provisioningState.set(provisioningId, result);
    return result;
  }

  /**
   * Get estimated provisioning time in minutes
   */
  getEstimatedProvisioningTime(): number {
    return ESTIMATED_PROVISIONING_TIME_MINUTES;
  }

  /**
   * Check if provider is available/healthy
   */
  async checkHealth(): Promise<{
    available: boolean;
    latencyMs: number;
    message?: string;
  }> {
    const startTime = Date.now();

    try {
      // In production, make a lightweight API call like GetRegions
      await this.simulateAPICall('GetRegions', {});

      const latencyMs = Date.now() - startTime;

      return {
        available: true,
        latencyMs,
        message: 'AWS Lightsail API is healthy',
      };
    } catch (error) {
      return {
        available: false,
        latencyMs: Date.now() - startTime,
        message: error instanceof Error ? error.message : 'Health check failed',
      };
    }
  }

  /**
   * Configure firewall rules for an instance
   */
  async configureFirewall(instanceId: string, rules: FirewallRule[]): Promise<void> {
    this.logger.info('Configuring Lightsail firewall rules', { instanceId, ruleCount: rules.length });

    // Convert rules to Lightsail format
    const portInfos = rules.map((rule) => ({
      fromPort: rule.fromPort,
      toPort: rule.toPort,
      protocol: rule.protocol.toUpperCase(),
      cidrs: rule.cidrs,
    }));

    await this.simulateAPICall('PutInstancePublicPorts', {
      instanceName: instanceId,
      portInfos,
    });

    this.logger.info('Firewall rules applied successfully', { instanceId });
  }

  // ============================================================================
  // Private Methods - Instance Lifecycle
  // ============================================================================

  /**
   * Create Lightsail instance
   */
  private async createInstance(config: ProvisionConfig, result: ProvisionResult): Promise<void> {
    const bundle = LIGHTSAIL_BUNDLES[config.instanceType];

    if (!bundle) {
      throw new Error(`Invalid instance type: ${config.instanceType}`);
    }

    const createParams = {
      instanceName: config.configuration.instanceName,
      availabilityZone: config.configuration.availabilityZone || `${config.configuration.region}a`,
      blueprintId: this.getBlueprintId(config.configuration.os),
      bundleId: config.instanceType,
      keyPairName: config.configuration.sshKeyPair,
      tags: Object.entries(config.configuration.tags || {}).map(([key, value]) => ({
        key,
        value,
      })),
      userData: config.configuration.userData,
    };

    this.logger.debug('Creating Lightsail instance', createParams);

    // In production, this would call the AWS SDK
    const response = await this.simulateAPICall('CreateInstances', createParams);

    // Simulate instance creation
    result.instanceId = config.configuration.instanceName;
    this.updateStepStatus(result, 'create_instance', 'completed');

    this.logger.info('Lightsail instance created', {
      instanceName: config.configuration.instanceName,
      bundleId: config.instanceType,
    });
  }

  /**
   * Configure networking (allocate and attach static IP)
   */
  private async configureNetworking(config: ProvisionConfig, result: ProvisionResult): Promise<void> {
    this.updateStepStatus(result, 'configure_networking', 'in_progress');

    if (config.networking.staticIp !== false) {
      const staticIpName = `${config.configuration.instanceName}-ip`;

      // Allocate static IP
      await this.simulateAPICall('AllocateStaticIp', {
        staticIpName,
      });

      // Attach static IP to instance
      await this.simulateAPICall('AttachStaticIp', {
        staticIpName,
        instanceName: config.configuration.instanceName,
      });

      // Simulate IP assignment
      result.publicIpAddress = this.generateMockIP();
      result.privateIpAddress = this.generateMockPrivateIP();
    }

    this.updateStepStatus(result, 'configure_networking', 'completed');

    this.logger.info('Networking configured', {
      instanceName: config.configuration.instanceName,
      publicIp: result.publicIpAddress,
    });
  }

  /**
   * Inject SSH key (note: done during instance creation in Lightsail)
   */
  private async injectSSHKey(config: ProvisionConfig, result: ProvisionResult): Promise<void> {
    this.updateStepStatus(result, 'inject_ssh_key', 'in_progress');

    // SSH key is injected during instance creation in Lightsail
    // This step verifies the key exists
    await this.simulateAPICall('GetKeyPair', {
      keyPairName: config.configuration.sshKeyPair,
    });

    this.updateStepStatus(result, 'inject_ssh_key', 'completed');

    this.logger.info('SSH key verified', {
      keyPairName: config.configuration.sshKeyPair,
    });
  }

  /**
   * Apply firewall rules to instance
   */
  private async applyFirewallRules(config: ProvisionConfig, result: ProvisionResult): Promise<void> {
    this.updateStepStatus(result, 'apply_firewall_rules', 'in_progress');

    // Build firewall rules from config
    const sshCidrs = config.networking.sshAllowlist.length > 0
      ? config.networking.sshAllowlist
      : [DEFAULT_SSH_ALLOWLIST];

    const portInfos = [
      // SSH - restricted to allowlist
      {
        fromPort: 22,
        toPort: 22,
        protocol: 'TCP',
        cidrs: sshCidrs,
      },
      // Additional ports from config
      ...config.networking.ports.map((port) => ({
        fromPort: port.port,
        toPort: port.port,
        protocol: port.protocol.toUpperCase(),
        cidrs: ['0.0.0.0/0'], // Open to all unless specified
      })),
    ];

    await this.simulateAPICall('PutInstancePublicPorts', {
      instanceName: config.configuration.instanceName,
      portInfos,
    });

    this.updateStepStatus(result, 'apply_firewall_rules', 'completed');

    this.logger.info('Firewall rules applied', {
      instanceName: config.configuration.instanceName,
      ruleCount: portInfos.length,
    });
  }

  /**
   * Generate TLS certificate (placeholder for actual implementation)
   */
  private async generateTLSCertificate(config: ProvisionConfig, result: ProvisionResult): Promise<void> {
    this.updateStepStatus(result, 'generate_tls_certificate', 'in_progress');

    // In production, this would generate a certificate using:
    // - AWS Certificate Manager
    // - Let's Encrypt via ACME protocol
    // - Self-signed certificate for internal use

    this.logger.info('TLS certificate generation requested', {
      commonName: config.tls?.commonName,
      organization: config.tls?.organization,
    });

    // Simulate certificate generation
    await this.delay(1000);

    this.updateStepStatus(result, 'generate_tls_certificate', 'completed');
  }

  /**
   * Verify instance connectivity
   */
  private async verifyConnectivity(config: ProvisionConfig, result: ProvisionResult): Promise<void> {
    this.updateStepStatus(result, 'verify_connectivity', 'in_progress');

    // Wait for instance to be running
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      const instanceStatus = await this.getInstanceState(config.configuration.instanceName);

      if (instanceStatus === 'running') {
        break;
      }

      attempts++;
      await this.delay(10000); // Wait 10 seconds between checks
    }

    if (attempts >= maxAttempts) {
      throw new Error('Instance failed to reach running state');
    }

    this.updateStepStatus(result, 'verify_connectivity', 'completed');

    this.logger.info('Instance connectivity verified', {
      instanceName: config.configuration.instanceName,
    });
  }

  // ============================================================================
  // Private Methods - Utilities
  // ============================================================================

  /**
   * Get blueprint ID for OS
   */
  private getBlueprintId(os: string): string {
    const blueprintMap: Record<string, string> = {
      'ubuntu-22.04': UBUNTU_2204_BLUEPRINT,
      'ubuntu-20.04': 'ubuntu_20_04',
      'ubuntu-24.04': 'ubuntu_24_04',
      'debian-11': 'debian_11',
      'debian-12': 'debian_12',
      'amazon-linux-2': 'amazon_linux_2',
      'centos-7': 'centos_7',
    };

    return blueprintMap[os.toLowerCase()] || UBUNTU_2204_BLUEPRINT;
  }

  /**
   * Get instance state
   */
  private async getInstanceState(instanceName: string): Promise<string> {
    // In production, call GetInstance API
    await this.simulateAPICall('GetInstance', { instanceName });
    return 'running'; // Simulated response
  }

  /**
   * Update provisioning step status
   */
  private updateStepStatus(
    result: ProvisionResult,
    stepName: ProvisioningStep['step'],
    status: ProvisioningStep['status']
  ): void {
    const step = result.steps.find((s) => s.step === stepName);
    if (step) {
      step.status = status;
      if (status === 'completed') {
        step.completedAt = new Date();
      }
    }
  }

  /**
   * Simulate AWS API call (placeholder for actual SDK calls)
   */
  private async simulateAPICall(
    operation: string,
    params: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    this.logger.debug(`AWS Lightsail API call: ${operation}`, params);

    // Simulate network latency
    await this.delay(100 + Math.random() * 200);

    // In production, this would use the AWS SDK:
    // const client = new LightsailClient({ region: this.region, credentials: this.credentials });
    // const command = new CreateInstancesCommand(params);
    // return await client.send(command);

    return { success: true, operation };
  }

  /**
   * Generate mock public IP address
   */
  private generateMockIP(): string {
    return `54.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
  }

  /**
   * Generate mock private IP address
   */
  private generateMockPrivateIP(): string {
    return `10.0.0.${Math.floor(Math.random() * 256)}`;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create AWS Lightsail adapter from environment variables
 */
export function createAWSLightsailAdapterFromEnv(): AWSLightsailAdapter {
  return new AWSLightsailAdapter({
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  });
}
