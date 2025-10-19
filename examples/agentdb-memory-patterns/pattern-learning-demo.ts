#!/usr/bin/env node
/**
 * AgentDB Memory Patterns Demo - Pattern Learning
 *
 * Demonstrates:
 * 1. Learning from successful interactions
 * 2. Pattern matching and reuse
 * 3. Success tracking and metrics
 * 4. ReasoningBank integration
 */

import { createVectorDB } from 'agentdb';
import type { VectorDB } from 'agentdb';

interface Pattern {
  id: string;
  trigger: string;
  response: string;
  success: boolean;
  successRate: number;
  usageCount: number;
  context: Record<string, any>;
  embedding: number[];
}

class PatternLearningEngine {
  private db!: VectorDB;
  private patterns: Map<string, Pattern> = new Map();

  async initialize() {
    this.db = await createVectorDB({
      path: './data/pattern-learning.db',
      hnsw: { enabled: true, M: 16, efConstruction: 200 }
    });

    console.log('✅ Pattern learning engine initialized\n');
  }

  async storePattern(pattern: Omit<Pattern, 'id' | 'successRate' | 'usageCount'>) {
    const id = `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const fullPattern: Pattern = {
      ...pattern,
      id,
      successRate: pattern.success ? 1.0 : 0.0,
      usageCount: 1
    };

    await this.db.insert({
      embedding: pattern.embedding,
      metadata: {
        id: fullPattern.id,
        trigger: fullPattern.trigger,
        response: fullPattern.response,
        successRate: fullPattern.successRate,
        usageCount: fullPattern.usageCount,
        context: JSON.stringify(fullPattern.context)
      }
    });

    this.patterns.set(id, fullPattern);

    console.log(`✅ Stored pattern: ${pattern.trigger} → ${pattern.response}`);
    console.log(`   Success: ${pattern.success}, Context: ${JSON.stringify(pattern.context)}\n`);

    return id;
  }

  async matchPattern(trigger: string, embedding: number[], k: number = 3) {
    const results = await this.db.search({
      query: embedding,
      k
    });

    console.log(`🔍 Matching patterns for: "${trigger}"\n`);

    const matches = results.map(r => ({
      trigger: r.metadata.trigger,
      response: r.metadata.response,
      successRate: r.metadata.successRate,
      usageCount: r.metadata.usageCount,
      similarity: 1 - r.distance,
      context: JSON.parse(r.metadata.context || '{}')
    }));

    matches.forEach((match, i) => {
      console.log(`${i + 1}. ${match.trigger} → ${match.response}`);
      console.log(`   Success Rate: ${(match.successRate * 100).toFixed(1)}%`);
      console.log(`   Similarity: ${(match.similarity * 100).toFixed(1)}%`);
      console.log(`   Used ${match.usageCount} times\n`);
    });

    return matches;
  }

  async recordOutcome(patternId: string, success: boolean) {
    const pattern = this.patterns.get(patternId);
    if (!pattern) {
      console.error(`❌ Pattern ${patternId} not found`);
      return;
    }

    // Update success rate using moving average
    const totalSuccesses = pattern.successRate * pattern.usageCount;
    pattern.usageCount += 1;
    pattern.successRate = (totalSuccesses + (success ? 1 : 0)) / pattern.usageCount;

    console.log(`📊 Updated pattern ${patternId}:`);
    console.log(`   Success rate: ${(pattern.successRate * 100).toFixed(1)}%`);
    console.log(`   Usage count: ${pattern.usageCount}\n`);
  }

  async getTopPatterns(limit: number = 10) {
    const sorted = Array.from(this.patterns.values())
      .sort((a, b) => b.successRate * b.usageCount - a.successRate * a.usageCount);

    console.log(`🏆 Top ${limit} Patterns:\n`);

    sorted.slice(0, limit).forEach((pattern, i) => {
      const score = pattern.successRate * pattern.usageCount;
      console.log(`${i + 1}. ${pattern.trigger} → ${pattern.response}`);
      console.log(`   Score: ${score.toFixed(2)} (${(pattern.successRate * 100).toFixed(1)}% × ${pattern.usageCount} uses)\n`);
    });

    return sorted.slice(0, limit);
  }

  // Mock embedding function
  private mockEmbedding(text: string): number[] {
    const hash = text.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);

    return Array.from({ length: 128 }, (_, i) => Math.sin(hash + i) * 0.5 + 0.5);
  }

  // Helper to create embeddings
  createEmbedding(text: string) {
    return this.mockEmbedding(text);
  }
}

async function runDemo() {
  console.log('🧠 AgentDB Memory Patterns - Pattern Learning Demo\n');
  console.log('='.repeat(60) + '\n');

  const engine = new PatternLearningEngine();
  await engine.initialize();

  // Learn patterns from interactions
  console.log('📚 Learning patterns from interactions...\n');

  const p1 = await engine.storePattern({
    trigger: 'user_asks_time',
    response: 'provide_formatted_time',
    success: true,
    context: { timezone: 'UTC', format: '24h' },
    embedding: engine.createEmbedding('what time is it')
  });

  const p2 = await engine.storePattern({
    trigger: 'user_asks_weather',
    response: 'fetch_weather_api',
    success: true,
    context: { location: 'auto', units: 'metric' },
    embedding: engine.createEmbedding('what is the weather')
  });

  const p3 = await engine.storePattern({
    trigger: 'user_requests_summary',
    response: 'generate_summary',
    success: true,
    context: { style: 'bullet_points', maxLength: 500 },
    embedding: engine.createEmbedding('summarize this document')
  });

  const p4 = await engine.storePattern({
    trigger: 'user_asks_calculation',
    response: 'evaluate_expression',
    success: true,
    context: { precision: 2, showSteps: false },
    embedding: engine.createEmbedding('calculate 25 * 4')
  });

  // Record more usage
  await engine.recordOutcome(p1, true);
  await engine.recordOutcome(p1, true);
  await engine.recordOutcome(p2, true);
  await engine.recordOutcome(p2, false);

  // Match patterns
  console.log('='.repeat(60) + '\n');
  await engine.matchPattern('current time query', engine.createEmbedding('show me the current time'));

  console.log('='.repeat(60) + '\n');
  await engine.matchPattern('weather inquiry', engine.createEmbedding('how is the weather today'));

  // Show top patterns
  console.log('='.repeat(60) + '\n');
  await engine.getTopPatterns(5);

  console.log('='.repeat(60));
  console.log('✅ Demo complete!\n');
}

if (require.main === module) {
  runDemo().catch(console.error);
}

export { PatternLearningEngine, runDemo };
