/**
 * Cloud Provider Selector with WSJF-based Cost Optimization
 *
 * Implements intelligent provider selection between AWS Lightsail and Hivelocity
 * based on:
 * - Cost comparison ($10/month budget constraint)
 * - WSJF scoring for deployment prioritization
 * - Availability and reliability metrics
 * - Specification matching
 *
 * WSJF Formula:
 * WSJF Score = Cost of Delay / Job Size
 *
 * Cost of Delay = (businessValue × 0.4) + (timeCriticality × 0.35) + (riskReduction × 0.25)
 * Job Size = (provisioningTime × 0.5) + (complexity × 0.3) + (1 - apiReliability) × 0.2
 *
 * @module devops/providers/provider-selector
 */

import {
  CloudProvider,
  ProviderPricing,
  ProviderSelection,
  VPSSpecification,
  WSJFProviderInput,
  WSJFProviderResult,
  WSJFCostOfDelayFactors,
  WSJFJobSizeFactors,
  ProvisioningRequest,
  ProvisioningResult,
  CapacityStatus,
  DEFAULT_CONFIG,
} from './cloud-provider.js';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Provider comparison result
 */
export interface ProviderComparison {
  provider: 'aws_lightsail' | 'hivelocity';
  pricing: ProviderPricing;
  wsjfScore: number;
  normalizedScore: number;
  advantages: string[];
  disadvantages: string[];
}

/**
 * Cost comparison result
 */
export interface CostComparisonResult {
  cheapest: ProviderPricing | null;
  bestValue: ProviderPricing | null;
  comparisons: ProviderComparison[];
  summary: string;
}

/**
 * WSJF weights for Cost of Delay
 */
const COD_WEIGHTS = {
  businessValue: 0.4,
  timeCriticality: 0.35,
  riskReduction: 0.25,
} as const;

/**
 * WSJF weights for Job Size
 */
const JOB_SIZE_WEIGHTS = {
  provisioningTime: 0.5,
  complexity: 0.3,
  reliabilityInverse: 0.2,
} as const;

// ============================================================================
// Cloud Provider Selector Class
// ============================================================================

/**
 * Intelligent provider selector with WSJF-based optimization
 *
 * Features:
 * - Multi-provider cost comparison
 * - WSJF scoring for prioritization
 * - Automatic fallback selection
 * - Budget constraint enforcement
 */
export class CloudProviderSelector {
  private providers: CloudProvider[];
  private logger: (
    message: string,
    level?: 'info' | 'warn' | 'error' | 'debug'
  ) => void;

  /**
   * Create a new provider selector
   *
   * @param providers - Array of cloud providers to select from
   */
  constructor(providers: CloudProvider[]) {
    if (providers.length === 0) {
      throw new Error('At least one provider must be configured');
    }

    this.providers = providers;
    this.logger = this.createLogger();

    this.logger(
      `Initialized with ${providers.length} provider(s): ${providers.map((p) => p.name).join(', ')}`
    );
  }

  /**
   * Select the optimal provider for a provisioning request
   *
   * Selection flow:
   * 1. Filter by budget ($10/month max)
   * 2. Filter by specs (1 vCPU, 1GB RAM, 25-40GB disk, Ubuntu 22.04)
   * 3. Check availability for all providers
   * 4. Calculate WSJF scores
   * 5. Return optimal provider with fallback alternative
   *
   * @param request - Provisioning request with specs and WSJF input
   * @returns Provider selection with WSJF result and alternatives
   */
  async selectOptimalProvider(
    request: ProvisioningRequest
  ): Promise<ProviderSelection> {
    this.logger('Starting optimal provider selection');

    const { specs, wsjfInput } = request;
    const budget = wsjfInput.budgetConstraint;

    // Step 1 & 2: Get plans matching budget and specs from all providers
    const allPlans = await this.getMatchingPlans(specs, budget);

    if (allPlans.length === 0) {
      throw new Error(
        `No providers match requirements: ${JSON.stringify(specs)} within budget $${budget}`
      );
    }

    // Step 3: Check availability
    const availablePlans = await this.filterByAvailability(allPlans);

    if (availablePlans.length === 0) {
      throw new Error('No providers currently have available capacity');
    }

    // Step 4: Calculate WSJF scores for all available plans
    const scoredPlans = availablePlans.map((plan) => ({
      plan,
      wsjfResult: this.calculateWSJFScore({
        ...wsjfInput,
        requiredSpecs: specs,
      }, plan),
    }));

    // Sort by WSJF score (highest first)
    scoredPlans.sort((a, b) => b.wsjfResult.rawScore - a.wsjfResult.rawScore);

    const best = scoredPlans[0];
    const alternatives = scoredPlans.slice(1).map((s) => s.plan);

    // Generate selection reason
    const reason = this.generateSelectionReason(best.plan, best.wsjfResult);

    // Determine recommendation
    const recommendation = this.getRecommendation(best.wsjfResult);

    this.logger(
      `Selected ${best.plan.provider} with WSJF score ${best.wsjfResult.rawScore.toFixed(2)}`
    );

    return {
      selectedProvider: best.plan.provider,
      pricing: best.plan,
      wsjfResult: best.wsjfResult,
      reason,
      alternatives,
      recommendation,
    };
  }

