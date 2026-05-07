import { createBudgetTracker } from '../src/integrations/budget_tracking';

// Circle Role Institution Review/Retro:
// Enforcing formal OPEX budget allocation limit before Unleash Phase

async function authorizeTestingBudget() {
  console.log("Initiating Formal Testing OPEX Budget Allocation...");
  const tracker = createBudgetTracker();

  // Create an approved testing OPEX budget
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const budget = tracker.createBudget({
    name: 'Swarm Increment BML Testing Budget (OPEX)',
    type: 'opex',
    allocatedAmount: 5000.00, // Explicitly allocate $5K for testing limits
    currency: 'USD',
    periodStart: new Date(),
    periodEnd: nextMonth
  });

  console.log(`Successfully Authorized Budget Ledger:`);
  console.log(`- ID: ${budget.id}`);
  console.log(`- Type: ${budget.type.toUpperCase()}`);
  console.log(`- Cap: $${budget.allocatedAmount} ${budget.currency}`);
  
  // Close DB connection cleanly
  tracker.close();
  console.log("Budget state committed to Git CI/CD truth ledger.");
}

authorizeTestingBudget().catch(err => {
  console.error("Failed to authorize budget:", err);
  process.exit(1);
});
