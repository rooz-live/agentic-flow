# Twitch EventSub Integration - Deployment Guide

## Overview

The Twitch EventSub integration listens for `stream.online` events and automatically posts governance alerts to your Discord channel when your stream goes live.

## Architecture

```
Twitch Stream Goes Live
    ↓
Twitch EventSub sends webhook notification
    ↓
Flask webhook server receives notification
    ↓
Runs governance agent (tools/federation/governance_agent.ts)
    ↓
Posts governance summary to Discord channel
    ↓
Logs all activity to .goalie/pattern_metrics.jsonl
```

## Prerequisites

✅ Twitch App credentials configured in `.env.production`:
- `TWITCH_CLIENT_ID`
- `TWITCH_CLIENT_SECRET`
- `TWITCH_CHANNEL_NAME`
- `TWITCH_WEBHOOK_SECRET`

✅ Discord credentials configured:
- `DISCORD_BOT_TOKEN`
- `DISCORD_ALERTS_CHANNEL_ID`

✅ Python dependencies installed:
- `flask`
- `requests`
- `discord.py` (for bot)

## Deployment Options

### Option A: Local Testing with ngrok (Recommended for Development)

**Step 1**: Install ngrok
```bash
brew install ngrok
# OR download from https://ngrok.com/download
```

**Step 2**: Start ngrok tunnel
```bash
ngrok http 8080
```

Copy the HTTPS forwarding URL (e.g., `https://abc123.ngrok-free.app`)

**Step 3**: Start EventSub listener
```bash
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow
source venv/bin/activate
export $(grep -v '^#' config/.env.production | xargs)
python3 scripts/integrations/twitch_eventsub.py \
    --port 8080 \
    --public-url https://abc123.ngrok-free.app/twitch/webhook
```

### Option B: Production Deployment (Cloudflare Workers)

**Coming Soon**: Cloudflare Workers implementation will provide:
- Zero infrastructure maintenance
- Auto-scaling
- Global edge deployment
- Built-in DDoS protection

### Option C: Production Server (Direct HTTPS)

If you have a server with HTTPS already set up:

```bash
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow
source venv/bin/activate
export $(grep -v '^#' config/.env.production | xargs)
python3 scripts/integrations/twitch_eventsub.py \
    --port 8080 \
    --host 0.0.0.0 \
    --public-url https://your-domain.com/twitch/webhook
```

**Important**: 
- Endpoint MUST be publicly accessible
- MUST use HTTPS (Twitch requirement)
- Port must not be blocked by firewall

## How It Works

### 1. Startup Sequence

When you start the EventSub listener:

1. **Authenticate with Twitch**: Gets app access token using client credentials
2. **Get User ID**: Looks up user ID for your channel name (`yoservice`)
3. **Subscribe to EventSub**: Registers webhook for `stream.online` events
4. **Start Flask Server**: Listens on specified port for Twitch notifications

### 2. Webhook Verification

Twitch sends a verification challenge when you first subscribe:

```
POST /twitch/webhook
Headers:
  Twitch-Eventsub-Message-Type: webhook_callback_verification
  Twitch-Eventsub-Message-Signature: sha256=...
Body:
  { "challenge": "random-string" }
```

The listener:
- Verifies HMAC-SHA256 signature
- Returns the challenge string
- Subscription becomes active

### 3. Stream Online Event

When your stream goes live, Twitch sends:

```
POST /twitch/webhook
Headers:
  Twitch-Eventsub-Message-Type: notification
  Twitch-Eventsub-Message-Signature: sha256=...
Body:
  {
    "subscription": {...},
    "event": {
      "broadcaster_user_id": "123456",
      "broadcaster_user_name": "yoservice",
      "started_at": "2025-12-03T12:34:56Z"
    }
  }
```

The listener:
1. Verifies signature
2. Executes: `npx tsx tools/federation/governance_agent.ts --goalie-dir .goalie --json`
3. Parses governance results (reviews, execution metrics, economic gaps)
4. Posts Discord embed to channel `1372723699068829717`
5. Logs all activity to pattern metrics

## Discord Alert Format

When the stream goes live, your Discord channel receives:

```
🔴 Stream Online - Governance Alert

yoservice just went live!

📈 Governance Reviews: Total: 42 | OK: 38 | Failed: 4
🚀 Execution Metrics: Actions Done: 87.5% | Avg Cycle: 12.3s
🎯 Top Economic Gaps:
  • pattern-name-1 (impact: 1250)
  • pattern-name-2 (impact: 890)
  • pattern-name-3 (impact: 650)

Triggered by Twitch EventSub
```

## Testing

### Manual Test (Without Going Live)

You can test the Discord posting function directly:

```python
# Test Discord posting
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow
source venv/bin/activate
python3 << 'EOF'
import os
import sys
sys.path.insert(0, "scripts/integrations")
from twitch_eventsub import post_to_discord

# Mock governance data
gov_data = {
    "governanceSummary": {"total": 10, "ok": 8, "failed": 2},
    "relentlessExecution": {"pctActionsDone": 75.0, "avgCycleTimeSec": 15.2},
    "topEconomicGaps": [
        {"pattern": "test-pattern", "totalImpactAvg": 500}
    ]
}

stream_info = {
    "broadcaster_user_name": "TEST_STREAM",
    "started_at": "2025-12-03T12:00:00Z"
}

os.environ["DISCORD_BOT_TOKEN"] = "YOUR_BOT_TOKEN"
os.environ["DISCORD_ALERTS_CHANNEL_ID"] = "1372723699068829717"

result = post_to_discord(gov_data, stream_info)
print(f"Test result: {'✅ Success' if result else '❌ Failed'}")
EOF
```

