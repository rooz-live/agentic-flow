# Multi-Tenant Infrastructure Deployment Checklist

## 📋 Pre-Deployment Checklist

### 1. DNS Configuration (Priority 1)

**Configure A records for 6 domains pointing to StarlingX IP:**

```bash
# Your StarlingX IP: ********** (stx-aio-0.corp.interface.tag.ooo)

# DNS Provider Configuration (Cloudflare/Route53/Other):
#
# Domain                          Type    Value              TTL
# ----------------------------------------------------------------
# app.interface.tag.ooo           A       **********         300
# billing.interface.tag.ooo       A       **********         300
# blog.interface.tag.ooo          A       **********         300
# dev.interface.tag.ooo           A       **********         300
# forum.interface.tag.ooo         A       **********         300
# starlingx.interface.tag.ooo     A       **********         300
```

**Verification Commands:**
```bash
# Wait 5-10 minutes for DNS propagation, then verify:
dig +short app.interface.tag.ooo
dig +short billing.interface.tag.ooo
dig +short blog.interface.tag.ooo
dig +short dev.interface.tag.ooo
dig +short forum.interface.tag.ooo
dig +short starlingx.interface.tag.ooo

# All should return: **********
```

---

### 2. Python Dependencies Resolution (Priority 2)

**Install missing modules:**
```bash
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow

# Activate AI environment (for AI reasoning)
source ai_env_3.11/bin/activate

# Install all missing dependencies
pip install asyncpg aiohttp plotly pandas psutil memory_profiler \
    websockets cryptography confluent_kafka python-dotenv PyJWT \
    requests urllib3 numpy redis flask flask-socketio pyyaml

# Verify critical imports
python3 -c "import asyncpg, aiohttp, plotly, pandas, psutil; print('✅ Core dependencies OK')"
python3 -c "import websockets, cryptography, yaml; print('✅ Integration dependencies OK')"
```

---

### 3. Environment Variables (Priority 3)

**Configure missing credentials (use test/sandbox values initially):**

```bash
# Copy template
cp config/environment.env.template config/environment.env

# Edit with your credentials
vim config/environment.env

# Required (Minimum):
export ANTHROPIC_API_KEY="your-api-key-here"
export AWS_ACCESS_KEY_ID="your-aws-key"
export AWS_SECRET_ACCESS_KEY="your-aws-secret"
export HIVELOCITY_API_KEY="your-hivelocity-key"

# Optional (Can use placeholders for development):
export POSTGRES_PASSWORD="dev-postgres-pass"
export GITLAB_TOKEN="placeholder"
export PASSBOLT_API_TOKEN="placeholder"
export STRIPE_TEST_SECRET_KEY="sk_test_2wPMWmzr3bEXzPEv4K9x1jLd00mb1SIPJT"
export STRIPE_TEST_PUBLIC_KEY="pk_test_0VP4TIfGV9J8mmD6duzAkFxh00hCNBlV73"

# Load environment
source config/environment.env
```

---

## 🚀 Deployment Execution

### Step 1: Pre-Deployment Validation

```bash
# Test SSH connectivity to StarlingX
ssh -i ~/pem/stx-aio-0.pem -p 2222 root@********** "echo '✅ SSH OK'"

# Check DNS resolution
./scripts/deployment/check_dns_ready.sh

# Validate environment
python3 scripts/deployment/validate_environment.py --strict
```

**Expected Output:**
```
✅ SSH connectivity: OK
✅ DNS resolution: 6/6 domains ready
✅ Environment variables: 12/12 required
✅ Python dependencies: All installed
```

---

### Step 2: Deploy Multi-Tenant Nginx

```bash
# Run deployment script
./scripts/deployment/setup_multitenant_nginx.sh

# Script performs:
# 1. Installs nginx + certbot on StarlingX
# 2. Configures reverse proxy for 6 domains
# 3. Sets up SSL with Let's Encrypt
# 4. Creates health check endpoints
# 5. Enables WebSocket support
```

