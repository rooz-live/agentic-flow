/**
 * Cloud Provider Abstract Base Class
 *
 * Defines the contract for cloud provider implementations (AWS Lightsail, Hivelocity).
 * Provides a unified interface for VPS provisioning, management, and cost comparison.
 *
 * @module devops/providers/cloud-provider
 */

// ============================================================================
// Type Definitions (from Architecture Document)
// ============================================================================

/**
 * VPS specification requirements
 */
export interface VPSSpecification {
  vcpus: number;
  memoryGb: number;
  diskGb: number;
  os: 'ubuntu' | 'debian' | 'centos';
  osVersion: string;
  region?: string;
}

/**
 * Security configuration
 */
export interface SecurityConfig {
  /** SSH access allowlist in CIDR notation */
  sshAllowlist: string[];

  /** Syslog source allowlist in CIDR notation */
  syslogAllowlist: string[];

  /** Enable TLS for syslog transport */
  tlsEnabled: boolean;

  /** Common Name for TLS server certificate */
  tlsCertificateCN?: string;
}

/**
 * Provider pricing information
 */
export interface ProviderPricing {
  provider: 'aws_lightsail' | 'hivelocity';
  planName: string;
  monthlyPrice: number;
  specs: VPSSpecification;
  region: string;
  availability: 'immediate' | 'minutes' | 'hours' | 'days';
  features: string[];
  setupFee?: number;
  dataTransferCost?: number;
}

/**
 * WSJF Cost of Delay factors for provider selection
 */
export interface WSJFCostOfDelayFactors {
  /** Business value of observability - how critical is log aggregation? */
  businessValue: number; // 1-10 scale

  /** Time criticality - how soon is the VPS needed? */
  timeCriticality: number; // 1-10 scale

  /** Risk reduction - security/compliance value of centralized logging */
  riskReduction: number; // 1-10 scale
}

/**
 * WSJF Job Size factors for provider selection
 */
export interface WSJFJobSizeFactors {
  /** Expected provisioning time in minutes */
  provisioningTime: number; // 1-60 minutes

  /** Configuration complexity */
  configurationComplexity: number; // 1-10 scale

  /** Provider API reliability score */
  apiReliability: number; // 0-1 probability
}

/**
 * Complete WSJF scoring input
 */
export interface WSJFProviderInput {
  costOfDelay: WSJFCostOfDelayFactors;
  jobSize: WSJFJobSizeFactors;
  budgetConstraint: number; // USD per month
  requiredSpecs: VPSSpecification;
}

/**
 * WSJF scoring result
 */
export interface WSJFProviderResult {
  /** Raw WSJF score: Cost of Delay / Job Size */
  rawScore: number;

  /** Normalized score 0-100 */
  normalizedScore: number;

  /** Priority classification */
  priority: 'critical' | 'high' | 'medium' | 'low';

  /** Breakdown of score components */
  components: {
    costOfDelayWeighted: number;
    jobSizeWeighted: number;
    budgetEfficiency: number;
  };

  /** Human-readable recommendation */
  recommendation: string;
}

/**
 * Provisioning request
 */
export interface ProvisioningRequest {
  specs: VPSSpecification;
  security: SecurityConfig;
  wsjfInput: WSJFProviderInput;
  hostname: string;
  tags?: Record<string, string>;
}

/**
 * Provisioning result
 */
export interface ProvisioningResult {
  success: boolean;
  provider: 'aws_lightsail' | 'hivelocity';
  instanceId?: string;
  publicIp?: string;
  hostname: string;
  sshPort: number;
  syslogPort: number;
  tlsCertificatePath?: string;
  provisionTime?: number;
  error?: string;
  warnings?: string[];
}

/**
 * Provider capacity status
 */
export interface CapacityStatus {
  provider: 'aws_lightsail' | 'hivelocity';
  available: boolean;
  estimatedProvisioningTime: string;
  capacityUtilization?: number;
  quotaRemaining?: number;
}

/**
 * Provider API health status
 */
export interface ProviderHealthStatus {
  provider: 'aws_lightsail' | 'hivelocity';
  apiHealthy: boolean;
  latencyMs: number;
  lastChecked: Date;
  errorRate24h?: number;
  instanceStatus?: 'running' | 'stopped' | 'pending' | 'unknown';
}

/**
 * Provider selection result
 */
export interface ProviderSelection {
  selectedProvider: 'aws_lightsail' | 'hivelocity';
  pricing: ProviderPricing;
  wsjfResult: WSJFProviderResult;
  reason: string;
  alternatives: ProviderPricing[];
  recommendation: 'proceed' | 'review' | 'avoid';
}

/**
 * Cloud provider error
 */
