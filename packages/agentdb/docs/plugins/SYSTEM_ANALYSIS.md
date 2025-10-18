# Learning Plugin System - Comprehensive Implementation Analysis

**Document Version:** 1.0.0
**Date:** 2025-10-17
**Author:** Research Agent
**Status:** Complete Analysis

---

## Executive Summary

This document provides a comprehensive analysis of the Learning Plugin System for the `sqlite-vector` package (agentdb). The plugin system enables users to create custom learning methodologies using vector databases with minimal ML expertise.

**Current Implementation Status:** ~75% Complete

### What Exists
- ✅ Core plugin interfaces and types
- ✅ Plugin registry with discovery and loading
- ✅ Base plugin implementation with common functionality
- ✅ Configuration validator with schema enforcement
- ✅ 5 YAML templates (Decision Transformer, Q-Learning, SARSA, Actor-Critic, Curiosity-Driven)
- ✅ CLI wizard framework with inquirer prompts
- ✅ Code generator with security hardening
- ✅ Basic CLI commands in bin/agentdb.js

### What's Missing
- ❌ Full CLI wizard prompt implementations
- ❌ Algorithm-specific implementations (Q-Learning, SARSA, Actor-Critic)
- ❌ Extension system (curiosity-driven, HER)
- ❌ A/B testing framework
- ❌ Multi-task learning support
- ❌ Comprehensive documentation and examples
- ❌ Integration tests

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Core Components Analysis](#2-core-components-analysis)
3. [Plugin Templates](#3-plugin-templates)
4. [CLI Interface](#4-cli-interface)
5. [Wizard Flow](#5-wizard-flow)
6. [Configuration System](#6-configuration-system)
7. [Security Requirements](#7-security-requirements)
8. [Implementation Roadmap](#8-implementation-roadmap)
9. [Testing Strategy](#9-testing-strategy)
10. [Documentation Requirements](#10-documentation-requirements)

---

## 1. Architecture Overview

### 1.1 High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                    Learning Plugin System                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │
│  │   Template    │  │    Wizard     │  │   Plugin      │   │
│  │   Library     │  │   Interface   │  │   Registry    │   │
│  │   [DONE]      │  │   [PARTIAL]   │  │   [DONE]      │   │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘   │
│          │                   │                   │            │
│          └───────────────────┼───────────────────┘            │
│                              │                                │
│  ┌───────────────────────────┴───────────────────────────┐   │
│  │              Plugin Base Interface [DONE]             │   │
│  │  - initialize()      - selectAction()                 │   │
│  │  - storeExperience() - train()                        │   │
│  │  - getMetrics()      - save()/load()                  │   │
│  └───────────────────────────┬───────────────────────────┘   │
│                              │                                │
│  ┌──────────┬────────┬───────┴────────┬──────────┐          │
│  │          │        │                │          │           │
│  │  Q-      │ SARSA  │   Decision     │  Custom  │           │
│  │  Learning│        │   Transformer  │  Plugin  │           │
│  │ [TODO]   │ [TODO] │   [TODO]       │  [READY] │           │
│  └──────────┴────────┴────────────────┴──────────┘          │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                   SQLite Vector Store [DONE]                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  • Experience storage (trajectories, Q-values)      │    │
│  │  • HNSW index for similarity search                 │    │
│  │  • Efficient batch operations                       │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Component Status Matrix

| Component | Status | Completion | Files |
|-----------|--------|------------|-------|
| Plugin Interface | ✅ Complete | 100% | `/src/plugins/interface.ts` |
| Plugin Registry | ✅ Complete | 100% | `/src/plugins/registry.ts` |
| Base Plugin | ✅ Complete | 100% | `/src/plugins/base-plugin.ts` |
| Validator | ✅ Complete | 100% | `/src/plugins/validator.ts` |
| Templates (YAML) | ✅ Complete | 100% | `/templates/*.yaml` (5 files) |
| CLI Framework | ✅ Complete | 100% | `/bin/agentdb.js` |
| Wizard Core | ⚠️ Partial | 60% | `/src/cli/wizard/index.ts` |
| Wizard Prompts | ⚠️ Partial | 40% | `/src/cli/wizard/prompts.ts` |
| Code Generator | ✅ Complete | 90% | `/src/cli/generator.ts` |
| Q-Learning Impl | ❌ Missing | 0% | `/src/plugins/implementations/q-learning.ts` (stub) |
| SARSA Impl | ❌ Missing | 0% | `/src/plugins/implementations/sarsa.ts` (stub) |
| Actor-Critic Impl | ❌ Missing | 0% | `/src/plugins/implementations/actor-critic.ts` (stub) |
| DT Impl | ❌ Missing | 0% | `/src/plugins/implementations/decision-transformer.ts` (stub) |
| Extensions | ❌ Missing | 0% | Not started |
| A/B Testing | ❌ Missing | 0% | Not started |
| Documentation | ⚠️ Partial | 30% | `/docs/LEARNING_PLUGIN_DESIGN.md`, `/docs/PLUGIN_API.md` |

---

## 2. Core Components Analysis

### 2.1 Plugin Interface (`/src/plugins/interface.ts`)

**Status:** ✅ Complete (100%)

**Provides:**
- `LearningPlugin` interface with 11 methods
- Type definitions: `Vector`, `Context`, `Outcome`, `Experience`, `Action`
- Configuration interfaces: `PluginConfig`, `AlgorithmConfig`, `StateConfig`, etc.
- Training types: `TrainOptions`, `TrainingMetrics`, `PluginMetrics`
- Plugin metadata: `PluginMetadata`, `PluginFactory`

**Key Features:**
- Lifecycle management (`initialize()`, `destroy()`)
- Experience management (`storeExperience()`, `storeBatch()`, `retrieveSimilar()`)
- Action selection (`selectAction()`)
- Training (`train()`)
- Metrics and introspection (`getMetrics()`, `getConfig()`)
- Persistence (`save()`, `load()`)

**Implementation Quality:** Excellent
- Comprehensive TypeScript types
- Well-documented with JSDoc comments
- Flexible and extensible design

### 2.2 Plugin Registry (`/src/plugins/registry.ts`)

**Status:** ✅ Complete (100%)

**Provides:**
- Singleton registry pattern
- Plugin registration and discovery
- Version management
- Alias support
- Configuration merging
- Active instance management

**Key Methods:**
```typescript
register(metadata: PluginMetadata): void
unregister(name: string): boolean
has(name: string): boolean
get(name: string): PluginMetadata | undefined
list(criteria?: PluginSearchCriteria): PluginMetadata[]
load(name: string, options?: PluginLoadOptions): Promise<LearningPlugin>
unload(name: string): Promise<boolean>
getActive(name: string): LearningPlugin | undefined
listActive(): Array<{ name: string; plugin: LearningPlugin }>
```

**Implementation Quality:** Excellent
- Error handling with `PluginError` class
- Configuration validation
- Semantic version comparison
- Thread-safe singleton pattern

### 2.3 Base Plugin (`/src/plugins/base-plugin.ts`)

**Status:** ✅ Complete (100%)

**Provides:**
- Abstract base class implementing `LearningPlugin`
- Common functionality for all plugins:
  - Vector database integration
  - Experience storage and retrieval
  - Metrics tracking
  - State persistence
  - Lifecycle hooks

**Lifecycle Hooks:**
```typescript
protected async onInitialize(): Promise<void>
protected async onDestroy(): Promise<void>
protected async onStoreExperience(experience: Experience): Promise<void>
protected async onSave(path: string): Promise<void>
protected async onLoad(path: string): Promise<void>
```

**Utility Methods:**
```typescript
protected checkInitialized(): void
protected generateId(): string
protected computeReturns(rewards: number[], gamma: number): number[]
protected computeReward(experience: Experience): number
```

**Implementation Quality:** Excellent
- Proper abstraction with template method pattern
- Backend-agnostic (WASM/Native)
- Comprehensive reward computation strategies

### 2.4 Validator (`/src/plugins/validator.ts`)

**Status:** ✅ Complete (100%)

**Provides:**
- Configuration validation with detailed error reporting
- Field-level validation for all config sections
- Warning system for non-critical issues
- Human-readable error summaries

**Validation Coverage:**
- ✅ Plugin metadata (name, version, description)
- ✅ Algorithm configuration (learning rate, discount factor)
- ✅ State configuration (dimension, preprocessing)
- ✅ Action configuration (type, space size, bounds)
- ✅ Reward configuration (type, custom functions)
- ✅ Experience replay (type, capacity, prioritization)
- ✅ Storage configuration (backend, path, HNSW, quantization)
- ✅ Training configuration (batch size, epochs, min experiences)
- ✅ Monitoring configuration (metrics, intervals)
- ✅ Extensions configuration

**Key Functions:**
```typescript
validatePluginConfig(config: Partial<PluginConfig>): ValidationResult
validateRequired(config: Partial<PluginConfig>): boolean
getErrorSummary(result: ValidationResult): string
```

**Implementation Quality:** Excellent
- Comprehensive validation rules
- Clear error messages
- Performance-optimized

---

## 3. Plugin Templates

### 3.1 Available Templates

**Location:** `/templates/*.yaml`

| Template | File | Status | Description |
|----------|------|--------|-------------|
| Decision Transformer | `decision-transformer.yaml` | ✅ Complete | Sequence modeling approach using transformer architecture |
| Q-Learning | `q-learning.yaml` | ✅ Complete | Model-free value-based learning with experience replay |
| SARSA | `sarsa.yaml` | ✅ Complete | On-policy variant of Q-learning with eligibility traces |
| Actor-Critic | `actor-critic.yaml` | ✅ Complete | Policy gradient with value function baseline |
| Curiosity-Driven | `curiosity-driven.yaml` | ✅ Complete | Intrinsic motivation for exploration |

### 3.2 Template Structure Analysis

Each template follows this structure:

```yaml
# Plugin metadata
name: <plugin-name>
version: <version>
description: <description>
base_algorithm: <algorithm-type>

# Algorithm configuration
algorithm:
  type: <type>
  <algorithm-specific-params>

# State representation
state:
  embedding_model: <model>
  dimension: <dim>
  preprocessing: [...]

# Action space
action:
  type: <discrete|continuous>
  space_size: <size>
  selection_strategy: <strategy>

# Reward configuration
reward:
  type: <type>
  function: <optional-custom-function>

# Experience replay
experience_replay:
  type: <none|uniform|prioritized>
  capacity: <size>

# Storage
storage:
  backend: sqlite-vector
  path: <db-path>
  hnsw:
    enabled: <bool>
    M: <connections>
    efConstruction: <quality>

# Training
training:
  batch_size: <size>
  epochs: <count>
  min_experiences: <count>
  train_every: <interval>

# Monitoring
monitoring:
  track_metrics: [...]
  log_interval: <episodes>
  save_checkpoints: <bool>

# Extensions (optional)
extensions:
  - name: <extension-name>
    enabled: <bool>
    config: {...}
```

### 3.3 Template Quality Assessment

**Decision Transformer Template:**
- ✅ Comprehensive transformer architecture config
- ✅ Context length and return-to-go conditioning
- ✅ 3-tier action selection strategy
- ✅ Trajectory sampling support
- ⚠️ Missing: Model initialization parameters

**Q-Learning Template:**
- ✅ Complete Q-learning parameters
- ✅ Experience replay configuration
- ✅ Epsilon-greedy exploration
- ⚠️ Missing: Target network configuration

**SARSA Template:**
- ✅ On-policy configuration
- ✅ Eligibility traces (lambda)
- ⚠️ Missing: Action value initialization

**Actor-Critic Template:**
- ✅ Separate actor/critic learning rates
- ✅ GAE (Generalized Advantage Estimation)
- ✅ PPO (Proximal Policy Optimization) support
- ⚠️ Missing: Policy network architecture

**Curiosity-Driven Template:**
- ✅ Forward and inverse model configuration
- ✅ Intrinsic reward weighting
- ⚠️ Missing: ICM (Intrinsic Curiosity Module) architecture

---

## 4. CLI Interface

### 4.1 Command Structure

**Location:** `/bin/agentdb.js`

**Available Commands:**

| Command | Status | Description |
|---------|--------|-------------|
| `help` | ✅ Complete | Show comprehensive help |
| `version` | ✅ Complete | Show version information |
| `mcp` | ⚠️ Placeholder | Start MCP server (not implemented) |
| `init <path>` | ✅ Complete | Initialize vector database |
| `benchmark` | ✅ Complete | Run performance benchmarks |
| `repl` | ❌ Placeholder | Interactive REPL (not implemented) |
| `create-plugin` | ⚠️ Partial | Create plugin with wizard |
| `list-plugins` | ⚠️ Partial | List all available plugins |
| `list-templates` | ⚠️ Partial | List available templates |
| `plugin-info` | ⚠️ Partial | Get plugin information |
| `use-plugin` | ⚠️ Partial | Load and use a plugin |
| `test-plugin` | ❌ Not implemented | Test a plugin |
| `validate-plugin` | ❌ Not implemented | Validate plugin configuration |
| `import` | ❌ Not implemented | Import vectors from file |
| `export` | ❌ Not implemented | Export vectors to file |
| `query` | ❌ Not implemented | Query vector database |
| `stats` | ❌ Not implemented | Show database statistics |
| `optimize` | ❌ Not implemented | Optimize database performance |
| `train` | ❌ Not implemented | Train a learning plugin |
| `deploy` | ❌ Not implemented | Deploy plugin to production |

### 4.2 CLI Implementation Files

**Location:** `/src/cli/`

| File | Status | Purpose |
|------|--------|---------|
| `plugin-cli.ts` | ⚠️ Partial | Main CLI entry point |
| `commands.ts` | ⚠️ Partial | Command implementations |
| `help.ts` | ⚠️ Partial | Help system |
| `types.ts` | ✅ Complete | TypeScript type definitions |
| `templates.ts` | ✅ Complete | Template loading utilities |
| `generator.ts` | ✅ Complete | Plugin code generator |
| `wizard/index.ts` | ✅ Complete | Wizard orchestration |
| `wizard/prompts.ts` | ⚠️ Partial | Interactive prompts |
| `wizard/validator.ts` | ⚠️ Partial | Wizard-specific validation |

### 4.3 CLI User Experience Flow

```
$ npx agentdb create-plugin

┌───────────────────────────────────────────────────────────────┐
│                                                               │
│        SQLite Vector Learning Plugin Wizard                  │
│        Create custom learning methodologies                   │
│                                                               │
└───────────────────────────────────────────────────────────────┘

📝 Step 1: Plugin Metadata
? Plugin name: my-custom-learner
? Description: Custom learning algorithm with reward shaping
? Version: 1.0.0

🧠 Step 2: Algorithm Selection
? Base algorithm:
  ❯ Decision Transformer (recommended for sequential tasks)
    Q-Learning (model-free, value-based)
    SARSA (on-policy Q-learning variant)
    Actor-Critic (policy gradient + value function)
    Custom (start from scratch)

🎯 Step 3: Reward Configuration
? Reward function:
  ❯ Success-based (1 for success, -1 for failure)
    Time-aware (penalize long execution)
    Token-aware (penalize high token usage)
    Custom (write JavaScript function)

💾 Step 4: Storage Configuration
? Database path: ./.rl/my-custom-learner.db
? Enable HNSW index: Yes
? HNSW M parameter: 16
? Enable quantization: No

🏋️  Step 5: Training Configuration
? Batch size: 32
? Training epochs: 10
? Min experiences before training: 100
? Train every N experiences: 100

📊 Step 6: Monitoring (Optional)
? Track metrics: success_rate, avg_reward, loss
? Log interval: 10
? Save checkpoints: Yes

✓ Plugin configuration complete!

? What would you like to do next?
  ❯ ✨ Generate plugin code
    💾 Save configuration only
    🧪 Test configuration
    ❌ Cancel

✨ Generating plugin code

✓ Created plugin structure at ./plugins/my-custom-learner/
✓ Generated plugin.yaml
✓ Generated src/index.ts
✓ Generated src/agent.ts
✓ Generated src/reward.ts
✓ Generated src/policy.ts
✓ Generated tests/plugin.test.ts
✓ Generated README.md
✓ Generated package.json

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
│  3. Use plugin: npx agentdb use-plugin my-custom-learner      │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## 5. Wizard Flow

### 5.1 Wizard Architecture

**Location:** `/src/cli/wizard/`

**Components:**
1. **Wizard Orchestrator** (`index.ts`) - Controls flow
2. **Prompt Modules** (`prompts.ts`) - Collects user input
3. **Validator** (`validator.ts`) - Validates responses
4. **Generator** (`../generator.ts`) - Generates code

### 5.2 Wizard Steps

#### Step 1: Plugin Metadata
**Function:** `promptMetadata()`
**Status:** ⚠️ Needs implementation

**Prompts:**
```typescript
{
  type: 'input',
  name: 'name',
  message: 'Plugin name:',
  validate: (input) => /^[a-z0-9-]+$/.test(input)
}
{
  type: 'input',
  name: 'description',
  message: 'Description:',
  validate: (input) => input.length >= 10 && input.length <= 200
}
{
  type: 'input',
  name: 'version',
  message: 'Version:',
  default: '1.0.0',
  validate: (input) => /^\d+\.\d+\.\d+$/.test(input)
}
{
  type: 'input',
  name: 'author',
  message: 'Author (optional):',
  default: ''
}
```

#### Step 2: Algorithm Selection
**Function:** `promptAlgorithm()`
**Status:** ⚠️ Needs implementation

**Prompts:**
```typescript
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
```

**Algorithm-Specific Prompts:**

**Decision Transformer:**
```typescript
{
  type: 'number',
  name: 'state_dim',
  message: 'State embedding dimension:',
  default: 768
}
{
  type: 'number',
  name: 'hidden_size',
  message: 'Hidden layer size:',
  default: 256
}
{
  type: 'list',
  name: 'action_selection',
  message: 'Action selection strategy:',
  choices: ['3_tier', 'epsilon_greedy', 'softmax', 'ucb']
}
```

**Q-Learning:**
```typescript
{
  type: 'number',
  name: 'learning_rate',
  message: 'Learning rate:',
  default: 0.001
}
{
  type: 'number',
  name: 'discount_factor',
  message: 'Discount factor (gamma):',
  default: 0.99
}
{
  type: 'number',
  name: 'epsilon_start',
  message: 'Initial epsilon (exploration rate):',
  default: 1.0
}
{
  type: 'number',
  name: 'epsilon_end',
  message: 'Final epsilon:',
  default: 0.01
}
{
  type: 'number',
  name: 'epsilon_decay',
  message: 'Epsilon decay rate:',
  default: 0.995
}
{
  type: 'list',
  name: 'replay_type',
  message: 'Experience replay type:',
  choices: ['uniform', 'prioritized', 'none']
}
```

#### Step 3: Reward Configuration
**Function:** `promptReward()`
**Status:** ⚠️ Needs implementation

**Prompts:**
```typescript
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
```

**Custom Reward (if selected):**
```typescript
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
```

#### Step 4: Storage Configuration
**Function:** `promptStorage()`
**Status:** ⚠️ Needs implementation

**Prompts:**
```typescript
{
  type: 'input',
  name: 'path',
  message: 'Database path:',
  default: (answers) => `./.rl/${answers.name}.db`
}
{
  type: 'confirm',
  name: 'hnsw_enabled',
  message: 'Enable HNSW index:',
  default: true
}
{
  type: 'number',
  name: 'hnsw_M',
  message: 'HNSW M parameter:',
  default: 16,
  when: (answers) => answers.hnsw_enabled
}
{
  type: 'number',
  name: 'hnsw_efConstruction',
  message: 'HNSW efConstruction:',
  default: 200,
  when: (answers) => answers.hnsw_enabled
}
{
  type: 'confirm',
  name: 'quantization_enabled',
  message: 'Enable quantization:',
  default: false
}
{
  type: 'list',
  name: 'quantization_bits',
  message: 'Quantization bits:',
  choices: ['8', '16'],
  when: (answers) => answers.quantization_enabled
}
```

#### Step 5: Training Configuration
**Function:** `promptTraining()`
**Status:** ⚠️ Needs implementation

**Prompts:**
```typescript
{
  type: 'number',
  name: 'batch_size',
  message: 'Batch size:',
  default: 32
}
{
  type: 'number',
  name: 'epochs',
  message: 'Training epochs:',
  default: 10
}
{
  type: 'number',
  name: 'min_experiences',
  message: 'Min experiences before training:',
  default: 100
}
{
  type: 'number',
  name: 'train_every',
  message: 'Train every N experiences:',
  default: 100
}
{
  type: 'number',
  name: 'validation_split',
  message: 'Validation split (0-1):',
  default: 0.2
}
{
  type: 'number',
  name: 'early_stopping_patience',
  message: 'Early stopping patience:',
  default: 3
}
```

#### Step 6: Monitoring Configuration
**Function:** `promptMonitoring()`
**Status:** ⚠️ Needs implementation

**Prompts:**
```typescript
{
  type: 'checkbox',
  name: 'track_metrics',
  message: 'Metrics to track:',
  choices: [
    { name: 'Success rate', value: 'success_rate', checked: true },
    { name: 'Average reward', value: 'avg_reward', checked: true },
    { name: 'Loss', value: 'loss', checked: true },
    { name: 'Q-values', value: 'q_values' },
    { name: 'Epsilon', value: 'epsilon' },
    { name: 'Predicted return', value: 'predicted_return' }
  ]
}
{
  type: 'number',
  name: 'log_interval',
  message: 'Log interval (episodes):',
  default: 10
}
{
  type: 'confirm',
  name: 'save_checkpoints',
  message: 'Save checkpoints:',
  default: true
}
{
  type: 'number',
  name: 'checkpoint_interval',
  message: 'Checkpoint interval (episodes):',
  default: 50,
  when: (answers) => answers.save_checkpoints
}
{
  type: 'confirm',
  name: 'wandb_enabled',
  message: 'Enable Weights & Biases integration:',
  default: false
}
{
  type: 'input',
  name: 'wandb_project',
  message: 'W&B project name:',
  when: (answers) => answers.wandb_enabled
}
```

### 5.3 Wizard Validation

Each step should validate user input:

```typescript
// Example: Name validation
function validateName(input: string): boolean | string {
  if (!input) return 'Name is required';
  if (input.length < 3) return 'Name must be at least 3 characters';
  if (input.length > 50) return 'Name must be at most 50 characters';
  if (!/^[a-z0-9-]+$/.test(input)) return 'Use only lowercase letters, numbers, and hyphens';
  return true;
}

// Example: Number validation
function validateNumber(input: number, min: number, max: number): boolean | string {
  if (isNaN(input)) return 'Must be a number';
  if (input < min) return `Must be at least ${min}`;
  if (input > max) return `Must be at most ${max}`;
  return true;
}
```

---

## 6. Configuration System

### 6.1 Configuration Schema

**Complete Type Hierarchy:**

```typescript
interface PluginConfig {
  // Metadata
  name: string                    // ✅ Validated: kebab-case, 3-50 chars
  version: string                 // ✅ Validated: semantic version
  author?: string                 // ⚠️ Optional
  description: string             // ✅ Validated: 10-200 chars
  baseAlgorithm: string          // ✅ Validated: enum

  // Configuration sections
  algorithm: AlgorithmConfig     // ✅ Validated
  state: StateConfig             // ✅ Validated
  action: ActionConfig           // ✅ Validated
  reward: RewardConfig           // ✅ Validated
  experienceReplay?: ExperienceReplayConfig  // ✅ Validated
  storage: StorageConfig         // ✅ Validated
  training: TrainingConfig       // ✅ Validated
  monitoring?: MonitoringConfig  // ✅ Validated
  extensions?: ExtensionConfig[] // ✅ Validated
}
```

### 6.2 Validation Rules

**Name Validation:**
- Pattern: `/^[a-z0-9-]+$/`
- Length: 3-50 characters
- Reserved names: Checked against OS-reserved names
- Security: Path traversal prevention

**Version Validation:**
- Pattern: `/^\d+\.\d+\.\d+$/` (semantic versioning)
- Example: `1.0.0`, `2.3.4`

**Algorithm Validation:**
- Base algorithm: `decision_transformer | q_learning | sarsa | actor_critic | custom`
- Learning rate: `0 < rate <= 1`
- Discount factor: `0 <= gamma <= 1`

**Storage Validation:**
- Backend: Must be `'sqlite-vector'`
- Path: Required, non-empty
- HNSW M: `2 <= M <= 100` (recommended)
- HNSW efConstruction: `>= 10` (recommended)
- Quantization bits: `8 | 16`

**Training Validation:**
- Batch size: `1 <= size <= 1024`
- Epochs: `>= 1`
- Validation split: `0 <= split < 1`
- Min experiences: `>= 1`

### 6.3 Configuration Loading

**From Template:**
```typescript
import { getTemplateConfig } from './templates.js';

const config = await getTemplateConfig('decision-transformer');
// Returns: Complete PluginConfig from template YAML
```

**From File:**
```typescript
import YAML from 'yaml';
import fs from 'fs/promises';

const yamlStr = await fs.readFile('plugin.yaml', 'utf-8');
const config = YAML.parse(yamlStr);
```

**Validation:**
```typescript
import { validatePluginConfig, getErrorSummary } from './validator.js';

const result = validatePluginConfig(config);
if (!result.valid) {
  console.error(getErrorSummary(result));
  throw new Error('Invalid configuration');
}
```

---

## 7. Security Requirements

### 7.1 Implemented Security Measures

**✅ Path Traversal Prevention:**
```typescript
// 1. Name format validation
if (!/^[a-z0-9-]+$/.test(pluginName)) {
  throw new Error('Invalid plugin name format');
}

// 2. Length validation
if (pluginName.length < 3 || pluginName.length > 50) {
  throw new Error('Plugin name must be between 3 and 50 characters');
}

// 3. Reserved OS names check
const RESERVED_NAMES = ['con', 'prn', 'aux', 'nul', ...];
if (RESERVED_NAMES.includes(pluginName.toLowerCase())) {
  throw new Error('Reserved OS name');
}

// 4. Path resolution validation
const pluginsBaseDir = path.resolve(process.cwd(), 'plugins');
const pluginDir = path.join(pluginsBaseDir, pluginName);
const resolvedPluginDir = path.resolve(pluginDir);

if (!resolvedPluginDir.startsWith(pluginsBaseDir + path.sep)) {
  throw new Error('Invalid plugin directory path (security violation)');
}

// 5. Symlink detection
const stats = await fs.lstat(pluginDir);
if (stats.isSymbolicLink()) {
  throw new Error('Plugin directory cannot be a symlink');
}
```

**✅ Code Injection Prevention:**
```typescript
// Custom reward functions are NOT eval'd
// Instead, they use predefined safe functions
function generateDefaultReward(type: string): string {
  switch (type) {
    case 'success_based':
      return 'return outcome.success ? 1.0 : -1.0;';
    case 'time_aware':
      return `const base = outcome.success ? 1.0 : -1.0;
const timePenalty = -0.1 * (context.duration / 1000);
return base + timePenalty;`;
    // No eval() or Function() constructor used
  }
}
```

### 7.2 Required Security Enhancements

**❌ Custom Function Sandboxing:**
- [ ] Implement safe evaluation environment for custom reward functions
- [ ] Use isolated-vm or similar for custom code execution
- [ ] Add resource limits (CPU, memory, execution time)
- [ ] Whitelist allowed globals and modules

**❌ Input Sanitization:**
- [ ] Sanitize all user inputs in wizard prompts
- [ ] Validate file paths before file operations
- [ ] Escape special characters in generated code
- [ ] Prevent SQL injection in metadata storage

**❌ File System Restrictions:**
- [ ] Implement file size limits for generated plugins
- [ ] Restrict file operations to plugin directories
- [ ] Add read-only mode for template access
- [ ] Audit file operations with logging

**❌ Network Security:**
- [ ] Sandbox network access for custom code
- [ ] Implement HTTPS-only for external model downloads
- [ ] Add certificate validation for remote resources
- [ ] Rate limit API calls

### 7.3 Security Audit Checklist

- [ ] Review all `fs` operations for path traversal
- [ ] Review all `eval()` and `Function()` usage
- [ ] Review all user input validation
- [ ] Review all file upload/download operations
- [ ] Review all network requests
- [ ] Add security tests to test suite
- [ ] Implement CSP for web-based components
- [ ] Add dependency vulnerability scanning

---

## 8. Implementation Roadmap

### Phase 1: Complete Wizard Prompts (1-2 days)

**Tasks:**
- [ ] Implement `promptMetadata()` in `/src/cli/wizard/prompts.ts`
- [ ] Implement `promptAlgorithm()` with algorithm-specific sub-prompts
- [ ] Implement `promptReward()` with custom function editor
- [ ] Implement `promptStorage()` with HNSW and quantization options
- [ ] Implement `promptTraining()` with validation
- [ ] Implement `promptMonitoring()` with W&B integration
- [ ] Add unit tests for all prompt functions
- [ ] Test wizard end-to-end with all templates

**Files to modify:**
- `/src/cli/wizard/prompts.ts` (main work)
- `/src/cli/wizard/validator.ts` (helper validations)

**Estimated effort:** 12-16 hours

### Phase 2: Algorithm Implementations (3-5 days)

**Tasks:**
- [ ] Implement Q-Learning algorithm in `/src/plugins/implementations/q-learning.ts`
  - [ ] Q-table management
  - [ ] Epsilon-greedy action selection
  - [ ] Experience replay (uniform and prioritized)
  - [ ] Training loop with TD updates
- [ ] Implement SARSA algorithm in `/src/plugins/implementations/sarsa.ts`
  - [ ] On-policy updates
  - [ ] Eligibility traces
  - [ ] Online training mode
- [ ] Implement Actor-Critic in `/src/plugins/implementations/actor-critic.ts`
  - [ ] Policy network (actor)
  - [ ] Value network (critic)
  - [ ] GAE (Generalized Advantage Estimation)
  - [ ] PPO (Proximal Policy Optimization)
- [ ] Implement Decision Transformer in `/src/plugins/implementations/decision-transformer.ts`
  - [ ] Transformer architecture
  - [ ] Return-to-go conditioning
  - [ ] Trajectory sampling
  - [ ] 3-tier action selection

**Dependencies:**
- May need to add neural network library (e.g., onnxruntime-node)
- Consider using WASM-based inference for client-side

**Estimated effort:** 24-40 hours

### Phase 3: Extension System (2-3 days)

**Tasks:**
- [ ] Create `/src/plugins/extensions/` directory
- [ ] Implement extension base class
- [ ] Implement Curiosity-Driven Exploration extension
  - [ ] Forward model (predict next state)
  - [ ] Inverse model (predict action)
  - [ ] Intrinsic reward calculation
- [ ] Implement Hindsight Experience Replay (HER) extension
  - [ ] Goal relabeling
  - [ ] Future/final/episode strategies
- [ ] Add extension registry and loading
- [ ] Update generator to support extensions

**Files to create:**
- `/src/plugins/extensions/base.ts`
- `/src/plugins/extensions/curiosity.ts`
- `/src/plugins/extensions/her.ts`
- `/src/plugins/extensions/registry.ts`

**Estimated effort:** 16-24 hours

### Phase 4: A/B Testing Framework (1-2 days)

**Tasks:**
- [ ] Create `/src/plugins/testing/` directory
- [ ] Implement A/B test runner
- [ ] Add statistical analysis (t-test, confidence intervals)
- [ ] Create comparison reports
- [ ] Add visualization utilities

**Files to create:**
- `/src/plugins/testing/ab-test.ts`
- `/src/plugins/testing/stats.ts`
- `/src/plugins/testing/reporter.ts`

**Example usage:**
```typescript
import { ABTestRunner } from 'sqlite-vector/plugins/testing';

const runner = new ABTestRunner({
  plugins: [pluginA, pluginB],
  tasks: testTasks,
  metrics: ['success_rate', 'avg_reward']
});

const results = await runner.run();
console.log('Winner:', results.winner);
```

**Estimated effort:** 8-16 hours

### Phase 5: Documentation & Examples (2-3 days)

**Tasks:**
- [ ] Write comprehensive plugin development guide
- [ ] Create 10+ example plugins
- [ ] Record video tutorials
- [ ] Add API documentation
- [ ] Write blog post
- [ ] Create interactive playground

**Documentation structure:**
```
docs/plugins/
├── PLUGIN_DEVELOPMENT.md         # Main guide
├── WIZARD_GUIDE.md               # Wizard usage
├── EXTENSION_API.md              # Extension development
├── AB_TESTING_GUIDE.md           # A/B testing
├── SECURITY_GUIDE.md             # Security best practices
├── examples/
│   ├── custom-reward/            # Custom reward example
│   ├── multi-task/               # Multi-task learning
│   ├── curiosity-driven/         # Curiosity extension
│   ├── q-learning-cart-pole/    # Classic RL task
│   ├── dt-text-generation/      # Text generation
│   └── ...
└── tutorials/
    ├── 01-getting-started.md
    ├── 02-custom-rewards.md
    ├── 03-extensions.md
    └── 04-ab-testing.md
```

**Estimated effort:** 16-24 hours

### Phase 6: Integration Tests (1-2 days)

**Tasks:**
- [ ] Create end-to-end tests for wizard
- [ ] Test plugin generation for all templates
- [ ] Test plugin loading and execution
- [ ] Test A/B testing framework
- [ ] Performance benchmarks
- [ ] Add CI/CD pipeline

**Test structure:**
```
tests/integration/
├── wizard.test.ts
├── plugin-generation.test.ts
├── plugin-execution.test.ts
├── ab-testing.test.ts
└── performance.test.ts
```

**Estimated effort:** 8-16 hours

---

## 9. Testing Strategy

### 9.1 Unit Tests

**Coverage targets:**
- Plugin interface: 100%
- Plugin registry: 100%
- Base plugin: 100%
- Validator: 100%
- Wizard prompts: 90%
- Generator: 90%

**Test files:**
```
src/plugins/__tests__/
├── interface.test.ts
├── registry.test.ts
├── base-plugin.test.ts
├── validator.test.ts
└── implementations/
    ├── q-learning.test.ts
    ├── sarsa.test.ts
    ├── actor-critic.test.ts
    └── decision-transformer.test.ts

src/cli/__tests__/
├── wizard.test.ts
├── prompts.test.ts
├── generator.test.ts
└── templates.test.ts
```

### 9.2 Integration Tests

**Test scenarios:**
1. **End-to-end plugin creation:**
   - Run wizard with programmatic inputs
   - Verify generated files
   - Build generated plugin
   - Run plugin tests

2. **Plugin loading and execution:**
   - Load plugin from registry
   - Initialize with configuration
   - Store experiences
   - Train plugin
   - Verify metrics

3. **A/B testing:**
   - Create two plugins with different configs
   - Run comparative tests
   - Verify statistical analysis

### 9.3 Performance Tests

**Benchmarks:**
- Plugin loading time: < 100ms
- Experience storage: > 10,000 ops/sec
- Similarity search: < 5ms per query
- Training iteration: < 100ms per batch
- Memory usage: < 500MB for 100K experiences

---

## 10. Documentation Requirements

### 10.1 User Documentation

**Required documents:**

1. **PLUGIN_QUICKSTART.md**
   - 5-minute quick start guide
   - Install agentdb
   - Create first plugin
   - Run plugin

2. **PLUGIN_DEVELOPMENT.md**
   - Comprehensive guide to plugin development
   - Configuration reference
   - Algorithm selection guide
   - Best practices

3. **WIZARD_GUIDE.md**
   - Step-by-step wizard usage
   - Configuration options explained
   - Tips and tricks

4. **EXTENSION_API.md**
   - How to create custom extensions
   - Extension lifecycle
   - Hook reference

5. **AB_TESTING_GUIDE.md**
   - How to compare plugins
   - Statistical methods
   - Interpreting results

### 10.2 API Documentation

**Required:**
- TypeScript JSDoc for all public APIs
- Generated API docs with TypeDoc
- Interactive API explorer

**Example:**
```typescript
/**
 * Load a plugin from the registry
 *
 * @param name - Plugin name or alias
 * @param options - Load options
 * @returns Plugin instance
 * @throws {PluginError} If plugin not found or loading fails
 *
 * @example
 * ```typescript
 * const plugin = await registry.load('q-learning', {
 *   config: { training: { batchSize: 64 } },
 *   initialize: true
 * });
 * ```
 */
async load(
  name: string,
  options?: PluginLoadOptions
): Promise<LearningPlugin>
```

### 10.3 Tutorial Videos

**Required videos:**
1. Introduction to Learning Plugins (5 min)
2. Creating Your First Plugin (10 min)
3. Custom Reward Functions (8 min)
4. A/B Testing Plugins (12 min)
5. Advanced Extensions (15 min)

---

## Summary

### Implementation Status: ~75% Complete

**What's Done (✅):**
- Core plugin system architecture
- Plugin interfaces and types
- Plugin registry
- Base plugin implementation
- Configuration validator
- 5 YAML templates
- CLI framework
- Wizard orchestration
- Code generator with security
- Basic CLI commands

**What's Missing (❌):**
- Wizard prompt implementations (~40% done)
- Algorithm implementations (0% done)
  - Q-Learning
  - SARSA
  - Actor-Critic
  - Decision Transformer
- Extension system (0% done)
- A/B testing framework (0% done)
- Comprehensive documentation (30% done)
- Integration tests (0% done)

### Estimated Time to Complete

**Remaining work:** 80-120 hours (2-3 weeks full-time)

**Priority order:**
1. **Critical** (Phase 1): Complete wizard prompts → 12-16 hours
2. **High** (Phase 2): Implement at least 1-2 algorithms → 12-20 hours
3. **Medium** (Phase 5): Basic documentation → 8-12 hours
4. **Medium** (Phase 3): Extension system → 16-24 hours
5. **Low** (Phase 4): A/B testing → 8-16 hours
6. **Low** (Phase 6): Integration tests → 8-16 hours

### Next Steps

1. **Immediate (1-2 days):** Complete wizard prompts
2. **Short-term (3-5 days):** Implement Q-Learning and Decision Transformer
3. **Medium-term (1 week):** Add extension system and documentation
4. **Long-term (2-3 weeks):** Full feature completeness with tests

### Success Criteria

The plugin system will be considered **production-ready** when:
- ✅ All wizard prompts implemented and tested
- ✅ At least 2 algorithms fully implemented (Q-Learning + DT)
- ✅ Basic documentation complete
- ✅ End-to-end integration tests passing
- ✅ Security audit complete
- ⚠️ Extension system (optional for v1.0)
- ⚠️ A/B testing (optional for v1.0)

---

**Document End**
