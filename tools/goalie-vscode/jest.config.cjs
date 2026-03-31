const path = require('path');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: __dirname,
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^vscode$': path.resolve(__dirname, 'test/mocks/vscode.ts'),
    '^./telemetry$': path.resolve(__dirname, 'src/telemetry'),
  },
};
