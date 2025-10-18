# Decision Transformer Quick Start

> **Get Started with CPU-Only RL in 10 Minutes**
>
> Quick start guide for implementing Decision Transformer with sqlite-vector.

---

## Prerequisites

```bash
# Required
Node.js >= 18.0.0

# Already installed if you have sqlite-vector
npm install @agentic-flow/sqlite-vector
```

---

## 5-Minute Setup

### Step 1: Initialize Trajectory Database (1 min)

```typescript
import { createVectorDB } from '@agentic-flow/sqlite-vector';

// Create trajectory storage
const trajectoryDB = await createVectorDB({
  path: './.rl/trajectories.db',
  hnsw: {
    enabled: true,
    M: 16,
    efConstruction: 200,
    efSearch: 50,
    minVectorsForIndex: 1000
  }
});

console.log('✓ Trajectory database initialized');
```

### Step 2: Store Your First Trajectory (2 min)

```typescript
// Simulate a task execution
const task = {
  description: "Implement user authentication",
  type: "coding",
  context: { framework: "Express.js" }
};

// Generate state embedding (use any embedding model)
const stateEmbedding = await embedTask(task);  // 768D vector

// Store trajectory step
await trajectoryDB.insert({
  embedding: stateEmbedding,
  metadata: {
    // Action taken
    actionId: "oauth2-pattern",
    actionEmbedding: await embedPattern("OAuth2 with passport.js"),

    // Outcome
    reward: 1.0,           // Success!
    returnToGo: 1.0,       // Total return

    // Context
    episodeId: "episode-001",
    stepIndex: 0,
    taskType: "authentication",
    duration: 1800000,     // 30 minutes
    success: true
  }
});

console.log('✓ Trajectory stored');
```

### Step 3: Retrieve Similar Trajectories (1 min)

```typescript
// New task comes in
const newTask = {
  description: "Implement JWT authentication",
  type: "coding"
};

const newState = await embedTask(newTask);

// Find similar successful trajectories
const similar = await trajectoryDB.search(
  newState,
  k: 5,
  metric: 'cosine',
  threshold: 0.8
);

// Filter by successful outcomes
const successful = similar.filter(t =>
  t.metadata.returnToGo >= 0.9
);

console.log(`✓ Found ${successful.length} similar successful trajectories`);
console.log('Best match:', successful[0].metadata.actionId);
```

### Step 4: Use Retrieved Action (1 min)

```typescript
if (successful.length > 0) {
  // Use the best matching action
  const bestAction = successful[0].metadata.actionId;
  const actionEmbedding = successful[0].metadata.actionEmbedding;

  console.log(`Applying pattern: ${bestAction}`);

  // Look up pattern in your pattern library
  const pattern = await getPattern(bestAction);

  // Execute it
  await executePattern(pattern, newTask);
}
```

**Congratulations!** You've just implemented basic retrieval-based RL. 🎉

---

## 15-Minute Complete Example

### Full Working Implementation