  /**
   * Compare costs across all providers
   *
   * @param specs - VPS specifications to compare
   * @param budget - Maximum monthly budget
   * @returns Cost comparison result
   */
  async compareProviderCosts(
    specs: VPSSpecification,
    budget: number = DEFAULT_CONFIG.maxMonthlyBudget
  ): Promise<CostComparisonResult> {
    this.logger('Comparing provider costs');

    const allPlans = await this.getMatchingPlans(specs, budget);

    if (allPlans.length === 0) {
      return {
        cheapest: null,
        bestValue: null,
        comparisons: [],
        summary: `No plans match specifications within $${budget}/month budget`,
      };
    }

    // Build comparisons
    const comparisons: ProviderComparison[] = allPlans.map((plan) => {
      const wsjfResult = this.calculateWSJFScore(
        {
          costOfDelay: DEFAULT_CONFIG.wsjfDefaults,
          jobSize: this.getProviderByName(plan.provider)?.getWSJFCharacteristics() || {
            provisioningTime: 5,
            configurationComplexity: 5,
            apiReliability: 0.95,
          },
          budgetConstraint: budget,
          requiredSpecs: specs,
        },
        plan
      );

      return {
        provider: plan.provider,
        pricing: plan,
        wsjfScore: wsjfResult.rawScore,
        normalizedScore: wsjfResult.normalizedScore,
        advantages: this.getProviderAdvantages(plan.provider),
        disadvantages: this.getProviderDisadvantages(plan.provider),
      };
    });

    // Find cheapest
    const cheapest = [...allPlans].sort(
      (a, b) => a.monthlyPrice - b.monthlyPrice
    )[0];

    // Find best value (highest WSJF score)
    const bestValue = [...comparisons].sort(
      (a, b) => b.wsjfScore - a.wsjfScore
    )[0]?.pricing || null;

    // Generate summary
    const summary = this.generateCostSummary(comparisons, cheapest, bestValue);

    return {
      cheapest,
      bestValue,
      comparisons,
      summary,
    };
  }

