/**
 * Cloud Provider Selector with WSJF-based Cost Optimization
 *
 * Implements automated VPS provisioning with intelligent provider selection
 * between AWS Lightsail and Hivelocity based on:
 * - Cost comparison ($5-$10/month budget constraint)
 * - WSJF scoring for deployment prioritization
 * - Security requirements (SSH allowlist, TLS certificates)
 *
 * @module devops/cloud-provider-selector
 */

import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * VPS requirements for provisioning
 */
export interface VPSRequirements {
  vcpus: number;
  ram_gb: number;
  disk_gb: number;
  os: string;
  ssh_allowlist: string[];
  budget_monthly: number;
}

/**
 * Provider offering with pricing and specifications
 */
export interface ProviderOffering {
  provider: 'aws_lightsail' | 'hivelocity';
  plan_id: string;
  vcpus: number;
  ram_gb: number;
  disk_gb: number;
  monthly_cost: number;
  region?: string;
}

/**
 * WSJF provider score with priority classification
 */
export interface WSJFProviderScore {
  provider: 'aws_lightsail' | 'hivelocity';
  cost_of_delay: number;
  job_size: number;
  wsjf_score: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
}

/**
 * Provisioning result with connection details
 */
export interface ProvisioningResult {
  ip: string;
  credentials: {
    username: string;
    password?: string;
    ssh_key?: string;
  };
  instance_id: string;
  hostname: string;
  provider: 'aws_lightsail' | 'hivelocity';
}

/**
 * Cloud provider error
 */
export interface CloudProviderError {
  code: string;
  message: string;
  provider: 'aws_lightsail' | 'hivelocity';
  timestamp: Date;
  details?: Record<string, any>;
}

// ============================================================================
// Cloud Provider Selector Class
// ============================================================================

/**
 * Cloud Provider Selector with WSJF-based selection
 * 
 * Provides intelligent provider selection between AWS Lightsail and Hivelocity
 * based on cost, specifications, and WSJF prioritization.
 */
export class CloudProviderSelector {
  private awsClient: AxiosInstance;
  private hivelocityClient: AxiosInstance;
  private logger: (message: string, level?: 'info' | 'warn' | 'error') => void;

  constructor(config: {
    aws?: { accessKeyId: string; secretAccessKey: string; region?: string };
    hivelocity?: { apiKey: string; apiBase?: string };
  }) {
    this.logger = this.createLogger();

    // Initialize AWS Lightsail client (placeholder for AWS SDK v3)
    if (config.aws) {
      const region = config.aws.region || 'us-east-1';
      this.awsClient = axios.create({
        baseURL: `https://lightsail.${region}.amazonaws.com`,
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'Lightsail_20161128.CreateInstances',
        },
      });
      this.logger('AWS Lightsail client initialized');
    }