```typescript
import { createVectorDB } from '@agentic-flow/sqlite-vector';

// ===== SETUP =====

// 1. Initialize trajectory database
const trajectoryDB = await createVectorDB({
  path: './.rl/trajectories.db',
  hnsw: { enabled: true, M: 16, efConstruction: 200, efSearch: 50 }
});

// 2. Helper: Embed task (using OpenAI as example)
async function embedTask(task: any): Promise<number[]> {
  const text = `${task.description} | Type: ${task.type}`;

  // Option 1: Use OpenAI embeddings API
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text
  });
  return response.data[0].embedding;

  // Option 2: Use local model (sentence-transformers)
  // const model = await SentenceTransformer.load('all-MiniLM-L6-v2');
  // return await model.encode(text);
}

// 3. Helper: Compute reward from outcome
function computeReward(outcome: any): number {
  let reward = outcome.success ? 1.0 : -1.0;

  // Adjust for quality
  if (outcome.codeQuality) {
    reward += (outcome.codeQuality - 0.8) * 0.5;
  }

  // Adjust for efficiency
  if (outcome.duration) {
    const targetTime = 30 * 60 * 1000;  // 30 min
    const timeDelta = (outcome.duration - targetTime) / (10 * 60 * 1000);
    reward -= timeDelta * 0.1;
  }

  return Math.max(-1.0, Math.min(1.0, reward));
}

// ===== COLLECT TRAJECTORIES =====

// 4. Store trajectory from task execution
async function storeTrajectory(task: any, action: any, outcome: any) {
  const stateEmbedding = await embedTask(task);
  const actionEmbedding = await embedTask(action);  // Or use action.embedding
  const reward = computeReward(outcome);

  await trajectoryDB.insert({
    embedding: stateEmbedding,
    metadata: {
      actionId: action.id,
      actionEmbedding,
      reward,
      returnToGo: reward,  // Will compute properly later
      episodeId: task.id,
      taskType: task.type,
      duration: outcome.duration,
      success: outcome.success,
      timestamp: Date.now()
    }
  });

  console.log(`Stored trajectory: ${task.id} → ${action.id} (reward: ${reward.toFixed(2)})`);
}

// 5. Example: Collect 10 trajectories
const tasks = [
  { id: "task-1", description: "Implement user auth", type: "coding" },
  { id: "task-2", description: "Fix auth bug", type: "debugging" },
  { id: "task-3", description: "Design REST API", type: "design" },
  // ... more tasks
];

const actions = [
  { id: "oauth2-pattern", description: "OAuth2 with passport.js" },
  { id: "debug-null-check", description: "Add null checks" },
  { id: "restful-design", description: "RESTful with versioning" },
  // ... more patterns
];

for (let i = 0; i < 10; i++) {
  const task = tasks[i % tasks.length];
  const action = actions[i % actions.length];
  const outcome = {
    success: Math.random() > 0.3,  // 70% success rate
    duration: 20 * 60 * 1000 + Math.random() * 30 * 60 * 1000,
    codeQuality: 0.7 + Math.random() * 0.3
  };

  await storeTrajectory(task, action, outcome);
}

console.log('✓ Collected 10 trajectories');

// ===== USE DECISION TRANSFORMER =====

// 6. Select action for new task
async function selectAction(task: any, desiredReturn: number = 0.9): Promise<any> {
  const state = await embedTask(task);

  // Search for similar successful trajectories
  const results = await trajectoryDB.search(
    state,
    k: 5,
    metric: 'cosine',
    threshold: 0.8
  );

  // Filter by desired return
  const successful = results.filter(r =>
    r.metadata.returnToGo >= desiredReturn
  );

  if (successful.length === 0) {
    console.log('⚠️  No successful matches found, trying lower threshold...');
    return selectAction(task, desiredReturn * 0.9);
  }

  // Return best match
  const best = successful[0];
  return {
    id: best.metadata.actionId,
    embedding: best.metadata.actionEmbedding,
    similarity: best.score,
    confidence: best.metadata.returnToGo
  };
}

// 7. Execute new task
const newTask = { description: "Implement API authentication", type: "coding" };
const selectedAction = await selectAction(newTask, 0.9);

console.log(`\nNew task: "${newTask.description}"`);
console.log(`Selected action: ${selectedAction.id}`);
console.log(`Similarity: ${(selectedAction.similarity * 100).toFixed(1)}%`);
console.log(`Confidence: ${(selectedAction.confidence * 100).toFixed(1)}%`);

// 8. Apply the action
// const pattern = await getPattern(selectedAction.id);
// await executePattern(pattern, newTask);
```

**Output:**
```
✓ Collected 10 trajectories
Stored trajectory: task-1 → oauth2-pattern (reward: 0.85)
Stored trajectory: task-2 → debug-null-check (reward: 0.72)
...

New task: "Implement API authentication"
Selected action: oauth2-pattern
Similarity: 92.3%
Confidence: 95.0%
```

---

## Common Use Cases

### Use Case 1: Code Generation

```typescript
// Task: Generate authentication code
const task = {
  description: "Add JWT authentication to Express API",
  context: {
    framework: "Express.js",
    database: "PostgreSQL",
    existing: ["user model", "login route"]
  }
};

// Find similar successful implementations
const state = await embedTask(task);
const similar = await trajectoryDB.search(state, 5, 'cosine', 0.85);

// Get best action
const action = similar[0].metadata.actionId;
// → "jwt-passport-postgres-pattern"

// Apply pattern
const code = await generateCode(action, task);
```

