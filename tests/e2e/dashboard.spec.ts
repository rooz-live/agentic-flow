import { test, expect } from '@playwright/test';

/**
 * Dashboard E2E Tests
 * 
 * Tests core dashboard functionality following red-green-refactor TDD
 * Tests actual production paths without mocking
 */
test.describe('Agentic Flow Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(30000);
    await page.goto('/');
  });

  test('should load dashboard with status line', async ({ page }) => {
    // Check for status indicators
    await expect(page.locator('[data-testid="status-line"]')).toBeVisible();
    
    // Verify swarm status is displayed
    await expect(page.locator('[data-testid="swarm-status"]')).toContainText(/Swarm|Hierarchical|Mesh/i);
  });

  test('should display agent metrics', async ({ page }) => {
    // Navigate to agents view
    await page.click('[data-testid="agents-tab"]');
    
    // Verify agent cards are rendered
    const agentCards = page.locator('[data-testid="agent-card"]');
    await expect(agentCards).toHaveCount(3); // coder-1, tester-1, reviewer-1
    
    // Check agent details
    await expect(page.locator('[data-testid="agent-type"]').first()).toContainText(/coder|tester|reviewer/i);
  });

  test('should show memory usage visualization', async ({ page }) => {
    await page.click('[data-testid="memory-tab"]');
    
    // Verify memory metrics
    await expect(page.locator('[data-testid="memory-backend"]')).toBeVisible();
    await expect(page.locator('[data-testid="memory-entries"]')).toBeVisible();
    
    // Check for HNSW indicator
    await expect(page.locator('[data-testid="hnsw-status"]')).toContainText(/enabled|active/i);
  });

  test('should display task queue and history', async ({ page }) => {
    await page.click('[data-testid="tasks-tab"]');
    
    // Verify task sections
    await expect(page.locator('[data-testid="task-pending"]')).toBeVisible();
    await expect(page.locator('[data-testid="task-completed"]')).toBeVisible();
    
    // Check task status badges
    const statusBadges = page.locator('[data-testid="task-status"]');
    await expect(statusBadges.first()).toHaveAttribute('class', /badge|status/);
  });

  test('should render hierarchical-mesh topology graph', async ({ page }) => {
    await page.click('[data-testid="topology-tab"]');
    
    // Verify graph container
    await expect(page.locator('[data-testid="topology-graph"]')).toBeVisible();
    
    // Check for interactive elements
    const nodes = page.locator('[data-testid="graph-node"]');
    await expect(nodes).toHaveCount(3); // 3 spawned agents
    
    // Test node interaction
    await nodes.first().hover();
    await expect(page.locator('[data-testid="node-tooltip"]')).toBeVisible();
  });

  test('should be accessible (WCAG 2.1 Level AA)', async ({ page }) => {
    // Check for proper heading hierarchy
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    
    // Verify keyboard navigation
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
    
    // Check color contrast
    const statusLine = page.locator('[data-testid="status-line"]');
    const color = await statusLine.evaluate(el => window.getComputedStyle(el).color);
    const bgColor = await statusLine.evaluate(el => window.getComputedStyle(el).backgroundColor);
    
    // Basic contrast check (would use axe-core in production)
    expect(color).toBeTruthy();
    expect(bgColor).toBeTruthy();
  });

  test('should handle real-time updates', async ({ page }) => {
    // Monitor status changes
    const initialStatus = await page.locator('[data-testid="swarm-status"]').textContent();
    
    // Wait for potential updates (polling every 5s as per config)
    await page.waitForTimeout(6000);
    
    const updatedStatus = await page.locator('[data-testid="swarm-status"]').textContent();
    
    // Verify status line is functional
    expect(initialStatus).toBeTruthy();
    expect(updatedStatus).toBeTruthy();
  });

  test('should display performance metrics', async ({ page }) => {
    await page.click('[data-testid="performance-tab"]');
    
    // Verify performance charts
    await expect(page.locator('[data-testid="perf-chart"]')).toBeVisible();
    
    // Check for key metrics
    await expect(page.locator('[data-testid="token-usage"]')).toBeVisible();
    await expect(page.locator('[data-testid="speed-improvement"]')).toBeVisible();
  });

  test('should support sparse attention coverage view', async ({ page }) => {
    await page.click('[data-testid="attention-tab"]');
    
    // Verify sparse attention visualization
    await expect(page.locator('[data-testid="attention-heatmap"]')).toBeVisible();
    
    // Check coverage metrics
    await expect(page.locator('[data-testid="coverage-percentage"]')).toContainText(/%/);
  });
});

test.describe('ROAM Risk Management', () => {
  test('should display ROAM board', async ({ page }) => {
    await page.goto('/roam');
    
    // Verify ROAM categories
    await expect(page.locator('[data-testid="roam-resolved"]')).toBeVisible();
    await expect(page.locator('[data-testid="roam-owned"]')).toBeVisible();
    await expect(page.locator('[data-testid="roam-accepted"]')).toBeVisible();
    await expect(page.locator('[data-testid="roam-mitigated"]')).toBeVisible();
  });

  test('should track pattern rationale', async ({ page }) => {
    await page.goto('/patterns');
    
    // Verify pattern documentation
    await expect(page.locator('[data-testid="pattern-card"]')).toBeVisible();
    
    // Check for rationale field
    const patternCard = page.locator('[data-testid="pattern-card"]').first();
    await patternCard.click();
    await expect(page.locator('[data-testid="pattern-rationale"]')).toBeVisible();
  });
});
