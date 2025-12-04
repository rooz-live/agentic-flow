/**
 * Learning Capture Integration Tests
 *
 * Tests ReflexionMemory prediction storage, CausalRecall link recording,
 * ProcessGovernor event capture, and ML training trajectory generation.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock learning capture types
interface Prediction {
  id: string;
  affiliateId: string;
  prediction: string;
  confidence: number;
  actual?: string;
  outcome?: 'correct' | 'incorrect' | 'pending';
  timestamp: Date;
}

interface CausalLink {
  id: string;
  cause: string;
  effect: string;
  strength: number;
  context: Record<string, unknown>;
  timestamp: Date;
}

interface GovernorEvent {
  type: 'rate_limit' | 'circuit_break' | 'batch_process' | 'throttle';
  processId: string;
  details: Record<string, unknown>;
  timestamp: Date;
}

interface TrainingTrajectory {
  id: string;
  state: Record<string, unknown>;
  action: string;
  reward: number;
  nextState: Record<string, unknown>;
  done: boolean;
  timestamp: Date;
}

// Mock ReflexionMemory
class MockReflexionMemory {
  private predictions: Prediction[] = [];

  storePrediction(affiliateId: string, prediction: string, confidence: number): Prediction {
    const p: Prediction = {
      id: `pred-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      affiliateId, prediction, confidence, outcome: 'pending', timestamp: new Date(),
    };
    this.predictions.push(p);
    return p;
  }

  recordOutcome(predictionId: string, actual: string): boolean {
    const pred = this.predictions.find(p => p.id === predictionId);
    if (pred) {
      pred.actual = actual;
      pred.outcome = pred.prediction === actual ? 'correct' : 'incorrect';
      return true;
    }
    return false;
  }

  getMetrics(): { total: number; correct: number; incorrect: number; pending: number; accuracy: number } {
    const total = this.predictions.length;
    const correct = this.predictions.filter(p => p.outcome === 'correct').length;
    const incorrect = this.predictions.filter(p => p.outcome === 'incorrect').length;
    const pending = this.predictions.filter(p => p.outcome === 'pending').length;
    return { total, correct, incorrect, pending, accuracy: total > 0 ? correct / (correct + incorrect || 1) : 0 };
  }

  getPredictions(affiliateId?: string): Prediction[] {
    return affiliateId ? this.predictions.filter(p => p.affiliateId === affiliateId) : this.predictions;
  }
}

// Mock CausalRecall
class MockCausalRecall {
  private links: CausalLink[] = [];

  recordCausalLink(cause: string, effect: string, strength: number, context: Record<string, unknown> = {}): CausalLink {
    const link: CausalLink = {
      id: `link-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      cause, effect, strength, context, timestamp: new Date(),
    };
    this.links.push(link);
    return link;
  }

  getRelevantLinks(query: string, limit = 10): CausalLink[] {
    return this.links.filter(l => l.cause.includes(query) || l.effect.includes(query)).slice(0, limit);
  }

  getStrongestLinks(minStrength = 0.5): CausalLink[] {
    return this.links.filter(l => l.strength >= minStrength).sort((a, b) => b.strength - a.strength);
  }
}

// Mock ProcessGovernor
class MockProcessGovernor {
  private events: GovernorEvent[] = [];

  emitEvent(type: GovernorEvent['type'], processId: string, details: Record<string, unknown> = {}): GovernorEvent {
    const event: GovernorEvent = { type, processId, details, timestamp: new Date() };
    this.events.push(event);
    return event;
  }

  getEvents(type?: GovernorEvent['type']): GovernorEvent[] {
    return type ? this.events.filter(e => e.type === type) : this.events;
  }

  getMetrics(): { totalEvents: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};
    this.events.forEach(e => { byType[e.type] = (byType[e.type] || 0) + 1; });
    return { totalEvents: this.events.length, byType };
  }
}

// Mock TrajectoryBuilder
class MockTrajectoryBuilder {
  private trajectories: TrainingTrajectory[] = [];

  addTrajectory(state: Record<string, unknown>, action: string, reward: number, nextState: Record<string, unknown>, done: boolean): TrainingTrajectory {
    const t: TrainingTrajectory = {
      id: `traj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      state, action, reward, nextState, done, timestamp: new Date(),
    };
    this.trajectories.push(t);
    return t;
  }

  getTrajectories(): TrainingTrajectory[] { return this.trajectories; }
  getEpisodeReward(): number { return this.trajectories.reduce((sum, t) => sum + t.reward, 0); }
}

describe('LearningCapture Integration', () => {
  let reflexion: MockReflexionMemory;
  let causal: MockCausalRecall;
  let governor: MockProcessGovernor;
  let trajectory: MockTrajectoryBuilder;

  beforeEach(() => {
    reflexion = new MockReflexionMemory();
    causal = new MockCausalRecall();
    governor = new MockProcessGovernor();
    trajectory = new MockTrajectoryBuilder();
  });

  describe('ReflexionMemory', () => {
    it('should store predictions with confidence', () => {
      const pred = reflexion.storePrediction('aff-001', 'tier_upgrade', 0.85);
      expect(pred.affiliateId).toBe('aff-001');
      expect(pred.confidence).toBe(0.85);
      expect(pred.outcome).toBe('pending');
    });

    it('should record outcomes and update accuracy', () => {
      const pred = reflexion.storePrediction('aff-001', 'tier_upgrade', 0.9);
      reflexion.recordOutcome(pred.id, 'tier_upgrade');
      expect(reflexion.getMetrics().correct).toBe(1);
      expect(reflexion.getMetrics().accuracy).toBe(1);
    });

    it('should track incorrect predictions', () => {
      const pred = reflexion.storePrediction('aff-001', 'tier_upgrade', 0.6);
      reflexion.recordOutcome(pred.id, 'tier_downgrade');
      expect(reflexion.getMetrics().incorrect).toBe(1);
    });

    it('should filter predictions by affiliate', () => {
      reflexion.storePrediction('aff-001', 'pred1', 0.8);
      reflexion.storePrediction('aff-002', 'pred2', 0.7);
      expect(reflexion.getPredictions('aff-001')).toHaveLength(1);
    });
  });

  describe('CausalRecall', () => {
    it('should record causal links with strength', () => {
      const link = causal.recordCausalLink('high_activity', 'tier_upgrade', 0.85, { period: 'Q4' });
      expect(link.cause).toBe('high_activity');
      expect(link.strength).toBe(0.85);
    });

    it('should retrieve relevant links by query', () => {
      causal.recordCausalLink('low_conversion', 'churn_risk', 0.7);
      causal.recordCausalLink('high_conversion', 'tier_upgrade', 0.8);
      const links = causal.getRelevantLinks('conversion');
      expect(links).toHaveLength(2);
    });

    it('should filter by minimum strength', () => {
      causal.recordCausalLink('weak_signal', 'minor_effect', 0.3);
      causal.recordCausalLink('strong_signal', 'major_effect', 0.9);
      expect(causal.getStrongestLinks(0.5)).toHaveLength(1);
    });
  });

  describe('ProcessGovernor', () => {
    it('should emit and capture events', () => {
      governor.emitEvent('rate_limit', 'proc-1', { limit: 100 });
      expect(governor.getEvents()).toHaveLength(1);
      expect(governor.getEvents('rate_limit')).toHaveLength(1);
    });

    it('should track event metrics by type', () => {
      governor.emitEvent('rate_limit', 'proc-1', {});
      governor.emitEvent('rate_limit', 'proc-2', {});
      governor.emitEvent('circuit_break', 'proc-3', {});
      const metrics = governor.getMetrics();
      expect(metrics.byType['rate_limit']).toBe(2);
      expect(metrics.byType['circuit_break']).toBe(1);
    });
  });

  describe('TrainingTrajectory', () => {
    it('should build trajectories for ML training', () => {
      const t = trajectory.addTrajectory({ score: 0.5 }, 'promote', 10, { score: 0.7 }, false);
      expect(t.action).toBe('promote');
      expect(t.reward).toBe(10);
    });

    it('should calculate episode reward', () => {
      trajectory.addTrajectory({}, 'a1', 5, {}, false);
      trajectory.addTrajectory({}, 'a2', 10, {}, false);
      trajectory.addTrajectory({}, 'a3', -2, {}, true);
      expect(trajectory.getEpisodeReward()).toBe(13);
    });
  });

  describe('End-to-End Learning Flow', () => {
    it('should capture complete learning cycle', () => {
      // 1. Predict
      const pred = reflexion.storePrediction('aff-001', 'will_convert', 0.75);
      // 2. Record causal context
      causal.recordCausalLink('email_campaign', 'conversion_intent', 0.6, { affiliateId: 'aff-001' });
      // 3. Emit governor event
      governor.emitEvent('batch_process', 'learning-pipeline', { batchSize: 50 });
      // 4. Build trajectory
      trajectory.addTrajectory({ affiliateId: 'aff-001', intent: 0.75 }, 'send_offer', 5, { converted: true }, true);
      // 5. Record outcome
      reflexion.recordOutcome(pred.id, 'will_convert');

      expect(reflexion.getMetrics().correct).toBe(1);
      expect(causal.getRelevantLinks('conversion')).toHaveLength(1);
      expect(governor.getMetrics().totalEvents).toBe(1);
      expect(trajectory.getEpisodeReward()).toBe(5);
    });
  });
});