### Use Case 2: Bug Fixing

```typescript
// Task: Fix null pointer exception
const task = {
  description: "TypeError: Cannot read property 'map' of undefined",
  context: {
    file: "components/UserList.jsx",
    line: 42,
    stackTrace: "..."
  }
};

// Find similar bug fixes
const state = await embedTask(task);
const similar = await trajectoryDB.search(state, 5, 'cosine', 0.90);

// Get best fix
const fix = similar[0].metadata.actionId;
// → "add-null-check-before-map"

// Apply fix
const patch = await generateFix(fix, task);
```

### Use Case 3: API Design

```typescript
// Task: Design e-commerce API
const task = {
  description: "RESTful API for e-commerce platform",
  context: {
    resources: ["users", "products", "orders", "payments"],
    requirements: ["versioning", "auth", "rate-limiting"]
  }
};

// Find similar API designs
const state = await embedTask(task);
const similar = await trajectoryDB.search(state, 3, 'cosine', 0.80);

// Get design patterns
const patterns = similar.map(s => s.metadata.actionId);
// → ["rest-v2-oauth", "microservices-gateway", "graphql-federation"]

// Apply best pattern
const design = await applyDesignPattern(patterns[0], task);
```

---

## Integration with ReasoningBank

### Hook into Existing System

```typescript
import { ReasoningBank } from '@agentic-flow/reasoningbank';

// 1. Initialize both systems
const reasoningBank = new ReasoningBank();
const trajectoryDB = await createVectorDB({ path: './.rl/trajectories.db' });

// 2. Enhance RETRIEVE phase
async function enhancedRetrieve(task: any) {
  // Original: Pattern matching
  const patterns = await reasoningBank.retrieve(task);

  // Enhanced: Decision Transformer
  const state = await embedTask(task);
  const dtAction = await selectAction(trajectoryDB, state, 0.9);

  // Combine both
  return {
    patterns,              // From ReasoningBank
    dtAction,              // From Decision Transformer
    recommendation: dtAction.confidence > 0.9 ? dtAction : patterns[0]
  };
}

// 3. Enhance DISTILL phase
async function enhancedDistill(task: any, outcome: any) {
  // Original: Store pattern
  await reasoningBank.storePattern(task.pattern);

  // Enhanced: Store trajectory
  await storeTrajectory(task, task.action, outcome);
}

// 4. Use enhanced system
const task = { description: "Implement OAuth2", type: "coding" };
const retrieval = await enhancedRetrieve(task);
const result = await executeTask(task, retrieval.recommendation);
await enhancedDistill(task, result);
```

---

## Advanced: Adding the Decision Layer

### Train Lightweight Neural Network

