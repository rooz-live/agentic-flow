/**
 * Iteration Budget Tracker
 * 
 * Maintains directed attention via iteration budget tracking
 * Tracks iteration consumption and efficiency
 * 
 * Philosophical Foundation:
 * - Manthra: Each iteration is a directed thought-action cycle
 * - Budget represents finite resource of attention and effort
 * - Efficiency measures the quality of outcomes per iteration
 * 
 * This system ensures:
 * 1. Iterations are used intentionally, not casually
 * 2. Budget exhaustion triggers reflection and re-alignment
 * 3. Efficiency trends inform future planning
 * 4. Historical data supports learning and improvement
 */

export interface IterationBudgetConfig {
  /** Total iteration budget */
  totalBudget: number;
  /** Warning threshold (percentage of budget consumed) */
  warningThreshold: number;
  /** Critical threshold (percentage of budget consumed) */
  criticalThreshold: number;
  /** Exhausted threshold (percentage of budget consumed) */
  exhaustedThreshold: number;
  /** Efficiency targets */
  efficiencyTargets: {
    healthy: number;
    warning: number;
    critical: number;
  };
  /** Enable alerts */
  enableAlerts: boolean;
  /** Enable interpretability logging */
  enableInterpretabilityLogging: boolean;
}

export interface IterationBudget {
  /** Total iterations allocated */
  totalBudget: number;
  /** Iterations consumed */
  iterationsConsumed: number;
  /** Remaining iterations */
  remainingIterations: number;
  /** Consumption percentage */
  consumptionPercentage: number;
  /** Budget status */
  budgetStatus: 'healthy' | 'warning' | 'critical' | 'exhausted';
  /** Iteration efficiency */
  iterationEfficiency: number;
  /** Efficiency status */
  efficiencyStatus: 'healthy' | 'warning' | 'critical';
  /** Last updated timestamp */
  lastUpdated: Date;
}

export interface IterationRecord {
  /** Record ID */
  id: string;
  /** Task or intention ID */
  taskId: string;
  /** Task description */
  taskDescription: string;
  /** Iterations consumed */
  iterationsConsumed: number;
  /** Quality score achieved */
  qualityScore: number;
  /** Timestamp */
  timestamp: Date;
  /** Notes */
  notes?: string;
}

export interface EfficiencyTrend {
  /** Average efficiency over period */
  averageEfficiency: number;
  /** Efficiency trend direction */
  trend: 'improving' | 'stable' | 'declining';
  /** Trend percentage */
  trendPercentage: number;
  /** Period covered */
  period: {
    start: Date;
    end: Date;
  };
}

export interface BudgetAlert {
  /** Alert type */
  type: 'warning' | 'critical' | 'exhausted' | 'efficiency_warning' | 'efficiency_critical';
  /** Alert message */
  message: string;
  /** Current value */
  currentValue: number;
  /** Threshold value */
  thresholdValue: number;
  /** Timestamp */
  timestamp: Date;
  /** Recommended action */
  recommendedAction: string;
}

const DEFAULT_CONFIG: IterationBudgetConfig = {
  totalBudget: 1000,
  warningThreshold: 0.70,
  criticalThreshold: 0.90,
  exhaustedThreshold: 1.0,
  efficiencyTargets: {
    healthy: 0.80,
    warning: 0.60,
    critical: 0.40
  },
  enableAlerts: true,
  enableInterpretabilityLogging: true
};

/**
 * Iteration Budget Tracker
 * 
 * Tracks iteration consumption and efficiency to maintain directed attention
 */
export class IterationBudgetTracker {
  private config: IterationBudgetConfig;
  private budget: IterationBudget;
  private iterationHistory: IterationRecord[] = [];
  private alerts: BudgetAlert[] = [];
  private efficiencyHistory: number[] = [];

  constructor(config: Partial<IterationBudgetConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeBudget();
  }

  /**
   * Initialize budget
   */
  private initializeBudget(): void {
    this.budget = {
      totalBudget: this.config.totalBudget,
      iterationsConsumed: 0,
      remainingIterations: this.config.totalBudget,
      consumptionPercentage: 0,
      budgetStatus: 'healthy',
      iterationEfficiency: 1.0,
      efficiencyStatus: 'healthy',
      lastUpdated: new Date()
    };
  }

  /**
   * Get current budget status
   */
  public getBudgetStatus(): IterationBudget {
    return { ...this.budget };
  }

  /**
   * Consume iterations
   */
  public consumeIterations(
    count: number,
    taskId: string,
    taskDescription: string,
    qualityScore: number = 1.0,
    notes?: string
  ): IterationRecord {
    const id = this.generateRecordId();
    const timestamp = new Date();

    // Create iteration record
    const record: IterationRecord = {
      id,
      taskId,
      taskDescription,
      iterationsConsumed: count,
      qualityScore,
      timestamp,
      notes
    };

    // Update budget
    this.budget.iterationsConsumed += count;
    this.budget.remainingIterations = Math.max(0, this.budget.totalBudget - this.budget.iterationsConsumed);
    this.budget.consumptionPercentage = this.budget.iterationsConsumed / this.budget.totalBudget;
    this.budget.lastUpdated = timestamp;

    // Update budget status
    this.updateBudgetStatus();

    // Update efficiency
    this.updateEfficiency(qualityScore);

    // Store record
    this.iterationHistory.push(record);

    // Check for alerts
    if (this.config.enableAlerts) {
      this.checkAlerts();
    }

    // Log for interpretability
    if (this.config.enableInterpretabilityLogging) {
      this.logInterpretability(record);
    }

    return record;
  }

