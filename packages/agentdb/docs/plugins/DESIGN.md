# Extensible Vector-Based Learning Plugin Architecture

Design document for a plugin system that allows users to create custom learning methodologies using vector databases, with an interactive wizard for configuration.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Plugin System](#plugin-system)
- [Wizard Interface](#wizard-interface)
- [Template Library](#template-library)
- [Configuration Schema](#configuration-schema)
- [Extension Points](#extension-points)
- [Usage Examples](#usage-examples)
- [Implementation Roadmap](#implementation-roadmap)

---

## Overview

### Vision

Enable developers and researchers to **create custom learning methodologies** without deep ML expertise by:

1. **Plugin Architecture**: Modular system for plugging in custom learning algorithms
2. **Interactive Wizard**: Step-by-step CLI wizard to configure learning methods
3. **Template Library**: Pre-built templates for common RL algorithms (Q-learning, Decision Transformer, SARSA, etc.)
4. **Vector-Based Storage**: Leverage agentdb for efficient experience storage and retrieval
5. **No-Code Customization**: Configure algorithms through YAML/JSON, no coding required

### Use Cases

**1. Researcher**: "I want to try a custom reward shaping strategy"
```bash
$ npx agentdb create-plugin
? Select base algorithm: Decision Transformer
? Reward strategy: Custom
? Define reward function: reward = 2*success - 0.1*time - 0.01*tokens
✓ Created plugin: custom-dt-reward-shaped
```

**2. Developer**: "I want Q-learning with prioritized experience replay"
```bash
$ npx agentdb create-plugin
? Select base algorithm: Q-Learning
? Experience replay: Prioritized (by TD error)
? Priority alpha: 0.6
? Priority beta: 0.4
✓ Created plugin: q-learning-prioritized
```

**3. Team Lead**: "I want to A/B test different learning strategies"
```bash
$ npx agentdb create-plugin --template comparative
? Strategy A: Decision Transformer
? Strategy B: Q-Learning with eligibility traces
? Evaluation metric: Success rate after 1K samples
✓ Created plugin: ab-test-dt-vs-q-learning
```

---

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                    Learning Plugin System                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │
│  │   Template    │  │    Wizard     │  │   Plugin      │   │
│  │   Library     │  │   Interface   │  │   Registry    │   │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘   │
│          │                   │                   │            │
│          └───────────────────┼───────────────────┘            │
│                              │                                │
│  ┌───────────────────────────┴───────────────────────────┐   │
│  │              Plugin Base Interface                    │   │
│  │  - initialize()      - selectAction()                 │   │
│  │  - storeExperience() - train()                        │   │
│  │  - getMetrics()      - save()/load()                  │   │
│  └───────────────────────────┬───────────────────────────┘   │
│                              │                                │
│  ┌──────────┬────────┬───────┴────────┬──────────┐          │
│  │          │        │                │          │           │
│  │  Q-      │ SARSA  │   Decision     │  Custom  │           │
│  │  Learning│        │   Transformer  │  Plugin  │           │
│  │          │        │                │          │           │
│  └──────────┴────────┴────────────────┴──────────┘          │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                   SQLite Vector Store                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  • Experience storage (trajectories, Q-values)      │    │
│  │  • HNSW index for similarity search                 │    │
│  │  • Efficient batch operations                       │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

**1. Plugin Base Interface** (`LearningPlugin`)
```typescript
interface LearningPlugin {
  name: string;
  version: string;
  config: PluginConfig;

  // Lifecycle
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

  // Metrics & introspection
  getMetrics(): Promise<PluginMetrics>;
  getConfig(): PluginConfig;

  // Persistence
  save(path: string): Promise<void>;
  load(path: string): Promise<void>;
}
```

**2. Template Library** (`TemplateRegistry`)
- Pre-built configurations for common algorithms
- Validated schemas with documentation
- Easy customization through wizard

**3. Wizard Interface** (`PluginWizard`)
- Interactive CLI for plugin creation
- Step-by-step configuration
- Validation and defaults
- Code generation

**4. Plugin Registry** (`PluginRegistry`)
- Discover and load plugins
- Version management
- Dependency resolution

---

## Plugin System

### Plugin Structure

```
my-learning-plugin/
├── plugin.yaml           # Plugin configuration
├── README.md            # Documentation
├── src/
│   ├── index.ts         # Main entry point
│   ├── agent.ts         # Learning agent implementation
│   ├── reward.ts        # Reward function
│   └── policy.ts        # Policy/action selection
├── tests/
│   └── plugin.test.ts   # Unit tests
└── package.json         # Dependencies
```

### Plugin Configuration (`plugin.yaml`)

```yaml
# Plugin metadata
name: q-learning-prioritized
version: 1.0.0
author: John Doe
description: Q-Learning with prioritized experience replay
base_algorithm: q-learning

# Algorithm configuration
algorithm:
  type: q-learning
  learning_rate: 0.001
  discount_factor: 0.99
  epsilon_start: 1.0
  epsilon_end: 0.01
  epsilon_decay: 0.995

# Experience replay
experience_replay:
  type: prioritized
  capacity: 10000
  alpha: 0.6              # Priority exponent
  beta: 0.4               # Importance sampling exponent
  beta_increment: 0.001   # Beta annealing

# Reward shaping
reward:
  type: custom
  function: |
    function computeReward(outcome, context) {
      const baseReward = outcome.success ? 1.0 : -1.0;
      const timePenalty = -0.1 * (context.duration / 1000);
      const tokenPenalty = -0.01 * (context.tokensUsed / 100);
      return baseReward + timePenalty + tokenPenalty;
    }

# State representation
state:
  embedding_model: sentence-transformers/all-MiniLM-L6-v2
  dimension: 384
  preprocessing:
    - normalize
    - reduce_dim

# Action space
action:
  type: discrete
  space_size: 100         # Number of discrete actions (patterns)
  selection_strategy: epsilon_greedy

# Storage
storage:
  backend: agentdb
  path: ./.rl/q-learning-prioritized.db
  hnsw:
    enabled: true
    M: 16
    efConstruction: 200
  quantization:
    enabled: false

# Training
training:
  batch_size: 32
  epochs: 10
  validation_split: 0.2
  early_stopping_patience: 3
  min_experiences: 100
  train_every: 100        # Train after every N experiences

# Monitoring
monitoring:
  track_metrics:
    - success_rate
    - avg_reward
    - epsilon
    - loss
    - q_values
  log_interval: 10        # Log every N episodes
  save_checkpoints: true
  checkpoint_interval: 50

# Extensions
extensions:
  - name: curiosity-driven-exploration
    enabled: true
    config:
      intrinsic_reward_weight: 0.1
  - name: hindsight-experience-replay
    enabled: false
```

### Base Plugin Implementation

```typescript
// src/index.ts
import { LearningPlugin, PluginConfig, Experience, Vector, Action } from 'agentdb/plugins';
import { AgentDBDB } from 'agentdb';

export class QLearningPrioritizedPlugin implements LearningPlugin {
  name = 'q-learning-prioritized';
  version = '1.0.0';
  config: PluginConfig;

  private vectorDB: AgentDBDB;
  private qTable: Map<string, number[]>;
  private epsilon: number;
  private replayBuffer: PrioritizedReplayBuffer;

  async initialize(config: PluginConfig): Promise<void> {
    this.config = config;
    this.epsilon = config.algorithm.epsilon_start;

    // Initialize vector database
    this.vectorDB = new AgentDBDB({
      path: config.storage.path,
      hnsw: config.storage.hnsw
    });

    // Initialize replay buffer
    this.replayBuffer = new PrioritizedReplayBuffer({
      capacity: config.experience_replay.capacity,
      alpha: config.experience_replay.alpha,
      beta: config.experience_replay.beta
    });

    // Initialize Q-table
    this.qTable = new Map();
  }

  async storeExperience(experience: Experience): Promise<void> {
    // Store in vector database
    await this.vectorDB.insert({
      embedding: experience.state,
      metadata: {
        action: experience.action,
        reward: experience.reward,
        nextState: experience.nextState,
        done: experience.done,
        timestamp: Date.now()
      }
    });

    // Compute TD error for priority
    const tdError = this.computeTDError(experience);

    // Add to prioritized replay buffer
    this.replayBuffer.add(experience, tdError);
  }

  async selectAction(state: Vector, context?: any): Promise<Action> {
    // Epsilon-greedy action selection
    if (Math.random() < this.epsilon) {
      // Explore: random action
      return this.randomAction();
    } else {
      // Exploit: best Q-value
      const qValues = await this.getQValues(state);
      return this.argmax(qValues);
    }
  }

  async train(options?: any): Promise<any> {
    const metrics = {
      loss: 0,
      avgQValue: 0,
      epsilon: this.epsilon
    };

    for (let epoch = 0; epoch < this.config.training.epochs; epoch++) {
      // Sample prioritized batch
      const batch = this.replayBuffer.sample(this.config.training.batch_size);

      // Compute Q-learning updates
      for (const experience of batch) {
        const currentQ = await this.getQValue(experience.state, experience.action);
        const nextQ = await this.getMaxQValue(experience.nextState);
        const targetQ = experience.reward + this.config.algorithm.discount_factor * nextQ;

        // Update Q-value
        const loss = Math.pow(targetQ - currentQ, 2);
        await this.updateQValue(experience.state, experience.action, targetQ);

        // Update priority
        const tdError = Math.abs(targetQ - currentQ);
        this.replayBuffer.updatePriority(experience.id, tdError);

        metrics.loss += loss;
      }

      // Decay epsilon
      this.epsilon = Math.max(
        this.config.algorithm.epsilon_end,
        this.epsilon * this.config.algorithm.epsilon_decay
      );
    }

    return metrics;
  }

  private computeTDError(experience: Experience): number {
    const currentQ = this.getQValueSync(experience.state, experience.action);
    const nextQ = this.getMaxQValueSync(experience.nextState);
    const targetQ = experience.reward + this.config.algorithm.discount_factor * nextQ;
    return Math.abs(targetQ - currentQ);
  }

  // ... additional methods
}

// Export plugin factory
export default function createPlugin(config: PluginConfig): LearningPlugin {
  return new QLearningPrioritizedPlugin();
}
```

---

## Wizard Interface

### CLI Wizard

**Interactive plugin creation**:

```bash
$ npx agentdb create-plugin

┌───────────────────────────────────────────────────────────────┐
│                                                               │
│        SQLite Vector Learning Plugin Wizard                  │
│        Create custom learning methodologies                   │
│                                                               │
└───────────────────────────────────────────────────────────────┘

? Plugin name: my-custom-learner
? Description: Custom learning algorithm with reward shaping
? Base algorithm:
  ❯ Decision Transformer (recommended for sequential tasks)
    Q-Learning (model-free, value-based)
    SARSA (on-policy Q-learning variant)
    Actor-Critic (policy gradient + value function)
    Custom (start from scratch)

? Configure Decision Transformer:

  State Configuration:
  ? State embedding dimension: 768 (default)
  ? State preprocessing: normalize, reduce_dim

  Action Configuration:
  ? Action space type: discrete (pattern selection)
  ? Number of actions: 100
  ? Action selection strategy:
    ❯ 3-tier (exact → interpolation → neural)
      epsilon-greedy
      softmax
      UCB

  Reward Configuration:
  ? Reward function:
    ❯ Success-based (1 for success, -1 for failure)
      Time-aware (penalize long execution)
      Token-aware (penalize high token usage)
      Custom (write JavaScript function)

  → You selected: Custom
  ? Enter reward function:
  │ function computeReward(outcome, context) {
  │   const base = outcome.success ? 1.0 : -1.0;
  │   const timePenalty = -0.1 * (context.duration / 1000);
  │   const tokenPenalty = -0.01 * (context.tokensUsed / 100);
  │   return base + timePenalty + tokenPenalty;
  │ }

  Training Configuration:
  ? Batch size: 32
  ? Training epochs: 10
  ? Min experiences before training: 100
  ? Train every N experiences: 100

  Storage Configuration:
  ? Database path: ./.rl/my-custom-learner.db
  ? Enable HNSW index: Yes
  ? HNSW M parameter: 16
  ? Enable quantization: No

✓ Plugin configuration complete!

? What would you like to do next?
  ❯ Generate plugin code
    Save configuration only
    Test configuration
    Cancel

→ You selected: Generate plugin code

✓ Created plugin structure at ./plugins/my-custom-learner/
✓ Generated plugin.yaml
✓ Generated src/index.ts
✓ Generated src/reward.ts
✓ Generated tests/plugin.test.ts
✓ Generated README.md

? Install dependencies now? Yes

✓ Dependencies installed

┌───────────────────────────────────────────────────────────────┐
│                    Plugin Created Successfully!                │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Plugin: my-custom-learner                                    │
│  Location: ./plugins/my-custom-learner                        │
│                                                               │
│  Next steps:                                                  │
│  1. Review generated code: cd plugins/my-custom-learner       │
│  2. Run tests: npm test                                       │
│  3. Use plugin: npx agentdb use-plugin my-custom-learner│
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Wizard Implementation

```typescript
// wizard/cli.ts
import inquirer from 'inquirer';
import chalk from 'chalk';
import { generatePlugin } from './generator';

export async function runWizard(): Promise<void> {
  console.log(chalk.cyan.bold('\n  SQLite Vector Learning Plugin Wizard\n'));

  // Step 1: Plugin metadata
  const metadata = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Plugin name:',
      validate: (input) => /^[a-z0-9-]+$/.test(input) || 'Use lowercase letters, numbers, and hyphens only'
    },
    {
      type: 'input',
      name: 'description',
      message: 'Description:'
    }
  ]);

  // Step 2: Base algorithm selection
  const algorithm = await inquirer.prompt([
    {
      type: 'list',
      name: 'base',
      message: 'Base algorithm:',
      choices: [
        { name: 'Decision Transformer (recommended for sequential tasks)', value: 'decision_transformer' },
        { name: 'Q-Learning (model-free, value-based)', value: 'q_learning' },
        { name: 'SARSA (on-policy Q-learning variant)', value: 'sarsa' },
        { name: 'Actor-Critic (policy gradient + value function)', value: 'actor_critic' },
        { name: 'Custom (start from scratch)', value: 'custom' }
      ]
    }
  ]);

  // Step 3: Algorithm-specific configuration
  let algoConfig;
  switch (algorithm.base) {
    case 'decision_transformer':
      algoConfig = await configureDecisionTransformer();
      break;
    case 'q_learning':
      algoConfig = await configureQLearning();
      break;
    // ... other cases
  }

  // Step 4: Reward function
  const reward = await configureReward();

  // Step 5: Storage configuration
  const storage = await configureStorage();

  // Step 6: Training configuration
  const training = await configureTraining();

  // Step 7: Generate plugin
  const config = {
    ...metadata,
    algorithm: { ...algorithm, ...algoConfig },
    reward,
    storage,
    training
  };

  const actions = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do next?',
      choices: [
        { name: 'Generate plugin code', value: 'generate' },
        { name: 'Save configuration only', value: 'save' },
        { name: 'Test configuration', value: 'test' },
        { name: 'Cancel', value: 'cancel' }
      ]
    }
  ]);

  if (actions.action === 'generate') {
    await generatePlugin(config);
    console.log(chalk.green.bold('\n✓ Plugin created successfully!\n'));
  }
}

async function configureDecisionTransformer(): Promise<any> {
  return await inquirer.prompt([
    {
      type: 'number',
      name: 'state_dimension',
      message: 'State embedding dimension:',
      default: 768
    },
    {
      type: 'number',
      name: 'action_dimension',
      message: 'Action embedding dimension:',
      default: 768
    },
    {
      type: 'number',
      name: 'hidden_size',
      message: 'Hidden layer size:',
      default: 256
    },
    {
      type: 'list',
      name: 'action_selection',
      message: 'Action selection strategy:',
      choices: [
        { name: '3-tier (exact → interpolation → neural)', value: '3_tier' },
        { name: 'epsilon-greedy', value: 'epsilon_greedy' },
        { name: 'softmax', value: 'softmax' },
        { name: 'UCB', value: 'ucb' }
      ]
    }
  ]);
}

async function configureReward(): Promise<any> {
  const type = await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: 'Reward function:',
      choices: [
        { name: 'Success-based (1 for success, -1 for failure)', value: 'success_based' },
        { name: 'Time-aware (penalize long execution)', value: 'time_aware' },
        { name: 'Token-aware (penalize high token usage)', value: 'token_aware' },
        { name: 'Custom (write JavaScript function)', value: 'custom' }
      ]
    }
  ]);

  if (type.type === 'custom') {
    const custom = await inquirer.prompt([
      {
        type: 'editor',
        name: 'function',
        message: 'Enter reward function (JavaScript):',
        default: `function computeReward(outcome, context) {
  const base = outcome.success ? 1.0 : -1.0;
  const timePenalty = -0.1 * (context.duration / 1000);
  const tokenPenalty = -0.01 * (context.tokensUsed / 100);
  return base + timePenalty + tokenPenalty;
}`
      }
    ]);
    return { ...type, ...custom };
  }

  return type;
}

