/**
 * @file Test Setup and Global Configuration
 * @description Global test setup for QUIC test suite
 */

// Jest global setup - no imports needed, using global jest APIs
// vscode mock is provided via moduleNameMapper in jest.config.js -> tests/__mocks__/vscode.ts

// Global test configuration
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.QUIC_SERVER = 'localhost:8443';
  process.env.QUIC_0RTT = 'true';
  process.env.QUIC_MAX_STREAMS = '1000';
  process.env.QUIC_FALLBACK = 'true';

  // Mock console methods to reduce noise in tests
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: console.warn, // Keep warnings
    error: console.error, // Keep errors
  } as any;

  console.info('Test environment initialized');
});

afterAll(() => {
  console.info('Test environment cleanup complete');
});

// Global test utilities
export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const createMockAgent = (type: string) => ({
  id: `agent-${Math.random().toString(36).substring(7)}`,
  type,
  status: 'active',
  createdAt: Date.now(),
});

export const simulateNetworkDelay = (min = 10, max = 50) =>
  wait(Math.random() * (max - min) + min);
