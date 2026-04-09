#!/usr/bin/env npx tsx
/**
 * Test script for Infrastructure Health Checker
 * 
 * Tests:
 * 1. SSH connectivity check
 * 2. Overall health metrics
 * 3. Recommended actions generation
 * 4. Health status caching
 */

import { InfrastructureHealthChecker } from '../src/core/infrastructure-health.js';

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 Testing Infrastructure Health Checker');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const checker = new InfrastructureHealthChecker();

  // Test 1: Check SSH connectivity
  console.log('Test 1: SSH Connectivity Check');
  console.log('─────────────────────────────────────────────────────');
  const sshHealth = await checker.checkSSHConnectivity();
  console.log(`Status: ${sshHealth.status}`);
  console.log(`Reachable: ${sshHealth.reachable}`);
  console.log(`Latency: ${sshHealth.latency}ms`);
  console.log(`Details: ${sshHealth.details}`);
  console.log(`Host: ${sshHealth.host}`);
  console.log(`Last Check: ${sshHealth.lastCheck?.toLocaleString()}\n`);

  // Test 2: Overall health metrics
  console.log('Test 2: Overall Health Metrics');
  console.log('─────────────────────────────────────────────────────');
  const health = await checker.getOverallHealth();
  console.log(`Overall Health: ${health.overallHealth}`);
  console.log(`SSH Status: ${health.ssh.status}`);
  console.log(`Last Check Time: ${health.lastCheckTime?.toLocaleString()}`);
  console.log(`Status Icon: ${checker.getStatusIcon(health.overallHealth)}`);
  console.log(`Time Ago: ${checker.getTimeAgo(health.lastCheckTime)}\n`);

  // Test 3: Recommended actions
  console.log('Test 3: Recommended Actions');
  console.log('─────────────────────────────────────────────────────');
  const actions = await checker.getRecommendedActions();
  if (actions.length === 0) {
    console.log('✅ No infrastructure actions recommended (healthy)');
  } else {
    console.log(`Found ${actions.length} recommended action(s):\n`);
    actions.forEach((action, idx) => {
      console.log(`Action ${idx + 1}:`);
      console.log(`  Description: ${action.description}`);
      console.log(`  Command: ${action.command} ${action.args.join(' ')}`);
      console.log(`  WSJF Score: ${action.wsjfScore}`);
      console.log(`  Urgency: ${action.urgency}`);
      if (action.causalInsight) {
        console.log(`  Insight: ${action.causalInsight}`);
      }
      console.log('');
    });
  }

  // Test 4: Cache verification
  console.log('Test 4: Health Cache');
  console.log('─────────────────────────────────────────────────────');
  const cachedHealth = await checker.getOverallHealth(); // Should use cache
  const isCached = cachedHealth.lastCheckTime?.getTime() === health.lastCheckTime?.getTime();
  console.log(`Cache working: ${isCached ? '✅' : '❌'}`);
  console.log(`Cache file: .db/infrastructure-health.json`);
  
  // Test 5: Force refresh
  console.log('\nTest 5: Force Refresh');
  console.log('─────────────────────────────────────────────────────');
  console.log('Forcing health check refresh (ignoring cache)...');
  const refreshedHealth = await checker.getOverallHealth(true);
  const isRefreshed = refreshedHealth.lastCheckTime?.getTime() !== health.lastCheckTime?.getTime();
  console.log(`Refresh successful: ${isRefreshed ? '✅' : '❌'}`);
  console.log(`New check time: ${refreshedHealth.lastCheckTime?.toLocaleString()}`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ All tests completed');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(console.error);
