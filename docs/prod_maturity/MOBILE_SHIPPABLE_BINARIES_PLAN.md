# Mobile Shippable Binaries Plan — SummerJobSwap

## Current State (2026-06-25)

- Capacitor v1.0 shell with iOS + Android native projects generated.
- `apps/summerjobswap/src/index.html` redirects to `https://summerjobswap.com`.
- Android `build.gradle`:
  - `versionCode 1`, `versionName "1.0"` unchanged.
  - No `release` signing config.
  - No `google-services.json` → Firebase push not applied.
- iOS `project.pbxproj`:
  - No development team.
  - No release provisioning profile.
  - No app icons / splash screen beyond Capacitor defaults.
- No fastlane, Detox, or native CI pipeline.
- No native plugin integration beyond core Capacitor.

Verdict: **store-listing redirect shell, not a shippable native product.**

## Goal

Produce a shippable Android App Bundle (AAB) and iOS archive (.ipa) that can be
uploaded to Google Play Console and App Store Connect, respectively, even if the
primary UX remains a wrapped web view for this cycle.

## Non-Goals (out of scope for this slice)

- Rewriting the app as fully native (Swift/Kotlin UI).
- Adding push notifications, deep linking, or in-app purchases (require backend + store config).
- Actual store submission (requires human account access and policy review).

## Phases

### Phase 1 — Versioning and Release Configuration
1. Bump `versionCode` / `versionName` in Android and `CFBundleShortVersionString` / `CFBundleVersion` in iOS.
2. Add Android release signing config with placeholder keystore path (fail-closed if missing).
3. Add iOS `DEVELOPMENT_TEAM` and `PRODUCT_BUNDLE_IDENTIFIER` placeholders.
4. Add `BUILD_PACKAGE` and `SIGNING_STORE_FILE` env var handling.

### Phase 2 — Fastlane Scaffold
1. Add `Gemfile` + `Gemfile.lock` in `apps/summerjobswap/`.
2. Add `fastlane/Appfile` and `fastlane/Fastfile` for both platforms.
3. Add `fastlane/Matchfile` placeholder for code signing with match.
4. Document credential requirements in `apps/summerjobswap/README.md`.

### Phase 3 — CI/CD
1. Add `.github/workflows/mobile-build.yml` that:
   - Builds Android release AAB on `workflow_dispatch` and `release/mobile*` tags.
   - Builds iOS archive on macOS runner (also workflow_dispatch).
   - Uploads artifacts.
   - Fails if keystore / team credentials are not provided.

### Phase 4 — Native E2E Plan
1. Document Detox/Appium test plan.
2. Add placeholder Detox config (e2e test will be empty until UI stabilizes).

### Phase 5 — Verification
1. Run `npx cap sync` and `npx cap build android` / `npx cap build ios`.
2. Confirm release artifacts are produced (unsigned if credentials absent).
3. Update scorecard and DoD gate.

## Credentials Required (user must provide)

| Platform | Secret | Storage |
|----------|--------|---------|
| Android | Keystore file + keystore password + key alias + key password | GitHub Secrets / 1Password / local env |
| Android | `google-services.json` | `apps/summerjobswap/android/app/google-services.json` (gitignored) |
| iOS | Apple Developer Team ID | GitHub Secrets / env |
| iOS | App Store Connect API key (for CI upload) | GitHub Secrets / match |
| Both | App version policy | Decided per release |

## ROAM Risk

- `R-MOBILE-01`: Native binary not shippable → mitigated by this plan.
- `R-MOBILE-02`: Store credentials absent → accepted until supplied by user.

## Definition of Done

- [ ] `apps/summerjobswap/android/app/build.gradle` has release signing config.
- [ ] `apps/summerjobswap/ios/App/App.xcodeproj/project.pbxproj` has team placeholder.
- [ ] `apps/summerjobswap/fastlane/` exists with Fastfile for both lanes.
- [ ] `.github/workflows/mobile-build.yml` exists and builds artifacts on dispatch.
- [ ] `.gitignore` excludes keystore and `google-services.json`.
- [ ] `pytest` + `dod-gate` still pass.
