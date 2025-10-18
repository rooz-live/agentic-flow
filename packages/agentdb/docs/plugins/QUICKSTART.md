# Learning Plugin Quick Start

> **Create custom learning methodologies in 5 minutes**
>
> Build your own RL algorithms using vector databases without deep ML expertise.

---

## Prerequisites

```bash
# Required
Node.js >= 18.0.0

# Install agentdb
npm install @agentic-flow/agentdb
```

---

## 5-Minute Quick Start

### Step 1: Create Your First Plugin (2 minutes)

```bash
# Launch interactive wizard
npx agentdb create-plugin

┌───────────────────────────────────────────────────────────────┐
│        SQLite Vector Learning Plugin Wizard                  │
│        Create custom learning methodologies                   │
└───────────────────────────────────────────────────────────────┘

? Plugin name: my-first-plugin
? Description: My custom Q-learning algorithm
? Base algorithm: Q-Learning
? Learning rate: 0.001
? Discount factor (gamma): 0.99
? Epsilon (exploration rate): 0.1
? Experience replay capacity: 10000

✓ Plugin created: my-first-plugin
```

**That's it!** You've created a working Q-Learning plugin with experience replay.

### Step 2: Use Your Plugin (1 minute)

```typescript
import { PluginRegistry } from '@agentic-flow/agentdb/plugins';

// Load your plugin
const plugin = await PluginRegistry.load('my-first-plugin');

// Initialize with configuration
await plugin.initialize(plugin.config);

// Use in your agent
async function runTask(task: Task) {
  // Get current state embedding
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

### Step 3: Test It (2 minutes)

```bash
# Run plugin tests
npx agentdb test-plugin my-first-plugin

✓ Plugin loads successfully
✓ Configuration is valid
✓ Experience storage works
✓ Action selection works
✓ Training completes
```

**Congratulations!** You've built and tested your first learning plugin! 🎉

---

## Using Templates

### List Available Templates

```bash
npx agentdb list-templates

Available templates:
  • decision-transformer (recommended) - Sequence modeling for sequential tasks
  • q-learning - Model-free value-based learning
  • sarsa - On-policy Q-learning variant
  • actor-critic - Policy gradient + value function
  • curiosity-driven - Intrinsic motivation for exploration
```

### Create from Template

```bash
# Use template without customization
npx agentdb create-plugin \
  --template decision-transformer \
  --name my-dt-plugin \
  --no-customize

✓ Created plugin: my-dt-plugin (using decision-transformer template)

# Or customize the template
npx agentdb create-plugin --template q-learning

? Plugin name: my-custom-q
? Customize configuration? Yes
? Learning rate: 0.0005
? Experience replay: Prioritized
? Priority alpha: 0.6
...
```

---

## Common Use Cases

### Use Case 1: Custom Reward Shaping

```bash
npx agentdb create-plugin

? Base algorithm: Decision Transformer
? Reward function: Custom
? Enter reward function:
```

```javascript
function computeReward(outcome, context) {
  // Base reward
  let reward = outcome.success ? 1.0 : -1.0;

  // Time penalty (encourage faster solutions)
  reward -= 0.1 * (context.duration / 1000);

  // Token efficiency bonus
  reward += 0.05 * (1 - context.tokensUsed / 10000);

  // Code quality bonus
  if (outcome.quality) {
    reward += outcome.quality * 0.2;
  }

  return reward;
}
```

```bash
✓ Custom reward function configured
✓ Plugin created: custom-reward-plugin
```

### Use Case 2: Prioritized Experience Replay

```bash
npx agentdb create-plugin --template q-learning

? Plugin name: prioritized-q
? Experience replay: Prioritized (by TD error)
? Priority alpha: 0.6  # Prioritization exponent
? Priority beta: 0.4   # Importance sampling weight
? Beta increment: 0.001  # Annealing rate

✓ Created plugin with prioritized experience replay
```

### Use Case 3: Multi-Task Learning

```yaml
# Create plugin.yaml
name: multi-task-learner
base_algorithm: decision_transformer

tasks:
  code_generation:
    reward_weight: 1.0
    state_dim: 768
  bug_fixing:
    reward_weight: 1.5  # Higher importance
  refactoring:
    reward_weight: 0.8

shared_layers:
  - type: dense
    size: 512
  - type: dense
    size: 256
