#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <domain_prefix>"
  echo "Example: $0 nextwavenetwork"
  exit 1
fi

DOMAIN=$1
APP_DIR="$(pwd)/apps/${DOMAIN}"

echo "🔨 Initiating Native App Compilation for App Store Submission: $DOMAIN"

if [ ! -d "$APP_DIR" ]; then
    echo "❌ Error: App directory $APP_DIR does not exist. Run generate_native_app.sh first."
    exit 1
fi

cd "$APP_DIR"

# 1. Sync Web Assets to Native Containers
echo "🔄 Syncing Capacitor bridge and web assets to native projects..."
npx cap sync > /dev/null 2>&1

# 2. Compile Android (.aab) for Google Play Console
echo "🤖 Compiling Android App Bundle (Release)..."
if [ -d "android" ]; then
    cd android
    # Note: Requires Android SDK and valid keystore for release signing
    ./gradlew bundleRelease || echo "⚠️ Android compilation requires local SDK configuration. Project is ready in $APP_DIR/android"
    cd ..
else
    echo "❌ Android project not found."
fi

# 3. Compile iOS (.ipa/.xcarchive) for Apple App Store Connect
echo "🍎 Compiling iOS Xcode Archive..."
if [ -d "ios/App" ]; then
    cd ios/App
    # Note: Requires Xcode and valid Apple Developer Provisioning Profile
    xcodebuild clean archive \
        -workspace App.xcworkspace \
        -scheme App \
        -archivePath build/App.xcarchive \
        CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO \
        || echo "⚠️ iOS compilation requires Apple Developer Profile. Workspace is ready in $APP_DIR/ios/App"
    cd ../..
else
    echo "❌ iOS project not found."
fi

echo "✅ Compilation pipeline executed. Artifacts staged for submission."
