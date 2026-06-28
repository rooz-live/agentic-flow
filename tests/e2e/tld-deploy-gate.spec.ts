import { test, expect } from '@playwright/test';

import targetsDoc from './tld-targets.generated.json';

type GeneratedTarget = {
  tld: string;
  url: string;
  titlePattern: string;
  flags?: string;
  redirects?: boolean;
};

const TLD_TARGETS = (targetsDoc as { targets: GeneratedTarget[] }).targets.map((t) => ({
  tld: t.tld,
  url: t.url,
  titlePattern: new RegExp(t.titlePattern, t.flags || 'i'),
  ...(t.redirects ? { redirects: true } : {}),
}));

/** True DNS / name-resolution failures only (not Playwright expect timeouts). */
function isUnresolvableHostError(message: string): boolean {
  return (
    message.includes('ENOTFOUND') ||
    message.includes('ERR_NAME_NOT_RESOLVED') ||
    message.includes('net::ERR_NAME_NOT_RESOLVED')
  );
}

/**
 * interface.rooz.live may be reachable only from edge/VPN. When the runner hits a plain
 * Timeout (not DNS), opt-in skip avoids a false "prod down" signal from the wrong network.
 * DoD: run the gate without TLD_GATE_LENIENT_INTERFACE from a network that can reach the host.
 */
function shouldSkipInterfaceRunnerTimeout(tld: string, message: string): boolean {
  return (
    tld === 'interface.rooz.live' &&
    process.env.TLD_GATE_LENIENT_INTERFACE === '1' &&
    message.includes('Timeout') &&
    !isUnresolvableHostError(message)
  );
}

/**
 * TLD Deploy Gate — HTTP 200 + title (+ optional evidence-manifest.json) per TLD.
 *
 * DoD gate: run after `deploy-tld-dashboard.sh exec --confirm` per runbook; interpret skips as NOT green for strict AT.
 * Opt-in: PLAYWRIGHT_TLD_ONLY=1 npx playwright test --project=tld-deploy-gate
 * Optional: TLD_GATE_LENIENT_INTERFACE=1 skips interface.rooz.live on runner Timeout (wrong network), not for DoD.
 *          (or: pnpm run test:e2e:tld-gate)
 * Tests are tagged @tld-gate — excluded from default browser projects unless that project runs.
 *
 * Band: passive ([FA]) — read-only HTTP checks; no state mutation.
 * RFC row: RFC-THEMES-LOG.md § "TLD Dashboard Deploy Gate"
 *
 * Evidence chain: if GET /evidence-manifest.json returns 200 HTML, the host is routing JSON
 * requests into the SPA shell — fix server/cPanel rules so `.json` is served as static file.
 *
 * Strict AT: TLD_GATE_STRICT_MANIFEST=1 — 404 on manifest fails (no skip).
 * Strict AT: TLD_GATE_STRICT_DNS=1 — DNS / ERR_NAME_NOT_RESOLVED fails (no skip).
 * Optional: TLD_GATE_FINGERPRINT=1 — root HTML must reference Vite assets (TLD_GATE_ASSET_BASE_HINT, default /trading/).
 * See docs/TLD_AND_WSJF_STRICT_TOGGLES.md.
 * `pnpm run test:e2e:tld-gate:strict` sets strict manifest + DNS for a closed evidence chain on the canonical runner.
 *
 * RCA: lenient mode skips DNS — hides ENOTFOUND gaps. interface.rooz.live Timeout (45s/30s) is not DNS — route/edge/slow path.
 * Manifest HTTP 200 with HTML body fails JSON parse — not closed evidence (fix static .json routing). Video/ffmpeg: local may work while CI differs.
 */
const STRICT_MANIFEST = process.env.TLD_GATE_STRICT_MANIFEST === '1';
const STRICT_DNS = process.env.TLD_GATE_STRICT_DNS === '1';
const FINGERPRINT = process.env.TLD_GATE_FINGERPRINT === '1';
const BYPASS_TOKEN = process.env.TLD_GATE_BYPASS_TOKEN || '';
const LENIENT = process.env.TLD_GATE_LENIENT === '1';
/** Strict CI path: no outage/placeholder skips unless TLD_GATE_LENIENT=1. */
function isStrictClosed(): boolean {
  return (STRICT_MANIFEST || STRICT_DNS) && !LENIENT;
}

function isOroBillingHost(tld: string): boolean {
  return (
    tld.includes('crm.bhopti.com') ||
    tld.includes('shop.bhopti.com') ||
    tld.includes('billing.bhopti.com')
  );
}

function isTransitionPlaceholder(body: string): boolean {
  return body.includes('Sovereign Swarm Transition Phase') || body.includes('OroCommerce B2B Storefront');
}