**Expected Output:**
```
✅ Nginx installed
✅ 6 domains configured
✅ SSL certificates obtained
✅ Health endpoints created
✅ Services restarted
```

---

### Step 3: Deploy Backend Services

```bash
# Deploy Flask WSJF Dashboard (port 5000)
./scripts/deployment/deploy_wsjf_dashboard.sh

# Deploy HostBill (port 8080)
./scripts/deployment/deploy_hostbill.sh

# Deploy WordPress (port 8081)
./scripts/deployment/deploy_wordpress.sh

# Deploy Dev Tools (port 8082)
./scripts/deployment/deploy_dev_tools.sh

# Deploy Flarum (port 8083)
./scripts/deployment/deploy_flarum.sh

# Deploy StarlingX UI (port 8084)
./scripts/deployment/deploy_starlingx_ui.sh
```

---

### Step 4: Post-Deployment Validation

```bash
# Run site health monitor
python3 scripts/monitoring/site_health_monitor.py --json --fail-on-down

# Test each domain
curl -I https://app.interface.tag.ooo/health
curl -I https://billing.interface.tag.ooo/health
curl -I https://blog.interface.tag.ooo/health
curl -I https://dev.interface.tag.ooo/health
curl -I https://forum.interface.tag.ooo/health
curl -I https://starlingx.interface.tag.ooo/health
```

**Expected Output:**
```json
{
  "overall_health": "healthy",
  "health_percentage": 100.0,
  "avg_latency_ms": 45.2,
  "domains": {
    "app.interface.tag.ooo": {"status": 200, "healthy": true},
    "billing.interface.tag.ooo": {"status": 200, "healthy": true},
    ...
  }
}
```

---

## 🔙 Rollback Procedures

### Emergency Rollback - Full Infrastructure

**IF: Complete deployment failure**

```bash
# 1. Stop all nginx services
ssh -i ~/pem/stx-aio-0.pem -p 2222 root@********** \
  "systemctl stop nginx && systemctl disable nginx"

# 2. Restore previous nginx config (if exists)
ssh -i ~/pem/stx-aio-0.pem -p 2222 root@********** \
  "cp /etc/nginx/nginx.conf.backup /etc/nginx/nginx.conf"

# 3. Point DNS back to previous IP (or set to maintenance page)
# Update DNS A records manually via your provider

# 4. Notify team
./scripts/deployment/send_rollback_notification.sh \
  --reason "Deployment failure" \
  --impact "All domains"
```

**Estimated Rollback Time:** 10-15 minutes

---

### Partial Rollback - Single Domain

**IF: One domain fails but others work**

```bash
# 1. Disable specific domain in nginx
ssh -i ~/pem/stx-aio-0.pem -p 2222 root@********** \
  "mv /etc/nginx/sites-enabled/billing.interface.tag.ooo.conf \
      /etc/nginx/sites-available/billing.interface.tag.ooo.conf.disabled"

# 2. Reload nginx (no downtime for other domains)
ssh -i ~/pem/stx-aio-0.pem -p 2222 root@********** \
  "nginx -t && systemctl reload nginx"

# 3. Update DNS for failed domain only
# Point billing.interface.tag.ooo to maintenance page IP

# 4. Investigate backend service
ssh -i ~/pem/stx-aio-0.pem -p 2222 root@********** \
  "systemctl status hostbill && journalctl -u hostbill -n 50"
```

**Estimated Rollback Time:** 5 minutes

---

### Rollback - SSL Certificate Issues

**IF: Let's Encrypt SSL fails**

```bash
# 1. Switch to self-signed certificates temporarily
ssh -i ~/pem/stx-aio-0.pem -p 2222 root@********** \
  "./scripts/deployment/generate_self_signed_certs.sh"

# 2. Update nginx to use self-signed
ssh -i ~/pem/stx-aio-0.pem -p 2222 root@********** \
  "sed -i 's|/etc/letsencrypt/|/etc/nginx/ssl/self-signed/|g' \
   /etc/nginx/sites-enabled/*.conf"

# 3. Reload nginx
ssh -i ~/pem/stx-aio-0.pem -p 2222 root@********** \
  "systemctl reload nginx"

# 4. Retry Let's Encrypt after 1 hour (rate limits)
```

