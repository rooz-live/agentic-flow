#!/usr/bin/env bash
#
# Test Webhook Integration (Mock Mode)
# Validates notifiers work without real API calls
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "🧪 Testing Webhook Integration (Mock Mode)"
echo ""

# Test 1: Discord notifier imports correctly
echo "1️⃣ Testing Discord notifier..."
python3 -c "
import sys
sys.path.insert(0, 'scripts/integrations')
from discord_notifier import DiscordNotifier
print('✅ Discord notifier imports successfully')
"

# Test 2: Telegram notifier imports correctly
echo "2️⃣ Testing Telegram notifier..."
python3 -c "
import sys
sys.path.insert(0, 'scripts/integrations')
from telegram_notifier import TelegramNotifier
print('✅ Telegram notifier imports successfully')
"

# Test 3: Message formatting (no API calls)
echo "3️⃣ Testing message formatting..."
python3 << 'PYEOF'
import sys
sys.path.insert(0, 'scripts/integrations')
from discord_notifier import DiscordNotifier

# Test color mapping
notifier = DiscordNotifier.__new__(DiscordNotifier)
assert notifier._get_color_for_confidence(0.9) == 0x00FF00, "High confidence should be green"
assert notifier._get_color_for_confidence(0.7) == 0xFFAA00, "Medium confidence should be orange"
assert notifier._get_color_for_confidence(0.3) == 0xFF0000, "Low confidence should be red"
print('✅ Discord color mapping works')

from telegram_notifier import TelegramNotifier
tg_notifier = TelegramNotifier.__new__(TelegramNotifier)
assert tg_notifier._get_emoji_for_confidence(0.9) == "✅", "High confidence should be ✅"
assert tg_notifier._get_emoji_for_confidence(0.7) == "⚠️", "Medium confidence should be ⚠️"
assert tg_notifier._get_emoji_for_confidence(0.3) == "❌", "Low confidence should be ❌"
print('✅ Telegram emoji mapping works')
PYEOF

# Test 4: CLI integration
echo "4️⃣ Testing CLI integration..."
if grep -q "notify)" "$HOME/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/11-ADVOCACY-PIPELINE/advocate"; then
    echo "✅ advocate notify command exists"
else
    echo "❌ advocate notify command missing"
    exit 1
fi

echo ""
echo "✅ All webhook tests passed!"
echo ""
echo "📝 To test with real credentials:"
echo "   export DISCORD_WEBHOOK_URL='https://discord.com/api/webhooks/...'"
echo "   export TELEGRAM_BOT_TOKEN='...'"
echo "   export TELEGRAM_CHAT_ID='...'"
echo "   advocate notify test"
