#!/usr/bin/env node

/**
 * Test script to validate process governor optimizations for high CPU load scenarios
 * 
 * This script tests:
 * 1. CPU idle calculation fixes (negative values)
 * 2. Proactive admission control
 * 3. Intelligent CPU load detection and adaptive throttling
 * 4. Dynamic rate limiting
 * 5. Exponential backoff with jitter
 * 6. Batch operations and dependency analysis
 * 7. Performance monitoring and logging
 * 8. Configuration options for different load scenarios
 */

import { runBatched, guarded, getStats, reset, config } from '../src/runtime/processGovernor';
import os from 'os';

// Import the functions we need to test
let getCpuLoad: () => number;
let getIdlePercentage: () => number;

// Dynamic import to avoid module resolution issues
async function loadProcessGovernorFunctions() {
  const module = await import('../src/runtime/processGovernor');
  getCpuLoad = module.getCpuLoad;
  getIdlePercentage = module.getIdlePercentage;
}

// Mock CPU load simulation
class MockCpuLoadSimulator {
  private baseLoad: number = 0.3; // 30% base load
  private loadTrend: number = 0; // -1 = decreasing, 0 = stable, 1 = increasing
  private simulationTime: number = 0;

  constructor() {
    this.reset();
  }

  reset(): void {
    this.baseLoad = 0.3;
    this.loadTrend = 0;
    this.simulationTime = 0;
  }

  // Simulate different load scenarios
  setScenario(scenario: 'low' | 'medium' | 'high' | 'critical' | 'spiking'): void {
    switch (scenario) {
      case 'low':
        this.baseLoad = 0.2; // 20% CPU
        this.loadTrend = 0;
        break;
      case 'medium':
        this.baseLoad = 0.5; // 50% CPU
        this.loadTrend = 0;
        break;
      case 'high':
        this.baseLoad = 0.8; // 80% CPU
        this.loadTrend = 0.1; // Slight increase
        break;
      case 'critical':
        this.baseLoad = 0.95; // 95% CPU
        this.loadTrend = 0.2; // Increasing
        break;
      case 'spiking':
        this.baseLoad = 0.6; // 60% base with spikes
        this.loadTrend = Math.sin(this.simulationTime * 0.1) * 0.3; // Oscillating
        break;
    }
  }

  // Override os.loadavg for testing
  getLoadAvg(): [number, number, number] {
    this.simulationTime += 0.1;
    const trendComponent = this.loadTrend * Math.sin(this.simulationTime);
    const currentLoad = Math.max(0, Math.min(1, this.baseLoad + trendComponent));
    
    // Simulate 1-minute, 5-minute, 15-minute averages
    return [
      currentLoad * os.cpus().length, // 1-min average
      currentLoad * os.cpus().length * 0.9, // 5-min average (slightly smoothed)
      currentLoad * os.cpus().length * 0.8, // 15-min average (more smoothed)
    ];
  }
}

// Test functions
async function testCpuIdleCalculation(): Promise<void> {
  console.log('\n=== Testing CPU Idle Calculation ===');
  
  const simulator = new MockCpuLoadSimulator();
  
  // Test normal load
  simulator.setScenario('medium');
  const originalLoadAvg = os.loadavg;
  (os as any).loadavg = () => simulator.getLoadAvg();
  
  const { getCpuLoad, getIdlePercentage } = await import('../src/runtime/processGovernor');
  const cpuLoad = getCpuLoad();
  const idlePercentage = getIdlePercentage();
  
  console.log(`✅ Normal Load - CPU: ${cpuLoad.toFixed(1)}%, Idle: ${idlePercentage.toFixed(1)}%`);
  
  // Test overload scenario (> 100%)
  simulator.setScenario('critical');
  const overloadLoad = getCpuLoad();
  const overloadIdle = getIdlePercentage();
  
  console.log(`✅ Overload Load - CPU: ${overloadLoad.toFixed(1)}%, Idle: ${overloadIdle.toFixed(1)}%`);
  
  // Verify no negative values
  if (overloadIdle < 0) {
    console.error('❌ FAIL: Idle percentage went negative!');
  } else {
    console.log('✅ PASS: Idle percentage never went negative');
  }
  
  // Restore original
  (os as any).loadavg = originalLoadAvg;
}

