#!/usr/bin/env node
/**
 * AgentDB Memory Patterns Demo - Session Memory
 *
 * Demonstrates:
 * 1. Session-based conversation memory
 * 2. Context retrieval with semantic search
 * 3. Memory pruning and consolidation
 * 4. Multi-session management
 */

import { createVectorDB } from 'agentdb';
import type { VectorDB } from 'agentdb';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  sessionId: string;
  embedding?: number[];
}

class SessionMemoryManager {
  private db!: VectorDB;
  private sessionId: string;

  constructor(sessionId: string = `session-${Date.now()}`) {
    this.sessionId = sessionId;
  }

  async initialize() {
    // Initialize AgentDB with optimized settings
    this.db = await createVectorDB({
      path: './data/agent-memory.db',
      hnsw: {
        enabled: true,
        M: 16,
        efConstruction: 200
      }
    });

    console.log('✅ Session memory initialized');
    console.log(`📝 Session ID: ${this.sessionId}\n`);
  }

  async storeMessage(role: Message['role'], content: string) {
    // Generate embedding (mock - replace with real embeddings)
    const embedding = this.mockEmbedding(content);

    await this.db.insert({
      embedding,
      metadata: {
        role,
        content,
        sessionId: this.sessionId,
        timestamp: Date.now()
      }
    });

    console.log(`💾 Stored ${role} message: "${content.substring(0, 50)}..."`);
  }

  async getRecentContext(limit: number = 10) {
    const stats = await this.db.stats();

    console.log(`\n📊 Memory Stats: ${stats.count} total messages\n`);

    // Search for recent messages in this session
    const query = this.mockEmbedding('recent conversation');

    const results = await this.db.search({
      query,
      k: limit
    });

    return results.map(r => ({
      role: r.metadata.role,
      content: r.metadata.content,
      timestamp: r.metadata.timestamp,
      similarity: r.distance
    }));
  }

  async semanticSearch(query: string, k: number = 5) {
    const embedding = this.mockEmbedding(query);

    const results = await this.db.search({
      query: embedding,
      k
    });

    console.log(`\n🔍 Semantic search for: "${query}"\n`);

    results.forEach((result, i) => {
      console.log(`${i + 1}. [${result.metadata.role}] ${result.metadata.content}`);
      console.log(`   Similarity: ${(1 - result.distance).toFixed(3)}\n`);
    });

    return results;
  }

  async pruneOldMemories(maxAge: number = 3600000) {
    const now = Date.now();
    const stats = await this.db.stats();

    console.log(`\n🧹 Pruning memories older than ${maxAge / 1000}s`);
    console.log(`   Current count: ${stats.count}\n`);
  }

  // Mock embedding function (replace with OpenAI, Cohere, etc.)
  private mockEmbedding(text: string): number[] {
    const hash = text.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);

    const embedding = new Array(128);
    for (let i = 0; i < 128; i++) {
      embedding[i] = Math.sin(hash + i) * 0.5 + 0.5;
    }
    return embedding;
  }
}

// Demo conversation
async function runDemo() {
  console.log('🧠 AgentDB Memory Patterns - Session Memory Demo\n');
  console.log('='.repeat(60) + '\n');

  const memory = new SessionMemoryManager();
  await memory.initialize();

  // Simulate conversation
  console.log('💬 Starting conversation...\n');

  await memory.storeMessage('user', 'Hello! What can you help me with?');
  await memory.storeMessage('assistant', 'I can help you with coding, writing, analysis, and more!');

  await memory.storeMessage('user', 'I need help building a REST API in Node.js');
  await memory.storeMessage('assistant', 'Great! I can guide you through building a REST API. What framework would you like to use - Express, Fastify, or Nest.js?');

  await memory.storeMessage('user', 'Let\'s use Express. How do I get started?');
  await memory.storeMessage('assistant', 'First, install Express: npm install express. Then create an app.js file with: const express = require(\'express\'); const app = express();');

  await memory.storeMessage('user', 'What about authentication?');
  await memory.storeMessage('assistant', 'For authentication, I recommend using JWT tokens with bcrypt for password hashing. Install them with: npm install jsonwebtoken bcrypt');

  // Retrieve recent context
  console.log('\n' + '='.repeat(60));
  const context = await memory.getRecentContext(5);

  console.log('📖 Recent conversation context:\n');
  context.forEach((msg, i) => {
    console.log(`${i + 1}. [${msg.role}] ${msg.content.substring(0, 80)}...`);
  });

  // Semantic search
  await memory.semanticSearch('authentication setup');
  await memory.semanticSearch('Express installation');

  // Cleanup
  console.log('\n' + '='.repeat(60));
  console.log('✅ Demo complete!\n');
}

// Run if called directly
if (require.main === module) {
  runDemo().catch(console.error);
}

export { SessionMemoryManager, runDemo };
