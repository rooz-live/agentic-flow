# Protocol Registry

This document is the enforceable registry of operational rules for tool execution, governance, observability, and provider resilience. Each entry is specified as:

- **Method**: why the rule exists
- **Pattern**: how it is implemented
- **Factors**: configurable thresholds / knobs
- **Telemetry**: what must be recorded for evidence-first diagnosis
- **Failure containment**: how the system prevents silent failure and preserves continuity

## Global execution semantics

### Two-lane concurrency model

- **Lane A (independent batch)**: ONE message = ALL independent operations.
  - **Definition**: operations that do not require outputs/IDs from other operations in the same step.
  - **Goal**: maximize throughput by parallelizing read-only discovery (search/read/grep/list) and other independent actions.
- **Lane B (dependent chain)**: a multi-turn chain is required when an operation depends on outputs/IDs from a prior tool call.
  - **Canonical chain**: start → observe → act.
  - **Constraint**: each turn must still batch all independent sub-operations within that turn.
  - **Examples**: start non-blocking command → poll CommandId → decide abort/fallback → act.

### Decision checklist

- **If you need an output/ID** from step N to run step N+1, it is Lane B.
- **If you can decide all inputs upfront** and outcomes do not influence sibling steps, it is Lane A.

### SLO table (defaults)

| SLO | Fast profile | Medium profile | Breach policy |
| --- | --- | --- | --- |
| **Time-to-first-liveness (TTFL)** | 10s | 30s | Abort or safe-degrade. Treat as `ttfo_timeout` / `no_liveness` in telemetry. |
| **Heartbeat cadence** | 5s | 10s | If liveness cannot be emitted reliably, do not run unbounded; fall back to bounded variants. |
| **Poll cadence (external observer)** | 5s | 5s | If polling yields no new evidence, do not extend indefinitely; escalate to timeout policy. |
| **Idle timeout (no output / no progress)** | 30s | 120s | Abort with `idle_timeout`; optionally safe-degrade to a narrower scope. |
| **Hard timeout (wall clock)** | 60s | 1800s | Abort with `hard_timeout`; do not retry unboundedly. |

### Evidence verification channel rules

- **Rule**: protocol-required evidence must be verifiable via an explicit channel.
- **Allowed channels** (choose at least one per workflow):
  - **Tool-visible file path** (preferred): evidence can be read by IDE tooling.
  - **Shell-verifiable path**: evidence can be verified by `ls`/`tail` even if it is gitignored.
  - **Transcript evidence**: a bounded tail/summary is emitted to stdout/stderr so the run transcript itself is an artifact.
- **Gitignored evidence paths** (e.g., `.goalie/**`):
  - If `.goalie/**` is intentionally ignored, verification must use the shell-verifiable channel (directory listing + tail), or the workflow must dual-write a mirror artifact to a tool-visible location.
  - Recommended mirror example: `src/.telemetry/watchdog.jsonl`.

### Watchdog triage (decision tree)

Use `src/utils/watchdog_triage.py` to classify whether a run actually started, whether it produced output, and whether it terminated within the configured budgets, using the tool-visible mirror telemetry.

Example:

`python3 src/utils/watchdog_triage.py --label <label> --telemetry-jsonl src/.telemetry/watchdog.jsonl --watch`

Optional: write a tool-visible “latest status” file during watchdog execution:

`python3 src/utils/watchdog_run.py --status-json src/.telemetry/watchdog_status.json ... -- <cmd>`

### Protocol change rubric (ROAM/WSJF factors)

Every protocol/refactor proposal must state its:

- **Impact radius**: how many workflows and roles it can break.
- **Reversibility**: rollback plan and how quickly it can be undone.
- **Observability**: how success/failure is detected (SLO + evidence channel).
- **Cost of delay**: whether it blocks throughput right now.

### DoR/DoD gate (approval + auto-commit)

This gate applies to protocol changes, tooling changes, and Measure/Learn experiments.

**Definition of Ready (DoR)**

- **Problem statement**: what is failing + what success looks like.
- **Scope**: impacted workflows and maturity level (M1–M4).
- **Budgets/SLO**: selected profile and stop criteria.
- **Evidence channel**: tool-visible and/or shell-verifiable artifact path.
- **Rollback**: revert instructions (minutes, not hours).

