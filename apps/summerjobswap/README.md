# SummerJobSwap Mobile App

Capacitor-based iOS/Android shell for the SummerJobSwap seasonal employment network.

## Current state

The app currently wraps the web experience at `https://summerjobswap.com`.
Native features (push, deep links, in-app purchases) are out of scope for this
cycle; the goal is a **shippable release binary** that can be uploaded to the
App Store and Google Play.

## Credentials required

| Platform | Secret | How to provide |
|----------|--------|---------------|
| Android | Keystore file | Place at `android/app/YOUR.keystore` and set `SUMMERJOBSWAP_RELEASE_STORE_FILE` |
| Android | Keystore password | `SUMMERJOBSWAP_RELEASE_STORE_PASSWORD` |
| Android | Key alias | `SUMMERJOBSWAP_RELEASE_KEY_ALIAS` (default: `summerjobswap`) |
| Android | Key password | `SUMMERJOBSWAP_RELEASE_KEY_PASSWORD` |
| Android | Firebase | `android/app/google-services.json` (gitignored) |
| iOS | Apple Development Team ID | `SUMMERJOBSWAP_IOS_TEAM_ID` |
| iOS | Bundle ID | `SUMMERJOBSWAP_IOS_BUNDLE_ID` (default: `com.sovereign.summerjobswap`) |
| iOS | App Store Connect API key | GitHub secret / fastlane match (not yet configured) |

## Build commands

```bash
cd apps/summerjobswap

# Android debug APK
bundle exec fastlane android debug_apk

# Android release AAB (requires keystore)
bundle exec fastlane android release

# iOS simulator build
bundle exec fastlane ios debug_sim

# iOS release archive (requires team ID)
SUMMERJOBSWAP_IOS_TEAM_ID=YOUR_TEAM_ID bundle exec fastlane ios release
```

## CI

See `.github/workflows/mobile-build.yml`. It is fail-closed: builds only run
when the required secrets are present.

## See also

- `docs/prod_maturity/MOBILE_SHIPPABLE_BINARIES_PLAN.md`
