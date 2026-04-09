#!/usr/bin/env tsx
/**
 * Green Streak Tracker for ay iterations
 * 
 * Tracks consecutive successful iterations and displays in dashboard
 */

import * as fs from 'fs';
import * as path from 'path';

interface GreenStreakState {
  currentStreak: number;
  longestStreak: number;
  totalIterations: number;
  successfulIterations: number;
  lastUpdated: string;
}

class GreenStreakTracker {
  private statePath: string;
  private state: GreenStreakState;

  constructor(projectRoot?: string) {
    this.statePath = path.join(projectRoot || path.resolve(__dirname, '../..'), '.goalie/green-streak-state.json');
    this.state = this.loadState();
  }

  /**
   * Load state from file
   */
  private loadState(): GreenStreakState {
    try {
      if (fs.existsSync(this.statePath)) {
        return JSON.parse(fs.readFileSync(this.statePath, 'utf-8'));
      }
    } catch {
      // Ignore errors, use default state
    }
    
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalIterations: 0,
      successfulIterations: 0,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Save state to file
   */
  private saveState(): void {
    this.state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2));
  }

  /**
   * Record a successful iteration
   */
  recordSuccess(): void {
    this.state.currentStreak++;
    this.state.successfulIterations++;
    this.state.totalIterations++;
    
    if (this.state.currentStreak > this.state.longestStreak) {
      this.state.longestStreak = this.state.currentStreak;
    }
    
    this.saveState();
    this.displayStatus();
  }

  /**
   * Record a failed iteration
   */
  recordFailure(): void {
    this.state.currentStreak = 0;
    this.state.totalIterations++;
    this.saveState();
    this.displayStatus();
  }

  /**
   * Get current metrics
   */
  getMetrics(): {
    currentStreak: number;
    longestStreak: number;
    totalIterations: number;
    successRate: number;
  } {
    return {
      currentStreak: this.state.currentStreak,
      longestStreak: this.state.longestStreak,
      totalIterations: this.state.totalIterations,
      successRate: this.state.totalIterations > 0 
        ? (this.state.successfulIterations / this.state.totalIterations) * 100 
        : 0
    };
  }

  /**
   * Display current status
   */
  displayStatus(): void {
    const metrics = this.getMetrics();
    
    console.log('\n📊 Green Streak Status');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  Current Streak:      ${metrics.currentStreak} 🔥`);
    console.log(`  Longest Streak:     ${metrics.longestStreak} 🏆`);
    console.log(`  Total Iterations:  ${metrics.totalIterations}`);
    console.log(`  Successful:          ${metrics.successfulIterations}`);
    console.log(`  Success Rate:        ${metrics.successRate.toFixed(1)}%`);
    console.log(`  Last Updated:        ${new Date(this.state.lastUpdated).toLocaleString()}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  /**
   * Reset streak (for testing or manual reset)
   */
  reset(): void {
    this.state = {
      currentStreak: 0,
      longestStreak: 0,
      totalIterations: 0,
      successfulIterations: 0,
      lastUpdated: new Date().toISOString()
    };
    this.saveState();
    console.log('✓ Green streak reset');
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const tracker = new GreenStreakTracker();
  const command = process.argv[2] || 'status';

  switch (command) {
    case 'success':
      tracker.recordSuccess();
      break;
    case 'failure':
      tracker.recordFailure();
      break;
    case 'reset':
      tracker.reset();
      break;
    case 'status':
    default:
      tracker.displayStatus();
      break;
  }
}

export { GreenStreakTracker };
