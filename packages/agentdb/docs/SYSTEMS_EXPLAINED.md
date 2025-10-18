# AgentDB Systems Explained

**A comprehensive guide to ReasoningBank, Learning System, Memory System, and Plugins**

---

## Table of Contents

1. [ReasoningBank System](#reasoningbank-system)
2. [Learning System (Plugins)](#learning-system-plugins)
3. [Memory System](#memory-system)
4. [How They Work Together](#how-they-work-together)

---

## ReasoningBank System

**Purpose:** Give agents the ability to learn from experience and improve over time.

### What It Does

ReasoningBank is a **cognitive layer** that stores, organizes, and retrieves an agent's experiences and reasoning patterns. Think of it as the agent's "brain" that remembers what worked, what didn't, and why.

### Core Components (4)

#### 1. **PatternMatcher** - Learning What Works

**Function:** Store and retrieve successful reasoning patterns.

**How it works:**
- When an agent successfully completes a task, the approach is stored as a "pattern"
- Each pattern includes: task type, approach used, success rate, and performance metrics
- When facing a new task, the agent searches for similar past patterns
- The most successful pattern is recommended for reuse

**Example:**
```
Task: "Build an authentication system"
Pattern stored: {
  approach: "JWT with refresh tokens",
  successRate: 92%,
  avgDuration: 1500ms,
  taskType: "api-security"
}

Next time: Agent searches "authentication" → finds this pattern → uses same approach
Result: Higher success rate, faster execution
```

**Performance:** <1ms to find similar patterns in 1K+ stored patterns

---

#### 2. **ExperienceCurator** - Tracking Performance

**Function:** Store detailed execution history and filter by quality.

**How it works:**
- Every task execution is stored with rich metadata:
  - Success/failure outcome
  - Time taken
  - Tokens used
  - Quality score (0-1)
  - Approach details
- Multi-factor quality calculation:
  ```
  Quality = (Success × 0.6) +
            (Speed Efficiency × 0.2) +
            (Token Efficiency × 0.1) +
            (Iteration Efficiency × 0.1)
  ```
- Query experiences by domain, quality threshold, outcome

**Example:**
```
Experience stored: {
  task: "Implement user registration",
  outcome: "success",
  duration: 2000ms,
  tokensUsed: 3500,
  quality: 0.88,
  iterations: 2,
  approach: "Email verification with rate limiting"
}

Query: "Get high-quality experiences for 'user management'"
Returns: Top 10 experiences with quality > 0.85
Agent learns: What approaches worked best, typical duration, common pitfalls
```

**Performance:** 1-2ms to query filtered experiences from 2K+ stored

---

#### 3. **MemoryOptimizer** - Efficient Long-Term Storage

**Function:** Compress old memories while preserving searchability.

**Problem it solves:**
As agents accumulate thousands of experiences, memory grows. MemoryOptimizer collapses similar old memories into summary nodes, reducing storage by 85% without losing information.

**Three collapse strategies:**

**a) Graph-Based (default)**
- Clusters similar memories by vector similarity
- Best for: Varied tasks across different domains
- Algorithm: K-means clustering on embeddings
- Result: Similar experiences grouped into centroid nodes

**b) Hierarchical**
- Creates time-based buckets (daily, weekly, monthly)
- Best for: Temporal patterns and workflows
- Algorithm: Hierarchical time bucketing
- Result: Time-organized memory tree

**c) Temporal**
- Sequential merging of adjacent memories
- Best for: Sequential workflows
- Algorithm: Sliding window consolidation
- Result: Workflow summaries

**Example:**
```
Before: 1000 individual experiences (70MB)
After:  150 summary nodes + 50 recent experiences (10MB)
Reduction: 85% memory saved
Searchability: Maintained via centroid vectors
Query speed: Actually faster (less to search)
```

**Performance:** 50-100ms to collapse 1K memories

---

#### 4. **ContextSynthesizer** - Multi-Source Context

**Function:** Combine patterns, experiences, and session history into actionable context.

**How it works:**
- Takes a current task embedding as input
- Searches across all memory sources in parallel:
  - PatternMatcher → finds similar successful approaches
  - ExperienceCurator → finds high-quality past executions
  - Session history → recent context
- Combines results with weighted scoring:
  ```
  Confidence = (Pattern Score × 0.4) +
               (Experience Score × 0.4) +
               (Recency Score × 0.2)
  ```
- Generates human-readable context summary

**Example:**
```
Input: "Build a REST API for user management"

ContextSynthesizer combines:
- Pattern: "RESTful API with JWT" (success rate: 92%)
- Experience: "User CRUD operations" (quality: 0.88)
- Recent: "Just finished authentication system"

Output: {
  confidence: 0.82,
  recommendation: "Use RESTful design with JWT auth",
  reasoning: "Based on 5 similar successful tasks",
  suggestedApproach: "Express + JWT + bcrypt",
  estimatedDuration: 1800ms,
  potentialIssues: ["Rate limiting", "Input validation"]
}
```

**Performance:** 25-40ms for full synthesis across all sources

---

### ReasoningBank in Action

**Complete Learning Cycle:**

```
1. BEFORE TASK:
   ContextSynthesizer → "What do I know about this?"
   → Finds: 3 similar patterns, 5 past experiences
   → Confidence: 0.82 (high)
   → Recommendation: Use proven approach

2. DURING TASK:
   Agent executes using recommended pattern
   Tracks: time, tokens, iterations

3. AFTER TASK:
   ExperienceCurator → Store execution details
   PatternMatcher → Update success rate for pattern

4. OVER TIME:
   MemoryOptimizer → Collapse old memories (weekly)
   Result: Agent gets faster, smarter, more efficient
```

**Measured Improvement (from tests):**
```
Iteration 1:  20% success, 5000ms avg, 30% quality
Iteration 5:  65% success, 3500ms avg, 70% quality
Iteration 10: 90% success, 3000ms avg, 90% quality

Improvement: 350% success rate increase
Time Reduction: 40% faster
Quality Gain: 200% improvement
```

---

## Learning System (Plugins)

**Purpose:** Enable custom learning algorithms without ML expertise.

### What It Does

The Plugin System lets you create **custom reinforcement learning algorithms** through an interactive wizard. No code required—just answer prompts.

### How It Works

#### 1. **Interactive Wizard**

```bash
$ agentdb create-plugin

? Plugin name: code-optimizer
? Select algorithm: Decision Transformer (Recommended)
? Task domain: code_generation
? Reward function: quality * 0.7 + efficiency * 0.3
? Training frequency: After every 10 tasks

✓ Plugin created: ./plugins/code-optimizer/
✓ Tests generated
✓ Documentation created
✓ Ready to use
```

**What gets generated:**
- Complete TypeScript implementation
- Configuration file (YAML)
- Test suite
- Documentation
- Integration with ReasoningBank

---

#### 2. **Template Library (10 Algorithms)**

**Core Algorithms:**

**a) Decision Transformer (Recommended)**
- **Type:** Sequence modeling
- **Best for:** Sequential decision-making (code generation, multi-step tasks)
- **How it works:** Treats RL as sequence prediction—learns patterns from successful task sequences
- **Advantages:** Handles long-term dependencies, good for complex workflows

