# Leading-edge workflow retro, dynamic hydration, and PI Prep trust bootstrap

## Active index

| Need | Where |
|------|--------|
| **Run PI Prep end-state (trust path)** | `TRUST_GIT=/usr/bin/git bash scripts/pi-prep-bootstrap.sh` |
| **Trust bundle only (no delta)** | `SKIP_VELOCITY_DELTA=1 TRUST_GIT=/usr/bin/git bash scripts/pi-prep-bootstrap.sh` |
| **Merge GO policy** | `.goalie/go_no_go_ledger.md` |
| **Session contract (agents)** | `.agentic/system_prompt.md` |
| **Velocity delta report** | `_SYSTEM/_AUTOMATION/extract-historic-delta.py` → `reports/VELOCITY_DELTAS.md` |
| **CLT / arbitration (out of repo)** | `~/Documents/Personal/CLT` — do not merge into this tree without a substitution map |

## 1. Workflow retro matrix (past / present / future pressure)

Dimensions: **privacy**, **local inference**, **MCP / tool depth**, **agent UX**, **ops cost**, **temporal pressure** (deadlines, session budgets, stop-the-line gates).

| Layer | Role | Privacy | Local inference | MCP / tools | Agent UX | Ops cost | Temporal pressure |
|-------|------|---------|-----------------|-------------|----------|----------|-------------------|
| **OpenCode** + `OPENCODE_DISABLE_DEFAULT_PLUGINS=true` | CLI/agent runner with explicit plugins | High if local-only backends | Yes, when pointed at Ollama/LM Studio | You wire MCP explicitly | Terminal-first; less IDE polish | Low infra; your time to wire | Good if trust-path is in shell scripts |
| **Gemma 4** (+ peers) | Model tier for cheap iterations | High when local | Yes (VRAM-bound) | Via host app | Varies by host | Hardware + electricity | Fast turns; may need cloud for merge-grade review |
| **Ollama** | Local model daemon | High | Yes | REST local | Any client | Single runtime preference | Stable for scripted loops |
| **LM Studio** | Local GUI + server | High | Yes | Local REST | Desktop workflow | Same as Ollama; avoid running both on conflicting ports |
| **Warp** | Terminal + session / ambient patterns | Depends on account features | Via shell to Ollama | Shell + integrations | Shell-native agents | Subscription may apply | Strong for **shell-first** PI cycles |
| **Zed** | Editor-native agent | Editor telemetry policy | Via config to local LLM | Growing | Tight edit loop | Editor license | Strong for **buffer-first** cycles |
| **Windsurf** | IDE agent | Cloud unless local model path | Optional local | IDE MCP | Strong multi-file | Subscription | Good for flow; watch cost |
| **Cursor** | IDE agent (this environment) | Policy + optional local | Optional local / API | Strong MCP | Very strong | Usage-based / sub | Best default for **commit-ready** work |
| **Augment** | IDE assistant | Vendor policy | Check product | Varies | IDE-embedded | Vendor pricing | Compare on repo context + cost |

**Intent / introspect (meta-controls):** Map to explicit **hydration selectors**, not gate bypasses — e.g. `PHASE=prep|sync`, `PRESSURE=low|med|high`, `HORIZON=past|present|future` only decide **which folders and ledger sections to load first**. They must not skip `scripts/validators/project/check-csqbm.sh` or `validate-foundation.sh --trust-path`.

**Reality check:** “Cursor-level power, 100% local, no limits” is **not** literal: local models are bounded by **VRAM, context, throughput, and eval quality**. Use local for the **inner loop**; keep **trust-path + CSQBM + tests** as the **outer loop** for merge evidence.

## 2. Dynamic hydration vs static bypass

Aligned with progressive context loading ([arXiv:2604.01193](https://arxiv.org/abs/2604.01193)) and this repo’s **discover / consolidate then extend** stance.

- **Token sizing:** Start with standup + **one** WSJF thread; expand context only after **trust-path GREEN** or a documented **NO-GO** in the ledger.
- **Circle → directory → TLD / integration:** Each expansion adds one bounded slice (e.g. one `scripts/validators/*` subtree, one `.integrations/*` story) and ends with a **measurable** check (exit code, one metrics line).
- **Forbidden:** “If stressed, skip test X” without a ROAM line and substitution map (same class as R-2026-016 / attention fragmentation).

## 3. PI Prep → PI Sync: ordered bootstrap (idempotent)

**Policy:** Merge **GO** only when infra + CSQBM + evidence rules in `.goalie/go_no_go_ledger.md` are satisfied — see ledger tables.

**Order (each step is safe to re-run):**

1. **Session contract:** Agents load `.agentic/system_prompt.md` first (chunk if large). This is the non-bypassable behavioral contract for this workspace.
2. **Historic delta (optional):** Run `python3 _SYSTEM/_AUTOMATION/extract-historic-delta.py` so “present” work includes **what changed** in the ledger narrative (`reports/VELOCITY_DELTAS.md`). Skip with `SKIP_VELOCITY_DELTA=1` when you need only trust-path.
3. **Idempotency lock:** `scripts/pi-prep-bootstrap.sh` acquires an exclusive **flock** on `.goalie/locks/pi_prep_bootstrap.lock` so two sessions do not interleave git trust steps or append corrupted metrics.
4. **Trust path:** `TRUST_GIT=/usr/bin/git bash scripts/validate-foundation.sh --trust-path` (Mac: prefer `/usr/bin/git` per ledger). On failure, **stop** — record smallest evidence-backed delta in ledger / ROAM; do not start parallel feature work in the same cycle.
5. **PI Sync:** Proceed only when ledger policy says **GO**.

## 4. CLT / Personal boundary (arbitration, email sensitivity)

- **Code and gates** live under this repository (`projects/investing/agentic-flow` when nested in the superproject).
- **CLT** (`~/Documents/Personal/CLT`, including MAA arbitration and `.eml` sensitivity) is a **separate bounded context**. Do not copy arbitration content or email pipelines into this repo **unless** there is an explicit **substitution map**, retention policy, and integration ADR.
- Cross-cutting concerns (time pressure, review cadence, inbox-zero style workflows) may be **referenced** here as process text only; **implementation** stays in CLT or in dedicated integration repos (e.g. n8n) with a mapped contract.

## 5. Related automation

- **Heavy AQE / ruvector hydration (24h TTL):** `_SYSTEM/_AUTOMATION/bootstrap_session.sh` uses `.agentic-qe/.session-bootstrapped` — orthogonal to PI Prep **trust-path**; do not confuse the two locks.
- **Trust-path implementation detail:** `scripts/validate-foundation.sh --trust-path` (snapshots under `.goalie/trust_snapshots/`).
