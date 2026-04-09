/**
 * HiveVelocity Device Manager Usage Examples
 * 
 * This file demonstrates how to use the HiveVelocityDeviceManager
 * for bare metal device provisioning and management.
 */

import {
  HiveVelocityDeviceManager,
  PARTITION_STRATEGIES,
  createDeviceManagerFromEnv,
} from '../src/devops/hivelocity-device-manager';

// ============================================================================
// SETUP
// ============================================================================

// Option 1: Direct instantiation with API key
const API_KEY = process.env.HIVELOCITY_API_KEY || 'your-api-key-here';
const DEVICE_ID = 24460;

const deviceManager = new HiveVelocityDeviceManager(API_KEY, DEVICE_ID);

// Option 2: Create from environment variables (requires HIVELOCITY_API_KEY env var)
// const deviceManager = createDeviceManagerFromEnv(DEVICE_ID);

// ============================================================================
// EXAMPLE 1: Reload Device with Pre-defined Strategy
// ============================================================================

async function example1_reloadWithStrategy() {
  console.log('Example 1: Reloading device with general_purpose strategy...\n');

  try {
    const result = await deviceManager.reloadWithStrategy('ubuntu-22.04', 'general_purpose');
    console.log('✓ Device reload initiated successfully');
    console.log('Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('✗ Failed to reload device:', error);
  }
}

// ============================================================================
// EXAMPLE 2: Reload Device with Database-Optimized Strategy
// ============================================================================

async function example2_reloadDatabaseServer() {
  console.log('Example 2: Reloading database server with database_optimized strategy...\n');

  try {
    const result = await deviceManager.reloadWithStrategy('ubuntu-22.04', 'database_optimized');
    console.log('✓ Database server reload initiated successfully');
    console.log('Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('✗ Failed to reload database server:', error);
  }
}

// ============================================================================
// EXAMPLE 3: Reload Device with High-Security Strategy
// ============================================================================

async function example3_reloadProductionServer() {
  console.log('Example 3: Reloading production server with high_security strategy...\n');

  try {
    const result = await deviceManager.reloadWithStrategy('ubuntu-22.04', 'high_security');
    console.log('✓ Production server reload initiated successfully');
    console.log('Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('✗ Failed to reload production server:', error);
  }
}

// ============================================================================
// EXAMPLE 4: Reload with Custom Partition Configuration
// ============================================================================

async function example4_reloadWithCustomPartitions() {
  console.log('Example 4: Reloading with custom partition configuration...\n');

  try {
    const result = await deviceManager.reloadDevice({
      os: 'ubuntu-22.04',
      partition_scheme: 'custom',
      filesystem: 'ext4',
      encryption: false,
      partitions: [
        { size: '512M', mount_point: '/boot/efi', filesystem: 'fat32', encryption: false },
        { size: '1G', mount_point: '/boot', filesystem: 'ext4', encryption: false },
        { size: '16G', mount_point: 'swap', filesystem: 'swap', encryption: false },
        { size: '25G', mount_point: '/', filesystem: 'ext4', encryption: false },
        { size: '15G', mount_point: '/var', filesystem: 'ext4', encryption: false },
        { size: '10G', mount_point: '/home', filesystem: 'ext4', encryption: false },
        { size: '10G', mount_point: '/opt', filesystem: 'ext4', encryption: false },
        { size: '5G', mount_point: '/tmp', filesystem: 'ext4', encryption: false },
        { size: 'remaining', mount_point: '/data', filesystem: 'xfs', encryption: false },
      ],
    });
    console.log('✓ Custom partition reload initiated successfully');
    console.log('Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('✗ Failed to reload with custom partitions:', error);
  }
}

// ============================================================================
// EXAMPLE 5: Update Device Hostname
// ============================================================================

async function example5_updateHostname() {
  console.log('Example 5: Updating device hostname...\n');

  try {
    const result = await deviceManager.updateDevice({
      hostname: 'prod-web-server-01',
    });
    console.log('✓ Device hostname updated successfully');
    console.log('Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('✗ Failed to update hostname:', error);
  }
}

// ============================================================================
// EXAMPLE 6: Get Device Status
// ============================================================================

async function example6_getDeviceStatus() {
  console.log('Example 6: Getting device status...\n');

  try {
    const status = await deviceManager.getDeviceStatus();
    console.log('✓ Device status retrieved successfully');
    console.log('Status:', JSON.stringify(status, null, 2));
  } catch (error) {
    console.error('✗ Failed to get device status:', error);
  }
}

// ============================================================================
// EXAMPLE 7: Validate Partition Scheme
// ============================================================================

async function example7_validatePartitionScheme() {
  console.log('Example 7: Validating partition schemes...\n');

  // Validate general_purpose strategy
  const validation1 = HiveVelocityDeviceManager.validatePartitionScheme(
    PARTITION_STRATEGIES.general_purpose
  );
  console.log('General Purpose Strategy:');
  console.log(`  Valid: ${validation1.valid}`);
  if (!validation1.valid) {
    console.log(`  Errors: ${validation1.errors.join(', ')}`);
  }

  // Validate high_security strategy
  const validation2 = HiveVelocityDeviceManager.validatePartitionScheme(
    PARTITION_STRATEGIES.high_security
  );
  console.log('\nHigh Security Strategy:');
  console.log(`  Valid: ${validation2.valid}`);
  if (!validation2.valid) {
    console.log(`  Errors: ${validation2.errors.join(', ')}`);
  }

  // Validate custom (invalid) scheme
  const invalidScheme = {
    scheme: 'invalid' as const,
    encryption: { enabled: false },
    partitions: [
      { size: '1G', mount_point: '/', filesystem: 'ext4' as const, encryption: false },
      // Missing required partitions
    ],
  };
  const validation3 = HiveVelocityDeviceManager.validatePartitionScheme(invalidScheme);
  console.log('\nInvalid Scheme:');
  console.log(`  Valid: ${validation3.valid}`);
  console.log(`  Errors: ${validation3.errors.join(', ')}`);
}

// ============================================================================
// EXAMPLE 8: Generate Partition Summary
// ============================================================================

async function example8_generatePartitionSummary() {
  console.log('Example 8: Generating partition summaries...\n');

  const strategies = [
    'standard',
    'general_purpose',
    'database_optimized',
    'container_node',
    'high_security',
  ] as const;

  for (const strategyName of strategies) {
    const strategy = PARTITION_STRATEGIES[strategyName];
    const summary = HiveVelocityDeviceManager.generatePartitionSummary(strategy);
    
    console.log(`\n${strategyName.toUpperCase()} STRATEGY:`);
    console.log('═'.repeat(70));
    console.log(summary);
    console.log('═'.repeat(70));
  }
}

// ============================================================================
// EXAMPLE 9: Get Recommended Strategy
// ============================================================================

async function example9_getRecommendedStrategy() {
  console.log('Example 9: Getting recommended strategies for use cases...\n');

  const useCases = [
    'web',
    'database',
    'kubernetes',
    'production',
    'development',
    'storage',
    'docker',
  ];

  console.log('Use Case → Recommended Strategy');
  console.log('─'.repeat(50));

  for (const useCase of useCases) {
    const recommended = HiveVelocityDeviceManager.getRecommendedStrategy(useCase);
    console.log(`${useCase.padEnd(20)} → ${recommended}`);
  }
}

// ============================================================================
// EXAMPLE 10: Complete Workflow - Provision and Configure
// ============================================================================

async function example10_completeWorkflow() {
  console.log('Example 10: Complete provisioning workflow...\n');

  try {
    // Step 1: Get current device status
    console.log('Step 1: Checking current device status...');
    const currentStatus = await deviceManager.getDeviceStatus();
    console.log('✓ Current status retrieved');

    // Step 2: Choose appropriate strategy based on use case
    console.log('\nStep 2: Selecting partition strategy...');
    const useCase = 'web'; // Could be 'database', 'kubernetes', etc.
    const recommendedStrategy = HiveVelocityDeviceManager.getRecommendedStrategy(useCase);
    console.log(`✓ Recommended strategy for "${useCase}": ${recommendedStrategy}`);

    // Step 3: Display partition summary
    console.log('\nStep 3: Displaying partition configuration...');
    const summary = HiveVelocityDeviceManager.generatePartitionSummary(
      PARTITION_STRATEGIES[recommendedStrategy]
    );
    console.log(summary);

    // Step 4: Validate the partition scheme
    console.log('\nStep 4: Validating partition scheme...');
    const validation = HiveVelocityDeviceManager.validatePartitionScheme(
      PARTITION_STRATEGIES[recommendedStrategy]
    );
    if (!validation.valid) {
      throw new Error(`Invalid partition scheme: ${validation.errors.join(', ')}`);
    }
    console.log('✓ Partition scheme validated');

    // Step 5: Reload device with selected strategy
    console.log('\nStep 5: Initiating device reload...');
    const reloadResult = await deviceManager.reloadWithStrategy(
      'ubuntu-22.04',
      recommendedStrategy
    );
    console.log('✓ Device reload initiated');
    console.log('Reload ID:', reloadResult.id);

    // Step 6: Update hostname
    console.log('\nStep 6: Updating device hostname...');
    await deviceManager.updateDevice({
      hostname: 'web-server-prod-01',
    });
    console.log('✓ Hostname updated');

    console.log('\n✓ Complete workflow finished successfully!');
    console.log('\nNext steps:');
    console.log('  1. Monitor reload progress via API or console');
    console.log('  2. Wait for device to come online');
    console.log('  3. Verify partition configuration');
    console.log('  4. Deploy applications and services');

  } catch (error) {
    console.error('\n✗ Workflow failed:', error);
  }
}

// ============================================================================
// EXAMPLE 11: Batch Device Management
// ============================================================================

async function example11_batchDeviceManagement() {
  console.log('Example 11: Batch device management...\n');

  const devices = [
    { id: 24460, hostname: 'web-server-01', strategy: 'general_purpose' as const },
    { id: 24461, hostname: 'web-server-02', strategy: 'general_purpose' as const },
    { id: 24462, hostname: 'db-server-01', strategy: 'database_optimized' as const },
    { id: 24463, hostname: 'k8s-node-01', strategy: 'container_node' as const },
  ];

  console.log(`Processing ${devices.length} devices...\n`);

  for (const device of devices) {
    console.log(`Processing device ${device.id} (${device.hostname})...`);
    
    try {
      const manager = new HiveVelocityDeviceManager(API_KEY, device.id);
      
      // Reload with strategy
      await manager.reloadWithStrategy('ubuntu-22.04', device.strategy);
      console.log(`  ✓ Reloaded with ${device.strategy} strategy`);
      
      // Update hostname
      await manager.updateDevice({ hostname: device.hostname });
      console.log(`  ✓ Hostname set to ${device.hostname}`);
      
    } catch (error) {
      console.error(`  ✗ Failed: ${error}`);
    }
    
    console.log('');
  }

  console.log('Batch processing complete!');
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('='.repeat(70));
  console.log('HiveVelocity Device Manager - Usage Examples');
  console.log('='.repeat(70));
  console.log('');

  // Run examples (comment/uncomment as needed)
  
  // await example1_reloadWithStrategy();
  // await example2_reloadDatabaseServer();
  // await example3_reloadProductionServer();
  // await example4_reloadWithCustomPartitions();
  // await example5_updateHostname();
  // await example6_getDeviceStatus();
  // await example7_validatePartitionScheme();
  // await example8_generatePartitionSummary();
  // await example9_getRecommendedStrategy();
  // await example10_completeWorkflow();
  // await example11_batchDeviceManagement();
  
  // For demonstration, run the complete workflow
  await example10_completeWorkflow();
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  example1_reloadWithStrategy,
  example2_reloadDatabaseServer,
  example3_reloadProductionServer,
  example4_reloadWithCustomPartitions,
  example5_updateHostname,
  example6_getDeviceStatus,
  example7_validatePartitionScheme,
  example8_generatePartitionSummary,
  example9_getRecommendedStrategy,
  example10_completeWorkflow,
  example11_batchDeviceManagement,
};
