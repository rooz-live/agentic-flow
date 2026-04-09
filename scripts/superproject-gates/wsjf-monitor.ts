/**
 * WSJF Monitoring
 *
 * WSJF (Weighted Shortest Job First) based continuous improvement for monitoring:
 * - Calculate WSJF score for monitoring improvements
 * - Prioritize monitoring tasks based on WSJF
 * - Track improvement metrics over time
 * - Generate improvement recommendations
 *
 * WSJF Formula: Cost of Delay / Job Size
 * Cost of Delay = User Business Value + Time Criticality + Risk Reduction
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface MonitoringImprovement {
  title: string;
  description: string;
  costOfDelay: number;
  userBusinessValue: number;
  timeCriticality: number;
  riskReduction: number;
  riskOfFailure: number;
}

export interface MonitoringTask {
  id: string;
  title: string;
  description: string;
  estimatedEffort: number;
  wsjfScore?: number;
  priority?: number;
}

export interface ImprovementMetrics {
  task: string;
  completed: boolean;
  duration: number;
  impact: string;
  timestamp: Date;
}

export interface TimeWindow {
  start: Date;
  end: Date;
}

export interface ImprovementTrend {
  period: TimeWindow;
  improvementsCompleted: number;
  avgDuration: number;
  avgImpact: number;
}

export interface Recommendation {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  wsjfScore: number;
  estimatedEffort: number;
}

export interface WSJFScore {
  score: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  components: {
    userBusinessValue: number;
    timeCriticality: number;
    riskReduction: number;
    costOfDelay: number;
    jobSize: number;
  };
  recommendation: string;
}

// ============================================================================
// WSJF Monitoring Class
// ============================================================================

export class WSJFMonitoring {
  private improvementHistory: ImprovementMetrics[] = [];
  private improvementTrends: ImprovementTrend[] = [];

  constructor() {}

  /**
   * Calculate WSJF score for monitoring improvement
   */
  async calculateImprovementWSJF(improvement: MonitoringImprovement): Promise<WSJFScore> {
    // Calculate Cost of Delay
    const costOfDelay = improvement.userBusinessValue + 
                        improvement.timeCriticality + 
                        improvement.riskReduction;

    // Calculate WSJF score: Cost of Delay / Job Size
    // Use riskOfFailure as proxy for job size (higher risk = more complex = larger job)
    const jobSize = improvement.riskOfFailure || 1;
    const wsjfScore = costOfDelay / jobSize;

    // Determine priority based on WSJF score
    const priority = this.determinePriority(wsjfScore);

    // Generate recommendation
    const recommendation = this.generateWSJFRecommendation(wsjfScore, priority);

    return {
      score: wsjfScore,
      priority,
      components: {
        userBusinessValue: improvement.userBusinessValue,
        timeCriticality: improvement.timeCriticality,
        riskReduction: improvement.riskReduction,
        costOfDelay,
        jobSize,
      },
      recommendation,
    };
  }

  /**
   * Prioritize monitoring tasks based on WSJF
   */
  async prioritizeMonitoringTasks(tasks: MonitoringTask[]): Promise<MonitoringTask[]> {
    // Calculate WSJF scores for all tasks
    const tasksWithScores = await Promise.all(
      tasks.map(async (task) => {
        // Convert task to monitoring improvement format
        const improvement: MonitoringImprovement = {
          title: task.title,
          description: task.description,
          costOfDelay: 0, // Will be calculated
          userBusinessValue: this.estimateBusinessValue(task),
          timeCriticality: this.estimateTimeCriticality(task),
          riskReduction: this.estimateRiskReduction(task),
          riskOfFailure: task.estimatedEffort,
        };

        const wsjfResult = await this.calculateImprovementWSJF(improvement);

        return {
          ...task,
          wsjfScore: wsjfResult.score,
          priority: this.getPriorityValue(wsjfResult.priority),
        };
      })
    );

    // Sort by WSJF score (descending)
    const sortedTasks = tasksWithScores.sort((a, b) => {
      const scoreA = a.wsjfScore || 0;
      const scoreB = b.wsjfScore || 0;
      return scoreB - scoreA;
    });

    // Assign priority numbers
    sortedTasks.forEach((task, index) => {
      task.priority = index + 1;
    });

    return sortedTasks;
  }

  /**
   * Track improvement metrics
   */
  async trackImprovementMetrics(metrics: ImprovementMetrics): Promise<void> {
    this.improvementHistory.push(metrics);

    // Recalculate trends
    await this.recalculateTrends();

    console.log(`[WSJF] Improvement tracked:`, {
      task: metrics.task,
      completed: metrics.completed,
      duration: metrics.duration,
      impact: metrics.impact,
    });
  }

  /**
   * Get improvement trends over time window
   */
  async getImprovementTrends(period: TimeWindow): Promise<ImprovementTrend[]> {
    return this.improvementTrends.filter(trend =>
      trend.period.start >= period.start && trend.period.end <= period.end
    );
  }

  /**
   * Generate improvement recommendations
   */
  async generateRecommendations(): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Analyze improvement history to identify patterns
    const completedImprovements = this.improvementHistory.filter(m => m.completed);
    const avgDuration = this.calculateAverageDuration(completedImprovements);

    // Generate recommendations based on analysis
    if (completedImprovements.length > 0) {
      // High-impact, quick wins
      const quickWins = completedImprovements.filter(
        m => m.duration < avgDuration * 0.5 && m.impact === 'high'
      );

      if (quickWins.length > 0) {
        recommendations.push({
          title: 'Focus on Quick Wins',
          description: `Found ${quickWins.length} high-impact improvements that can be completed quickly. Prioritize similar tasks.`,
          priority: 'high',
          wsjfScore: 15.0,
          estimatedEffort: 2,
        });
      }

      // Long-running improvements
      const longRunning = completedImprovements.filter(
        m => m.duration > avgDuration * 2
      );

      if (longRunning.length > 0) {
        recommendations.push({
          title: 'Review Long-Running Improvements',
          description: `${longRunning.length} improvements took longer than expected. Review estimation accuracy and consider breaking down complex tasks.`,
          priority: 'medium',
          wsjfScore: 8.0,
          estimatedEffort: 5,
        });
      }
    }

    // Add general recommendations
    recommendations.push({
      title: 'Implement Automated Monitoring',
      description: 'Automate routine monitoring tasks to reduce manual effort and improve consistency.',
      priority: 'high',
      wsjfScore: 12.0,
      estimatedEffort: 8,
    });

    recommendations.push({
      title: 'Enhance Alerting Accuracy',
      description: 'Reduce false positives and improve alert relevance to reduce alert fatigue.',
      priority: 'medium',
      wsjfScore: 9.0,
      estimatedEffort: 5,
    });

    recommendations.push({
      title: 'Expand Monitoring Coverage',
      description: 'Add monitoring for currently unmonitored services and components.',
      priority: 'medium',
      wsjfScore: 7.5,
      estimatedEffort: 10,
    });

    // Sort recommendations by WSJF score
    return recommendations.sort((a, b) => b.wsjfScore - a.wsjfScore);
  }

  /**
   * Determine priority based on WSJF score
   */
  private determinePriority(wsjfScore: number): 'critical' | 'high' | 'medium' | 'low' {
    if (wsjfScore >= 15) return 'critical';
    if (wsjfScore >= 10) return 'high';
    if (wsjfScore >= 5) return 'medium';
    return 'low';
  }

  /**
   * Get numeric priority value
   */
  private getPriorityValue(priority: 'critical' | 'high' | 'medium' | 'low'): number {
    const priorityMap = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };
    return priorityMap[priority];
  }

  /**
   * Generate WSJF recommendation
   */
  private generateWSJFRecommendation(wsjfScore: number, priority: string): string {
    const recommendations: Record<string, string> = {
      critical: 'Immediate action required. This improvement has high business value and urgency.',
      high: 'High priority. Schedule for implementation in the next iteration.',
      medium: 'Medium priority. Consider for upcoming sprints based on capacity.',
      low: 'Low priority. Can be deferred if higher-priority items exist.',
    };

    return recommendations[priority] || 'Unable to determine recommendation.';
  }

  /**
   * Estimate business value from task
   */
  private estimateBusinessValue(task: MonitoringTask): number {
    // Simple heuristic based on task description
    const description = task.description.toLowerCase();
    
    if (description.includes('critical') || description.includes('security')) {
      return 10;
    } else if (description.includes('important') || description.includes('performance')) {
      return 7;
    } else if (description.includes('improve') || description.includes('enhance')) {
      return 5;
    } else {
      return 3;
    }
  }

  /**
   * Estimate time criticality from task
   */
  private estimateTimeCriticality(task: MonitoringTask): number {
    // Simple heuristic based on task description
    const description = task.description.toLowerCase();
    
    if (description.includes('urgent') || description.includes('immediate')) {
      return 10;
    } else if (description.includes('soon') || description.includes('upcoming')) {
      return 7;
    } else if (description.includes('eventually') || description.includes('future')) {
      return 3;
    } else {
      return 5;
    }
  }

  /**
   * Estimate risk reduction from task
   */
  private estimateRiskReduction(task: MonitoringTask): number {
    // Simple heuristic based on task description
    const description = task.description.toLowerCase();
    
    if (description.includes('security') || description.includes('vulnerability')) {
      return 10;
    } else if (description.includes('stability') || description.includes('reliability')) {
      return 8;
    } else if (description.includes('monitoring') || description.includes('alerting')) {
      return 6;
    } else {
      return 4;
    }
  }

  /**
   * Calculate average duration
   */
  private calculateAverageDuration(metrics: ImprovementMetrics[]): number {
    if (metrics.length === 0) return 0;
    
    const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
    return totalDuration / metrics.length;
  }

  /**
   * Recalculate improvement trends
   */
  private async recalculateTrends(): Promise<void> {
    // Group by day/week/month and calculate trends
    // This is a simplified implementation
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentImprovements = this.improvementHistory.filter(
      m => m.timestamp >= oneWeekAgo && m.completed
    );

    if (recentImprovements.length > 0) {
      const avgDuration = this.calculateAverageDuration(recentImprovements);
      const avgImpact = this.calculateAverageImpact(recentImprovements);

      this.improvementTrends.push({
        period: {
          start: oneWeekAgo,
          end: now,
        },
        improvementsCompleted: recentImprovements.length,
        avgDuration,
        avgImpact: this.getImpactValue(avgImpact),
      });
    }
  }

  /**
   * Calculate average impact
   */
  private calculateAverageImpact(metrics: ImprovementMetrics[]): string {
    if (metrics.length === 0) return 'low';
    
    const impactCounts = {
      high: 0,
      medium: 0,
      low: 0,
    };

    metrics.forEach(m => {
      impactCounts[m.impact as keyof typeof impactCounts]++;
    });

    const maxCount = Math.max(...Object.values(impactCounts));
    const dominantImpact = Object.entries(impactCounts).find(([_, count]) => count === maxCount);

    return dominantImpact ? dominantImpact[0] : 'low';
  }

  /**
   * Get numeric impact value
   */
  private getImpactValue(impact: string): number {
    const impactMap = {
      high: 3,
      medium: 2,
      low: 1,
    };
    return impactMap[impact as keyof typeof impactMap] || 1;
  }

  /**
   * Get improvement history
   */
  getImprovementHistory(): ImprovementMetrics[] {
    return [...this.improvementHistory];
  }

  /**
   * Get all trends
   */
  getAllTrends(): ImprovementTrend[] {
    return [...this.improvementTrends];
  }
}

/**
 * Create WSJF monitoring instance
 */
export function createWSJFMonitoring(): WSJFMonitoring {
  return new WSJFMonitoring();
}
