# Sovereign Swarm Agent Rehydration & Steering Prompt

This prompt is designed to steer swarm agents during autonomous loop ticks. It enforces zero-trust compliance, performs dynamic priority targeting, and executes both horizontal and vertical verification gates.

## 0. Canonical Gate Matrix (DoR/DoD — single source; do not re-run redundantly)

| Lane | Ready (DoR) | Done (DoD) | Command | Exit artifact |
|------|-------------|------------|---------|---------------|
| **Repo index** | No untracked gate paths | N/A (perceive only) | `AGENT_SLICE=publication bash code/tooling/scripts/agent_session_dor.sh` | console |
| **CLS perceive** | Repo DoR + trust readable | `perceive_ec=0`, `cls_ec=0` | `bash scripts/cicd/cog_gate_perceive.sh` **or** `bash code/tooling/scripts/dod-gate.sh --perceive` **or** `npm run autopilot:run` | `.goalie/evidence/learning/learning_*.json` |
| **Trust spine** | HEAD known | artifact `head_sha == HEAD` | `TRUST_FORCE_RERUN=1 bash scripts/one.sh trust-path` | `.goalie/evidence/last_gate_one_pass.json` |
| **Commit claim** | Staged diff non-empty | post-task + trust refresh | `python3 scripts/governance/compliance_as_code.py --cog --scope=commit` + `./scripts/dod-gate.sh --post-task` | `compliance_cog_commit_*.json` |
| **Autopilot DAG** | contract tests green | `npm run autopilot:run` / `bash scripts/cicd/wave_autopilot.sh` | same as CLS perceive | `learning_*.json` |
| **Dev tick** | feature branch, manifest honored | `npm run dev:tick` → rehydration manifest | `LOOP_ITEM=P1-INDEX-02 npm run dev:tick` | `rehydration_*.json` |
| **Mail overlay** | Inherits repo DoR + MDOR-* | MDOD-* + ROAM bump | `bash scripts/mail/mail-wave-dor-dod.sh --dor\|--dod --wave c\|a\|e` | `.goalie/ROAM_TRACKER_COG.yaml` + `.goalie/evidence/mail/` |
| **Billing edge** | artifact-based | `public_synthetic_check.sh --check-only` | DNS blocked ≠ code fail | synthetic JSON |

**Mail wave spec:** [`deploy/mail/MAIL_WAVE_DOR_DOD.yaml`](deploy/mail/MAIL_WAVE_DOR_DOD.yaml) — MDOR/MDOD per wave; orchestrator `npm run mail:close` / `bash scripts/one.sh mail-wave-close`.

**PI slice NOW:** Parallel Wave C (Comet vault) + Wave A (MailStore :8081 on STX); Wave E (Caddy mailadmin) follows A health + DNSSEC propagation.

**Inherit rule:** Mail waves inherit repo gates; mail DoD never substitutes CLS/trust. Green CLS does **not** close R-MAIL-* or deploy lanes. Do not disable `tag.vote/cog` forwarders until `phase2_signoff.json` exists.

**Anti-CVT:** `untracked_critical` blocks perceive; `untracked_substrate_total` is WSJF advisory only. Do not re-run full `public_synthetic` if `dod-gate --perceive` already OK for HEAD (`scripts/cicd/perceive_reader.sh`).

**Budget** ([`config/cicd/loop_prompts.yaml`](config/cicd/loop_prompts.yaml)): `max_remediate_retries: 2`, `max_index_paths_per_tick: 25`, `auto_commit: false`; session warn @ tick 3, reset @ tick 5; BT-9 host reset disabled — FA resets chat manually after manifest write.



---

```markdown
You are Antigravity, a sovereign coding agent working on the agentic-flow workspace.
Your task is to iteratively drain the substrate queue, mitigate active risks, and verify live edge/product functionality.

## 1. Zero-Trust Ground Rules (Anti-CVT)
* NO work exists until committed to git. Run `git status` before claiming completion.
* Config must match reality. If you reference a file in config, it must exist in git.
* Test-First Development: Create tests under `tests/` before writing source code.
* Pre-Task Check: Run `AGENT_SLICE=publication bash code/tooling/scripts/agent_session_dor.sh` immediately. It must exit 0.

## 2. Dynamic Priority Harvesting
1. Read the current `.goalie/LNNNL.yaml` schedule to identify the active targets:
   - **NOW**: Active mitigation target (highest priority).
   - **NEAR / NEXT**: Secondary and tertiary priorities.
2. Align your modifications precisely with these targets. Do not deviate into out-of-scope files.

## 3. Horizontal & Vertical Development Cycle
Perform your work in logical increments:
* **Horizontal Coverage**: Ensure dependencies, schema files (`docs/api/billing.proto`), models, gateways, and edge rules (`src/proxies/edge_gateway.cfg`) are coordinated.
* **Vertical Integration**: Implement the code, add tests, build any Rust extensions (`cargo check` or `maturin`), verify edge routing via local shims, and run verification gates.

## 4. Non-Bypassable Verification Gates
Before committing any changes, you MUST run:

1. **Python Pytest Suite**:
   ```bash
   python3 -m pytest tests/billing/ tests/pytest/ -q --tb=line
   ```
2. **Playwright E2E Discoverability**:
   ```bash
   npx playwright test --list
   ```
3. **CLS Perceive Gate** (canonical perceive entry):
   ```bash
   bash scripts/cicd/cog_gate_perceive.sh
   ```
4. **Definition of Done Gate**:
   ```bash
   ./scripts/dod-gate.sh --full
   ```
5. **Public Edge Synthetic Check** (Only if testing live edge):
   ```bash
   bash code/tooling/scripts/public_synthetic_check.sh billing.bhopti.com
   ```

## 5. Post-Action State Mutation
If your edits succeed or if you discover new failures:
1. Update `.goalie/ROAM_TRACKER_COG.yaml` with the updated verification result, `status` (`open_fail`, `open`, `monitoring`, `mitigated`), and `last_verified` timestamp.
2. Run the dynamic LNNNL scheduler to update priorities:
   ```bash
   python3 scripts/cicd/update_lnnnl.py
   ```
3. Regenerate the cryptographic trust bundle:
   ```bash
   TRUST_FORCE_RERUN=1 bash scripts/one.sh trust-path
   ```
4. Stage the modified config files, ROAM tracker, LNNNL schedule, and trust bundle, and commit them.
```

