# CAPABILITY_BACKLOG.md (Autonomous Ledger)
> Last replenished: 2026-05-20T16:46:00Z (Cycle 39 PI Replenish/Refine)
> Sorted rigorously by WSJF (Weighted Shortest Job First)
> Prior snapshot: .goalie/backlog_snapshots/2026-04-03/CAPABILITY_BACKLOG.md

## 🔴 NOW — PI Sprint (Cycle 39 WSJF-ranked, infrastructure-first)

### #1 Clear WHM hostname lock + deploy tag.vote landing page [WSJF: 15.0]
- **BV=8** Unblocks all cPanel operations; tag.vote is 10DLC brand-vetting prerequisite
- **RR=7** Stuck hostname blocks SSL renewal, account migrations, hostname-dependent configs
- **TC=10** 10DLC brand vetting window; hostname lock accumulates risk daily
- **Job Size=S(2)** Clear lock file via KVM root SSH; deploy existing landing page via cPanel cron bridge
- **DoR:** KVM root password obtained; tag.vote landing page HTML exists from prior session
- **DoD:** `whmapi1 sethostname` succeeds; tag.vote returns HTTP 200 with opt-in content (not Discord redirect)
- **ROAM:** R-2026-024 (MITIGATING), unblocks R-2026-014 (consulting outreach)
- **Evidence:** `curl -sI https://tag.vote` returns 200 + content; `whmapi1 get_hostname` returns intended FQDN

### #2 Fix false-green redirects (cv.rooz.live, tag.ooo) + epic.cab SSL [WSJF: 12.5]
- **BV=7** Three customer-facing FQDNs serving wrong content; commerce aggregate blocked
- **RR=6** False green masks real outage from monitoring; erodes trust metrics
- **TC=7** Every day these redirect to Discord/external = lost organic traffic
- **Job Size=S(2)** cPanel redirect edits + AutoSSL verification
- **DoR:** cPanel cron bridge proven (cycle 39); cv.rooz.live content exists locally
- **DoD:** cv.rooz.live serves CV content; tag.ooo serves platform landing; epic.cab has valid SSL + HTTP 200
- **ROAM:** R-2026-024 downstream; enables R-2026-012 consulting portfolio link
- **Evidence:** `curl -sI https://cv.rooz.live` returns 200 (not 302); `openssl s_client -connect epic.cab:443` shows valid cert

### #3 Validator DPC 39→60+ (coherence timeout + Jest suite triage) [WSJF: 11.7]
- **BV=7** DPC≥60 unblocks consulting outreach gate (R-2026-014 requires DPC_R≥75%)
- **RR=5** 35 failing Jest suites mask real regressions; validate_coherence.py still timing out
- **TC=6** Consulting pipeline revenue ($150K-$250K engagement) gated on validator health
- **Job Size=S(2)** Install missing npm deps (blessed, fs-extra); fix validate_coherence.py outer timeout
- **DoR:** Jest failure categories documented (cycle 39 report); coherence script patched
- **DoD:** `npx jest --no-coverage` < 20 failures (from 74); `compare-all-validators.sh --json` DPC≥60
- **ROAM:** R-2026-014 (ACTIVE), R-2026-024 validator evidence
- **Evidence:** CONSOLIDATION-TRUTH-REPORT.json `dpc` field ≥ 60

## 🟢 NOW (Core Engineering — carried forward)
- **[WSJF: 10.00]** Provision physical OroPlatform/Symfony CRM on KVM Edge Node
- **[WSJF: 10.00]** Resolve Playwright E2E failures (Parameter dropping & missing Whop checkouts)
- **[WSJF: 10.00]** [COMPLETED] Eliminate technical jargon & deploy Universal mbo.bio dynamic per-hour pricing
- **[WSJF: 10.00]** [COMPLETED] Vertically-integrated / laterally-horizontal Mesh Navigation UI deployed

## 🟢 NOW (Top WSJF Product Capabilities — carried forward)
- **[WSJF: 9.5]** As a member, I earn 35% commission referring new customers to any product
- **[WSJF: 5.5]** As a rider, I can rate my driver and report safety concerns
- **[WSJF: 4.67]** As a user, I can tag content with custom labels and browse by tag cloud
- **[WSJF: 4.67]** As a new user, I complete a guided onboarding that recommends the right product/tier
- **[WSJF: 4.5]** As a developer, I can run whop_affiliate_orchestrator.js with real plan IDs
- **[WSJF: 4.33]** As a user, I can access cached content and queue actions while offline
- **[WSJF: 4]** As a developer, I can use the Company API key to CRUD products/plans/affiliates
- **[WSJF: 3.8]** As a team admin, I can invite members, assign seats, and manage permissions
- **[WSJF: 3.75]** As a developer, I can manage API keys, view usage, and set rate limit alerts
- **[WSJF: 3.67]** As a user, I can download the Android app and access all domain products in one app

## 🟡 NEXT (Upcoming Horizon)
- **[WSJF: 9.00]** Consolidate CI pipelines into the 'one.sh' Canonical Gate
- **[WSJF: 9.00]** Integrate Gen-UI Phase Gates natively into Swarm (Beginner Pills, Power User Sliders)

- **[WSJF: 3.6]** [ROLE DOMAIN] Analyst - Risk & Compliance Analyst - Synthesize purpose.md
- **[WSJF: 3.6]** [ROLE DOMAIN] operational-analyst-roles - Owner - Synthesize backlog.md
- **[WSJF: 3.6]** [ROLE DOMAIN] operational-analyst-roles - Partner - Synthesize backlog.md
- **[WSJF: 3.6]** [ROLE DOMAIN] operational-analyst-roles - Partner - Synthesize purpose.md
- **[WSJF: 3.6]** [ROLE DOMAIN] operational-analyst-roles - Researcher - Synthesize accountabilities.md
- **[WSJF: 3.6]** [ROLE DOMAIN] Steward - Experimentation Steward - Synthesize accountabilities.md
- **[WSJF: 3.6]** [ROLE DOMAIN] Steward - Metrics Steward - Synthesize accountabilities.md
- **[WSJF: 3.6]** [ROLE DOMAIN] assessor - circle-lead-performance-assurance-assessment - Synthesize purpose.md
- **[WSJF: 3.6]** [ROLE DOMAIN] assessor - circle-rep-performance-assurance-assessment - Synthesize purpose.md
- **[WSJF: 3.6]** [ROLE DOMAIN] Assessor - Accessibility & Ethics Assessor - Synthesize purpose.md
- **[WSJF: 3.6]** [ROLE DOMAIN] Assessor - Experimentation Assessor - Synthesize accountabilities.md
- **[WSJF: 3.6]** [ROLE DOMAIN] Assessor - FinOps & Cost Assessor - Synthesize accountabilities.md
- **[WSJF: 3.6]** [ROLE DOMAIN] Assessor - Quality & Reliability Assessor - Synthesize purpose.md
- **[WSJF: 3.6]** [ROLE DOMAIN] Assessor - Vendor:Third‑Party Assessor - Synthesize purpose.md
- **[WSJF: 3.6]** [ROLE DOMAIN] operational-assessor-roles - Assessor - Synthesize backlog.md

## 🔵 LATER (Deep Backlog)
*384 items omitted for context brevity...*
