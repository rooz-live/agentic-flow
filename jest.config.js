/**
 * Jest Configuration with Environment-Aware Test Filtering
 *
 * Environment markers (use in test file names or describe blocks):
 * - *.integration.test.ts - Integration tests requiring external services
 * - *.e2e.test.ts - End-to-end tests
 * - *.unit.test.ts - Unit tests (safe for all environments)
 *
 * Run environment-specific tests:
 *   AF_ENV=local npm test -- --testPathPattern="unit|local"
 *   AF_ENV=dev npm test -- --testPathPattern="integration"
 *   AF_ENV=ci npm test -- --testPathIgnorePatterns="integration|e2e"
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src', '<rootDir>/tools', '<rootDir>/__tests__'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    // Skip tests that use vitest-specific features
    'iris_bridge\\.test\\.ts$',
    'prod-cycle-governance\\.test\\.ts$',
    'quic\\.test\\.ts$',
    'quic-proxy\\.test\\.ts$',
    'quic-workflow\\.test\\.ts$',
    // Skip goalie-vscode tests (require separate vscode extension test runner)
    'tools/goalie-vscode/tests/',
    // Skip process-governor test (hangs due to mock issues)
    'tests/unit/process-governor\\.test\\.ts$',
    // Environment-based filtering (set via AF_SKIP_INTEGRATION=true)
    ...(process.env.AF_SKIP_INTEGRATION === 'true' ? ['\\.integration\\.test\\.ts$'] : []),
    ...(process.env.AF_SKIP_E2E === 'true' ? ['\\.e2e\\.test\\.ts$'] : []),
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      isolatedModules: true, // Faster compilation by skipping type checking
    }],
  },
  // Performance optimizations
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  maxWorkers: '50%', // Use half of available CPUs for optimal parallelism
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^vscode$': '<rootDir>/tests/__mocks__/vscode.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 10000,
  verbose: true,
};
