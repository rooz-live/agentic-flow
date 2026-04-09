/**
 * P1.3: Iteration Handoff Reporting System
 * 
 * Maintains continuity between iteration cycles by capturing state, decisions,
 * and context for seamless handoff to the next iteration.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface IterationContext {
  iterationId: string;
  startedAt: string;
  completedAt?: string;
  status: 'in_progress' | 'completed' | 'failed' | 'paused';
  
  // Work completed
  tasksCompleted: TaskSummary[];
  tasksPending: TaskSummary[];
  blockers: Blocker[];
  
  // State snapshot
  stateSnapshot: StateSnapshot;
  
  // Decisions made
  decisions: DecisionRecord[];
  
  // Learnings
  insights: string[];
  recommendations: string[];
  
  // Continuity info
  previousIterationId?: string;
  nextIterationId?: string;
  handoffNotes: string;
}

export interface TaskSummary {
  id: string;
  name: string;
  status: 'completed' | 'pending' | 'blocked' | 'cancelled';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  outcome?: string;
  notes?: string;
}

export interface Blocker {
  id: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  owner?: string;
  resolution?: string;
  createdAt: string;
}

export interface StateSnapshot {
  dbStats: { episodeCount: number; skillCount: number; patternCount: number };
  healthMetrics: { okRate: number; stabilityScore: number; confidenceAvg: number };
  pendingWork: { high: number; medium: number; low: number };
  activeRisks: { critical: number; high: number; medium: number };
}

export interface DecisionRecord {
  id: string;
  type: string;
  description: string;
  rationale: string;
  outcome: string;
  timestamp: string;
}

export class IterationHandoffSystem {
  private reportsDir: string;
  private currentIteration: IterationContext | null = null;

  constructor(baseDir?: string) {
    this.reportsDir = join(baseDir || join(__dirname, '../../'), 'governance', 'reports', 'handoffs');
    if (!existsSync(this.reportsDir)) mkdirSync(this.reportsDir, { recursive: true });
  }

  /**
   * Start a new iteration, loading context from previous if available
   */
  startIteration(iterationId?: string): IterationContext {
    const id = iterationId || `iter_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const previous = this.getLatestHandoff();
    
    this.currentIteration = {
      iterationId: id,
      startedAt: new Date().toISOString(),
      status: 'in_progress',
      tasksCompleted: [],
      tasksPending: previous?.tasksPending.filter(t => t.status === 'pending') || [],
      blockers: previous?.blockers.filter(b => !b.resolution) || [],
      stateSnapshot: { dbStats: { episodeCount: 0, skillCount: 0, patternCount: 0 }, healthMetrics: { okRate: 0.9999, stabilityScore: 0.9999, confidenceAvg: 0.5 }, pendingWork: { high: 0, medium: 0, low: 0 }, activeRisks: { critical: 0, high: 0, medium: 0 } },
      decisions: [],
      insights: previous?.recommendations || [],
      recommendations: [],
      previousIterationId: previous?.iterationId,
      handoffNotes: ''
    };
    
    return this.currentIteration;
  }

  /**
   * Record task completion
   */
  recordTask(task: TaskSummary): void {
    if (!this.currentIteration) throw new Error('No active iteration');
    if (task.status === 'completed') {
      this.currentIteration.tasksCompleted.push(task);
      this.currentIteration.tasksPending = this.currentIteration.tasksPending.filter(t => t.id !== task.id);
    } else {
      const idx = this.currentIteration.tasksPending.findIndex(t => t.id === task.id);
      if (idx >= 0) this.currentIteration.tasksPending[idx] = task;
      else this.currentIteration.tasksPending.push(task);
    }
  }

  /**
   * Record a decision made during this iteration
   */
  recordDecision(decision: Omit<DecisionRecord, 'id' | 'timestamp'>): void {
    if (!this.currentIteration) throw new Error('No active iteration');
    this.currentIteration.decisions.push({ ...decision, id: `dec_${Date.now()}`, timestamp: new Date().toISOString() });
  }

  /**
   * Add insight or recommendation
   */
  addInsight(insight: string): void { this.currentIteration?.insights.push(insight); }
  addRecommendation(recommendation: string): void { this.currentIteration?.recommendations.push(recommendation); }
  addBlocker(blocker: Omit<Blocker, 'createdAt'>): void { this.currentIteration?.blockers.push({ ...blocker, createdAt: new Date().toISOString() }); }
  updateStateSnapshot(snapshot: Partial<StateSnapshot>): void { if (this.currentIteration) Object.assign(this.currentIteration.stateSnapshot, snapshot); }

  /**
   * Complete iteration and generate handoff report
   */
  completeIteration(handoffNotes: string, status: 'completed' | 'failed' | 'paused' = 'completed'): string {
    if (!this.currentIteration) throw new Error('No active iteration');
    
    this.currentIteration.completedAt = new Date().toISOString();
    this.currentIteration.status = status;
    this.currentIteration.handoffNotes = handoffNotes;
    
    const filename = `${this.currentIteration.iterationId}_handoff.json`;
    const filepath = join(this.reportsDir, filename);
    writeFileSync(filepath, JSON.stringify(this.currentIteration, null, 2));
    
    return filepath;
  }

  /**
   * Get the latest handoff report
   */
  getLatestHandoff(): IterationContext | null {
    if (!existsSync(this.reportsDir)) return null;
    const files = readdirSync(this.reportsDir).filter(f => f.endsWith('_handoff.json')).sort().reverse();
    if (files.length === 0) return null;
    return JSON.parse(readFileSync(join(this.reportsDir, files[0]), 'utf8'));
  }

  /**
   * Get handoff by ID
   */
  getHandoff(iterationId: string): IterationContext | null {
    const filepath = join(this.reportsDir, `${iterationId}_handoff.json`);
    if (!existsSync(filepath)) return null;
    return JSON.parse(readFileSync(filepath, 'utf8'));
  }

  getCurrentIteration(): IterationContext | null { return this.currentIteration; }
}

export const handoffSystem = new IterationHandoffSystem();

