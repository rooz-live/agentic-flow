/**
 * Comprehensive ReasoningBank Integration Test
 * Tests all ReasoningBank components and verifies database persistence
 */

import { createVectorDB } from '../../src/index';
import { PatternMatcher } from '../../src/reasoning/pattern-matcher';
import { ExperienceCurator } from '../../src/reasoning/experience-curator';
import { MemoryOptimizer } from '../../src/reasoning/memory-optimizer';
import { existsSync, statSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';

// Test configuration
const DATA_DIR = './data';
const DB_FILE = 'reasoningbank-test.db';

describe('ReasoningBank Integration Tests', () => {
  const dbPath = join(DATA_DIR, DB_FILE);

  beforeAll(() => {
    // Ensure data directory exists
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }
    // Clean up any existing test database
    if (existsSync(dbPath)) {
      unlinkSync(dbPath);
    }
  });

  afterAll(() => {
    // Clean up test database
    if (existsSync(dbPath)) {
      unlinkSync(dbPath);
    }
  });

  it('should create database with file persistence', async () => {
    const db = await createVectorDB({
      path: dbPath
    });

    expect(db).toBeTruthy();
    db.close();
  });

  it('should insert vectors and persist to disk', async () => {
    const db = await createVectorDB({
      path: dbPath
    });

    const testVectors = [
      { embedding: [1, 0, 0], metadata: { task: 'code-review', success: true } },
      { embedding: [0, 1, 0], metadata: { task: 'bug-fix', success: true } },
      { embedding: [0, 0, 1], metadata: { task: 'feature-dev', success: false } },
      { embedding: [0.7, 0.3, 0], metadata: { task: 'refactor', success: true } },
      { embedding: [0.2, 0.8, 0], metadata: { task: 'testing', success: true } },
    ];

    const ids = db.insertBatch(testVectors);
    expect(ids).toHaveLength(5);

    const stats = db.stats();
    expect(stats.count).toBe(5);

    console.log(`   📊 Vectors: ${stats.count}, Size: ${stats.size} bytes`);

    db.close();

    // Verify file exists on disk
    expect(existsSync(dbPath)).toBe(true);

    const dbFileSize = statSync(dbPath).size;
    console.log(`   💾 Database file: ${dbPath}`);
    console.log(`   📦 File size: ${(dbFileSize / 1024).toFixed(2)} KB`);
  });

  it('should store and retrieve patterns with PatternMatcher', async () => {
    const db = await createVectorDB({
      path: dbPath
    });

    const matcher = new PatternMatcher(db);

    // Store reasoning patterns
    const pattern1Id = await matcher.storePattern({
      embedding: [0.9, 0.1, 0],
      taskType: 'code-review',
      approach: 'static-analysis-first',
      successRate: 0.85,
      avgDuration: 1200,
      metadata: {
        domain: 'software-engineering',
        complexity: 'medium',
        learningSource: 'success',
        iterations: 1,
        tags: ['code-quality', 'best-practices']
      }
    });

    expect(pattern1Id).toBeTruthy();
    console.log(`   🔑 Pattern ID: ${pattern1Id}`);

    const pattern2Id = await matcher.storePattern({
      embedding: [0.1, 0.9, 0],
      taskType: 'bug-fix',
      approach: 'reproduce-then-fix',
      successRate: 0.92,
      avgDuration: 800,
      metadata: {
        domain: 'software-engineering',
        complexity: 'complex',
        learningSource: 'success',
        iterations: 1,
        tags: ['debugging', 'root-cause']
      }
    });

    expect(pattern2Id).toBeTruthy();

    // Find similar patterns
    const queryEmbedding = [0.95, 0.05, 0];
    const similarPatterns = await matcher.findSimilar(queryEmbedding, 2, 0.7);

    expect(similarPatterns.length).toBeGreaterThan(0);
    console.log(`   🔍 Found ${similarPatterns.length} similar patterns`);

    if (similarPatterns.length > 0) {
      console.log(`   📈 Best match: ${similarPatterns[0].taskType} (similarity: ${similarPatterns[0].similarity.toFixed(3)})`);
    }

    // Get pattern statistics
    const patternStats = matcher.getStats();
    expect(patternStats.totalPatterns).toBeGreaterThan(0);
    console.log(`   📊 Total patterns: ${patternStats.totalPatterns}`);
    console.log(`   ✨ Avg success rate: ${(patternStats.avgSuccessRate * 100).toFixed(1)}%`);

    db.close();
  });

  it('should store and query experiences with ExperienceCurator', async () => {
    const db = await createVectorDB({
      path: dbPath
    });

    const curator = new ExperienceCurator(db);

    // Store task execution experiences
    const exp1Id = await curator.storeExperience({
      taskEmbedding: [0.8, 0.2, 0],
      taskDescription: 'Implement OAuth2 authentication',
      success: true,
      duration: 3600000,
      approach: 'Use passport.js with JWT tokens',
      outcome: 'Successfully implemented with 2FA support',
      quality: 0.92,
      metadata: {
        domain: 'web-development',
        agentType: 'backend-developer',
        tokensUsed: 5000,
        iterationCount: 3
      }
    });

    expect(exp1Id).toBeTruthy();
    console.log(`   🔑 Experience ID: ${exp1Id}`);

    const exp2Id = await curator.storeExperience({
      taskEmbedding: [0.3, 0.7, 0],
      taskDescription: 'Fix memory leak in data processing',
      success: true,
      duration: 1800000,
      approach: 'Profiled with Chrome DevTools, fixed buffer pooling',
      outcome: 'Memory usage reduced by 70%',
      quality: 0.88,
      metadata: {
        domain: 'performance-optimization',
        agentType: 'debugger',
        tokensUsed: 3000,
        iterationCount: 2
      }
    });

    expect(exp2Id).toBeTruthy();

    // Query similar experiences
    const taskEmbedding = [0.75, 0.25, 0];
    const experiences = await curator.queryExperiences(taskEmbedding, 5, {
      successOnly: true,
      minQuality: 0.8,
      domain: 'web-development'
    });

    expect(experiences.length).toBeGreaterThan(0);
    console.log(`   🔍 Found ${experiences.length} relevant experiences`);

    if (experiences.length > 0) {
      console.log(`   🎯 Most relevant: "${experiences[0].taskDescription.substring(0, 50)}..."`);
      console.log(`   📊 Quality: ${experiences[0].quality.toFixed(2)}, Relevance: ${experiences[0].relevance.toFixed(3)}`);
    }

    // Get experience statistics
    const expStats = curator.getStats();
    expect(expStats.totalExperiences).toBeGreaterThan(0);
    console.log(`   📊 Total experiences: ${expStats.totalExperiences}`);
    console.log(`   ✨ Success rate: ${(expStats.successRate * 100).toFixed(1)}%`);
    console.log(`   ⏱️  Avg duration: ${(expStats.avgDuration / 1000).toFixed(0)}s`);

    db.close();
  });

  it('should optimize memory with MemoryOptimizer', async () => {
    const db = await createVectorDB({
      path: dbPath
    });

    const optimizer = new MemoryOptimizer(db);

    // Add more vectors for memory optimization test
    const manyVectors = Array.from({ length: 50 }, (_, i) => ({
      embedding: [Math.random(), Math.random(), Math.random()],
      metadata: {
        type: 'old-memory',
        index: i,
        timestamp: Date.now() - (i * 24 * 60 * 60 * 1000) // Spread over days
      }
    }));

    const manyIds = db.insertBatch(manyVectors);
    expect(manyIds).toHaveLength(50);
    console.log(`   📥 Inserted ${manyIds.length} test vectors`);

    // Collapse old memories
    const collapsed = await optimizer.collapseMemories(
      3 * 24 * 60 * 60 * 1000, // 3 days
      {
        type: 'graph',
        threshold: 0.9,
        maxNodes: 10
      }
    );

    expect(collapsed).toBeGreaterThanOrEqual(0);
    console.log(`   🗜️  Collapsed ${collapsed} memories into nodes`);

    // Get optimizer statistics
    const optStats = optimizer.getStats();
    console.log(`   📊 Memory nodes: ${optStats.totalNodes}`);
    console.log(`   🔢 Total collapsed: ${optStats.totalCollapsed}`);
    console.log(`   📉 Memory reduction: ${optStats.memoryReduction.toFixed(1)}%`);

    // Query memory nodes
    if (optStats.totalNodes > 0) {
      const nodes = await optimizer.queryNodes([0.5, 0.5, 0], 3);
      expect(nodes.length).toBeGreaterThan(0);
      console.log(`   🔍 Retrieved ${nodes.length} memory nodes`);
    }

    db.close();
  });

  it('should persist and reload database with all data', async () => {
    // Create database and add data
    let db = await createVectorDB({
      path: dbPath
    });

    const testVectors = [
      { embedding: [1, 0, 0], metadata: { type: 'test-persist' } },
      { embedding: [0, 1, 0], metadata: { type: 'test-persist' } },
    ];

    db.insertBatch(testVectors);

    const matcher = new PatternMatcher(db);
    await matcher.storePattern({
      embedding: [0.8, 0.2, 0],
      taskType: 'persistence-test',
      approach: 'test-approach',
      successRate: 0.9,
      avgDuration: 1000,
      metadata: {
        domain: 'testing',
        complexity: 'simple',
        learningSource: 'success',
        iterations: 1,
        tags: ['persistence']
      }
    });

    const curator = new ExperienceCurator(db);
    await curator.storeExperience({
      taskEmbedding: [0.7, 0.3, 0],
      taskDescription: 'Persistence test experience',
      success: true,
      duration: 2000,
      approach: 'test approach',
      outcome: 'verified persistence',
      quality: 0.95,
      metadata: {
        domain: 'testing',
        agentType: 'tester',
        tokensUsed: 100,
        iterationCount: 1
      }
    });

    const finalStats = db.stats();
    const patternStats = matcher.getStats();
    const expStats = curator.getStats();

    console.log(`   📊 Final vector count: ${finalStats.count}`);
    console.log(`   💾 Total database size: ${(finalStats.size / 1024).toFixed(2)} KB`);

    db.close();

    // Verify file persists
    expect(existsSync(dbPath)).toBe(true);
    const dbFileSize = statSync(dbPath).size;
    console.log(`   📦 Database file size: ${(dbFileSize / 1024).toFixed(2)} KB`);
    console.log(`   💾 Database location: ${dbPath}`);

    // Reopen and verify data
    db = await createVectorDB({
      path: dbPath
    });

    const reopenStats = db.stats();
    expect(reopenStats.count).toBe(finalStats.count);
    console.log(`   ✅ Reopened database with ${reopenStats.count} vectors`);

    // Verify patterns persisted
    const matcher2 = new PatternMatcher(db);
    const patternStats2 = matcher2.getStats();
    expect(patternStats2.totalPatterns).toBe(patternStats.totalPatterns);
    console.log(`   ✅ Found ${patternStats2.totalPatterns} persisted patterns`);

    // Verify experiences persisted
    const curator2 = new ExperienceCurator(db);
    const expStats2 = curator2.getStats();
    expect(expStats2.totalExperiences).toBe(expStats.totalExperiences);
    console.log(`   ✅ Found ${expStats2.totalExperiences} persisted experiences`);

    db.close();
  });
});