export interface CloudProviderError {
  code: string;
  message: string;
  provider: 'aws_lightsail' | 'hivelocity';
  timestamp: Date;
  retryable: boolean;
  retryAfter?: number; // seconds
  fallbackAvailable: boolean;
  details?: Record<string, unknown>;
}

// ============================================================================
// Custom Error Classes
// ============================================================================

/**
 * Base error class for cloud provider operations
 */
export class CloudProviderOperationError extends Error {
  public readonly code: string;
  public readonly provider: 'aws_lightsail' | 'hivelocity';
  public readonly timestamp: Date;
  public readonly retryable: boolean;
  public readonly retryAfter?: number;
  public readonly fallbackAvailable: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(error: CloudProviderError) {
    super(error.message);
    this.name = 'CloudProviderOperationError';
    this.code = error.code;
    this.provider = error.provider;
    this.timestamp = error.timestamp;
    this.retryable = error.retryable;
    this.retryAfter = error.retryAfter;
    this.fallbackAvailable = error.fallbackAvailable;
    this.details = error.details;
  }

  toJSON(): CloudProviderError {
    return {
      code: this.code,
      message: this.message,
      provider: this.provider,
      timestamp: this.timestamp,
      retryable: this.retryable,
      retryAfter: this.retryAfter,
      fallbackAvailable: this.fallbackAvailable,
      details: this.details,
    };
  }
}

/**
 * Error thrown when provisioning fails
 */
export class ProvisioningError extends CloudProviderOperationError {
  constructor(
    provider: 'aws_lightsail' | 'hivelocity',
    message: string,
    code: string = 'PROVISIONING_FAILED',
    retryable: boolean = true,
    details?: Record<string, unknown>
  ) {
    super({
      code,
      message,
      provider,
      timestamp: new Date(),
      retryable,
      fallbackAvailable: true,
      details,
    });
    this.name = 'ProvisioningError';
  }
}

/**
 * Error thrown when authentication fails
 */
export class AuthenticationError extends CloudProviderOperationError {
  constructor(
    provider: 'aws_lightsail' | 'hivelocity',
    message: string = 'Authentication failed'
  ) {
    super({
      code: 'AUTH_FAILED',
      message,
      provider,
      timestamp: new Date(),
      retryable: false,
      fallbackAvailable: false,
    });
    this.name = 'AuthenticationError';
  }
}

/**
 * Error thrown when budget is exceeded
 */
export class BudgetExceededError extends CloudProviderOperationError {
  constructor(
    provider: 'aws_lightsail' | 'hivelocity',
    budget: number,
    actualCost: number
  ) {
    super({
      code: 'BUDGET_EXCEEDED',
      message: `Monthly cost $${actualCost} exceeds budget of $${budget}`,
      provider,
      timestamp: new Date(),
      retryable: false,
      fallbackAvailable: true,
      details: { budget, actualCost },
    });
    this.name = 'BudgetExceededError';
  }
}

/**
 * Error thrown when quota is exceeded
 */
export class QuotaExceededError extends CloudProviderOperationError {
  constructor(
    provider: 'aws_lightsail' | 'hivelocity',
    quotaType: string,
    limit: number
  ) {
    super({
      code: 'QUOTA_EXCEEDED',
      message: `${quotaType} quota exceeded (limit: ${limit})`,
      provider,
      timestamp: new Date(),
      retryable: false,
      fallbackAvailable: true,
      details: { quotaType, limit },
    });
    this.name = 'QuotaExceededError';
  }
}

// ============================================================================
// Abstract Cloud Provider Class
// ============================================================================

/**
 * Abstract base class for cloud providers
 *
 * Implementations must provide methods for:
 * - Getting available plans/pricing
 * - Checking availability
 * - Provisioning instances
 * - Deprovisioning instances
 * - Getting instance status
 * - Configuring firewalls
 */
export abstract class CloudProvider {
  /** Provider name identifier */
  abstract readonly name: 'aws_lightsail' | 'hivelocity';

  /** Provider display name */
  abstract readonly displayName: string;

  /** API base URL */
  protected abstract readonly apiBaseUrl: string;

  /** Logger function */
  protected logger: (
    message: string,
    level?: 'info' | 'warn' | 'error' | 'debug'
  ) => void;

  constructor() {
    this.logger = this.createLogger();
  }

  /**
   * Get available plans within budget
   *
   * @param budgetMax - Maximum monthly budget in USD
   * @returns List of available plans with pricing
   */
  abstract getAvailablePlans(budgetMax?: number): Promise<ProviderPricing[]>;

  /**
   * Check provider availability and capacity
   *
   * @param region - Optional region to check
   * @returns Capacity status for the provider
   */
  abstract checkAvailability(region?: string): Promise<CapacityStatus>;

  /**
   * Provision a new VPS instance
   *
   * @param request - Provisioning request with specs and security config
   * @returns Provisioning result with instance details
   */
  abstract provision(request: ProvisioningRequest): Promise<ProvisioningResult>;

