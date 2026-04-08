/**
 * Jest global setup — required by jest.config.js setupFilesAfterEnv.
 *
 * Extend here with custom matchers or global test utilities as needed.
 */

// Increase default timeout for integration tests
jest.setTimeout(30_000);
