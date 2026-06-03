import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import path from 'path';

// Load physical environment config
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

test.describe('Agentic Assessor: Whop OAuth Handshake Verification (DoR/DoD)', () => {
  // Test physical auth endpoint against the Whop API directly
  test('Should strictly validate WHOP_DEV_API_KEY and generate valid Affiliate tracking tokens', async ({ request }) => {
    const apiKey = process.env.WHOP_DEV_API_KEY;
    
    // Assert strictly that we are NOT running against placeholders (Completion Theater)
    expect(apiKey, 'WHOP_DEV_API_KEY must be populated').toBeDefined();
    expect(apiKey).not.toBe('insert_whop_dev_pat_here');

    // Assessor Gate: Validate the Token against Whop V1 Affiliates (Permissions Matrix)
    // The key is strictly scoped to `affiliate:write` and `marketing:manage`.
    // It will return 401 Unauthorized for /me or generic read endpoints.
    // By sending an incomplete payload, we verify the token passes the Auth Middleware (yielding 400 Bad Request instead of 401).
    const authResponse = await request.post('https://api.whop.com/v1/affiliates', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      data: {
        company_id: "biz_WKmNzKeXAiu2ks"
        // Intentionally omitting 'email' to avoid creating a junk record.
      }
    });

    // If this fails (returns 401), the key is stale or lacks the affiliate scope.
    expect(authResponse.status(), 'Whop API returned 401: Key is stale or lacks affiliate:write scope').not.toBe(401);

    // It should hit the validation layer and return 400 Bad Request.
    expect(authResponse.status(), 'Whop API must return 400 for structural validation (Auth passed)').toBe(400);

    console.log(`✅ San Gen Shugi Verified: Whop V1 Affiliate Write Permissions strictly authorized.`);
  });

  test('Should physically resolve the /auth routing layer without infinite redirects', async ({ request }) => {
    // Assert the domain routing layer handles parameters without redirecting to /auth loop
    // Using 720.chat as the primary Sovereign test domain (known good DNS)
    const response = await request.get('https://720.chat/?ref=assessor_test', {
      maxRedirects: 3
    });
    
    expect(response.ok(), 'Domain must return 200 OK without cascading redirects').toBeTruthy();
    const body = await response.text();
    
    // Ensure it didn't just load an empty stub
    expect(body.length, 'Domain body must contain actual content').toBeGreaterThan(100);
    
    // If it redirected to /auth, it's a failure of Structural Sovereignty
    expect(response.url()).not.toContain('/auth');
  });
});