  /**
   * Calculate WSJF score for a provider/plan combination
   *
   * Formula:
   * WSJF = Cost of Delay / Job Size
   *
   * Cost of Delay = (businessValue × 0.4) + (timeCriticality × 0.35) + (riskReduction × 0.25)
   * Job Size = (provisioningTime × 0.5) + (complexity × 0.3) + (1 - apiReliability) × 0.2
   *
   * @param input - WSJF input factors
   * @param plan - Optional plan to score (uses default if not provided)
   * @returns WSJF scoring result
   */
  calculateWSJFScore(
    input: WSJFProviderInput,
    plan?: ProviderPricing
  ): WSJFProviderResult {
    const { costOfDelay, jobSize, budgetConstraint } = input;

    // Calculate weighted Cost of Delay
    const codWeighted =
      costOfDelay.businessValue * COD_WEIGHTS.businessValue +
      costOfDelay.timeCriticality * COD_WEIGHTS.timeCriticality +
      costOfDelay.riskReduction * COD_WEIGHTS.riskReduction;

    // Normalize provisioning time (1-60 minutes to 1-10 scale)
    const normalizedProvTime = Math.min(jobSize.provisioningTime / 6, 10);

    // Calculate reliability inverse (higher reliability = lower job size)
    const reliabilityInverse = (1 - jobSize.apiReliability) * 10;

    // Calculate weighted Job Size
    const jobSizeWeighted =
      normalizedProvTime * JOB_SIZE_WEIGHTS.provisioningTime +
      jobSize.configurationComplexity * JOB_SIZE_WEIGHTS.complexity +
      reliabilityInverse * JOB_SIZE_WEIGHTS.reliabilityInverse;

    // Prevent division by zero
    const safeJobSize = Math.max(jobSizeWeighted, 0.1);

    // Calculate raw WSJF score
    const rawScore = codWeighted / safeJobSize;

    // Calculate budget efficiency factor
    const budgetEfficiency = plan
      ? (budgetConstraint - plan.monthlyPrice) / budgetConstraint
      : 1;

    // Adjust score by budget efficiency
    const adjustedScore = rawScore * (1 + budgetEfficiency * 0.2);

    // Normalize to 0-100 scale
    const maxPossibleCOD =
      10 * COD_WEIGHTS.businessValue +
      10 * COD_WEIGHTS.timeCriticality +
      10 * COD_WEIGHTS.riskReduction;
    const minPossibleJobSize =
      (1 / 6) * JOB_SIZE_WEIGHTS.provisioningTime +
      1 * JOB_SIZE_WEIGHTS.complexity +
      0 * JOB_SIZE_WEIGHTS.reliabilityInverse;
    const maxPossibleScore = maxPossibleCOD / minPossibleJobSize;
    const normalizedScore = Math.min(
      (adjustedScore / maxPossibleScore) * 100,
      100
    );

    // Determine priority level
    const priority = this.getPriorityLevel(normalizedScore);

    // Generate recommendation
    const recommendation = this.generateWSJFRecommendation(
      normalizedScore,
      priority,
      plan
    );

    return {
      rawScore: adjustedScore,
      normalizedScore,
      priority,
      components: {
        costOfDelayWeighted: codWeighted,
        jobSizeWeighted,
        budgetEfficiency,
      },
      recommendation,
    };
  }

  /**
   * Provision using the optimal provider
   *
   * @param request - Provisioning request
   * @returns Provisioning result
   */
  async provision(request: ProvisioningRequest): Promise<ProvisioningResult> {
    const selection = await this.selectOptimalProvider(request);

    const provider = this.getProviderByName(selection.selectedProvider);
    if (!provider) {
      throw new Error(`Provider ${selection.selectedProvider} not found`);
    }

    this.logger(`Provisioning with ${selection.selectedProvider}`);

    try {
      return await provider.provision(request);
    } catch (error) {
      // Try fallback if available
      if (selection.alternatives.length > 0) {
        const fallbackPlan = selection.alternatives[0];
        const fallbackProvider = this.getProviderByName(fallbackPlan.provider);

        if (fallbackProvider) {
          this.logger(
            `Primary provider failed, falling back to ${fallbackPlan.provider}`,
            'warn'
          );
          return await fallbackProvider.provision(request);
        }
      }

      throw error;
    }
  }

  // =========================================================================
  // Private Helper Methods
  // =========================================================================

  /**
   * Get all matching plans from all providers
   */
  private async getMatchingPlans(
    specs: VPSSpecification,
    budget: number
  ): Promise<ProviderPricing[]> {
    const allPlans: ProviderPricing[] = [];

    for (const provider of this.providers) {
      try {
        const plans = await provider.getAvailablePlans(budget);

        // Filter by specs
        const matchingPlans = plans.filter(
          (plan) =>
            plan.specs.vcpus >= specs.vcpus &&
            plan.specs.memoryGb >= specs.memoryGb &&
            plan.specs.diskGb >= specs.diskGb
        );

        allPlans.push(...matchingPlans);
      } catch (error) {
        this.logger(
          `Failed to get plans from ${provider.name}: ${error}`,
          'warn'
        );
      }
    }

    return allPlans;
  }

