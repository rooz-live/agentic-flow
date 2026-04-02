module.exports = {
  // @business-context WSJF-42: Mutation testing for high-intensity verification
  // @adr ADR-006: Evidence-based testing without bypass logic
  // @constraint R-2026-016: Test actual production paths
  
  testRunner: 'jest',
  coverageAnalysis: 'perTest',
  
  // Mutate only business logic, not test files
  mutate: [
    'scripts/policy/governance.js',
    'scripts/**/*.js',
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!**/node_modules/**'
  ],
  
  // High thresholds to ensure robust tests
  thresholds: {
    high: 80,
    low: 60
  },
  
  // Specific mutators for JavaScript/TypeScript
  mutator: 'javascript',
  
  // Jest configuration
  jest: {
    configFile: 'jest.config.js',
    projectType: 'custom'
  },
  
  // Reporting
  reporters: ['progress', 'clear-text', 'html'],
  
  // Timeout per mutant (in ms)
  timeoutMS: 5000,
  
  // Maximum concurrent test runners
  maxConcurrentTestRunners: 2,
  
  // Plugin configuration
  plugins: [
    require('@stryker-mutator/jest-runner'),
    require('@stryker-mutator/javascript-mutator')
  ],
  
  // Ignore specific patterns that would cause false positives
  ignorePatterns: [
    'dist/**',
    'coverage/**',
    '.goalie/**',
    'reports/**',
    'node_modules/**'
  ]
};
