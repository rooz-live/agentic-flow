/**
 * Budget Tracking Integration
 * @module integrations/budget_tracking
 *
 * CapEx/OpEx tracking for infrastructure and operational costs.
 * Includes budget alerts, forecasting, and replenishment tracking.
 */

import Database from 'better-sqlite3';
import { EventEmitter } from 'events';
import path from 'path';

// =============================================================================
// Configuration
// =============================================================================

export interface BudgetConfig {
  dbPath?: string;
  alertThresholds?: AlertThresholds;
  currency?: string;
}

export interface AlertThresholds {
  capexWarningPercent: number;
  capexCriticalPercent: number;
  opexWarningPercent: number;
  opexCriticalPercent: number;
}

const DEFAULT_CONFIG: Required<BudgetConfig> = {
  dbPath: path.join(process.cwd(), 'logs', 'budget_tracking.db'),
  alertThresholds: {
    capexWarningPercent: 75,
    capexCriticalPercent: 90,
    opexWarningPercent: 80,
    opexCriticalPercent: 95,
  },
  currency: 'USD',
};

// =============================================================================
// Types
// =============================================================================

export type ExpenseCategory = 'infrastructure' | 'hosting' | 'api' | 'stripe_fees' | 'other';
export type ExpenseType = 'capex' | 'opex';

export interface Expense {
  id: string;
  type: ExpenseType;
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: string;
  vendor?: string;
  resourceId?: string; // e.g., StarlingX IP, AWS instance ID
  createdAt: Date;
  periodStart?: Date;
  periodEnd?: Date;
  metadata?: Record<string, unknown>;
}

export interface Budget {
  id: string;
  name: string;
  type: ExpenseType;
  allocatedAmount: number;
  spentAmount: number;
  currency: string;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
}

export interface BudgetAlert {
  id: string;
  budgetId: string;
  level: 'warning' | 'critical';
  message: string;
  utilizationPercent: number;
  createdAt: Date;
  acknowledged: boolean;
}

export interface BudgetForecast {
  budgetId: string;
  projectedSpend: number;
  projectedOverrun: number;
  daysRemaining: number;
  burnRate: number; // per day
  recommendation: string;
}

// =============================================================================
// Budget Tracker
// =============================================================================

export class BudgetTracker extends EventEmitter {
  private db: Database.Database;
  private config: Required<BudgetConfig>;

  constructor(config: BudgetConfig = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.db = new Database(this.config.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initializeSchema();
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('capex', 'opex')),
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'USD',
        vendor TEXT,
        resource_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        period_start TEXT,
        period_end TEXT,
        metadata TEXT DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('capex', 'opex')),
        allocated_amount REAL NOT NULL,
        spent_amount REAL DEFAULT 0,
        currency TEXT DEFAULT 'USD',
        period_start TEXT NOT NULL,
        period_end TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS budget_alerts (
        id TEXT PRIMARY KEY,
        budget_id TEXT NOT NULL,
        level TEXT NOT NULL CHECK(level IN ('warning', 'critical')),
        message TEXT NOT NULL,
        utilization_percent REAL NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        acknowledged INTEGER DEFAULT 0,
        FOREIGN KEY (budget_id) REFERENCES budgets(id)
      );

      CREATE INDEX IF NOT EXISTS idx_expenses_type ON expenses(type);
      CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
      CREATE INDEX IF NOT EXISTS idx_budgets_type ON budgets(type);
    `);
  }

  // ===========================================================================
  // Expense Management
  // ===========================================================================

  recordExpense(expense: Omit<Expense, 'id' | 'createdAt'>): Expense {
    const id = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = new Date();

    this.db.prepare(`
      INSERT INTO expenses (id, type, category, description, amount, currency, vendor, resource_id, period_start, period_end, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      expense.type,
      expense.category,
      expense.description,
      expense.amount,
      expense.currency || this.config.currency,
      expense.vendor || null,
      expense.resourceId || null,
      expense.periodStart?.toISOString() || null,
      expense.periodEnd?.toISOString() || null,
      JSON.stringify(expense.metadata || {})
    );