  /**
   * Update budget status based on consumption
   */
  private updateBudgetStatus(): void {
    const { consumptionPercentage } = this.budget;
    const { warningThreshold, criticalThreshold, exhaustedThreshold } = this.config;

    if (consumptionPercentage >= exhaustedThreshold) {
      this.budget.budgetStatus = 'exhausted';
    } else if (consumptionPercentage >= criticalThreshold) {
      this.budget.budgetStatus = 'critical';
    } else if (consumptionPercentage >= warningThreshold) {
      this.budget.budgetStatus = 'warning';
    } else {
      this.budget.budgetStatus = 'healthy';
    }
  }

  /**
   * Update iteration efficiency
   */
  private updateEfficiency(qualityScore: number): void {
    // Add to efficiency history
    this.efficiencyHistory.push(qualityScore);
    
    // Keep last 100 efficiency values
    if (this.efficiencyHistory.length > 100) {
      this.efficiencyHistory = this.efficiencyHistory.slice(-100);
    }

    // Calculate average efficiency
    const avgEfficiency = this.efficiencyHistory.reduce((sum, val) => sum + val, 0) / this.efficiencyHistory.length;
    this.budget.iterationEfficiency = avgEfficiency;

    // Update efficiency status
    const { healthy, warning, critical } = this.config.efficiencyTargets;

    if (avgEfficiency >= healthy) {
      this.budget.efficiencyStatus = 'healthy';
    } else if (avgEfficiency >= warning) {
      this.budget.efficiencyStatus = 'warning';
    } else {
      this.budget.efficiencyStatus = 'critical';
    }
  }

  /**
   * Check for alerts
   */
  private checkAlerts(): void {
    const { budgetStatus, iterationEfficiency, consumptionPercentage } = this.budget;

    // Budget alerts
    if (budgetStatus === 'warning' && !this.hasAlertType('warning')) {
      this.alerts.push({
        type: 'warning',
        message: 'Iteration budget approaching warning threshold',
        currentValue: consumptionPercentage,
        thresholdValue: this.config.warningThreshold,
        timestamp: new Date(),
        recommendedAction: 'Review iteration usage and prioritize remaining tasks'
      });
    }

    if (budgetStatus === 'critical' && !this.hasAlertType('critical')) {
      this.alerts.push({
        type: 'critical',
        message: 'Iteration budget at critical level',
        currentValue: consumptionPercentage,
        thresholdValue: this.config.criticalThreshold,
        timestamp: new Date(),
        recommendedAction: 'Immediate action required: pause non-critical work and reassess priorities'
      });
    }

    if (budgetStatus === 'exhausted' && !this.hasAlertType('exhausted')) {
      this.alerts.push({
        type: 'exhausted',
        message: 'Iteration budget exhausted',
        currentValue: consumptionPercentage,
        thresholdValue: this.config.exhaustedThreshold,
        timestamp: new Date(),
        recommendedAction: 'Budget exhausted: Request additional budget or defer remaining work'
      });
    }

    // Efficiency alerts
    if (this.budget.efficiencyStatus === 'warning' && !this.hasAlertType('efficiency_warning')) {
      this.alerts.push({
        type: 'efficiency_warning',
        message: 'Iteration efficiency declining',
        currentValue: iterationEfficiency,
        thresholdValue: this.config.efficiencyTargets.warning,
        timestamp: new Date(),
        recommendedAction: 'Review work quality and consider process improvements'
      });
    }

    if (this.budget.efficiencyStatus === 'critical' && !this.hasAlertType('efficiency_critical')) {
      this.alerts.push({
        type: 'efficiency_critical',
        message: 'Iteration efficiency critically low',
        currentValue: iterationEfficiency,
        thresholdValue: this.config.efficiencyTargets.critical,
        timestamp: new Date(),
        recommendedAction: 'Urgent: Stop and reassess approach before continuing'
      });
    }
  }

  /**
   * Check if alert of type exists
   */
  private hasAlertType(type: string): boolean {
    return this.alerts.some(alert => alert.type === type);
  }

  /**
   * Get alerts
   */
  public getAlerts(): BudgetAlert[] {
    return [...this.alerts];
  }

  /**
   * Clear alerts
   */
  public clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Get iteration history
   */
  public getIterationHistory(limit?: number): IterationRecord[] {
    if (limit) {
      return this.iterationHistory.slice(-limit);
    }
    return [...this.iterationHistory];
  }

