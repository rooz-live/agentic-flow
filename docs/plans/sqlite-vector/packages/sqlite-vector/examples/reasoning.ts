/**
 * SQLiteVector - ReasoningBank Integration Example
 *
 * Demonstrates pattern matching, experience curation, and context synthesis
 */

import { SqliteVectorDB, createConfig, TaskOutcome, ContextSource } from '../src';

async function reasoningBankExample() {
  console.log('=== SQLiteVector ReasoningBank Integration Example ===\n');

  // Create configuration with ReasoningBank enabled
  const config = createConfig()
    .mode('persistent')
    .path('./reasoning-bank.db')
    .dimension(1536)
    .reasoningBank({
      enabled: true,
      patternThreshold: 0.75,
      qualityThreshold: 0.8,
      contextDepth: 'comprehensive',
    })
    .build();

  const db = await SqliteVectorDB.new(config);
  console.log('✓ Database created with ReasoningBank integration\n');

  // ============================================================================
  // Store successful experiences (patterns)
  // ============================================================================

  console.log('📝 Storing successful experiences...');

  const experiences = [
    {
      task: 'implement-authentication',
      embedding: Array.from({ length: 1536 }, () => Math.random()),
      outcome: {
        taskId: 'task-001',
        success: true,
        durationMs: 15000,
        qualityScore: 0.92,
        metadata: {
          approach: 'jwt-tokens',
          linesOfCode: 250,
        },
      },
    },
    {
      task: 'optimize-database-queries',
      embedding: Array.from({ length: 1536 }, () => Math.random()),
      outcome: {
        taskId: 'task-002',
        success: true,
        durationMs: 12000,
        qualityScore: 0.88,
        metadata: {
          approach: 'indexing',
          performanceGain: '10x',
        },
      },
    },
    {
      task: 'implement-caching',
      embedding: Array.from({ length: 1536 }, () => Math.random()),
      outcome: {
        taskId: 'task-003',
        success: true,
        durationMs: 8000,
        qualityScore: 0.95,
        metadata: {
          approach: 'redis',
          cacheHitRate: 0.85,
        },
      },
    },
    {
      task: 'failed-deployment',
      embedding: Array.from({ length: 1536 }, () => Math.random()),
      outcome: {
        taskId: 'task-004',
        success: false,
        durationMs: 30000,
        qualityScore: 0.3, // Low quality - won't be stored
        metadata: {
          error: 'configuration-issue',
        },
      },
    },
  ];

  for (const exp of experiences) {
    const id = await db.storeExperience(exp.embedding, exp.outcome);
    if (id) {
      console.log(`  ✓ Stored experience: ${exp.task} (quality: ${exp.outcome.qualityScore})`);
    } else {
      console.log(`  ✗ Skipped low-quality experience: ${exp.task}`);
    }
  }
  console.log();

  // ============================================================================
  // Find similar patterns
  // ============================================================================

  console.log('🔍 Finding similar patterns for new task...');

  const newTask = {
    description: 'implement-session-management',
    embedding: Array.from({ length: 1536 }, () => Math.random()),
  };

  const similarPatterns = await db.findSimilarPatterns(newTask.embedding, 3, 0.7);

  console.log(`  Found ${similarPatterns.length} similar patterns:\n`);
  similarPatterns.forEach((pattern, i) => {
    console.log(`  ${i + 1}. Similarity: ${pattern.similarity.toFixed(4)}`);
    console.log(`     Description: ${pattern.metadata?.approach || 'N/A'}`);
    console.log(`     Success rate: ${pattern.successRate?.toFixed(2) || 'N/A'}`);
    console.log();
  });

  // ============================================================================
  // Synthesize context from multiple sources
  // ============================================================================

  console.log('🧠 Synthesizing comprehensive context...');

  const sources: ContextSource[] = [
    { type: 'similar-patterns', count: 5, threshold: 0.7 },
    { type: 'recent-experiences', count: 10 },
  ];

  const context = await db.synthesizeContext(newTask.embedding, sources);

  console.log(`  Context synthesis complete:\n`);
  console.log(`  • Patterns found: ${context.patterns.length}`);
  console.log(`  • Experiences found: ${context.experiences.length}`);
  console.log(`  • Insights generated:\n`);
  context.insights.forEach((insight) => {
    console.log(`    - ${insight}`);
  });
  console.log();

  // ============================================================================
  // Advanced search with metadata filtering
  // ============================================================================

  console.log('🎯 Advanced search with metadata filter...');

  const results = await db.search(newTask.embedding, 5, 'cosine', 0.0, {
    metadataFilter: { success: true },
    includeVectors: false,
  });

  console.log(`  Found ${results.length} successful experiences:`);
  results.forEach((r, i) => {
    console.log(
      `  ${i + 1}. Similarity: ${r.similarity.toFixed(4)}, Approach: ${r.metadata?.approach}`
    );
  });
  console.log();

  // ============================================================================
  // Session management for long-term memory
  // ============================================================================

  console.log('💾 Saving session for long-term memory...');

  const snapshot = await db.saveSession('session-001');
  console.log(`  ✓ Session saved: ${snapshot.sessionId}`);
  console.log(`    Vectors: ${snapshot.vectorCount}`);
  console.log(`    Timestamp: ${new Date(snapshot.timestamp).toISOString()}\n`);

  // Simulate restoring session (in a new instance)
  console.log('🔄 Restoring session...');
  const restoreResult = await db.restoreSession('session-001');

  if (restoreResult.success) {
    console.log(`  ✓ Session restored successfully`);
    console.log(`    Vectors restored: ${restoreResult.vectorsRestored}`);
    console.log(`    Time: ${restoreResult.restoreTimeMs}ms\n`);
  } else {
    console.log(`  ✗ Session restore failed: ${restoreResult.error}\n`);
  }

  // Get final statistics
  const stats = await db.getStats();
  console.log('📊 Final ReasoningBank statistics:');
  console.log(`  Total patterns: ${stats.totalVectors}`);
  console.log(`  Average quality: ${stats.performance.cacheHitRate.toFixed(2)}`);
  console.log(`  Search performance: ${stats.performance.avgSearchLatencyUs.toFixed(0)}μs\n`);

  // Close database
  await db.close();
  console.log('✓ Database closed');
}

// Run example
reasoningBankExample().catch(console.error);