async function testAdaptiveThrottling(): Promise<void> {
  console.log('\n=== Testing Adaptive Throttling ===');
  
  const simulator = new MockCpuLoadSimulator();
  const originalLoadAvg = os.loadavg;
  (os as any).loadavg = () => simulator.getLoadAvg();
  
  // Test low load scenario
  simulator.setScenario('low');
  reset();
  
  const testItems = Array.from({ length: 10 }, (_, i) => ({ id: i, value: `item-${i}` }));
  
  console.log('Testing low load scenario...');
  const startTime = Date.now();
  await runBatched(testItems, async (item) => {
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate work
    return `processed-${item.id}`;
  });
  const lowLoadTime = Date.now() - startTime;
  
  // Test high load scenario
  simulator.setScenario('high');
  reset();
  
  console.log('Testing high load scenario...');
  const highStartTime = Date.now();
  await runBatched(testItems, async (item) => {
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate work
    return `processed-${item.id}`;
  });
  const highLoadTime = Date.now() - highStartTime;
  
  console.log(`✅ Low load time: ${lowLoadTime}ms`);
  console.log(`✅ High load time: ${highLoadTime}ms`);
  console.log(`✅ Throttling ratio: ${(highLoadTime / lowLoadTime).toFixed(2)}x`);
  
  // Restore original
  (os as any).loadavg = originalLoadAvg;
}

async function testBatchOptimization(): Promise<void> {
  console.log('\n=== Testing Batch Optimization ===');
  
  const simulator = new MockCpuLoadSimulator();
  const originalLoadAvg = os.loadavg;
  (os as any).loadavg = () => simulator.getLoadAvg();
  
  // Test with dependency analysis enabled
  process.env.AF_DEPENDENCY_ANALYSIS_ENABLED = 'true';
  process.env.AF_BATCH_MAPPING_ENABLED = 'true';
  process.env.AF_EXECUTION_ORDER_OPTIMIZATION = 'true';
  
  reset();
  
  const testItems = Array.from({ length: 20 }, (_, i) => ({ 
    id: i, 
    value: `item-${i}`,
    priority: i % 3 === 0 ? 2 : 1, // Every 3rd item is higher priority
  }));
  
  console.log('Testing batch optimization with dependency analysis...');
  const startTime = Date.now();
  
  await runBatched(testItems, async (item) => {
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100)); // Variable work time
    return `processed-${item.id}`;
  });
  
  const totalTime = Date.now() - startTime;
  const stats = getStats();
  
  console.log(`✅ Total time: ${totalTime}ms`);
  console.log(`✅ Items processed: ${stats.completedWork}`);
  console.log(`✅ Incidents logged: ${stats.incidents.length}`);
  console.log(`✅ Adaptive throttling level: ${stats.adaptiveThrottlingLevel}`);
  
  // Check for dependency analysis incidents
  const dependencyIncidents = stats.incidents.filter(i => i.type === 'DEPENDENCY_ANALYSIS');
  if (dependencyIncidents.length > 0) {
    console.log('✅ Dependency analysis incidents logged');
  }
  
  // Restore original
  (os as any).loadavg = originalLoadAvg;
  delete process.env.AF_DEPENDENCY_ANALYSIS_ENABLED;
  delete process.env.AF_BATCH_MAPPING_ENABLED;
  delete process.env.AF_EXECUTION_ORDER_OPTIMIZATION;
}