// ... additional configuration functions
```

---

## Template Library

### Built-in Templates

**1. Decision Transformer (Default)**
```yaml
# templates/decision-transformer.yaml
name: decision-transformer
description: Sequence modeling approach to RL (recommended)
algorithm:
  type: decision_transformer
  state_dim: 768
  action_dim: 768
  hidden_size: 256
  learning_rate: 0.001
action_selection:
  strategy: 3_tier
  exact_threshold: 0.99
  interpolation_threshold: 0.95
  interpolation_k: 5
storage:
  hnsw:
    enabled: true
    M: 16
training:
  batch_size: 32
  epochs: 10
  min_experiences: 100
```

**2. Q-Learning with Experience Replay**
```yaml
# templates/q-learning.yaml
name: q-learning
description: Model-free value-based learning
algorithm:
  type: q_learning
  learning_rate: 0.001
  discount_factor: 0.99
  epsilon_start: 1.0
  epsilon_end: 0.01
  epsilon_decay: 0.995
experience_replay:
  type: uniform
  capacity: 10000
  min_size: 100
training:
  batch_size: 32
  train_every: 4
```

**3. SARSA (On-Policy)**
```yaml
# templates/sarsa.yaml
name: sarsa
description: On-policy variant of Q-learning
algorithm:
  type: sarsa
  learning_rate: 0.001
  discount_factor: 0.99
  epsilon: 0.1
  lambda: 0.9              # Eligibility traces
