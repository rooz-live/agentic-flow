# Learning Plugin API Reference

> **Complete API documentation for the SQLite Vector Learning Plugin System**

---

## Table of Contents

- [Plugin Interface](#plugin-interface)
- [PluginRegistry](#pluginregistry)
- [Configuration Schema](#configuration-schema)
- [CLI Commands](#cli-commands)
- [Extension Points](#extension-points)
- [Type Definitions](#type-definitions)
- [Error Handling](#error-handling)

---

## Plugin Interface

### `LearningPlugin`

The core interface that all plugins must implement.

```typescript
interface LearningPlugin {
  // Metadata
  name: string;
  version: string;
  config: PluginConfig;

  // Lifecycle methods
  initialize(config: PluginConfig): Promise<void>;
  destroy(): Promise<void>;

  // Experience management
  storeExperience(experience: Experience): Promise<void>;
  storeBatch(experiences: Experience[]): Promise<void>;
  retrieveSimilar(state: Vector, k: number): Promise<Experience[]>;

  // Action selection
  selectAction(state: Vector, context?: Context): Promise<Action>;

  // Training
  train(options?: TrainOptions): Promise<TrainingMetrics>;
  shouldTrain(): Promise<boolean>;

  // Metrics & introspection
  getMetrics(): Promise<PluginMetrics>;
  getConfig(): PluginConfig;

  // Persistence
  save(path: string): Promise<void>;
  load(path: string): Promise<void>;
}
```

#### Methods

##### `initialize(config: PluginConfig): Promise<void>`

Initialize the plugin with configuration.

**Parameters:**
- `config: PluginConfig` - Plugin configuration object

**Example:**
```typescript
const plugin = new QLearningPlugin();
await plugin.initialize({
  name: 'my-q-learner',
  algorithm: {
    type: 'q-learning',
    learning_rate: 0.001,
    discount_factor: 0.99
  },
  storage: {
    path: './.rl/my-plugin.db'
  }
});
```

##### `destroy(): Promise<void>`

Clean up resources and close connections.

**Example:**
```typescript
await plugin.destroy();
```

##### `storeExperience(experience: Experience): Promise<void>`

Store a single experience (state, action, reward, next state).

**Parameters:**
- `experience: Experience` - The experience to store

**Example:**
```typescript
await plugin.storeExperience({
  state: [0.1, 0.2, 0.3, ...],
  action: { id: 'action-1', embedding: [...] },
  reward: 1.0,
  nextState: [0.15, 0.25, 0.35, ...],
  done: false,
  metadata: {
    episodeId: 'episode-1',
    stepIndex: 0,
    timestamp: Date.now()
  }
});
```

##### `storeBatch(experiences: Experience[]): Promise<void>`

Store multiple experiences in a transaction (faster for bulk operations).

**Parameters:**
- `experiences: Experience[]` - Array of experiences

**Example:**
```typescript
await plugin.storeBatch([
  { state: [...], action: {...}, reward: 1.0, nextState: [...], done: false },
  { state: [...], action: {...}, reward: 0.5, nextState: [...], done: false },
  { state: [...], action: {...}, reward: -1.0, nextState: [...], done: true }
]);
```

##### `retrieveSimilar(state: Vector, k: number): Promise<Experience[]>`

Retrieve k most similar experiences to given state.

**Parameters:**
- `state: Vector` - Query state embedding
- `k: number` - Number of similar experiences to retrieve

**Returns:** `Promise<Experience[]>` - Array of similar experiences

**Example:**
```typescript
const similar = await plugin.retrieveSimilar(currentState, 5);
console.log(`Found ${similar.length} similar experiences`);
```

##### `selectAction(state: Vector, context?: Context): Promise<Action>`

Select an action given current state.

**Parameters:**
- `state: Vector` - Current state embedding
- `context?: Context` - Optional context information

**Returns:** `Promise<Action>` - Selected action

**Example:**
```typescript
const action = await plugin.selectAction(
  stateEmbedding,
  {
    desiredReturn: 0.9,
    explorationRate: 0.1
  }
);

console.log('Selected action:', action.id);
console.log('Confidence:', action.confidence);
```

##### `train(options?: TrainOptions): Promise<TrainingMetrics>`

Train the plugin on collected experiences.

**Parameters:**
- `options?: TrainOptions` - Optional training configuration

**Returns:** `Promise<TrainingMetrics>` - Training metrics

**Example:**
```typescript
const metrics = await plugin.train({
  epochs: 10,
  batchSize: 32,
  validationSplit: 0.2
});

console.log('Loss:', metrics.loss);
console.log('Avg Q-value:', metrics.avgQValue);
console.log('Epsilon:', metrics.epsilon);
```

##### `shouldTrain(): Promise<boolean>`

Check if plugin should train now based on collected experiences.

**Returns:** `Promise<boolean>` - True if should train

**Example:**
```typescript
if (await plugin.shouldTrain()) {
  await plugin.train();
}
```

##### `getMetrics(): Promise<PluginMetrics>`

Get current plugin metrics and statistics.

**Returns:** `Promise<PluginMetrics>` - Plugin metrics

**Example:**
```typescript
const metrics = await plugin.getMetrics();
console.log('Total experiences:', metrics.totalExperiences);
console.log('Success rate:', metrics.successRate);
console.log('Avg reward:', metrics.avgReward);
console.log('Training iterations:', metrics.trainingIterations);
```

##### `getConfig(): PluginConfig`

Get plugin configuration.

**Returns:** `PluginConfig` - Current configuration

**Example:**
```typescript
const config = plugin.getConfig();
console.log('Learning rate:', config.algorithm.learning_rate);
```

##### `save(path: string): Promise<void>`

Save plugin state to file.

**Parameters:**
- `path: string` - File path to save to

**Example:**
```typescript
await plugin.save('./checkpoints/my-plugin-v1.0.checkpoint');
```

##### `load(path: string): Promise<void>`

Load plugin state from file.

**Parameters:**
- `path: string` - File path to load from

**Example:**
```typescript
await plugin.load('./checkpoints/my-plugin-v1.0.checkpoint');
```

---

## PluginRegistry

Manages plugin discovery, loading, and lifecycle.

```typescript
class PluginRegistry {
  static load(name: string, config?: PluginConfig): Promise<LearningPlugin>;
  static list(): string[];
  static register(name: string, factory: PluginFactory): void;
  static unregister(name: string): void;
  static exists(name: string): boolean;
  static getInfo(name: string): PluginInfo;
}
```

### Methods

#### `static load(name: string, config?: PluginConfig): Promise<LearningPlugin>`

Load a plugin by name.

**Parameters:**
- `name: string` - Plugin name
- `config?: PluginConfig` - Optional custom configuration

**Returns:** `Promise<LearningPlugin>` - Loaded plugin instance

**Example:**
```typescript
import { PluginRegistry } from '@agentic-flow/agentdb/plugins';

// Load with default config
const plugin = await PluginRegistry.load('q-learning');

// Load with custom config
const customPlugin = await PluginRegistry.load('q-learning', {
  algorithm: { learning_rate: 0.0005 }
});
```

#### `static list(): string[]`

List all available plugins.

**Returns:** `string[]` - Array of plugin names

**Example:**
```typescript
const plugins = PluginRegistry.list();
console.log('Available plugins:', plugins);
// ['decision-transformer', 'q-learning', 'sarsa', 'actor-critic', ...]
```

#### `static register(name: string, factory: PluginFactory): void`

Register a custom plugin.

**Parameters:**
- `name: string` - Plugin name
- `factory: PluginFactory` - Plugin factory function

**Example:**
```typescript
PluginRegistry.register('my-custom-plugin', (config) => {
  return new MyCustomPlugin(config);
});
```

#### `static unregister(name: string): void`

Unregister a plugin.

**Parameters:**
- `name: string` - Plugin name to unregister

**Example:**
```typescript
PluginRegistry.unregister('my-custom-plugin');
```

#### `static exists(name: string): boolean`

Check if plugin exists.

**Parameters:**
- `name: string` - Plugin name

**Returns:** `boolean` - True if plugin exists

**Example:**
```typescript
if (PluginRegistry.exists('q-learning')) {
  const plugin = await PluginRegistry.load('q-learning');
}
```

#### `static getInfo(name: string): PluginInfo`

Get plugin information.

**Parameters:**
- `name: string` - Plugin name

**Returns:** `PluginInfo` - Plugin metadata

**Example:**
```typescript
const info = PluginRegistry.getInfo('q-learning');
console.log('Name:', info.name);
console.log('Version:', info.version);
console.log('Description:', info.description);
console.log('Base algorithm:', info.baseAlgorithm);
```

---

## Configuration Schema

### `PluginConfig`

Complete plugin configuration interface.

```typescript
interface PluginConfig {
  // Metadata
  name: string;
  version: string;
  author?: string;
  description: string;
  base_algorithm: 'decision_transformer' | 'q_learning' | 'sarsa' | 'actor_critic' | 'custom';

  // Algorithm configuration
  algorithm: AlgorithmConfig;

  // State representation
  state?: StateConfig;

  // Action space
  action?: ActionConfig;

  // Reward configuration
  reward?: RewardConfig;

  // Experience replay
  experience_replay?: ExperienceReplayConfig;

  // Storage
  storage: StorageConfig;

  // Training
  training: TrainingConfig;

  // Monitoring
  monitoring?: MonitoringConfig;

  // Extensions
  extensions?: ExtensionConfig[];
}
```

### `AlgorithmConfig`

Algorithm-specific configuration.

```typescript
interface AlgorithmConfig {
  type: string;
  learning_rate: number;
  discount_factor?: number;
  epsilon_start?: number;
  epsilon_end?: number;
  epsilon_decay?: number;
  [key: string]: any;  // Algorithm-specific params
}
```

**Example:**
```yaml
algorithm:
  type: q-learning
  learning_rate: 0.001
  discount_factor: 0.99
  epsilon_start: 1.0
  epsilon_end: 0.01
  epsilon_decay: 0.995
```

### `StateConfig`

State representation configuration.

```typescript
interface StateConfig {
  embedding_model?: string;
  dimension: number;
  preprocessing?: ('normalize' | 'reduce_dim' | 'augment')[];
}
```

**Example:**
```yaml
state:
  embedding_model: sentence-transformers/all-MiniLM-L6-v2
  dimension: 384
  preprocessing:
    - normalize
    - reduce_dim
```

### `ActionConfig`

Action space configuration.

```typescript
interface ActionConfig {
  type: 'discrete' | 'continuous';
  space_size?: number;              // For discrete
  space_bounds?: [number, number][]; // For continuous
  selection_strategy: string;
}
```

**Example:**
```yaml
action:
  type: discrete
  space_size: 100
  selection_strategy: epsilon_greedy
```

### `RewardConfig`

Reward function configuration.

```typescript
interface RewardConfig {
  type: 'success_based' | 'time_aware' | 'token_aware' | 'custom';
  function?: string;  // JavaScript function code
  shaping?: {
    gamma: number;
    lambda: number;
  };
}
```

**Example:**
```yaml
reward:
  type: custom
  function: |
    function computeReward(outcome, context) {
      const base = outcome.success ? 1.0 : -1.0;
      const timePenalty = -0.1 * (context.duration / 1000);
      return base + timePenalty;
    }
```

### `ExperienceReplayConfig`

Experience replay configuration.

```typescript
interface ExperienceReplayConfig {
  type: 'none' | 'uniform' | 'prioritized';
  capacity: number;
  alpha?: number;        // Prioritization exponent
  beta?: number;         // Importance sampling
  beta_increment?: number;
}
```

**Example:**
```yaml
experience_replay:
  type: prioritized
  capacity: 10000
  alpha: 0.6
  beta: 0.4
  beta_increment: 0.001
```

### `StorageConfig`

Storage backend configuration.

```typescript
interface StorageConfig {
  backend: 'agentdb';
  path: string;
  hnsw?: {
    enabled: boolean;
    M: number;
    efConstruction: number;
    efSearch?: number;
  };
  quantization?: {
    enabled: boolean;
    bits: 8 | 16;
  };
}
```

**Example:**
```yaml
storage:
  backend: agentdb
  path: ./.rl/my-plugin.db
  hnsw:
    enabled: true
    M: 16
    efConstruction: 200
    efSearch: 50
```

### `TrainingConfig`

Training configuration.

```typescript
interface TrainingConfig {
  batch_size: number;
  epochs?: number;
  validation_split?: number;
  early_stopping_patience?: number;
  min_experiences: number;
  train_every?: number;
  online?: boolean;
}
```

**Example:**
```yaml
training:
  batch_size: 32
  epochs: 10
  validation_split: 0.2
  min_experiences: 100
  train_every: 4
  online: false
```

### `MonitoringConfig`

Monitoring and logging configuration.

```typescript
interface MonitoringConfig {
  track_metrics: string[];
  log_interval: number;
  save_checkpoints: boolean;
  checkpoint_interval?: number;
  wandb?: {
    enabled: boolean;
    project: string;
    entity?: string;
  };
}
```

**Example:**
```yaml
monitoring:
  track_metrics:
    - success_rate
    - avg_reward
    - epsilon
    - loss
  log_interval: 10
  save_checkpoints: true
  checkpoint_interval: 50
```

---

## CLI Commands

### `create-plugin`

Create a new learning plugin.

```bash
npx agentdb create-plugin [options]

Options:
  --template <name>     Use a template (decision-transformer, q-learning, etc.)
  --name <name>         Plugin name
  --no-customize        Skip customization prompts
  --output <dir>        Output directory (default: ./plugins)
  -h, --help           Display help

Examples:
  npx agentdb create-plugin
  npx agentdb create-plugin --template q-learning --name my-q
  npx agentdb create-plugin --output ./custom-plugins
```

### `list-templates`

List available plugin templates.

```bash
npx agentdb list-templates [options]

Options:
  --detailed           Show detailed information
  --category <name>    Filter by category
  --json              Output as JSON
  -h, --help          Display help

Examples:
  npx agentdb list-templates
  npx agentdb list-templates --detailed
  npx agentdb list-templates --category reinforcement-learning
  npx agentdb list-templates --json
```

### `use-plugin`

Load and use a plugin.

```bash
npx agentdb use-plugin <name> [options]

Options:
  --config <file>     Custom configuration file
  --test             Run in test mode
  --verbose          Verbose output
  -h, --help         Display help

Examples:
  npx agentdb use-plugin my-plugin
  npx agentdb use-plugin my-plugin --config custom.yaml
  npx agentdb use-plugin my-plugin --test --verbose
```

### `test-plugin`

Test a plugin.

```bash
npx agentdb test-plugin <name> [options]

Options:
  --coverage         Generate coverage report
  --benchmark        Run performance benchmarks
  --verbose         Verbose output
  -h, --help        Display help

Examples:
  npx agentdb test-plugin my-plugin
  npx agentdb test-plugin my-plugin --coverage
  npx agentdb test-plugin my-plugin --benchmark
```

### `plugin-info`

Get information about a plugin.

```bash
npx agentdb plugin-info <name> [options]

Options:
  --json            Output as JSON
  -h, --help       Display help

Examples:
  npx agentdb plugin-info q-learning
  npx agentdb plugin-info my-plugin --json
```

### `validate-plugin`

Validate plugin configuration.

```bash
npx agentdb validate-plugin <name> [options]

Options:
  --fix             Attempt to fix validation errors
  --strict         Use strict validation
  -h, --help       Display help

Examples:
  npx agentdb validate-plugin my-plugin
  npx agentdb validate-plugin my-plugin --fix
  npx agentdb validate-plugin my-plugin --strict
```

---

## Extension Points

### Custom Reward Functions

Implement custom reward computation logic.

```typescript
interface RewardFunction {
  compute(outcome: Outcome, context: Context): number;
}

class CustomRewardFunction implements RewardFunction {
  constructor(private config: any) {}

  compute(outcome: Outcome, context: Context): number {
    // Custom logic
    const baseReward = outcome.success ? 1.0 : -1.0;
    const timePenalty = this.config.time_weight * (context.duration / 1000);
    const qualityBonus = outcome.quality * this.config.quality_weight;

    return baseReward - timePenalty + qualityBonus;
  }
}
```

### Custom State Preprocessing

Implement custom state preprocessing.

```typescript
interface StatePreprocessor {
  preprocess(state: Vector): Vector;
}

class DimensionReducer implements StatePreprocessor {
  constructor(private targetDim: number) {}

  preprocess(state: Vector): Vector {
    // PCA or autoencoder
    return reduceDimensions(state, this.targetDim);
  }
}
```

### Custom Action Selection

Implement custom action selection strategies.

```typescript
interface ActionSelector {
  selectAction(state: Vector, qValues: number[]): Promise<Action>;
}

class UCBSelector implements ActionSelector {
  async selectAction(state: Vector, qValues: number[]): Promise<Action> {
    // Upper Confidence Bound
    const counts = await this.getActionCounts();
    const ucbValues = qValues.map((q, i) =>
      q + Math.sqrt(2 * Math.log(this.totalCount) / counts[i])
    );
    return argmax(ucbValues);
  }
}
```

### Plugin Extensions

Register custom extensions.

```typescript
export class CuriosityExtension {
  name = 'curiosity-driven-exploration';

  augmentReward(reward: number, state: Vector, nextState: Vector): number {
    const prediction = this.forwardModel.predict(state);
    const predictionError = mse(prediction, nextState);
    const intrinsicReward = this.config.weight * predictionError;
    return reward + intrinsicReward;
  }

  train(batch: Experience[]): void {
    // Train forward and inverse models
  }
}

// Register extension
PluginRegistry.registerExtension('curiosity-driven-exploration', CuriosityExtension);
```

---

## Type Definitions

### `Vector`

```typescript
type Vector = number[];
```

### `Experience`

```typescript
interface Experience {
  state: Vector;
  action: Action;
  reward: number;
  nextState: Vector;
  done: boolean;
  metadata?: {
    episodeId?: string;
    stepIndex?: number;
    timestamp?: number;
    [key: string]: any;
  };
}
```

### `Action`

```typescript
interface Action {
  id: string;
  embedding?: Vector;
  confidence?: number;
  metadata?: any;
}
```

### `Context`

```typescript
interface Context {
  desiredReturn?: number;
  explorationRate?: number;
  temperature?: number;
  [key: string]: any;
}
```

### `TrainOptions`

```typescript
interface TrainOptions {
  epochs?: number;
  batchSize?: number;
  validationSplit?: number;
  earlyStoppingPatience?: number;
  verbose?: boolean;
}
```

### `TrainingMetrics`

```typescript
interface TrainingMetrics {
  loss: number;
  avgQValue?: number;
  epsilon?: number;
  accuracy?: number;
  validationLoss?: number;
  [key: string]: number | undefined;
}
```

### `PluginMetrics`

```typescript
interface PluginMetrics {
  totalExperiences: number;
  successRate: number;
  avgReward: number;
  trainingIterations: number;
  epsilon?: number;
  [key: string]: number | undefined;
}
```

### `Outcome`

```typescript
interface Outcome {
  success: boolean;
  quality?: number;
  duration?: number;
  tokensUsed?: number;
  codeComplexity?: number;
  [key: string]: any;
}
```

### `PluginInfo`

```typescript
interface PluginInfo {
  name: string;
  version: string;
  description: string;
  baseAlgorithm: string;
  author?: string;
  status: 'ready' | 'loading' | 'error';
}
```

---

## Error Handling

### Common Errors

#### `PluginNotFoundError`

Thrown when plugin cannot be found.

```typescript
try {
  const plugin = await PluginRegistry.load('non-existent');
} catch (error) {
  if (error instanceof PluginNotFoundError) {
    console.error('Plugin not found:', error.pluginName);
  }
}
```

#### `ConfigurationValidationError`

Thrown when plugin configuration is invalid.

```typescript
try {
  await plugin.initialize(invalidConfig);
} catch (error) {
  if (error instanceof ConfigurationValidationError) {
    console.error('Validation errors:', error.errors);
  }
}
```

#### `StorageError`

Thrown when storage operations fail.

```typescript
try {
  await plugin.storeExperience(experience);
} catch (error) {
  if (error instanceof StorageError) {
    console.error('Storage failed:', error.message);
  }
}
```

#### `TrainingError`

Thrown when training fails.

```typescript
try {
  await plugin.train();
} catch (error) {
  if (error instanceof TrainingError) {
    console.error('Training failed:', error.message);
    console.error('Last metrics:', error.lastMetrics);
  }
}
```

### Error Handling Best Practices

```typescript
async function safePluginUsage() {
  let plugin: LearningPlugin | null = null;

  try {
    // Load plugin
    plugin = await PluginRegistry.load('my-plugin');

    // Initialize
    await plugin.initialize(config);

    // Use plugin
    const action = await plugin.selectAction(state);
    const outcome = await executeAction(action);

    // Store experience with retry
    let retries = 3;
    while (retries > 0) {
      try {
        await plugin.storeExperience({
          state,
          action,
          reward: outcome.success ? 1.0 : -1.0,
          nextState: outcome.nextState,
          done: outcome.done
        });
        break;
      } catch (error) {
        if (error instanceof StorageError && retries > 1) {
          await sleep(1000);
          retries--;
        } else {
          throw error;
        }
      }
    }

    // Train if needed
    if (await plugin.shouldTrain()) {
      try {
        const metrics = await plugin.train();
        console.log('Training complete:', metrics);
      } catch (error) {
        console.error('Training failed, will retry next time');
      }
    }

  } catch (error) {
    console.error('Plugin error:', error);
  } finally {
    // Cleanup
    if (plugin) {
      await plugin.destroy();
    }
  }
}
```

---

## Complete Example

```typescript
import {
  PluginRegistry,
  LearningPlugin,
  Experience,
  Action,
  Context
} from '@agentic-flow/agentdb/plugins';

async function completeLearningExample() {
  // 1. Load plugin
  const plugin = await PluginRegistry.load('q-learning', {
    algorithm: {
      learning_rate: 0.001,
      discount_factor: 0.99
    },
    storage: {
      path: './.rl/example.db'
    },
    training: {
      batch_size: 32,
      min_experiences: 100,
      train_every: 4
    }
  });

  // 2. Initialize
  await plugin.initialize(plugin.config);

  // 3. Run episodes
  for (let episode = 0; episode < 100; episode++) {
    let state = await getInitialState();
    let done = false;

    while (!done) {
      // Select action
      const action = await plugin.selectAction(state, {
        explorationRate: 0.1
      });

      // Execute action
      const outcome = await executeAction(action);

      // Store experience
      await plugin.storeExperience({
        state,
        action,
        reward: outcome.reward,
        nextState: outcome.nextState,
        done: outcome.done
      });

      // Train if needed
      if (await plugin.shouldTrain()) {
        const metrics = await plugin.train();
        console.log(`Episode ${episode}, Loss: ${metrics.loss}`);
      }

      state = outcome.nextState;
      done = outcome.done;
    }
  }

  // 4. Get final metrics
  const metrics = await plugin.getMetrics();
  console.log('Final metrics:', metrics);

  // 5. Save checkpoint
  await plugin.save('./checkpoints/final.checkpoint');

  // 6. Cleanup
  await plugin.destroy();
}
```

---

## Support

- **GitHub Issues**: https://github.com/ruvnet/agentic-flow/issues
- **Documentation**: https://github.com/ruvnet/agentic-flow/tree/main/packages/agentdb
- **Examples**: https://github.com/agentic-flow/agentdb-plugins

---

**Last Updated:** 2025-10-17
**Version:** 1.0.0
