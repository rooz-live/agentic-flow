/**
 * AWS Lightsail Provider Implementation
 *
 * Provides VPS provisioning and management via AWS Lightsail.
 * Uses AWS SDK v3 for API interactions.
 *
 * Environment Variables:
 * - AWS_ACCESS_KEY_ID: AWS access key
 * - AWS_SECRET_ACCESS_KEY: AWS secret key
 * - AWS_REGION: AWS region (default: us-east-1)
 *
 * @module devops/providers/aws-lightsail-provider
 */

import {
  LightsailClient,
  GetBundlesCommand,
  GetBlueprintsCommand,
  CreateInstancesCommand,
  DeleteInstanceCommand,
  GetInstanceCommand,
  GetInstanceStateCommand,
  PutInstancePublicPortsCommand,
  GetRegionsCommand,
  PortInfo,
  Bundle,
  Blueprint,
  Instance,
  InstanceState,
  Region,
} from '@aws-sdk/client-lightsail';

import {
  CloudProvider,
  ProviderPricing,
  CapacityStatus,
  ProvisioningRequest,
  ProvisioningResult,
  ProviderHealthStatus,
  SecurityConfig,
  VPSSpecification,
  WSJFJobSizeFactors,
  ProvisioningError,
  AuthenticationError,
  BudgetExceededError,
} from './cloud-provider.js';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * AWS Lightsail provider configuration
 */
export interface AWSLightsailConfig {
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
}

/**
 * Mapped bundle with pricing information
 */
interface MappedBundle {
  bundleId: string;
  name: string;
  price: number;
  vcpus: number;
  memoryGb: number;
  diskGb: number;
  transferGb: number;
  isActive: boolean;
}

// ============================================================================
// AWS Lightsail Provider Class
// ============================================================================

/**
 * AWS Lightsail cloud provider implementation
 *
 * Features:
 * - Immediate instance provisioning
 * - Integrated firewall management
 * - Ubuntu 22.04 LTS support
 * - Budget-constrained plan selection ($10/month max)
 */
export class AWSLightsailProvider extends CloudProvider {
  readonly name = 'aws_lightsail' as const;
  readonly displayName = 'AWS Lightsail';
  protected readonly apiBaseUrl = 'https://lightsail.amazonaws.com';

  private client: LightsailClient;
  private region: string;
  private initialized: boolean = false;

  /**
   * Create a new AWS Lightsail provider instance
   *
   * @param config - AWS configuration (credentials and region)
   */
  constructor(config?: AWSLightsailConfig) {
    super();

    // Get configuration from environment or config object
    const accessKeyId =
      config?.accessKeyId || process.env.AWS_ACCESS_KEY_ID || '';
    const secretAccessKey =
      config?.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY || '';
    this.region = config?.region || process.env.AWS_REGION || 'us-east-1';

    // Initialize AWS SDK v3 client
    this.client = new LightsailClient({
      region: this.region,
      credentials:
        accessKeyId && secretAccessKey
          ? {
              accessKeyId,
              secretAccessKey,
            }
          : undefined, // Use default credential chain if not provided
    });

    this.logger(`Initialized AWS Lightsail provider in region: ${this.region}`);
  }

  /**
   * Validate AWS credentials by making a test API call
   */
  async validateCredentials(): Promise<boolean> {
    try {
      const command = new GetRegionsCommand({});
      await this.client.send(command);
      this.initialized = true;
      this.logger('AWS credentials validated successfully');
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger(`AWS credential validation failed: ${errorMessage}`, 'error');
      return false;
    }
  }

