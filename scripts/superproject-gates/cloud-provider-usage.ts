/**
 * Cloud Provider Selector Usage Examples
 *
 * Demonstrates how to use Cloud Provider Selector for VPS provisioning
 * with WSJF-based provider selection between AWS Lightsail and Hivelocity.
 *
 * @module examples/cloud-provider-usage
 */

import { CloudProviderSelector, validateSSHAllowlist, createDefaultRequirements } from '../src/devops/cloud-provider-selector';

// ============================================================================
// Example 1: Get Available Offerings
// ============================================================================

/**
 * Example 1: Get all available offerings matching requirements
 */
async function example1_GetAvailableOfferings() {
  console.log('\n=== Example 1: Get Available Offerings ===\n');

  const selector = new CloudProviderSelector({
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'your-aws-key',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'your-aws-secret',
      region: 'us-east-1',
    },
    hivelocity: {
      apiKey: process.env.HIVELOCITY_API_KEY || 'your-hivelocity-key',
      apiBase: 'https://core.hivelocity.net/api/v2',
    },
  });

  const requirements = {
    vcpus: 1,
    ram_gb: 1,
    disk_gb: 25,
    os: 'ubuntu-22.04',
    ssh_allowlist: ['173.94.53.113/32'],
    budget_monthly: 10,
  };

  console.log('Requirements:', JSON.stringify(requirements, null, 2));

  const offerings = await selector.getAvailableOfferings(requirements);

  console.log(`\nFound ${offerings.length} matching offerings:\n`);
  offerings.forEach((offering, index) => {
    console.log(`${index + 1}. ${offering.provider} - ${offering.plan_id}`);
    console.log(`   Cost: $${offering.monthly_cost.toFixed(2)}/month`);
    console.log(`   Specs: ${offering.vcpus} vCPU, ${offering.ram_gb}GB RAM, ${offering.disk_gb}GB disk`);
    console.log(`   Region: ${offering.region || 'N/A'}`);
    console.log('');
  });
}

// ============================================================================
// Example 2: Calculate WSJF Scores
// ============================================================================

/**
 * Example 2: Calculate WSJF scores for both providers
 */
async function example2_CalculateWSJFScores() {
  console.log('\n=== Example 2: Calculate WSJF Scores ===\n');

  const selector = new CloudProviderSelector({
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'your-aws-key',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'your-aws-secret',
    },
    hivelocity: {
      apiKey: process.env.HIVELOCITY_API_KEY || 'your-hivelocity-key',
    },
  });

  const requirements = {
    vcpus: 1,
    ram_gb: 1,
    disk_gb: 25,
    os: 'ubuntu-22.04',
    ssh_allowlist: ['173.94.53.113/32'],
    budget_monthly: 10,
  };

  const offerings = await selector.getAvailableOfferings(requirements);

  console.log('Calculating WSJF scores with urgency=8, complexity=20:\n');

  offerings.forEach((offering) => {
    const score = selector.calculateWSJFScore(offering, 8, 20);

    console.log(`${offering.provider} - ${offering.plan_id}:`);
    console.log(`  Cost of Delay: ${score.cost_of_delay}`);
    console.log(`  Job Size: ${score.job_size}`);
    console.log(`  WSJF Score: ${score.wsjf_score.toFixed(2)}`);
    console.log(`  Priority: ${score.priority.toUpperCase()}`);
    console.log(`  Recommendation: ${score.recommendation}`);
    console.log('');
  });
}

// ============================================================================
// Example 3: Select Best Provider
// ============================================================================

/**
 * Example 3: Select best provider based on WSJF scoring
 */
