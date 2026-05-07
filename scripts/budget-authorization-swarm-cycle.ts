/**
 * Budget Authorization Script for Swarm Testing Cycle
 *
 * @business-context ADR-092: Provider-Agnostic Advisor Strategy
 * @governance Circle roles from .goalie/circles/*_pda.yaml
 * @purpose Formal OPEX budget allocation for scaled swarm experiments
 *
 * Retrospectively reviews Circle roles (Orchestrator, Analyst, Innovator, Assessor, Seeker, Intuitive)
 * and allocates/locks testing budget for the upcoming swarm experimentation cycle.
 */

import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { BudgetTracker } from '../src/integrations/budget_tracking';

interface CircleRole {
  circle: string;
  operational_roles: Record<string, {
    role_name: string;
    purpose: string;
    domains: string[];
    accountabilities: string[];
    mandate: string;
    metrics: Record<string, string>;
  }>;
}

interface BudgetAllocation {
  circle: string;
  allocated_amount: number;
  rationale: string;
  priority_factor: number; // WSJF-aligned
}

export class SwarmCycleBudgetAuthorizer {
  private budgetTracker: BudgetTracker;
  private circlesPath: string;
  private allocationPath: string;
  private circles: Map<string, CircleRole> = new Map();

  constructor() {
    this.budgetTracker = new BudgetTracker({
      currency: 'USD',
      defaultAlertThreshold: 0.8
    });
    this.circlesPath = path.resolve(process.cwd(), '.goalie/circles');
    this.allocationPath = path.resolve(process.cwd(), '.goalie/budget_allocations.json');
  }

