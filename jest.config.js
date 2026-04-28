// Jest Configuration for 80% Coverage
// Contract: Goal/Constraints/Output/Failure/Verification

module.exports = {
  // GOAL: Achieve 80% test coverage across all metrics
  
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: [
    "text",
    "text-summary",
    "lcov",
    "html",
    "json"
  ],
  
  // CONSTRAINTS: Hard boundaries for coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Test environment configuration
  testEnvironment: "node",
  roots: [
    "<rootDir>/tests",
    "<rootDir>/src"
  ],
  testMatch: [
    "**/*.test.js",
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/__tests__/**/*.js"
  ],

  // Exclude E2E tests from Unit Test scope
  testPathIgnorePatterns: [
    "/node_modules/",
    "/tests/e2e/"
  ],
  
  // Transform configuration
  transform: {
    "^.+\\.tsx?$": "ts-jest",
    "^.+\\.jsx?$": "babel-jest"
  },
  
  // Module resolution
  moduleFileExtensions: ["js", "ts", "json", "node"],
  
  // Setup files
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  
  // Coverage exclusions (not part of testable code)
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/tests/fixtures/",
    "/scripts/",
    "/docs/"
  ],
  
  // Verbose output for debugging
  verbose: true,
  
  // Fail on coverage threshold violations
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
