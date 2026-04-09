/**
 * Cloud Provider Mock API Responses
 *
 * Provides mock data for AWS Lightsail and Hivelocity APIs
 * for testing and development purposes.
 *
 * @module devops/cloud-provider-mocks
 */

import { ProviderOffering, WSJFProviderScore } from './cloud-provider-selector';

// ============================================================================
// AWS Lightsail Mock Responses
// ============================================================================

/**
 * Mock AWS Lightsail pricing plans
 */
export const MOCK_AWS_LIGHTSAIL_OFFERINGS: ProviderOffering[] = [
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
  {
    provider: 'aws_lightsail',
    plan_id: 'medium_2_0',
    vcpus: 2,
    ram_gb: 4,
    disk_gb: 80,
    monthly_cost: 40.00,
    region: 'us-east-1',
  },
  {
    provider: 'aws_lightsail',
    plan_id: 'large_2_0',
    vcpus: 2,
    ram_gb: 8,
    disk_gb: 160,
    monthly_cost: 80.00,
    region: 'us-east-1',
  },
];

/**
 * Mock AWS Lightsail instance creation response
 */
export const MOCK_AWS_LIGHTSAIL_INSTANCE_RESPONSE = {
  operations: [
    {
      id: '12345678-1234-1234-1234-123456789012',
      resourceName: 'test-syslog-sink',
      resourceType: 'Instance',
      createdAt: new Date().toISOString(),
      status: 'Started',
      statusChangedAt: new Date().toISOString(),
      location: {
        availabilityZone: 'us-east-1a',
        regionName: 'us-east-1',
      },
      isTerminal: false,
      operationType: 'CreateInstances',
      statusMessage: 'Instance creation started',
    },
  ],
};

/**
 * Mock AWS Lightsail instance status response
 */
export const MOCK_AWS_LIGHTSAIL_STATUS_RESPONSE = {
  instance: {
    name: 'test-syslog-sink',
    arn: 'arn:aws:lightsail:us-east-1:123456789012:Instance/test-syslog-sink',
    supportCode: '123456789012/i-01234567890abcdef0',
    createdAt: new Date().toISOString(),
    location: {
      availabilityZone: 'us-east-1a',
      regionName: 'us-east-1',
    },
    isStaticIp: false,
    privateIpAddress: '172.31.32.123',
    publicIpAddress: '203.0.113.1',
    state: {
      code: 16,
      name: 'running',
    },
    hardware: {
      cpuCount: 1,
      ramSizeInGb: 1,
    },
    networking: {
      monthlyTransfer: {
        gbPerMonth: 2048,
      },
      ports: [
        { from: 22, to: 22, protocol: 'tcp', accessFrom: '173.94.53.113/32', accessType: 'public' },
        { from: 6514, to: 6514, protocol: 'tcp', accessFrom: '23.92.79.2/32', accessType: 'public' },
      ],
    },
    bundleId: 'micro_2_0',
    blueprintId: 'ubuntu_22_04',
  },
};

// ============================================================================
// Hivelocity Mock Responses
// ============================================================================

/**
 * Mock Hivelocity pricing plans
 */
export const MOCK_HIVELOCITY_OFFERINGS: ProviderOffering[] = [
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
  {
    provider: 'hivelocity',
    plan_id: 'vps_8gb',
    vcpus: 4,
    ram_gb: 8,
    disk_gb: 160,
    monthly_cost: 45.00,
    region: 'tampa',
  },
  {
    provider: 'hivelocity',
    plan_id: 'vps_16gb',
    vcpus: 8,
    ram_gb: 16,
    disk_gb: 320,
    monthly_cost: 85.00,
    region: 'tampa',
  },
];

/**
 * Mock Hivelocity device provisioning response
 */
export const MOCK_HIVELOCITY_PROVISION_RESPONSE = {
  id: 24460,
  hostname: 'test-syslog-sink',
  service: {
    id: 12345,
    name: 'VPS 1GB',
    price: 10.00,
    billing_cycle: 'monthly',
  },
  config: {
    os: 'ubuntu-22.04',
    hostname: 'test-syslog-sink',
    plan_id: 'vps_1gb',
  },
  status: 'provisioning',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ips: {
    primary: {
      address: '198.51.100.1',
      gateway: '198.51.100.1',
      netmask: '255.255.255.0',
    },
  },
  credentials: {
    username: 'root',
    password: 'TempPassword123!',
  },
};

/**
 * Mock Hivelocity device status response
 */
export const MOCK_HIVELOCITY_STATUS_RESPONSE = {
  id: 24460,
  hostname: 'test-syslog-sink',
  status: 'active',
  service: {
    id: 12345,
    name: 'VPS 1GB',
    price: 10.00,
  },
  ips: {
    primary: {
      address: '198.51.100.1',
    },
  },
  created_at: new Date().toISOString(),
  uptime: 3600,
};