experience_replay:
  type: none               # SARSA is on-policy
training:
  online: true
```

**4. Actor-Critic**
```yaml
# templates/actor-critic.yaml
name: actor-critic
description: Policy gradient with value function baseline
algorithm:
  type: actor_critic
  actor_lr: 0.0001
  critic_lr: 0.001
  discount_factor: 0.99
  gae_lambda: 0.95         # Generalized Advantage Estimation
policy:
  type: gaussian
  entropy_coefficient: 0.01
training:
  batch_size: 32
  ppo_epochs: 10
  ppo_clip: 0.2
```

**5. Curiosity-Driven Exploration**
```yaml
# templates/curiosity.yaml
name: curiosity-driven
description: Intrinsic motivation for exploration
base: decision_transformer
extensions:
  curiosity:
    enabled: true
    intrinsic_reward_weight: 0.1
    forward_model:
      type: neural
      hidden_size: 128
    inverse_model:
      type: neural
      hidden_size: 128
```

### Template Usage

```bash
# List available templates
$ npx agentdb list-templates

Available templates:
  • decision-transformer (recommended)
  • q-learning
  • sarsa
  • actor-critic
  • curiosity-driven
  • hierarchical-rl
  • multi-task
  • meta-learning

# Create plugin from template
$ npx agentdb create-plugin --template q-learning
? Plugin name: my-q-learner
? Customize configuration? Yes
...

