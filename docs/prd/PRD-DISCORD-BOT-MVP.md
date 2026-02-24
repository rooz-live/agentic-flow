# PRD: Discord Bot MVP

## Objective
Deliver a notification-only Discord bot for go.rooz.live and decisioncall.com that receives webhooks and posts formatted updates to designated channels.

**Status**: 🟢 READY FOR IMPLEMENTATION  
**Target**: Notification-only bot for go.rooz.live and decisioncall.com  
**Phase**: P3.2 - MVP Validation  
**Date**: 2025-11-15

---

## 🎯 **MVP Scope - MINIMAL VIABLE PRODUCT**

### **What It IS**
- ✅ **Read-only notification bot** - Posts updates to designated channels
- ✅ **Webhook receiver** - Receives events from Twitch/Stripe/system alerts
- ✅ **Status commands** - Simple commands like `!status`, `!ping`
- ✅ **Graceful error handling** - Logs errors, doesn't crash

### **What It IS NOT**
- ❌ **Not an admin bot** - No moderation, permissions management
- ❌ **Not a chatbot** - No AI responses, conversation handling
- ❌ **Not a data scraper** - No member scraping, message archiving
- ❌ **Not a trading bot** - No financial signals, portfolio advice

---

## 🔐 **Permission Model - MINIMUM REQUIRED**

### **Bot Permissions (Bitfield)**
```
VIEW_CHANNEL       = 1024    # Read channel info
SEND_MESSAGES      = 2048    # Post notifications
EMBED_LINKS        = 16384   # Rich embeds for notifications
READ_MESSAGE_HISTORY = 65536 # Context for responses (optional)
```

**Total Permission Integer**: `83968` (minimal bot)

### **OAuth2 Scopes**
```
bot              # Bot user
applications.commands  # Slash commands (future)
```