// ============================================================================
// WSJF Scoring Mock Scenarios
// ============================================================================

/**
 * Mock WSJF scoring scenarios for testing
 */
export const MOCK_WSJF_SCENARIOS: Array<{
  name: string;
  urgency: number;
  complexity: number;
  expected_priority: 'critical' | 'high' | 'medium' | 'low';
}> = [
  {
    name: 'Critical urgency, low complexity',
    urgency: 10,
    complexity: 10,
    expected_priority: 'critical',
  },
  {
    name: 'High urgency, medium complexity',
    urgency: 8,
    complexity: 30,
    expected_priority: 'high',
  },
  {
    name: 'Medium urgency, medium complexity',
    urgency: 5,
    complexity: 40,
    expected_priority: 'medium',
  },
  {
    name: 'Low urgency, high complexity',
    urgency: 2,
    complexity: 80,
    expected_priority: 'low',
  },
  {
    name: 'Balanced urgency and complexity',
    urgency: 6,
    complexity: 25,
    expected_priority: 'high',
  },
];

/**
 * Mock WSJF scores for AWS Lightsail offerings
 */
export const MOCK_AWS_WSJF_SCORES: WSJFProviderScore[] = [
  {
    provider: 'aws_lightsail',
    cost_of_delay: 27,
    job_size: 20,
    wsjf_score: 135,
    priority: 'critical',
    recommendation: 'aws_lightsail (nano_2_0) at $5.00/month with 1 vCPU, 0.5GB RAM, 20GB disk. WSJF Score: 135.00 (critical priority). Proceed immediately with this provider - maximum priority',
  },
  {
    provider: 'aws_lightsail',
    cost_of_delay: 27,
    job_size: 20,
    wsjf_score: 135,
    priority: 'critical',
    recommendation: 'aws_lightsail (micro_2_0) at $10.00/month with 1 vCPU, 1GB RAM, 40GB disk. WSJF Score: 135.00 (critical priority). Proceed immediately with this provider - maximum priority',
  },
  {
    provider: 'aws_lightsail',
    cost_of_delay: 27,
    job_size: 20,
    wsjf_score: 135,
    priority: 'critical',
    recommendation: 'aws_lightsail (small_2_0) at $20.00/month with 1 vCPU, 2GB RAM, 60GB disk. WSJF Score: 135.00 (critical priority). Proceed immediately with this provider - maximum priority',
  },
];

/**
 * Mock WSJF scores for Hivelocity offerings
 */
export const MOCK_HIVELOCITY_WSJF_SCORES: WSJFProviderScore[] = [
  {
    provider: 'hivelocity',
    cost_of_delay: 25,
    job_size: 30,
    wsjf_score: 83.33,
    priority: 'critical',
    recommendation: 'hivelocity (vps_1gb) at $10.00/month with 1 vCPU, 1GB RAM, 25GB disk. WSJF Score: 83.33 (critical priority). Proceed immediately with this provider - maximum priority',
  },
  {
    provider: 'hivelocity',
    cost_of_delay: 25,
    job_size: 30,
    wsjf_score: 83.33,
    priority: 'critical',
    recommendation: 'hivelocity (vps_2gb) at $15.00/month with 1 vCPU, 2GB RAM, 40GB disk. WSJF Score: 83.33 (critical priority). Proceed immediately with this provider - maximum priority',
  },
  {
    provider: 'hivelocity',
    cost_of_delay: 25,
    job_size: 30,
    wsjf_score: 83.33,
    priority: 'critical',
    recommendation: 'hivelocity (vps_4gb) at $25.00/month with 2 vCPU, 4GB RAM, 80GB disk. WSJF Score: 83.33 (critical priority). Proceed immediately with this provider - maximum priority',
  },
];

// ============================================================================
// Edge Case Mock Data
// ============================================================================

/**
 * Mock data for edge case testing
 */
export const MOCK_EDGE_CASES = {
  /**
   * No offerings match budget
   */
  noBudgetMatch: {
    requirements: {
      vcpus: 1,
      ram_gb: 1,
      disk_gb: 25,
      os: 'ubuntu-22.04',
      ssh_allowlist: ['173.94.53.113/32'],
      budget_monthly: 3, // Below minimum pricing
    },
    expectedError: 'No providers match requirements',
  },

  /**
   * No offerings match specs
   */
  noSpecMatch: {
    requirements: {
      vcpus: 16, // Higher than available
      ram_gb: 64,
      disk_gb: 1000,
      os: 'ubuntu-22.04',
      ssh_allowlist: ['173.94.53.113/32'],
      budget_monthly: 100,
    },
    expectedError: 'No providers match requirements',
  },

  /**
   * Invalid SSH allowlist
   */
  invalidSSHAllowlist: {
    allowlist: [
      'invalid-cidr',
      '999.999.999.999/32',
      '192.168.1.1/33',
    ],
    expectedErrors: [
      'Invalid CIDR notation: invalid-cidr',
      'Invalid IP address in CIDR: 999.999.999.999/32',
      'Invalid subnet mask in CIDR: 192.168.1.1/33',
    ],
  },

  /**
   * Boundary values
   */
  boundaryValues: {
    minimumBudget: 5,
    maximumBudget: 10,
    minimumVCPUs: 1,
    minimumRAM: 0.5,
    minimumDisk: 20,
  },
};

