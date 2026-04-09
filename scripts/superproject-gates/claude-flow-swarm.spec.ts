import { test, expect } from '@playwright/test';

test.describe('Claude Flow Swarm - Hierarchical Mesh', () => {
  test('should initialize swarm with correct topology', async ({ page }) => {
    await page.goto('/claude-flow/swarm');
    
    // Verify swarm status
    await expect(page.locator('[data-testid="swarm-status"]')).toContainText('Active');
    await expect(page.locator('[data-testid="topology"]')).toContainText('hierarchical-mesh');
    await expect(page.locator('[data-testid="max-agents"]')).toContainText('8');
  });

  test('should display agent coordination hierarchy', async ({ page }) => {
    await page.goto('/claude-flow/swarm');
    
    // Check for queen agent
    await expect(page.locator('[data-agent-role="queen"]')).toBeVisible();
    
    // Check for worker agents
    const workers = page.locator('[data-agent-role="worker"]');
    const count = await workers.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(8);
  });

  test('should spawn and manage agents', async ({ page }) => {
    await page.goto('/claude-flow/swarm');
    
    // Spawn a coder agent
    await page.click('[data-testid="spawn-agent"]');
    await page.selectOption('[data-testid="agent-type"]', 'coder');
    await page.fill('[data-testid="agent-name"]', 'test-coder');
    await page.click('[data-testid="confirm-spawn"]');
    
    // Verify agent appears
    await expect(page.locator('[data-agent-name="test-coder"]')).toBeVisible({ timeout: 10000 });
  });

  test('should show HNSW memory search performance', async ({ page }) => {
    await page.goto('/claude-flow/memory');
    
    // Store a pattern
    await page.fill('[data-testid="pattern-key"]', 'test-pattern');
    await page.fill('[data-testid="pattern-value"]', 'JWT authentication');
    await page.click('[data-testid="store-pattern"]');
    
    // Search for pattern
    await page.fill('[data-testid="search-query"]', 'authentication');
    await page.click('[data-testid="search-button"]');
    
    // Verify results and performance metric
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    const performanceMetric = await page.locator('[data-testid="search-time"]').textContent();
    expect(performanceMetric).toMatch(/\d+ms/);
  });

  test('should display neural learning metrics', async ({ page }) => {
    await page.goto('/claude-flow/neural');
    
    await expect(page.locator('[data-testid="sona-learning"]')).toBeVisible();
    await expect(page.locator('[data-testid="learning-enabled"]')).toContainText('true');
    await expect(page.locator('[data-testid="auto-train"]')).toContainText('true');
  });

  test('should run security scans', async ({ page }) => {
    await page.goto('/claude-flow/security');
    
    await page.click('[data-testid="run-security-scan"]');
    
    // Wait for scan completion
    await expect(page.locator('[data-testid="scan-status"]')).toContainText('Complete', { timeout: 30000 });
    
    // Verify security score
    const score = await page.locator('[data-testid="security-score"]').textContent();
    expect(parseFloat(score || '0')).toBeGreaterThanOrEqual(0);
    expect(parseFloat(score || '0')).toBeLessThanOrEqual(100);
  });

  test('should show background daemon workers', async ({ page }) => {
    await page.goto('/claude-flow/daemon');
    
    const expectedWorkers = [
      'map', 'audit', 'optimize', 'consolidate',
      'testgaps', 'ultralearn', 'deepdive',
      'document', 'refactor', 'benchmark'
    ];
    
    for (const worker of expectedWorkers) {
      await expect(page.locator(`[data-worker="${worker}"]`)).toBeVisible();
    }
  });

  test('should display session persistence', async ({ page }) => {
    await page.goto('/claude-flow/sessions');
    
    // Create a test session
    await page.click('[data-testid="new-session"]');
    await page.fill('[data-testid="session-name"]', 'test-session');
    await page.click('[data-testid="save-session"]');
    
    // Verify session appears in list
    await expect(page.locator('[data-session-name="test-session"]')).toBeVisible();
    
    // Test session restore
    await page.click('[data-testid="restore-session"]');
    await expect(page.locator('[data-testid="session-restored"]')).toBeVisible();
  });
});

test.describe('Agent Booster & Token Optimization', () => {
  test('should show token usage reduction', async ({ page }) => {
    await page.goto('/claude-flow/optimization');
    
    await expect(page.locator('[data-testid="token-savings"]')).toBeVisible();
    
    // Verify compression metrics
    const savings = await page.locator('[data-testid="compression-rate"]').textContent();
    expect(savings).toMatch(/\d+%/);
  });

  test('should demonstrate WASM AST analysis', async ({ page }) => {
    await page.goto('/claude-flow/booster');
    
    await expect(page.locator('[data-testid="wasm-enabled"]')).toContainText('true');
    
    // Test simple edit bypass
    const responseTime = await page.locator('[data-testid="bypass-time"]').textContent();
    expect(responseTime).toMatch(/<1ms/);
  });
});
