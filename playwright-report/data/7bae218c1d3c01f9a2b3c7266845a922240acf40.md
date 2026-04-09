# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: analytics-tld.contract.spec.ts >> analytics.interface.tag.ooo production contract >> main advocacy dashboard renders
- Location: tests/e2e/analytics-tld.contract.spec.ts:4:7

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h1').first()
Expected pattern: /dashboard|agentic|wsjf|advocacy/i
Received string:  "rooz.live"
Timeout: 5000ms

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('h1').first()
    9 × locator resolved to <h1 data-text-variant="heading-xl/semibold" class="heading-xl/semibold_cf4812 defaultColor__5345c title__921c5 title_fa285e">rooz.live</h1>
      - unexpected value "rooz.live"

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - img
  - img
  - generic [ref=e10]:
    - generic [ref=e11]:
      - img [ref=e12]
      - generic [ref=e15]: speedlike invited you to join
      - heading "rooz.live" [level=1] [ref=e16]
      - generic [ref=e19]:
        - generic [ref=e22]: 4 Online
        - generic [ref=e25]: 8 Members
    - button "Open App" [ref=e27] [cursor=pointer]:
      - generic [ref=e30]: Open App
    - button "Continue in Browser" [ref=e32] [cursor=pointer]:
      - generic [ref=e35]: Continue in Browser
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('analytics.interface.tag.ooo production contract', () => {
  4  |   test('main advocacy dashboard renders', async ({ page }) => {
  5  |     await page.goto('/');
  6  |     await page.waitForLoadState('domcontentloaded');
  7  | 
  8  |     const heading = page.locator('h1').first();
  9  |     await expect(heading).toBeVisible();
> 10 |     await expect(heading).toContainText(/dashboard|agentic|wsjf|advocacy/i);
     |                           ^ Error: expect(locator).toContainText(expected) failed
  11 | 
  12 |     const bodyText = await page.locator('body').textContent();
  13 |     expect((bodyText || '').length).toBeGreaterThan(100);
  14 |   });
  15 | 
  16 |   test('trading dashboard renders SOXL/SOXS content', async ({ page }) => {
  17 |     const consoleErrors: string[] = [];
  18 |     page.on('console', (msg) => {
  19 |       if (msg.type() === 'error') {
  20 |         consoleErrors.push(msg.text());
  21 |       }
  22 |     });
  23 | 
  24 |     await page.goto('/trading');
  25 |     await page.waitForLoadState('networkidle');
  26 | 
  27 |     const heading = page.locator('h1').first();
  28 |     await expect(heading).toBeVisible();
  29 |     await expect(heading).toContainText(/trading/i);
  30 | 
  31 |     const text = await page.locator('body').textContent();
  32 |     expect(text || '').toContain('SOXL');
  33 |     expect(text || '').toContain('SOXS');
  34 |     expect(consoleErrors).toHaveLength(0);
  35 |   });
  36 | 
  37 |   test('/api/trading returns contract-compliant JSON', async ({ request, baseURL }) => {
  38 |     const response = await request.get(`${baseURL}/api/trading?hours=72`);
  39 |     expect(response.ok()).toBeTruthy();
  40 | 
  41 |     const json = await response.json();
  42 |     expect(Array.isArray(json.events)).toBeTruthy();
  43 |     expect(typeof json.count).toBe('number');
  44 |     expect(json.filters).toBeTruthy();
  45 |     expect(json.status).toBe('ok');
  46 |   });
  47 | 
  48 |   test('/api/health returns healthy status', async ({ request, baseURL }) => {
  49 |     const response = await request.get(`${baseURL}/api/health`);
  50 |     expect(response.ok()).toBeTruthy();
  51 | 
  52 |     const json = await response.json();
  53 |     expect(json.status).toBe('healthy');
  54 |     expect(json.timestamp).toBeTruthy();
  55 |   });
  56 | });
  57 | 
```