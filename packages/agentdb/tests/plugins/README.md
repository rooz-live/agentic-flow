# SQLite Vector Plugin Tests

Comprehensive test suite for the learning plugin system.

## Test Structure

```
tests/plugins/
├── setup.ts                          # Test utilities and mocks
├── unit/                            # Unit tests
│   ├── plugin-interface.test.ts     # Plugin interface validation
│   ├── plugin-registry.test.ts      # Registry management
│   ├── plugin-validator.test.ts     # Configuration validation
│   ├── decision-tree.test.ts        # Decision tree implementation
│   ├── qlearning.test.ts           # Q-Learning implementation
│   ├── sarsa.test.ts               # SARSA implementation
│   └── actor-critic.test.ts        # Actor-Critic implementation
├── integration/                     # Integration tests
│   └── plugin-lifecycle.test.ts    # Plugin loading and execution
├── cli/                            # CLI wizard tests
│   └── wizard.test.ts              # Interactive plugin creation
├── templates/                      # Template validation
│   └── validation.test.ts          # Template configuration tests
└── benchmarks/                     # Performance benchmarks
    └── performance.test.ts         # Performance and scalability

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm test -- unit/
```

### Integration Tests
```bash
npm test -- integration/
```

### Performance Benchmarks
```bash
npm test -- benchmarks/
```

### With Coverage
```bash
npm test -- --coverage
```

## Test Categories

### Unit Tests
- **Plugin Interface**: Validates plugin structure and types
- **Plugin Registry**: Tests plugin registration and retrieval
- **Plugin Validator**: Configuration and schema validation
- **Decision Tree**: Supervised learning classifier
- **Q-Learning**: Off-policy reinforcement learning
- **SARSA**: On-policy reinforcement learning
- **Actor-Critic**: Policy gradient methods

### Integration Tests
- Plugin lifecycle (init → train → predict → save → load)
- Plugin loading from files
- Plugin discovery
- Cross-plugin communication
- Error handling and recovery

### CLI Tests
- Interactive wizard for plugin creation
- Configuration prompts and validation
- Template selection
- Input validation

### Template Tests
- Template structure validation
- Configuration schema enforcement
- Default value verification
- Custom template support

### Performance Benchmarks
- Training performance (small/medium/large datasets)
- Prediction throughput
- Memory usage analysis
- Database operation performance
- Algorithm comparison
- Scalability tests

## Test Utilities

### MockSQLiteVectorDB
Simulates vector database operations for testing:
- `insert(vector, metadata)`: Add vectors
- `search(vector, k)`: Find nearest neighbors
- `update(id, vector, metadata)`: Update vectors
- `delete(id)`: Remove vectors

### Data Generators
- `generateTrainingData(samples, dimensions)`: RL training data
- `generateClassificationData(samples, dimensions, classes)`: Classification data

### Performance Utilities
- `PerformanceTimer`: Measure execution time
- `measureMemory()`: Track memory usage

## Coverage Goals

- **Statements**: >80%
- **Branches**: >75%
- **Functions**: >80%
- **Lines**: >80%

## Writing Tests

### Basic Structure
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MockSQLiteVectorDB } from '../setup';

describe('MyPlugin', () => {
  let plugin: MyPlugin;
  let db: MockSQLiteVectorDB;

  beforeEach(() => {
    plugin = new MyPlugin();
    db = new MockSQLiteVectorDB();
  });

  it('should initialize correctly', async () => {
    await plugin.initialize({}, db);
    expect(plugin).toBeDefined();
  });
});
```

### Test Checklist
- [ ] Initialization with default/custom config
- [ ] Training with valid/invalid data
- [ ] Prediction accuracy and edge cases
- [ ] Save/load state persistence
- [ ] Error handling
- [ ] Performance benchmarks
- [ ] Memory efficiency

## Continuous Integration

Tests run automatically on:
- Pull requests
- Commits to main branch
- Release tags

## Debugging Tests

### Run Single Test File
```bash
npm test -- decision-tree.test.ts
```

### Run Specific Test
```bash
npm test -- -t "should train on simple dataset"
```

### Watch Mode
```bash
npm test -- --watch
```

### Verbose Output
```bash
npm test -- --reporter=verbose
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Clarity**: Use descriptive test names
3. **Coverage**: Test happy paths and edge cases
4. **Performance**: Keep unit tests fast (<100ms)
5. **Mocking**: Use MockSQLiteVectorDB for database operations
6. **Assertions**: One primary assertion per test
7. **Cleanup**: Use beforeEach/afterEach for setup/teardown

## Contributing

When adding new plugins:
1. Create unit test file in `unit/`
2. Add integration test cases
3. Include performance benchmarks
4. Update this README
5. Ensure >80% coverage

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://testingjavascript.com/)
- [Plugin System Documentation](../../docs/plugins/)