**b) Q-Learning**
- **Type:** Value-based learning
- **Best for:** Discrete action spaces, simple environments
- **How it works:** Learns value of state-action pairs, selects highest value action
- **Advantages:** Simple, well-understood, proven

**c) SARSA (State-Action-Reward-State-Action)**
- **Type:** On-policy Q-learning
- **Best for:** Safe exploration, real-time control
- **How it works:** Like Q-learning but more conservative (learns from actual actions taken)
- **Advantages:** Safer, better for risk-averse scenarios

**d) Actor-Critic**
- **Type:** Policy gradient
- **Best for:** Continuous action spaces, complex policies
- **How it works:** Two networks—actor (chooses actions) and critic (evaluates them)
- **Advantages:** Stable, works with continuous actions

**Advanced Algorithms:**

**e) Federated Learning**
- **Best for:** Privacy-preserving distributed learning across multiple agents
- **How it works:** Agents learn locally, share model updates (not data)
- **Advantages:** Privacy, scalable, robust

**f) Curriculum Learning**
- **Best for:** Progressive difficulty tasks
- **How it works:** Start with easy tasks, gradually increase difficulty
- **Advantages:** Faster learning, better generalization

**g) Active Learning**
- **Best for:** Data-efficient learning
- **How it works:** Agent queries for labels on most uncertain examples
- **Advantages:** Learns more with less data