# Use template without customization
$ npx agentdb create-plugin --template decision-transformer --name my-dt --no-customize
✓ Created plugin: my-dt (using decision-transformer template)
```

---

## Configuration Schema

### Complete Schema Definition

```typescript
// schema.ts
interface PluginConfig {
  // Metadata
  name: string;
  version: string;
  author?: string;
  description: string;
  base_algorithm: 'decision_transformer' | 'q_learning' | 'sarsa' | 'actor_critic' | 'custom';

  // Algorithm configuration
  algorithm: {
    type: string;
    [key: string]: any;   // Algorithm-specific params
  };

  // State representation
  state: {
    embedding_model?: string;
    dimension: number;
    preprocessing?: ('normalize' | 'reduce_dim' | 'augment')[];
  };

  // Action space
  action: {
    type: 'discrete' | 'continuous';
    space_size?: number;              // For discrete
    space_bounds?: [number, number][]; // For continuous
    selection_strategy: string;
  };

  // Reward configuration
  reward: {
    type: 'success_based' | 'time_aware' | 'token_aware' | 'custom';
    function?: string;                // JavaScript function code
    shaping?: {
      gamma: number;
      lambda: number;
    };
  };

  // Experience replay
  experience_replay?: {
    type: 'none' | 'uniform' | 'prioritized';
    capacity: number;
    alpha?: number;                   // Prioritization exponent
    beta?: number;                    // Importance sampling
    beta_increment?: number;
  };

