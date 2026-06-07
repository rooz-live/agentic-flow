#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STX="${STX_HOST:-ubuntu@stx-aio-0.corp.interface.tag.ooo}"
scp -P 2222 -i "${STX_KEY:-$HOME/.ssh/starlingx_key}" "$REPO_ROOT/src/proxies/edge_gateway.cfg" "$STX:/tmp/edge_gateway.cfg"
ssh -p 2222 -i "${STX_KEY:-$HOME/.ssh/starlingx_key}" "$STX" "sudo cp /tmp/edge_gateway.cfg /etc/caddy/Caddyfile && sudo caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy"
