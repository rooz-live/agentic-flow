/**
 * Hybrid Memory Consolidator: MIRAS + AgentDB Integration
 * @module integrations/hybrid_memory_consolidator
 *
 * Implements the hybrid memory architecture based on PoC results:
 * - MIRAS: Long-term strategic memory (1.71x compression, 48.8% retention, 100% retrieval)
 * - AgentDB: Operational memory (100% retention, recent context)
 *
 * Consolidation Pipeline:
 * 1. AgentDB captures all operational events (ReflexionMemory)
 * 2. Nightly consolidation filters high-surprise events → MIRAS
 * 3. MIRAS maintains compressed long-term strategic memory
 *
 * Based on: Google Titans+MIRAS (arXiv:2501.00663) test-time memorization
 */

import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';

// =============================================================================
// Types & Interfaces
// =============================================================================

export interface MemoryEvent {
  id: string;
  timestamp: string;
  eventType: string;
  reward?: { value: number; components?: { success?: number }; status?: string };
  state?: Record<string, unknown>;
  action?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  _miras_surprise?: number;
  _consolidation_tier?: 'operational' | 'strategic';
}

export interface ConsolidationConfig {
  surpriseThreshold: number;       // Default: 0.1 (from PoC)
  maxStrategicMemories: number;    // Default: 1000
  maxOperationalDays: number;      // Default: 7
  consolidationSchedule: string;   // Default: '0 2 * * *' (2 AM daily)
  trajectoriesPath: string;        // Default: '.goalie/trajectories.jsonl'
  strategicMemoryPath: string;     // Default: '.goalie/strategic_memory.jsonl'
  metricsPath: string;             // Default: '.goalie/research/consolidation_metrics.json'
}

export interface ConsolidationMetrics {
  lastRun: string;
  operationalEvents: number;
  strategicMemories: number;
  eventsConsolidated: number;
  compressionRatio: number;
  avgSurpriseScore: number;
  retentionRate: number;
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: ConsolidationConfig = {
  surpriseThreshold: 0.1,
  maxStrategicMemories: 1000,
  maxOperationalDays: 7,
  consolidationSchedule: '0 2 * * *',
  trajectoriesPath: '.goalie/trajectories.jsonl',
  strategicMemoryPath: '.goalie/strategic_memory.jsonl',
  metricsPath: '.goalie/research/consolidation_metrics.json',
};

// =============================================================================
// HybridMemoryConsolidator Class
// =============================================================================

export class HybridMemoryConsolidator extends EventEmitter {
  private config: ConsolidationConfig;
  private operationalMemory: MemoryEvent[] = [];
  private strategicMemory: MemoryEvent[] = [];