  // Storage
  storage: {
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
  };

  // Training
  training: {
    batch_size: number;
    epochs?: number;
    validation_split?: number;
    early_stopping_patience?: number;
    min_experiences: number;
    train_every?: number;             // Train every N experiences
    online?: boolean;                 // Online vs offline
  };

  // Monitoring
  monitoring?: {
    track_metrics: string[];
    log_interval: number;
    save_checkpoints: boolean;
    checkpoint_interval?: number;
    wandb?: {
      enabled: boolean;
      project: string;
      entity?: string;
    };
  };

  // Extensions
  extensions?: {
    name: string;
    enabled: boolean;
    config: any;
  }[];
}
```

### JSON Schema for Validation

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Learning Plugin Configuration",
  "type": "object",
  "required": ["name", "version", "description", "base_algorithm", "algorithm", "storage", "training"],
  "properties": {
    "name": {
      "type": "string",
      "pattern": "^[a-z0-9-]+$",
      "minLength": 3,
      "maxLength": 50
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$"
    },
    "description": {
      "type": "string",
      "minLength": 10,
      "maxLength": 200
    },
    "base_algorithm": {
      "type": "string",
      "enum": ["decision_transformer", "q_learning", "sarsa", "actor_critic", "custom"]
    },
    "algorithm": {
      "type": "object",
      "required": ["type"],
      "properties": {
        "type": { "type": "string" },
        "learning_rate": { "type": "number", "minimum": 0, "maximum": 1 },
        "discount_factor": { "type": "number", "minimum": 0, "maximum": 1 }
      }
    },
    "training": {
      "type": "object",
      "required": ["batch_size", "min_experiences"],
      "properties": {
        "batch_size": { "type": "integer", "minimum": 1, "maximum": 1024 },
        "epochs": { "type": "integer", "minimum": 1, "maximum": 1000 },
        "min_experiences": { "type": "integer", "minimum": 10 }
      }
    }
  }
}
```