  /**
   * Get efficiency trend
   */
  public getEfficiencyTrend(periodDays: number = 7): EfficiencyTrend {
    const now = new Date();
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

    // Filter records within period
    const periodRecords = this.iterationHistory.filter(
      record => record.timestamp >= periodStart && record.timestamp <= now
    );

    if (periodRecords.length === 0) {
      return {
        averageEfficiency: 0,
        trend: 'stable',
        trendPercentage: 0,
        period: { start: periodStart, end: now }
      };
    }

    // Calculate average efficiency
    const averageEfficiency = periodRecords.reduce((sum, r) => sum + r.qualityScore, 0) / periodRecords.length;

    // Calculate trend
    const firstHalf = periodRecords.slice(0, Math.floor(periodRecords.length / 2));
    const secondHalf = periodRecords.slice(Math.floor(periodRecords.length / 2));

    const firstHalfAvg = firstHalf.length > 0
      ? firstHalf.reduce((sum, r) => sum + r.qualityScore, 0) / firstHalf.length
      : 0;
    const secondHalfAvg = secondHalf.length > 0
      ? secondHalf.reduce((sum, r) => sum + r.qualityScore, 0) / secondHalf.length
      : 0;

    let trend: 'improving' | 'stable' | 'declining';
    let trendPercentage = 0;

    if (secondHalfAvg > firstHalfAvg * 1.05) {
      trend = 'improving';
      trendPercentage = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
    } else if (secondHalfAvg < firstHalfAvg * 0.95) {
      trend = 'declining';
      trendPercentage = ((firstHalfAvg - secondHalfAvg) / firstHalfAvg) * 100;
    } else {
      trend = 'stable';
    }

    return {
      averageEfficiency,
      trend,
      trendPercentage,
      period: { start: periodStart, end: now }
    };
  }

  /**
   * Reset budget
   */
  public resetBudget(newTotal?: number): void {
    if (newTotal) {
      this.config.totalBudget = newTotal;
    }
    this.initializeBudget();
    this.efficiencyHistory = [];
  }

  /**
   * Get task summary
   */
  public getTaskSummary(taskId: string): {
    totalIterations: number;
    averageQuality: number;
    recordCount: number;
  } | null {
    const taskRecords = this.iterationHistory.filter(r => r.taskId === taskId);

    if (taskRecords.length === 0) {
      return null;
    }

    const totalIterations = taskRecords.reduce((sum, r) => sum + r.iterationsConsumed, 0);
    const averageQuality = taskRecords.reduce((sum, r) => sum + r.qualityScore, 0) / taskRecords.length;

    return {
      totalIterations,
      averageQuality,
      recordCount: taskRecords.length
    };
  }

  /**
   * Get overall statistics
   */
  public getStatistics(): {
    totalIterationsConsumed: number;
    totalTasks: number;
    averageEfficiency: number;
    budgetRemaining: number;
    daysUntilExhaustion?: number;
  } {
    const totalIterationsConsumed = this.budget.iterationsConsumed;
    const totalTasks = new Set(this.iterationHistory.map(r => r.taskId)).size;
    const averageEfficiency = this.budget.iterationEfficiency;
    const budgetRemaining = this.budget.remainingIterations;

    // Estimate days until exhaustion based on recent consumption
    const recentRecords = this.iterationHistory.slice(-10);
    let daysUntilExhaustion: number | undefined;
    
    if (recentRecords.length >= 2) {
      const avgIterationsPerDay = recentRecords.reduce((sum, r) => sum + r.iterationsConsumed, 0) / recentRecords.length;
      if (avgIterationsPerDay > 0) {
        daysUntilExhaustion = budgetRemaining / avgIterationsPerDay;
      }
    }

    return {
      totalIterationsConsumed,
      totalTasks,
      averageEfficiency,
      budgetRemaining,
      daysUntilExhaustion
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<IterationBudgetConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private generateRecordId(): string {
    return `iter-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private logInterpretability(record: IterationRecord): void {
    const logEntry = {
      timestamp: record.timestamp.toISOString(),
      pattern: 'interpretability',
      model_type: 'iteration_budget_tracker_v1',
      explanation_type: 'budget_tracking',
      circle: 'governance',
      task_id: record.taskId,
      iterations_consumed: record.iterationsConsumed,
      quality_score: record.qualityScore,
      budget_remaining: this.budget.remainingIterations,
      budget_status: this.budget.budgetStatus,
      iteration_efficiency: this.budget.iterationEfficiency,
      record_id: record.id
    };

    console.log('[ITERATION-BUDGET]', JSON.stringify(logEntry));
  }
}

/**
 * Create default iteration budget tracker
 */
export function createDefaultIterationBudgetTracker(): IterationBudgetTracker {
  return new IterationBudgetTracker();
}

/**
 * Create iteration budget tracker from config
 */
export async function createIterationBudgetTrackerFromConfig(
  configPath: string
): Promise<IterationBudgetTracker> {
  // In a real implementation, this would read from a file
  // For now, return default
  return new IterationBudgetTracker();
}
