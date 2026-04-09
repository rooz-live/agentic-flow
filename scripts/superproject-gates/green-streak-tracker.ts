/**
 * Green Streak Tracker
 * Tracks consecutive successful iterations and provides metrics
 */

export interface StreakState {
  currentStreak: number;
  bestStreak: number;
  lastIterationStatus: 'success' | 'failure' | 'none';
  lastSuccessTime: string | null;
  totalIterations: number;
  successfulIterations: number;
  failedIterations: number;
}

export class GreenStreakTracker {
  private state: StreakState = {
    currentStreak: 0,
    bestStreak: 0,
    lastIterationStatus: 'none',
    lastSuccessTime: null,
    totalIterations: 0,
    successfulIterations: 0,
    failedIterations: 0,
  };

  constructor() {
    this.loadState();
  }

  /**
   * Load state from localStorage
   */
  private loadState(): void {
    try {
      const saved = localStorage.getItem('green_streak_state');
      if (saved) {
        this.state = JSON.parse(saved);
      }
    } catch (error) {
      console.warn('[GreenStreakTracker] Failed to load state:', error);
    }
  }

  /**
   * Save state to localStorage
   */
  private saveState(): void {
    try {
      localStorage.setItem('green_streak_state', JSON.stringify(this.state));
    } catch (error) {
      console.error('[GreenStreakTracker] Failed to save state:', error);
    }
  }

  /**
   * Record an iteration result
   */
  recordIteration(success: boolean, metadata: Record<string, any> = {}): StreakState {
    this.state.totalIterations++;
    
    if (success) {
      this.state.currentStreak++;
      this.state.successfulIterations++;
      this.state.lastIterationStatus = 'success';
      this.state.lastSuccessTime = new Date().toISOString();
      
      if (this.state.currentStreak > this.state.bestStreak) {
        this.state.bestStreak = this.state.currentStreak;
      }
    } else {
      this.state.currentStreak = 0;
      this.state.failedIterations++;
      this.state.lastIterationStatus = 'failure';
    }
    
    this.state = { ...this.state, ...metadata };
    this.saveState();
    
    console.log(`[GreenStreakTracker] Iteration ${this.state.totalIterations}: ${success ? 'SUCCESS' : 'FAILURE'}, Streak: ${this.state.currentStreak}`);
    
    return { ...this.state };
  }

  /**
   * Get current streak state
   */
  getState(): StreakState {
    return { ...this.state };
  }

  /**
   * Get success rate percentage
   */
  getSuccessRate(): number {
    if (this.state.totalIterations === 0) return 0;
    return Math.round((this.state.successfulIterations / this.state.totalIterations) * 100);
  }

  /**
   * Get stability score (0-1)
   */
  getStabilityScore(): number {
    if (this.state.totalIterations < 10) return 0;
    
    // Weighted score based on recent performance
    const recentSuccessRate = this.getSuccessRate() / 100;
    const streakBonus = Math.min(this.state.currentStreak / 10, 0.3); // Max 30% bonus
    const stabilityScore = Math.min(recentSuccessRate + streakBonus, 1.0);
    
    return Math.round(stabilityScore * 100) / 100;
  }

  /**
   * Reset streak (for testing purposes)
   */
  reset(): void {
    this.state = {
      currentStreak: 0,
      bestStreak: 0,
      lastIterationStatus: 'none',
      lastSuccessTime: null,
      totalIterations: 0,
      successfulIterations: 0,
      failedIterations: 0,
    };
    this.saveState();
    console.log('[GreenStreakTracker] Streak reset');
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary(): {
    streak: number;
    bestStreak: number;
    successRate: number;
    stabilityScore: number;
    totalIterations: number;
    recommendations: string[];
  } {
    const successRate = this.getSuccessRate();
    const stabilityScore = this.getStabilityScore();
    
    const recommendations: string[] = [];
    
    if (this.state.currentStreak < 3) {
      recommendations.push('Focus on improving iteration consistency to build streak');
    }
    
    if (successRate < 85) {
      recommendations.push('Review failure patterns and implement mitigations');
    }
    
    if (stabilityScore < 0.80) {
      recommendations.push('Improve stability metrics to reach 0.80+ target');
    }
    
    if (successRate >= 95) {
      recommendations.push('Excellent OK rate achieved! Maintain current practices.');
    }
    
    return {
      streak: this.state.currentStreak,
      bestStreak: this.state.bestStreak,
      successRate,
      stabilityScore,
      totalIterations: this.state.totalIterations,
      recommendations,
    };
  }
}

// Singleton instance
let trackerInstance: GreenStreakTracker | null;

export function getGreenStreakTracker(): GreenStreakTracker {
  if (!trackerInstance) {
    trackerInstance = new GreenStreakTracker();
  }
  return trackerInstance;
}
