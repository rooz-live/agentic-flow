import { test, expect } from '@playwright/test';

test.describe('Ay Dashboard - GUI Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display dimensional health metrics', async ({ page }) => {
    // Check for dimensional health visualization
    await expect(page.locator('[data-testid="dimensional-health"]')).toBeVisible();
    
    // Verify all dimensions are present
    const dimensions = ['temporal', 'goal', 'barrier', 'mindset', 'cockpit', 'psychological', 'event'];
    for (const dim of dimensions) {
      await expect(page.locator(`[data-dimension="${dim}"]`)).toBeVisible();
    }
  });

  test('should show WSJF-prioritized action items', async ({ page }) => {
    await page.click('[data-testid="wsjf-actions"]');
    
    // Verify action items are sorted by WSJF score
    const scores = await page.locator('[data-testid="wsjf-score"]').allTextContents();
    const numericScores = scores.map(s => parseFloat(s));
    
    // Check descending order
    for (let i = 0; i < numericScores.length - 1; i++) {
      expect(numericScores[i]).toBeGreaterThanOrEqual(numericScores[i + 1]);
    }
  });

  test('should display ROAM status tracker', async ({ page }) => {
    await expect(page.locator('[data-testid="roam-tracker"]')).toBeVisible();
    
    // Check ROAM categories
    await expect(page.locator('[data-roam="resolved"]')).toBeVisible();
    await expect(page.locator('[data-roam="owned"]')).toBeVisible();
    await expect(page.locator('[data-roam="accepted"]')).toBeVisible();
    await expect(page.locator('[data-roam="mitigated"]')).toBeVisible();
  });

  test('should update infrastructure health in real-time', async ({ page }) => {
    const healthIndicator = page.locator('[data-testid="infrastructure-health"]');
    await expect(healthIndicator).toBeVisible();
    
    // Check initial state
    const initialStatus = await healthIndicator.getAttribute('data-status');
    expect(['up', 'down', 'degraded']).toContain(initialStatus);
    
    // Verify SSH connectivity status
    await expect(page.locator('[data-testid="ssh-connectivity"]')).toBeVisible();
  });

  test('should render circle status with completion percentages', async ({ page }) => {
    const circles = ['analyst', 'assessor', 'innovator', 'intuitive', 'orchestrator', 'seeker', 'system'];
    
    for (const circle of circles) {
      const circleElement = page.locator(`[data-circle="${circle}"]`);
      await expect(circleElement).toBeVisible();
      
      // Check completion percentage
      const completion = await circleElement.locator('[data-testid="completion"]').textContent();
      expect(completion).toMatch(/\d+\.?\d*%/);
    }
  });

  test('should navigate between phases (A→B→C→D)', async ({ page }) => {
    const phases = ['A', 'B', 'C', 'D'];
    
    for (const phase of phases) {
      await page.click(`[data-phase="${phase}"]`);
      await expect(page.locator(`[data-testid="phase-${phase}-content"]`)).toBeVisible();
      
      // Verify phase metrics
      await expect(page.locator(`[data-testid="phase-${phase}-overall"]`)).toBeVisible();
      await expect(page.locator(`[data-testid="phase-${phase}-critical-path"]`)).toBeVisible();
    }
  });

  test('should execute recommended actions', async ({ page }) => {
    // Click on highest WSJF action
    await page.click('[data-testid="action-item"]:first-child [data-testid="execute-action"]');
    
    // Verify action execution modal or confirmation
    await expect(page.locator('[data-testid="action-confirmation"]')).toBeVisible();
    
    // Check for command display
    await expect(page.locator('[data-testid="action-command"]')).toContainText('./scripts/');
  });

  test('should display recent activity timeline', async ({ page }) => {
    await expect(page.locator('[data-testid="activity-timeline"]')).toBeVisible();
    
    // Verify activity items have timestamps
    const activities = page.locator('[data-testid="activity-item"]');
    const count = await activities.count();
    expect(count).toBeGreaterThan(0);
    
    // Check first activity has timestamp
    await expect(activities.first().locator('[data-testid="activity-timestamp"]')).toBeVisible();
  });
});

test.describe('3D Visualizations - Three.js/Babylon.js', () => {
  test('should render 3D scene for dimensional health', async ({ page }) => {
    await page.goto('/visualizations/3d');
    
    // Wait for WebGL context
    await page.waitForFunction(() => {
      const canvas = document.querySelector('canvas');
      return canvas && canvas.getContext('webgl') !== null;
    });
    
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    
    // Verify canvas dimensions
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });

  test('should interact with 3D graph nodes', async ({ page }) => {
    await page.goto('/visualizations/3d');
    await page.waitForSelector('canvas');
    
    // Click on canvas to interact with nodes
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 100, y: 100 } });
    
    // Verify node selection UI
    await expect(page.locator('[data-testid="node-info"]')).toBeVisible({ timeout: 5000 });
  });

  test('should toggle between visualization modes', async ({ page }) => {
    await page.goto('/visualizations/3d');
    
    const modes = ['graph', 'hierarchy', 'flow'];
    for (const mode of modes) {
      await page.click(`[data-viz-mode="${mode}"]`);
      await page.waitForTimeout(500); // Allow animation
      
      // Verify mode is active
      await expect(page.locator(`[data-viz-mode="${mode}"]`)).toHaveClass(/active/);
    }
  });
});

test.describe('MYM Alignment Scoring', () => {
  test('should display Manthra/Yasna/Mithra scores', async ({ page }) => {
    await page.goto('/calibration');
    
    const mymComponents = ['manthra', 'yasna', 'mithra'];
    for (const component of mymComponents) {
      await expect(page.locator(`[data-mym="${component}"]`)).toBeVisible();
      
      // Verify score is displayed
      const score = await page.locator(`[data-mym="${component}"] [data-testid="score"]`).textContent();
      expect(parseFloat(score || '0')).toBeGreaterThanOrEqual(0);
      expect(parseFloat(score || '0')).toBeLessThanOrEqual(100);
    }
  });

  test('should show alignment coherence metrics', async ({ page }) => {
    await page.goto('/calibration/coherence');
    
    await expect(page.locator('[data-testid="cross-dimensional-coherence"]')).toBeVisible();
    await expect(page.locator('[data-testid="alignment-score"]')).toBeVisible();
  });
});

test.describe('Performance & Responsiveness', () => {
  test('should load dashboard within 3 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(3000);
  });

  test('should handle 1000+ data points smoothly', async ({ page }) => {
    await page.goto('/visualizations/performance-test');
    
    // Measure FPS during heavy rendering
    const fps = await page.evaluate(async () => {
      return new Promise<number>((resolve) => {
        let frames = 0;
        const start = performance.now();
        
        function countFrame() {
          frames++;
          if (performance.now() - start < 1000) {
            requestAnimationFrame(countFrame);
          } else {
            resolve(frames);
          }
        }
        requestAnimationFrame(countFrame);
      });
    });
    
    expect(fps).toBeGreaterThan(30); // Minimum 30 FPS
  });
});
