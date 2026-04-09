/**
 * Cloud Provider Selection Service
 *
 * Orchestrates provider comparison and selection using WSJF (Weighted Shortest Job First)
 * scoring to select the optimal provider for each deployment.
 *
 * WSJF Scoring:
 * - Cost of Delay (CoD) = (Business Value + Time Criticality + Risk Reduction) / 3
 * - Job Size = Fibonacci scale based on provisioning complexity
 * - WSJF Score = CoD / Job Size
 *
 * @module cloud-providers/selection-service
 * @version 1.0.0
 */

import {
  CloudProvider,
  CloudProviderName,
  InstanceSpecs,
  InstanceOption,
  ProvisionConfig,
  ProvisionResult,
  ProviderComparison,
  ProviderComparisonResponse,
  WSJFProviderScore,
  ProviderWSJFInput,
  ProviderRecommendation,
  ConstraintViolation,
  BudgetConstraints,
  CloudProviderWSJFCalculator,
} from './types';

// ============================================================================
// Default WSJF Values for Cloud Provider Selection
// ============================================================================

/**
 * Default WSJF input values for cloud provider selection
 * Based on observability sink deployment requirements
 */
export const DEFAULT_WSJF_INPUT: ProviderWSJFInput = {
  /** High business value for security/compliance infrastructure */
  userBusinessValue: 8,
  /** Moderate-high time criticality (24-hour operational requirement) */
  timeCriticality: 7,
  /** Critical risk reduction (off-host forensics capability) */
  riskReduction: 9,
  /** Base provisioning time (adjusted per provider) */
  provisioningTimeMinutes: 5,
  /** Configuration complexity (low for managed VPS) */
  configurationComplexity: 1,
  /** API integration effort (low for mature APIs) */
  apiIntegrationEffort: 1,
};

/**
 * Provider-specific job size factors
 */
const PROVIDER_JOB_SIZE_FACTORS: Record<CloudProviderName, {
  provisioningTime: number;
  configurationComplexity: 1 | 2 | 3;
  apiIntegrationEffort: 1 | 2 | 3;
}> = {
  'aws-lightsail': {
    provisioningTime: 2, // ~5 min = low complexity
    configurationComplexity: 1, // Low - managed service
    apiIntegrationEffort: 1, // Low - mature AWS SDK
  },
  'hivelocity': {
    provisioningTime: 3, // ~15 min = moderate complexity
    configurationComplexity: 2, // Medium - custom setup
    apiIntegrationEffort: 2, // Medium - REST API
  },
};

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
// WSJF Calculator Implementation
// ============================================================================

/**
 * WSJF Calculator for cloud provider selection
 *
 * Implements the CloudProviderWSJFCalculator interface with
 * provider-specific job size calculations.
 */
export class ProviderWSJFCalculator implements CloudProviderWSJFCalculator {
  private logger: Logger;

  constructor(logger: Logger = defaultLogger) {
    this.logger = logger;
  }

