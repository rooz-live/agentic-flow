import { test, expect } from '@playwright/test';

/**
 * [RCA TRACE]
 * Epic 12: Subaltern Governance Module
 * TDD Phase: RED -> GREEN VALIDATION
 * Objective: Verify the topological routing boundary between the core Institution and the Subaltern Swarm.
 */
test.describe('Epic 12: Subaltern Governance Routing', () => {
    
    test('UI physically partitions Institutional (o-gov.com) and Swarm (subaltern.o-gov.com) network routing', async ({ page }) => {
        try {
            await page.goto('http://localhost:5173', { timeout: 3000 });
        } catch (e) {}
        
        // 1. Locate the physical boundary constraint
        const govModule = page.locator('#subaltern-gov-module');
        await expect(govModule).toBeVisible({ timeout: 2000 });
        
        // 2. Ensure both hierarchical domains exist as isolated nodes
        const instNode = govModule.locator('.gov-node-primary');
        const swarmNode = govModule.locator('.gov-node-subaltern');
        
        await expect(instNode).toBeVisible();
        await expect(swarmNode).toBeVisible();
        
        // 3. Test active proxy state mutations
        await expect(govModule.locator('text=ACTIVE ROUTING PROXY:')).toBeVisible();
        
        // Click to toggle Institution strict enforcement
        await instNode.click();
        await expect(govModule.locator('text=O-GOV.COM / STRICT CONSTITUTIONAL ENFORCEMENT')).toBeVisible();
    });
});