async function example3_SelectBestProvider() {
  console.log('\n=== Example 3: Select Best Provider ===\n');

  const selector = new CloudProviderSelector({
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'your-aws-key',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'your-aws-secret',
    },
    hivelocity: {
      apiKey: process.env.HIVELOCITY_API_KEY || 'your-hivelocity-key',
    },
  });

  const requirements = {
    vcpus: 1,
    ram_gb: 1,
    disk_gb: 25,
    os: 'ubuntu-22.04',
    ssh_allowlist: ['173.94.53.113/32'],
    budget_monthly: 10,
  };

  console.log('Requirements:', JSON.stringify(requirements, null, 2));
  console.log('\nSelecting best provider with urgency=8, complexity=20...\n');

  const best = await selector.selectBestProvider(requirements, 8, 20);

  console.log('=== BEST PROVIDER SELECTED ===\n');
  console.log(`Provider: ${best.provider}`);
  console.log(`Cost of Delay: ${best.cost_of_delay}`);
  console.log(`Job Size: ${best.job_size}`);
  console.log(`WSJF Score: ${best.wsjf_score.toFixed(2)}`);
  console.log(`Priority: ${best.priority.toUpperCase()}`);
  console.log(`\nRecommendation:\n${best.recommendation}`);
}

// ============================================================================
// Example 4: Provision VPS with Selected Provider
// ============================================================================

/**
 * Example 4: Provision a VPS with selected provider
 */
async function example4_ProvisionVPS() {
  console.log('\n=== Example 4: Provision VPS ===\n');

  const selector = new CloudProviderSelector({
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'your-aws-key',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'your-aws-secret',
    },
    hivelocity: {
      apiKey: process.env.HIVELOCITY_API_KEY || 'your-hivelocity-key',
    },
  });

  const requirements = {
    vcpus: 1,
    ram_gb: 1,
    disk_gb: 25,
    os: 'ubuntu-22.04',
    ssh_allowlist: ['173.94.53.113/32'],
    budget_monthly: 10,
  };

  // Select best provider
  const best = await selector.selectBestProvider(requirements, 8, 20);

  console.log(`Selected provider: ${best.provider}`);
  console.log(`Plan: ${best.recommendation.split('(')[1].split(')')[0]}`);
  console.log(`\nProvisioning VPS with hostname: syslog-sink-01\n`);

  // Get offering for provisioning
  const offerings = await selector.getAvailableOfferings(requirements);
  const selectedOffering = offerings.find(o => o.provider === best.provider);

  if (!selectedOffering) {
    console.error('Selected provider not found in offerings');
    return;
  }

  // Provision VPS
  const result = await selector.provisionVPS(
    selectedOffering,
    'syslog-sink-01',
    requirements.ssh_allowlist
  );

  console.log('=== PROVISIONING SUCCESSFUL ===\n');
  console.log(`Instance ID: ${result.instance_id}`);
  console.log(`Hostname: ${result.hostname}`);
  console.log(`Public IP: ${result.ip}`);
  console.log(`Provider: ${result.provider}`);
  console.log(`\nCredentials:`);
  console.log(`  Username: ${result.credentials.username}`);
  if (result.credentials.password) {
    console.log(`  Password: ${result.credentials.password} (CHANGE IMMEDIATELY!)`);
  }
  if (result.credentials.ssh_key) {
    console.log(`  SSH Key: ${result.credentials.ssh_key.substring(0, 20)}...`);
  }
}

// ============================================================================
// Example 5: Validate SSH Allowlist
// ============================================================================

/**
 * Example 5: Validate SSH allowlist CIDR notation
 */
function example5_ValidateSSHAllowlist() {
  console.log('\n=== Example 5: Validate SSH Allowlist ===\n');

  const validAllowlist = [
    '173.94.53.113/32',
    '192.168.1.0/24',
    '10.0.0.0/8',
  ];

  const invalidAllowlist = [
    'invalid-cidr',
    '999.999.999.999/32',
    '192.168.1.1/33',
  ];

  console.log('Validating correct allowlist:');
  const validResult = validateSSHAllowlist(validAllowlist);
  console.log(`  Valid: ${validResult.valid}`);
  if (!validResult.valid) {
    console.log(`  Errors: ${validResult.errors.join(', ')}`);
  }

  console.log('\nValidating incorrect allowlist:');
  const invalidResult = validateSSHAllowlist(invalidAllowlist);
  console.log(`  Valid: ${invalidResult.valid}`);
  if (!invalidResult.valid) {
    console.log(`  Errors:`);
    invalidResult.errors.forEach((error, index) => {
      console.log(`    ${index + 1}. ${error}`);
    });
  }
}

