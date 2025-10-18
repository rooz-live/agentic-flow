# Testing Documentation

## Overview

AgentDB uses Jest for comprehensive testing of the plugin system and core functionality. This document covers testing strategies, patterns, and guidelines for the advanced learning plugins.

## Test Structure

```
tests/
├── plugins/
│   ├── unit/               # Unit tests for individual plugins
│   │   ├── qlearning.test.ts
│   │   ├── sarsa.test.ts
│   │   ├── actor-critic.test.ts
│   │   ├── decision-tree.test.ts
│   │   ├── federated-learning.test.ts          # NEW
│   │   ├── curriculum-learning.test.ts         # NEW
│   │   ├── active-learning.test.ts             # NEW
│   │   ├── adversarial-training.test.ts        # NEW
│   │   ├── neural-architecture-search.test.ts  # NEW
│   │   └── multi-task-learning.test.ts         # NEW
│   ├── integration/        # Integration tests
│   └── benchmarks/         # Performance benchmarks
└── setup.ts               # Test utilities and helpers
```

## Running Tests

### All Tests
```bash
npm test
```

### Plugin Tests Only
```bash
npm test -- --testPathPattern=plugins
```

### Specific Plugin
```bash
npm test -- --testPathPattern=plugins/unit/federated-learning
```

### With Coverage
```bash
npm run test:coverage
```

### Watch Mode
```bash
npm run test:watch
```

## Advanced Plugin Tests

### 1. Federated Learning Plugin

**File**: `tests/plugins/unit/federated-learning.test.ts`

**Test Categories**:
- ✅ Initialization with different aggregation strategies (FedAvg, FedProx, FedOpt, SCAFFOLD)
- ✅ Client registration and management
- ✅ Local model training
- ✅ Federated aggregation across multiple clients
- ✅ Differential privacy preservation
- ✅ Byzantine fault tolerance
- ✅ Communication rounds tracking
- ✅ Large-scale federated training performance
- ✅ Edge cases (non-existent clients, varying data sizes)

**Key Test Patterns**:
```typescript
it('should aggregate updates from multiple clients (FedAvg)', async () => {
  await plugin.registerClient('client_1');
  await plugin.registerClient('client_2');
  await plugin.registerClient('client_3');

  // Train locally on each client
  await plugin.trainLocalModel('client_1', experiences, 3);
  await plugin.trainLocalModel('client_2', experiences, 3);
  await plugin.trainLocalModel('client_3', experiences, 3);

  // Aggregate updates
  await plugin.aggregateUpdates(['client_1', 'client_2', 'client_3']);
});
```

### 2. Curriculum Learning Plugin

**File**: `tests/plugins/unit/curriculum-learning.test.ts`

**Test Categories**:
- ✅ Initialization with different strategies (automatic, predefined, self-paced, teacher-student)
- ✅ Task difficulty estimation from experiences
- ✅ Curriculum stage management
- ✅ Self-paced learning progression
- ✅ Automatic curriculum generation
- ✅ Competence tracking per task
- ✅ Success rate requirements for progression
- ✅ Learning speedup validation
- ✅ Edge cases (empty tasks, single task, no metadata)

**Key Test Patterns**:
```typescript
it('should distinguish easy from hard tasks', async () => {
  const easyTask = createEasyExperiences();
  const hardTask = createHardExperiences();

  for (const exp of [...easyTask, ...hardTask]) {
    await plugin.storeExperience(exp);
  }

  await plugin.train({ epochs: 10 });
  // Plugin should automatically order tasks by difficulty
});
```

### 3. Active Learning Plugin

**File**: `tests/plugins/unit/active-learning.test.ts`

**Test Categories**:
- ✅ Initialization with different query strategies
- ✅ Unlabeled sample management
- ✅ Uncertainty sampling
- ✅ Margin sampling
- ✅ Query-by-committee
- ✅ Diversity sampling
- ✅ Labeling budget tracking and enforcement
- ✅ Integration with training loop
- ✅ Large-scale query selection performance
- ✅ Edge cases (empty pool, zero budget, requesting more than available)

**Key Test Patterns**:
```typescript
it('should select most uncertain samples', async () => {
  // Add labeled training data
  await plugin.train({ epochs: 5 });

  // Add unlabeled samples
  for (let i = 0; i < 30; i++) {
    await plugin.addUnlabeledSample(randomState());
  }

  // Select batch
  const batch = await plugin.selectQueryBatch(5);

  expect(batch.length).toBeGreaterThan(0);
  batch.forEach(sample => {
    expect(sample.uncertainty).toBeDefined();
  });
});
```

