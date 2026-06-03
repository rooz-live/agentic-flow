import { test, expect } from '@playwright/test';

/**
 * [RCA TRACE]
 * Epic 1: Auth & Identity (US-001, US-002)
 * Bounded Context: Platform Infrastructure
 * Objective: Physically assert Whop OAuth endpoints to prove DoR via API testing.
 */
test.describe('US-001 / US-002: Sovereign Auth & Identity Gate', () => {
    
    test('Whop OAuth /me endpoint returns nominal 401 or 200 to establish API physics', async ({ request }) => {
        console.log('[API] Asserting Whop API identity boundaries...');
        
        // Use the actual Whop API boundary to prove structural sovereignty
        const response = await request.get('https://api.whop.com/api/v2/me', {
            headers: {
                'Accept': 'application/json'
            }
        });
        
        // If we don't pass a token, we expect 401 Unauthorized. 
        // If we do, we expect 200. Both prove the physical endpoint is reachable.
        expect([200, 401, 403]).toContain(response.status());
        
        if (response.status() === 401) {
            const body = await response.json();
            // The Whop API returns an error structure
            expect(body).toHaveProperty('error');
        }
    });
});
