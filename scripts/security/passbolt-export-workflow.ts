import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Passbolt Playwright Workflow
 *
 * Drives the Passbolt UI to export the user's private key and configures the passbolt-cli.
 * Requires a persistent browser context (with the Passbolt extension installed) or
 * account recovery state if running completely headless.
 *
 * Risk Level: HIGH
 * Security constraints: Ensures the downloaded key is written to a secure/RAM-disk path with 0600 permissions.
 */
test('Export Passbolt Private Key and Configure CLI', async ({ page }) => {
  // Configuration
  const passboltUrl = process.env.PASSBOLT_URL || 'https://passbolt.yocloud.com';
  const passphrase = process.env.PASSBOLT_PASSPHRASE;

  if (!passphrase) {
    throw new Error('PASSBOLT_PASSPHRASE environment variable is required.');
  }

  // Use a strict temporal path (e.g., RAM-disk) to prevent disk persistence.
  // Enforces bounding to /dev/shm explicitly per DoR/ROAM constraints.
  const secureDir = process.env.PASSBOLT_KEY_DIR || '/dev/shm/passbolt-bound';

  if (!fs.existsSync('/dev/shm') || !secureDir.startsWith('/dev/shm')) {
      throw new Error('[ROAM COMPLIANCE CAUTION] Cannot execute Passbolt workflow outside of ephemeral RAM-disk (/dev/shm). Persistence vector blocked.');
  }
  const keyPath = path.join(secureDir, 'passbolt-key.asc');

  console.log(`[Workflow] Navigating to Passbolt at ${passboltUrl}...`);
  await page.goto(passboltUrl);

  // 1. Enter passphrase
  console.log('[Workflow] Authenticating...');
  await page.waitForSelector('input[type="password"]', { timeout: 15000 });
  await page.fill('input[type="password"]', passphrase);
  await page.click('button[type="submit"]');

  // Wait for successful login / workspace load
  await page.waitForSelector('.js-workspace, .passwords-grid', { timeout: 20000 });
  console.log('[Workflow] Successfully authenticated.');

  // 2. Navigate to Profile -> Keys
  console.log('[Workflow] Navigating to Profile > Keys...');
  // Click user avatar / profile menu
  await page.click('.avatar-container, [data-test="user-menu"]');
  await page.click('text="Profile", [data-test="menu-profile"]');

  // Click Keys tab
  await page.click('text="Keys", [href*="/profile/keys"]');

  // 3. Export Key
  console.log('[Workflow] Initiating private key export...');
  const downloadPromise = page.waitForEvent('download');

  // Click export private key button
  await page.click('text="Export", [data-test="export-private-key"]');

  // Handle potential passphrase confirmation prompt for sensitive actions
  const confirmPassphraseInput = page.locator('.dialog-confirm input[type="password"], .modal input[type="password"]');
  if (await confirmPassphraseInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('[Workflow] Confirming passphrase for export...');
    await confirmPassphraseInput.fill(passphrase);
    await page.click('.dialog-confirm button[type="submit"], .modal button.primary');
  }

  const download = await downloadPromise;

  // 4. Secure Storage
  if (!fs.existsSync(secureDir)) {
    fs.mkdirSync(secureDir, { recursive: true, mode: 0o700 });
  }

  await download.saveAs(keyPath);
  fs.chmodSync(keyPath, 0o600); // Enforce strict read/write only for owner
  console.log(`[Workflow] Private key securely downloaded to temporal volume: ${keyPath}`);

  // 5. Configure passbolt-cli
  console.log('[Workflow] Configuring passbolt-cli...');
  try {
    const cmd = `passbolt configure --serverAddress ${passboltUrl} --userPrivateKeyFile ${keyPath}`;
    execSync(cmd, { stdio: 'inherit' });
    console.log('[Workflow] passbolt-cli configured successfully.');
  } catch (error) {
    console.error('[Error] Failed to configure passbolt-cli:', error);
    throw error;
  }
});