---

## Extension Points

### Custom Reward Functions

**Plugin hook**:
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
    return baseReward - timePenalty;
  }
}
```

### Custom State Preprocessing

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

**Register custom extensions**:
```typescript
// extensions/curiosity.ts
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

## Usage Examples

### Example 1: Create Q-Learning Plugin

```bash
$ npx agentdb create-plugin --template q-learning --name my-q-learner

? Customize configuration? Yes
? Learning rate: 0.001
? Discount factor (gamma): 0.99
? Epsilon (exploration rate): 0.1
? Experience replay capacity: 10000
? Batch size: 32
? Train every N experiences: 4

✓ Plugin created: my-q-learner
```

**Use the plugin**:
```typescript
import { PluginRegistry } from 'agentdb/plugins';

// Load plugin
const plugin = await PluginRegistry.load('my-q-learner');

// Use in ReasoningBank
async function executeTask(task: Task) {
  const state = await embedTask(task);

  // Select action using plugin
  const action = await plugin.selectAction(state);

  // Execute action
  const outcome = await executeAction(action);

  // Store experience
  await plugin.storeExperience({
    state,
    action,
    reward: outcome.success ? 1.0 : -1.0,
    nextState: await embedTask(outcome.nextState),
    done: outcome.done
  });

  // Train periodically
  if (await plugin.shouldTrain()) {
    await plugin.train();
  }
}
```