  constructor(config: Partial<ConsolidationConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Compute surprise score for an event (Enhanced MIRAS algorithm v2)
   * Higher surprise = more information value = higher retention priority
   *
   * Enhancement factors for 1.71x compression target:
   * 1. Temporal decay: Recent events slightly less surprising (already in context)
   * 2. Event type weighting: Rare event types are more surprising
   * 3. Semantic novelty: Events with unique state keys are more valuable
   * 4. Outcome deviation: Large deviations from expected values
   */
  private eventTypeFrequency: Map<string, number> = new Map();
  private seenStateKeys: Set<string> = new Set();

  computeSurprise(event: MemoryEvent): number {
    const reward = event.reward;
    let surprise = 0.1; // Base surprise

    // Factor 1: Outcome deviation (original logic, enhanced)
    if (reward) {
      const value = reward.value || 0;
      const expected = reward.components?.success || 0;
      const status = reward.status || '';

      if (expected !== 0) {
        surprise = Math.abs(value - expected) / Math.abs(expected);
      } else {
        surprise = Math.abs(value) * 0.5; // Scale unbounded values
      }

      // Failures are highly surprising (information-rich)
      if (status === 'failure') {
        surprise += 0.5;
      }
      // Unexpected successes also surprising
      if (status === 'success' && expected < 0.5 && value > 0.8) {
        surprise += 0.3;
      }
    }

    // Factor 2: Event type rarity (boosts compression by filtering common events)
    const eventType = event.eventType || 'unknown';
    const typeCount = this.eventTypeFrequency.get(eventType) || 0;
    this.eventTypeFrequency.set(eventType, typeCount + 1);
    const totalEvents = Array.from(this.eventTypeFrequency.values()).reduce((a, b) => a + b, 0);
    const typeFrequency = typeCount / Math.max(1, totalEvents);
    // Rare events get surprise boost (inverse frequency)
    surprise += (1 - typeFrequency) * 0.2;

    // Factor 3: Semantic novelty (new state keys = more information)
    if (event.state) {
      const stateKeys = Object.keys(event.state);
      let novelKeys = 0;
      for (const key of stateKeys) {
        if (!this.seenStateKeys.has(key)) {
          this.seenStateKeys.add(key);
          novelKeys++;
        }
      }
      // Novel state keys increase surprise
      surprise += Math.min(0.3, novelKeys * 0.1);
    }

    // Factor 4: Temporal decay (recent events slightly less surprising)
    if (event.timestamp) {
      const eventTime = new Date(event.timestamp).getTime();
      const now = Date.now();
      const ageHours = (now - eventTime) / (1000 * 60 * 60);
      // Events older than 24h get slight surprise boost (not in recent context)
      if (ageHours > 24) {
        surprise += 0.1;
      }
    }

    // Factor 5: Metadata richness (events with more metadata are more valuable)
    if (event.metadata) {
      const metadataKeys = Object.keys(event.metadata).length;
      surprise += Math.min(0.15, metadataKeys * 0.03);
    }

    return Math.min(1.0, Math.max(0.05, surprise));
  }

  /**
   * Reset frequency tracking (call before new consolidation cycle)
   */
  resetFrequencyTracking(): void {
    this.eventTypeFrequency.clear();
    // Keep seenStateKeys for cross-session novelty detection
  }

  /**
   * Load operational events from AgentDB trajectories
   */
  loadOperationalMemory(): MemoryEvent[] {
    const trajPath = path.resolve(this.config.trajectoriesPath);
    if (!fs.existsSync(trajPath)) {
      this.emit('warn', `Trajectories file not found: ${trajPath}`);
      return [];
    }

    const lines = fs.readFileSync(trajPath, 'utf-8').split('\n').filter(l => l.trim());
    this.operationalMemory = lines.map(line => {
      try {
        const event = JSON.parse(line) as MemoryEvent;
        event._miras_surprise = this.computeSurprise(event);
        event._consolidation_tier = 'operational';
        return event;
      } catch {
        return null;
      }
    }).filter((e): e is MemoryEvent => e !== null);

    this.emit('loaded', { operational: this.operationalMemory.length });
    return this.operationalMemory;
  }

  /**
   * Load existing strategic memory (MIRAS long-term)
   */
  loadStrategicMemory(): MemoryEvent[] {
    const stratPath = path.resolve(this.config.strategicMemoryPath);
    if (!fs.existsSync(stratPath)) {
      this.strategicMemory = [];
      return [];
    }

    const lines = fs.readFileSync(stratPath, 'utf-8').split('\n').filter(l => l.trim());
    this.strategicMemory = lines.map(line => {
      try { return JSON.parse(line) as MemoryEvent; } catch { return null; }
    }).filter((e): e is MemoryEvent => e !== null);

    return this.strategicMemory;
  }

  /**
   * Compute semantic similarity between two events (Jaccard coefficient)
   * Used for deduplication to improve compression ratio
   */
  private computeSemanticSimilarity(a: MemoryEvent, b: MemoryEvent): number {
    // Build arrays of keys for comparison
    const aKeyArray: string[] = [a.eventType || ''];
    if (a.state) aKeyArray.push(...Object.keys(a.state));
    if (a.action) aKeyArray.push(...Object.keys(a.action));

    const bKeyArray: string[] = [b.eventType || ''];
    if (b.state) bKeyArray.push(...Object.keys(b.state));
    if (b.action) bKeyArray.push(...Object.keys(b.action));

    const bKeySet = new Set(bKeyArray);

    // Count intersection
    let intersectionCount = 0;
    const unionSet = new Set(aKeyArray);
    for (const key of aKeyArray) {
      if (bKeySet.has(key)) {
        intersectionCount++;
      }
    }
    for (const key of bKeyArray) {
      unionSet.add(key);
    }

    if (unionSet.size === 0) return 0;
    return intersectionCount / unionSet.size;
  }

  /**
   * Execute nightly consolidation: AgentDB → MIRAS
   * Enhanced with semantic deduplication for 1.71x compression target
   */
  async consolidate(): Promise<ConsolidationMetrics> {
    // Reset frequency tracking for fresh consolidation
    this.resetFrequencyTracking();

    this.loadOperationalMemory();
    this.loadStrategicMemory();

    const startCount = this.strategicMemory.length;

    // Filter high-surprise events above threshold
    const highSurpriseEvents = this.operationalMemory.filter(
      e => (e._miras_surprise || 0) >= this.config.surpriseThreshold
    );

    // Deduplicate by event ID
    const existingIds = new Set(this.strategicMemory.map(e => e.id || e.timestamp));
    let newStrategicEvents = highSurpriseEvents.filter(e => {
      const id = e.id || e.timestamp;
      return !existingIds.has(id);
    });

    // Enhanced: Semantic deduplication (cluster similar events, keep highest surprise)
    const semanticThreshold = 0.7; // Events with >70% similarity are considered duplicates
    const dedupedEvents: MemoryEvent[] = [];

    for (const event of newStrategicEvents) {
      let isDuplicate = false;
      for (const existing of dedupedEvents) {
        const similarity = this.computeSemanticSimilarity(event, existing);
        if (similarity > semanticThreshold) {
          // Keep the one with higher surprise
          if ((event._miras_surprise || 0) > (existing._miras_surprise || 0)) {
            const idx = dedupedEvents.indexOf(existing);
            dedupedEvents[idx] = event;
          }
          isDuplicate = true;
          break;
        }
      }
      if (!isDuplicate) {
        dedupedEvents.push(event);
      }
    }
    newStrategicEvents = dedupedEvents;

    // Add new events with strategic tier
    for (const event of newStrategicEvents) {
      event._consolidation_tier = 'strategic';
      this.strategicMemory.push(event);
    }

    // Sort by surprise score (highest first) and enforce capacity
    this.strategicMemory.sort((a, b) => (b._miras_surprise || 0) - (a._miras_surprise || 0));
    if (this.strategicMemory.length > this.config.maxStrategicMemories) {
      this.strategicMemory = this.strategicMemory.slice(0, this.config.maxStrategicMemories);
    }

    // Persist strategic memory
    const stratPath = path.resolve(this.config.strategicMemoryPath);
    fs.mkdirSync(path.dirname(stratPath), { recursive: true });
    const content = this.strategicMemory.map(e => JSON.stringify(e)).join('\n');
    fs.writeFileSync(stratPath, content + '\n');

    // Calculate metrics
    const operationalBytes = this.operationalMemory.reduce(
      (sum, e) => sum + JSON.stringify(e).length, 0
    );
    const strategicBytes = this.strategicMemory.reduce(
      (sum, e) => sum + JSON.stringify(e).length, 0
    );
    const avgSurprise = this.strategicMemory.reduce(
      (sum, e) => sum + (e._miras_surprise || 0), 0
    ) / Math.max(1, this.strategicMemory.length);

    const metrics: ConsolidationMetrics = {
      lastRun: new Date().toISOString(),
      operationalEvents: this.operationalMemory.length,
      strategicMemories: this.strategicMemory.length,
      eventsConsolidated: newStrategicEvents.length,
      compressionRatio: operationalBytes / Math.max(1, strategicBytes),
      avgSurpriseScore: avgSurprise,
      retentionRate: this.strategicMemory.length / Math.max(1, this.operationalMemory.length),
    };

    // Save metrics
    const metricsPath = path.resolve(this.config.metricsPath);
    fs.mkdirSync(path.dirname(metricsPath), { recursive: true });
    fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));