  /**
   * Get available Lightsail plans within budget
   *
   * @param budgetMax - Maximum monthly budget (default: $10)
   * @returns List of available plans with pricing
   */
  async getAvailablePlans(budgetMax: number = 10): Promise<ProviderPricing[]> {
    this.logger(`Fetching available plans with budget max: $${budgetMax}`);

    try {
      const command = new GetBundlesCommand({
        includeInactive: false,
      });

      const response = await this.client.send(command);
      const bundles = response.bundles || [];

      // Map and filter bundles by budget
      const mappedBundles: MappedBundle[] = bundles
        .filter((bundle): bundle is Bundle => !!bundle)
        .map((bundle) => ({
          bundleId: bundle.bundleId || '',
          name: bundle.name || bundle.bundleId || '',
          price: bundle.price || 0,
          vcpus: bundle.cpuCount || 0,
          memoryGb: (bundle.ramSizeInGb || 0),
          diskGb: bundle.diskSizeInGb || 0,
          transferGb: bundle.transferPerMonthInGb || 0,
          isActive: bundle.isActive || false,
        }))
        .filter((b) => b.isActive && b.price <= budgetMax);

      // Convert to ProviderPricing format
      const plans: ProviderPricing[] = mappedBundles.map((bundle) => ({
        provider: 'aws_lightsail' as const,
        planName: bundle.bundleId,
        monthlyPrice: bundle.price,
        specs: {
          vcpus: bundle.vcpus,
          memoryGb: bundle.memoryGb,
          diskGb: bundle.diskGb,
          os: 'ubuntu' as const,
          osVersion: '22.04',
          region: this.region,
        },
        region: this.region,
        availability: 'immediate' as const,
        features: [
          `${bundle.transferGb}GB data transfer included`,
          'SSD storage',
          'Static IP available',
          'DNS management',
          'Automatic snapshots',
        ],
        setupFee: 0,
        dataTransferCost: 0.09, // Per GB overage
      }));

      this.logger(`Found ${plans.length} plans within budget`);
      return plans.sort((a, b) => a.monthlyPrice - b.monthlyPrice);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger(`Failed to fetch plans: ${errorMessage}`, 'error');
      throw new ProvisioningError(
        'aws_lightsail',
        `Failed to fetch available plans: ${errorMessage}`,
        'API_ERROR'
      );
    }
  }