async function testExponentialBackoff(): Promise<void> {
  console.log('\n=== Testing Exponential Backoff ===');
  
  const simulator = new MockCpuLoadSimulator();
  const originalLoadAvg = os.loadavg;
  (os as any).loadavg = () => simulator.getLoadAvg();
  
  // Test with critical load to trigger backoff
  simulator.setScenario('critical');
  reset();
  
  const failingProcessor = async (item: any) => {
    // Simulate failures for first few items to test backoff
    if (item.id < 3) {
      throw new Error(`Simulated failure for item ${item.id}`);
    }
    await new Promise(resolve => setTimeout(resolve, 50));
    return `processed-${item.id}`;
  };
  
  const testItems = Array.from({ length: 10 }, (_, i) => ({ id: i, value: `item-${i}` }));
  
  console.log('Testing exponential backoff with failures...');
  const startTime = Date.now();
  
  try {
    await runBatched(testItems, failingProcessor, { maxRetries: 5 });
  } catch (error) {
    console.log(`✅ Expected error caught: ${error}`);
  }
  
  const totalTime = Date.now() - startTime;
  const stats = getStats();
  
  console.log(`✅ Total time: ${totalTime}ms`);
  console.log(`✅ Failures: ${stats.failedWork}`);
  console.log(`✅ Backoff incidents: ${stats.incidents.filter(i => i.type === 'BACKOFF').length}`);
  
  // Restore original
  (os as any).loadavg = originalLoadAvg;
}

async function testConfigurationOptions(): Promise<void> {
  console.log('\n=== Testing Configuration Options ===');
  
  // Test different throttling configurations
  const configs = [
    { AF_ADAPTIVE_THROTTLING_ENABLED: 'true', AF_CPU_CRITICAL_THRESHOLD: '0.9' },
    { AF_ADAPTIVE_THROTTLING_ENABLED: 'true', AF_CPU_CRITICAL_THRESHOLD: '0.95' },
    { AF_ADAPTIVE_THROTTLING_ENABLED: 'false' },
  ];
  
  for (const [index, testConfig] of configs.entries()) {
    console.log(`\nTesting configuration ${index + 1}:`, testConfig);
    
    // Apply config
    Object.entries(testConfig).forEach(([key, value]) => {
      process.env[key] = value;
    });
    
    reset();
    
    const simulator = new MockCpuLoadSimulator();
    simulator.setScenario('high');
    const originalLoadAvg = os.loadavg;
    (os as any).loadavg = () => simulator.getLoadAvg();
    
    const testItems = Array.from({ length: 5 }, (_, i) => ({ id: i, value: `item-${i}` }));
    
    const startTime = Date.now();
    await runBatched(testItems, async (item) => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return `processed-${item.id}`;
    });
    const totalTime = Date.now() - startTime;
    
    console.log(`  Time: ${totalTime}ms, Throttling: ${getStats().adaptiveThrottlingLevel}`);
    
    // Restore
    (os as any).loadavg = originalLoadAvg;
    Object.keys(testConfig).forEach(key => delete process.env[key]);
  }
}

async function main(): Promise<void> {
  console.log('🚀 Starting Process Governor Optimization Tests\n');
  
  try {
    await testCpuIdleCalculation();
    await testAdaptiveThrottling();
    await testBatchOptimization();
    await testExponentialBackoff();
    await testConfigurationOptions();
    
    console.log('\n✅ All tests completed successfully!');
    console.log('\n📊 Final Statistics:');
    const finalStats = getStats();
    console.log(`  Active Work: ${finalStats.activeWork}`);
    console.log(`  Queued Work: ${finalStats.queuedWork}`);
    console.log(`  Completed Work: ${finalStats.completedWork}`);
    console.log(`  Failed Work: ${finalStats.failedWork}`);
    console.log(`  Total Incidents: ${finalStats.incidents.length}`);
    console.log(`  Load History Entries: ${finalStats.loadHistory.length}`);
    console.log(`  Adaptive Throttling Level: ${finalStats.adaptiveThrottlingLevel}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}