**Definition of Done (DoD)**

- **Evidence exists**: proof is present in the declared channel.
- **Outcome classified**: success or typed abort reason.
- **Docs updated**: registry entry reflects the final rule/budget/channel.
- **Retro line**: one-line outcome recorded (what happened → what changed).

**Auto-approve rule**

Auto-approve a change/run only if all are true:

- **Impact radius** is acceptable for the maturity level (M1 local/dev is permissive; M4 prod is strict).
- **Reversibility** is clear and fast (minutes, not hours).
- **Observability** is explicit (success/failure provable via declared evidence channel).
- **Cost of delay** is justified (unblocks throughput now).

**Auto-commit rule (repo writes)**

Auto-commit is only permitted when:

- All **Auto-approve** conditions are met.
- The run is **M1 (local/dev)** or explicitly approved by policy for higher maturity.
- Auto-commit is explicitly enabled by the workflow’s opt-in mechanism (never implicit).

## Profiles (defaults)

### Fast profile
- **ttfo_sec**: 10
- **idle_sec**: 30
- **hard_sec**: 60
- **heartbeat_sec**: 5

### Medium profile
- **ttfo_sec**: 30
- **idle_sec**: 120
- **hard_sec**: 1800
- **heartbeat_sec**: 10

## Measure/Learn loop (watchdog evidence tuning)

### Method
Eliminate “wait hours” failure modes by turning every long-running command into a bounded experiment with verifiable evidence, then tuning budgets and fallbacks only when evidence supports change.

### Patterns
- **Evidence-first wrapper**: run commands via `watchdog_run` with at least one tool-visible or shell-verifiable evidence sink.
- **Classification**: use `watchdog_triage` to classify run state (started/finished/aborted/breach) and drive next actions.
- **Budget tuning**: change profiles only after repeated evidence, not after a single outlier.

### Factors
- **Minimum sample size before tuning**: 3 runs per label/profile (unless a run violates Hard timeout).
- **Default escalation**:
  - Fast → Medium (single retry) when `ttfo_timeout` or `idle_timeout` occurs but the command is expected to succeed.
  - Redesign command scope (bounded query) when Medium still breaches.

### Telemetry (required)

**Required evidence channels** (choose at least one):

- Tool-visible JSONL mirror (preferred): `--telemetry-mirror-jsonl src/.telemetry/<label>.jsonl`
- Shell-verifiable JSONL primary (allowed): `--telemetry-jsonl .goalie/telemetry/<label>.jsonl`
- Latest status JSON (recommended for dashboards): `--status-json src/.telemetry/<label>_status.json`

**Canonical watchdog event types and fields**:

- `command_started`
  - `ts`, `label`, `cmd`, `cwd`
  - `ttfo_sec`, `idle_sec`, `hard_sec`, `heartbeat_sec`
- `first_output`
  - `ts`, `label`, `first_output_latency_ms`
- `command_finished`
  - `ts`, `label`, `exit_code`, `duration_s`
- `aborted`
  - `ts`, `label`, `reason`, `duration_s` (when available)
  - `reason` must be typed (see Failure containment)

**Interpretation rule**:

- Use `duration_s` from `command_finished` / `aborted` as the authoritative runtime.
- `watchdog_triage` “elapsed_s” is “age since start at time of triage”, not command runtime.

### SLO pass/fail rules (per run)

Pass/fail is evaluated from telemetry, not from subjective terminal observation.

- **SLO: Evidence startability**
  - **Pass**: at least one configured evidence sink is writable, and `command_started` exists.
  - **Fail**: no evidence sinks writable (fail-fast) or no `command_started` within 2s of launch (triage: `not_started`).

- **SLO: TTFL / TTFO**
  - **Pass**: `first_output.first_output_latency_ms <= ttfo_sec * 1000`.
  - **Fail**: `aborted.reason == ttfo_timeout`.

- **SLO: Idle progress**
  - **Pass**: no idle breach before terminal state.
  - **Fail**: `aborted.reason == idle_timeout`.

- **SLO: Hard timeout**
  - **Pass**: terminal state (`command_finished` or `aborted`) occurs and `duration_s <= hard_sec`.
  - **Fail**: `aborted.reason == hard_timeout`.