  /**
   * Check Lightsail availability in region
   *
   * @param region - AWS region to check (optional)
   * @returns Capacity status
   */
  async checkAvailability(region?: string): Promise<CapacityStatus> {
    const targetRegion = region || this.region;
    this.logger(`Checking availability in region: ${targetRegion}`);

    try {
      const command = new GetRegionsCommand({
        includeAvailabilityZones: true,
      });

      const response = await this.client.send(command);
      const regions = response.regions || [];

      const regionInfo = regions.find(
        (r: Region) => r.name === targetRegion
      );

      if (!regionInfo) {
        return {
          provider: 'aws_lightsail',
          available: false,
          estimatedProvisioningTime: 'N/A',
          capacityUtilization: undefined,
          quotaRemaining: undefined,
        };
      }

      return {
        provider: 'aws_lightsail',
        available: regionInfo.availabilityZones
          ? regionInfo.availabilityZones.length > 0
          : false,
        estimatedProvisioningTime: 'immediate',
        capacityUtilization: undefined, // AWS doesn't expose this
        quotaRemaining: undefined, // Would need separate API call to Service Quotas
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger(`Availability check failed: ${errorMessage}`, 'error');

      return {
        provider: 'aws_lightsail',
        available: false,
        estimatedProvisioningTime: 'unknown',
      };
    }
  }

  /**
   * Provision a new Lightsail instance
   *
   * @param request - Provisioning request
   * @returns Provisioning result with instance details
   */
  async provision(request: ProvisioningRequest): Promise<ProvisioningResult> {
    const startTime = Date.now();
    this.logger(
      `Provisioning Lightsail instance: ${request.hostname}`
    );

    try {
      // Validate budget
      const plans = await this.getAvailablePlans(
        request.wsjfInput.budgetConstraint
      );

      if (plans.length === 0) {
        throw new BudgetExceededError(
          'aws_lightsail',
          request.wsjfInput.budgetConstraint,
          0
        );
      }

      // Find best matching plan
      const matchingPlan = plans.find((plan) =>
        this.specsMeetRequirements(request.specs, plan)
      );

      if (!matchingPlan) {
        throw new ProvisioningError(
          'aws_lightsail',
          `No plan matches specifications: ${JSON.stringify(request.specs)}`,
          'NO_MATCHING_PLAN',
          false
        );
      }

      // Get Ubuntu 22.04 blueprint
      const blueprintId = await this.getUbuntuBlueprintId();

      // Create instance
      const createCommand = new CreateInstancesCommand({
        instanceNames: [request.hostname],
        availabilityZone: `${this.region}a`,
        blueprintId,
        bundleId: matchingPlan.planName,
        tags: request.tags
          ? Object.entries(request.tags).map(([key, value]) => ({
              key,
              value,
            }))
          : undefined,
      });

      const createResponse = await this.client.send(createCommand);

      if (
        !createResponse.operations ||
        createResponse.operations.length === 0
      ) {
        throw new ProvisioningError(
          'aws_lightsail',
          'Instance creation returned no operations',
          'CREATE_FAILED'
        );
      }

      // Wait for instance to be running
      const instanceInfo = await this.waitForInstanceRunning(request.hostname);

      // Configure firewall
      await this.configureFirewall(request.hostname, request.security);

      const provisionTime = Math.round((Date.now() - startTime) / 1000);

      this.logger(
        `Instance ${request.hostname} provisioned successfully in ${provisionTime}s`
      );

      return {
        success: true,
        provider: 'aws_lightsail',
        instanceId: request.hostname,
        publicIp: instanceInfo.publicIpAddress,
        hostname: request.hostname,
        sshPort: 22,
        syslogPort: 6514,
        provisionTime,
        warnings: [],
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger(`Provisioning failed: ${errorMessage}`, 'error');

      if (error instanceof ProvisioningError || error instanceof BudgetExceededError) {
        throw error;
      }

      throw new ProvisioningError(
        'aws_lightsail',
        `Provisioning failed: ${errorMessage}`,
        'PROVISIONING_FAILED'
      );
    }
  }

  /**
   * Terminate a Lightsail instance
   *
   * @param instanceId - Instance name/ID to terminate
   */
  async deprovision(instanceId: string): Promise<void> {
    this.logger(`Deprovisioning instance: ${instanceId}`);

    try {
      const command = new DeleteInstanceCommand({
        instanceName: instanceId,
        forceDeleteAddOns: true,
      });

      await this.client.send(command);
      this.logger(`Instance ${instanceId} terminated successfully`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger(`Failed to deprovision: ${errorMessage}`, 'error');
      throw new ProvisioningError(
        'aws_lightsail',
        `Failed to terminate instance: ${errorMessage}`,
        'DEPROVISION_FAILED'
      );
    }
  }

  /**
   * Get instance health status
   *
   * @param instanceId - Instance name/ID
   * @returns Health status
   */
  async getInstanceStatus(instanceId: string): Promise<ProviderHealthStatus> {
    this.logger(`Getting status for instance: ${instanceId}`);

    try {
      const command = new GetInstanceStateCommand({
        instanceName: instanceId,
      });

      const response = await this.client.send(command);
      const state = response.state;

      return {
        provider: 'aws_lightsail',
        apiHealthy: true,
        latencyMs: 0, // Not tracked
        lastChecked: new Date(),
        instanceStatus: this.mapInstanceState(state?.name),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger(`Failed to get status: ${errorMessage}`, 'error');

      return {
        provider: 'aws_lightsail',
        apiHealthy: false,
        latencyMs: 0,
        lastChecked: new Date(),
        instanceStatus: 'unknown',
      };
    }
  }

  /**
   * Configure firewall rules for an instance
   *
   * @param instanceId - Instance name/ID
   * @param config - Security configuration
   */
  async configureFirewall(
    instanceId: string,
    config: SecurityConfig
  ): Promise<void> {
    this.logger(`Configuring firewall for instance: ${instanceId}`);

    try {
      const portInfos: PortInfo[] = [];

      // SSH access from allowlist
      for (const cidr of config.sshAllowlist) {
        portInfos.push({
          fromPort: 22,
          toPort: 22,
          protocol: 'tcp',
          cidrs: [cidr],
        });
      }

      // Syslog port (6514) from syslog sources
      if (config.tlsEnabled) {
        for (const cidr of config.syslogAllowlist) {
          portInfos.push({
            fromPort: 6514,
            toPort: 6514,
            protocol: 'tcp',
            cidrs: [cidr],
          });
        }
      }

      const command = new PutInstancePublicPortsCommand({
        instanceName: instanceId,
        portInfos,
      });

      await this.client.send(command);
      this.logger(`Firewall configured with ${portInfos.length} rules`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger(`Failed to configure firewall: ${errorMessage}`, 'error');
      throw new ProvisioningError(
        'aws_lightsail',
        `Failed to configure firewall: ${errorMessage}`,
        'FIREWALL_CONFIG_FAILED'
      );
    }
  }

  /**
   * Get WSJF characteristics for AWS Lightsail
   */
  override getWSJFCharacteristics(): WSJFJobSizeFactors {
    return {
      provisioningTime: 2, // Immediate provisioning
      configurationComplexity: 3, // Low complexity, integrated services
      apiReliability: 0.999, // Very high - AWS SLA
    };
  }

  // =========================================================================
  // Private Helper Methods
  // =========================================================================

  /**
   * Get Ubuntu 22.04 LTS blueprint ID
   */
  private async getUbuntuBlueprintId(): Promise<string> {
    try {
      const command = new GetBlueprintsCommand({
        includeInactive: false,
      });

      const response = await this.client.send(command);
      const blueprints = response.blueprints || [];

      // Find Ubuntu 22.04 blueprint
      const ubuntuBlueprint = blueprints.find(
        (bp: Blueprint) =>
          bp.blueprintId?.includes('ubuntu_22_04') ||
          (bp.name?.toLowerCase().includes('ubuntu') &&
            bp.version?.includes('22.04'))
      );

      if (!ubuntuBlueprint?.blueprintId) {
        // Fallback to a known blueprint ID
        this.logger(
          'Ubuntu 22.04 blueprint not found, using default',
          'warn'
        );
        return 'ubuntu_22_04';
      }

      return ubuntuBlueprint.blueprintId;
    } catch (error) {
      this.logger('Failed to get blueprints, using default', 'warn');
      return 'ubuntu_22_04';
    }
  }

  /**
   * Wait for instance to be in running state
   *
   * @param instanceName - Instance name to wait for
   * @param timeoutMs - Timeout in milliseconds (default: 300000 = 5 min)
   */
  private async waitForInstanceRunning(
    instanceName: string,
    timeoutMs: number = 300000
  ): Promise<Instance> {
    const startTime = Date.now();
    const pollIntervalMs = 5000;

    while (Date.now() - startTime < timeoutMs) {
      try {
        const command = new GetInstanceCommand({
          instanceName,
        });

        const response = await this.client.send(command);
        const instance = response.instance;

        if (instance?.state?.name === 'running') {
          return instance;
        }

        this.logger(
          `Waiting for instance ${instanceName} (current state: ${instance?.state?.name})`,
          'debug'
        );
      } catch (error) {
        // Instance may not exist yet, keep waiting
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new ProvisioningError(
      'aws_lightsail',
      `Instance ${instanceName} did not reach running state within timeout`,
      'TIMEOUT'
    );
  }

  /**
   * Map AWS instance state to our status
   */
  private mapInstanceState(
    state?: string
  ): 'running' | 'stopped' | 'pending' | 'unknown' {
    switch (state) {
      case 'running':
        return 'running';
      case 'stopped':
        return 'stopped';
      case 'pending':
      case 'stopping':
      case 'starting':
        return 'pending';
      default:
        return 'unknown';
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an AWS Lightsail provider from environment variables
 *
 * Required environment variables:
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 * - AWS_REGION (optional, defaults to us-east-1)
 *
 * @returns Configured AWS Lightsail provider
 */
export function createAWSLightsailProviderFromEnv(): AWSLightsailProvider {
  return new AWSLightsailProvider();
}
