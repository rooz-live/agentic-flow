# COG / Cognitum Deploy Runbook — 23.92.79.2

**Slice:** 2026-05-31 | **Host:** 23.92.79.2  
**HARD CONSTRAINT:** Do **NOT** disable cPanel URL redirect for `tag.vote/cog` until Phase 2 sign-off. Apache `/a/2rbzTT` stays live in parallel.

## Preconditions

- [ ] SSH access to 23.92.79.2
- [ ] `interface.tag.vote` TLS cert at `/etc/letsencrypt/live/interface.tag.vote/`
- [ ] Node 20+ on host; Grafana remains on `:3000`
- [ ] Env file on host (not committed): `COGNITUM_REF=2rbzTT`, `SWARM_API_PORT=3001`, `COGNITUM_WEBHOOK_SECRET=<from cognitum dashboard>`

## Ordered Steps

### 1. Sync nginx config

```bash
scp nginx_deployed/interface.tag.vote.conf root@23.92.79.2:/etc/nginx/sites-available/interface.tag.vote.conf
ssh root@23.92.79.2 'ln -sf /etc/nginx/sites-available/interface.tag.vote.conf /etc/nginx/sites-enabled/ && nginx -t'
```

### 2. Deploy SSR (swarm-api-server)

```bash
# On host — adjust repo path
cd /var/www/affiliate-platform/agentic-flow   # or your deploy root
git pull   # after user commits this slice
export SWARM_API_PORT=3001
export COGNITUM_REF=2rbzTT
export COGNITUM_WEBHOOK_SECRET='...'

npm ci
npm rebuild better-sqlite3
npx tsx src/api/swarm-api-server.ts &
# Prefer systemd/pm2:
# pm2 start src/api/swarm-api-server.ts --name swarm-api --interpreter npx --interpreter-args tsx -- --env SWARM_API_PORT=3001
```

### 3. Verify local on host before nginx reload

```bash
curl -s http://127.0.0.1:3001/health | jq .
curl -sI http://127.0.0.1:3001/cog | grep -i '^HTTP\|^Location'
```

### 4. Reload nginx

```bash
ssh root@23.92.79.2 'systemctl reload nginx'
```

### 5. Public smoke (from laptop or host)

```bash
bash tooling/scripts/cog_edge_smoke.sh
# Expect artifact: .goalie/evidence/cog-upgrade/smoke_<timestamp>.json
```

### 6. Confirm cPanel path still works (parallel)

```bash
curl -sI 'https://tag.vote/cog' | grep -i '^HTTP\|^Location'
# Must still 302 to cognitum.one with ref=2rbzTT via cPanel until Phase 2
```

## Phase 2 Checklist — BEFORE cPanel Redirect Removal

All roles must sign off with evidence artifacts:

- [ ] **Edge:** `interface.tag.vote/health` → 200 (SSR or fallback)
- [ ] **Edge:** `interface.tag.vote/cog` → 302 Location contains `ref=2rbzTT`
- [ ] **App:** Click logged in AffiliateStateTracker sqlite (compare count before/after curl)
- [ ] **App:** Webhook E2E with valid HMAC → 200 `{ ok: true }`
- [ ] **Data:** `npm rebuild better-sqlite3` exit 0 on prod Node version
- [ ] **Governance:** ROAM R01,R04,R07 → Resolved or Accepted with artifact
- [ ] **Governance:** 7-day error-free nginx + SSR logs
- [ ] **All circles:** Explicit written sign-off in `.goalie/evidence/cog-upgrade/phase2_signoff.json`

Only after ALL above: consider disabling cPanel redirect (LATER — not this slice).

## Rollback

```bash
ssh root@23.92.79.2 'rm /etc/nginx/sites-enabled/interface.tag.vote.conf && systemctl reload nginx'
pm2 stop swarm-api   # if used
# cPanel redirect unaffected — production path preserved
```
