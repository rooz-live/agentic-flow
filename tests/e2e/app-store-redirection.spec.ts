import { test, expect } from '@playwright/test';

test.describe('App Store Redirection - summerjobswap.com', () => {
  const domain = 'https://summerjobswap.com';
  const expectedIosUrl = 'https://apps.apple.com/app/id6446342880';
  const expectedAndroidUrl = 'https://play.google.com/store/apps/details?id=com.sovereign.summerjobswap';

  test('Page contains Apple Smart App Banner meta tag', async ({ page }) => {
    await page.goto(domain);
    const meta = page.locator('meta[name="apple-itunes-app"]');
    await expect(meta).toHaveAttribute('content', 'app-id=6446342880');
  });

  test('Hero section contains Download App button linking to /download', async ({ page }) => {
    await page.goto(domain);
    const btn = page.locator('#app-download-btn');
    await expect(btn).toBeVisible();
    await expect(btn).toHaveAttribute('href', '/download');
  });

  test('Footer contains App Store and Google Play links', async ({ page }) => {
    await page.goto(domain);
    const iosLink = page.locator('#footer-ios-link');
    const androidLink = page.locator('#footer-android-link');
    await expect(iosLink).toHaveAttribute('href', '/ios');
    await expect(androidLink).toHaveAttribute('href', '/android');
  });

  test('/ios redirects to Apple App Store', async ({ request }) => {
    const response = await request.get(`${domain}/ios`, { maxRedirects: 0 });
    expect(response.status()).toBe(302);
    expect(response.headers()['location']).toBe(expectedIosUrl);
  });

  test('/android redirects to Google Play Store', async ({ request }) => {
    const response = await request.get(`${domain}/android`, { maxRedirects: 0 });
    expect(response.status()).toBe(302);
    expect(response.headers()['location']).toBe(expectedAndroidUrl);
  });

  test('/download redirects to App Store on iOS user agent', async ({ request }) => {
    const response = await request.get(`${domain}/download`, {
      maxRedirects: 0,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
      }
    });
    expect(response.status()).toBe(302);
    expect(response.headers()['location']).toBe(expectedIosUrl);
  });

  test('/download redirects to Google Play on Android user agent', async ({ request }) => {
    const response = await request.get(`${domain}/download`, {
      maxRedirects: 0,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36'
      }
    });
    expect(response.status()).toBe(302);
    expect(response.headers()['location']).toBe(expectedAndroidUrl);
  });

  test('/download falls back to home page on desktop user agent', async ({ request }) => {
    const response = await request.get(`${domain}/download`, {
      maxRedirects: 0,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36'
      }
    });
    expect(response.status()).toBe(302);
    expect(response.headers()['location']).toBe('https://summerjobswap.com/');
  });
});

test.describe('App Store Redirection - nextwavenetwork.com', () => {
  const domain = 'https://nextwavenetwork.com';
  const expectedIosUrl = 'https://apps.apple.com/app/id6446342881';
  const expectedAndroidUrl = 'https://play.google.com/store/apps/details?id=com.sovereign.nextwavenetwork';

  test('Page contains Apple Smart App Banner meta tag', async ({ page }) => {
    await page.goto(domain);
    const meta = page.locator('meta[name="apple-itunes-app"]');
    await expect(meta).toHaveAttribute('content', 'app-id=6446342881');
  });

  test('Hero section contains Download App button linking to /download', async ({ page }) => {
    await page.goto(domain);
    const btn = page.locator('#app-download-btn');
    await expect(btn).toBeVisible();
    await expect(btn).toHaveAttribute('href', '/download');
  });

  test('Footer contains App Store and Google Play links', async ({ page }) => {
    await page.goto(domain);
    const iosLink = page.locator('#footer-ios-link');
    const androidLink = page.locator('#footer-android-link');
    await expect(iosLink).toHaveAttribute('href', '/ios');
    await expect(androidLink).toHaveAttribute('href', '/android');
  });

  test('/ios redirects to Apple App Store', async ({ request }) => {
    const response = await request.get(`${domain}/ios`, { maxRedirects: 0 });
    expect(response.status()).toBe(302);
    expect(response.headers()['location']).toBe(expectedIosUrl);
  });

  test('/android redirects to Google Play Store', async ({ request }) => {
    const response = await request.get(`${domain}/android`, { maxRedirects: 0 });
    expect(response.status()).toBe(302);
    expect(response.headers()['location']).toBe(expectedAndroidUrl);
  });

  test('/download redirects to App Store on iOS user agent', async ({ request }) => {
    const response = await request.get(`${domain}/download`, {
      maxRedirects: 0,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
      }
    });
    expect(response.status()).toBe(302);
    expect(response.headers()['location']).toBe(expectedIosUrl);
  });

  test('/download redirects to Google Play on Android user agent', async ({ request }) => {
    const response = await request.get(`${domain}/download`, {
      maxRedirects: 0,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36'
      }
    });
    expect(response.status()).toBe(302);
    expect(response.headers()['location']).toBe(expectedAndroidUrl);
  });

  test('/download falls back to home page on desktop user agent', async ({ request }) => {
    const response = await request.get(`${domain}/download`, {
      maxRedirects: 0,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36'
      }
    });
    expect(response.status()).toBe(302);
    expect(response.headers()['location']).toBe('https://nextwavenetwork.com/');
  });
});