    const newExpense: Expense = { ...expense, id, createdAt };
    this.emit('expense:recorded', newExpense);
    this.checkBudgetAlerts(expense.type);
    return newExpense;
  }

  getExpenses(type?: ExpenseType, category?: ExpenseCategory): Expense[] {
    let query = 'SELECT * FROM expenses WHERE 1=1';
    const params: any[] = [];

    if (type) { query += ' AND type = ?'; params.push(type); }
    if (category) { query += ' AND category = ?'; params.push(category); }
    query += ' ORDER BY created_at DESC';

    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map(this.mapRowToExpense);
  }

  private mapRowToExpense(row: any): Expense {
    return {
      id: row.id,
      type: row.type,
      category: row.category,
      description: row.description,
      amount: row.amount,
      currency: row.currency,
      vendor: row.vendor,
      resourceId: row.resource_id,
      createdAt: new Date(row.created_at),
      periodStart: row.period_start ? new Date(row.period_start) : undefined,
      periodEnd: row.period_end ? new Date(row.period_end) : undefined,
      metadata: JSON.parse(row.metadata || '{}'),
    };
  }

  // ===========================================================================
  // Budget Management
  // ===========================================================================

  createBudget(budget: Omit<Budget, 'id' | 'spentAmount' | 'createdAt'>): Budget {
    const id = `bud_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.db.prepare(`
      INSERT INTO budgets (id, name, type, allocated_amount, currency, period_start, period_end)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, budget.name, budget.type, budget.allocatedAmount,
      budget.currency || this.config.currency,
      budget.periodStart.toISOString(), budget.periodEnd.toISOString()
    );

    const newBudget: Budget = {
      ...budget, id, spentAmount: 0, createdAt: new Date(),
      currency: budget.currency || this.config.currency
    };
    this.emit('budget:created', newBudget);
    return newBudget;
  }

  getBudget(budgetId: string): Budget | null {
    const row = this.db.prepare('SELECT * FROM budgets WHERE id = ?').get(budgetId) as any;
    return row ? this.mapRowToBudget(row) : null;
  }

  private mapRowToBudget(row: any): Budget {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      allocatedAmount: row.allocated_amount,
      spentAmount: row.spent_amount,
      currency: row.currency,
      periodStart: new Date(row.period_start),
      periodEnd: new Date(row.period_end),
      createdAt: new Date(row.created_at),
    };
  }

  updateBudgetSpent(budgetId: string, amount: number): void {
    this.db.prepare('UPDATE budgets SET spent_amount = spent_amount + ? WHERE id = ?').run(amount, budgetId);
    const budget = this.getBudget(budgetId);
    if (budget) this.checkBudgetAlert(budget);
  }

  // ===========================================================================
  // Alert Management
  // ===========================================================================

  private checkBudgetAlerts(type: ExpenseType): void {
    const budgets = this.db.prepare('SELECT * FROM budgets WHERE type = ?').all(type) as any[];
    budgets.map(b => this.mapRowToBudget(b)).forEach(b => this.checkBudgetAlert(b));
  }

  private checkBudgetAlert(budget: Budget): void {
    const utilization = (budget.spentAmount / budget.allocatedAmount) * 100;
    const thresholds = this.config.alertThresholds;
    const criticalThreshold = budget.type === 'capex' ? thresholds.capexCriticalPercent : thresholds.opexCriticalPercent;
    const warningThreshold = budget.type === 'capex' ? thresholds.capexWarningPercent : thresholds.opexWarningPercent;

    if (utilization >= criticalThreshold) {
      this.createAlert(budget.id, 'critical', `Budget ${budget.name} at ${utilization.toFixed(1)}% utilization`, utilization);
    } else if (utilization >= warningThreshold) {
      this.createAlert(budget.id, 'warning', `Budget ${budget.name} at ${utilization.toFixed(1)}% utilization`, utilization);
    }
  }

  private createAlert(budgetId: string, level: 'warning' | 'critical', message: string, utilization: number): void {
    const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.db.prepare(`
      INSERT INTO budget_alerts (id, budget_id, level, message, utilization_percent)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, budgetId, level, message, utilization);
    this.emit('alert:created', { id, budgetId, level, message, utilization });
  }

  getAlerts(acknowledged?: boolean): BudgetAlert[] {
    let query = 'SELECT * FROM budget_alerts';
    if (acknowledged !== undefined) query += ` WHERE acknowledged = ${acknowledged ? 1 : 0}`;
    query += ' ORDER BY created_at DESC';

    const rows = this.db.prepare(query).all() as any[];
    return rows.map(row => ({
      id: row.id,
      budgetId: row.budget_id,
      level: row.level,
      message: row.message,
      utilizationPercent: row.utilization_percent,
      createdAt: new Date(row.created_at),
      acknowledged: Boolean(row.acknowledged),
    }));
  }

  acknowledgeAlert(alertId: string): void {
    this.db.prepare('UPDATE budget_alerts SET acknowledged = 1 WHERE id = ?').run(alertId);
  }

  // ===========================================================================
  // Forecasting
  // ===========================================================================

  forecastBudget(budgetId: string): BudgetForecast | null {
    const budget = this.getBudget(budgetId);
    if (!budget) return null;

    const now = new Date();
    const totalDays = (budget.periodEnd.getTime() - budget.periodStart.getTime()) / (1000 * 60 * 60 * 24);
    const elapsedDays = Math.max(1, (now.getTime() - budget.periodStart.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, (budget.periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const burnRate = budget.spentAmount / elapsedDays;
    const projectedSpend = burnRate * totalDays;
    const projectedOverrun = Math.max(0, projectedSpend - budget.allocatedAmount);

    let recommendation = 'Budget on track';
    if (projectedOverrun > 0) recommendation = `Reduce spending by $${(projectedOverrun / daysRemaining).toFixed(2)}/day`;
    else if (projectedSpend < budget.allocatedAmount * 0.8) recommendation = 'Underspending - consider reallocation';

    return { budgetId, projectedSpend, projectedOverrun, daysRemaining: Math.round(daysRemaining), burnRate, recommendation };
  }

  // ===========================================================================
  // Summary
  // ===========================================================================

  getSummary(): { capex: { total: number; budget: number }; opex: { total: number; budget: number } } {
    const expenses = this.getExpenses();
    const budgets = this.db.prepare('SELECT * FROM budgets').all() as any[];

    const capexTotal = expenses.filter(e => e.type === 'capex').reduce((sum, e) => sum + e.amount, 0);
    const opexTotal = expenses.filter(e => e.type === 'opex').reduce((sum, e) => sum + e.amount, 0);
    const capexBudget = budgets.filter((b: any) => b.type === 'capex').reduce((sum, b: any) => sum + b.allocated_amount, 0);
    const opexBudget = budgets.filter((b: any) => b.type === 'opex').reduce((sum, b: any) => sum + b.allocated_amount, 0);

    return {
      capex: { total: capexTotal, budget: capexBudget },
      opex: { total: opexTotal, budget: opexBudget },
    };
  }

  close(): void { this.db.close(); }
}

// =============================================================================
// Factory Functions
// =============================================================================

export function createBudgetTracker(config?: BudgetConfig): BudgetTracker {
  return new BudgetTracker(config);
}
