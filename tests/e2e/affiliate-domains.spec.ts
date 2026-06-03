import { test, expect } from '@playwright/test';

// The 19 Primary Domains (HTML Landing Pages)
const PRIMARY_DOMAINS = [
  '720.chat', 'amp.vote', 'artchat.art', 'chatfans.fans',
  'decisioncall.com', 'eneu.org', 'epic.cab', 'goodreadr.com',
  'iconoclash.dev', 'mbo.bio', 'nextwavenetwork.com',
  'quoteparty.com', 'splitcite.com', 'summerjobswap.com',
  'yo.life', 'yoservice.com'
];

// The 5 Redirect Domains (cPanel Subdomain Routing)
const REDIRECT_DOMAINS = [
  'tag.ooo', 'rooz.live', 'o-gov.com', 'masslessmassive.com', 'eudmusic.com'
];

// Test parameters
const TEST_REF = 'ci_test_runner';
const WHOP_CHECKOUT_PATTERN = /whop\.com\/checkout/;

test.describe('Agentic Ecosystem Affiliate Validation Suite', () => {
  // removed ignoreHTTPSErrors to enforce strict structural sovereignty

  // Test Primary Domains
  for (const domain of PRIMARY_DOMAINS) {
    test(`[Primary] ${domain} - parameter survival and checkout popup`, async ({ page }) => {
      const url = `https://${domain}/?ref=${TEST_REF}`;
      
      // Listen for severe console errors to ensure layout stability
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      // 1. Navigate and ensure ?ref= survives any HTTPS or www redirects
      const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
      
      // Allow for successful load
      expect(response?.status()).toBeLessThan(400);

      // Check parameter survival in the final URL
      const currentUrl = new URL(page.url());
      expect(currentUrl.searchParams.get('ref'), `Affiliate parameter dropped on ${domain}`).toBe(TEST_REF);

      // UPGRADED CAPABILITY: Hard Failure on missing monetization endpoints. We must wait for React to hydrate.
      const checkoutLocator = page.locator('a[onclick*="whop_checkout"], a[onclick*="oc("], a[href*="whop.com/checkout"], a[href*="whop.com/"]');
      await checkoutLocator.first().waitFor({ state: 'attached', timeout: 15000 });
      const checkoutCount = await checkoutLocator.count();
      expect(checkoutCount, `CRITICAL: No Whop checkout endpoints found on ${domain}. This domain is unmonetized!`).toBeGreaterThan(0);
      
      // 3. Validate console cleanliness
      expect(consoleErrors.length, `Domain ${domain} threw JS console errors: ${consoleErrors.join(', ')}`).toBe(0);
    });
  }

  // Test Redirect Domains
  for (const domain of REDIRECT_DOMAINS) {
    test(`[Redirect] ${domain} - parameter survival across cPanel route`, async ({ page }) => {
      // These domains redirect to other destinations. We test that the 'ref' survives the hop.
      const url = `https://${domain}/?ref=${TEST_REF}`;
      
      // Navigate and wait for the redirect chain to settle
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      
      // The final URL could be anything (another domain), but the parameter MUST survive
      const finalUrl = new URL(page.url());
      
      expect(
        finalUrl.searchParams.get('ref') === TEST_REF || 
        finalUrl.searchParams.get('via') === TEST_REF
      ).toBeTruthy();
    });
  }

});
