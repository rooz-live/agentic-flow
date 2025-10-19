# AgentDB Memory Patterns Demo

Interactive demonstrations of memory patterns for AI agents using AgentDB.

## Features

- **Session Memory**: Conversation tracking with context retrieval
- **Pattern Learning**: Learn and reuse successful interaction patterns
- **Semantic Search**: Find relevant memories using vector similarity
- **Success Tracking**: Monitor and optimize pattern performance

## Quick Start

```bash
# Install dependencies
npm install

# Run session memory demo
npm run demo:session

# Run pattern learning demo
npm run demo:patterns

# Run all demos
npm run demo:all
```

## Demos

### 1. Session Memory (`session-memory-demo.ts`)

Demonstrates conversation memory management:

- Store user and assistant messages
- Retrieve recent conversation context
- Semantic search across messages
- Memory pruning and consolidation

**Example output:**
```
💬 Starting conversation...
💾 Stored user message: "Hello! What can you help me with?"
💾 Stored assistant message: "I can help you with coding, writing..."

🔍 Semantic search for: "authentication setup"
1. [assistant] For authentication, I recommend using JWT...
   Similarity: 0.887
```

### 2. Pattern Learning (`pattern-learning-demo.ts`)

Demonstrates learning from interactions:

- Store successful interaction patterns
- Match similar situations to past patterns
- Track success rates and usage
- Optimize responses over time

**Example output:**
```
✅ Stored pattern: user_asks_time → provide_formatted_time
   Success: true, Context: {"timezone":"UTC","format":"24h"}

🔍 Matching patterns for: "current time query"
1. user_asks_time → provide_formatted_time
   Success Rate: 100.0%
   Similarity: 95.3%
   Used 3 times
```

## Architecture

```
AgentDB Memory Patterns
│
├── SessionMemoryManager
│   ├── storeMessage()       - Save conversation messages
│   ├── getRecentContext()   - Retrieve recent context
│   ├── semanticSearch()     - Find similar messages
│   └── pruneOldMemories()   - Clean up old data
│
└── PatternLearningEngine
    ├── storePattern()       - Learn from interactions
    ├── matchPattern()       - Find similar patterns
    ├── recordOutcome()      - Track success/failure
    └── getTopPatterns()     - Analyze best patterns
```

## Integration with Claude Code

Use these patterns in your AI agents:

```typescript
import { SessionMemoryManager } from './session-memory-demo';

const memory = new SessionMemoryManager('user-123');
await memory.initialize();

// Store conversation
await memory.storeMessage('user', userInput);
const response = await generateResponse(userInput);
await memory.storeMessage('assistant', response);

// Get context for next response
const context = await memory.getRecentContext(10);
```

## Performance

- **Session Memory**: <10ms store, ~5ms retrieve
- **Pattern Learning**: <5ms match, <1ms record
- **Semantic Search**: ~5ms for 10K vectors with HNSW
- **Memory Footprint**: 700 bytes per message

## Learn More

- [AgentDB Documentation](../../packages/agentdb/README.md)
- [ReasoningBank Integration](../../src/reasoningbank/README.md)
- [Claude Code Skills](.claude/skills/agentic-flow/agentdb-memory-patterns/SKILL.md)

## License

MIT OR Apache-2.0
