# Interactive CLI Wizard Implementation

This document describes the implementation of the interactive CLI wizard for creating learning plugins in agentdb.

## 📁 Files Created

### CLI Entry Point
- **`packages/agentdb/src/cli/plugin-cli.ts`**
  - Main CLI entry point using Commander.js
  - Commands: `create-plugin`, `list-plugins`, `list-templates`, `plugin-info`, `use-plugin`
  - Handles command routing and options parsing

### Wizard Implementation
- **`packages/agentdb/src/cli/wizard/index.ts`**
  - Main wizard orchestration
  - Step-by-step flow control
  - Configuration summary and validation
  - Next steps display

- **`packages/agentdb/src/cli/wizard/prompts.ts`**
  - Interactive prompts using Inquirer.js
  - Algorithm-specific configuration prompts
  - Metadata, reward, storage, training, and monitoring prompts
  - Custom reward function editor support

- **`packages/agentdb/src/cli/wizard/validator.ts`**
  - JSON Schema validation using Ajv
  - Custom validation logic
  - Algorithm-specific validation
  - Reward function validation

### Code Generation
- **`packages/agentdb/src/cli/generator.ts`**
  - Generates complete plugin structure
  - Creates all necessary files (index.ts, agent.ts, reward.ts, policy.ts, tests, README)
  - Algorithm-specific implementations
  - Package.json and TypeScript configuration

### Supporting Files
- **`packages/agentdb/src/cli/commands.ts`**
  - CLI command implementations
  - List plugins and templates
  - Plugin information display

- **`packages/agentdb/src/cli/templates.ts`**
  - Built-in template library
  - Decision Transformer, Q-Learning, SARSA, Actor-Critic, Curiosity-driven
  - Template configuration and retrieval

- **`packages/agentdb/src/cli/types.ts`**
  - TypeScript type definitions
  - PluginConfig, AlgorithmConfig, RewardConfig, etc.
  - LearningPlugin interface

### Binary Updates
- **`packages/agentdb/bin/agentdb.js`**
  - Updated with plugin CLI commands
  - Integrated help text
  - Command routing to plugin CLI

## 🎯 Usage

### Create a Plugin Interactively
```bash
npx agentdb create-plugin
```

### Create from Template (Quick)
```bash
npx agentdb create-plugin --template decision-transformer --name my-plugin --no-customize
```

### List Available Templates
```bash
npx agentdb list-templates
```

### List Installed Plugins
```bash
npx agentdb list-plugins
```

### Get Plugin Information
```bash
npx agentdb plugin-info my-plugin
```

## 🔧 Wizard Flow

1. **Plugin Metadata**
   - Name (validated: lowercase, alphanumeric, hyphens)
   - Description
   - Author (optional)
   - Version (semantic versioning)

2. **Algorithm Selection**
   - Decision Transformer (recommended)
   - Q-Learning
   - SARSA
   - Actor-Critic
   - Custom

3. **Algorithm Configuration**
   - Algorithm-specific parameters
   - Learning rates, dimensions, exploration parameters
   - Action selection strategy

4. **Reward Function**
   - Success-based
   - Time-aware
   - Token-aware
   - Custom JavaScript function (with editor)

5. **Storage Configuration**
   - Database path
   - HNSW index settings
   - Vector quantization

6. **Training Configuration**
   - Batch size
   - Epochs
   - Minimum experiences
   - Train frequency
   - Validation split

7. **Monitoring (Optional)**
   - Metrics tracking
   - Log interval
   - Checkpoints

8. **Action Selection**
   - Generate plugin code
   - Save configuration only
   - Test configuration
   - Cancel

## 📦 Generated Plugin Structure

```
plugins/my-plugin/
├── plugin.yaml           # Plugin configuration
├── README.md            # Documentation
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
├── src/
│   ├── index.ts         # Main entry point (LearningPlugin interface)
│   ├── agent.ts         # Learning agent implementation
│   ├── reward.ts        # Reward function
│   └── policy.ts        # Action selection policy
└── tests/
    └── plugin.test.ts   # Unit tests
```

