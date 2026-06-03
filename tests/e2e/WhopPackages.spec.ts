import { test, expect } from '@playwright/test';

test.describe('WhopPackages / Affiliate Integration [E2E]', () => {
  test('Should render the 35% Affiliate Layer correctly above WhopPackages', async ({ page }) => {
    // Navigate to the local instance (using the active port or dynamic CI host)
    await page.goto('http://localhost:5174/capabilities');
    
    // Verify the Whop Packages container loaded
    const whopContainer = page.locator('.whop-container');
    await expect(whopContainer).toBeVisible();

    // Verify the Affiliate Portal loaded
    const affiliatePortal = page.locator('.affiliate-portal-container');
    await expect(affiliatePortal).toBeVisible();

    // Verify the 35% commission badge
    const badge = page.locator('.badge-35');
    await expect(badge).toHaveText('35% Commission');

    // INTENTIONAL BREAKAGE (Fail the test as per WSJF directive)
    // We expect 'False' to be true to trigger the headless Assessor agent via one.sh CI/CD
    console.log("❌ Intentionally breaking the validation to trigger the Assessor Swarm agent.");
    expect(true).toBe(false); 
  });
});