  /**
   * Filter plans by provider availability
   */
  private async filterByAvailability(
    plans: ProviderPricing[]
  ): Promise<ProviderPricing[]> {
    const availablePlans: ProviderPricing[] = [];
    const checkedProviders = new Set<string>();

    for (const plan of plans) {
      // Only check each provider once
      if (checkedProviders.has(plan.provider)) {
        // Use cached availability
        const isAvailable = availablePlans.some(
          (p) => p.provider === plan.provider
        );
        if (isAvailable) {
          availablePlans.push(plan);
        }
        continue;
      }

      checkedProviders.add(plan.provider);

      const provider = this.getProviderByName(plan.provider);
      if (!provider) continue;

      try {
        const availability = await provider.checkAvailability(plan.region);
        if (availability.available) {
          availablePlans.push(plan);
        }
      } catch (error) {
        this.logger(
          `Availability check failed for ${plan.provider}, assuming available`,
          'warn'
        );
        availablePlans.push(plan);
      }
    }

    return availablePlans;
  }

  /**
   * Get provider instance by name
   */
  private getProviderByName(
    name: 'aws_lightsail' | 'hivelocity'
  ): CloudProvider | undefined {
    return this.providers.find((p) => p.name === name);
  }

  /**
   * Get priority level from normalized score
   */
  private getPriorityLevel(
    score: number
  ): 'critical' | 'high' | 'medium' | 'low' {
    if (score >= 75) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  }

  /**
   * Get recommendation based on WSJF result
   */
  private getRecommendation(
    result: WSJFProviderResult
  ): 'proceed' | 'review' | 'avoid' {
    if (result.normalizedScore >= 50) return 'proceed';
    if (result.normalizedScore >= 25) return 'review';
    return 'avoid';
  }

  /**
   * Generate selection reason text
   */
  private generateSelectionReason(
    plan: ProviderPricing,
    wsjfResult: WSJFProviderResult
  ): string {
    const parts: string[] = [];

    parts.push(
      `${plan.provider} selected with ${plan.planName} plan at $${plan.monthlyPrice}/month.`
    );
    parts.push(
      `WSJF Score: ${wsjfResult.rawScore.toFixed(2)} (${wsjfResult.priority} priority).`
    );
    parts.push(
      `Specs: ${plan.specs.vcpus} vCPU, ${plan.specs.memoryGb}GB RAM, ${plan.specs.diskGb}GB disk.`
    );
    parts.push(`Availability: ${plan.availability}.`);

    return parts.join(' ');
  }

  /**
   * Generate WSJF recommendation text
   */
  private generateWSJFRecommendation(
    score: number,
    priority: string,
    plan?: ProviderPricing
  ): string {
    const priorityActions: Record<string, string> = {
      critical:
        'IMMEDIATE ACTION: This deployment has maximum priority. Proceed without delay.',
      high: 'HIGH PRIORITY: Schedule for next available deployment window.',
      medium:
        'STANDARD PRIORITY: Include in regular sprint planning. Consider cost optimizations.',
      low: 'LOW PRIORITY: Defer to low-demand periods. Re-evaluate requirements.',
    };

    let recommendation = priorityActions[priority] || priorityActions.medium;

    if (plan) {
      recommendation += ` Using ${plan.provider} (${plan.planName}) at $${plan.monthlyPrice}/month.`;
    }

    return recommendation;
  }

  /**
   * Get provider-specific advantages
   */
  private getProviderAdvantages(
    provider: 'aws_lightsail' | 'hivelocity'
  ): string[] {
    const advantages: Record<string, string[]> = {
      aws_lightsail: [
        'Immediate provisioning',
        '99.9% SLA uptime',
        'Integrated DNS and static IPs',
        'Easy scaling path to EC2',
        'Automatic snapshots',
      ],
      hivelocity: [
        '10TB bandwidth included',
        'DDoS protection included',
        'Lower data transfer costs',
        'IPMI access for bare metal',
        'No vendor lock-in',
      ],
    };

    return advantages[provider] || [];
  }

  /**
   * Get provider-specific disadvantages
   */
  private getProviderDisadvantages(
    provider: 'aws_lightsail' | 'hivelocity'
  ): string[] {
    const disadvantages: Record<string, string[]> = {
      aws_lightsail: [
        'Higher bandwidth overage costs ($0.09/GB)',
        'Limited to Lightsail instance types',
        'No bare metal options',
      ],
      hivelocity: [
        '2-5 minute provisioning time',
        'Slightly lower API reliability',
        'Manual firewall configuration may be needed',
      ],
    };

    return disadvantages[provider] || [];
  }

