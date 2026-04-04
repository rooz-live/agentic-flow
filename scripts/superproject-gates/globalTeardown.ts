/**
 * @file Global Test Teardown
 * @description Global teardown for all test suites including cleanup, data reset, and environment restoration
 */

import { config } from '@jest/globals';

/**
 * Global teardown function called once after all test suites
 */
export default async function globalTeardown() {
  // Cleanup test databases
  await cleanupTestDatabases();
  
  // Cleanup mock services
  await cleanupMockServices();
  
  // Cleanup test environment
  await cleanupTestEnvironment();
  
  // Generate test reports
  await generateTestReports();
  
  console.log('Global test teardown completed');
}

/**
 * Cleanup test databases
 */
async function cleanupTestDatabases(): Promise<void> {
  // Close AgentDB connections
  if (global.agentDB) {
    await global.agentDB.close();
  }
  
  // Close DreamLab Ontology connections
  if (global.dreamlabDB) {
    await global.dreamlabDB.close();
  }
  
  // Close Risk Assessment connections
  if (global.riskDB) {
    await global.riskDB.close();
  }
  
  // Close Affiliate Systems connections
  if (global.affiliateDB) {
    await global.affiliateDB.close();
  }
  
  // Clean up in-memory databases
  process.env.AGENTDB_TEST_PATH = undefined;
  process.env.DREAMLAB_DB_PATH = undefined;
  process.env.RISK_DB_PATH = undefined;
  process.env.AFFILIATE_DB_PATH = undefined;
}

/**
 * Cleanup mock services
 */
async function cleanupMockServices(): Promise<void> {
  // Restore all mocks
  jest.restoreAllMocks();
  
  // Clear global mock objects
  if (global.mockAnthropicAPI) {
    delete global.mockAnthropicAPI;
  }
  
  if (global.mockExternalAPIs) {
    delete global.mockExternalAPIs;
  }
  
  if (global.mockFileSystem) {
    delete global.mockFileSystem;
  }
  
  // Clear global caches
  if (global.testCache) {
    global.testCache.clear();
  }
}

/**
 * Cleanup test environment
 */
async function cleanupTestEnvironment(): Promise<void> {
  // Reset environment variables
  delete process.env.NODE_ENV;
  delete process.env.AGENTIC_FLOW_TEST_MODE;
  delete process.env.AGENTDB_TEST_PATH;
  delete process.env.DREAMLAB_ONTOLOGY_TEST_MODE;
  delete process.env.SECURITY_TEST_MODE;
  delete process.env.PERFORMANCE_TEST_MODE;
  delete process.env.INTEGRATION_TEST_MODE;
  
  // Clean up test data directories
  await cleanupTestDirectories();
  
  // Reset console methods
  if (global.console) {
    global.console = console;
  }
}

/**
 * Cleanup test data directories
 */
async function cleanupTestDirectories(): Promise<void> {
  const fs = require('fs').promises;
  const path = require('path');
  
  const testDirs = [
    './test-data/temp',
    './test-data/exports',
    './test-data/logs'
  ];
  
  for (const dir of testDirs) {
    try {
      const files = await fs.readdir(dir);
      for (const file of files) {
        await fs.unlink(path.join(dir, file));
      }
    } catch (error) {
      // Directory might not exist or be empty
      if (error.code !== 'ENOENT') {
        console.warn('Warning: Could not cleanup directory', dir, error.message);
      }
    }
  }
}

/**
 * Generate comprehensive test reports
 */
async function generateTestReports(): Promise<void> {
  const fs = require('fs').promises;
  const path = require('path');
  
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: global.totalTests || 0,
      passedTests: global.passedTests || 0,
      failedTests: global.failedTests || 0,
      skippedTests: global.skippedTests || 0,
      coverage: global.coverageSummary || {},
      performance: global.performanceSummary || {},
      security: global.securitySummary || {}
    },
    components: {
      restoration: global.restorationTestResults || {},
      agentdb: global.agentdbTestResults || {},
      riskAssessment: global.riskAssessmentTestResults || {},
      affiliateSystems: global.affiliateSystemsTestResults || {},
      dreamlabOntology: global.dreamlabOntologyTestResults || {}
    }
  };
  
  try {
    await fs.writeFile(
      path.join('./test-results', 'comprehensive-test-report.json'),
      JSON.stringify(reportData, null, 2)
    );
  } catch (error) {
    console.warn('Warning: Could not generate comprehensive test report', error.message);
  }
}

/**
 * Cleanup performance monitoring
 */
async function cleanupPerformanceMonitoring(): Promise<void> {
  if (global.performanceMonitors) {
    for (const monitor of global.performanceMonitors) {
      if (monitor.stop) {
        monitor.stop();
      }
    }
    delete global.performanceMonitors;
  }
}

/**
 * Cleanup security test artifacts
 */
async function cleanupSecurityArtifacts(): Promise<void> {
  if (global.securityTestArtifacts) {
    for (const artifact of global.securityTestArtifacts) {
      if (artifact.cleanup) {
        await artifact.cleanup();
      }
    }
    delete global.securityTestArtifacts;
  }
}

// Export utilities for test files
export { 
  cleanupTestDatabases, 
  cleanupMockServices, 
  cleanupTestEnvironment,
  generateTestReports 
};