### 4. Adversarial Training Plugin

**File**: `tests/plugins/unit/adversarial-training.test.ts`

**Test Categories**:
- ✅ Initialization with different attack types (FGSM, PGD, DeepFool, C&W, Boundary)
- ✅ FGSM adversarial example generation
- ✅ PGD adversarial example generation
- ✅ DeepFool adversarial example generation
- ✅ Epsilon constraint validation
- ✅ Adversarial training with mixed clean/adversarial data
- ✅ Robustness testing
- ✅ Clean vs robust accuracy trade-offs
- ✅ Edge cases (zero epsilon, edge state values, empty test set)

**Key Test Patterns**:
```typescript
it('should generate PGD adversarial example', async () => {
  const state = [0.5, 0.5, 0.5, 0.5];
  const advExample = await plugin.generateAdversarialExample(state, 0);

  expect(advExample.attackType).toBe('pgd');
  expect(advExample.adversarial).toBeDefined();

  // Check epsilon constraint
  const maxPert = Math.max(...advExample.perturbation.map(Math.abs));
  expect(maxPert).toBeLessThanOrEqual(0.1); // epsilon
});
```

### 5. Neural Architecture Search Plugin

**File**: `tests/plugins/unit/neural-architecture-search.test.ts`

**Test Categories**:
- ✅ Initialization with different search strategies (evolutionary, RL controller, random, Bayesian)
- ✅ Evolutionary search progression
- ✅ Best architecture tracking
- ✅ Fitness improvement over generations
- ✅ Population diversity maintenance
- ✅ Architecture encoding validation
- ✅ Mutation and crossover operations
- ✅ Fitness evaluation
- ✅ Architecture export/import (JSON)
- ✅ Performance with large populations
- ✅ Edge cases (zero generations, small populations, constrained search space)

**Key Test Patterns**:
```typescript
it('should improve fitness over generations', async () => {
  await plugin.train({ epochs: 3 });
  const fitness1 = plugin.getBestArchitecture()!.fitness;

  await plugin.train({ epochs: 7 });
  const fitness2 = plugin.getBestArchitecture()!.fitness;

  // Fitness should improve or stay the same
  expect(fitness2).toBeGreaterThanOrEqual(fitness1);
});
```

### 6. Multi-Task Learning Plugin

**File**: `tests/plugins/unit/multi-task-learning.test.ts`

**Test Categories**:
- ✅ Initialization with different sharing strategies (hard, soft, cross-stitch, sluice)
- ✅ Task management (add, track, prioritize)
- ✅ Task statistics and performance tracking
- ✅ Multi-task training
- ✅ Uncertainty-based task weighting
- ✅ Gradient normalization
- ✅ Task relationship computation
- ✅ Task-specific predictions
- ✅ Performance with many tasks
- ✅ Edge cases (single task, no experiences, mixed priorities)

**Key Test Patterns**:
```typescript
it('should train across multiple tasks', async () => {
  plugin.addTask('classification', 'Classification', 1.0, false);
  plugin.addTask('regression', 'Regression', 0.9, false);
  plugin.addTask('auxiliary', 'Features', 0.5, true);

  // Store experiences for each task
  for (const exp of allExperiences) {
    await plugin.storeExperience(exp);
  }

  const metrics = await plugin.train({ epochs: 10 });
  expect(metrics.experiencesProcessed).toBeGreaterThan(0);
});
```

## Test Helpers

### MockSQLiteVectorDB

Located in `tests/plugins/setup.ts`, provides a mock vector database for testing:

```typescript
const db = new MockSQLiteVectorDB();
await db.insert(vector, metadata);
const results = await db.search(queryVector, k);
```

### Data Generators

```typescript
// Generate training data
const data = generateTrainingData(samples: 100, dimensions: 4);

// Generate classification data
const data = generateClassificationData(samples: 100, dimensions: 4, classes: 3);
```

### Performance Timer

```typescript
const timer = new PerformanceTimer();
timer.start();
// ... operation ...
const duration = timer.stop();
expect(duration).toBeLessThan(1000); // 1 second
```

## Writing New Tests

### Test Structure Template

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { YourPlugin } from '../../../src/plugins/implementations/your-plugin';
import type { Experience } from '../../../src/plugins/learning-plugin.interface';