## 🎨 Templates

### 1. Decision Transformer (Recommended)
- Sequence modeling approach
- 3-tier action selection (exact → interpolation → neural)
- HNSW index enabled
- Best for sequential decision-making

### 2. Q-Learning
- Model-free value-based learning
- Uniform experience replay
- Epsilon-greedy exploration
- Best for discrete action spaces

### 3. SARSA
- On-policy Q-learning variant
- Eligibility traces
- Online learning
- Best for on-policy scenarios

### 4. Actor-Critic
- Policy gradient with value baseline
- GAE (Generalized Advantage Estimation)
- Best for continuous action spaces

### 5. Curiosity-Driven
- Intrinsic motivation
- Exploration bonus
- Best for sparse reward environments

## 🔍 Validation

The wizard validates:
- Plugin name format (lowercase, alphanumeric, hyphens)
- Semantic versioning
- Required fields for each algorithm
- Reward function syntax (for custom functions)
- HNSW parameters
- Training configuration consistency

## 🚀 Next Steps After Generation

1. **Review Generated Code**
   ```bash
   cd plugins/my-plugin
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Run Tests**
   ```bash
   npm test
   ```

4. **Build Plugin**
   ```bash
   npm run build
   ```

5. **Use Plugin**
   ```typescript
   import { PluginRegistry } from 'agentdb/plugins';
   const plugin = await PluginRegistry.load('my-plugin');
   ```

## 📚 Dependencies Added

- `commander` - CLI framework
- `inquirer` - Interactive prompts
- `chalk` - Terminal styling
- `yaml` - YAML parsing
- `ajv` - JSON Schema validation

## 🎓 Examples

### Custom Reward Function
```javascript
function computeReward(outcome, context) {
  // Base reward
  const base = outcome.success ? 1.0 : -1.0;

  // Time penalty (encourage faster solutions)
  const timePenalty = -0.1 * (context.duration / 1000);

  // Token penalty (encourage efficiency)
  const tokenPenalty = -0.01 * (context.tokensUsed / 100);

  // Complexity bonus (encourage simpler solutions)
  const complexityBonus = 0.05 * (1 - outcome.codeComplexity);

  return base + timePenalty + tokenPenalty + complexityBonus;
}
```

### Using a Plugin
```typescript
import { PluginRegistry } from 'agentdb/plugins';

// Load plugin
const plugin = await PluginRegistry.load('my-custom-learner');

// Initialize
await plugin.initialize(config);

// Use in task execution
const state = await embedTask(task);
const action = await plugin.selectAction(state);
const outcome = await executeAction(action);

// Store experience
await plugin.storeExperience({
  state,
  action,
  reward: computeReward(outcome, context),
  nextState: await embedTask(outcome.nextState),
  done: outcome.done
});

// Train periodically
if (shouldTrain()) {
  await plugin.train();
}
```

## 🔮 Future Enhancements

- [ ] Add more built-in templates (Meta-Learning, Hierarchical RL)
- [ ] Template marketplace/registry
- [ ] Plugin versioning and updates
- [ ] A/B testing framework integration
- [ ] WandB/TensorBoard integration
- [ ] Multi-task learning templates
- [ ] Plugin debugging tools
- [ ] Performance profiling

## 📖 Documentation References

- Design Document: `packages/agentdb/docs/LEARNING_PLUGIN_DESIGN.md`
- Implementation: `packages/agentdb/src/cli/`
- Templates: `packages/agentdb/src/cli/templates.ts`

## 🎉 Summary

The interactive CLI wizard provides a user-friendly way to create custom learning plugins without deep ML expertise. It guides users through configuration, validates inputs, generates complete plugin structures, and provides templates for common use cases.

**Key Features:**
- ✅ Interactive step-by-step wizard
- ✅ 5 built-in templates
- ✅ Custom reward function support
- ✅ Complete code generation
- ✅ Validation and error handling
- ✅ Test scaffolding
- ✅ Documentation generation

**Time to Create a Plugin:** ~2-5 minutes
