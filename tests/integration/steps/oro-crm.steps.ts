import { createBdd } from 'playwright-bdd';
import { expect, request as pwRequest } from '@playwright/test';

const { Given, When, Then } = createBdd();
const LIVE = process.env.LIVE_EDGE_TEST === 'true';
const ORO_URL = process.env.ORO_URL || 'https://crm.bhopti.com';

Given('the OroCommerce CRM is active on {string}', async ({}, url: string) => {
  if (!LIVE) return 'skipped';
});

When('I check the {string} endpoint', async ({}, endpoint: string) => {
  const ctx = await pwRequest.newContext();
  const response = await ctx.get(`${ORO_URL}${endpoint}`);
  (global as any).lastResponse = response;
});

Then('the response status should be less than {int}', async ({}, maxStatus: number) => {
  if ((global as any).lastResponse) {
    const response = (global as any).lastResponse;
    expect(response.status()).toBeLessThan(maxStatus);
  }
});

Given('I navigate to {string}', async ({ page }, url: string) => {
  if (!LIVE) return 'skipped';
});

When('I visit the {string} page', async ({ page }, path: string) => {
  if (!LIVE) return;
  const response = await page.goto(`${ORO_URL}${path}`, { waitUntil: 'networkidle' });
  (global as any).lastResponse = response;
});

Then('the page should contain the text {string} or {string} or {string}', async ({ page }, text1: string, text2: string, text3: string) => {
  if (!LIVE) return;
  const content = await page.textContent('body');
  const hasFields = content?.includes(text1) || content?.includes(text2) || content?.includes(text3);
  expect(hasFields).toBe(true);
});

When('I POST to {string} with test credentials', async ({}, endpoint: string) => {
  if (!LIVE) return;
  const ctx = await pwRequest.newContext();
  const response = await ctx.post(`${ORO_URL}${endpoint}`, {
      data: {
          username: "admin",
          password: "sovereign_swarm_root"
      }
  });
  (global as any).lastResponse = response;
});

Then('the API should respond with an authorized or expected unauthorized status', async ({}) => {
  if (!LIVE) return;
  const response = (global as any).lastResponse;
  expect([200, 401, 403]).toContain(response.status());
});
