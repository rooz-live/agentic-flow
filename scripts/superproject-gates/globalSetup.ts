/**
 * @file Global Test Setup
 * @description Global setup for all test suites including database initialization, mock services, and environment preparation
 */

import { config } from '@jest/globals';

/**
 * Global setup function called once before all test suites
 */
export default async function globalSetup() {
  // Initialize test databases
  await setupTestDatabases();
  
  // Initialize mock services
  await setupMockServices();
  
  // Setup test environment
  await setupTestEnvironment();
  
  console.log('Global test setup completed');
}

/**
 * Setup test databases for all components
 */
async function setupTestDatabases(): Promise<void> {
  // AgentDB in-memory setup
  process.env.AGENTDB_TEST_PATH = ':memory:';
  process.env.AGENTDB_TEST_MODE = 'true';
  
  // DreamLab Ontology database setup
  process.env.DREAMLAB_DB_PATH = ':memory:';
  process.env.DREAMLAB_TEST_MODE = 'true';
  
  // Risk assessment database setup
  process.env.RISK_DB_PATH = ':memory:';
  process.env.RISK_TEST_MODE = 'true';
  
  // Affiliate systems database setup
  process.env.AFFILIATE_DB_PATH = ':memory:';
  process.env.AFFILIATE_TEST_MODE = 'true';
}

/**
 * Setup mock services for testing
 */
async function setupMockServices(): Promise<void> {
  // Mock Anthropic API
  global.mockAnthropicAPI = {
    createMessage: jest.fn(),
    streamMessage: jest.fn(),
    validateRequest: jest.fn(),
  };
  
  // Mock external APIs
  global.mockExternalAPIs = {
    paymentProcessor: jest.fn(),
    notificationService: jest.fn(),
    analyticsService: jest.fn(),
  };
  
  // Mock file system operations
  global.mockFileSystem = {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    exists: jest.fn(),
    mkdir: jest.fn(),
  };
}

/**
 * Setup test environment variables and configurations
 */
async function setupTestEnvironment(): Promise<void> {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error'; // Minimize noise in tests
  
  // Security test mode
  process.env.SECURITY_TEST_MODE = 'true';
  process.env.ENCRYPTION_TEST_KEY = 'test-encryption-key-32-chars';
  
  // Performance test mode
  process.env.PERFORMANCE_TEST_MODE = 'true';
  process.env.BENCHMARK_ENABLED = 'true';
  
  // Integration test mode
  process.env.INTEGRATION_TEST_MODE = 'true';
  process.env.MOCK_EXTERNAL_SERVICES = 'true';
  
  // Set test timeouts
  config.testTimeout = 30000;
  config.maxWorkers = '50%';
}

/**
 * Create test data directories
 */
async function createTestDirectories(): Promise<void> {
  const fs = require('fs').promises;
  const path = require('path');
  
  const testDirs = [
    './test-data',
    './test-data/fixtures',
    './test-data/temp',
    './test-data/exports',
    './test-data/backups',
    './test-data/logs'
  ];
  
  for (const dir of testDirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory might already exist
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }
}

// Export utilities for test files
export { setupTestDatabases, setupMockServices, setupTestEnvironment };