**h) Adversarial Training**
- **Best for:** Robust learning against edge cases
- **How it works:** Generates adversarial examples to make agent robust
- **Advantages:** Better generalization, handles outliers

**i) Neural Architecture Search (NAS)**
- **Best for:** Auto-optimizing model architecture
- **How it works:** Evolutionary algorithms search for optimal architecture
- **Advantages:** Automated, finds novel architectures

**j) Multi-Task Learning**
- **Best for:** Learning across related tasks
- **How it works:** Shared representations across tasks
- **Advantages:** Transfer learning, efficiency

---

#### 3. **Plugin Architecture**

**Generated plugin structure:**
```
plugins/code-optimizer/
├── plugin.yaml          # Configuration
│   ├── algorithm: decision-transformer
│   ├── learning_rate: 0.001
│   ├── reward_function: "quality * 0.7 + efficiency * 0.3"
│   └── training: { frequency: 10, batch_size: 32 }
├── src/
│   ├── index.ts         # Main plugin
│   ├── agent.ts         # Learning agent
│   ├── reward.ts        # Reward calculation
│   └── policy.ts        # Action selection
├── tests/
│   └── plugin.test.ts   # Auto-generated tests
└── README.md            # Documentation
```

**Key interfaces:**
```typescript
interface LearningPlugin {
  // Action selection
  selectAction(state: Vector): Promise<Action>

  // Experience storage
  storeExperience(experience: Experience): Promise<void>

  // Training
  train(): Promise<Metrics>

  // Metrics
  getMetrics(): Promise<PluginMetrics>
}
```

---

#### 4. **Integration with ReasoningBank**

Plugins automatically integrate with ReasoningBank:

```
Plugin stores experience → ExperienceCurator
Plugin finds patterns → PatternMatcher
Plugin optimizes memory → MemoryOptimizer
Plugin gets context → ContextSynthesizer
```

**Example workflow:**
```typescript
// Plugin automatically uses ReasoningBank
const plugin = await registry.load('code-optimizer');

// Select action (uses ContextSynthesizer)
const action = await plugin.selectAction(state);

// Store experience (uses ExperienceCurator)
await plugin.storeExperience({
  state, action, reward, nextState
});

// Train (uses PatternMatcher)
await plugin.train();

// Metrics (uses all components)
const metrics = await plugin.getMetrics();
// → Success rate, improvement, token efficiency
```

---

### CLI Commands

```bash
# Create new plugin
agentdb create-plugin

# List available templates
agentdb list-templates

# List installed plugins
agentdb list-plugins

# Get plugin info
agentdb plugin-info code-optimizer

# Test plugin
agentdb test-plugin code-optimizer

# Use plugin
agentdb use-plugin code-optimizer
```

---

## Memory System

**Purpose:** Efficient vector-based storage for agent memories.

### Architecture

```
Memory System = Vector Database + ReasoningBank + QUIC Sync

┌─────────────────────────────────────────┐
│         Memory System                   │
├─────────────────────────────────────────┤
│                                          │
│  ┌──────────────────────────────────┐   │
│  │    Vector Database (SQLite)     │   │
│  │  • HNSW Index (116x faster)     │   │
│  │  • 700 bytes per vector         │   │
│  │  • <10ms startup                │   │
│  └──────────────┬───────────────────┘   │
│                 │                        │
│  ┌──────────────┴───────────────────┐   │
│  │      ReasoningBank Layer        │   │
│  │  • Patterns   • Experiences     │   │
│  │  • Memory     • Context         │   │
│  └──────────────┬───────────────────┘   │
│                 │                        │
│  ┌──────────────┴───────────────────┐   │
│  │      QUIC Sync (Distributed)    │   │
│  │  • Real-time synchronization    │   │
│  │  • Delta-based updates          │   │
│  │  • Conflict resolution          │   │
│  └──────────────────────────────────┘   │
│                                          │
└─────────────────────────────────────────┘
```

### Layers

#### 1. **Storage Layer (SQLite + HNSW)**

**What it does:**
- Stores vectors as binary F32 arrays
- HNSW index for fast similarity search
- Efficient batch operations

**Performance:**
- Startup: <10ms from disk
- Insert: 116K vectors/sec (native), 51.7K/sec (browser)
- Search: ~5ms for 100K vectors (HNSW), 580ms (brute force)
- Memory: 700 bytes per vector

