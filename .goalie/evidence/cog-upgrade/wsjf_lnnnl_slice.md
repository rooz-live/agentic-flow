# WSJF / lnnnl Slice — COG Cognitum Upgrade (2026-05-31)

Assume failure; prove with artifacts. cPanel redirect **LATER** only after Phase 2 checklist.

## NOW / NEXT / LATER / NNEAR

| Tier | Item | WSJF | Evidence gate |
|------|------|------|---------------|
| **NOW** | Deploy `interface.tag.vote` nginx to 23.92.79.2 | 9.5 | `deploy_runbook.md` + smoke JSON |
| **NOW** | SSR on `SWARM_API_PORT=3001` (not Grafana :3000) | 9.3 | curl localhost:3001/health |
| **NOW** | Env secrets: `COGNITUM_WEBHOOK_SECRET`, `COGNITUM_REF=2rbzTT` | 9.0 | `.env.example` |
| **NOW** | `tooling/scripts/cog_edge_smoke.sh` | 8.8 | `smoke_*.json` |
| **NOW** | `npm rebuild better-sqlite3` on deploy host | 8.5 | exit code in smoke artifact |
| **NEXT** | Webhook E2E proof (valid HMAC POST) | 8.0 | smoke webhook section |
| **NEXT** | Click logging parity: cPanel vs interface paths | 7.5 | sqlite row diff artifact |
| **LATER** | Disable cPanel redirect (after Phase 2 sign-off) | 6.0 | `phase2_signoff.json` |
| **LATER** | Port agentic-flow-core commission-manager | 5.5 | — |
| **LATER** | vectors.db embeddings for affiliate learning | 4.0 | — |
| **NNEAR** | Consolidate duplicate `swarm-api-server.ts` trees | 7.0 | single canonical `src/api/` |

## Canonical Home Table

| Concern | Canonical path | Gate |
|---------|----------------|------|
| ROAM / blockers | `.goalie/evidence/cog-upgrade/roam_blockers_20260531.json` | 10+ risks documented |
| Dependency graph | `.goalie/evidence/cog-upgrade/dependency_graph.mmd` | mermaid renders |
| Deploy steps | `.goalie/evidence/cog-upgrade/deploy_runbook.md` | ordered + rollback |
| Edge smoke | `tooling/scripts/cog_edge_smoke.sh` | exit 0 or honest 2 |
| SSR API | `src/api/swarm-api-server.ts` | `/cog`, `/webhooks/cognitum` |
| Cognitum integration | `frontend/src/integrations/cognitum_affiliate.ts` | shim at `src/integrations/` |
| Nginx edge | `nginx_deployed/interface.tag.vote.conf` | proxy :3001 |
| Affiliate tracker | `src/affiliate/AffiliateStateTracker.ts` | click rows |
| E2E verify | `tests/e2e/cog-forward-verify.e2e.spec.ts` | `COG_SMOKE=1` |
| cPanel redirect | Apache/cPanel (unchanged) | **KEEP until LATER** |