describe('YourPlugin', () => {
  let plugin: YourPlugin;

  beforeEach(() => {
    plugin = new YourPlugin({
      // config
    });
  });

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      expect(plugin).toBeDefined();
    });
  });

  describe('Core Functionality', () => {
    it('should perform core operation', async () => {
      // Arrange
      const input = createTestInput();

      // Act
      const result = await plugin.coreOperation(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.value).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const start = performance.now();
      await plugin.process(largeDataset);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input', async () => {
      await plugin.process([]);
      expect(plugin).toBeDefined();
    });
  });
});
```

## Best Practices

### 1. Arrange-Act-Assert Pattern

Always structure tests with clear sections:

```typescript
it('should calculate correctly', () => {
  // Arrange
  const input = [1, 2, 3];
  const expected = 6;

  // Act
  const result = sum(input);

  // Assert
  expect(result).toBe(expected);
});
```

### 2. Test Independence

Each test should be independent and not rely on others:

```typescript
beforeEach(() => {
  // Reset state before each test
  plugin = new YourPlugin();
});
```

### 3. Meaningful Descriptions

Use descriptive test names that explain intent:

```typescript
// Good
it('should improve fitness over generations', async () => { ... });

// Bad
it('test fitness', async () => { ... });
```

### 4. Test Edge Cases

Always test boundary conditions:

```typescript
describe('Edge Cases', () => {
  it('should handle empty input');
  it('should handle very large input');
  it('should handle invalid input');
  it('should handle zero values');
});
```

### 5. Performance Tests

Include performance benchmarks:

```typescript
it('should complete within time limit', async () => {
  const start = performance.now();
  await plugin.largeOperation();
  const duration = performance.now() - start;

  expect(duration).toBeLessThan(5000); // 5 seconds
});
```

## Test-Driven Development (TDD)

For new plugins, follow TDD workflow:

1. **Write failing tests** that define expected behavior
2. **Implement minimal code** to make tests pass
3. **Refactor** while keeping tests green
4. **Repeat** for each feature

Example:

```typescript
// Step 1: Write test (RED)
it('should aggregate client updates', async () => {
  await plugin.registerClient('c1');
  await plugin.trainLocalModel('c1', data);
  await plugin.aggregateUpdates(['c1']);
  // Test fails - method not implemented
});

// Step 2: Implement (GREEN)
async aggregateUpdates(clientIds: string[]) {
  // Minimal implementation
}

// Step 3: Refactor (REFACTOR)
async aggregateUpdates(clientIds: string[]) {
  // Optimized implementation
}
```

## Coverage Requirements

Aim for:
- **Unit tests**: 80%+ coverage
- **Integration tests**: Key workflows covered
- **Edge cases**: All boundary conditions tested
- **Performance**: Critical paths benchmarked

Check coverage:
```bash
npm run test:coverage
```

## Common Test Patterns

### Testing Async Operations

```typescript
it('should process asynchronously', async () => {
  const result = await plugin.asyncOperation();
  expect(result).toBeDefined();
});
```

### Testing Error Handling

```typescript
it('should throw on invalid input', async () => {
  await expect(
    plugin.process(invalidInput)
  ).rejects.toThrow('Invalid input');
});
```

### Testing State Changes

```typescript
it('should update internal state', async () => {
  const before = plugin.getState();
  await plugin.update(newData);
  const after = plugin.getState();

  expect(after).not.toEqual(before);
});
```

### Testing Callbacks/Events

```typescript
it('should emit event on completion', async () => {
  const callback = jest.fn();
  plugin.onComplete(callback);

  await plugin.execute();

  expect(callback).toHaveBeenCalled();
});
```

## Continuous Integration

Tests run automatically on:
- Every commit (pre-commit hook)
- Pull requests
- Main branch merges

Ensure all tests pass before submitting PR:
```bash
npm test && npm run lint && npm run typecheck
```

## Troubleshooting Tests

### Tests Timeout

Increase timeout for slow operations:
```typescript
it('should complete eventually', async () => {
  // ... long operation
}, 30000); // 30 second timeout
```

### Flaky Tests

Avoid timing-dependent assertions:
```typescript
// Bad - might fail randomly
await wait(100);
expect(value).toBe(expected);

// Good - wait for condition
await waitUntil(() => value === expected);
```

### Memory Leaks

Clean up resources:
```typescript
afterEach(() => {
  plugin.cleanup();
  jest.clearAllMocks();
});
```

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [TDD Guide](https://github.com/testdouble/contributing-tests/wiki/Test-Driven-Development)

## Contributing

When adding new plugins:

1. Create test file in `tests/plugins/unit/`
2. Follow existing test patterns
3. Ensure >80% coverage
4. Document test categories
5. Add performance benchmarks
6. Test all edge cases

See [CONTRIBUTING.md](../CONTRIBUTING.md) for full guidelines.
