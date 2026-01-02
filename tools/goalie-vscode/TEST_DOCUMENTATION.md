# Goalie VSCode Extension Test Suite

This document provides comprehensive information about the test suite for the Goalie VSCode extension, including setup, execution, and best practices.

## Table of Contents

1. [Overview](#overview)
2. [Test Structure](#test-structure)
3. [Sample Data](#sample-data)
4. [Running Tests](#running-tests)
5. [Test Categories](#test-categories)
6. [Coverage](#coverage)
7. [Debugging Tests](#debugging-tests)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

## Overview

The Goalie VSCode extension test suite is designed to validate all functionality of the extension, including:

- TreeView providers and data visualization
- Alert system and threshold monitoring
- File watching and real-time updates
- Command handlers and user interactions
- Data parsing and validation
- Performance with large datasets
- User experience and accessibility

The test suite uses Jest as the testing framework with TypeScript support and comprehensive mocking of VSCode APIs.

## Test Structure

```
tests/
├── setup.ts                    # Test configuration and mocks
├── unit/                       # Unit tests
│   ├── treeview.test.ts
│   ├── alertManager.test.ts
│   ├── fileWatcherService.test.ts
│   ├── commandHandlers.test.ts
│   └── dataParsing.test.ts
├── integration/                # Integration tests
│   └── integration.test.ts
├── performance/                # Performance tests
│   └── performance.test.ts
└── userExperience/             # User experience tests
    └── userExperience.test.ts
```

### Sample Data

Sample data files are located in the `.goalie/` directory:

- `KANBAN_BOARD.yaml` - Kanban board data with sections, items, and metadata
- `pattern_metrics.jsonl` - Pattern metrics with circles, depths, and WSJF scores
- `process_flow_metrics.json` - Process flow data with efficiency scores
- `learning_metrics.json` - Learning data with user patterns and adoption rates
- `depth_ladder_timeline.json` - Depth ladder progression data
- `goalie_gaps.json` - Gap analysis with severity levels
- `dt_evaluation_summary.json` - DT calibration data

## Running Tests

### Using the Test Runner

The easiest way to run tests is using the provided test runner script:

```bash
# Run all tests
node test-runner.js

# Run specific test categories
node test-runner.js unit
node test-runner.js integration
node test-runner.js performance
node test-runner.js userExperience

# Run with coverage
node test-runner.js coverage

# Run in watch mode for development
node test-runner.js watch

# Show help
node test-runner.js --help
```

### Using Jest Directly

You can also use Jest directly:

```bash
# Run all tests
npx jest --config jest.config.js

# Run specific test files
npx jest --config jest.config.js tests/unit/treeview.test.ts

# Run with coverage
npx jest --config jest.config.js --coverage

# Run in watch mode
npx jest --config jest.config.js --watch
```

### Using npm Scripts

If you prefer npm scripts, add these to your package.json:

```json
{
  "scripts": {
    "test": "node test-runner.js",
    "test:unit": "node test-runner.js unit",
    "test:integration": "node test-runner.js integration",
    "test:performance": "node test-runner.js performance",
    "test:ux": "node test-runner.js userExperience",
    "test:coverage": "node test-runner.js coverage",
    "test:watch": "node test-runner.js watch"
  }
}
```

## Test Categories

### Unit Tests

Unit tests focus on individual components in isolation:

- **TreeView Tests** (`treeview.test.ts`): Test all TreeView providers with various data scenarios
- **AlertManager Tests** (`alertManager.test.ts`): Test alert threshold monitoring and notifications
- **FileWatcherService Tests** (`fileWatcherService.test.ts`): Test file change detection and debouncing
- **Command Handler Tests** (`commandHandlers.test.ts`): Test all command handlers and user interactions
- **Data Parsing Tests** (`dataParsing.test.ts`): Test YAML/JSON parsing and validation

### Integration Tests

Integration tests validate end-to-end workflows:

- **Workflow Tests**: Complete user workflows from data loading to UI interaction
- **Real-time Updates**: File watching and automatic UI updates
- **Drag-and-Drop**: Kanban board item movement and state persistence
- **Filtering and Search**: Data filtering and search functionality

### Performance Tests

Performance tests ensure the extension works efficiently with large datasets:

- **Large Dataset Tests**: Performance with 1000+ items
- **Memory Usage Tests**: Memory consumption and cleanup
- **File Watching Performance**: Performance with frequent file changes
- **UI Rendering Tests**: TreeView rendering performance

### User Experience Tests

User experience tests focus on user interaction and accessibility:

- **Error Handling**: User-friendly error messages and recovery suggestions
- **Loading States**: Progress indicators and loading feedback
- **Accessibility**: Keyboard navigation and screen reader support
- **Tooltips and Help**: Contextual help and hover information

## Coverage

The test suite aims for comprehensive coverage of all extension functionality. Coverage reports are generated in the `coverage/` directory:

- `coverage/lcov-report/index.html` - Interactive HTML report
- `coverage/lcov.info` - LCOV format for CI integration
- `coverage/coverage-final.json` - JSON format for programmatic analysis

### Coverage Targets

- **Statements**: 90%+
- **Branches**: 85%+
- **Functions**: 90%+
- **Lines**: 90%+

## Debugging Tests

### VSCode Debugging

To debug tests in VSCode, create a `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug All Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--config", "jest.config.js", "--runInBand"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Current Test File",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--config", "jest.config.js", "${file}"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Console Debugging

Add console.log statements or use Node.js debugging:

```bash
# Debug with Node.js
node --inspect-brk node_modules/.bin/jest --config jest.config.js --runInBand
```

## Best Practices

### Test Organization

1. **Describe blocks**: Use nested describe blocks to organize tests logically
2. **Test naming**: Use descriptive test names that explain what is being tested
3. **Setup and teardown**: Use beforeEach/afterEach for test isolation
4. **Mocking**: Mock external dependencies and VSCode APIs

### Test Data

1. **Realistic data**: Use realistic sample data that reflects actual usage
2. **Edge cases**: Include edge cases and error scenarios
3. **Data isolation**: Ensure test data doesn't interfere between tests

### Assertions

1. **Specific assertions**: Use specific assertions rather than generic ones
2. **Error testing**: Test both success and error scenarios
3. **Async testing**: Properly handle async operations with await/async

### Performance

1. **Test isolation**: Ensure tests don't affect each other's performance
2. **Cleanup**: Properly clean up resources after tests
3. **Timing**: Use appropriate timeouts for async operations

## Troubleshooting

### Common Issues

1. **Module resolution errors**: Ensure TypeScript paths are configured correctly
2. **Mock failures**: Check that VSCode APIs are properly mocked
3. **Async timeouts**: Increase timeout values for slow operations
4. **File system permissions**: Ensure test directories are writable

### Debugging Steps

1. **Check logs**: Review console output for error messages
2. **Run individually**: Run failing tests in isolation
3. **Check mocks**: Verify that mocks are set up correctly
4. **Validate data**: Ensure test data is in the correct format

### Performance Issues

1. **Large datasets**: Reduce dataset size for initial debugging
2. **Memory leaks**: Check for proper cleanup in teardown
3. **Slow operations**: Use appropriate timeout values

## Contributing

When adding new tests:

1. Follow the existing test structure and naming conventions
2. Add appropriate mocks for new VSCode APIs
3. Include both positive and negative test scenarios
4. Update documentation for new test categories
5. Ensure coverage targets are maintained

## CI/CD Integration

The test suite is designed to work with CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: |
    npm install
    node test-runner.js coverage
    
- name: Upload Coverage
  uses: codecov/codecov-action@v1
  with:
    file: ./coverage/lcov.info
```

This comprehensive test suite ensures the Goalie VSCode extension works reliably across all supported scenarios and provides a solid foundation for continued development and maintenance.