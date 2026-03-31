# Trading MVP Paper Bot

## Overview
Local Docker deployment for paper trading bot with:
- Node.js/TS REST API: `/health`, `/portfolio` (GET), `/trades` (POST {symbol, side, quantity, price})
- WebSocket: `ws://localhost:3000` events: `marketUpdate` {symbol, price}, `trade`
- Postgres DB for trades/portfolio
- Redis for price caching
- Fake market data for SOXL/SOXS (random walk)

## Deploy
From `/Users/shahroozbhopti/Documents/code/investing/agentic-flow`:

```bash
docker compose -f docker/trading-mvp/docker-compose.yaml up -d --build
```

## Endpoints
- `curl http://localhost:3000/health`
- `curl http://localhost:3000/portfolio`
- `curl -X POST http://localhost:3000/trades \\
  -H "Content-Type: application/json" \\
  -d '{"symbol":"SOXL","side":"buy","quantity":10,"price":40.5}'`

## Logs
```bash
docker compose -f docker/trading-mvp/docker-compose.yaml logs -f app
```

## DB Access
Postgres: localhost:5432, tradingdb/trader/paperpass

Redis: localhost:6379

## Rollback/Cleanup
```bash
docker compose -f docker/trading-mvp/docker-compose.yaml down -v
```

**Note:** Local dev only. Passwords hardcoded for MVP; use secrets for prod.