    this.emit('consolidated', metrics);
    return metrics;
  }

  /**
   * Retrieve memories using hybrid strategy:
   * 1. Recent operational memory for context
   * 2. High-surprise strategic memory for patterns
   */
  retrieve(query: Partial<MemoryEvent>, options: { k?: number; tier?: 'all' | 'operational' | 'strategic' } = {}): MemoryEvent[] {
    const { k = 10, tier = 'all' } = options;
    let candidates: MemoryEvent[] = [];

    if (tier === 'all' || tier === 'operational') {
      candidates.push(...this.operationalMemory.slice(-50)); // Last 50 operational
    }
    if (tier === 'all' || tier === 'strategic') {
      candidates.push(...this.strategicMemory.slice(0, 50)); // Top 50 strategic by surprise
    }

    // Simple matching by eventType and reward success
    const querySuccess = (query.reward?.value || 0) > 0;
    const scored = candidates.map(c => {
      let score = c._miras_surprise || 0;
      const cSuccess = (c.reward?.value || 0) > 0;
      if (c.eventType === query.eventType) score += 0.3;
      if (cSuccess === querySuccess) score += 0.2;
      return { event: c, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k).map(s => s.event);
  }

  getMetrics(): { operational: number; strategic: number; compressionRatio: number } {
    const operationalBytes = this.operationalMemory.reduce((s, e) => s + JSON.stringify(e).length, 0);
    const strategicBytes = this.strategicMemory.reduce((s, e) => s + JSON.stringify(e).length, 0);
    return {
      operational: this.operationalMemory.length,
      strategic: this.strategicMemory.length,
      compressionRatio: operationalBytes / Math.max(1, strategicBytes),
    };
  }
}

// =============================================================================
// CLI Entry Point
// =============================================================================

if (require.main === module) {
  const consolidator = new HybridMemoryConsolidator();
  console.log('🧠 Hybrid Memory Consolidator: MIRAS + AgentDB');
  console.log('=' .repeat(60));

  consolidator.on('loaded', (data) => console.log(`📥 Loaded: ${data.operational} operational events`));
  consolidator.on('consolidated', (m: ConsolidationMetrics) => {
    console.log(`\n📊 Consolidation Results:`);
    console.log(`   Operational Events: ${m.operationalEvents}`);
    console.log(`   Strategic Memories: ${m.strategicMemories}`);
    console.log(`   Events Consolidated: ${m.eventsConsolidated}`);
    console.log(`   Compression Ratio: ${m.compressionRatio.toFixed(2)}x`);
    console.log(`   Avg Surprise Score: ${m.avgSurpriseScore.toFixed(3)}`);
    console.log(`   Retention Rate: ${(m.retentionRate * 100).toFixed(1)}%`);
  });

  consolidator.consolidate().then(() => {
    console.log('\n✅ Consolidation complete');
  }).catch(err => {
    console.error('❌ Consolidation failed:', err);
    process.exit(1);
  });
}