  /**
   * Calculate WSJF score for a provider
   *
   * Formula:
   * - Cost of Delay (CoD) = (Business Value + Time Criticality + Risk Reduction) / 3
   * - Job Size = Sum of (Provisioning Time + Config Complexity + API Effort)
   * - WSJF = CoD / Job Size
   */
  calculate(input: ProviderWSJFInput): WSJFProviderScore {
    // Validate inputs are in 1-10 range
    const validateRange = (value: number, name: string) => {
      if (value < 1 || value > 10) {
        throw new Error(`${name} must be between 1 and 10`);
      }
    };

    validateRange(input.userBusinessValue, 'userBusinessValue');
    validateRange(input.timeCriticality, 'timeCriticality');
    validateRange(input.riskReduction, 'riskReduction');

    // Calculate Cost of Delay components
    const costOfDelay: WSJFProviderScore['costOfDelay'] = {
      businessValue: input.userBusinessValue,
      timeCriticality: input.timeCriticality,
      riskReduction: input.riskReduction,
    };

    // Calculate total CoD (average of components)
    const codTotal = (
      costOfDelay.businessValue +
      costOfDelay.timeCriticality +
      costOfDelay.riskReduction
    ) / 3;

    // Calculate Job Size
    const jobSizeFactors = {
      provisioningTime: this.mapProvisioningTimeToScore(input.provisioningTimeMinutes),
      configurationComplexity: input.configurationComplexity,
      apiIntegrationEffort: input.apiIntegrationEffort,
    };

    // Total job size (sum of factors)
    const totalJobSize = (
      jobSizeFactors.provisioningTime +
      jobSizeFactors.configurationComplexity +
      jobSizeFactors.apiIntegrationEffort
    );

    // Map to Fibonacci scale
    const fibonacciJobSize = this.mapToFibonacci(totalJobSize);

    // Calculate WSJF score
    const score = codTotal / fibonacciJobSize;

    this.logger.debug('WSJF calculation completed', {
      input,
      codTotal,
      jobSize: fibonacciJobSize,
      score,
    });

    return {
      costOfDelay,
      jobSize: fibonacciJobSize,
      score: Math.round(score * 100) / 100, // Round to 2 decimal places
      jobSizeFactors,
    };
  }

  /**
   * Compare and rank multiple providers by WSJF score
   */
  rankProviders(comparisons: ProviderComparison[]): ProviderComparison[] {
    return [...comparisons].sort((a, b) => {
      // First, prioritize providers that meet constraints
      if (a.meetsConstraints !== b.meetsConstraints) {
        return a.meetsConstraints ? -1 : 1;
      }
      // Then sort by WSJF score descending
      return b.wsjfScore.score - a.wsjfScore.score;
    });
  }

  /**
   * Determine recommendation level based on score and constraints
   */
  getRecommendation(comparison: ProviderComparison): ProviderRecommendation {
    if (!comparison.meetsConstraints) {
      return 'not-recommended';
    }

    // Score thresholds for recommendation levels
    if (comparison.wsjfScore.score >= 6) {
      return 'preferred';
    } else if (comparison.wsjfScore.score >= 3) {
      return 'acceptable';
    } else {
      return 'not-recommended';
    }
  }

  /**
   * Map provisioning time (minutes) to a 1-3 complexity score
   */
  private mapProvisioningTimeToScore(minutes: number): number {
    if (minutes <= 5) return 1;
    if (minutes <= 10) return 2;
    if (minutes <= 20) return 3;
    if (minutes <= 30) return 4;
    return 5;
  }

  /**
   * Map total job size to Fibonacci scale
   */
  private mapToFibonacci(total: number): 1 | 2 | 3 | 5 | 8 | 13 {
    if (total <= 3) return 1;
    if (total <= 4) return 2;
    if (total <= 5) return 3;
    if (total <= 7) return 5;
    if (total <= 10) return 8;
    return 13;
  }
}

// ============================================================================
// Selection Service Configuration
// ============================================================================

/**
 * Configuration options for Cloud Provider Selection Service
 */
export interface SelectionServiceConfig {
  /** Custom logger instance */
  logger?: Logger;
  /** Default WSJF input values */
  defaultWSJFInput?: Partial<ProviderWSJFInput>;
  /** Cache TTL for provider queries (ms) */
  cacheTTLMs?: number;
}

// ============================================================================
// Cloud Provider Selection Service
// ============================================================================

/**
 * Cloud Provider Selection Service
 *
 * Orchestrates provider comparison and selection using WSJF scoring
 * to select the optimal provider for VPS deployments.
 */
export class CloudProviderSelectionService {
  /** Registered cloud providers */
  private providers: CloudProvider[];

  /** WSJF Calculator */
  private wsjfCalculator: ProviderWSJFCalculator;

  /** Logger instance */
  private logger: Logger;

  /** Default WSJF input */
  private defaultWSJFInput: ProviderWSJFInput;