### Tuning and safe-degrade rules

Apply changes in this order (smallest blast radius first):

- **Rule 1 (Fix evidence before tuning budgets)**
  - If `not_started`, fix `--cwd`, evidence sink paths, or approval/launch issues before changing budgets.

- **Rule 2 (Prefer bounded scope over bigger budgets)**
  - If Medium breaches, do not increase Hard timeout by default.
  - Replace the command with a bounded variant (e.g., `--max-count`, `--since`, `--stat`, `--shortstat`).

- **Rule 3 (Escalate budgets only when the workload is inherently slow)**
  - If 3 runs with the same bounded scope succeed but flirt with budgets (p95 close to cap), increase budgets.

- **Rule 4 (Typed abort drives the action)**
  - `failed_to_start`: fix environment, `--cwd`, executable path, or permissions.
  - `ttfo_timeout`: reduce initial work (use `--no-pager`, reduce query scope) or increase TTFO once.
  - `idle_timeout`: reduce scope or add progress output; if expected quiet, increase idle.
  - `hard_timeout`: treat as a breach; reduce scope or add a safe-degrade fallback.

### Runbook examples (evidence-first)

Git smoke test:

`python3 src/utils/watchdog_run.py --label smoke-git-version --ttfo-sec 2 --idle-sec 2 --hard-sec 5 --heartbeat-sec 1 --telemetry-mirror-jsonl src/.telemetry/smoke-git-version.jsonl --status-json src/.telemetry/smoke-git-version_status.json --cwd . -- git --version`

Git bounded log (example label, file-per-run):

`python3 src/utils/watchdog_run.py --label git-log-3mo --ttfo-sec 5 --idle-sec 15 --hard-sec 60 --heartbeat-sec 2 --telemetry-mirror-jsonl src/.telemetry/git-log-3mo.jsonl --status-json src/.telemetry/git-log-3mo_status.json --cwd . -- git --no-pager log --since="3 months ago" --max-count 2000 --oneline`

AF prod preflight (catch regressions at iteration 5, not 25):

`python3 src/utils/watchdog_run.py --label af-prod-preflight --ttfo-sec 30 --idle-sec 120 --hard-sec 1800 --heartbeat-sec 5 --telemetry-mirror-jsonl src/.telemetry/af-prod-preflight.jsonl --status-json src/.telemetry/af-prod-preflight_status.json --cwd . -- bash -lc 'AF_ENV=local ./scripts/af prod --multipass --preflight-iters 5 --progress-tooltip json'`

## yo.life governed runtime protocol (governance-first platform)

### Method
Make yo.life execution durable across time and verifiable under uncertainty by enforcing:

- bounded execution (watchdog)
- explicit priority/intent (WSJF gate)
- evidence-first auditability (tool-visible artifacts + stable schemas)

### Patterns

- **Entry point**: `./scripts/yolife` (thin wrapper over `./scripts/af yolife`).
- **Preflight**: `./scripts/yolife preflight`.
- **Bounded execution**: `./scripts/yolife exec -- <cmd...>`.
- **WSJF gate** (warn → block): uses the same `wsjf_gate_check_evidence` logic as `./scripts/af`.
- **Evidence conventions**: yo.life evidence is written under `src/.telemetry/yolife/<RUN_TAG>/`.

### Factors

**Watchdog activation**:

- `AF_WD_AUTO=1` enables watchdog only when a command is considered high-risk.
- `AF_WD_AUTO_CMDS` is a comma-separated list of bash-glob patterns matched against the yo.life subcommand.
- `AF_USE_WATCHDOG=1` forces watchdog on for all non-skipped commands.
- `AF_WD_SKIP_CMDS` supports exact, glob, and `*` (skip all).

**Watchdog budgets** (defaults; override per environment):

- `AF_WD_TTFO_SEC=30`
- `AF_WD_IDLE_SEC=180`
- `AF_WD_HARD_SEC=1800`
- `AF_WD_HEARTBEAT_SEC=5`

**WSJF gate controls**:

- `AF_WSJFGATE=1` enables WSJF gating.
- `AF_WSJFGATE_MODE=warn|block`.
- `AF_WSJFGATE_MAX_AGE_SEC=7200` (stale WSJF snapshot threshold).
- `AF_WSJFGATE_FORCE=1` bypasses gate (still emits a guardrail event).

### Telemetry (required)

**Evidence directory**:

- `src/.telemetry/yolife/<RUN_TAG>/` (tool-visible)
  - `<label>.jsonl` watchdog mirror telemetry
  - `<label>_status.json` latest status snapshot

**Required runtime banners**:

- yo.life watchdog runs must print a single line:
  - `[yolife/watchdog] evidence_dir=<...> label=<...>`

### Failure containment

- If preflight cannot prove WSJF evidence:
  - In `warn` mode: print a single warning and continue.
  - In `block` mode: exit non-zero and do not mutate.
- If watchdog budgets are breached:
  - abort with typed reason and leave evidence in `src/.telemetry/yolife/...`.

### Graduation rule (warn → block)

Promote yo.life WSJF gating from `warn` to `block` only after:

- a defined green streak (recommended: 10 consecutive governed runs), and
- zero occurrences of `failed_to_start` or `hard_timeout` in those runs.

---

## yo.life CI drift gates (evidence-first)

### Method
Prevent drift from becoming doctrine by failing CI early when:

- the system cannot prove what changed,
- the schema/config/deps are inconsistent,
- governance prerequisites for mutation are missing.

### Patterns

- **Preflight gate**: run `./scripts/yolife preflight`.
- **Drift gates**: fail the pipeline on drift with an explicit error and an evidence pointer.
- **Evidence-first**: every gate must point to a file path that can be inspected.

### Gates (recommended minimum)

| Gate | Fail condition | Required evidence |
| --- | --- | --- |
| **Governance gate (WSJF)** | `./scripts/yolife preflight` fails | stdout/stderr includes failure reason; `.goalie/wsjf.json` + `.goalie/CONSOLIDATED_ACTIONS.yaml` present |
| **Dependency drift** | lockfile out of sync with manifest | `git diff --name-only` includes lockfile; CI log captures diff summary |
| **Schema drift** | migrations pending / DB schema mismatch | migration tool output in CI log + persisted artifact (if available) |
| **Config drift** | required env/config missing or invalid | CI log prints missing keys + remediation |
| **Toolchain drift** | required CLI/provider missing (e.g. npx/tsx/node) | CI log includes command-not-found evidence |

### Failure containment

- Do not retry drift failures without changing inputs.
- Drift failures are hard failures (not safe-degrade) in CI.

---

## yo.life audit event schema (Truth/Time transmission substrate)

### Method
Preserve continuity over time by recording every mutation as an auditable event with:

- actor identity
- consent/authority context
- before/after (or diff pointer)
- evidence link (watchdog label + evidence directory)

### Pattern
Every state mutation in yo.life must emit an `audit_event`.

### Schema (minimum)

```json
{
  "ts": "2026-01-05T20:00:00Z",
  "event": "audit_event",
  "env": "prod",
  "actor": {
    "type": "user",
    "id": "user_123",
    "email": "rooz.live@yoservice"
  },
  "authority": {
    "role": "owner",
    "policy_version": "yolife-authz-v1"
  },
  "circle_id": "circle_abc",
  "action": "event.create",
  "resource": {
    "type": "event",
    "id": "evt_456"
  },
  "before": null,
  "after": {
    "title": "Class",
    "starts_at": "2026-01-10T18:00:00Z",
    "tz": "America/New_York"
  },
  "evidence": {
    "watchdog_label": "yolife__exec__...",
    "evidence_dir": "src/.telemetry/yolife/20260105T200000Z"
  },
  "notes": {
    "why": "Scheduled weekly training",
    "wsjf_context": "WSJF snapshot 2025-12-04"
  }
}
```

### Invariants

- `ts`, `event`, `actor`, `authority`, `circle_id`, `action`, `resource`, `evidence` are required.
- `authority.role` must match the permission check used by the API (no implied authority).
- `evidence.evidence_dir` must be tool-visible.
- If `before/after` is too large, store a pointer (`diff_ref`) and include a stable hash.

### Failure containment

