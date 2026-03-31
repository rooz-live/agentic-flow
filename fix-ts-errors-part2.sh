#!/bin/bash
set -e
echo "🔧 Fixing additional TypeScript errors..."

# Fix: Install missing types for react-map-gl
npm install --save-dev @types/react-map-gl || true

# Fix: Discord handlers - add proper command type
if [ -f src/discord/handlers/command_handlers.ts ]; then
cat > /tmp/discord_fix.txt << 'EOF'
import { ChatInputCommandInteraction, CommandInteraction } from 'discord.js';
EOF

# Add import if not present
if ! grep -q "ChatInputCommandInteraction" src/discord/handlers/command_handlers.ts; then
  sed -i.bak '1i\
import { ChatInputCommandInteraction } from '\''discord.js'\'';
' src/discord/handlers/command_handlers.ts
fi

# Fix interaction.options calls - cast to ChatInputCommandInteraction
sed -i.bak 's/interaction\.options\.get/\(interaction as ChatInputCommandInteraction\).options.get/g' src/discord/handlers/command_handlers.ts
rm -f src/discord/handlers/command_handlers.ts.bak
fi

# Fix: Remove timeout from fetch calls (not standard)
if [ -f src/monitoring/automation-self-healing.ts ]; then
sed -i.bak '/timeout: healthCheck\.timeout \* 1000,/d' src/monitoring/automation-self-healing.ts
rm -f src/monitoring/automation-self-healing.ts.bak
fi

if [ -f src/monitoring/monitoring-orchestrator.ts ]; then
sed -i.bak '/timeout: healthCheck\.timeout \* 1000/d' src/monitoring/monitoring-orchestrator.ts
rm -f src/monitoring/monitoring-orchestrator.ts.bak
fi

# Fix: trading engine timestamp type (string vs number)
if [ -f src/trading/core/algorithmic_trading_engine.ts ]; then
sed -i.bak 's/timestamp: quote\.timestamp,/timestamp: new Date(quote.timestamp).toISOString(),/g' src/trading/core/algorithmic_trading_engine.ts
sed -i.bak 's/timestamp: current\.quote\.timestamp,/timestamp: new Date(current.quote.timestamp).toISOString(),/g' src/trading/core/algorithmic_trading_engine.ts
rm -f src/trading/core/algorithmic_trading_engine.ts.bak
fi

echo "✅ Additional TypeScript fixes applied!"