### Live Stream Test

1. Start the EventSub listener (see deployment options above)
2. Go live on Twitch channel `yoservice`
3. Wait 10-30 seconds for webhook notification
4. Check Discord channel for governance alert
5. Verify pattern metrics logged to `.goalie/pattern_metrics.jsonl`

## Pattern Metrics Logged

All EventSub activities are logged:

### `twitch-eventsub-subscribed`
- When: Subscription created successfully
- Gate: `subscription-created`
- Metrics: `user_id`, `subscription_id`

### `twitch-webhook-verified`
- When: Twitch webhook verification challenge completed
- Gate: `webhook-verification`

### `twitch-stream-online`
- When: Stream goes live notification received
- Gate: `stream-notification`
- Metrics: `broadcaster_id`, `broadcaster_name`

### `discord-governance-alert-posted`
- When: Governance alert posted to Discord
- Gate: `stream-online`
- Metrics: `channel_id`

### `twitch-subscription-revoked`
- When: Twitch revokes the subscription (rare)
- Gate: `subscription-revocation`

## Monitoring

### Check Subscription Status

```bash
# Get app access token
curl -X POST "https://id.twitch.tv/oauth2/token" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "grant_type=client_credentials"

# List active subscriptions
curl -X GET "https://api.twitch.tv/helix/eventsub/subscriptions" \
  -H "Client-ID: YOUR_CLIENT_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Health Check Endpoint

```bash
curl http://localhost:8080/health
```

Response:
```json
{
  "status": "ok",
  "service": "twitch-eventsub",
  "timestamp": "2025-12-03T12:34:56.789Z"
}
```

### View Pattern Metrics

```bash
tail -f .goalie/pattern_metrics.jsonl | grep twitch
```

## Troubleshooting

### Issue: Subscription fails with 403 Forbidden

**Cause**: Invalid client credentials or webhook signature secret

**Fix**: 
1. Verify `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` in `.env.production`
2. Regenerate client secret at https://dev.twitch.tv/console/apps
3. Ensure `TWITCH_WEBHOOK_SECRET` is set

### Issue: Webhook verification challenge fails

**Cause**: Public URL not accessible or signature verification failing

**Fix**:
1. Test ngrok URL is publicly accessible: `curl https://your-ngrok-url.ngrok-free.app/health`
2. Ensure Flask server is running and listening on correct port
3. Check ngrok tunnel hasn't expired (free tier expires after 2 hours)

### Issue: Discord alert not posting

**Cause**: Invalid bot token or channel ID

**Fix**:
1. Verify `DISCORD_BOT_TOKEN` in `.env.production`
2. Verify `DISCORD_ALERTS_CHANNEL_ID` (right-click channel → Copy ID)
3. Ensure bot has permission to post in the channel (Send Messages permission)
4. Test bot manually: `python3 scripts/integrations/discord_bot.py`

### Issue: Governance agent fails to run

**Cause**: Missing governance script or Node.js dependencies

**Fix**:
1. Verify `tools/federation/governance_agent.ts` exists
2. Install dependencies: `npm install`
3. Test governance agent: `npx tsx tools/federation/governance_agent.ts --goalie-dir .goalie --json`

### Issue: Multiple duplicate alerts

**Cause**: Multiple subscriptions active or webhook called multiple times

**Fix**:
1. List and delete duplicate subscriptions using Twitch API
2. Ensure only one EventSub listener is running
3. Check pattern metrics for duplicate `twitch-stream-online` events

## Production Considerations

### Security

- ✅ HMAC-SHA256 signature verification prevents unauthorized webhooks
- ✅ Secrets stored in `.env.production` (never committed to git)
- ⚠️ Consider rate limiting on webhook endpoint
- ⚠️ Add authentication for health check endpoint in production

### Reliability

- ⚠️ Flask development server not production-ready (use gunicorn/waitress)
- ⚠️ No automatic reconnection if Flask crashes
- ⚠️ ngrok free tier has 2-hour session limit
- ✅ Twitch retries webhook delivery on failure (exponential backoff)
- ✅ Pattern metrics provide audit trail

### Scaling

- Current: Single Flask process handles ~100 req/sec
- For high traffic: Deploy to Cloudflare Workers (Phase 3)
- For multiple channels: Add channel ID to subscription condition

## Next Steps

### Phase 3: Production Hardening

1. **Cloudflare Workers Deployment**
   - Serverless, auto-scaling webhook endpoint
   - Zero infrastructure maintenance
   - Global edge deployment for low latency

2. **Production WSGI Server**
   - Replace Flask dev server with gunicorn
   - Multi-worker process pool
   - Automatic restart on crash

3. **Monitoring & Alerting**
   - Prometheus metrics endpoint
   - CloudWatch logs integration
   - Dead letter queue for failed governance runs

4. **Enhanced Features**
   - Subscribe to multiple event types (stream.offline, channel.update)
   - Discord slash command to toggle alerts
   - Custom alert templates per stream category

## Configuration Summary

**Current Setup**:
- Channel: `yoservice`
- Event: `stream.online`
- Discord Channel: `1372723699068829717`
- Webhook Secret: Configured in `.env.production`

**Files**:
- EventSub Listener: `scripts/integrations/twitch_eventsub.py`
- Environment Config: `config/.env.production`
- Pattern Metrics: `.goalie/pattern_metrics.jsonl`
- Governance Agent: `tools/federation/governance_agent.ts`

---

**Status**: Phase 2 Complete ✅  
**Next**: Production deployment or continue with other NEXT items