- If an operation mutates state but cannot emit an audit event, treat it as a hard failure in governed mode.
- If mutation is blocked by WSJF gate, emit an audit event with `action=guardrail.block` and include the reason.

---

## AF prod ↔ yo.life orchestration protocol (priority-aware)

### Method
Enable **bidirectional execution** between:

- **AF prod** (system integrity / maturity ladder) and
- **yo.life** (service operations / cooperatives / circles)

...without collapsing truth into authority or continuity into rigidity.

Rule: cross-domain calls must be **evidence-first**, **bounded**, and **typed**.

### Patterns

- **AF prod → yo.life (service operation)**
  - Use `./scripts/yolife preflight` before any yo.life mutation.
  - Execute yo.life operational commands via `./scripts/yolife exec -- <cmd...>` so the call is bounded and evidence lands under `src/.telemetry/yolife/...`.
  - For provider-backed operations (MCP/context/federation), use `./scripts/yolife provider-run --provider <name> -- <cmd...>` so provider failures are typed and circuit-broken.

- **yo.life → AF prod (system stewardship)**
  - Use AF in advisory mode for diagnosis and capability upgrades:
    - `./scripts/af prod --assess-only` or `./scripts/af prod-cycle --mode advisory ...`
  - Treat AF provider diagnostics as first-class signals:
    - `./scripts/af provider-run --provider mcp_federation -- <cmd...>`
  - When yo.life needs infrastructure change, route into AF’s governance controls (WSJF gate, watchdog, audit events) rather than performing direct unmanaged edits.

### Factors (priority presets)

Priority is expressed by **factor presets**, not by vague urgency language. Suggested presets:

| Priority | Meaning | WSJF gate | Watchdog budgets | Circuit breaker |
| --- | --- | --- | --- | --- |
| **P0** | Safety / correctness / prevent irreversible harm | `AF_WSJFGATE=1` + `AF_WSJFGATE_MODE=block` | Medium or stricter (`AF_WD_TTFO_SEC=30`, `AF_WD_IDLE_SEC=180`, `AF_WD_HARD_SEC=1800`) | strict (low retry tolerance; open fast) |
| **P1** | Delivery under governance (normal ops) | `AF_WSJFGATE=1` + `AF_WSJFGATE_MODE=warn` (graduate to block) | Medium | normal |
| **P2** | Discovery / exploration (non-mutating) | Gate optional; prefer warn | Fast/Medium depending on scope | normal |
| **P3** | Bulk / offline analysis | Gate optional; never mutate | Medium with bounded scope | normal |

**Provider telemetry convergence**:

- Provider attempts must emit:
  - tool-visible records under `src/.telemetry/provider_events.jsonl`
  - and pattern telemetry into `.goalie/pattern_metrics.jsonl` as:
    - `pattern=provider_success|provider_failure|provider_offline`

### Telemetry (required)

- Cross-domain calls must preserve:
  - `correlation_id` (`AF_CORRELATION_ID` / `AF_RUN_ID`)
  - `evidence_dir` pointers in output and event payloads
  - typed failure classes for provider failures

### Failure containment

- AF prod must not “silently continue” when yo.life preflight fails in P0.
- yo.life must degrade to offline mode when providers are circuit-open, and must not retry storm.

## 1) Execution / Tooling

### Method
Prevent silent hangs and reduce lead-time variance by enforcing time bounds and always emitting progress signals.

### Patterns
- `watchdog_run` (default self-abort execution wrapper; supports `--telemetry-mirror-jsonl`)
- `nonblocking_poll` (interactive oversight)
- `safe_degrade` (bounded fallback)

### Factors
- **Fast profile**: ttfo=10s, idle=30s, hard=60s, heartbeat=5s
- **Medium profile**: ttfo=30s, idle=120s, hard=30m, heartbeat=10s

### Telemetry
- `command_started`
- `first_output_latency_ms`
- `idle_timeout_count`
- `hard_timeout_count`
- `aborted` (true/false)
- `fallback_used` (true/false)
- `effective_scope` (e.g., `--since=3 months` → `-n 50`)

### Failure containment
- Abort reason must be typed:
  - `ttfo_timeout`
  - `idle_timeout`
  - `hard_timeout`
  - `failed_to_start`