### **NOT REQUIRED**
- ❌ Administrator
- ❌ Manage Server
- ❌ Manage Roles
- ❌ Kick/Ban Members
- ❌ Manage Messages (delete others' messages)

---

## 📊 **Rate Limit Strategy**

### **Discord API Rate Limits**
- Global: **50 requests per second**
- Per-route: **5 requests per 5 seconds** per route
- Webhook: **30 requests per minute** per webhook

### **Implementation**
```python
from discord.ext import commands
import asyncio

class RateLimiter:
    def __init__(self):
        self.last_request = {}
    
    async def wait_if_needed(self, route: str, delay: float = 1.0):
        """Token bucket implementation"""
        now = time.time()
        if route in self.last_request:
            elapsed = now - self.last_request[route]
            if elapsed < delay:
                await asyncio.sleep(delay - elapsed)
        self.last_request[route] = time.time()
```

### **Burst Protection**
- Queue messages if rate limit hit
- Batch notifications (5-second windows)
- Drop low-priority messages if queue > 100

---

## 💾 **Message Persistence Strategy**

### **Phase 1 (MVP): In-Memory Queue**
- Store last 100 sent messages in deque
- No database persistence
- Survives for session only

### **Phase 2 (Future): SQLite Persistence**
```sql
CREATE TABLE discord_messages (
    id INTEGER PRIMARY KEY,
    channel_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    content TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT  -- 'sent', 'failed', 'rate_limited'
);
```

### **Message Retention**
- Keep last 1000 messages
- Auto-delete after 30 days
- No PII/financial data in messages

---

## 🔑 **Authentication Model**

### **Bot Authentication** (Discord)
```
BOT_TOKEN=<from Discord Developer Portal>
```
- Stored in `.env.local` (gitignored)
- Never commit to repo
- Rotate every 90 days

### **Webhook Authentication** (Incoming events)
```python
import hmac
import hashlib

def verify_webhook_signature(payload: str, signature: str, secret: str) -> bool:
    """Verify webhook came from trusted source"""
    expected = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)
```

### **User Authentication** (Bot commands)
- No user auth required for MVP (public commands)
- Future: Role-based access control (RBAC)

---

## 🚀 **MVP Feature Set - FIRST DEPLOYMENT**

### **Core Features**
1. **Health Check Command**
   ```
   !ping  → "Pong! Latency: 45ms"
   !status → "Bot: Online | Uptime: 2h 15m"
   ```

2. **Notification Posting**
   ```python
   async def send_notification(channel_id: str, message: str):
       channel = bot.get_channel(channel_id)
       await channel.send(embed=create_embed(message))
   ```

3. **Webhook Receiver**
   ```python
   @app.route('/webhooks/discord', methods=['POST'])
   def discord_webhook():
       data = request.json
       # Forward to Discord channel
       asyncio.run(send_notification(data['channel'], data['message']))
       return {'status': 'ok'}, 200
   ```

4. **Error Handling**
   ```python
   @bot.event
   async def on_error(event, *args, **kwargs):
       logging.error(f"Error in {event}: {sys.exc_info()}")
       # Don't crash - log and continue
   ```

### **Nice-to-Have (Phase 2)**
- Slash commands (`/ping`, `/status`)
- Rich embeds with images
- Reaction-based acknowledgment
- Multi-guild support

---

## 📏 **Technical Specifications**

### **Tech Stack**
- **Framework**: `discord.py` (v2.3+)
- **Web Server**: `aiohttp` (async)
- **Database**: SQLite (future)
- **Deployment**: Docker container or SystemD service

### **Dependencies**
```bash
pip install discord.py aiohttp python-dotenv
```

### **Project Structure**
```
discord-bot/
├── bot.py              # Main bot logic
├── cogs/
│   ├── notifications.py  # Notification handler
│   └── health.py         # Health check commands
├── webhooks.py         # Webhook receiver
├── config.py           # Configuration
├── requirements.txt    # Dependencies
└── .env.local          # Secrets (gitignored)
```

---

## 🔒 **Security Requirements**

### **MUST HAVE**
1. ✅ Token stored in environment, not code
2. ✅ Webhook signature verification
3. ✅ Rate limiting enforced
4. ✅ Input validation (no command injection)
5. ✅ Logging without sensitive data

### **SHOULD HAVE**
6. ✅ HTTPS-only webhook endpoints
7. ✅ Bot token rotation every 90 days
8. ✅ Error messages don't leak internals
9. ✅ Graceful degradation on API failures
10. ✅ No hardcoded channel IDs (use config)

---

## 📈 **Monitoring & Metrics**

### **Key Metrics**
- **Uptime**: Target 99.9%
- **Message Delivery**: >95% success rate
- **Latency**: <500ms p95
- **Rate Limit Hits**: <1% of requests
- **Error Rate**: <0.1%

### **Logging**
```python
import logging

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO,
    handlers=[
        logging.FileHandler('logs/discord_bot.log'),
        logging.StreamHandler()
    ]
)
```

### **Health Check Endpoint**
```python
@app.route('/health', methods=['GET'])
def health():
    return {
        'status': 'healthy' if bot.is_ready() else 'degraded',
        'uptime': time.time() - start_time,
        'latency_ms': bot.latency * 1000
    }
```

---

## 🚦 **Deployment Process**

### **Phase 1: Local Testing**
```bash
# Set environment variables
export DISCORD_BOT_TOKEN="your_token_here"
export DISCORD_CHANNEL_ID="1234567890"

# Run bot
python3 bot.py
```

### **Phase 2: Staging (Private Guild)**
- Deploy to test Discord server
- Validate rate limiting
- Test webhook flow
- Measure latency

### **Phase 3: Production (10% Rollout)**
- Deploy to primary guild
- Monitor for 24 hours
- Gradual ramp to 100%

### **Rollback Procedure**
```bash
# Kill bot process
pkill -f "python3 bot.py"

# Revert to previous version
git checkout v0.0.1
python3 bot.py
```

---

## ✅ **Acceptance Criteria**

| Criterion | Target | Validation |
|-----------|--------|------------|
| Bot connects to Discord | 100% | `bot.is_ready()` returns True |
| Responds to `!ping` | <500ms | Measure latency |
| Sends notification | 95% success | Post test message |
| Rate limit handling | 0 crashes | Spam test |
| Webhook signature verified | 100% | Test with invalid signature |
| Error logging | No crashes | Inject errors, check logs |
| Uptime | >99% | Monitor for 24h |

---

## 🗂️ **Configuration**

### **Environment Variables**
```bash
# .env.local (gitignored)
DISCORD_BOT_TOKEN=your_token_here
DISCORD_GUILD_ID=1234567890
DISCORD_CHANNEL_ID=9876543210
WEBHOOK_SECRET=your_webhook_secret

# Optional
LOG_LEVEL=INFO
RATE_LIMIT_BURST=5
RATE_LIMIT_WINDOW=5
```

### **Bot Invite URL**
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=83968&scope=bot
```

---

## 📋 **Next Steps**

1. ✅ Requirements documented (this file)
2. ⏳ Create bot in Discord Developer Portal
3. ⏳ Implement `bot.py` skeleton
4. ⏳ Test locally with test guild
5. ⏳ Deploy to staging
6. ⏳ Production rollout (10% → 100%)

---

**Status**: ✅ MVP requirements complete - ready for implementation  
**Risk Level**: 🟢 Low (read-only, minimal permissions, rate-limited)  
**Estimated Implementation**: 4-6 hours  
**Approval**: Auto-approved (MVP scope, no production risk)

---

## Success Metrics
- Bot uptime >= 99%
- Webhook processing latency < 500ms
- Rate limit violations = 0 per day
- Message delivery success rate >= 99.5%

## DoR
- [ ] Discord Developer Portal bot token available
- [ ] Target channels identified (go.rooz.live, decisioncall.com)
- [ ] Webhook sources defined (Twitch, Stripe, system alerts)
- [ ] Permission model reviewed (83968 bitfield)

## DoD
- [ ] All 4 core features operational (!ping, !status, notifications, webhooks)
- [ ] Rate limiter tested under burst conditions
- [ ] Error handling verified (no crash on malformed input)
- [ ] Coherence validation >= 85%
- [ ] ADR documenting bot architecture decisions