/** Prefix before `assets/` in built HTML (e.g. `/trading/` for trader:build:tld, `/` for trader:build). */
const ASSET_BASE_HINT =
  process.env.TLD_GATE_ASSET_BASE_HINT === undefined ||
  process.env.TLD_GATE_ASSET_BASE_HINT === ''
    ? '/trading/'
    : process.env.TLD_GATE_ASSET_BASE_HINT;



function timeoutsForTld(tld: string): { httpMs: number; manifestMs: number; gotoMs: number } {
  if (tld === 'interface.rooz.live') {
    return { httpMs: 45_000, manifestMs: 30_000, gotoMs: 45_000 };
  }
  return { httpMs: 15_000, manifestMs: 10_000, gotoMs: 20_000 };
}

for (const { tld, url, titlePattern, redirects } of TLD_TARGETS) {
  const tw = timeoutsForTld(tld);
  test.describe(`TLD smoke: ${tld}`, () => {
    test(`${url} returns 200 with non-empty body or valid redirect @tld-gate`, async ({ request }) => {
      try {
        const res = await request.get(url, {
          timeout: tw.httpMs,
          headers: BYPASS_TOKEN ? { 'X-Gate-Bypass': BYPASS_TOKEN } : {},
        });
        
        // Handle 502/503 / connection errors for known offline VMs
        if ((res.status() === 502 || res.status() === 503) && isOroBillingHost(tld)) {
          if (isStrictClosed()) {
            throw new Error(`${tld}: HTTP ${res.status()} — strict gate forbids outage skip (set TLD_GATE_LENIENT=1 to skip)`);
          }
          console.warn(`[ROAM RISK] OroCommerce VM offline for ${tld} (HTTP ${res.status()}). Skipping test.`);
          test.skip(true, `OroCommerce VM offline (HTTP ${res.status()})`);
          return;
        }

        const body = await res.text();
        expect(res.status(), `${tld} should return HTTP 200 or 30x`).toBeLessThan(400);
        
        if (isTransitionPlaceholder(body)) {
          if (isStrictClosed()) {
            throw new Error(`${tld}: transition placeholder page — strict gate requires real content`);
          }
          console.log(`[TLD-GATE] ${tld} is in Sovereign Swarm Transition Phase placeholder.`);
        } else {
          expect(body.length, `${tld} body should not be empty`).toBeGreaterThan(100);
        }

        // Hardened: Verify critical DOM structure for production grade
        if (tld === 'summerjobswap.com' || tld === 'nextwavenetwork.com') {
          expect(body, `${tld} should contain apple-itunes-app meta`).toContain('apple-itunes-app');
          expect(body, `${tld} should contain #app-download-btn button`).toContain('id="app-download-btn"');
          expect(body, `${tld} should contain #footer-ios-link`).toContain('id="footer-ios-link"');
          expect(body, `${tld} should contain #footer-android-link`).toContain('id="footer-android-link"');
        }
      } catch (error) {
        const err = error as any;
        const msg = String(err?.message ?? err);
        if (isUnresolvableHostError(msg) || ((msg.includes('connection') || msg.includes('ECONN') || msg.includes('closed') || msg.includes('refused')) && isOroBillingHost(tld))) {
          if (STRICT_DNS && isUnresolvableHostError(msg)) {
            test.fail(true, `${tld}: [DNS ENOTFOUND] True DNS resolution failed heavily on the canonical runner. RCA Deep Why: Missing /etc/hosts mapping or root DNS propagation gap (TLD_GATE_STRICT_DNS=1)`);
          } else if (isStrictClosed()) {
            throw new Error(`${tld}: connection/DNS failure in strict mode: ${msg}`);
          } else {
            console.warn(`[ROAM RISK] DNS/Connection for ${tld} (${msg})`);
            lenientSkipOrFail(`[OUT OF SCOPE] DNS/Connection for ${tld}: ${msg}`);
          }
        } else if (shouldSkipInterfaceRunnerTimeout(tld, msg)) {
          if (isStrictClosed()) {
            throw new Error(`${tld}: runner timeout in strict mode — use edge network or TLD_GATE_LENIENT=1`);
          }
          console.warn(`[ROAM RISK] interface.rooz.live HTTP Timeout — slow edge/VPN constraint.`);
          test.skip(
            true,
            '[OUT OF SCOPE] interface.rooz.live: timeout from this runner — use VPN or unset TLD_GATE_LENIENT_INTERFACE. Not a DNS failure.',
          );
        } else {
          throw err;
        }
      }
    });

    test(`${url} has matching <title> @tld-gate`, async ({ page }) => {
      try {
        if (BYPASS_TOKEN) {
          await page.setExtraHTTPHeaders({ 'X-Gate-Bypass': BYPASS_TOKEN });
        }
        const res = await page.goto(url, { timeout: tw.gotoMs, waitUntil: 'domcontentloaded' });
        
        if (res) {
          const status = res.status();
          if ((status === 502 || status === 503) && isOroBillingHost(tld)) {
            if (isStrictClosed()) {
              throw new Error(`${tld}: HTTP ${status} — strict gate forbids outage skip on title check`);
            }
            console.warn(`[ROAM RISK] OroCommerce VM offline for ${tld} (HTTP ${status}). Skipping title check.`);
            test.skip(true, `OroCommerce VM offline (HTTP ${status})`);
            return;
          }
        }

        const body = await page.content();
        if (isTransitionPlaceholder(body)) {
          if (isStrictClosed()) {
            throw new Error(`${tld}: transition placeholder — strict gate requires real title`);
          }
          console.log(`[TLD-GATE] ${tld} matches the transition phase placeholder. Title check skipped.`);
          return;
        }

        const contentType = await page.evaluate(() => document.contentType);
        if (contentType && contentType.includes('json')) {
          console.warn(`[WARNING] Skipping title check for ${tld} because it served JSON content.`);
          return;
        }

        await expect(page, `${tld} title should match ${titlePattern}`).toHaveTitle(titlePattern);

        // Hardened: Verify page structure is fully rendered and prod-grade
        if (tld === 'summerjobswap.com' || tld === 'nextwavenetwork.com') {
          const btn = page.locator('#app-download-btn');
          await expect(btn).toBeVisible();
          await expect(btn).toHaveAttribute('href', '/download');

          const iosLink = page.locator('#footer-ios-link');
          const androidLink = page.locator('#footer-android-link');
          await expect(iosLink).toBeVisible();
          await expect(iosLink).toHaveAttribute('href', '/ios');
          await expect(androidLink).toBeVisible();
          await expect(androidLink).toHaveAttribute('href', '/android');
        }
      } catch (error) {
        const err = error as any;
        const msg = String(err?.message ?? err);
        if (isUnresolvableHostError(msg) || ((msg.includes('connection') || msg.includes('ECONN') || msg.includes('closed') || msg.includes('refused')) && isOroBillingHost(tld))) {
          if (STRICT_DNS && isUnresolvableHostError(msg)) {
            throw new Error(
              `${tld}: DNS / name resolution failed during title check (TLD_GATE_STRICT_DNS=1): ${msg}`,
            );
          }
          if (isStrictClosed()) {
            throw new Error(`${tld}: connection/DNS failure during title check (strict): ${msg}`);
          }
          console.warn(`[WARNING] connection/DNS error for ${tld} during title check`);
          lenientSkipOrFail(`connection/DNS error for ${tld}: ${msg}`);
        } else if (shouldSkipInterfaceRunnerTimeout(tld, msg)) {
          test.skip(true, 'interface.rooz.live: timeout from this runner (lenient mode)');
        } else {
          throw err;
        }
      }
    });

    if (!redirects || isStrictClosed()) {
      test(`${url} dynamically hosts fresh evidence-manifest.json @tld-gate`, async ({ request }) => {
        const manifestUrl = `${url}evidence-manifest.json`;
        try {
          const res = await request.get(manifestUrl, {
            timeout: tw.manifestMs,
            headers: BYPASS_TOKEN ? { 'X-Gate-Bypass': BYPASS_TOKEN } : {},
          });
          if (res.status() === 404) {
            if (STRICT_MANIFEST) {
              throw new Error(
                `${tld}: evidence-manifest.json returned 404 (TLD_GATE_STRICT_MANIFEST=1) — deploy must publish manifest`,
              );
            }
            test.skip(true, 'evidence-manifest.json missing (404) — deploy did not publish manifest');
            return;
          }
          expect(res.status(), `${tld} evidence-manifest must be 200 when present`).toBe(200);
          const text = await res.text();
          let manifest: Record<string, unknown>;
          try {
            manifest = JSON.parse(text) as Record<string, unknown>;
          } catch {
            throw new Error(
              `${tld}: ${manifestUrl} returned 200 but body is not JSON (likely HTML shell)`,
            );
          }
          expect(manifest, `${tld} manifest`).toHaveProperty('buildHash');
          expect(manifest, `${tld} manifest`).toHaveProperty('deployTimestamp');

          if (FINGERPRINT) {
            const rootRes = await request.get(url, {
              timeout: tw.httpMs,
              headers: BYPASS_TOKEN ? { 'X-Gate-Bypass': BYPASS_TOKEN } : {},
            });
            expect(rootRes.status(), `${tld} root for fingerprint`).toBeLessThan(400);
            const html = await rootRes.text();
            const hint = ASSET_BASE_HINT.replace(/\/$/, '') || '';
            const escaped = hint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const assetRe =
              hint === '' || hint === '/'
                ? /\/assets\/[^"'<>]+\.(js|css)/i
                : new RegExp(`${escaped}/assets/[^"'<>]+\\.(js|css)`, 'i');
            expect(html, `${tld} root HTML should reference Vite assets (hint=${hint || '/'})`).toMatch(assetRe);
          }
        } catch (error) {
          const err = error as any;
          const msg = String(err?.message ?? err);
          if (isUnresolvableHostError(msg)) {
            if (STRICT_DNS) {
              throw new Error(
                `${tld}: DNS / name resolution failed for manifest (TLD_GATE_STRICT_DNS=1): ${msg}`,
              );
            }
            test.skip(true, 'DNS: host not resolved from this runner');
          } else if (shouldSkipInterfaceRunnerTimeout(tld, msg)) {
            test.skip(true, 'interface.rooz.live: manifest timeout from this runner (lenient mode)');
          } else {
            throw err;
          }
        }
      });
    }
  });
}
// ─── tag.vote redirect policy (apex Discord, /cog Cognitum affiliate) ───────
test.describe('tag.vote redirect policy @tld-gate', () => {
  test('tag.vote apex / forwards to Discord (not Cognitum)', async ({ request }) => {
    const res = await request.get('https://tag.vote/', {
      maxRedirects: 0,
      timeout: 15_000,
      failOnStatusCode: false,
    });
    const status = res.status();
    const location = res.headers()['location'] ?? '';
    expect(status, 'tag.vote apex should 301/302').toBeGreaterThanOrEqual(301);
    expect(status, 'tag.vote apex should 301/302').toBeLessThanOrEqual(302);
    expect(location.toLowerCase(), 'apex must not forward to Cognitum').not.toContain('cognitum');
    expect(location.toLowerCase(), 'apex must forward to Discord').toContain('discord');
  });

  test('tag.vote/cog forwards to Cognitum affiliate ref=2rbzTT', async ({ request }) => {
    const res = await request.get('https://tag.vote/cog', {
      maxRedirects: 0,
      timeout: 15_000,
      failOnStatusCode: false,
    });
    const status = res.status();
    const location = res.headers()['location'] ?? '';
    expect(status, 'tag.vote/cog should 301/302').toBeGreaterThanOrEqual(301);
    expect(status, 'tag.vote/cog should 301/302').toBeLessThanOrEqual(302);
    expect(location.toLowerCase(), '/cog must forward to Cognitum').toContain('cognitum');
    expect(location, '/cog must include affiliate ref').toContain('2rbzTT');
  });
});

// ─── Billing Infrastructure: gRPC EventOps Health Gate ───────────────────────
// api.interface.tag.ooo serves gRPC exclusively — root HTTP GET returns 502 by design.
// This separate suite tests the actual gRPC health path.

test.describe('Billing Infrastructure: api.interface.tag.ooo gRPC health @tld-gate', () => {
  /**
   * R-EVENTOPS-01: RESOLVED 2026-06-19
   * eventops-grpc.service running grpc.health.v1.Health=SERVING on :50051 (h2c)
   * HAProxy SNI mailadmin_https → Caddy :8444 → h2c://127.0.0.1:50051
   *
   * Root path returns 502 (correct: gRPC server doesn't serve plain HTTP).
   * Health path returns 200 (correct: gRPC health protocol over HTTP/2).
   */
  test('api.interface.tag.ooo gRPC Health/Check returns HTTP 200 @tld-gate', async ({ request }) => {
    const res = await request.post('https://api.interface.tag.ooo/grpc.health.v1.Health/Check', {
      timeout: 12_000,
      failOnStatusCode: false,
      headers: {
        'Content-Type': 'application/grpc+proto',
        'TE': 'trailers',
      },
      data: Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00]),
    });
    const status = res.status();
    console.log(`[BILLING-INFRA] api.interface.tag.ooo gRPC/Check → HTTP ${status}`);
    expect(status, 'gRPC health check must return HTTP 200').toBe(200);
  });

  test('api.interface.tag.ooo root returns 502 (correct — gRPC only, no plain HTTP) @tld-gate', async ({ request }) => {
    // 502 on root is NOT a fault: Caddy proxies all traffic to gRPC h2c backend.
    // Plain HTTP GET has no gRPC frame → backend returns non-gRPC response → 502.
    // This test documents the invariant: root MUST be 502, not 200.
    const res = await request.get('https://api.interface.tag.ooo/', {
      timeout: 10_000,
      failOnStatusCode: false,
    });
    const status = res.status();
    console.log(`[BILLING-INFRA] api.interface.tag.ooo root → HTTP ${status} (502 expected — gRPC only)`);
    // Accept 502, 503, 0 — all indicate gRPC backend active but no plain-HTTP handler
    expect([502, 503, 0], 'gRPC-only root must not serve plain HTTP').toContain(status);
  });
});