- When abort triggers, attempt a narrower-scope fallback when configured.

## 2) Governance / CI-CD

### Method
Preserve buildability and prevent drift from becoming doctrine by enforcing gates with clear failure semantics.

### Patterns
- `guardrail_lock`
- `fail_fast` vs `degrade_continue`
- `two_strike_rule`

### Factors
- cooldown windows
- max failed iterations
- escalation thresholds

### Telemetry
- `gate:*` outcomes
- `drift_detected`
- `rollback_triggered`
- `autocommit_shadow_diff`

### Failure containment
- Fail fast on foundational breakage.
- Degrade on recoverable failures (e.g., deploy failures), collecting evidence.

## 3) Observability

### Method
No failure without evidence; missing evidence is a tracked operational risk.

### Patterns
- `observability_first`

### Factors
- required metrics per stage
- minimum log payload

### Telemetry
- `% failures with supporting evidence`
- `missing_signals` count

### Failure containment
- If a failure occurs without required telemetry, create/emit an “observability gap” record.

## 4) Resilience / Providers

### Method
Degrade gracefully with typed semantics, avoid retry storms, and preserve continuity under partial outages.

### Patterns
- `safe_degrade`
- `circuit_breaker`

### Factors
- cooldown seconds
- max retries
- circuit TTL

### Telemetry
- `provider`
- `failure_class`
- `evidence_snippet`
- `circuit_state`

### Failure containment
- Typed failure taxonomy (minimum):
  - `provider_unreachable`
  - `provider_timeout`
  - `provider_tls_error`
  - `provider_misconfigured`
- Circuit breaker prevents repeated failures from blocking the whole workflow.

## Remote access protocol (SSH / EC2 Instance Connect / SSM)

### Method
Provide a durable, auditable access path to infrastructure without coupling continuity to a single SSH key.

Rule: access must be **recoverable** (break-glass path exists) and **verifiable** (evidence exists for each attempt).

### Patterns
- **Baseline SSH**: use standard SSH on port 22 when possible.
- **Break-glass key injection (EC2 Instance Connect)**: inject a temporary public key when the original EC2 KeyPair material is missing.
- **Keyless managed access (SSM Session Manager)**:
  - Run `aws ssm start-session ...` from the operator machine.
  - Do not assume the instance has `aws` installed (it is not required for Session Manager).

### Factors
- **SSH**:
  - host/IP, port, user, key path, `IdentitiesOnly=yes`.
- **EC2 Instance Connect**:
  - injection is temporary; treat it as a break-glass mechanism.
  - requires:
    - `ec2-instance-connect` support on the instance/AMI
    - SG ingress on port 22 from the operator IP
    - correct `--availability-zone` and `--instance-os-user`
- **SSM Session Manager**:
  - instance must be visible in `aws ssm describe-instance-information` and `PingStatus: Online`.
  - operator machine must have:
    - AWS CLI configured for the target account/region
    - **Session Manager plugin installed locally**
  - instance/network must allow SSM agent to reach AWS endpoints (typically outbound 443).

### Telemetry (required)
For every access attempt, record at minimum:

- `provider`: `ssh` | `ec2_instance_connect` | `ssm_session_manager`
- `target`: instance id and/or host/ip
- `region` / `az` (when applicable)
- `port` / `os_user` (when applicable)
- `success` (0/1), `exit_code`, and `stderr_tail` (bounded)

### Failure containment
- If SSH fails with auth errors, do not brute-force users/keys unboundedly; switch to EC2 Instance Connect or SSM.
- If SG ingress is temporarily widened for access, revert it after recovery.
- Prefer stabilizing on a single policy (port 22 + SSM as keyless fallback) rather than maintaining multiple ports.

## Temporal Truth Analytics provider triage (typed failures + offline mode)

### Method
Convert “provider is down” ambiguity into stable, typed semantics so the system can:

- keep operating (offline context mode)
- avoid retry storms (circuit breaker)
- preserve truthfulness (explicit warnings + evidence artifacts)