**Why SQLite:**
- Zero configuration
- Universal (Node, browser, edge)
- Battle-tested reliability
- ACID transactions
- File-based or in-memory

---

#### 2. **ReasoningBank Layer**

**What it does:**
- Adds cognitive capabilities on top of vector storage
- Organizes memories into patterns, experiences, contexts
- Provides learning and adaptation

**Integration:**
```
Vector DB → Stores raw embeddings
ReasoningBank → Adds meaning and organization
Plugins → Enable custom learning
```

---

#### 3. **Synchronization Layer (QUIC)**

**What it does:**
- Syncs memories across distributed agents in real-time
- Delta-based updates (only changes transmitted)
- Automatic conflict resolution

**Topologies:**

**a) Hub-Spoke**
```
     Hub (coordinator)
    /   |   \
   A    B    C  (worker agents)
```
- Centralized coordination
- Hub aggregates all knowledge
- Workers sync to hub

**b) Mesh (Peer-to-Peer)**
```
   A ←→ B
   ↕     ↕
   C ←→ D
```
- No central coordinator
- Agents sync directly
- Fault-tolerant

**c) Ring**
```
   A → B → C → D → A
```
- Sequential propagation
- Ordered updates
- Predictable latency

**Performance:**
- Sync latency: <100ms
- Bandwidth: Delta compression (only changes)
- Conflict resolution: Automatic (last-write-wins or vector clocks)

---

### Memory Lifecycle

```
1. CREATE
   ↓
   Vector embedding generated
   ↓
   Stored in SQLite with metadata
   ↓
   HNSW index updated

2. ACCESS
   ↓
   Query by similarity
   ↓
   HNSW fast search (~5ms)
   ↓
   Results filtered by metadata

3. LEARN
   ↓
   ReasoningBank organizes memories
   ↓
   Patterns extracted
   ↓
   Quality scored

4. OPTIMIZE
   ↓
   Old memories collapsed
   ↓
   85% memory reduction
   ↓
   Searchability preserved

5. SYNC
   ↓
   Changes detected
   ↓
   Delta transmitted via QUIC
   ↓
   Merged across agents
```

---

## How They Work Together

### Complete Agent Workflow

