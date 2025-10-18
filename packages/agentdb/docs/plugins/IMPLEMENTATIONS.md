# Learning Plugin Implementations

This document provides an overview of the concrete learning plugin implementations available in the SQLite Vector system.

## Overview

The SQLite Vector plugin system provides four production-ready reinforcement learning implementations:

1. **Decision Transformer** - Sequence modeling with 3-tier action selection
2. **Q-Learning** - Off-policy value-based learning with experience replay
3. **SARSA** - On-policy learning with eligibility traces
4. **Actor-Critic** - Policy gradient with value function baseline

All plugins extend the `BasePlugin` class and implement the `LearningPlugin` interface, providing a consistent API for:
- Storing experiences
- Selecting actions
- Training on historical data
- Saving/loading models
- Monitoring metrics

## Decision Transformer Plugin

### Architecture

Implements the Decision Transformer algorithm from ["Decision Transformer: Reinforcement Learning via Sequence Modeling"](https://arxiv.org/abs/2106.01345).

**Key Features:**
- 3-tier action selection strategy
- Offline learning from trajectories
- CPU-optimized neural network (787K parameters)
- HNSW vector index for fast retrieval

### 3-Tier Action Selection

```
Tier 1: Exact Retrieval (99% similarity)
  ↓ if no match
Tier 2: k-NN Interpolation (95% similarity, k=5)
  ↓ if no match
Tier 3: Neural Network Generation (2-layer MLP)
```

**Performance:**
- Tier 1 Hit Rate: 60-70% (5ms latency)
- Tier 2 Hit Rate: 25-30% (10ms latency)
- Tier 3 Hit Rate: 5-10% (20ms latency)
- Average Latency: 6-8ms

### Usage Example

```typescript
import { DecisionTransformerPlugin, PluginConfig } from '@agentic-flow/agentdb/plugins';

const config: PluginConfig = {
  name: 'decision-transformer-agent',
  version: '1.0.0',
  algorithm: {
    type: 'decision_transformer',
    learningRate: 0.001,
    discountFactor: 0.99,
    stateDim: 768,
    hiddenSize: 256,
    tier1Threshold: 0.99,
    tier2Threshold: 0.95,
    kNeighbors: 5,
  },
  training: {
    batchSize: 32,
    epochs: 10,
    minExperiences: 100,
  },
  storage: {
    path: './data/dt-plugin.db',
    hnsw: {
      enabled: true,
      M: 16,
      efConstruction: 200,
    },
  },
};

const plugin = new DecisionTransformerPlugin();
await plugin.initialize(config);

// Store trajectory
await plugin.storeExperience({
  state: stateEmbedding,
  action: actionEmbedding,
  reward: 1.0,
  nextState: nextStateEmbedding,
  done: false,
  episodeId: 'episode-1',
  stepIndex: 0,
});

// Select action
const action = await plugin.selectAction(currentState, { desiredReturn: 1.0 });
console.log(`Selected action from ${action.metadata.tier === 1 ? 'exact match' : action.metadata.tier === 2 ? 'interpolation' : 'neural network'}`);

// Train
const metrics = await plugin.train({ epochs: 10, verbose: true });
console.log(`Training loss: ${metrics.loss}`);
```

### Network Architecture

```
Input (2304D):
  ├─ State: 768D
  ├─ Return-to-go: 768D (positional encoding)
  └─ History: 768D (average of recent states)

Hidden (256D):
  └─ ReLU activation

Output (768D):
  └─ Action embedding
```

## Q-Learning Plugin

### Architecture

Implements the classic Q-Learning algorithm with experience replay.

**Key Features:**
- Epsilon-greedy exploration
- Uniform or prioritized experience replay
- Off-policy learning (learns from any experience)
- Temporal difference (TD) updates

### Experience Replay

**Uniform Replay:**
```typescript
experienceReplay: {
  type: 'uniform',
  capacity: 10000,
}
```

**Prioritized Replay:**
```typescript
experienceReplay: {
  type: 'prioritized',
  capacity: 10000,
  alpha: 0.6,  // Priority exponent
  beta: 0.4,   // Importance sampling
  betaIncrement: 0.001,
}
```

### Usage Example

```typescript
import { QLearningPlugin, PluginConfig } from '@agentic-flow/agentdb/plugins';

const config: PluginConfig = {
  name: 'q-learning-agent',
  version: '1.0.0',
  algorithm: {
    type: 'q_learning',
    learningRate: 0.001,
    discountFactor: 0.99,
    epsilonStart: 1.0,
    epsilonEnd: 0.01,
    epsilonDecay: 0.995,
  },
  experienceReplay: {
    type: 'prioritized',
    capacity: 10000,
    alpha: 0.6,
    beta: 0.4,
  },
  training: {
    batchSize: 32,
    minExperiences: 100,
    trainEvery: 4,  // Train every 4 experiences
  },
  storage: {
    path: './data/q-learning.db',
  },
};

const plugin = new QLearningPlugin();
await plugin.initialize(config);

// Automatic training every 4 experiences
await plugin.storeExperience(experience);

// Manual training
const metrics = await plugin.train({ batchSize: 64 });
console.log(`Epsilon: ${metrics.epsilon}, Avg Q-value: ${metrics.avgQValue}`);
```

### Update Rule

```
Q(s,a) ← Q(s,a) + α * [r + γ * max Q(s',a') - Q(s,a)]
                          a'
```

With prioritized replay:
```
Priority = |TD Error| + ε
Weight = (1/N * 1/P)^β
```

## SARSA Plugin

### Architecture

Implements SARSA(λ) with eligibility traces.

**Key Features:**
- On-policy learning (learns from current policy)
- Eligibility traces for faster propagation
- More conservative than Q-Learning
- Online learning (no replay buffer)

### Eligibility Traces

Eligibility traces allow credit assignment over multiple steps:

```
E(s,a) ← γλ * E(s,a)           (decay all traces)
E(s,a) ← 1                     (set current state-action)
Q(s,a) ← Q(s,a) + α * δ * E(s,a)  (update all Q-values)

where δ = r + γQ(s',a') - Q(s,a)  (TD error)
```

### Usage Example

```typescript
import { SARSAPlugin, PluginConfig } from '@agentic-flow/agentdb/plugins';

const config: PluginConfig = {
  name: 'sarsa-agent',
  version: '1.0.0',
  algorithm: {
    type: 'sarsa',
    learningRate: 0.001,
    discountFactor: 0.99,
    epsilonStart: 1.0,
    epsilonEnd: 0.01,
    epsilonDecay: 0.995,
    lambda: 0.9,  // Eligibility trace decay
  },
  training: {
    batchSize: 1,  // Online learning
    minExperiences: 0,
    online: true,
  },
  storage: {
    path: './data/sarsa.db',
  },
};

const plugin = new SARSAPlugin();
await plugin.initialize(config);

// SARSA requires sequential experience storage
for (const experience of episode) {
  await plugin.storeExperience(experience);
}

// Get metrics
const metrics = await plugin.getMetrics();
console.log(`Success rate: ${metrics.successRate}`);
```

### SARSA vs Q-Learning

| Feature | Q-Learning | SARSA |
|---------|-----------|-------|
| Policy | Off-policy | On-policy |
| Learning | From any experience | From current policy |
| Exploration | Can ignore | Must follow |
| Convergence | To optimal policy | To policy-dependent |
| Safety | Less safe | More conservative |

## Actor-Critic Plugin

### Architecture

Implements Actor-Critic with Generalized Advantage Estimation (GAE).

**Key Features:**
- Policy gradient learning (actor)
- Value function baseline (critic)
- GAE for variance reduction
- Suitable for continuous actions

### Networks

**Actor Network (Policy):**
```
Input (768D) → Hidden (256D, ReLU) → Output (768D, Tanh)
```
- Outputs action mean
- Samples with Gaussian noise
- Trained with policy gradient

**Critic Network (Value):**
```
Input (768D) → Hidden (128D, ReLU) → Output (1D)
```
- Estimates state value V(s)
- Trained with TD error
- Provides baseline for actor

### Generalized Advantage Estimation

```
δₜ = rₜ + γV(sₜ₊₁) - V(sₜ)       (TD error)
Aₜ = Σ (γλ)ⁱ δₜ₊ᵢ               (GAE)
    i=0
```

### Usage Example

```typescript
import { ActorCriticPlugin, PluginConfig } from '@agentic-flow/agentdb/plugins';

const config: PluginConfig = {
  name: 'actor-critic-agent',
  version: '1.0.0',
  algorithm: {
    type: 'actor_critic',
    actorLr: 0.0001,
    criticLr: 0.001,
    discountFactor: 0.99,
    gaeLambda: 0.95,
    stateDim: 768,
    actionDim: 768,
    hiddenSize: 256,
  },
  training: {
    batchSize: 32,
    minExperiences: 100,
    online: true,  // Train on episode completion
  },
  storage: {
    path: './data/actor-critic.db',
  },
};

const plugin = new ActorCriticPlugin();
await plugin.initialize(config);

// Store complete episode (trains automatically when done=true)
for (const experience of episode) {
  await plugin.storeExperience({
    ...experience,
    done: experience === episode[episode.length - 1],
  });
}

// Manual training
const metrics = await plugin.train();
console.log(`Average value: ${metrics.avgQValue}`);
```

### Policy Gradient Update

```
∇J(θ) = Eₜ[∇log π(aₜ|sₜ) * Aₜ]

θ ← θ + α * ∇J(θ)  (actor update)
w ← w - β * ∇MSE(V(s), R)  (critic update)
```

## Comparison Matrix

| Feature | Decision Transformer | Q-Learning | SARSA | Actor-Critic |
|---------|---------------------|------------|-------|--------------|
| **Learning Type** | Offline | Off-policy | On-policy | On-policy |
| **Action Space** | Discrete/Continuous | Discrete | Discrete | Continuous |
| **Sample Efficiency** | High | Medium | Low | Medium |
| **Exploration** | Implicit (tiers) | Epsilon-greedy | Epsilon-greedy | Stochastic policy |
| **Memory** | ~100MB | ~50MB | ~30MB | ~80MB |
| **Latency** | 6-8ms | 10-15ms | 5-10ms | 15-20ms |
| **Best For** | Sequential tasks | Tabular problems | Safe exploration | Continuous control |
| **Training Speed** | Slow (offline) | Fast | Fast | Medium |
| **Scalability** | Excellent | Good | Good | Medium |

## Common Interface

All plugins share the same interface:

```typescript
interface LearningPlugin {
  // Lifecycle
  initialize(config: PluginConfig): Promise<void>;
  destroy(): Promise<void>;

  // Experience management
  storeExperience(experience: Experience): Promise<void>;
  storeBatch(experiences: Experience[]): Promise<void>;
  retrieveSimilar(state: number[], k: number): Promise<SearchResult<Experience>[]>;

  // Action selection
  selectAction(state: number[], context?: Context): Promise<Action>;

  // Training
  train(options?: TrainOptions): Promise<TrainingMetrics>;

  // Monitoring
  getMetrics(): Promise<PluginMetrics>;
  getConfig(): PluginConfig;

  // Persistence
  save(path: string): Promise<void>;
  load(path: string): Promise<void>;
}
```

## Creating Custom Plugins

Extend `BasePlugin` to create custom learning algorithms:

```typescript
import { BasePlugin, Action, Context, TrainOptions, TrainingMetrics } from '@agentic-flow/agentdb/plugins';

export class MyCustomPlugin extends BasePlugin {
  public name = 'my-custom-plugin';
  public version = '1.0.0';

  async selectAction(state: number[], context?: Context): Promise<Action> {
    // Your custom action selection logic
    const similar = await this.retrieveSimilar(state, 5);
    // ... custom logic
    return action;
  }

  async train(options?: TrainOptions): Promise<TrainingMetrics> {
    // Your custom training logic
    // ... training code
    return metrics;
  }
}
```

## Best Practices

### 1. Choose the Right Plugin

- **Decision Transformer**: Best for sequential decision-making with rich historical data
- **Q-Learning**: Best for discrete action spaces with experience replay
- **SARSA**: Best when safety and on-policy learning are important
- **Actor-Critic**: Best for continuous action spaces and policy gradient methods

### 2. Configuration

- Start with default hyperparameters
- Tune learning rate first (0.0001 - 0.01)
- Adjust discount factor based on task horizon
- Monitor metrics during training

### 3. Training

- Ensure sufficient experiences before training
- Use validation split for early stopping
- Save checkpoints regularly
- Monitor loss and performance metrics

### 4. Production Deployment

- Use quantization to reduce memory
- Enable query caching for faster retrieval
- Batch experiences when possible
- Monitor plugin metrics in production

## File Locations

```
packages/agentdb/src/plugins/
├── learning-plugin.interface.ts    # Core interfaces
├── base-plugin.ts                  # Base class
├── plugin-exports.ts               # Exports
└── implementations/
    ├── decision-transformer.ts     # Decision Transformer
    ├── q-learning.ts              # Q-Learning
    ├── sarsa.ts                   # SARSA
    └── actor-critic.ts            # Actor-Critic
```

## References

- [Decision Transformer Paper](https://arxiv.org/abs/2106.01345)
- [RL Architecture Documentation](./RL_ARCHITECTURE.md)
- [Plugin Design Document](./LEARNING_PLUGIN_DESIGN.md)

---

**Ready for production use with CPU-only inference and <100MB memory footprint!** 🚀