// ============================================================================
// Example 6: Use Default Requirements
// ============================================================================

/**
 * Example 6: Use default requirements for syslog sink
 */
async function example6_UseDefaultRequirements() {
  console.log('\n=== Example 6: Use Default Requirements ===\n');

  const selector = new CloudProviderSelector({
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'your-aws-key',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'your-aws-secret',
    },
    hivelocity: {
      apiKey: process.env.HIVELOCITY_API_KEY || 'your-hivelocity-key',
    },
  });

  // Create default requirements
  const requirements = createDefaultRequirements(10);

  console.log('Default Requirements:');
  console.log(JSON.stringify(requirements, null, 2));

  // Get offerings
  const offerings = await selector.getAvailableOfferings(requirements);

  console.log(`\nFound ${offerings.length} offerings matching default requirements:\n`);

  offerings.forEach((offering, index) => {
    console.log(`${index + 1}. ${offering.provider} - ${offering.plan_id}`);
    console.log(`   Cost: $${offering.monthly_cost.toFixed(2)}/month`);
    console.log(`   Specs: ${offering.vcpus} vCPU, ${offering.ram_gb}GB RAM, ${offering.disk_gb}GB disk`);
    console.log('');
  });
}

// ============================================================================
// Example 7: Compare Providers with Different Urgency Levels
// ============================================================================

/**
 * Example 7: Compare provider selection with different urgency levels
 */
async function example7_CompareUrgencyLevels() {
  console.log('\n=== Example 7: Compare Urgency Levels ===\n');

  const selector = new CloudProviderSelector({
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'your-aws-key',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'your-aws-secret',
    },
    hivelocity: {
      apiKey: process.env.HIVELOCITY_API_KEY || 'your-hivelocity-key',
    },
  });

  const requirements = {
    vcpus: 1,
    ram_gb: 1,
    disk_gb: 25,
    os: 'ubuntu-22.04',
    ssh_allowlist: ['173.94.53.113/32'],
    budget_monthly: 10,
  };

  const urgencyLevels = [2, 5, 8, 10]; // low, medium, high, critical
  const complexity = 20;

  console.log('Comparing provider selection with different urgency levels:\n');

  for (const urgency of urgencyLevels) {
    const best = await selector.selectBestProvider(requirements, urgency, complexity);

    const urgencyLabel = urgency >= 8 ? 'CRITICAL' : urgency >= 5 ? 'HIGH' : urgency >= 3 ? 'MEDIUM' : 'LOW';

    console.log(`Urgency ${urgency} (${urgencyLabel}):`);
    console.log(`  Provider: ${best.provider}`);
    console.log(`  WSJF Score: ${best.wsjf_score.toFixed(2)}`);
    console.log(`  Priority: ${best.priority.toUpperCase()}`);
    console.log('');
  }
}

// ============================================================================
// Example 8: Provision with Custom SSH Allowlist
// ============================================================================

/**
 * Example 8: Provision VPS with custom SSH allowlist
 */
async function example8_ProvisionWithCustomAllowlist() {
  console.log('\n=== Example 8: Provision with Custom SSH Allowlist ===\n');

  const selector = new CloudProviderSelector({
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'your-aws-key',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'your-aws-secret',
    },
    hivelocity: {
      apiKey: process.env.HIVELOCITY_API_KEY || 'your-hivelocity-key',
    },
  });

  const requirements = {
    vcpus: 1,
    ram_gb: 1,
    disk_gb: 25,
    os: 'ubuntu-22.04',
    ssh_allowlist: ['173.94.53.113/32', '192.168.1.0/24', '10.0.0.0/8'],
    budget_monthly: 10,
  };

  // Validate custom allowlist
  const validation = validateSSHAllowlist(requirements.ssh_allowlist);
  if (!validation.valid) {
    console.error('Invalid SSH allowlist:', validation.errors);
    return;
  }

  console.log('Custom SSH Allowlist:', requirements.ssh_allowlist);
  console.log('Validation: PASSED\n');

  // Select and provision
  const best = await selector.selectBestProvider(requirements, 8, 20);
  const offerings = await selector.getAvailableOfferings(requirements);
  const selectedOffering = offerings.find(o => o.provider === best.provider);

  if (!selectedOffering) {
    console.error('Selected provider not found in offerings');
    return;
  }

  const result = await selector.provisionVPS(
    selectedOffering,
    'syslog-sink-custom',
    requirements.ssh_allowlist
  );

  console.log('=== PROVISIONING SUCCESSFUL ===\n');
  console.log(`Instance ID: ${result.instance_id}`);
  console.log(`Public IP: ${result.ip}`);
  console.log(`SSH Access configured for: ${requirements.ssh_allowlist.join(', ')}`);
}