// ============================================================================
// Mock API Error Responses
// ============================================================================

/**
 * Mock AWS Lightsail API errors
 */
export const MOCK_AWS_ERROR_RESPONSES = {
  insufficientCapacity: {
    code: 'InsufficientCapacityException',
    message: 'There is not enough capacity to fulfill your request.',
    provider: 'aws_lightsail',
    timestamp: new Date(),
  },
  invalidInput: {
    code: 'InvalidInputException',
    message: 'One or more input parameters are invalid.',
    provider: 'aws_lightsail',
    timestamp: new Date(),
  },
  serviceUnavailable: {
    code: 'ServiceUnavailable',
    message: 'The service is temporarily unavailable.',
    provider: 'aws_lightsail',
    timestamp: new Date(),
  },
};

/**
 * Mock Hivelocity API errors
 */
export const MOCK_HIVELOCITY_ERROR_RESPONSES = {
  unauthorized: {
    code: 'Unauthorized',
    message: 'Invalid API key provided.',
    provider: 'hivelocity',
    timestamp: new Date(),
  },
  planNotFound: {
    code: 'PlanNotFound',
    message: 'The specified plan does not exist.',
    provider: 'hivelocity',
    timestamp: new Date(),
  },
  provisioningFailed: {
    code: 'ProvisioningFailed',
    message: 'Failed to provision device due to resource constraints.',
    provider: 'hivelocity',
    timestamp: new Date(),
  },
};

// ============================================================================
// Mock Utility Functions
// ============================================================================

/**
 * Get all mock offerings combined
 */
export function getAllMockOfferings(): ProviderOffering[] {
  return [...MOCK_AWS_LIGHTSAIL_OFFERINGS, ...MOCK_HIVELOCITY_OFFERINGS];
}

/**
 * Get mock offerings filtered by budget
 */
export function getMockOfferingsByBudget(maxCost: number): ProviderOffering[] {
  return getAllMockOfferings().filter(o => o.monthly_cost <= maxCost);
}

/**
 * Get mock offerings filtered by specs
 */
export function getMockOfferingsBySpecs(
  minVCPUs: number,
  minRAM: number,
  minDisk: number
): ProviderOffering[] {
  return getAllMockOfferings().filter(o =>
    o.vcpus >= minVCPUs &&
    o.ram_gb >= minRAM &&
    o.disk_gb >= minDisk
  );
}

/**
 * Get mock WSJF score for a specific provider and plan
 */
export function getMockWSJFScore(
  provider: 'aws_lightsail' | 'hivelocity',
  planId: string,
  urgency: number,
  complexity: number
): WSJFProviderScore | undefined {
  const offerings = provider === 'aws_lightsail'
    ? MOCK_AWS_LIGHTSAIL_OFFERINGS
    : MOCK_HIVELOCITY_OFFERINGS;

  const offering = offerings.find(o => o.plan_id === planId);
  if (!offering) return undefined;

  const availabilityFactor = provider === 'aws_lightsail' ? 10 : 8;
  const riskReduction = provider === 'aws_lightsail' ? 9 : 7;
  const setupTime = provider === 'aws_lightsail' ? 10 : 20;

  const costOfDelay = urgency + availabilityFactor + riskReduction;
  const jobSize = complexity + setupTime;
  const wsjfScore = (costOfDelay / jobSize) * 100;

  let priority: 'critical' | 'high' | 'medium' | 'low';
  if (wsjfScore >= 75) priority = 'critical';
  else if (wsjfScore >= 50) priority = 'high';
  else if (wsjfScore >= 25) priority = 'medium';
  else priority = 'low';

  return {
    provider,
    cost_of_delay: costOfDelay,
    job_size: jobSize,
    wsjf_score: wsjfScore,
    priority,
    recommendation: `${provider} (${planId}) at $${offering.monthly_cost.toFixed(2)}/month with ${offering.vcpus} vCPU, ${offering.ram_gb}GB RAM, ${offering.disk_gb}GB disk. WSJF Score: ${wsjfScore.toFixed(2)} (${priority} priority).`,
  };
}
