#!/usr/bin/env bash

set -euo pipefail

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly DISCORD_SRC_DIR="$SCRIPT_DIR/../src/discord"

mkdir -p "$DISCORD_SRC_DIR"

if [[ "$DRY_RUN" == false ]]; then
  cd "$DISCORD_SRC_DIR"
  if [[ ! -f package.json ]]; then
    npm init -y >/dev/null 2>&1
    npm install discord.js@latest typescript @types/node @types/discord.js ts-node --save-dev --no-optional --no-funding >/dev/null 2>&1
    cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["bot.ts"],
  "exclude": ["node_modules", "dist"]
}
EOF
  fi
fi

BUILD_CMD="cd '$DISCORD_SRC_DIR' && npx tsc bot.ts"
RUN_CMD="cd '$DISCORD_SRC_DIR/dist' && node bot.js"

if [[ "$DRY_RUN" == true ]]; then
  echo "$BUILD_CMD"
  echo "nohup $RUN_CMD > bot.log 2>&1 &"
else
  eval "$BUILD_CMD"
  nohup sh -c "$RUN_CMD" > "$DISCORD_SRC_DIR/bot.log" 2>&1 &
  echo \$! > "$DISCORD_SRC_DIR/bot.pid"
fi

echo "Discord bot deployed successfully."
echo "Logs: $DISCORD_SRC_DIR/bot.log"
echo "Rollback: kill \$(cat $DISCORD_SRC_DIR/bot.pid 2>/dev/null || true) && rm -f $DISCORD_SRC_DIR/bot.pid $DISCORD_SRC_DIR/bot.log"
echo "Monitoring: tail -f $DISCORD_SRC_DIR/bot.log, Discord server audit logs"