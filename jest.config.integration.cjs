const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  roots: ['<rootDir>/tests/integration'],
  testMatch: ['**/?(*.)+(spec|test).ts'],
  testPathIgnorePatterns: ['/node_modules/'],
};
