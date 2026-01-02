# Cloudflare Alternatives for Discord Bot Hosting

**Issue**: Cloudflare presents risks to ROAM (Research, Operations, Analysis, Maintenance)  
**Goal**: Deploy Discord bot with minimal external dependencies  
**Status**: CRITICAL - blocks 4 roadmap items

---

## Option 1: Local Deployment (RECOMMENDED) ⭐

**Deploy bot on local machine/existing infrastructure - NO Cloudflare needed**

### Advantages
- ✅ Zero external dependencies
- ✅ Full control over data/logs
- ✅ No vendor lock-in
- ✅ Free (use existing hardware)
- ✅ Can use existing Hivelocity device (24460)
- ✅ Faster iteration cycles

### Implementation Path

#### A. Local Development Server (Immediate - 30 min)
```bash
# Run bot locally for testing
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow
npm install
node scripts/discord_trading_bot.py --local --port 3000

# Expose via ngrok for Discord webhook
ngrok http 3000
# Copy ngrok URL → Discord Developer Portal → Interactions Endpoint URL
```

**Pros**: Immediate testing, no infrastructure needed  
**Cons**: Not production (ngrok URLs expire)

#### B. Hivelocity Device Deployment (Production - 2 hours)
```bash
# Deploy to existing device-24460 (stx-aio-0.corp.interface.tag.ooo)
# Already accessible via SSH port 2222

# 1. SSH to device
ssh -p 2222 stx-aio-0.corp.interface.tag.ooo

# 2. Install dependencies
sudo apt update && sudo apt install -y python3.11 nodejs npm nginx

# 3. Deploy bot
git clone <repo> /opt/agentic-flow
cd /opt/agentic-flow
npm install
python3 scripts/discord_trading_bot.py --daemon --port 8080

# 4. Configure nginx reverse proxy
sudo nano /etc/nginx/sites-available/discord-bot
# Proxy pass to localhost:8080
# SSL via Let's Encrypt

# 5. Update Discord webhook URL
# https://stx-aio-0.corp.interface.tag.ooo/api/discord
```

**Pros**: Production-ready, existing infrastructure, full control  
**Cons**: Requires nginx config, SSL setup (2 hours)

#### C. Docker Deployment (Alternative - 1 hour)
```bash
# Containerized deployment on device-24460
docker build -t discord-bot .
docker run -d --name discord-bot \
  --restart unless-stopped \
  -p 8080:8080 \
  -e DISCORD_APPLICATION_ID=$DISCORD_APPLICATION_ID \
  -e DISCORD_PUBLIC_KEY=$DISCORD_PUBLIC_KEY \
  -e DISCORD_BOT_TOKEN=$DISCORD_BOT_TOKEN \
  discord-bot
```

**Pros**: Isolated, easy rollback, reproducible  
**Cons**: Requires Docker on device

---

## Option 2: Railway.app (Cloudflare Alternative)

**PaaS alternative - similar to Cloudflare Workers but different vendor**

### Advantages
- ✅ Free tier (500 hours/month)
- ✅ Git-based deployment
- ✅ Auto SSL
- ✅ Environment variable management
- ✅ Logs/monitoring included

### Implementation
```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Deploy
railway init
railway up

# 4. Set environment variables
railway variables set DISCORD_APPLICATION_ID=...
railway variables set DISCORD_PUBLIC_KEY=...
railway variables set DISCORD_BOT_TOKEN=...

# 5. Get deployment URL
railway domain
```

**Pros**: Simple, free tier sufficient  
**Cons**: Another vendor dependency (same risk as Cloudflare)

---

## Option 3: AWS Lambda (Serverless)

**Amazon's serverless platform**

### Advantages
- ✅ Free tier (1M requests/month)
- ✅ AWS credentials already present
- ✅ Scales automatically
- ✅ API Gateway integration

### Implementation
```bash
# 1. Package bot as Lambda function
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow
zip -r discord-bot.zip scripts/discord_trading_bot.py config/ package.json

# 2. Deploy via AWS CLI
aws lambda create-function \
  --function-name discord-trading-bot \
  --runtime python3.11 \
  --handler discord_trading_bot.handler \
  --zip-file fileb://discord-bot.zip \
  --role arn:aws:iam::ACCOUNT_ID:role/lambda-execution

# 3. Create API Gateway endpoint
aws apigatewayv2 create-api \
  --name discord-bot-api \
  --protocol-type HTTP \
  --target arn:aws:lambda:us-west-1:ACCOUNT_ID:function:discord-trading-bot
```

**Pros**: AWS already in use, free tier  
**Cons**: More complex setup, AWS lock-in

---

## Option 4: Vercel (Next.js/Serverless)

**Similar to Cloudflare Workers, different vendor**

### Advantages
- ✅ Free tier
- ✅ Git integration
- ✅ Edge network
- ✅ Simple deployment

### Implementation
```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy
vercel --prod

# 3. Configure environment variables
vercel env add DISCORD_APPLICATION_ID
vercel env add DISCORD_PUBLIC_KEY
vercel env add DISCORD_BOT_TOKEN
```

**Pros**: Simple, fast deployment  
**Cons**: Another vendor (same risk as Cloudflare)

---

## Comparison Matrix

| Option | Setup Time | Monthly Cost | Control | Vendor Risk | Production Ready |
|--------|------------|--------------|---------|-------------|------------------|
| **Local/Device** | 30min-2hr | $0 | ✅ Full | ✅ None | ✅ Yes |
| Railway.app | 15min | $0 (free tier) | ⚠️ Medium | ⚠️ Vendor lock | ✅ Yes |
| AWS Lambda | 1-2hr | $0 (free tier) | ⚠️ Medium | ⚠️ AWS lock | ✅ Yes |
| Vercel | 10min | $0 (free tier) | ⚠️ Medium | ⚠️ Vendor lock | ✅ Yes |
| Cloudflare | 10min | $0 (free tier) | ⚠️ Medium | 🔴 **ROAM risk** | ✅ Yes |

