#!/usr/bin/env ts-node

/**
 * ay-authorize-budget.ts
 *
 * Circle Role: Orchestrator / Testing Circle
 * Phase: Review / Retro & Pre-Flight Execution Gate
 *
 * Purpose: Formally allocates a testing OPEX budget using the budget_tracking module.
 * Evaluates baseline and adverse/severe/critical scenarios to project cost.
 * Implements the "Unleash or Releash" decision gate before triggering the
 * underlying swarm experiment script. Closes the loop on Build, Measure, Learn, CI/CD.
 */

import { BudgetTracker } from "../src/integrations/budget_tracking";
import { spawn } from "child_process";
import * as path from "path";

// ============================================================================
// Configuration & Limits
// ============================================================================

const CIRCLE_ROLE = "testing_circle";
const INITIATIVE = "Swarm Baseline & Adverse Scenario Experiment";

// Economic Bounds
const OPEX_ALLOCATION_LIMIT = 50.0; // Total approved USD budget for this CI run
const COST_PER_ITERATION = 0.05; // Estimated API/Compute cost per agent iteration in USD

// Swarm Run definitions (corresponds to run_swarm_experiment.sh matrix)
const SCENARIOS = {
  baseline: 5,
  adverse: 25,
  severe: 50,
  critical: 100,
  extreme: 250,
};

// ============================================================================
// Execution Logic
// ============================================================================

async function triggerSwarmExperiment(): Promise<void> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(__dirname, "../run_swarm_experiment.sh");
    console.log(`\n[EXEC] Spawning swarm experiment process: ${scriptPath}`);

    const child = spawn("bash", [scriptPath], { stdio: "inherit" });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Swarm experiment failed with exit code ${code}`));
      }
    });

    child.on("error", (err) => {
      reject(new Error(`Failed to start swarm process: ${err.message}`));
    });
  });
}

async function authorizeAndExecute() {
  console.log(
    `\n================================================================`,
  );
  console.log(`🛡️  Circle Role Review/Retro: ${CIRCLE_ROLE}`);
  console.log(
    `================================================================`,
  );

  // 1. Initialize DB Tracker
  const tracker = new BudgetTracker();

  // 2. Establish OPEX Budget Segment
  const today = new Date();
  const nextMonth = new Date();
  nextMonth.setMonth(today.getMonth() + 1);

  const budgetName = `Swarm_Testing_OpEx_${today.getFullYear()}_${today.getMonth() + 1}`;

  const budget = tracker.createBudget({
    name: budgetName,
    type: "opex",
    currency: "USD",
    allocatedAmount: OPEX_ALLOCATION_LIMIT,
    periodStart: today,
    periodEnd: nextMonth,
  });

  console.log(
    `[BUDGET] Allocated: $${budget.allocatedAmount.toFixed(2)} ${budget.currency} for '${budget.name}'`,
  );

  // 3. Scenario Evaluation & Projection
  // Calculate total iterations from the target swarm script (5+25+50+100+250 = 430)
  const totalIterations = Object.values(SCENARIOS).reduce(
    (sum, val) => sum + val,
    0,
  );
  const projectedCost = totalIterations * COST_PER_ITERATION;

  console.log(
    `[SCENARIO] Evaluating limits for Matrix: [Baseline, Adverse, Severe, Critical, Extreme]`,
  );
  console.log(`[SCENARIO] Projected Iterations: ${totalIterations}`);
  console.log(
    `[SCENARIO] Projected OpEx Cost: $${projectedCost.toFixed(2)} USD`,
  );

  // 4. UNLEASH OR RELEASH Gate
  if (projectedCost > budget.allocatedAmount) {
    console.error(
      `\n[AUTHORIZATION] 🛑 RELEASH: Projected cost ($${projectedCost.toFixed(2)}) exceeds allocated OpEx budget ($${budget.allocatedAmount.toFixed(2)}).`,
    );
    console.error(
      `[AUTHORIZATION] Execution Denied. Reduce swarm iterations or request budget augmentation in Standup.`,
    );
    process.exit(1);
  }

  console.log(
    `[AUTHORIZATION] ✅ UNLEASH: OpEx budget validated. Authorization granted.`,
  );

  // 5. Record the Authorized Expense
  const expense = tracker.recordExpense({
    type: "opex",
    category: "api",
    description: INITIATIVE,
    amount: projectedCost,
    currency: "USD",
    vendor: "Swarm_LLM_Mesh",
    metadata: {
      totalIterations,
      scenarios: Object.keys(SCENARIOS),
      authorizedBy: CIRCLE_ROLE,
    },
  });

  tracker.updateBudgetSpent(budget.id, projectedCost);

  console.log(`[BUDGET] Ledger updated. Expense ID: ${expense.id}`);
  console.log(
    `[BUDGET] Remaining CI/CD OPEX Budget: $${(budget.allocatedAmount - projectedCost).toFixed(2)}`,
  );

  // 6. Build, Measure, Learn
  try {
    console.log(`\n🚀 Initiating Build, Measure, Learn cycle...`);
    await triggerSwarmExperiment();

    console.log(`\n📈 [MEASURE/LEARN] Swarm experimentation cycle complete.`);
    console.log(
      `Integrate telemetry outputs back to CI/CD PI-Sync ledger to finalize WSJF validation.`,
    );
  } catch (error: any) {
    console.error(`\n❌ [ERROR] Swarm execution failed: ${error.message}`);
    console.error(
      `[ROLLBACK] Note: Budget burn rate must be manually audited based on failure point.`,
    );
    process.exit(1);
  }
}

// Execute the standalone script
authorizeAndExecute().catch((error) => {
  console.error(`[FATAL] Unhandled exception in authorization gate:`, error);
  process.exit(1);
});