### Example 2: Custom Reward Shaping

```bash
$ npx agentdb create-plugin

? Base algorithm: Decision Transformer
? Reward function: Custom
? Enter reward function:
│ function computeReward(outcome, context) {
│   // Base reward
│   let reward = outcome.success ? 1.0 : -1.0;
│
│   // Time penalty (encourage faster solutions)
│   reward -= 0.1 * (context.duration / 1000);
│
│   // Token penalty (encourage efficiency)
│   reward -= 0.01 * (context.tokensUsed / 100);
│
│   // Complexity bonus (encourage simpler solutions)
│   reward += 0.05 * (1 - outcome.codeComplexity);
│
│   return reward;
│ }
```

### Example 3: A/B Test Different Strategies

```typescript
import { PluginRegistry, ABTestRunner } from 'agentdb/plugins';

// Load plugins
const pluginA = await PluginRegistry.load('decision-transformer');
const pluginB = await PluginRegistry.load('q-learning');

// Run A/B test
const tester = new ABTestRunner({
  plugins: [pluginA, pluginB],
  tasks: testTasks,
  metrics: ['success_rate', 'avg_reward', 'sample_efficiency']
});

const results = await tester.run();

console.log('A/B Test Results:');
console.log('Plugin A (DT):', results.pluginA);
console.log('Plugin B (Q):', results.pluginB);
console.log('Winner:', results.winner);

// Output:
// Plugin A (DT): { success_rate: 0.928, avg_reward: 0.85, sample_efficiency: 2000 }
// Plugin B (Q):  { success_rate: 0.895, avg_reward: 0.78, sample_efficiency: 10000 }
// Winner: decision-transformer (5x more sample efficient)
```

### Example 4: Multi-Task Learning

```yaml
# plugin.yaml
name: multi-task-learner
base_algorithm: decision_transformer

# Task-specific configurations
tasks:
  code_generation:
    reward_weight: 1.0
    state_dim: 768
  bug_fixing:
    reward_weight: 1.5      # Higher importance
    state_dim: 768
  refactoring:
    reward_weight: 0.8
    state_dim: 768

# Shared layers
shared_layers:
  - type: dense
    size: 512
  - type: dense
    size: 256

# Task-specific heads
task_heads:
  code_generation:
    - type: dense
      size: 768
  bug_fixing:
    - type: dense
      size: 768
  refactoring:
    - type: dense
      size: 768
```

