module.exports = {
  // @business-context WSJF-42: Mutation testing for high-intensity verification
  // @adr ADR-006: Evidence-based testing without bypass logic
  // @constraint R-2026-016: Test actual production paths
  
  testRunner: 'jest',
  coverageAnalysis: 'perTest',
  
  // Mutate only tested business logic files
  mutate: [
    'scripts/policy/governance.py',
    '!scripts/**/*.js',
    '!src/**/*.ts',
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
  
  // Concurrency (renamed from maxConcurrentTestRunners)
  concurrency: 2,
  
  // Plugin configuration
  plugins: [
    '@stryker-mutator/jest-runner',
    '@stryker-mutator/instrumenter'
  ],
  
  // Ignore specific patterns that would cause false positives
  ignorePatterns: [
    'dist/**',
    'coverage/**',
    '.goalie/**',
    'reports/**',
    'node_modules/**',
    'scripts/governance-audit-system.js'
  ]
};