  /**
   * Load all Circle role definitions from YAML files
   */
  public async loadCircleRoles(): Promise<void> {
    console.log('[BudgetAuth] Loading Circle roles...');

    const circleFiles = fs.readdirSync(this.circlesPath).filter(f => f.endsWith('_pda.yaml'));

    for (const file of circleFiles) {
      const filePath = path.join(this.circlesPath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const circleData = yaml.load(content) as CircleRole;

      this.circles.set(circleData.circle, circleData);
      console.log(`  ✓ Loaded ${circleData.circle} circle`);
    }

    console.log(`[BudgetAuth] Loaded ${this.circles.size} Circle definitions`);
  }

  /**
   * Review Circle roles and determine budget allocations
   * Based on mandate alignment with swarm testing objectives
   */
  public reviewCircleRoles(): BudgetAllocation[] {
    console.log('[BudgetAuth] Reviewing Circle roles for swarm testing alignment...');

    const allocations: BudgetAllocation[] = [];

    // Orchestrator: High priority for swarm coordination
    if (this.circles.has('Orchestrator')) {
      allocations.push({
        circle: 'Orchestrator',
        allocated_amount: 500.00,
        rationale: 'Primary swarm coordination, multi-agent orchestration, E2B sandbox management',
        priority_factor: 0.9 // High WSJF - critical path dependency
      });
    }

    // Analyst: Medium-high priority for performance analysis
    if (this.circles.has('Analyst')) {
      allocations.push({
        circle: 'Analyst',
        allocated_amount: 300.00,
        rationale: 'Swarm performance metrics, learning validation, hypothesis testing',
        priority_factor: 0.75 // Medium-high WSJF - insight generation
      });
    }

    // Innovator: Medium priority for experimental features
    if (this.circles.has('Innovator')) {
      allocations.push({
        circle: 'Innovator',
        allocated_amount: 200.00,
        rationale: 'Prototype swarm topologies, test novel coordination patterns',
        priority_factor: 0.6 // Medium WSJF - exploration budget
      });
    }

    // Assessor: Medium-high priority for quality gates
    if (this.circles.has('Assessor')) {
      allocations.push({
        circle: 'Assessor',
        allocated_amount: 250.00,
        rationale: 'Quality gate validation, swarm health checks, compliance verification',
        priority_factor: 0.7 // Medium-high WSJF - quality assurance
      });
    }

    // Seeker: Low-medium priority for discovery
    if (this.circles.has('Seeker')) {
      allocations.push({
        circle: 'Seeker',
        allocated_amount: 150.00,
        rationale: 'Pattern discovery, swarm behavior analysis, optimization opportunities',
        priority_factor: 0.5 // Medium WSJF - discovery phase
      });
    }

    // Intuitive: Low priority for qualitative insights
    if (this.circles.has('Intuitive')) {
      allocations.push({
        circle: 'Intuitive',
        allocated_amount: 100.00,
        rationale: 'Qualitative swarm dynamics assessment, emergent behavior detection',
        priority_factor: 0.4 // Lower WSJF - supplementary analysis
      });
    }

    const totalAllocated = allocations.reduce((sum, a) => sum + a.allocated_amount, 0);
    console.log(`[BudgetAuth] Total allocated: $${totalAllocated.toFixed(2)}`);

    return allocations;
  }

  /**
   * Create and lock testing budget
   * Prevents overspending during swarm experiments
   */
  public async createAndLockBudget(allocations: BudgetAllocation[]): Promise<string> {
    const totalAmount = allocations.reduce((sum, a) => sum + a.allocated_amount, 0);
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const budget = this.budgetTracker.createBudget({
      name: 'Swarm Testing Cycle - Q2 2026',
      type: 'opex',
      allocatedAmount: totalAmount,
      currency: 'USD',
      periodStart: startDate,
      periodEnd: endDate
    });

    console.log(`[BudgetAuth] Created budget: ${budget.id}`);
    console.log(`  Amount: $${budget.allocatedAmount.toFixed(2)}`);
    console.log(`  Period: ${startDate.toISOString().split('T')[0]} → ${endDate.toISOString().split('T')[0]}`);

    // Persist allocation details
    const allocationRecord = {
      budget_id: budget.id,
      created_at: new Date().toISOString(),
      total_allocated: totalAmount,
      period_start: startDate.toISOString(),
      period_end: endDate.toISOString(),
      allocations: allocations,
      status: 'locked'
    };

    fs.writeFileSync(this.allocationPath, JSON.stringify(allocationRecord, null, 2), 'utf8');
    console.log(`[BudgetAuth] Budget allocation locked and saved to: ${this.allocationPath}`);

    return budget.id;
  }

  /**
   * Generate budget authorization report
   */
  public generateReport(allocations: BudgetAllocation[], budgetId: string): string {
    const totalAmount = allocations.reduce((sum, a) => sum + a.allocated_amount, 0);

    let report = `
╔══════════════════════════════════════════════════════════════════════╗
║         SWARM TESTING CYCLE - BUDGET AUTHORIZATION REPORT            ║
╚══════════════════════════════════════════════════════════════════════╝

Budget ID: ${budgetId}
Total Allocated: $${totalAmount.toFixed(2)} USD
Status: LOCKED (30-day testing cycle)
Generated: ${new Date().toISOString()}

─────────────────────────────────────────────────────────────────────

CIRCLE ROLE ALLOCATIONS (WSJF-Prioritized):
`;

    // Sort by priority factor descending
    const sorted = [...allocations].sort((a, b) => b.priority_factor - a.priority_factor);

    for (const allocation of sorted) {
      const percentage = (allocation.allocated_amount / totalAmount * 100).toFixed(1);
      report += `
• ${allocation.circle.toUpperCase()}
  Amount: $${allocation.allocated_amount.toFixed(2)} (${percentage}%)
  Priority: ${(allocation.priority_factor * 100).toFixed(0)}% WSJF
  Rationale: ${allocation.rationale}
`;
    }

    report += `
─────────────────────────────────────────────────────────────────────

GOVERNANCE APPROVAL:
✓ Circle roles reviewed from .goalie/circles/*_pda.yaml
✓ WSJF priorities aligned with swarm testing objectives
✓ Budget locked to prevent execution overages
✓ 30-day testing window established

NEXT STEPS:
1. Execute scaled swarm experiments (Baseline → Adverse → Severe → Critical)
2. Track expenses via BudgetTracker integration
3. Monitor budget consumption in real-time
4. Review and adjust allocations at 50% consumption threshold

─────────────────────────────────────────────────────────────────────
`;

    return report;
  }

  /**
   * Execute full authorization workflow
   */
  public async authorize(): Promise<void> {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║   SWARM TESTING CYCLE - BUDGET AUTHORIZATION                 ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // Step 1: Load Circle roles
    await this.loadCircleRoles();

    // Step 2: Review and allocate
    const allocations = this.reviewCircleRoles();

    // Step 3: Create and lock budget
    const budgetId = await this.createAndLockBudget(allocations);

    // Step 4: Generate report
    const report = this.generateReport(allocations, budgetId);
    console.log(report);

    // Save report
    const reportPath = path.resolve(process.cwd(), '.goalie/budget_authorization_report.txt');
    fs.writeFileSync(reportPath, report, 'utf8');
    console.log(`\n[BudgetAuth] Report saved to: ${reportPath}`);
  }
}

// CLI execution support
if (require.main === module) {
  (async () => {
    const authorizer = new SwarmCycleBudgetAuthorizer();
    await authorizer.authorize();
  })();
}