---

## Recommendation: Incremental Path

### Phase 1: Local Development (NOW - 30 min)
**Goal**: Test bot functionality immediately

```bash
# 1. Get Discord credentials (10 min)
# Follow DISCORD_CREDENTIAL_SETUP.md

# 2. Run locally with ngrok (15 min)
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow
npm install
node scripts/discord_trading_bot.py --local --port 3000 &
ngrok http 3000

# 3. Configure Discord webhook
# Copy ngrok HTTPS URL → Discord Developer Portal
# General Information → Interactions Endpoint URL
# Paste: https://abc123.ngrok.io/api/discord

# 4. Test commands
# In Discord: /portfolio, /earnings, /alert
```

**Exit Criteria**:
- [ ] Bot responds to /portfolio command
- [ ] No errors in logs
- [ ] Latency <3 seconds

---

### Phase 2: Production Device Deployment (NEXT - 2 hours)

**Goal**: Deploy to Hivelocity device-24460 for production stability

```bash
# 1. Prepare deployment package
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow
./scripts/prepare_deployment.sh

# 2. SSH to device
ssh -p 2222 stx-aio-0.corp.interface.tag.ooo

# 3. Deploy with systemd service
sudo cp deployment/discord-bot.service /etc/systemd/system/
sudo systemctl enable discord-bot
sudo systemctl start discord-bot

# 4. Configure nginx reverse proxy
sudo cp deployment/nginx-discord-bot.conf /etc/nginx/sites-available/discord-bot
sudo ln -s /etc/nginx/sites-available/discord-bot /etc/nginx/sites-enabled/
sudo systemctl reload nginx

# 5. Setup SSL with Let's Encrypt
sudo certbot --nginx -d stx-aio-0.corp.interface.tag.ooo

# 6. Update Discord webhook URL
# https://stx-aio-0.corp.interface.tag.ooo/api/discord
```

**Exit Criteria**:
- [ ] Bot runs as systemd service (auto-restart)
- [ ] HTTPS endpoint accessible
- [ ] Health check returns 200 OK
- [ ] 24-hour uptime verified

---

### Phase 3: Optional Cloudflare Alternative (LATER)

**Only if device becomes unavailable or needs CDN**

Choose Railway.app or AWS Lambda based on:
- **Railway**: Simpler, faster setup
- **AWS Lambda**: Already using AWS, more integration options

---

## Security Considerations

### Local/Device Deployment
- ✅ Credentials stored in environment variables
- ✅ No third-party access to tokens
- ✅ Full audit trail in local logs
- ✅ Can run in isolated network

### External Platform (Railway/AWS/Vercel)
- ⚠️ Credentials visible to platform
- ⚠️ Platform can inspect traffic
- ⚠️ Dependent on platform security
- ⚠️ Data sovereignty concerns

---

## Implementation Scripts Needed

### 1. Local Bot Runner
**File**: `scripts/run_discord_bot_local.sh`
```bash
#!/bin/bash
# Load credentials from .env.production
source config/.env.production

# Start bot with health checks
python3 scripts/discord_trading_bot.py \
  --port 3000 \
  --log-level info \
  --health-check-interval 60
```

### 2. Device Deployment Script
**File**: `scripts/deploy_to_device.sh`
```bash
#!/bin/bash
# Deploy to Hivelocity device-24460
DEVICE="stx-aio-0.corp.interface.tag.ooo"
PORT="2222"

# Copy files
scp -P $PORT -r . root@$DEVICE:/opt/agentic-flow/

# Install dependencies & start service
ssh -p $PORT root@$DEVICE << 'EOF'
cd /opt/agentic-flow
npm install
systemctl restart discord-bot
systemctl status discord-bot
EOF
```

### 3. Health Check Monitor
**File**: `scripts/discord_bot_healthcheck.py`
```python
#!/usr/bin/env python3
import requests
import sys

endpoint = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000/health"
response = requests.get(endpoint, timeout=5)

if response.status_code == 200:
    print(f"✅ Healthy: {response.json()}")
    sys.exit(0)
else:
    print(f"❌ Unhealthy: {response.status_code}")
    sys.exit(1)
```

---

## Decision Matrix

**Choose Local/Device if**:
- ✅ Want full control
- ✅ Already have infrastructure (device-24460)
- ✅ Minimize vendor dependencies
- ✅ Need audit trail/compliance
- ✅ Can tolerate 2-hour setup

**Choose Railway/Vercel if**:
- ✅ Want fastest time to production (<15 min)
- ✅ Don't have infrastructure
- ✅ Okay with vendor dependency
- ✅ Free tier sufficient

**Choose AWS Lambda if**:
- ✅ Already using AWS
- ✅ Want serverless
- ✅ Need auto-scaling
- ✅ Can tolerate complexity

---

## Recommended Path Forward

**IMMEDIATE (NOW)**:
1. Get Discord credentials (10 min) → `docs/DISCORD_CREDENTIAL_SETUP.md`
2. Test locally with ngrok (15 min) → Validate bot works
3. Verify commands functional → Unblocks development

**NEXT**:
4. Deploy to device-24460 (2 hours) → Production stability
5. Configure nginx + SSL (30 min) → HTTPS endpoint
6. Update Discord webhook → Production URL

**LATER** (if needed):
7. Evaluate Railway.app as backup → Redundancy option

**Status**: Can unblock all 4 roadmap items without Cloudflare
