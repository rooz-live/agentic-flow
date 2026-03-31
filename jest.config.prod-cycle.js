/**
 * Jest Configuration for Production Cycle Tests
 * Comprehensive configuration for all prod-cycle improvement tests
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/tests/unit/**/*.test.ts',
    '**/tests/pattern-metrics/**/*.test.ts',
    '**/tests/federation/**/*.test.ts',
    '**/tests/vscode-extension/**/*.test.ts',
    '**/tests/performance/**/*.test.ts',
    '**/tests/integration/**/*.test.ts'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'json',
    'json-summary',
    'html',
    'lcov',
    'clover'
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/runtime/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/dashboard/services/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    'src/**/*.js',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/index.ts'
  ],
  
  // Module configuration
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  
  // Module name mapping for path aliases
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts'
  ],
  
  // Test timeout
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Mock configuration
  clearMocks: true,
  restoreMocks: true,
  
  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test-results',
        outputName: 'junit.xml',
        ancestorSeparator: ' › ',
        uniqueOutputName: 'false',
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}'
      }
    ],
    [
      'jest-html-reporters',
      {
        publicPath: 'test-results/html-report',
        filename: 'report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'Production Cycle Test Report',
        logoImgPath: undefined,
        inlineSource: false
      }
    ]
  ],
  
  // Global variables
  globals: {
    'process.env': {
      NODE_ENV: 'test',
      AF_TEST_MODE: 'true',
      AF_CPU_HEADROOM_TARGET: '0.40',
      AF_BATCH_SIZE: '3',
      AF_MAX_WIP: '6',
      AF_RATE_LIMIT_ENABLED: 'true',
      AF_CIRCUIT_BREAKER_ENABLED: 'true'
    }
  },
  
  // Test results processor
  reporters: [
    'default',
    [
      './tests/test-results-processor.js',
      {
        outputDir: 'test-results',
        outputFile: 'test-metrics.json'
      }
    ]
  ],
  
  // Performance monitoring
  maxWorkers: '50%',
  
  // Cache configuration
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Watch mode configuration
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/',
    '<rootDir>/test-results/'
  ]
};