```

---

## Customization Guide

### Plugin Structure

When you create a plugin, this structure is generated:

```
my-plugin/
├── plugin.yaml           # Configuration
├── README.md            # Documentation
├── src/
│   ├── index.ts         # Main entry point
│   ├── agent.ts         # Learning agent
│   ├── reward.ts        # Reward function
│   └── policy.ts        # Action selection
├── tests/
│   └── plugin.test.ts   # Unit tests
└── package.json         # Dependencies
```

### Configuration (plugin.yaml)

```yaml
# Metadata
name: my-plugin
version: 1.0.0
description: My custom learning algorithm
base_algorithm: q-learning

# Algorithm settings
algorithm:
  type: q-learning
  learning_rate: 0.001
  discount_factor: 0.99
  epsilon_start: 1.0
  epsilon_end: 0.01
  epsilon_decay: 0.995

# Experience replay
experience_replay:
  type: uniform
  capacity: 10000
  min_size: 100

# Storage
storage:
  backend: agentdb
  path: ./.rl/my-plugin.db
  hnsw:
    enabled: true
    M: 16
    efConstruction: 200

# Training
training:
  batch_size: 32
  train_every: 4
  epochs: 10
```

### Modify Reward Function

Edit `src/reward.ts`:

```typescript
export function computeReward(outcome: Outcome, context: Context): number {
  // Your custom reward logic
  const baseReward = outcome.success ? 1.0 : -1.0;
  const timePenalty = -0.1 * (context.duration / 1000);
  const qualityBonus = outcome.quality * 0.3;

  return baseReward + timePenalty + qualityBonus;
}
```

### Modify Action Selection

Edit `src/policy.ts`:

```typescript
export async function selectAction(
  state: Vector,
  qValues: number[],
  epsilon: number
): Promise<Action> {
  // Custom action selection strategy
  if (Math.random() < epsilon) {
    // Explore: Use softmax instead of random
    const probabilities = softmax(qValues);
    return sampleFromDistribution(probabilities);
  } else {
    // Exploit: Best Q-value
    return argmax(qValues);
  }
}
```

---

## CLI Command Reference

### `create-plugin`

Create a new learning plugin.

```bash
npx agentdb create-plugin [options]

Options:
  --template <name>    Use a template (decision-transformer, q-learning, etc.)
  --name <name>        Plugin name
  --no-customize       Skip customization prompts
  --output <dir>       Output directory (default: ./plugins)

Examples:
  # Interactive wizard
  npx agentdb create-plugin

  # Quick create from template
  npx agentdb create-plugin --template q-learning --name my-q

  # Custom output directory
  npx agentdb create-plugin --output ./custom-plugins
```

### `list-templates`

List available plugin templates.

```bash
npx agentdb list-templates [options]

Options:
  --detailed    Show detailed information
  --category <name>  Filter by category

Examples:
  # List all templates
  npx agentdb list-templates

  # Show details
  npx agentdb list-templates --detailed
```

### `use-plugin`

Load and use a plugin.

```bash
npx agentdb use-plugin <name> [options]

Options:
  --config <file>  Custom configuration file
  --test           Run in test mode

Examples:
  # Load plugin
  npx agentdb use-plugin my-plugin

  # Load with custom config
  npx agentdb use-plugin my-plugin --config custom.yaml
```

### `test-plugin`

Test a plugin.

```bash
npx agentdb test-plugin <name> [options]

Options:
  --coverage        Generate coverage report
  --benchmark       Run performance benchmarks

Examples:
  # Run tests
  npx agentdb test-plugin my-plugin

  # With coverage
  npx agentdb test-plugin my-plugin --coverage
```

### `plugin-info`

Get information about a plugin.

```bash
npx agentdb plugin-info <name>

Examples:
  npx agentdb plugin-info q-learning

Output:
  Name: q-learning
  Version: 1.0.0
  Base Algorithm: Q-Learning
  Experience Replay: Uniform
  Storage: SQLite Vector
  Status: ✓ Ready
```

---

## Integration with Existing Systems

### With ReasoningBank

```typescript
import { ReasoningBank } from '@agentic-flow/agentdb';
import { PluginRegistry } from '@agentic-flow/agentdb/plugins';

// Load both systems
const reasoningBank = new ReasoningBank();
const plugin = await PluginRegistry.load('my-plugin');

