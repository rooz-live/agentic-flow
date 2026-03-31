/**
 * Budget Tracking Integration
 * @module integrations/budget_tracking
 *
 * CapEx/OpEx tracking for infrastructure and operational costs.
 * Includes budget alerts, forecasting, and replenishment tracking.
 */
import { EventEmitter } from 'events';
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
    resourceId?: string;
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
    burnRate: number;
    recommendation: string;
}
export declare class BudgetTracker extends EventEmitter {
    private db;
    private config;
    constructor(config?: BudgetConfig);
    private initializeSchema;
    recordExpense(expense: Omit<Expense, 'id' | 'createdAt'>): Expense;
    getExpenses(type?: ExpenseType, category?: ExpenseCategory): Expense[];
    private mapRowToExpense;
    createBudget(budget: Omit<Budget, 'id' | 'spentAmount' | 'createdAt'>): Budget;
    getBudget(budgetId: string): Budget | null;
    private mapRowToBudget;
    updateBudgetSpent(budgetId: string, amount: number): void;
    private checkBudgetAlerts;
    private checkBudgetAlert;
    private createAlert;
    getAlerts(acknowledged?: boolean): BudgetAlert[];
    acknowledgeAlert(alertId: string): void;
    forecastBudget(budgetId: string): BudgetForecast | null;
    getSummary(): {
        capex: {
            total: number;
            budget: number;
        };
        opex: {
            total: number;
            budget: number;
        };
    };
    close(): void;
}
export declare function createBudgetTracker(config?: BudgetConfig): BudgetTracker;
//# sourceMappingURL=budget_tracking.d.ts.map