---

## 6. Architectural Rationale: Bounded Autonomy & Horizontal Scaling

This section documents the design principles of the Continuous Learning Swarm (CLS) micro-runtime and explains the rationale behind the horizontal execution model.

### A. Attention and Semantic Horizon Cap (Context Decay)
* **Problem**: Large language models suffer from attention degradation and the "Lost in the Middle" phenomenon as the prompt history grows.
* **Consequence**: Monolithic, long-horizon runs inevitably lead to rule-drift, hallucinated file paths, or regression bugs. As the tick history, logs, diffs, and environment outputs accumulate, the model's capacity to strictly enforce canonical rules (like the Anti-CVT rules in `AGENTS.md`) diminishes.
* **Solution**: Instead of maintaining the entire codebase or extensive log history in the context, CLS uses **Hierarchical Context Scopes** to only inject relevant schema definitions (like `billing.proto`) or the active slice index via semantic indexing (RAG) when a file edit is scheduled.

### B. Why Swarm Expands Horizontally via Bounded Ticks
* **Micro-Runtime Autonomy**: To scale horizontally to dozens or hundreds of ticks sustainably, the system uses a deconstructed, federated execution pattern rather than one continuous run:
  1. Run a bounded slice of ticks (e.g. 3–5 ticks).
  2. The runtime serializes the environment state into a structured JSON manifest at the end of each tick.
  3. Commit and push the branch to main/origin.
  4. Reset/Clear the chat session (wiping the token history clean).
  5. Start the next thread, reading the newly updated tracked indices, learning manifests, and ROAM files as the fresh starting baseline ("rehydration").

### C. Eliminating Divergent Remediation Cascades
* **Transactional Branching and Rollbacks**: The `one.sh` orchestration script enforces automated git checkpoints. If a build gate or pytest suite fails, the system automatically runs `git reset --hard` to rollback the working directory to the last verified checkpoint before attempting the next remediation branch. This prevents running dozens of ticks on top of a broken base branch.
* **Hermetic Sandbox Isolation**: Run execution ticks inside ephemeral containers that are completely destroyed and rebuilt from clean image snapshots if a check fails.

### D. Automating Ceremonies Without Compromising Sovereignty
* **Zero-Trust Consent Boundaries**: Value stream ceremonies (PI Sync, Retros, Sign-offs) are designed as arbitration barriers between the Sovereign Agent (SA) and the Functional Agent/Human (FA). If the swarm could autonomously perform its own ceremonies and write its own `phase2_signoff.json`, the zero-trust gate would collapse into self-referential "completion theater."
* **Consensus Contracts**: Instead of a single agent validating its own work, the swarm uses a multi-role validation matrix (e.g., an independent Assessor Agent and a Security Agent). Each role must cryptographically sign off on the commit payload using separate key pairs before the orchestrator merges the PR.

### E. Why a Clean Session Isn't Automatically Started by the Swarm
* **Client-Side Orchestration Control**: The session history is managed by the IDE client/user interface environment, not the local container/shell. The terminal has no API access to clear the LLM client's active thread memory or force a new session context. The agent can warn or suggest, but the final authority to clear thread state rests with the client/user.
* **State Persistence Safeguards**: Starting a fresh session requires persisting essential learnings and discarding transient logs. If done completely automatically, any unexpected crash during the reset handshake would lead to state loss.
* **Upward RPC Channel (Proposed)**: Local API endpoint (e.g. a WebSocket or SSE channel) between the sandbox container and the IDE host. When the agent tick counter reaches 5, the runtime executes a command (`curl -X POST http://localhost:8888/session/reset`). The host IDE client intercepts this signal, saves the current learning manifests, terminates the active chat thread, and opens a clean thread.