**Estimated Rollback Time:** 5 minutes

---

## 🔍 Monitoring & Validation

### Continuous Monitoring (Post-Deployment)

```bash
# Run health monitor every 5 minutes
*/5 * * * * /usr/bin/python3 \
  /Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts/monitoring/site_health_monitor.py \
  --fail-on-down >> /var/log/site_health.log 2>&1

# Alert on failures
watch -n 60 'python3 scripts/monitoring/site_health_monitor.py --json | jq ".overall_health"'
```

### Performance Baselines

**Establish baseline metrics immediately after deployment:**

```bash
# Collect baseline
python3 scripts/agentic/economic_calculator.py --analyze-trends --json \
  > .goalie/deployment_baseline_$(date +%Y%m%d_%H%M%S).json

# Monitor deviations
python3 scripts/monitoring/performance_monitor.py \
  --baseline .goalie/deployment_baseline_*.json \
  --alert-threshold 20  # 20% deviation triggers alert
```

---

## 📊 Success Criteria

### Deployment Considered Successful If:

- ✅ All 6 domains return HTTP 200 on /health endpoint
- ✅ SSL certificates valid for all domains
- ✅ Average latency < 100ms
- ✅ No errors in nginx error logs (last 100 lines)
- ✅ All backend services running (systemctl status)
- ✅ Site health monitor shows 100% health for 1 hour
- ✅ No ROAM risks rated "Critical" in governance audit

### Validate Success:

```bash
# Run comprehensive validation
./scripts/deployment/validate_deployment_success.sh

# Expected output:
# ✅ DNS: 6/6 domains resolved
# ✅ SSL: 6/6 certificates valid
# ✅ Health: 6/6 endpoints responding
# ✅ Latency: Avg 45ms (Target: <100ms)
# ✅ Backend: 6/6 services running
# ✅ Monitoring: 0 alerts in last hour
# ✅ ROAM: 0 critical risks
#
# 🎉 DEPLOYMENT SUCCESS - All criteria met
```

---

## 🆘 Emergency Contacts

**Escalation Path:**

1. **Level 1**: Automated monitoring alerts → On-call engineer
2. **Level 2**: Persistent failures (>15 min) → Team lead
3. **Level 3**: Complete outage → CTO + Full team

**Communication Channels:**

- Slack: #infrastructure-alerts
- PagerDuty: On-call rotation
- Email: ops-team@interface.tag.ooo

---

## 📝 Post-Deployment Tasks

### Immediate (Within 24 hours):

- [ ] Document any deployment deviations
- [ ] Update ROAM risk register
- [ ] Schedule retro with team
- [ ] Archive deployment logs
- [ ] Update runbooks with lessons learned

### Short-term (Within 1 week):

- [ ] Performance optimization based on baseline
- [ ] Security audit of deployed infrastructure
- [ ] Backup/restore procedures validation
- [ ] Disaster recovery drill

### Medium-term (Within 1 month):

- [ ] Cost analysis vs. baseline
- [ ] Capacity planning review
- [ ] Automation improvements
- [ ] Monitoring dashboard enhancements

---

## 🔗 Reference Documents

- Multi-tenant nginx setup: `./scripts/deployment/setup_multitenant_nginx.sh`
- Site health monitor: `./scripts/monitoring/site_health_monitor.py`
- Economic calculator: `./scripts/agentic/economic_calculator.py`
- WIP monitor: `./scripts/execution/wip_monitor.py`
- Governance framework: `./docs/GOVERNANCE_FRAMEWORK.md`
- Pattern templates: `./scripts/patterns/templates/*.yaml`

---

**Version:** 1.0
**Last Updated:** 2025-12-12
**Owner:** Platform Engineering Team
**Review Date:** 2025-12-26