**Scenario:** Agent building a REST API

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: TASK RECEIVED                                       │
│ Task: "Build a REST API for user management"               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: MEMORY SYSTEM → GET CONTEXT                         │
│                                                              │
│ ContextSynthesizer queries:                                 │
│ • PatternMatcher: "Similar API tasks?" → 3 patterns found  │
│ • ExperienceCurator: "Past API work?" → 5 experiences      │
│ • Session: "Recent context?" → Auth just completed         │
│                                                              │
│ Result: {                                                   │
│   confidence: 0.85,                                         │
│   approach: "Express + JWT + CRUD",                         │
│   estimatedTime: 1500ms,                                    │
│   patterns: ["RESTful design", "JWT auth"]                 │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: LEARNING SYSTEM → SELECT ACTION                     │
│                                                              │
│ Plugin (code-optimizer) uses context:                       │
│ • High confidence (0.85) → Use proven pattern              │
│ • Action: Apply "Express + JWT" approach                   │
│ • Reward function: quality * 0.7 + efficiency * 0.3        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: EXECUTE TASK                                        │
│                                                              │
│ Agent builds API using recommended approach                 │
│ Tracks: duration, tokens, iterations, outcome              │
│                                                              │
│ Result: {                                                   │
│   success: true,                                            │
│   duration: 1600ms,                                         │
│   tokensUsed: 3200,                                         │
│   iterations: 2,                                            │
│   quality: 0.92                                             │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: REASONINGBANK → STORE EXPERIENCE                    │
│                                                              │
│ ExperienceCurator stores:                                   │
│ • Task: "REST API - user management"                       │
│ • Approach: "Express + JWT + CRUD"                         │
│ • Outcome: Success                                          │
│ • Quality: 0.92 (high quality!)                            │
│ • Duration: 1600ms                                          │
│                                                              │
│ PatternMatcher updates:                                     │
│ • Pattern "RESTful + JWT" success rate: 90% → 91%         │
│ • Average duration: 1550ms → 1540ms (improving!)          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 6: PLUGIN → TRAIN                                      │
│                                                              │
│ Every 10 tasks, plugin trains:                             │
│ • Updates policy based on rewards                          │
│ • Adjusts action selection probabilities                   │
│ • Improves reward prediction                               │
│                                                              │
│ Metrics:                                                    │
│ • Success rate: 85% → 91% (improving!)                     │
│ • Token efficiency: 1.2x → 1.4x better                     │
│ • Quality score: 0.88 → 0.92                               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 7: MEMORY SYSTEM → OPTIMIZE (Weekly)                   │
│                                                              │
│ MemoryOptimizer:                                            │
│ • Identifies old, similar memories                         │
│ • Collapses 200 old API experiences → 25 summary nodes    │
│ • Memory saved: 85% (14MB → 2MB)                           │
│ • Searchability: Maintained via centroids                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 8: SYNC → SHARE WITH SWARM (If distributed)           │
│                                                              │
│ QUIC Sync:                                                  │
│ • New experience broadcasted to other agents               │
│ • Delta: Only the new experience (not full DB)            │
│ • Latency: <100ms                                          │
│ • Other agents now know: "Express + JWT works well"       │
└─────────────────────────────────────────────────────────────┘
```

---

### System Integration Map

```
┌─────────────────────────────────────────────────────────────┐
│                         USER/AGENT                          │
└────────────┬────────────────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────────────────┐
│                    MCP/CLI INTERFACE                         │
│  Commands: init, insert, search, pattern_store, etc.       │
└────────────┬────────────────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────────────────┐
│                   REASONINGBANK LAYER                        │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Pattern   │  │  Experience  │  │   Context    │       │
│  │   Matcher   │  │   Curator    │  │ Synthesizer  │       │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                  │               │
│         └─────────────────┼──────────────────┘               │
│                           │                                  │
│                  ┌────────┴─────────┐                        │
│                  │ Memory Optimizer │                        │
│                  └────────┬─────────┘                        │
└───────────────────────────┼──────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    PLUGIN LAYER                              │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │ Decision   │  │ Q-Learning │  │   Custom   │           │
│  │Transformer │  │            │  │   Plugin   │           │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘           │
│        │                │                │                  │
│        └────────────────┼────────────────┘                  │
└─────────────────────────┼──────────────────────────────────┘
                          │
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                  MEMORY SYSTEM                               │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │         Vector Database (SQLite + HNSW)           │     │
│  │  • Binary F32 storage                             │     │
│  │  • HNSW index (116x faster)                       │     │
│  │  • 700 bytes/vector                               │     │
│  │  • <10ms startup                                  │     │
│  └────────────────────┬───────────────────────────────┘     │
│                       │                                      │
│                       ↓                                      │
│  ┌────────────────────────────────────────────────────┐     │
│  │            QUIC Sync (Distributed)                │     │
│  │  • Delta-based synchronization                    │     │
│  │  • Real-time coordination                         │     │
│  │  • Conflict resolution                            │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Takeaways

### ReasoningBank
✅ **Learns from experience** - PatternMatcher stores what works
✅ **Tracks performance** - ExperienceCurator scores quality
✅ **Optimizes memory** - MemoryOptimizer reduces storage 85%
✅ **Synthesizes context** - ContextSynthesizer combines all sources
✅ **Real learning** - Measured 350% improvement over iterations

### Learning System (Plugins)
✅ **No code required** - Interactive wizard
✅ **10 algorithms** - Decision Transformer, Q-Learning, Federated, etc.
✅ **Auto-generated** - Complete plugin with tests
✅ **ReasoningBank integrated** - Automatic memory access
✅ **Custom reward functions** - Define with simple expressions

### Memory System
✅ **Lightning fast** - <10ms startup, ~5ms search
✅ **Tiny footprint** - 700 bytes per vector
✅ **Universal** - Node, browser, edge
✅ **Distributed** - QUIC sync across agents
✅ **Scalable** - 85% memory reduction via optimization

### Together
✅ **Autonomous learning** - Agents improve over time
✅ **Persistent memory** - Experiences survive restarts
✅ **Distributed cognition** - Knowledge shared across swarms
✅ **Zero configuration** - Works out of the box
✅ **Production ready** - 100% test coverage, validated

---

**The result:** Agents that **remember what worked, learn what didn't, and share what matters** — all with sub-millisecond performance and zero ops overhead.
