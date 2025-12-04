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
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
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
