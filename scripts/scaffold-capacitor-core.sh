#!/usr/bin/env bash
set -e

# Sovereign Swarm: Capacitor Core Foundation (San Gen Shugi)
# Inverting from Acquisition (Whop HTML) to Core Product (iOS/Android)

APP_DIR="swarm-core-app"

echo "🎯 [JIT] Scaffolding the Core iOS/Android/Web Product Payload..."

if [ -d "$APP_DIR" ]; then
    echo "⚠️ Target directory already exists. Preserving state."
else
    # 1. Scaffold base web framework (Vite/React/TS)
    echo "   -> Initializing Vite/React/TS base..."
    echo "" | npx -y create-vite "$APP_DIR" --template react-ts
fi

cd "$APP_DIR" || exit 1

# 2. Inject Capacitor Native Harness
echo "   -> Installing Capacitor Core dependencies..."
npm install @capacitor/core @capacitor/ios @capacitor/android
npm install -D @capacitor/cli

# 3. Initialize Capacitor with App Metadata
echo "   -> Initializing Capacitor Config..."
npx cap init "Sovereign Swarm" "com.sovereign.swarm" --web-dir dist

# 4. Bind Native Platforms
echo "   -> Adding iOS & Android native platforms..."
npx cap add ios
npx cap add android

# 5. Lock Telemetry to Native Storage (Preparing for the Phase Gate integration)
npm install @capacitor/preferences

echo "✅ [FACT] The foundation for the Native iOS/Android payload is now physically present."
echo "✅ Capacitor configuration is locked to 'com.sovereign.swarm'."
echo ""
echo "Next Step: We migrate the Generative UI 'Ghost Components' from the staging_index into the React App,"
echo "and bind the Whop OAuth SDK so native mobile users can unlock the 60-Story Roadmap features."