  /**
   * Generate cost comparison summary
   */
  private generateCostSummary(
    comparisons: ProviderComparison[],
    cheapest: ProviderPricing | null,
    bestValue: ProviderPricing | null
  ): string {
    if (comparisons.length === 0) {
      return 'No plans available for comparison.';
    }

    const parts: string[] = [];

    parts.push(
      `Compared ${comparisons.length} plans across ${new Set(comparisons.map((c) => c.provider)).size} providers.`
    );

    if (cheapest) {
      parts.push(
        `Cheapest: ${cheapest.provider} (${cheapest.planName}) at $${cheapest.monthlyPrice}/month.`
      );
    }

    if (bestValue && bestValue !== cheapest) {
      parts.push(
        `Best Value: ${bestValue.provider} (${bestValue.planName}) at $${bestValue.monthlyPrice}/month based on WSJF scoring.`
      );
    } else if (bestValue) {
      parts.push('The cheapest option is also the best value.');
    }

    return parts.join(' ');
  }

  /**
   * Create logger
   */
  private createLogger(): (
    message: string,
    level?: 'info' | 'warn' | 'error' | 'debug'
  ) => void {
    return (
      message: string,
      level: 'info' | 'warn' | 'error' | 'debug' = 'info'
    ) => {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [CloudProviderSelector] [${level.toUpperCase()}] ${message}`;
      console.log(logMessage);
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a provisioning request with default syslog sink configuration
 *
 * @param hostname - VPS hostname
 * @param budget - Monthly budget (default: $10)
 * @param priority - Priority level for WSJF defaults
 * @returns Provisioning request
 */
export function createSyslogSinkRequest(
  hostname: string,
  budget: number = 10,
  priority: 'critical' | 'high' | 'medium' | 'low' = 'high'
): ProvisioningRequest {
  const priorityFactors: Record<string, WSJFCostOfDelayFactors> = {
    critical: { businessValue: 10, timeCriticality: 10, riskReduction: 10 },
    high: { businessValue: 8, timeCriticality: 7, riskReduction: 9 },
    medium: { businessValue: 6, timeCriticality: 5, riskReduction: 7 },
    low: { businessValue: 4, timeCriticality: 3, riskReduction: 5 },
  };

  return {
    specs: {
      vcpus: DEFAULT_CONFIG.specs.vcpus,
      memoryGb: DEFAULT_CONFIG.specs.memoryGb,
      diskGb: DEFAULT_CONFIG.specs.diskGb,
      os: DEFAULT_CONFIG.specs.os,
      osVersion: DEFAULT_CONFIG.specs.osVersion,
    },
    security: {
      sshAllowlist: DEFAULT_CONFIG.security.sshAllowlist,
      syslogAllowlist: DEFAULT_CONFIG.security.syslogAllowlist,
      tlsEnabled: DEFAULT_CONFIG.security.tlsEnabled,
    },
    wsjfInput: {
      costOfDelay: priorityFactors[priority],
      jobSize: {
        provisioningTime: 5,
        configurationComplexity: 3,
        apiReliability: 0.95,
      },
      budgetConstraint: budget,
      requiredSpecs: {
        vcpus: DEFAULT_CONFIG.specs.vcpus,
        memoryGb: DEFAULT_CONFIG.specs.memoryGb,
        diskGb: DEFAULT_CONFIG.specs.diskGb,
        os: DEFAULT_CONFIG.specs.os,
        osVersion: DEFAULT_CONFIG.specs.osVersion,
      },
    },
    hostname,
    tags: {
      purpose: 'syslog-sink',
      environment: 'production',
      managedBy: 'cloud-provider-selector',
    },
  };
}

/**
 * Create a CloudProviderSelector with both AWS and Hivelocity providers
 *
 * @param awsProvider - AWS Lightsail provider instance
 * @param hivelocityProvider - Hivelocity provider instance
 * @returns Configured provider selector
 */
export function createProviderSelector(
  awsProvider: CloudProvider,
  hivelocityProvider: CloudProvider
): CloudProviderSelector {
  return new CloudProviderSelector([awsProvider, hivelocityProvider]);
}
