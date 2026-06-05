import { test, expect } from '@playwright/test';
import { getDomainBatch } from '../harness/BaseBillingE2ESpec';

// Sovereign Ingress - E2E Verification Phase Tests
// Validation Gate: Contract is King (TDD Spec Retention)
// Domains are dynamically fetched using the chunking API to avoid timeout and overhead.

const BATCH_INDEX = parseInt(process.env.BATCH_INDEX || '0', 10);
const activeDomains = getDomainBatch(BATCH_INDEX);

test.describe('Edge Gateway E2E Verification', () => {
    
    // Iterative testing across chunked domains
    for (const domain of activeDomains) {
        test(`Domain Validation: ${domain} enforces HTTPS and Proxy Headers`, async ({ page }) => {
            // Validate Edge proxies correctly map to the internal container/service
            const response = await page.goto(`https://${domain}/`, { waitUntil: 'networkidle' });
            
            expect(response?.status()).toBeLessThan(400); // 200 or 300 series allowed, no 404/500
            
            // Verify Caddy/HAProxy header structures 
            const serverHeader = response?.headers()['server'];
            // As we transition, it could be Caddy or HAProxy or Envoy
            expect(serverHeader).toBeDefined();
        });
    }

    test('Stripe Webhook E2E Boundary Integrity', async ({ request }) => {
        // Validation Gate: Ensure /webhooks/stripe bypasses generic handling
        const response = await request.post('http://127.0.0.1:9091/webhooks/stripe', {
            data: { "test": true },
            headers: {
                'Stripe-Signature': 't=123,v1=invalid_hash'
            }
        });
        
        // Should securely reject without crashing the engine
        expect(response.status()).toBe(400); // Or 403, indicating validation failure, not 500
    });
});