// ============================================================================
// Example 9: Complete Workflow
// ============================================================================

/**
 * Example 9: Complete workflow from requirements to provisioning
 */
async function example9_CompleteWorkflow() {
  console.log('\n=== Example 9: Complete Workflow ===\n');

  const selector = new CloudProviderSelector({
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'your-aws-key',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'your-aws-secret',
    },
    hivelocity: {
      apiKey: process.env.HIVELOCITY_API_KEY || 'your-hivelocity-key',
    },
  });

  // Step 1: Define requirements
  console.log('Step 1: Define Requirements');
  const requirements = createDefaultRequirements(10);
  console.log(JSON.stringify(requirements, null, 2));

  // Step 2: Validate SSH allowlist
  console.log('\nStep 2: Validate SSH Allowlist');
  const validation = validateSSHAllowlist(requirements.ssh_allowlist);
  console.log(`Validation: ${validation.valid ? 'PASSED' : 'FAILED'}`);

  // Step 3: Get available offerings
  console.log('\nStep 3: Get Available Offerings');
  const offerings = await selector.getAvailableOfferings(requirements);
  console.log(`Found ${offerings.length} offerings`);

  // Step 4: Select best provider
  console.log('\nStep 4: Select Best Provider');
  const best = await selector.selectBestProvider(requirements, 8, 20);
  console.log(`Selected: ${best.provider} (WSJF: ${best.wsjf_score.toFixed(2)})`);

  // Step 5: Provision VPS
  console.log('\nStep 5: Provision VPS');
  const selectedOffering = offerings.find(o => o.provider === best.provider);

  if (!selectedOffering) {
    console.error('Selected provider not found in offerings');
    return;
  }

  const result = await selector.provisionVPS(
    selectedOffering,
    'syslog-sink-prod-01',
    requirements.ssh_allowlist
  );

  console.log('\n=== PROVISIONING COMPLETE ===\n');
  console.log(`Instance ID: ${result.instance_id}`);
  console.log(`Hostname: ${result.hostname}`);
  console.log(`Public IP: ${result.ip}`);
  console.log(`Provider: ${result.provider}`);
  console.log(`\nNext Steps:`);
  console.log(`  1. SSH to ${result.credentials.username}@${result.ip}`);
  console.log(`  2. Update system packages`);
  console.log(`  3. Configure syslog sink`);
  console.log(`  4. Generate TLS certificates`);
  console.log(`  5. Configure firewall rules`);
}

// ============================================================================
// Main Execution
// ============================================================================

/**
 * Run all examples
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Cloud Provider Selector - Usage Examples                              ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  try {
    // Run examples (comment out examples you don't want to run)
    await example1_GetAvailableOfferings();
    await example2_CalculateWSJFScores();
    await example3_SelectBestProvider();
    await example4_ProvisionVPS();
    example5_ValidateSSHAllowlist();
    await example6_UseDefaultRequirements();
    await example7_CompareUrgencyLevels();
    await example8_ProvisionWithCustomAllowlist();
    await example9_CompleteWorkflow();

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  All examples completed successfully                                     ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\nError running examples:', error);
    process.exit(1);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

// Export examples for use in other modules
export {
  example1_GetAvailableOfferings,
  example2_CalculateWSJFScores,
  example3_SelectBestProvider,
  example4_ProvisionVPS,
  example5_ValidateSSHAllowlist,
  example6_UseDefaultRequirements,
  example7_CompareUrgencyLevels,
  example8_ProvisionWithCustomAllowlist,
  example9_CompleteWorkflow,
};