  /** Instance cache */
  private instanceCache: Map<string, {
    instances: InstanceOption[];
    timestamp: number;
  }> = new Map();

  /** Cache TTL in ms */
  private cacheTTLMs: number;

  constructor(
    providers: CloudProvider[],
    config: SelectionServiceConfig = {}
  ) {
    this.providers = providers;
    this.logger = config.logger || defaultLogger;
    this.wsjfCalculator = new ProviderWSJFCalculator(this.logger);
    this.cacheTTLMs = config.cacheTTLMs || 300000; // 5 minutes default

    // Merge default WSJF input with any overrides
    this.defaultWSJFInput = {
      ...DEFAULT_WSJF_INPUT,
      ...config.defaultWSJFInput,
    };

    this.logger.info('Cloud Provider Selection Service initialized', {
      providerCount: providers.length,
      providers: providers.map((p) => p.name),
    });
  }

  /**
   * Compare all providers for the given specifications and budget
   */
  async compareProviders(
    specs: InstanceSpecs,
    budget: number
  ): Promise<ProviderComparison[]> {
    this.logger.info('Comparing providers', { specs, budget });

    const comparisons: ProviderComparison[] = [];

    for (const provider of this.providers) {
      try {
        const instances = await this.getProviderInstances(provider, specs);

        if (instances.length === 0) {
          this.logger.warn(`No matching instances from ${provider.name}`, { specs });
          continue;
        }

        // Get the cheapest instance that meets specs
        const bestInstance = instances[0]; // Already sorted by price

        // Check budget constraint
        const meetsConstraints = bestInstance.monthlyPrice <= budget;
        const constraintViolations: ConstraintViolation[] = [];

        if (!meetsConstraints) {
          constraintViolations.push({
            constraint: 'budget',
            message: `Price $${bestInstance.monthlyPrice}/month exceeds budget of $${budget}/month`,
            actualValue: bestInstance.monthlyPrice,
            requiredValue: budget,
          });
        }

        // Calculate WSJF score
        const wsjfInput = this.getProviderWSJFInput(provider);
        const wsjfScore = this.wsjfCalculator.calculate(wsjfInput);

        const comparison: ProviderComparison = {
          provider: provider.name,
          instanceType: bestInstance.instanceType,
          monthlyPrice: bestInstance.monthlyPrice,
          specs: {
            vcpu: bestInstance.specs.vcpu,
            ramGb: bestInstance.specs.ramGb,
            diskGb: bestInstance.specs.diskGb,
          },
          wsjfScore,
          recommendation: 'not-recommended', // Will be set after ranking
          estimatedProvisioningTime: provider.getEstimatedProvisioningTime(),
          meetsConstraints,
          constraintViolations: constraintViolations.length > 0 ? constraintViolations : undefined,
        };

        // Determine recommendation
        comparison.recommendation = this.wsjfCalculator.getRecommendation(comparison);

        comparisons.push(comparison);
      } catch (error) {
        this.logger.error(`Failed to get instances from ${provider.name}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Rank by WSJF score
    const rankedComparisons = this.wsjfCalculator.rankProviders(comparisons);

    // Update recommendation for top provider
    if (rankedComparisons.length > 0 && rankedComparisons[0].meetsConstraints) {
      rankedComparisons[0].recommendation = 'preferred';
    }

    this.logger.info('Provider comparison completed', {
      totalProviders: this.providers.length,
      comparisonsGenerated: rankedComparisons.length,
      topProvider: rankedComparisons[0]?.provider,
    });

    return rankedComparisons;
  }

  /**
   * Calculate WSJF score for a specific provider
   */
  calculateWSJFScore(
    provider: CloudProvider,
    customInput?: Partial<ProviderWSJFInput>
  ): WSJFProviderScore {
    const input = {
      ...this.getProviderWSJFInput(provider),
      ...customInput,
    };

    return this.wsjfCalculator.calculate(input);
  }

  /**
   * Select the optimal provider based on specs and budget
   */
  async selectOptimalProvider(
    specs: InstanceSpecs,
    budget: number
  ): Promise<CloudProvider | null> {
    const comparisons = await this.compareProviders(specs, budget);

    // Find the first provider that meets constraints (already sorted by WSJF)
    const optimalComparison = comparisons.find((c) => c.meetsConstraints);

    if (!optimalComparison) {
      this.logger.warn('No provider meets the specified constraints', { specs, budget });
      return null;
    }

    const optimalProvider = this.providers.find(
      (p) => p.name === optimalComparison.provider
    );

    this.logger.info('Optimal provider selected', {
      provider: optimalComparison.provider,
      wsjfScore: optimalComparison.wsjfScore.score,
      monthlyPrice: optimalComparison.monthlyPrice,
    });

    return optimalProvider || null;
  }

  /**
   * Provision with the optimal provider
   */
  async provisionWithOptimalProvider(
    config: ProvisionConfig
  ): Promise<ProvisionResult> {
    const provider = this.providers.find((p) => p.name === config.provider);

    if (!provider) {
      throw new Error(`Provider not found: ${config.provider}`);
    }

    this.logger.info('Provisioning with provider', {
      provider: config.provider,
      instanceType: config.instanceType,
      instanceName: config.configuration.instanceName,
    });

    return provider.provisionInstance(config);
  }

  /**
   * Get full comparison response
   */
  async getComparisonResponse(
    specs: InstanceSpecs,
    budget: number
  ): Promise<ProviderComparisonResponse> {
    const comparisons = await this.compareProviders(specs, budget);

    // Determine selected provider (first that meets constraints)
    const selectedComparison = comparisons.find((c) => c.meetsConstraints);

    // Generate selection rationale
    let selectionRationale: string;
    if (selectedComparison) {
      selectionRationale = `${selectedComparison.provider} selected with highest WSJF score (${selectedComparison.wsjfScore.score}) within $${budget}/month budget. Estimated provisioning: ${selectedComparison.estimatedProvisioningTime} minutes.`;
    } else if (comparisons.length > 0) {
      selectionRationale = `No provider meets the $${budget}/month budget constraint. Cheapest option is ${comparisons[0].provider} at $${comparisons[0].monthlyPrice}/month.`;
    } else {
      selectionRationale = 'No providers available matching the specifications.';
    }

    return {
      comparisons,
      selectedProvider: selectedComparison?.provider || null,
      selectionRationale,
      comparedAt: new Date(),
    };
  }

  /**
   * Register a new provider
   */
  registerProvider(provider: CloudProvider): void {
    const existing = this.providers.find((p) => p.name === provider.name);
    if (existing) {
      throw new Error(`Provider already registered: ${provider.name}`);
    }

    this.providers.push(provider);
    this.logger.info('Provider registered', { provider: provider.name });
  }

  /**
   * Unregister a provider
   */
  unregisterProvider(name: CloudProviderName): boolean {
    const index = this.providers.findIndex((p) => p.name === name);
    if (index === -1) {
      return false;
    }

    this.providers.splice(index, 1);
    this.instanceCache.delete(name);
    this.logger.info('Provider unregistered', { provider: name });
    return true;
  }

  /**
   * Get registered providers
   */
  getProviders(): CloudProvider[] {
    return [...this.providers];
  }

  /**
   * Check health of all providers
   */
  async checkAllProviderHealth(): Promise<Map<CloudProviderName, {
    available: boolean;
    latencyMs: number;
    message?: string;
  }>> {
    const results = new Map<CloudProviderName, {
      available: boolean;
      latencyMs: number;
      message?: string;
    }>();

    for (const provider of this.providers) {
      try {
        const health = await provider.checkHealth();
        results.set(provider.name, health);
      } catch (error) {
        results.set(provider.name, {
          available: false,
          latencyMs: 0,
          message: error instanceof Error ? error.message : 'Health check failed',
        });
      }
    }

    return results;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Get instances from provider with caching
   */
  private async getProviderInstances(
    provider: CloudProvider,
    specs: InstanceSpecs
  ): Promise<InstanceOption[]> {
    const cacheKey = `${provider.name}:${JSON.stringify(specs)}`;
    const cached = this.instanceCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTTLMs) {
      this.logger.debug('Using cached instances', { provider: provider.name });
      return cached.instances;
    }

    const instances = await provider.getAvailableInstances(specs);

    this.instanceCache.set(cacheKey, {
      instances,
      timestamp: Date.now(),
    });

    return instances;
  }

  /**
   * Get WSJF input for a specific provider
   */
  private getProviderWSJFInput(provider: CloudProvider): ProviderWSJFInput {
    const factors = PROVIDER_JOB_SIZE_FACTORS[provider.name] || {
      provisioningTime: 2,
      configurationComplexity: 2 as const,
      apiIntegrationEffort: 2 as const,
    };

    return {
      ...this.defaultWSJFInput,
      provisioningTimeMinutes: provider.getEstimatedProvisioningTime(),
      configurationComplexity: factors.configurationComplexity,
      apiIntegrationEffort: factors.apiIntegrationEffort,
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create selection service with AWS Lightsail and Hivelocity providers
 */
export async function createDefaultSelectionService(
  config?: SelectionServiceConfig
): Promise<CloudProviderSelectionService> {
  // Dynamic imports to avoid circular dependencies
  const { AWSLightsailAdapter } = await import('./aws-lightsail-adapter');
  const { HivelocityAdapter } = await import('./hivelocity-adapter');

  const providers: CloudProvider[] = [
    new AWSLightsailAdapter(),
    new HivelocityAdapter(),
  ];

  return new CloudProviderSelectionService(providers, config);
}

/**
 * Create selection service from environment configuration
 */
export async function createSelectionServiceFromEnv(): Promise<CloudProviderSelectionService> {
  const { createAWSLightsailAdapterFromEnv } = await import('./aws-lightsail-adapter');
  const { createHivelocityAdapterFromEnv } = await import('./hivelocity-adapter');

  const providers: CloudProvider[] = [
    createAWSLightsailAdapterFromEnv(),
    createHivelocityAdapterFromEnv(),
  ];

  return new CloudProviderSelectionService(providers, {
    cacheTTLMs: parseInt(process.env.CLOUD_PROVIDER_CACHE_TTL || '300', 10) * 1000,
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate WSJF score with default observability sink values
 *
 * Uses the standard values for deploying an observability/security sink:
 * - Business Value: 8 (security/compliance infrastructure)
 * - Time Criticality: 7 (24-hour operational requirement)
 * - Risk Reduction: 9 (off-host forensics capability)
 */
export function calculateObservabilitySinkWSJF(
  providerName: CloudProviderName
): WSJFProviderScore {
  const calculator = new ProviderWSJFCalculator();
  const factors = PROVIDER_JOB_SIZE_FACTORS[providerName];

  return calculator.calculate({
    userBusinessValue: 8,
    timeCriticality: 7,
    riskReduction: 9,
    provisioningTimeMinutes: providerName === 'aws-lightsail' ? 5 : 15,
    configurationComplexity: factors.configurationComplexity,
    apiIntegrationEffort: factors.apiIntegrationEffort,
  });
}

/**
 * Quick comparison of providers for budget
 */
export async function quickCompareProviders(
  budget: number,
  specs?: Partial<InstanceSpecs>
): Promise<ProviderComparisonResponse> {
  const service = await createDefaultSelectionService();

  const defaultSpecs: InstanceSpecs = {
    minVcpu: 1,
    minRamGb: 1,
    minDiskGb: 25,
    maxDiskGb: 40,
    os: 'ubuntu-22.04',
    region: 'us-east-1',
    ...specs,
  };

  return service.getComparisonResponse(defaultSpecs, budget);
}