// Enhanced retrieval
async function enhancedRetrieve(task: Task) {
  // Original: Pattern matching
  const patterns = await reasoningBank.retrieve(task);

  // Enhanced: Plugin action selection
  const state = await embedTask(task);
  const action = await plugin.selectAction(state);

  return {
    patterns,
    pluginAction: action,
    recommendation: action.confidence > 0.9 ? action : patterns[0]
  };
}
```

### With Decision Transformer

```typescript
import { createVectorDB } from '@agentic-flow/agentdb';
import { PluginRegistry } from '@agentic-flow/agentdb/plugins';

// Create trajectory database
const trajectoryDB = await createVectorDB({
  path: './.rl/trajectories.db'
});

// Load plugin
const plugin = await PluginRegistry.load('decision-transformer');

// Store trajectory
await plugin.storeExperience({
  state: stateEmbedding,
  action: actionId,
  reward: 1.0,
  nextState: nextStateEmbedding,
  done: false
});
```

---

## Troubleshooting

### Issue: Plugin not loading

**Error:** `Plugin 'my-plugin' not found`

**Solution:**
```bash
# Check plugin exists
ls plugins/my-plugin

# Verify plugin.yaml is valid
npx agentdb validate-plugin my-plugin

# Reinstall dependencies
cd plugins/my-plugin && npm install
```

### Issue: Configuration validation failed

**Error:** `Invalid configuration: learning_rate must be between 0 and 1`

**Solution:**
Edit `plugin.yaml` and ensure all values are within valid ranges:
```yaml
algorithm:
  learning_rate: 0.001  # Must be 0 < lr < 1
  discount_factor: 0.99  # Must be 0 < gamma <= 1
```

### Issue: Experience storage failing

**Error:** `Failed to store experience: database locked`

**Solution:**
```typescript
// Ensure database is properly initialized
await plugin.initialize(config);

// Use batch insert for multiple experiences
await plugin.storeBatch(experiences);
```

---

## Next Steps

### 1. Explore Templates

Try different base algorithms to find what works best:

```bash
# Try Q-Learning
npx agentdb create-plugin --template q-learning --name try-q

# Try SARSA
npx agentdb create-plugin --template sarsa --name try-sarsa

# Try Actor-Critic
npx agentdb create-plugin --template actor-critic --name try-ac
```

### 2. Customize Rewards

Experiment with different reward functions:

```javascript
// Time-aware
reward = success - 0.1 * (duration / 1000)

// Quality-focused
reward = success * quality

// Balanced
reward = success - 0.05*time - 0.01*tokens + 0.2*quality
```

### 3. A/B Test Strategies

Compare different approaches:

```typescript
import { ABTestRunner } from '@agentic-flow/agentdb/plugins';

const pluginA = await PluginRegistry.load('q-learning');
const pluginB = await PluginRegistry.load('decision-transformer');

const tester = new ABTestRunner({
  plugins: [pluginA, pluginB],
  tasks: testTasks,
  metrics: ['success_rate', 'avg_reward']
});

const results = await tester.run();
console.log('Winner:', results.winner);
```

### 4. Production Deployment

```typescript
// Monitor performance
const metrics = await plugin.getMetrics();
console.log('Success rate:', metrics.successRate);
console.log('Avg reward:', metrics.avgReward);

// Save checkpoints
await plugin.save('./checkpoints/my-plugin-v1.0.checkpoint');

// Load checkpoint
await plugin.load('./checkpoints/my-plugin-v1.0.checkpoint');
```

---

## Resources

- **[Plugin API Reference](./PLUGIN_API.md)** - Complete API documentation
- **[Plugin Design](./LEARNING_PLUGIN_DESIGN.md)** - Architecture details
- **[Decision Transformer Guide](./features/DECISION_TRANSFORMER.md)** - DT-specific info
- **[RL Quick Start](./features/RL_QUICKSTART.md)** - Reinforcement learning basics

---

## Example Plugins

Check out these example plugins for inspiration:

```bash
# Clone examples
git clone https://github.com/agentic-flow/agentdb-plugins
cd agentdb-plugins

# Explore examples
ls examples/
  - custom-reward-shaping/
  - prioritized-replay/
  - multi-task-learning/
  - curiosity-driven/
  - hierarchical-rl/
```

---

**You're ready to create custom learning plugins!** 🚀

Start experimenting with different algorithms and watch your AI agents improve.
