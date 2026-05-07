#!/usr/bin/env bash
# setup_yabai_macos.sh
# Installs and configures Yabai (macOS native tiling window manager)
# Sets specific rules for the Advocacy Dashboard (port 5173).

set -euo pipefail

echo "========================================================="
echo "🪟 Setting up Yabai (macOS Native Tiling Manager)"
echo "========================================================="

if ! command -v brew &> /dev/null; then
    echo "❌ Error: Homebrew is required. Please install it first."
    exit 1
fi

echo "📦 Installing yabai and skhd via Homebrew..."
brew install koekeishiya/formulae/yabai
brew install koekeishiya/formulae/skhd

echo "⚙️ Configuring yabai rules for Advocacy Pipeline..."
mkdir -p ~/.config/yabai
cat << 'EOF' > ~/.config/yabai/yabairc
#!/usr/bin/env sh

# global settings
yabai -m config layout bsp
yabai -m config window_placement second_child

# Padding
yabai -m config top_padding    10
yabai -m config bottom_padding 10
yabai -m config left_padding   10
yabai -m config right_padding  10
yabai -m config window_gap     10

# Rules for Advocacy Pipeline
# Forces any browser window with "Trading Dashboard" or "SystemicOS" to tile properly
yabai -m rule --add app="^Google Chrome$" title="Trading Dashboard" manage=on
yabai -m rule --add app="^Google Chrome$" title="SystemicOS" manage=on
EOF

chmod +x ~/.config/yabai/yabairc

echo "✅ Configuration complete."
echo "⚠️ Note: Yabai requires Accessibility permissions in macOS System Settings."
echo "To start the services: brew services start yabai && brew services start skhd"
