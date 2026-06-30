# Apple Developer Credentials — How to Locate Required Values

## 1. Apple Developer Team ID (10-char alphanumeric)

**URL:** <https://developer.apple.com/account#MembershipDetailsCard>

1. Sign in with your Apple ID at <https://developer.apple.com>
2. Navigate to **Account** → **Membership**
3. Your **Team ID** is displayed under "Membership Details"
   (e.g., `ABCDE12345` — exactly 10 alphanumeric characters)
4. This goes into: `SUMMERJOBSWAP_IOS_TEAM_ID` GitHub secret + `team_id()` in Appfile

> If you see multiple teams, use the one for your individual/company developer account.

## 2. Apple ID Email

**URL:** <https://appleid.apple.com>

1. Sign in at <https://appleid.apple.com>
2. The email you signed in with **is** your Apple ID
3. This goes into: `apple_id()` in the fastlane Appfile

> Ensure this Apple ID is enrolled in the Apple Developer Program ($99/yr at <https://developer.apple.com/programs/>)

## 3. App Store Connect / iTunes Connect Team ID (numeric)

**URL:** <https://appstoreconnect.apple.com>

1. Sign in at <https://appstoreconnect.apple.com>
2. Click your name (top-right) → **Account Settings**
3. Under **Team**, your **Team ID** is a numeric value (e.g., `123456789`)
4. This goes into: `itc_team_id()` in the fastlane Appfile

> This is DIFFERENT from the Developer Team ID (step 1). The ITC Team ID is numeric; the Developer Team ID is alphanumeric.

## Quick Reference Table

| Value | Where to Find | Example | GitHub Secret / Appfile |
|-------|--------------|---------|------------------------|
| Developer Team ID | developer.apple.com → Membership | `ABCDE12345` | `SUMMERJOBSWAP_IOS_TEAM_ID` + `team_id()` |
| Apple ID Email | appleid.apple.com | `you@email.com` | `apple_id()` |
| ITC Team ID | appstoreconnect.apple.com → Settings | `123456789` | `itc_team_id()` |
| Bundle ID | Your Capacitor config | `com.sovereign.summerjobswap` | `SUMMERJOBSWAP_IOS_BUNDLE_ID` + `app_identifier()` |

## Setting GitHub Secrets (once you have the values)

```bash
gh secret set SUMMERJOBSWAP_IOS_TEAM_ID --body "ABCDE12345" --repo rooz-live/agentic-flow
gh secret set SUMMERJOBSWAP_IOS_BUNDLE_ID --body "com.sovereign.summerjobswap" --repo rooz-live/agentic-flow
```

Or via GitHub UI: <https://github.com/rooz-live/agentic-flow/settings/secrets/actions>

---

# Release Readiness Protocol — SummerJobSwap MVP Launch

**Status:** In Progress
**Last Updated:** 2026-06-29
**Branch:** chore/swarm-p1-index02-gates-push

## 1. iOS Build Configuration Assessment

### Current State

| Component | Status | Detail |
|-----------|--------|--------|
| Capacitor config | ✅ Valid | `appId: com.sovereign.summerjobswap`, `webDir: dist` |
| Fastlane Appfile | ⚠️ Partial | `package_name` set; iOS fields commented out |
| Fastlane Fastfile | ✅ Exists | iOS `release` lane requires `SUMMERJOBSWAP_IOS_TEAM_ID` |
| mobile-build.yml | ✅ Fixed | YAML valid (P1 fix, commit d523a61a9) |
| iOS simulator selection | ✅ Fixed | Pure-shell grep approach with iPhone 15 Pro fallback |

### iOS Prerequisites to Trigger Launch

1. **Apple Developer Account** — enroll at developer.apple.com ($99/yr)
2. **Register App ID** — `com.sovereign.summerjobswap` in Apple Developer portal
3. **Provisioning Profile** — create App Store distribution profile
4. **Signing Certificate** — generate distribution certificate
5. **Set GitHub Secrets:**
   - `SUMMERJOBSWAP_IOS_TEAM_ID` — Apple Developer Team ID
   - `SUMMERJOBSWAP_IOS_BUNDLE_ID` — `com.sovereign.summerjobswap`
6. **Uncomment fastlane Appfile:**

   ```ruby
   apple_id("your-apple-id@email.com")
   itc_team_id("your-itc-team-id")
   team_id("your-dev-team-id")
   ```

7. **Trigger:** Tag `release/mobile-*` → mobile-build.yml → iOS archive job runs

### iOS Launch Trigger

```bash
git tag release/mobile-v1.0.0
git push origin release/mobile-v1.0.0
# → mobile-build.yml ios job triggers → fastlane ios release → IPA upload
```

## 2. Android Keystore Configuration

### Required GitHub Secrets (4)

| Secret | Purpose | How to Generate |
|--------|---------|-----------------|
| `SUMMERJOBSWAP_RELEASE_STORE_FILE` | Base64-encoded keystore file | `keytool -genkey -v -keystore release.keystore -alias summerjobswap -keyalg RSA -keysize 2048 -validity 10000` then base64 encode |
| `SUMMERJOBSWAP_RELEASE_STORE_PASSWORD` | Keystore password | Set during keytool generation |
| `SUMMERJOBSWAP_RELEASE_KEY_ALIAS` | Key alias within keystore | `summerjobswap` (or chosen alias) |
| `SUMMERJOBSWAP_RELEASE_KEY_PASSWORD` | Key password | Set during keytool generation |

### Additional Android Requirements

1. **Google Play Console Account** — $25 one-time fee
2. **Service Account JSON** — for `fastlane supply` automated upload
3. **Set `GOOGLE_PLAY_JSON` secret** — base64-encoded service account key
4. **Android signing config** — add to `apps/summerjobswap/android/app/build.gradle`:

   ```gradle
   signingConfigs {
       release {
           storeFile file(System.getenv("SUMMERJOBSWAP_RELEASE_STORE_FILE") ?: "release.keystore")
           storePassword System.getenv("SUMMERJOBSWAP_RELEASE_STORE_PASSWORD")
           keyAlias System.getenv("SUMMERJOBSWAP_RELEASE_KEY_ALIAS")
           keyPassword System.getenv("SUMMERJOBSWAP_RELEASE_KEY_PASSWORD")
       }
   }
   ```

### Android URLs Required

- Google Play Console: `https://play.google.com/console`
- Google Cloud IAM: `https://console.cloud.google.com/iam-admin/serviceaccounts`
- Fastlane supply docs: `https://docs.fastlane.tools/actions/supply/`

## 3. Stripe Billing Integration Assessment

### Current State

| Component | Status | Detail |
|-----------|--------|--------|
| Webhook verification | ✅ Solid | [`stripe_gateway.rs`](src/gateways/stripe_gateway.rs:1) — HMAC-SHA256, crypto-enforced |
| Billing domain | ✅ Exists | [`invoice_engine.py`](src/billing/invoice_engine.py:1), [`api_server.py`](src/billing/api_server.py:1) |
| Webhook secret | ⚠️ Hardcoded fallback | `whsec_bhopti_12345` — needs real `STRIPE_WEBHOOK_SECRET` |
| Checkout flow | ❌ Missing | No Stripe Checkout/Payment Intent on storefronts |
| Stripe SDK (web) | ❌ Missing | No `@stripe/stripe-js` integration |

### Stripe Roadmap (Step-by-Step)

1. **Create Stripe Account** → dashboard.stripe.com → get API keys
2. **Set Environment Secrets:**
   - `STRIPE_SECRET_KEY` — `sk_live_...` or `sk_test_...`
   - `STRIPE_WEBHOOK_SECRET` — `whsec_...` (replace hardcoded fallback)
   - `STRIPE_PUBLISHABLE_KEY` — `pk_live_...` or `pk_test_...`
3. **Create Products + Prices** in Stripe Dashboard (map to HostBill rate plans)
4. **Web Storefront Checkout:**
   - Install `@stripe/stripe-js` + `@stripe/react-stripe-js`
   - Create Checkout Session server-side (in billing API server)
   - Redirect to Stripe Checkout → success URL back to storefront
5. **Webhook Endpoint:** `billing.bhopti.com/webhooks/stripe` → `stripe_gateway.rs`
6. **Test:** Stripe CLI `stripe listen --forward-to localhost:8000/webhooks/stripe`
7. **Go Live:** Switch test keys → live keys, verify webhook signature

## 4. Whop Billing Integration Assessment

### Current State

| Component | Status | Detail |
|-----------|--------|--------|
| Affiliate worker | ✅ Exists | [`whop_affiliate_worker.ts`](src/integrations/whop_affiliate_worker.ts:1) — rev-share registration |
| API key | ⚠️ Env only | `WHOP_DEV_API_KEY` — needs real key |
| Company ID | ⚠️ Hardcoded | `biz_WKmNzKeXAiu2ks` |
| Checkout integration | ❌ Missing | No Whop checkout embed on storefronts |
| Per-domain branding | ❌ Missing | Affiliate tracking not branded per TLD |

### Whop Roadmap (Step-by-Step)

1. **Whop Dashboard** → whop.com → create company + products
2. **Set Environment Secret:** `WHOP_DEV_API_KEY` — from Whop developer settings
3. **Create Products** — map to domain-specific pricing tiers
4. **Checkout Embed:** Add Whop checkout iframe/button on each storefront
5. **Affiliate Branded Tracking:**
   - Each domain gets unique affiliate program in Whop
   - `whop_affiliate_worker.ts` registers rev-share per domain
   - Affiliate links branded: `summerjobswap.com/?ref=...` → Whop tracking
6. **Webhook:** Configure Whop webhook → billing API for payment events
7. **Docs:** `https://docs.whop.com/developer/guides/ios/checkout-reference`

## 5. Consolidated Action Items

| # | Action | Priority | Type | Dependency |
|---|--------|----------|------|------------|
| R1 | Set `SUMMERJOBSWAP_IOS_TEAM_ID` + uncomment Appfile | P0 | Secret + Config | Apple Developer account |
| R2 | Generate Android keystore + 4 secrets | P0 | Secret | keytool |
| R3 | Add Android signingConfig to build.gradle | P0 | Code | R2 |
| R4 | Replace Stripe hardcoded webhook secret | P0 | Secret | Stripe account |
| R5 | Set `STRIPE_SECRET_KEY` + `STRIPE_PUBLISHABLE_KEY` | P0 | Secret | Stripe account |
| R6 | Implement Stripe Checkout on storefronts | P1 | Code | R5 |
| R7 | Set `WHOP_DEV_API_KEY` + verify COMPANY_ID | P0 | Secret | Whop account |
| R8 | Implement Whop checkout on storefronts | P1 | Code | R7 |
| R9 | Per-domain affiliate branding | P2 | Code | R8 |
| R10 | Google Play service account JSON | P1 | Secret | Play Console |

## 6. Deployment Gate Integration

R-CLS-03 and R-MAIL-03 remain in the LNNNL blockers lane:

- **R-MAIL-03** (now): Stalwart mail — needed for email receipts/notifications
- **R-CLS-03** (next): Trust artifact ↔ HEAD coupling — affects release pipeline integrity
- **R-SPOF-01**: Accepted/Deferred per ADR-0042 (not critical for MVP)

The scorecard gate ([`run_scorecard_verify_ci.sh`](scripts/gates/run_scorecard_verify_ci.sh:1))
enforces fail-closed verification before any merge. All payment gateway secrets
must be set as GitHub repository secrets before the release/mobile-* tag triggers.
