/**
 * Platform Deployment Examples
 * 
 * Demonstrates usage of the new platform-specific partition strategies:
 * - Django Production
 * - Rails Production
 * - Next.js Production
 * - Laravel Production
 * - Docker Swarm Manager/Worker
 */

import {
  HiveVelocityDeviceManager,
  PARTITION_STRATEGIES,
} from '../hivelocity-device-manager';

// ============================================================================
// Example 1: Django Production Deployment
// ============================================================================

export async function deployDjangoProduction(): Promise<void> {
  const apiKey = process.env.HIVELOCITY_API_KEY || 'demo-key';
  const deviceId = parseInt(process.env.HIVELOCITY_DEVICE_ID || '12345', 10);
  const manager = new HiveVelocityDeviceManager(apiKey, deviceId);

  // Get the Django production strategy
  const strategy = PARTITION_STRATEGIES.django_production;
  console.log('Django Production Strategy:', strategy.description);
  console.log('Partitions:', strategy.partitions.length);
  console.log('Post-install hooks:', strategy.postInstallHooks?.length || 0);

  // Validate the strategy
  const validation = HiveVelocityDeviceManager.validatePartitionScheme(strategy);
  if (!validation.valid) {
    console.error('Validation errors:', validation.errors);
    return;
  }

  // Generate partition summary
  const summary = HiveVelocityDeviceManager.generatePartitionSummary(strategy);
  console.log('Partition Summary:', summary);
}

// ============================================================================
// Example 2: Rails Production Deployment
// ============================================================================

export async function deployRailsProduction(): Promise<void> {
  const strategy = PARTITION_STRATEGIES.rails_production;
  console.log('Rails Production Strategy:', strategy.description);
  
  // Rails has separate asset pipeline partition
  const assetPartition = strategy.partitions.find(
    p => p.mount_point === '/opt/rails/public/assets'
  );
  console.log('Asset partition (unencrypted for CDN):', assetPartition);
}

// ============================================================================
// Example 3: Next.js Production Deployment
// ============================================================================

export async function deployNextjsProduction(): Promise<void> {
  const strategy = PARTITION_STRATEGIES.nextjs_production;
  console.log('Next.js Production Strategy:', strategy.description);
  
  // Next.js has CDN-ready static asset partition
  const cdnPartition = strategy.partitions.find(
    p => p.mount_point === '/srv/cdn-origin'
  );
  console.log('CDN origin partition:', cdnPartition);
}

// ============================================================================
// Example 4: Laravel Production Deployment
// ============================================================================

export async function deployLaravelProduction(): Promise<void> {
  const strategy = PARTITION_STRATEGIES.laravel_production;
  console.log('Laravel Production Strategy:', strategy.description);
  
  // Laravel uses MySQL instead of PostgreSQL
  const mysqlPartition = strategy.partitions.find(
    p => p.mount_point === '/var/lib/mysql'
  );
  console.log('MySQL partition (XFS for InnoDB):', mysqlPartition);
}

// ============================================================================
// Example 5: Docker Swarm Cluster Deployment
// ============================================================================

export async function deployDockerSwarmCluster(): Promise<void> {
  const managerStrategy = PARTITION_STRATEGIES.docker_swarm_manager;
  const workerStrategy = PARTITION_STRATEGIES.docker_swarm_worker;

  console.log('=== Docker Swarm Manager ===');
  console.log('Description:', managerStrategy.description);
  console.log('Swarm state partition:', managerStrategy.partitions.find(
    p => p.mount_point === '/var/lib/docker/swarm'
  ));
  console.log('Kernel parameters:', managerStrategy.kernelParameters);
  console.log('Sysctl settings:', managerStrategy.sysctlSettings);

  console.log('\n=== Docker Swarm Worker ===');
  console.log('Description:', workerStrategy.description);
  console.log('Image cache partition:', workerStrategy.partitions.find(
    p => p.mount_point === '/var/lib/docker/overlay2'
  ));
}

// ============================================================================
// Example 6: Using getRecommendedStrategy
// ============================================================================

export function demonstrateStrategyRecommendation(): void {
  const useCases = ['django', 'rails', 'nextjs', 'laravel', 'swarm', 'php', 'python'];
  
  console.log('Strategy Recommendations:');
  for (const useCase of useCases) {
    const recommended = HiveVelocityDeviceManager.getRecommendedStrategy(useCase);
    console.log(`  ${useCase} -> ${recommended}`);
  }
}

// ============================================================================
// Main execution
// ============================================================================

if (require.main === module) {
  console.log('=== Platform Deployment Examples ===\n');
  
  deployDjangoProduction().catch(console.error);
  deployRailsProduction().catch(console.error);
  deployNextjsProduction().catch(console.error);
  deployLaravelProduction().catch(console.error);
  deployDockerSwarmCluster().catch(console.error);
  demonstrateStrategyRecommendation();
}

