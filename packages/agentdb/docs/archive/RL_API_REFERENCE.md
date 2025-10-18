# Decision Transformer API Reference

Complete API documentation for the Decision Transformer implementation in sqlite-vector.

## Table of Contents

- [TrajectoryStore](#trajectorystore)
- [DecisionLayer](#decisionlayer)
- [OfflineTrainer](#offlinetrainer)
- [ActionSelector](#actionselector)
- [Type Definitions](#type-definitions)
- [Configuration Options](#configuration-options)
- [Error Handling](#error-handling)

---

## TrajectoryStore

Store and retrieve RL trajectories using vector similarity search with HNSW indexing.

### Constructor

```typescript
class TrajectoryStore {
  constructor(config: TrajectoryStoreConfig);
}

interface TrajectoryStoreConfig {
  path: string;                      // Database file path (e.g., '.rl/trajectories.db')
  dimension?: number;                // Vector dimension (default: 768)
  hnsw?: {
    enabled?: boolean;               // Enable HNSW index (default: true)
    M?: number;                      // Max connections per layer (default: 16)
    efConstruction?: number;         // Construction time accuracy (default: 200)
    efSearch?: number;               // Search time accuracy (default: 50)
  };
  cache?: {
    enabled?: boolean;               // Enable query cache (default: true)
    maxSize?: number;                // Max cache entries (default: 1000)
    ttl?: number;                    // Cache TTL in ms (default: 3600000)
  };
}
```

**Example**:
```typescript
const trajectoryStore = new TrajectoryStore({
  path: './.rl/trajectories.db',
  dimension: 768,
  hnsw: {
    enabled: true,
    M: 16,
    efConstruction: 200,
    efSearch: 50
  },
  cache: {
    enabled: true,
    maxSize: 1000,
    ttl: 3600000
  }
});
```

### Methods

#### `insert(trajectory: Trajectory): Promise<string>`

Insert a single trajectory into the database.

**Parameters**:
- `trajectory`: Trajectory object containing state, action, reward, and metadata

**Returns**: Promise resolving to trajectory ID (string)

**Example**:
```typescript
const trajectoryId = await trajectoryStore.insert({
  stateEmbedding: [0.1, 0.2, ...],  // 768D vector
  action: {
    patternId: 'pat_abc123',
    embedding: [0.3, 0.4, ...],      // 768D vector
    metadata: {
      agentType: 'coder',
      operation: 'generate_function'
    }
  },
  reward: 1.0,
  returnToGo: 2.5,
  metadata: {
    taskType: 'code_generation',
    taskId: 'task_xyz',
    episodeId: 'ep_123',
    timestamp: Date.now(),
    duration: 1250,
    tokensUsed: 450
  }
});

console.log('Inserted trajectory:', trajectoryId);
```

**Throws**:
- `ValidationError`: If trajectory is missing required fields or invalid dimensions
- `StorageError`: If database write fails

---

#### `insertBatch(trajectories: Trajectory[]): Promise<string[]>`

Insert multiple trajectories in a single transaction (144-676x faster than individual inserts).

**Parameters**:
- `trajectories`: Array of Trajectory objects

**Returns**: Promise resolving to array of trajectory IDs

**Example**:
```typescript
const episode = [
  {
    stateEmbedding: [0.1, 0.2, ...],
    action: { patternId: 'pat_1', embedding: [...] },
    reward: 0.0,
    returnToGo: 2.5,
    metadata: { taskType: 'code_gen', episodeId: 'ep_1', timestamp: Date.now() }
  },
  {
    stateEmbedding: [0.2, 0.3, ...],
    action: { patternId: 'pat_2', embedding: [...] },
    reward: 0.5,
    returnToGo: 2.5,
    metadata: { taskType: 'code_gen', episodeId: 'ep_1', timestamp: Date.now() + 1000 }
  },
  {
    stateEmbedding: [0.3, 0.4, ...],
    action: { patternId: 'pat_3', embedding: [...] },
    reward: 1.0,
    returnToGo: 2.5,
    metadata: { taskType: 'code_gen', episodeId: 'ep_1', timestamp: Date.now() + 2000 }
  }
];

const trajectoryIds = await trajectoryStore.insertBatch(episode);
console.log('Inserted', trajectoryIds.length, 'trajectories');
```

**Performance**:
- Native backend: ~116K trajectories/sec
- WASM backend: ~51.7K trajectories/sec

---

#### `search(state: number[], options: SearchOptions): Promise<SearchResult[]>`

Search for similar trajectories using vector similarity.

**Parameters**:
- `state`: State embedding vector (768D)
- `options`: Search configuration

```typescript
interface SearchOptions {
  k?: number;                        // Number of results (default: 5)
  metric?: 'cosine' | 'euclidean' | 'dot';  // Similarity metric (default: 'cosine')
  threshold?: number;                // Minimum similarity (0-1, default: 0.8)
  filter?: {
    taskType?: string;               // Filter by task type
    minReturn?: number;              // Minimum return-to-go
    minReward?: number;              // Minimum reward
    episodeId?: string;              // Filter by episode
    afterTimestamp?: number;         // Only recent trajectories
  };
}

interface SearchResult {
  id: string;
  similarity: number;                // 0-1 (1 = identical)
  trajectory: Trajectory;
  distance: number;                  // Raw distance (metric-dependent)
}
```

**Example**:
```typescript
const results = await trajectoryStore.search(currentState, {
  k: 5,
  metric: 'cosine',
  threshold: 0.85,
  filter: {
    taskType: 'code_generation',
    minReturn: 0.7,
    afterTimestamp: Date.now() - 7 * 24 * 60 * 60 * 1000  // Last 7 days
  }
});

for (const result of results) {
  console.log('Similarity:', result.similarity);
  console.log('Return:', result.trajectory.returnToGo);
  console.log('Action:', result.trajectory.action.patternId);
}
```

**Performance**:
- HNSW enabled: ~5ms for 100K trajectories, ~8ms for 1M trajectories
- HNSW disabled: ~200ms for 100K trajectories (full scan)

---

#### `getEpisode(episodeId: string): Promise<Trajectory[]>`

Retrieve all trajectories from a complete episode in chronological order.

**Parameters**:
- `episodeId`: Episode identifier

**Returns**: Promise resolving to array of trajectories sorted by timestamp

**Example**:
```typescript
const episode = await trajectoryStore.getEpisode('ep_123');

console.log('Episode length:', episode.length);
console.log('Total reward:', episode.reduce((sum, t) => sum + t.reward, 0));
console.log('Final return:', episode[episode.length - 1].returnToGo);

// Analyze trajectory sequence
for (let i = 0; i < episode.length; i++) {
  console.log(`Step ${i}:`, {
    action: episode[i].action.patternId,
    reward: episode[i].reward,
    returnToGo: episode[i].returnToGo
  });
}
```

---

#### `computeReturns(episodeId: string, gamma?: number): Promise<void>`

Compute and update return-to-go values for an episode using discounted rewards.

**Parameters**:
- `episodeId`: Episode identifier
- `gamma`: Discount factor (0-1, default: 0.99)

**Algorithm**:
```
R_t = r_t + γ * R_{t+1}
where R_T = r_T (terminal state)
```

**Example**:
```typescript
// After episode completes, compute returns
await trajectoryStore.computeReturns('ep_123', 0.99);

// Now search will use accurate return values
const bestTrajectories = await trajectoryStore.search(state, {
  k: 5,
  filter: { minReturn: 0.9 }
});
```

---

#### `prune(options: PruneOptions): Promise<number>`

Remove old or low-quality trajectories to manage database size.

**Parameters**:
```typescript
interface PruneOptions {
  keepDays?: number;                 // Keep last N days (default: 30)
  minReturn?: number;                // Keep only high-return trajectories
  maxSize?: number;                  // Keep database under N trajectories
  keepSuccessful?: boolean;          // Always keep reward > 0.5 (default: true)
}
```

**Returns**: Promise resolving to number of trajectories deleted

**Example**:
```typescript
// Keep last 30 days of successful trajectories
const deleted = await trajectoryStore.prune({
  keepDays: 30,
  minReturn: 0.5,
  keepSuccessful: true
});

console.log('Deleted', deleted, 'old trajectories');

// OR: Cap database at 100K trajectories, keeping best ones
const deleted = await trajectoryStore.prune({
  maxSize: 100000,
  minReturn: 0.7
});
```

**Performance**: ~10K deletes/sec with HNSW index rebuild

---

#### `getStats(): Promise<TrajectoryStats>`

Get database statistics and performance metrics.

**Returns**:
```typescript
interface TrajectoryStats {
  totalTrajectories: number;
  totalEpisodes: number;
  avgEpisodeLength: number;
  avgReward: number;
  avgReturn: number;
  successRate: number;              // % with reward > 0.5
  taskTypes: Record<string, number>; // Count per task type
  storageSize: number;              // Bytes
  indexSize: number;                // HNSW index size (bytes)
  oldestTimestamp: number;
  newestTimestamp: number;
}
```

**Example**:
```typescript
const stats = await trajectoryStore.getStats();

console.log('Database Stats:');
console.log('- Total trajectories:', stats.totalTrajectories);
console.log('- Total episodes:', stats.totalEpisodes);
console.log('- Avg episode length:', stats.avgEpisodeLength.toFixed(1));
console.log('- Success rate:', (stats.successRate * 100).toFixed(1) + '%');
console.log('- Storage size:', (stats.storageSize / 1024 / 1024).toFixed(1) + ' MB');
console.log('- Task types:', stats.taskTypes);
```

---

## DecisionLayer

Lightweight 2-layer neural network for action generation when retrieval fails.

### Constructor

```typescript
class DecisionLayer {
  constructor(config: DecisionLayerConfig);
}

interface DecisionLayerConfig {
  stateSize: number;                 // State embedding dimension (768)
  actionSize: number;                // Action embedding dimension (768)
  hiddenSize?: number;               // Hidden layer size (default: 256)
  learningRate?: number;             // SGD learning rate (default: 0.001)
  momentum?: number;                 // SGD momentum (default: 0.9)
  weightDecay?: number;              // L2 regularization (default: 0.0001)
}
```

**Example**:
```typescript
const decisionLayer = new DecisionLayer({
  stateSize: 768,
  actionSize: 768,
  hiddenSize: 256,
  learningRate: 0.001,
  momentum: 0.9,
  weightDecay: 0.0001
});
```

**Architecture**:
```
Input: [state(768), return(1), context(768), timestep(1), ...] = 2304D
  ↓
Dense(2304 → 256) + ReLU          [589K params]
  ↓
Dense(256 → 768)                  [197K params]
  ↓
Output: action(768)
```

**Total parameters**: 786,688 (~3.1 MB)

---

### Methods

#### `predict(input: DecisionInput): number[]`

Generate action embedding for given state and desired return.

**Parameters**:
```typescript
interface DecisionInput {
  state: number[];                   // State embedding (768D)
  desiredReturn: number;             // Target return-to-go (0-1)
  context?: number[];                // Prior action context (768D)
  timestep?: number;                 // Current timestep
}
```

**Returns**: Action embedding vector (768D)

**Example**:
```typescript
const action = decisionLayer.predict({
  state: currentStateEmbedding,
  desiredReturn: 0.9,                // Want 90% success
  context: previousActionEmbedding,
  timestep: 5
});

// Use action embedding to find similar patterns
const patterns = await patternDB.search(action, { k: 1 });
const selectedPattern = patterns[0];
```

**Performance**: ~20ms on CPU (single core)

---

#### `train(batch: TrainingBatch): TrainingMetrics`

Train network on a batch of trajectories using supervised learning.

**Parameters**:
```typescript
interface TrainingBatch {
  states: number[][];                // [batchSize, 768]
  actions: number[][];               // [batchSize, 768] (targets)
  returns: number[];                 // [batchSize]
  contexts?: number[][];             // [batchSize, 768]
  timesteps?: number[];              // [batchSize]
}

interface TrainingMetrics {
  loss: number;                      // MSE loss
  gradientNorm: number;              // For monitoring training
  learningRate: number;
  epoch: number;
}
```

**Example**:
```typescript
// Prepare training batch from trajectories
const batch = {
  states: trajectories.map(t => t.stateEmbedding),
  actions: trajectories.map(t => t.action.embedding),
  returns: trajectories.map(t => t.returnToGo),
  contexts: trajectories.slice(0, -1).map(t => t.action.embedding).concat([zeros(768)]),
  timesteps: trajectories.map((_, i) => i)
};

// Train
const metrics = decisionLayer.train(batch);

console.log('Training loss:', metrics.loss.toFixed(4));
console.log('Gradient norm:', metrics.gradientNorm.toFixed(4));
```

**Performance**: ~100 samples/sec on CPU

---

#### `save(path: string): Promise<void>`

Save network weights to disk.

**Example**:
```typescript
await decisionLayer.save('./.rl/decision_layer.weights');
```

**File format**: MessagePack binary (3.1 MB for default config)

---

#### `load(path: string): Promise<void>`

Load network weights from disk.

**Example**:
```typescript
await decisionLayer.load('./.rl/decision_layer.weights');
```

---

#### `getWeights(): NetworkWeights`

Get current network weights (for inspection or manual saving).

**Returns**:
```typescript
interface NetworkWeights {
  W1: Float32Array;                  // 2304 x 256
  b1: Float32Array;                  // 256
  W2: Float32Array;                  // 256 x 768
  b2: Float32Array;                  // 768
}
```

---

## OfflineTrainer

Orchestrate offline training from historical trajectories.

### Constructor

```typescript
class OfflineTrainer {
  constructor(
    trajectoryStore: TrajectoryStore,
    decisionLayer: DecisionLayer,
    config?: OfflineTrainerConfig
  );
}

interface OfflineTrainerConfig {
  batchSize?: number;                // Training batch size (default: 32)
  epochs?: number;                   // Training epochs (default: 10)
  validationSplit?: number;          // Validation ratio (default: 0.2)
  earlyStoppingPatience?: number;    // Stop if no improvement (default: 3)
  minTrajectories?: number;          // Min trajectories to start (default: 100)
  saveInterval?: number;             // Save weights every N epochs (default: 5)
  savePath?: string;                 // Where to save weights
}
```

**Example**:
```typescript
const trainer = new OfflineTrainer(trajectoryStore, decisionLayer, {
  batchSize: 32,
  epochs: 10,
  validationSplit: 0.2,
  earlyStoppingPatience: 3,
  minTrajectories: 100,
  saveInterval: 5,
  savePath: './.rl/checkpoints'
});
```

---

### Methods

#### `train(filter?: TrajectoryFilter): Promise<TrainingReport>`

Train decision layer on stored trajectories.

**Parameters**:
```typescript
interface TrajectoryFilter {
  taskTypes?: string[];              // Only train on specific task types
  minReturn?: number;                // Only use high-return trajectories
  afterTimestamp?: number;           // Only recent data
}

interface TrainingReport {
  epochMetrics: {
    epoch: number;
    trainLoss: number;
    valLoss: number;
    gradientNorm: number;
    duration: number;
  }[];
  finalMetrics: {
    trainLoss: number;
    valLoss: number;
    bestEpoch: number;
  };
  dataStats: {
    totalTrajectories: number;
    trainSize: number;
    valSize: number;
    avgReturn: number;
  };
}
```

**Example**:
```typescript
// Train on recent successful trajectories
const report = await trainer.train({
  taskTypes: ['code_generation', 'bug_fixing'],
  minReturn: 0.7,
  afterTimestamp: Date.now() - 7 * 24 * 60 * 60 * 1000
});

console.log('Training Report:');
console.log('- Epochs:', report.epochMetrics.length);
console.log('- Final train loss:', report.finalMetrics.trainLoss.toFixed(4));
console.log('- Final val loss:', report.finalMetrics.valLoss.toFixed(4));
console.log('- Best epoch:', report.finalMetrics.bestEpoch);
console.log('- Training samples:', report.dataStats.trainSize);
```

**Performance**: ~10-20 minutes for 10K trajectories, 10 epochs

---

#### `evaluate(filter?: TrajectoryFilter): Promise<EvaluationReport>`

Evaluate decision layer performance on held-out trajectories.

**Returns**:
```typescript
interface EvaluationReport {
  accuracy: number;                  // % of correct action predictions
  avgSimilarity: number;             // Avg cosine similarity to true actions
  perTaskType: Record<string, {
    accuracy: number;
    avgSimilarity: number;
    count: number;
  }>;
  predictions: {
    trueAction: number[];
    predictedAction: number[];
    similarity: number;
  }[];
}
```

**Example**:
```typescript
const report = await trainer.evaluate({
  afterTimestamp: Date.now() - 24 * 60 * 60 * 1000  // Last 24 hours
});

console.log('Evaluation:');
console.log('- Accuracy:', (report.accuracy * 100).toFixed(1) + '%');
console.log('- Avg similarity:', report.avgSimilarity.toFixed(3));

for (const [taskType, metrics] of Object.entries(report.perTaskType)) {
  console.log(`- ${taskType}:`, {
    accuracy: (metrics.accuracy * 100).toFixed(1) + '%',
    count: metrics.count
  });
}
```

---

## ActionSelector

High-level API for 3-tier action selection (retrieval → interpolation → generation).

### Constructor

```typescript
class ActionSelector {
  constructor(
    trajectoryStore: TrajectoryStore,
    decisionLayer: DecisionLayer,
    config?: ActionSelectorConfig
  );
}

interface ActionSelectorConfig {
  exactThreshold?: number;           // Tier 1 threshold (default: 0.99)
  interpolationThreshold?: number;   // Tier 2 threshold (default: 0.95)
  interpolationK?: number;           // Tier 2 neighbors (default: 5)
  minInterpolationSamples?: number;  // Min samples for tier 2 (default: 3)
  fallbackToNeural?: boolean;        // Use tier 3 if 1&2 fail (default: true)
}
```

---

### Methods

#### `selectAction(state: number[], desiredReturn?: number): Promise<ActionResult>`

Select best action using 3-tier strategy.

**Parameters**:
- `state`: State embedding (768D)
- `desiredReturn`: Target return-to-go (0-1, default: 0.9)

**Returns**:
```typescript
interface ActionResult {
  action: number[];                  // Action embedding (768D)
  patternId?: string;                // Pattern ID if from retrieval
  tier: 1 | 2 | 3;                   // Which tier was used
  confidence: number;                // Confidence score (0-1)
  latency: number;                   // Selection time (ms)
  metadata: {
    similarity?: number;             // For tier 1&2
    neighborCount?: number;          // For tier 2
    neuralScore?: number;            // For tier 3
  };
}
```

**Example**:
```typescript
const selector = new ActionSelector(trajectoryStore, decisionLayer, {
  exactThreshold: 0.99,
  interpolationThreshold: 0.95,
  interpolationK: 5,
  fallbackToNeural: true
});

// Select action for current task
const result = await selector.selectAction(currentState, 0.9);

console.log('Action selection:');
console.log('- Tier used:', result.tier);
console.log('- Confidence:', result.confidence.toFixed(3));
console.log('- Latency:', result.latency.toFixed(1) + 'ms');

if (result.patternId) {
  console.log('- Pattern ID:', result.patternId);
}

// Use selected action
const patterns = await patternDB.search(result.action, { k: 1 });
await executePattern(patterns[0]);
```

**Performance**:
- Tier 1 (exact): ~5ms, 99%+ accuracy
- Tier 2 (interpolation): ~10ms, 95-99% accuracy
- Tier 3 (neural): ~20ms, 85-95% accuracy

---

## Type Definitions

### Core Types

```typescript
interface Trajectory {
  stateEmbedding: number[];          // State embedding (768D)
  action: {
    patternId: string;               // Reference to ReasoningBank pattern
    embedding: number[];             // Action embedding (768D)
    metadata?: Record<string, any>;  // Custom action metadata
  };
  reward: number;                    // Immediate reward (-1 to +1)
  returnToGo: number;                // Cumulative future reward
  metadata: {
    taskType: string;                // 'code_generation', 'bug_fixing', etc.
    taskId?: string;                 // Task identifier
    episodeId: string;               // Episode identifier
    timestamp: number;               // Unix timestamp (ms)
    duration?: number;               // Task duration (ms)
    tokensUsed?: number;             // LLM tokens consumed
    agentType?: string;              // Agent that executed this
    contextLength?: number;          // Context size at execution
  };
}

interface Episode {
  id: string;
  trajectories: Trajectory[];
  totalReward: number;
  success: boolean;
  metadata: Record<string, any>;
}
```

---

## Configuration Options

### Global Configuration

```typescript
interface GlobalConfig {
  rl: {
    enabled: boolean;                // Enable Decision Transformer (default: true)
    trajectoryStore: TrajectoryStoreConfig;
    decisionLayer: DecisionLayerConfig;
    actionSelector: ActionSelectorConfig;
    trainer: OfflineTrainerConfig;
  };
  reasoningbank: {
    fallbackToPatterns: boolean;     // Fallback to pattern matching (default: true)
    hybridMode: boolean;             // Use both RL and patterns (default: true)
  };
}
```

**Example**:
```typescript
const config: GlobalConfig = {
  rl: {
    enabled: true,
    trajectoryStore: {
      path: './.rl/trajectories.db',
      hnsw: { enabled: true, M: 16 }
    },
    decisionLayer: {
      stateSize: 768,
      actionSize: 768,
      hiddenSize: 256
    },
    actionSelector: {
      exactThreshold: 0.99,
      interpolationThreshold: 0.95
    },
    trainer: {
      batchSize: 32,
      epochs: 10,
      minTrajectories: 100
    }
  },
  reasoningbank: {
    fallbackToPatterns: true,
    hybridMode: true
  }
};
```

---

## Error Handling

### Error Types

```typescript
class ValidationError extends Error {
  constructor(message: string);
}

class StorageError extends Error {
  constructor(message: string, cause?: Error);
}

class TrainingError extends Error {
  constructor(message: string, cause?: Error);
}

class InsufficientDataError extends Error {
  constructor(message: string, required: number, available: number);
}
```

### Error Handling Patterns

**1. Trajectory insertion with validation**:
```typescript
try {
  await trajectoryStore.insert(trajectory);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid trajectory:', error.message);
    // Handle validation error (fix data and retry)
  } else if (error instanceof StorageError) {
    console.error('Database error:', error.message);
    // Handle storage error (check disk space, permissions)
  } else {
    throw error;  // Unknown error
  }
}
```

**2. Training with insufficient data**:
```typescript
try {
  await trainer.train();
} catch (error) {
  if (error instanceof InsufficientDataError) {
    console.log('Need', error.required, 'trajectories, have', error.available);
    console.log('Waiting for more data...');
    // Continue with pattern matching until enough data
  } else if (error instanceof TrainingError) {
    console.error('Training failed:', error.message);
    // Load previous checkpoint and continue
  }
}
```

**3. Action selection with fallback**:
```typescript
async function selectActionSafe(state: number[]): Promise<number[]> {
  try {
    const result = await selector.selectAction(state, 0.9);
    return result.action;
  } catch (error) {
    console.warn('Decision Transformer failed, falling back to patterns');
    // Fallback to ReasoningBank pattern matching
    return await patternMatcher.selectAction(state);
  }
}
```

---

## Performance Optimization

### Best Practices

**1. Use batch operations**:
```typescript
// ❌ Slow: Individual inserts
for (const trajectory of episode) {
  await trajectoryStore.insert(trajectory);  // 144x slower
}

// ✅ Fast: Batch insert
await trajectoryStore.insertBatch(episode);   // 144x faster
```

**2. Enable HNSW indexing**:
```typescript
// ❌ Slow: Linear search
const store = new TrajectoryStore({ path: 'db.sqlite', hnsw: { enabled: false } });

// ✅ Fast: HNSW index
const store = new TrajectoryStore({ path: 'db.sqlite', hnsw: { enabled: true, M: 16 } });
```

**3. Use query cache**:
```typescript
// ✅ Cache repeated queries (50-100x speedup)
const store = new TrajectoryStore({
  path: 'db.sqlite',
  cache: { enabled: true, maxSize: 1000, ttl: 3600000 }
});
```

**4. Prune old trajectories**:
```typescript
// Run daily pruning
setInterval(async () => {
  const deleted = await trajectoryStore.prune({
    keepDays: 30,
    minReturn: 0.5
  });
  console.log('Pruned', deleted, 'old trajectories');
}, 24 * 60 * 60 * 1000);
```

**5. Train offline during low-activity periods**:
```typescript
// Train at 2 AM daily
const schedule = require('node-schedule');
schedule.scheduleJob('0 2 * * *', async () => {
  console.log('Starting offline training...');
  const report = await trainer.train();
  console.log('Training complete:', report.finalMetrics);
});
```

---

## Complete Example

```typescript
import {
  TrajectoryStore,
  DecisionLayer,
  OfflineTrainer,
  ActionSelector,
  Trajectory
} from 'sqlite-vector/rl';

// 1. Initialize components
const trajectoryStore = new TrajectoryStore({
  path: './.rl/trajectories.db',
  hnsw: { enabled: true, M: 16, efConstruction: 200 },
  cache: { enabled: true }
});

const decisionLayer = new DecisionLayer({
  stateSize: 768,
  actionSize: 768,
  hiddenSize: 256
});

const trainer = new OfflineTrainer(trajectoryStore, decisionLayer, {
  batchSize: 32,
  epochs: 10,
  minTrajectories: 100
});

const selector = new ActionSelector(trajectoryStore, decisionLayer);

// 2. Store trajectories during execution
async function executeTask(task: Task): Promise<void> {
  const episode: Trajectory[] = [];
  let state = await embedTask(task);

  for (let step = 0; step < task.maxSteps; step++) {
    // Select action
    const actionResult = await selector.selectAction(state, 0.9);

    // Execute action
    const outcome = await executeAction(actionResult.action);

    // Store trajectory
    const trajectory = {
      stateEmbedding: state,
      action: {
        patternId: outcome.patternId,
        embedding: actionResult.action
      },
      reward: outcome.success ? 1.0 : -1.0,
      returnToGo: 0,  // Will be computed later
      metadata: {
        taskType: task.type,
        episodeId: task.id,
        timestamp: Date.now()
      }
    };

    episode.push(trajectory);
    state = await embedTask(outcome.nextState);

    if (outcome.done) break;
  }

  // Store episode and compute returns
  await trajectoryStore.insertBatch(episode);
  await trajectoryStore.computeReturns(task.id);
}

// 3. Train periodically (every 100 episodes)
let episodeCount = 0;
setInterval(async () => {
  episodeCount++;
  if (episodeCount % 100 === 0) {
    const report = await trainer.train({
      afterTimestamp: Date.now() - 7 * 24 * 60 * 60 * 1000
    });
    console.log('Training complete:', report.finalMetrics);
  }
}, 1000);

// 4. Monitor performance
setInterval(async () => {
  const stats = await trajectoryStore.getStats();
  console.log('System Stats:', {
    trajectories: stats.totalTrajectories,
    successRate: (stats.successRate * 100).toFixed(1) + '%',
    avgReturn: stats.avgReturn.toFixed(2)
  });
}, 60000);
```

---

## See Also

- [Decision Transformer Guide](./DECISION_TRANSFORMER.md) - Comprehensive overview
- [Architecture Documentation](./RL_ARCHITECTURE.md) - Technical deep dive
- [Quick Start Guide](./RL_QUICKSTART.md) - Get started in 5 minutes
- [Performance Benchmarks](./RL_BENCHMARKS.md) - Performance metrics and comparisons
