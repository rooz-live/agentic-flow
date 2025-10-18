# SQLite Vector Learning Plugin System

## Overview

This directory contains the core plugin system for sqlite-vector learning plugins, enabling developers to create custom learning methodologies without deep ML expertise.

## Architecture

The plugin system consists of four main components:

### 1. Interface (`interface.ts`)
Defines the complete contract for learning plugins:
- **LearningPlugin**: Core interface that all plugins must implement
- **PluginConfig**: Comprehensive configuration schema
- **Experience, Action, Context**: Data structures for RL
- **Training types**: Callbacks, options, and metrics

### 2. Registry (`registry.ts`)
Centralized plugin management:
- Plugin discovery and registration
- Version management
- Dependency resolution
- Plugin lifecycle management
- Singleton pattern for global access

### 3. Base Plugin (`base-plugin.ts`)
Abstract base class providing:
- Common functionality (experience storage, metrics tracking)
- Template method pattern for plugin lifecycle
- Utility methods (vector normalization, cosine similarity)
- Error handling and validation

### 4. Validator (`validator.ts`)
Configuration validation:
- Schema validation for plugin configurations
- Required field checking
- Range validation for numeric parameters
- Warning system for sub-optimal configurations

## Usage

### Creating a Custom Plugin

```typescript
import { BasePlugin, PluginConfig, Action, Vector, Context } from './plugins';

class MyQLearningPlugin extends BasePlugin {
  private qTable: Map<string, number[]> = new Map();

  protected async initializePlugin(config: PluginConfig): Promise<void> {
    // Initialize Q-table, replay buffer, etc.
  }

  protected async cleanupPlugin(): Promise<void> {
    // Cleanup resources
  }

  protected async selectActionInternal(state: Vector, context?: Context): Promise<Action> {
    // Implement epsilon-greedy action selection
    const qValues = this.getQValues(state);
    return this.epsilonGreedy(qValues);
  }

  protected async trainInternal(options?: TrainOptions): Promise<TrainingMetrics> {
    // Implement Q-learning update
    return {
      loss: 0.01,
      avgQValue: 0.5,
      experiencesProcessed: this.totalExperiences,
      duration: 100
    };
  }

  // Implement other abstract methods...
}
```

### Registering a Plugin

```typescript
import { registerPlugin } from './plugins';

registerPlugin({
  name: 'q-learning',
  version: '1.0.0',
  description: 'Q-Learning with experience replay',
  baseAlgorithm: 'q_learning',
  factory: (config) => new MyQLearningPlugin(config),
  defaultConfig: {
    algorithm: {
      type: 'q_learning',
      learningRate: 0.001,
      discountFactor: 0.99
    }
  }
});
```

### Using a Plugin

```typescript
import { loadPlugin } from './plugins';

// Load plugin
const plugin = await loadPlugin('q-learning', {
  config: {
    training: { batchSize: 64 }
  },
  initialize: true
});

// Use for learning
const state = [0.1, 0.2, ...]; // State vector
const action = await plugin.selectAction(state);

// Store experience
await plugin.storeExperience({
  state,
  action,
  reward: 1.0,
  nextState: [0.2, 0.3, ...],
  done: false
});

// Train periodically
if (await shouldTrain()) {
  const metrics = await plugin.train();
  console.log('Training metrics:', metrics);
}
```

### Configuration Validation

```typescript
import { validatePluginConfig, getErrorSummary } from './plugins';

const config = {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'My custom plugin',
  // ... rest of config
};

const result = validatePluginConfig(config);
if (!result.valid) {
  console.error(getErrorSummary(result));
} else {
  console.log('Configuration is valid!');
}
```

## Plugin Lifecycle

```
1. Registration
   └─> registerPlugin() adds metadata to registry

2. Loading
   └─> loadPlugin() creates instance via factory
       └─> initialize() sets up resources
           └─> initializePlugin() (custom initialization)

3. Usage
   └─> selectAction() - choose actions
   └─> storeExperience() - collect experiences
   └─> train() - learn from experiences
   └─> getMetrics() - monitor performance

4. Cleanup
   └─> destroy() releases resources
       └─> cleanupPlugin() (custom cleanup)
```

## Configuration Schema

```typescript
interface PluginConfig {
  // Metadata
  name: string;              // kebab-case, 3-50 chars
  version: string;           // semantic versioning
  description: string;       // 10-200 chars
  baseAlgorithm: string;     // 'decision_transformer' | 'q_learning' | ...

  // Algorithm
  algorithm: {
    type: string;
    learningRate?: number;   // 0 < lr <= 1
    discountFactor?: number; // 0 <= gamma <= 1
  };

  // State representation
  state: {
    dimension: number;       // > 0
    preprocessing?: string[];
  };

  // Action space
  action: {
    type: 'discrete' | 'continuous';
    spaceSize?: number;
    selectionStrategy: string;
  };

  // Reward configuration
  reward: {
    type: 'success_based' | 'time_aware' | 'custom';
    function?: string;       // custom reward function
  };

  // Experience replay
  experienceReplay?: {
    type: 'none' | 'uniform' | 'prioritized';
    capacity: number;
    alpha?: number;
    beta?: number;
  };

  // Storage
  storage: {
    backend: 'sqlite-vector';
    path: string;
    hnsw?: { enabled: boolean; M: number; efConstruction: number; };
  };

  // Training
  training: {
    batchSize: number;       // >= 1
    epochs?: number;
    minExperiences: number;  // >= 1
    trainEvery?: number;
  };

  // Monitoring
  monitoring?: {
    trackMetrics: string[];
    logInterval: number;
    saveCheckpoints: boolean;
  };
}
```

## Best Practices

### 1. Extend BasePlugin
Always extend `BasePlugin` to inherit common functionality:
- Experience storage and retrieval
- Metrics tracking
- Vector utilities
- Error handling

### 2. Validate Configuration
Use the validator before plugin creation:
```typescript
const result = validatePluginConfig(config);
if (!result.valid) {
  throw new Error(getErrorSummary(result));
}
```

### 3. Handle Errors Gracefully
```typescript
protected async trainInternal(options?: TrainOptions): Promise<TrainingMetrics> {
  try {
    // Training logic
  } catch (error) {
    console.error('Training failed:', error);
    throw error; // BasePlugin will wrap with context
  }
}
```

### 4. Track Metrics
Update metrics during operation:
```typescript
protected async storeExperienceInternal(experience: Experience): Promise<void> {
  // Store logic
  this.totalExperiences++; // Automatically tracked by BasePlugin
}
```

### 5. Use Hooks for Custom Logic
Override lifecycle hooks:
```typescript
protected async onInitialize(): Promise<void> {
  // Custom initialization after base setup
}

protected async onStoreExperience(experience: Experience): Promise<void> {
  // Custom logic after experience storage
}
```

## Files

- **`interface.ts`**: Core interfaces and type definitions
- **`registry.ts`**: Plugin registry and management
- **`base-plugin.ts`**: Abstract base class for plugins
- **`validator.ts`**: Configuration validation
- **`index.ts`**: Public API exports
- **`README.md`**: This documentation

## Related

- Design Document: `../../docs/LEARNING_PLUGIN_DESIGN.md`
- Implementation Examples: `./implementations/`
- Tests: `../../../tests/plugins/`

## Version

- Plugin System Version: 1.0.0
- Plugin API Version: 1.0.0
