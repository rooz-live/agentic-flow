# RCA-001: cPanel VM Disk Full → Total DNS Outage

**Status:** OPEN — blocker on billing.bhopti.com public edge  
**Severity:** P0 — all public FQDNs unreachable  
**First evidence:** `verify_cpanel_kvm_20260525T175353Z.json` (disk_headroom FAIL: 100%)  
**Latest probe:** `dns-incident/probe_latest.json` (2026-05-26T11:30:20Z — SERVFAIL)  
**Device:** `stx-aio-0.corp.interface.tag.ooo` (Hivelocity device_id: 24460, IP: 23.92.79.2)

---

## Deep Why (5-layer inversion)

```
SYMPTOM:  billing.bhopti.com does not resolve. public_synthetic_check.sh exit 1.
          Agents propose NS delegation bypass to Cloudflare.

L1 WHY:   curl exit 28 — DNS resolve timeout (not HTTP error, not TLS error)
          → The authoritative nameservers for bhopti.com are not responding

L2 WHY:   bhopti.com NS records delegate to ns1.tag.ooo / ns2.tag.ooo
          tag.ooo NS returns SERVFAIL (dns-incident/probe_latest.json)
          → The nameserver process on the cPanel VM is dead

L3 WHY:   verify_cpanel_kvm checks: ssh_reachable=FAIL, whm_api=FAIL,
          mail_services=FAIL, cphulkd=FAIL — ALL services dead on same host
          → The entire cPanel VM is unresponsive, not just DNS

L4 WHY:   verify_cpanel_kvm_20260525T175353Z.json: disk_headroom FAIL "100% used on /"
          → Root filesystem at 100% causes kernel OOM/freeze or service crash loop.
          cPanel/WHM writes to / on every request. Full disk = services cannot start.

L5 WHY:   No disk quota enforcement, no alerting threshold, no automated reclaim
          before saturation. Agents ran agentic_dns_healer (30+ runs, evidence in
          .goalie/) attempting to repair DNS without diagnosing the disk root cause.
          Each healer run wrote more evidence JSON to disk, worsening the problem.
          → No observability → no early warning → reactive loop amplified the failure
```

**Root Cause (singular):** `/` filesystem on `stx-aio-0` reached 100% capacity.  
All cPanel services (named/bind, WHM, SSH, mail) crash or refuse to start on a full disk.  
Since `tag.ooo` nameservers live on this VM, all DNS resolution for `bhopti.com` (which delegates to `ns1/ns2.tag.ooo`) stops globally.

**Anti-pattern identified:** Agents treated DNS failure as a DNS configuration problem (ran 30+ healer iterations, proposed NS re-delegation) instead of perceiving the upstream infrastructure state. Evidence of disk saturation was already committed in `.goalie/evidence/` but no agent queried it before proposing solutions.

---

## Evidence Chain (all in `.goalie/evidence/`, committed)

| Artifact | Key Finding |
|----------|-------------|
| `verify_cpanel_kvm_20260525T175353Z.json` | disk_headroom: FAIL "100% used on /" |
| `verify_cpanel_kvm_20260525T205454Z.json` | All 5 checks FAIL (ssh, whm, mail, disk, cphulkd) |
| `dns-incident/probe_latest.json` | tag.ooo NS = SERVFAIL, bhopti.com = UNKNOWN (0 answers) |
| `agentic_dns_healer_20260526T121057Z.json` | 30+ healer runs, exit 0 (false green — processed ≠ fixed) |
| `hivelocity_reset_1778001574.json` | device_id 24460, IP 23.92.79.2, Cloudflare blocks console |
| `public-edge/public_20260526T033933Z-47516.json` | curl exit 28 "Resolving timed out after 15000ms" |

---

## Fix Path (ordered by CoD, retain-not-bypass rule)

### Step 1 — Reclaim disk space on VM (unblock everything else)
```bash
# Via Hivelocity portal or IPMI console (Cloudflare blocks SSH):
# https://core.hivelocity.net/device/24460/console

# On the VM:
journalctl --vacuum-size=200M          # shrink systemd journal
docker system prune -f                 # remove stopped containers/images
find /var/log -name "*.log" -size +50M -exec truncate -s 0 {} \;
find /tmp /var/tmp -mtime +7 -delete
df -h /                                # confirm < 80%
```

### Step 2 — Restart cPanel services
```bash
/scripts/restartsrv_named   # restart BIND/named (DNS)
/scripts/restartsrv_cpsrvd  # restart cPanel daemon
whmapi1 servicestatus service=exim    # verify mail
```

### Step 3 — Verify DNS is live (from external resolver)
```bash
dig NS tag.ooo @8.8.8.8 +short        # must return ns1/ns2.tag.ooo
dig A billing.bhopti.com @8.8.8.8 +short  # must return origin IP
```

### Step 4 — Run synthetic gate (closes G9 blocker)
```bash
bash code/tooling/scripts/public_synthetic_check.sh billing.bhopti.com
# exit 0 = DNS live + HTTP reachable + TLS valid
# Writes artifact to .goalie/evidence/public-edge/
```

### Step 5 — Install disk monitoring (prevent recurrence)
Add to cPanel server crontab:
```bash
# Alert when / > 80% used
*/15 * * * * df / | awk 'NR==2{gsub(/%/,"",$5); if($5>80) print "DISK ALERT: "$5"% on /"}' | mail -s "Disk Alert stx-aio-0" admin@bhopti.com
```

---

## MPP Classification

| Dimension | Classification |
|-----------|---------------|
| **Method** | Infrastructure state perception before remediation |
| **Pattern** | Evidence-first diagnosis (query `.goalie/` before running healers) |
| **Protocol** | RETAIN rule: fix root cause, do not bypass via NS re-delegation |

---

## Anti-CVT Rules Applied

- **Rule 7 (Retain, don't bypass):** NS re-delegation would mask the disk problem, not fix it. The VM must come back online — it hosts GitLab, cPanel, mail, and all nameservers.
- **Rule 10 (Public edge proof):** `public_synthetic_check.sh exit 0` is only valid once DNS resolves from the real nameserver — not from a bypass NS.
- **Invert thinking:** The fix is not a network change. It is a disk reclaim on a single host.

---

## Observability Gap (ROAM risk — to be registered)

| Risk | Category | Mitigation |
|------|----------|-----------|
| No disk threshold alert on cPanel VM | **Operational** | Add cron alert (Step 5 above) |
| `agentic_dns_healer` writes evidence to disk it cannot reclaim | **Architectural** | Write evidence to remote store or bounded local dir |
| Agent sessions query DNS without first checking VM health evidence | **Process** | Add VM health check to `agent_session_dor.sh` publication gate |
| No human-readable "infrastructure down" notice in AGENTS.md | **Process** | Add infrastructure status section to AGENTS.md |

---

## DoD to close this RCA

```bash
# 1. VM disk < 80%
ssh root@23.92.79.2 "df / | awk 'NR==2{print \$5}'"   # < 80%

# 2. named responding
dig NS tag.ooo @8.8.8.8 +short   # returns ns1.tag.ooo, ns2.tag.ooo

# 3. Synthetic gate passes
bash code/tooling/scripts/public_synthetic_check.sh billing.bhopti.com   # exit 0

# 4. Commit evidence artifact
git add .goalie/evidence/public-edge/ && git commit -m "fix(dns): VM disk reclaimed, billing.bhopti.com live"
```