  /**
   * Deprovision (terminate) an instance
   *
   * @param instanceId - ID of the instance to terminate
   */
  abstract deprovision(instanceId: string): Promise<void>;

  /**
   * Get instance health and status
   *
   * @param instanceId - ID of the instance to check
   * @returns Health status of the instance
   */
  abstract getInstanceStatus(instanceId: string): Promise<ProviderHealthStatus>;

  /**
   * Configure firewall rules for an instance
   *
   * @param instanceId - ID of the instance
   * @param config - Security configuration with allowlists
   */
  abstract configureFirewall(
    instanceId: string,
    config: SecurityConfig
  ): Promise<void>;

  /**
   * Validate credentials and API access
   *
   * @returns True if credentials are valid
   */
  abstract validateCredentials(): Promise<boolean>;

  /**
   * Get provider-specific characteristics for WSJF scoring
   */
  getWSJFCharacteristics(): WSJFJobSizeFactors {
    // Default characteristics - override in subclasses
    return {
      provisioningTime: 5,
      configurationComplexity: 5,
      apiReliability: 0.95,
    };
  }

  /**
   * Create a logger instance for this provider
   */
  protected createLogger(): (
    message: string,
    level?: 'info' | 'warn' | 'error' | 'debug'
  ) => void {
    const providerName = this.constructor.name;
    return (
      message: string,
      level: 'info' | 'warn' | 'error' | 'debug' = 'info'
    ) => {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [${providerName}] [${level.toUpperCase()}] ${message}`;
      console.log(logMessage);
    };
  }

  /**
   * Validate environment variables are set
   *
   * @param vars - List of required environment variable names
   * @throws Error if any required variables are missing
   */
  protected validateEnvVars(vars: string[]): void {
    const missing = vars.filter((v) => !process.env[v]);
    if (missing.length > 0) {
      throw new AuthenticationError(
        this.name,
        `Missing required environment variables: ${missing.join(', ')}`
      );
    }
  }

  /**
   * Check if specs meet minimum requirements
   *
   * @param specs - VPS specifications to check
   * @param plan - Provider plan to compare against
   * @returns True if plan meets specs
   */
  protected specsMeetRequirements(
    specs: VPSSpecification,
    plan: ProviderPricing
  ): boolean {
    return (
      plan.specs.vcpus >= specs.vcpus &&
      plan.specs.memoryGb >= specs.memoryGb &&
      plan.specs.diskGb >= specs.diskGb
    );
  }

  /**
   * Retry an async operation with exponential backoff
   *
   * @param operation - Async operation to retry
   * @param maxRetries - Maximum number of retries
   * @param baseDelayMs - Base delay between retries in milliseconds
   * @returns Result of the operation
   */
  protected async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          const delay = baseDelayMs * Math.pow(2, attempt);
          this.logger(
            `Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms: ${lastError.message}`,
            'warn'
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }
}

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default configuration for the cloud provider selection API
 */
export const DEFAULT_CONFIG = {
  // Budget
  maxMonthlyBudget: 10,

  // Target specs
  specs: {
    vcpus: 1,
    memoryGb: 1,
    diskGb: 25,
    os: 'ubuntu' as const,
    osVersion: '22.04',
  },

  // Security
  security: {
    sshAllowlist: ['173.94.53.113/32'],
    syslogAllowlist: ['23.92.79.2/32'],
    syslogPort: 6514,
    tlsEnabled: true,
  },

  // WSJF defaults for observability
  wsjfDefaults: {
    businessValue: 8, // High - observability is critical
    timeCriticality: 7, // High - needed soon
    riskReduction: 9, // Very high - security logging
  },

  // Provider preferences
  providerPrefs: {
    preferredProvider: 'any' as 'aws_lightsail' | 'hivelocity' | 'any',
    maxProvisioningTime: 10, // minutes
    minApiReliability: 0.95,
  },
};

/**
 * Validate SSH allowlist CIDR notation
 *
 * @param allowlist - List of CIDR strings
 * @returns Validation result with any errors
 */
export function validateCIDRList(
  allowlist: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;

  for (const cidr of allowlist) {
    if (!cidrRegex.test(cidr)) {
      errors.push(`Invalid CIDR notation: ${cidr}`);
    } else {
      const [ip, mask] = cidr.split('/');
      const ipParts = ip.split('.').map(Number);

      if (ipParts.some((part) => part < 0 || part > 255)) {
        errors.push(`Invalid IP address in CIDR: ${cidr}`);
      }

      const maskNum = parseInt(mask, 10);
      if (maskNum < 0 || maskNum > 32) {
        errors.push(`Invalid subnet mask in CIDR: ${cidr}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
