/**
 * @file Comprehensive Test Setup and Global Configuration
 * @description Global test setup for all enhanced system components testing
 */

import { config } from '@jest/globals';

// Global test configuration
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.AGENTIC_FLOW_TEST_MODE = 'true';
  process.env.AGENTDB_TEST_PATH = ':memory:';
  process.env.DREAMLAB_ONTOLOGY_TEST_MODE = 'true';
  process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-key';
  process.env.LOG_LEVEL = 'error'; // Reduce noise in tests

  // Mock console methods to reduce noise in tests
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: console.warn, // Keep warnings for debugging
    error: console.error, // Keep errors for debugging
  };

  console.info('Comprehensive test environment initialized');
});

afterAll(() => {
  console.info('Comprehensive test environment cleanup complete');
});

// Global Jest configuration
config.setupFilesAfterEnv = ['<rootDir>/__tests__/setup.ts'];
config.testTimeout = 30000;
config.verbose = true;

// Global test utilities
export const wait = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

export const createMockAgent = (type: string, overrides?: any) => ({
  id: `agent-${Math.random().toString(36).substring(7)}`,
  type,
  status: 'active',
  createdAt: Date.now(),
  capabilities: [],
  ...overrides,
});

export const createMockEnvironment = (overrides?: any) => ({
  id: `env-${Math.random().toString(36).substring(7)}`,
  name: 'Test Environment',
  status: 'healthy',
  components: [],
  metrics: {},
  ...overrides,
});

export const simulateNetworkDelay = (min = 10, max = 50): Promise<void> =>
  wait(Math.random() * (max - min) + min);

export const generateTestData = (type: string, count: number = 1): any[] => 
  Array.from({ length: count }, (_, i) => ({
    id: `${type}_${i}_${Date.now()}`,
    timestamp: Date.now(),
    data: {},
  }));

// Global error handlers for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});