---

## Implementation Roadmap

### Phase 1: Core Plugin System (Week 1-2)

**Deliverables**:
- [ ] Define `LearningPlugin` interface
- [ ] Implement `PluginRegistry` for discovery and loading
- [ ] Create base plugin template
- [ ] Add plugin validation
- [ ] Write comprehensive tests

**Files**:
```
packages/agentdb/src/plugins/
├── interface.ts          # LearningPlugin interface
├── registry.ts           # PluginRegistry implementation
├── base-plugin.ts        # BasePlugin abstract class
└── validator.ts          # Configuration validator
```

### Phase 2: Template Library (Week 2-3)

**Deliverables**:
- [ ] Implement Decision Transformer template
- [ ] Implement Q-Learning template
- [ ] Implement SARSA template
- [ ] Implement Actor-Critic template
- [ ] Create template documentation

**Files**:
```
packages/agentdb/templates/
├── decision-transformer.yaml
├── q-learning.yaml
├── sarsa.yaml
├── actor-critic.yaml
└── README.md
```

### Phase 3: CLI Wizard (Week 3-4)

**Deliverables**:
- [ ] Build interactive CLI with inquirer
- [ ] Implement configuration wizard flow
- [ ] Add code generation from config
- [ ] Create project scaffolding
- [ ] Add validation and error handling

**Files**:
```
packages/agentdb/wizard/
├── cli.ts                # Main CLI entry
├── prompts/
│   ├── metadata.ts
│   ├── algorithm.ts
│   ├── reward.ts
│   └── storage.ts
├── generator.ts          # Code generation
└── templates/            # Code templates
```

### Phase 4: Extensions & Integrations (Week 4-5)

**Deliverables**:
- [ ] Implement curiosity-driven exploration extension
- [ ] Implement hindsight experience replay extension
- [ ] Add WandB integration for monitoring
- [ ] Create A/B testing framework
- [ ] Add multi-task learning support

**Files**:
```
packages/agentdb/src/extensions/
├── curiosity.ts
├── hindsight.ts
└── multi-task.ts

packages/agentdb/src/integrations/
├── wandb.ts
└── tensorboard.ts
```

### Phase 5: Documentation & Examples (Week 5-6)

**Deliverables**:
- [ ] Write comprehensive plugin development guide
- [ ] Create 10+ example plugins
- [ ] Record video tutorials
- [ ] Add API documentation
- [ ] Write blog post

**Files**:
```
packages/agentdb/docs/plugins/
├── PLUGIN_DEVELOPMENT.md
├── WIZARD_GUIDE.md
├── EXTENSION_API.md
└── examples/
    ├── custom-reward/
    ├── multi-task/
    └── curiosity-driven/
```

---

## Summary

**What this provides**:

1. **✅ Extensible Plugin Architecture**: Modular system for custom learning algorithms
2. **✅ Interactive Wizard**: Step-by-step CLI for non-experts to create plugins
3. **✅ Template Library**: Pre-built configs for common RL algorithms
4. **✅ Vector-Based Storage**: Leverages agentdb for efficient experience management
5. **✅ No-Code Customization**: Configure through YAML, minimal coding required
6. **✅ Extension Points**: Hooks for custom rewards, preprocessing, action selection
7. **✅ A/B Testing**: Built-in framework to compare strategies
8. **✅ Multi-Task Support**: Share learning across related tasks

**Developer experience**:
```bash
# Create plugin in 2 minutes
$ npx agentdb create-plugin
? Select template: Decision Transformer
? Customize reward: Yes, add time penalty
✓ Plugin created!

# Use immediately
$ npx agentdb use-plugin my-plugin
✓ Plugin loaded and integrated with ReasoningBank
```

**Next steps**:
1. Review and approve this design
2. Start Phase 1 implementation (core plugin system)
3. Iterate based on feedback

---

Would you like me to proceed with implementing Phase 1 (Core Plugin System)?