### Patterns
- **Evidence-first probe**: every provider interaction is wrapped in watchdog (bounded TTFO/idle/hard).
- **Typed classification**: map failures to a small taxonomy; do not reword errors in a way that loses detectability.
- **Circuit breaker**: repeated failure flips the provider into `offline` for a TTL.
- **Offline context mode**:
  - prefer local filesystem/code_search reads
  - use last-known-good cached context if available
  - emit exactly one warning per TTL: `Context provider unavailable → using local-only context.`

### Factors
- **Activation**:
  - `AF_WD_AUTO=1`
  - `AF_WD_AUTO_CMDS` includes provider-touching commands (recommended: `prod-*`, `yolife`, `pattern-*`, `governance-agent`)
- **Budgets** (defaults; tune by evidence):
  - `AF_WD_TTFO_SEC=30`
  - `AF_WD_IDLE_SEC=180`
  - `AF_WD_HARD_SEC=1800`
  - `AF_WD_HEARTBEAT_SEC=5`
- **Circuit breaker** (semantic contract; implementation may vary):
  - `max_failures_in_window`: 3
  - `window_sec`: 300
  - `open_ttl_sec`: 600
  - `half_open_trial`: 1 request

### Telemetry (required)
Emit a single structured record per provider attempt (in addition to watchdog telemetry). Minimum fields:

- `ts`
- `event`: `provider_failure` | `provider_success` | `provider_offline`
- `provider`: e.g. `mcp_federation`, `context7`, `filesystem`, `aqe-mcp`
- `where`: `cli` | `vscode_extension` | `agent_runtime`
- `failure_class`: one of the typed taxonomy values (below)
- `command_or_endpoint`
- `exit_code` (if applicable)
- `stderr_tail` (last ~2KB max)
- `retry_count`
- `cooldown_sec`
- `circuit_state`: `closed` | `open` | `half_open`
- `offline_mode`: true/false
- `evidence`:
  - `watchdog_label`
  - `evidence_dir`

### Failure taxonomy (classification rules)

| failure_class | Primary signals | Notes |
| --- | --- | --- |
| `provider_unreachable` | `ENOTFOUND`, `ECONNREFUSED`, `EHOSTUNREACH`, port not listening | Often DNS/port/service not started |
| `provider_timeout` | watchdog `ttfo_timeout` / `idle_timeout` / `hard_timeout`, request timeout | Apply circuit breaker to prevent retry storms |
| `provider_tls_error` | certificate verify failure, TLS handshake errors | Allow explicit `AF_TLS_VERIFY=0` only when documented |
| `provider_misconfigured` | command not found, bad `.claude/mcp.json`, wrong PATH, missing binary | Treat as hard failure until fixed |
| `provider_internal_error` | nonzero exit with stderr indicating crash/panic | Keep stderr tail as evidence |

### Offline mode behavior (contract)
When a provider is in `open` circuit state, do not call it again until TTL expires.

- Prefer local-only context gathering.
- If a workflow requires the provider (no safe-degrade path), fail fast with typed failure and evidence pointers.

### Runbook (minimal)
- **Preflight evidence + governance**:
  - `./scripts/yolife preflight`
- **Probe a provider-backed command under watchdog**:
  - `./scripts/yolife exec -- <cmd...>`
- **Triage watchdog evidence**:
  - `python3 src/utils/watchdog_triage.py --telemetry-jsonl <evidence_dir>/<label>.jsonl --label <label> --watch`

## WSJF mapping (priority order)

No speculative scoring. Prioritize by Cost of Delay reduction and job size.

- **Highest WSJF**
  - Watchdog wrapper (`watchdog_run`) to eliminate silent hangs.
  - Buildable-at-all-times gate to prevent drifted scripts from blocking all work.
  - Telemetry standardization for watchdog events to reduce rework and improve diagnosis.

- **Next WSJF**
  - Circuit breaker semantics for provider failures.
  - Guardrail lock tuning (two-strike + cooldown).

## AF prod maturity ladder

- **M1 (local/dev)**: watchdog for fast commands; permissive fallbacks.
- **M2 (team cadence)**: watchdog for build/test; structured telemetry required.
- **M3 (pre-prod)**: hard timeouts everywhere; typed failure taxonomy; circuit breakers.
- **M4 (prod)**: watchdog + safe_degrade + “no deploy without evidence” + rollback playbooks.