```typescript
// After collecting 500+ trajectories, train decision layer

// 1. Fetch all episodes
const allSteps = await trajectoryDB.getBackend().getDatabase()
  .prepare('SELECT * FROM vectors')
  .all();

const episodes = groupByEpisode(allSteps);  // Group by episodeId

// 2. Compute returns for each episode
for (const episode of episodes) {
  const returns = computeReturns(episode, gamma: 0.99);

  // Update returnToGo in database
  for (let i = 0; i < episode.length; i++) {
    await trajectoryDB.getBackend().getDatabase()
      .prepare('UPDATE vectors SET metadata = json_set(metadata, "$.returnToGo", ?) WHERE id = ?')
      .run(returns[i], episode[i].id);
  }
}

// 3. Train decision layer (simplified)
class SimpleDecisionLayer {
  private weights: any;

  async train(episodes: any[], epochs: number = 10) {
    for (let epoch = 0; epoch < epochs; epoch++) {
      let totalLoss = 0;

      for (const episode of episodes) {
        for (let i = 0; i < episode.length; i++) {
          const input = [
            ...episode[i].stateEmbedding,
            ...this.encodeReturn(episode[i].returnToGo)
          ];

          const target = episode[i].actionEmbedding;
          const predicted = this.forward(input);

          const loss = this.mseLoss(predicted, target);
          totalLoss += loss;

          this.backward(loss);
        }
      }

      console.log(`Epoch ${epoch + 1}: Loss = ${(totalLoss / episodes.length).toFixed(4)}`);
    }
  }

  forward(input: number[]): number[] {
    // Simple linear layer for demo
    // In production: 2-layer MLP with ReLU
    return input.slice(0, 768);  // Placeholder
  }

  mseLoss(pred: number[], target: number[]): number {
    return pred.reduce((sum, p, i) => sum + (p - target[i]) ** 2, 0) / pred.length;
  }

  backward(loss: number) {
    // Gradient descent update
    // In production: Proper backprop with Adam optimizer
  }
}

// 4. Train
const decisionLayer = new SimpleDecisionLayer();
await decisionLayer.train(episodes, 10);

// 5. Use trained layer for Tier 3 (novel scenarios)
async function selectActionWithNN(task: any) {
  const state = await embedTask(task);

  // Try retrieval first
  const retrieved = await trajectoryDB.search(state, 1, 'cosine', 0.95);

  if (retrieved.length > 0) {
    return retrieved[0].metadata.action;  // Tier 1/2
  }

  // Fallback to neural network
  const input = [...state, ...encodeReturn(0.9)];
  const actionEmbedding = decisionLayer.forward(input);  // Tier 3

  return { embedding: actionEmbedding, source: 'neural' };
}
```

---

## Troubleshooting

### Issue: No similar trajectories found

**Solution**: Lower the similarity threshold
```typescript
// Instead of 0.9
const results = await trajectoryDB.search(state, 5, 'cosine', 0.7);
```

### Issue: Slow queries

**Solution**: Build HNSW index
```typescript
const backend = trajectoryDB.getBackend();
if (backend.buildHNSWIndex) {
  await backend.buildHNSWIndex();
  console.log('✓ HNSW index built');
}
```

### Issue: Database growing too large

**Solution**: Prune old trajectories
```typescript
// Delete trajectories older than 30 days
const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

const db = trajectoryDB.getBackend().getDatabase();
const result = db.prepare(`
  DELETE FROM vectors
  WHERE json_extract(metadata, '$.timestamp') < ?
`).run(thirtyDaysAgo);

console.log(`Pruned ${result.changes} old trajectories`);
```

### Issue: Inconsistent rewards

**Solution**: Normalize reward function
```typescript
function computeNormalizedReward(outcome: any): number {
  const components = {
    success: outcome.success ? 1.0 : -1.0,      // -1 to +1
    quality: (outcome.quality - 0.5) * 0.4,     // -0.2 to +0.2
    speed: (0.8 - outcome.timeRatio) * 0.3      // -0.15 to +0.15
  };

  const total = Object.values(components).reduce((sum, v) => sum + v, 0);
  return Math.max(-1.0, Math.min(1.0, total));  // Clamp to [-1, 1]
}
```

---

## Next Steps

### 1. Collect More Data
- Run 100-500 task executions
- Store all trajectories
- Aim for diverse task types

### 2. Optimize Retrieval
- Tune HNSW parameters (M, efConstruction)
- Experiment with similarity thresholds
- Add metadata filters (task type, date range)

### 3. Train Decision Layer
- After 500+ trajectories
- Follow training guide in [RL_ARCHITECTURE.md](./RL_ARCHITECTURE.md)
- Benchmark against retrieval-only

### 4. Production Deployment
- Monitor performance metrics
- Set up continuous learning (retrain every 100 episodes)
- Implement A/B testing (DT vs baseline)

---

## Resources

- [Main Guide](./DECISION_TRANSFORMER.md) - Comprehensive overview
- [Architecture](./RL_ARCHITECTURE.md) - Technical details
- [API Reference](./RL_API_REFERENCE.md) - Complete API
- [Benchmarks](./RL_BENCHMARKS.md) - Performance data

---

## Example Repository

Full working example:
```bash
git clone https://github.com/agentic-flow/sqlite-vector-rl-example
cd sqlite-vector-rl-example
npm install
npm run example:quickstart
```

---

**You're now ready to use Decision Transformer!** 🚀

Start collecting trajectories and watch your AI agent improve over time.