    // Initialize Hivelocity client
    if (config.hivelocity) {
      const apiBase = config.hivelocity.apiBase || 'https://core.hivelocity.net/api/v2';
      this.hivelocityClient = axios.create({
        baseURL: apiBase,
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': config.hivelocity.apiKey,
        },
      });
      this.logger('Hivelocity client initialized');
    }
  }

  /**
   * Get available offerings from both AWS Lightsail and Hivelocity
   * 
   * @param requirements - VPS requirements including specs and budget
   * @returns Filtered list of provider offerings matching requirements
   */
  async getAvailableOfferings(requirements: VPSRequirements): Promise<ProviderOffering[]> {
    this.logger(`Fetching available offerings for requirements: ${JSON.stringify(requirements)}`);

    const allOfferings: ProviderOffering[] = [];

    // Fetch AWS Lightsail offerings
    if (this.awsClient) {
      const awsOfferings = await this.fetchAWSLightsailOfferings();
      allOfferings.push(...awsOfferings);
    }

    // Fetch Hivelocity offerings
    if (this.hivelocityClient) {
      const hvOfferings = await this.fetchHivelocityOfferings();
      allOfferings.push(...hvOfferings);
    }

    // Filter by requirements
    const filtered = allOfferings.filter(offering =>
      offering.vcpus >= requirements.vcpus &&
      offering.ram_gb >= requirements.ram_gb &&
      offering.disk_gb >= requirements.disk_gb &&
      offering.monthly_cost <= requirements.budget_monthly
    );

    this.logger(`Found ${filtered.length} matching offerings out of ${allOfferings.length} total`);

    return filtered.sort((a, b) => a.monthly_cost - b.monthly_cost);
  }

  /**
   * Calculate WSJF score for a provider offering
   * 
   * WSJF Formula:
   * - Cost of Delay = urgency + availability_factor + risk_reduction
   * - Job Size = complexity + setup_time
   * - WSJF Score = (Cost of Delay / Job Size) × 100
   * 
   * @param offering - Provider offering to score
   * @param urgency - Time sensitivity (1-10)
   * @param complexity - Implementation complexity (1-100)
   * @returns WSJF score with priority classification
   */
  calculateWSJFScore(
    offering: ProviderOffering,
    urgency: number,
    complexity: number
  ): WSJFProviderScore {
    // Validate inputs
    if (urgency < 1 || urgency > 10) {
      throw new Error('Urgency must be between 1 and 10');
    }
    if (complexity < 1 || complexity > 100) {
      throw new Error('Complexity must be between 1 and 100');
    }

    // Calculate Cost of Delay components
    const availability_factor = this.getAvailabilityFactor(offering.provider);
    const risk_reduction = this.getRiskReductionFactor(offering.provider);
    const cost_of_delay = urgency + availability_factor + risk_reduction;

    // Calculate Job Size
    const setup_time = this.getSetupTimeFactor(offering.provider);
    const job_size = complexity + setup_time;

    // Calculate WSJF Score
    const wsjf_score = (cost_of_delay / job_size) * 100;

    // Determine priority level
    const priority = this.getPriorityLevel(wsjf_score);

    // Generate recommendation
    const recommendation = this.generateRecommendation(offering, wsjf_score, priority);

    this.logger(`WSJF Score for ${offering.provider} (${offering.plan_id}): ${wsjf_score.toFixed(2)} - Priority: ${priority}`);

    return {
      provider: offering.provider,
      cost_of_delay,
      job_size,
      wsjf_score,
      priority,
      recommendation,
    };
  }

  /**
   * Select the best provider based on WSJF scoring
   * 
   * @param requirements - VPS requirements
   * @param urgency - Time sensitivity (1-10)
   * @param complexity - Implementation complexity (1-100)
   * @returns Best provider selection with WSJF score
   */
  async selectBestProvider(
    requirements: VPSRequirements,
    urgency: number,
    complexity: number
  ): Promise<WSJFProviderScore> {
    this.logger('Starting provider selection with WSJF scoring');

    // Get available offerings
    const offerings = await this.getAvailableOfferings(requirements);

    if (offerings.length === 0) {
      throw new Error(
        `No providers match requirements: ${JSON.stringify(requirements)}`
      );
    }

    // Calculate WSJF scores for all offerings
    const scored = offerings.map(offering =>
      this.calculateWSJFScore(offering, urgency, complexity)
    );

    // Sort by WSJF score (highest first)
    scored.sort((a, b) => b.wsjf_score - a.wsjf_score);

    const best = scored[0];
    this.logger(`Selected best provider: ${best.provider} with WSJF score: ${best.wsjf_score.toFixed(2)}`);

    return best;
  }

  /**
   * Provision a VPS with the selected provider
   * 
   * @param offering - Selected provider offering
   * @param hostname - Hostname for the VPS
   * @param sshAllowlist - SSH access allowlist (CIDR notation)
   * @returns Provisioning result with IP and credentials
   */
  async provisionVPS(
    offering: ProviderOffering,
    hostname: string,
    sshAllowlist: string[] = ['173.94.53.113/32']
  ): Promise<ProvisioningResult> {
    this.logger(`Provisioning VPS: ${offering.provider} - ${offering.plan_id} - ${hostname}`);

    try {
      let result: ProvisioningResult;

      if (offering.provider === 'aws_lightsail') {
        result = await this.provisionAWSLightsail(offering, hostname, sshAllowlist);
      } else {
        result = await this.provisionHivelocity(offering, hostname, sshAllowlist);
      }

      this.logger(`Successfully provisioned VPS: ${result.instance_id} at ${result.ip}`);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger(`Provisioning failed: ${errorMsg}`, 'error');
      throw error;
    }
  }

  /**
   * Fetch AWS Lightsail offerings
   * 
   * @returns List of AWS Lightsail offerings
   */
  private async fetchAWSLightsailOfferings(): Promise<ProviderOffering[]> {
    // Mock data for development - in production, use AWS SDK v3
    return [
      {
        provider: 'aws_lightsail',
        plan_id: 'nano_2_0',
        vcpus: 1,
        ram_gb: 0.5,
        disk_gb: 20,
        monthly_cost: 5.00,
        region: 'us-east-1',
      },
      {
        provider: 'aws_lightsail',
        plan_id: 'micro_2_0',
        vcpus: 1,
        ram_gb: 1,
        disk_gb: 40,
        monthly_cost: 10.00,
        region: 'us-east-1',
      },
      {
        provider: 'aws_lightsail',
        plan_id: 'small_2_0',
        vcpus: 1,
        ram_gb: 2,
        disk_gb: 60,
        monthly_cost: 20.00,
        region: 'us-east-1',
      },
    ];
  }

  /**
   * Fetch Hivelocity offerings
   * 
   * @returns List of Hivelocity offerings
   */
  private async fetchHivelocityOfferings(): Promise<ProviderOffering[]> {
    // Mock data for development - in production, use Hivelocity API
    return [
      {
        provider: 'hivelocity',
        plan_id: 'vps_1gb',
        vcpus: 1,
        ram_gb: 1,
        disk_gb: 25,
        monthly_cost: 10.00,
        region: 'tampa',
      },
      {
        provider: 'hivelocity',
        plan_id: 'vps_2gb',
        vcpus: 1,
        ram_gb: 2,
        disk_gb: 40,
        monthly_cost: 15.00,
        region: 'tampa',
      },
      {
        provider: 'hivelocity',
        plan_id: 'vps_4gb',
        vcpus: 2,
        ram_gb: 4,
        disk_gb: 80,
        monthly_cost: 25.00,
        region: 'tampa',
      },
    ];
  }

  /**
   * Provision AWS Lightsail instance
   * 
   * @param offering - AWS Lightsail offering
   * @param hostname - Instance hostname
   * @param sshAllowlist - SSH access allowlist
   * @returns Provisioning result
   */
  private async provisionAWSLightsail(
    offering: ProviderOffering,
    hostname: string,
    sshAllowlist: string[]
  ): Promise<ProvisioningResult> {
    // API integration placeholder - in production, use AWS SDK v3
    const instanceId = `aws-ls-${uuidv4()}`;
    const ip = '203.0.113.1'; // Placeholder IP

    // Configure firewall rules
    this.logger(`Configuring AWS Lightsail firewall for ${sshAllowlist.length} CIDRs`);

    return {
      ip,
      credentials: {
        username: 'ubuntu',
        password: undefined, // SSH key authentication
        ssh_key: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQD...', // Placeholder
      },
      instance_id: instanceId,
      hostname,
      provider: 'aws_lightsail',
    };
  }

  /**
   * Provision Hivelocity VPS
   * 
   * @param offering - Hivelocity offering
   * @param hostname - Instance hostname
   * @param sshAllowlist - SSH access allowlist
   * @returns Provisioning result
   */
  private async provisionHivelocity(
    offering: ProviderOffering,
    hostname: string,
    sshAllowlist: string[]
  ): Promise<ProvisioningResult> {
    // API integration placeholder - in production, use Hivelocity API
    const instanceId = `hv-${uuidv4()}`;
    const ip = '198.51.100.1'; // Placeholder IP

    // Configure firewall rules
    this.logger(`Configuring Hivelocity firewall for ${sshAllowlist.length} CIDRs`);

    return {
      ip,
      credentials: {
        username: 'root',
        password: 'TempPassword123!', // Placeholder - should use SSH keys
      },
      instance_id: instanceId,
      hostname,
      provider: 'hivelocity',
    };
  }

  /**
   * Get availability factor for provider
   * 
   * @param provider - Cloud provider
   * @returns Availability factor (1-10)
   */
  private getAvailabilityFactor(provider: 'aws_lightsail' | 'hivelocity'): number {
    // AWS Lightsail has immediate availability
    if (provider === 'aws_lightsail') {
      return 10;
    }
    // Hivelocity has minutes-level availability
    return 8;
  }

  /**
   * Get risk reduction factor for provider
   * 
   * @param provider - Cloud provider
   * @returns Risk reduction factor (1-10)
   */
  private getRiskReductionFactor(provider: 'aws_lightsail' | 'hivelocity'): number {
    // AWS has higher reliability and redundancy
    if (provider === 'aws_lightsail') {
      return 9;
    }
    // Hivelocity provides good value with slightly lower SLA
    return 7;
  }

  /**
   * Get setup time factor for provider
   * 
   * @param provider - Cloud provider
   * @returns Setup time factor (1-100)
   */
  private getSetupTimeFactor(provider: 'aws_lightsail' | 'hivelocity'): number {
    // AWS Lightsail is faster to set up
    if (provider === 'aws_lightsail') {
      return 10;
    }
    // Hivelocity takes slightly longer
    return 20;
  }

  /**
   * Get priority level based on WSJF score
   * 
   * @param score - WSJF score
   * @returns Priority level
   */
  private getPriorityLevel(score: number): 'critical' | 'high' | 'medium' | 'low' {
    if (score >= 75) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  }

  /**
   * Generate recommendation based on WSJF analysis
   * 
   * @param offering - Provider offering
   * @param score - WSJF score
   * @param priority - Priority level
   * @returns Recommendation text
   */
  private generateRecommendation(
    offering: ProviderOffering,
    score: number,
    priority: string
  ): string {
    const costText = `$${offering.monthly_cost.toFixed(2)}/month`;
    const specsText = `${offering.vcpus} vCPU, ${offering.ram_gb}GB RAM, ${offering.disk_gb}GB disk`;
    
    const priorityActions: Record<string, string> = {
      critical: 'Proceed immediately with this provider - maximum priority',
      high: 'Recommended for next deployment slot',
      medium: 'Acceptable option - consider with other factors',
      low: 'Consider alternatives - lower priority',
    };

    return `${offering.provider} (${offering.plan_id}) at ${costText} with ${specsText}. ` +
      `WSJF Score: ${score.toFixed(2)} (${priority} priority). ` +
      priorityActions[priority];
  }

  /**
   * Create logger for provider operations
   * 
   * @returns Logger function
   */
  private createLogger(): (message: string, level?: 'info' | 'warn' | 'error') => void {
    return (message: string, level: 'info' | 'warn' | 'error' = 'info') => {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [CLOUD-PROVIDER-SELECTOR] [${level.toUpperCase()}] ${message}`;
      console.log(logMessage);
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validate SSH allowlist CIDR notation
 * 
 * @param allowlist - List of CIDR strings
 * @returns Validation result
 */
export function validateSSHAllowlist(allowlist: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;

  for (const cidr of allowlist) {
    if (!cidrRegex.test(cidr)) {
      errors.push(`Invalid CIDR notation: ${cidr}`);
    } else {
      const [ip, mask] = cidr.split('/');
      const ipParts = ip.split('.').map(Number);
      
      if (ipParts.some(part => part < 0 || part > 255)) {
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

/**
 * Create default VPS requirements for syslog sink
 * 
 * @param budget - Monthly budget (default: $10)
 * @returns VPS requirements
 */
export function createDefaultRequirements(budget: number = 10): VPSRequirements {
  return {
    vcpus: 1,
    ram_gb: 1,
    disk_gb: 25,
    os: 'ubuntu-22.04',
    ssh_allowlist: ['173.94.53.113/32'],
    budget_monthly: budget,
  };
}
