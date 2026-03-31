# Overview
This plan implements the highest-WSJF items from the roadmap, focusing on pattern telemetry enhancement, IDE integration for continuous improvement, and production deployment readiness. Work is organized into NOW (0-48h), NEXT (2-7 days), and LATER (1-2 weeks) tiers.
# Current State
## ✅ Foundation Complete
* Test suite: 261/261 passing (100%)
* AgentDB: 102 learning events populated
* Circle structure: 6 circles with operational roles
* Pattern telemetry: Active logging to `.goalie/pattern_metrics.jsonl`
* Governance automation: 39 delta iterations tracked
* Security: All CVEs resolved, secrets management documented
## 🎯 Active Capabilities
* Scripts/af CLI with full-cycle, retro-coach, governance-agent commands
* TypeScript federation agents (governance_agent.ts, retro_coach.ts)
* Pattern metrics logging with 8+ patterns
* Circle-based action tracking in CONSOLIDATED_ACTIONS.yaml
## 📊 Baseline Metrics
* Pattern telemetry coverage: ~70% (target: ≥90%)
* Time retro→code: <30min (target: <1hr) ✅
* Action completion: 69.2% (target: >80%)
* WIP violations: 0% (target: <5%) ✅
# NOW Tier (0-48 hours) - WSJF 12-15
## Priority 1: Enhance scripts/af Telemetry Logging (WSJF 15)
**Goal**: Implement behavioral mutations for pattern metrics to achieve ≥90% coverage
**Owner**: Orchestrator Circle
**Pattern**: observability-first + stat-robustness-sweep
### Tasks
1. Extend `log_pattern_event()` function in scripts/af (lines ~1600-1700)
    * Add `mutation` boolean field to all pattern events
    * Implement pattern-specific mutations:
        * `safe_degrade`: Log trigger_reason, degraded_to, recovery_plan
        * `guardrail_lock`: Log enforced state, health_state, user_requests
        * `iteration_budget`: Log requested vs enforced vs consumed vs remaining
        * `circle_risk_focus`: Log top_owner, extra_iterations, roam_reduction
        * `autocommit_shadow`: Log candidates, manual_override, confidence_threshold
2. Add environment variable toggles for pattern controls:
```warp-runnable-command
AF_PATTERN_SAFE_DEGRADE=${AF_PATTERN_SAFE_DEGRADE:-1}
AF_PATTERN_GUARDRAIL_LOCK=${AF_PATTERN_GUARDRAIL_LOCK:-1}
AF_PATTERN_ITERATION_BUDGET=${AF_PATTERN_ITERATION_BUDGET:-1}
AF_PATTERN_CIRCLE_RISK_FOCUS=${AF_PATTERN_CIRCLE_RISK_FOCUS:-1}
AF_PATTERN_AUTOCOMMIT_SHADOW=${AF_PATTERN_AUTOCOMMIT_SHADOW:-0}  # default off
```
3. Implement schema validation before write:
```warp-runnable-command
validate_pattern_event() {
  local event_json="$1"
  # Required fields: ts, run, run_id, iteration, circle, pattern, mode, mutation
  jq -e '.ts and .run and .run_id and .iteration and .circle and .pattern and .mode and (.mutation | type == "boolean")' <<< "$event_json" > /dev/null
}
```
4. Add HPC/ML/Stats tag auto-detection:
    * ML patterns: ml-training-guardrail → tags: ["ML"]
    * HPC patterns: hpc-batch-window → tags: ["HPC"]
    * Stats patterns: stat-robustness-sweep → tags: ["Stats"]
    * Federation patterns: safe-degrade, federation-runtime → tags: ["Federation"]
### Acceptance Criteria
* All 6 core patterns emit events with mutation field
* Environment toggles control pattern activation
* Schema validation prevents malformed events
* Tag coverage ≥90% (measured by scripts/analysis/check_pattern_tag_coverage.py)
* Full-cycle execution logs ≥10 pattern events per iteration
### Implementation Files
* `scripts/af` (modify log_pattern_event, add validation)
* `scripts/analysis/check_pattern_tag_coverage.py` (new)
* `docs/PATTERN_EVENT_SCHEMA.md` (update with mutation field spec)
### Testing
```warp-runnable-command
# Run enhanced full-cycle
./scripts/af full-cycle 3 --circle orchestrator
# Validate schema
python3 scripts/analysis/validate_pattern_metrics.py
# Check tag coverage
python3 scripts/analysis/check_pattern_tag_coverage.py --threshold 0.90
# Verify mutation tracking
jq 'select(.mutation == true)' .goalie/pattern_metrics.jsonl | wc -l
```
## Priority 2: VS Code Extension Scaffold for IDE Integration (WSJF 14)
**Goal**: Create functional VS Code extension with Kanban and metrics views
**Owner**: Intuitive Circle
**Pattern**: observability-first + visualization
### Tasks
1. Scaffold extension structure:
```warp-runnable-command
tools/goalie-vscode/
├── src/
│   ├── extension.ts (entry point)
│   ├── kanbanProvider.ts (TreeView for KANBAN_BOARD.yaml)
│   ├── metricsWebview.ts (WebView for pattern_metrics.jsonl)
│   ├── fileWatcher.ts (live updates)
│   └── commands.ts (quick actions)
├── package.json (VS Code extension manifest)
├── tsconfig.json
└── README.md
```
2. Implement Kanban TreeView:
    * Read `.goalie/KANBAN_BOARD.yaml`
    * Group by status (backlog, ready, in-progress, done)
    * Show WSJF scores and circle_owner
    * Click to open action in editor
    * Refresh on file change (via fs.watch)
3. Implement Metrics WebView:
    * Read `.goalie/pattern_metrics.jsonl`
    * Display pattern frequency chart (Chart.js)
    * Show safe-degrade trigger timeline
    * Display economic COD/WSJF trends
    * Live refresh every 5 seconds
4. Add Quick Action commands:
    * `goalie.runStandup` → launch retro coach in standup mode
    * `goalie.runRetro` → launch retro coach with recent metrics
    * `goalie.refreshDashboard` → reload Kanban + metrics
    * `goalie.applySafeCodeFixes` → apply governance-recommended fixes (batch)
5. Wire file watchers:
    * Watch `.goalie/KANBAN_BOARD.yaml` → refresh TreeView
    * Watch `.goalie/pattern_metrics.jsonl` → update WebView
    * Watch `.goalie/metrics_log.jsonl` → show governor health
### Acceptance Criteria
* Extension loads in VS Code without errors
* Kanban TreeView displays all actions from KANBAN_BOARD.yaml
* Metrics WebView shows live pattern charts
* File watchers trigger UI refresh within 2 seconds
* Quick actions execute corresponding `af` commands
* Extension packaged as VSIX for internal distribution
### Implementation Files
* `tools/goalie-vscode/src/extension.ts` (new)
* `tools/goalie-vscode/src/kanbanProvider.ts` (new)
* `tools/goalie-vscode/src/metricsWebview.ts` (new)
* `tools/goalie-vscode/src/fileWatcher.ts` (new)
* `tools/goalie-vscode/src/commands.ts` (new)
* `tools/goalie-vscode/package.json` (update with commands, views)
### Testing
```warp-runnable-command
# Compile TypeScript
cd tools/goalie-vscode && npm run compile
# Run extension in VS Code dev host
code --extensionDevelopmentPath=$(pwd)
# Package for distribution
npx vsce package
# Verify VSIX
ls -lh *.vsix
```
## Priority 3: Integrate Retro Coach with IDE (WSJF 13)
**Goal**: Enable contextual retro questions directly in VS Code
**Owner**: Innovator Circle
**Pattern**: retrospective-facilitation + circle-risk-focus
### Tasks
1. Create RetroCoachProvider for VS Code:
```typescript
// tools/goalie-vscode/src/retroCoachProvider.ts
export class RetroCoachProvider implements vscode.TreeDataProvider<RetroQuestion> {
  async getQuestions(): Promise<RetroQuestion[]> {
    const output = await execAsync('npx tsx tools/federation/retro_coach.ts --json');
    const data = JSON.parse(output);
    return data.questions.map(q => new RetroQuestion(q));
  }
}
```
2. Implement contextual question generation:
    * Detect open file circle (via CONSOLIDATED_ACTIONS.yaml mapping)
    * Load circle-specific retro template from `circles/{circle}/retro_template.yaml`
    * Generate questions aligned with circle P/D/A (Purpose/Domains/Accountability)
    * Show in VS Code TreeView sidebar
3. Add inline code actions:
    * Quick fix: "Apply safe-degrade pattern here"
    * Quick fix: "Add observability-first logging"
    * Quick fix: "Implement iteration budget check"
    * Triggered by retro coach recommendations
4. Wire retro insights to commit messages:
    * Capture retro question responses in extension
    * Format as commit message metadata:
```warp-runnable-command
fix: resolve cascading failure in processGovernor

Retro-Question: Why did circuit breaker not trip?
Retro-Answer: Threshold too high (5 failures vs recommended 3)
Pattern: safe-degrade + circuit-breaker
Circle: assessor
```
5. Add retro coach status bar item:
    * Show last retro run timestamp
    * Click to trigger full retro
    * Badge indicator for unresolved insights
### Acceptance Criteria
* RetroCoachProvider displays questions in VS Code sidebar
* Questions filtered by active file's circle context
* Inline code actions apply pattern-based fixes
* Commit messages include retro metadata
* Status bar item shows live retro coach status
### Implementation Files
* `tools/goalie-vscode/src/retroCoachProvider.ts` (new)
* `tools/goalie-vscode/src/codeActions.ts` (new)
* `tools/goalie-vscode/src/commitMessageProvider.ts` (new)
* `tools/federation/retro_coach.ts` (extend with --circle filter)
* `circles/{circle}/retro_template.yaml` (6 files, new)
### Testing
```warp-runnable-command
# Test retro coach with circle filter
npx tsx tools/federation/retro_coach.ts --json --circle analyst | jq '.questions'
# Test extension with retro view
code --extensionDevelopmentPath=tools/goalie-vscode
# Verify inline code actions
# (Open src/runtime/processGovernor.ts, expect safe-degrade quick fix)
```
# NEXT Tier (2-7 days) - WSJF 8-11
## Priority 4: Wire Federation Agents with agentic-jujutsu (WSJF 11)
**Goal**: Integrate Rust-based agentic-jujutsu for federation runtime
**Owner**: Innovator Circle
**Pattern**: federation-runtime + distributed-coordination
### Tasks
1. Verify agentic-jujutsu CLI installation:
```warp-runnable-command
which agentic-jujutsu || cargo install --path tools/agentic-jujutsu
agentic-jujutsu --version
```
2. Replace mock fallback in iris_bridge.js:
    * Current: lines 297-323 have mock fallback
    * Replace with real Rust CLI invocation
    * Parse jujutsu status output (JSON)
    * Map to iris_bridge state
3. Add Rust tag to pattern events:
```warp-runnable-command
log_pattern_event "governance-review" \
  "{\"jujutsu_status\": $status_json, \"framework\": \"rust\", \"tags\": [\"Rust\", \"Federation\"]}"
```
4. Integrate with BML cycles:
    * Pre-cycle: Run `agentic-jujutsu analyze` for repo health
    * During cycle: Log jujutsu events to pattern_metrics.jsonl
    * Post-cycle: Run `agentic-jujutsu status` for summary
5. Add federation health monitoring:
    * Track jujutsu command success rate
    * Monitor Rust process spawning latency
    * Alert on federation agent failures
### Acceptance Criteria
* agentic-jujutsu CLI integrated (no mock fallback)
* Rust tag present in ≥80% of federation pattern events
* BML cycles invoke jujutsu at pre/during/post stages
* Federation health metrics logged to pattern_metrics.jsonl
### Implementation Files
* `tools/federation/iris_bridge.js` (modify lines 297-323)
* `scripts/af` (add jujutsu invocation to full-cycle)
* `tools/agentic-jujutsu/src/main.rs` (verify CLI contract)
## Priority 5: Implement Decision Transformers / RL Patterns (WSJF 10)
**Goal**: Add reinforcement learning for pattern optimization
**Owner**: Analyst Circle
**Pattern**: ml-training-guardrail + predictive-analytics
### Tasks
1. Design Decision Transformer architecture:
    * Input: Pattern event sequences (from pattern_metrics.jsonl)
    * Output: Next best action (pattern to apply)
    * Model: Transformer with causal masking
    * Training: Offline RL on historical success metrics
2. Implement data pipeline:
```python
# scripts/ml/prepare_pattern_sequences.py
def load_pattern_sequences(jsonl_path):
    # Load pattern_metrics.jsonl
    # Group by run_id
    # Create sequences of (state, action, reward) tuples
    # Reward = delta improvement in governance_state.json
```
3. Train initial model:
    * Use existing pattern_metrics.jsonl as training data
    * Optimize for governance delta improvement
    * Validate on held-out cycles
4. Integrate with governance agent:
```typescript
// tools/federation/governance_agent.ts
async function predictNextPattern(currentState: GovernanceState): Promise<string> {
  const output = await execAsync('python3 scripts/ml/predict_pattern.py', JSON.stringify(currentState));
  return JSON.parse(output).recommended_pattern;
}
```
5. Add RL metrics to telemetry:
    * Model prediction accuracy
    * Reward signals (delta improvement)
    * Exploration vs exploitation ratio
### Acceptance Criteria
* Decision Transformer model trained with >60% accuracy
* Model integrated into governance agent
* RL metrics logged to pattern_metrics.jsonl
* A/B test shows model recommendations improve governance delta
### Implementation Files
* `scripts/ml/prepare_pattern_sequences.py` (new)
* `scripts/ml/train_decision_transformer.py` (new)
* `scripts/ml/predict_pattern.py` (new)
* `tools/federation/governance_agent.ts` (extend with ML prediction)
* `models/decision_transformer_v1.pkl` (new, model artifact)
## Priority 6: Build HPC/ML Telemetry Enrichment (WSJF 9)
**Goal**: Add advanced telemetry for HPC and ML workloads
**Owner**: Analyst Circle
**Pattern**: hpc-batch-window + ml-training-guardrail
### Tasks
1. Extend pattern metrics schema with HPC fields:
```json
{
  "pattern": "hpc-batch-window",
  "scheduler": "slurm",  // or "k8s", "local"
  "queue_time_sec": 120,
  "node_count": 4,
  "throughput_samples_sec": 1500,
  "p99_latency_ms": 25
}
```
2. Extend pattern metrics schema with ML fields:
```json
{
  "pattern": "ml-training-guardrail",
  "framework": "torch",  // or "tensorflow", "sklearn"
  "max_epochs": 100,
  "early_stop_triggered": true,
  "grad_explosions": 2,
  "nan_batches": 0,
  "gpu_util_pct": 85.3
}
```
3. Instrument HPC batch execution:
    * Detect SLURM/K8s environment
    * Log queue times, node allocation
    * Track throughput and latency percentiles
4. Instrument ML training loops:
    * Hook into PyTorch/TensorFlow callbacks
    * Log gradient norms, loss curves
    * Detect NaN/Inf values
    * Monitor GPU utilization
5. Add Stats robustness fields:
```json
{
  "pattern": "stat-robustness-sweep",
  "num_seeds": 10,
  "num_datasets": 5,
  "coverage_score": 0.87,
  "pvalue_min": 0.03
}
```
### Acceptance Criteria
* HPC patterns log scheduler, queue_time, throughput
* ML patterns log framework, epochs, GPU util
* Stats patterns log seeds, datasets, coverage
* Tag detection auto-adds ["HPC"], ["ML"], ["Stats"] based on fields
### Implementation Files
* `docs/PATTERN_EVENT_SCHEMA.md` (extend with HPC/ML/Stats fields)
* `scripts/af` (add HPC/ML detection logic)
* `scripts/ml/training_hooks.py` (new, PyTorch/TF callbacks)
* `scripts/hpc/slurm_telemetry.sh` (new, SLURM event logging)
# LATER Tier (1-2 weeks) - WSJF 5-8
## Priority 7: Complete Credential Provisioning (WSJF 8)
**Goal**: Provision all missing credentials for production deployment
**Owner**: Seeker Circle
**Pattern**: safe-degrade + guardrail-lock
### Tasks
1. Provision AWS credentials:
    * Create IAM user for agentic-flow production
    * Generate access key and secret key
    * Store in AWS Secrets Manager
    * Update .env with ARN reference
2. Provision Anthropic API key:
    * Purchase Claude Pro API access
    * Generate API key
    * Store in secrets manager
    * Test with `curl -H "x-api-key: $KEY" https://api.anthropic.com/v1/messages`
3. Provision Infrastructure credentials:
    * Cloudflare: Generate API token with DNS edit permissions
    * HostBill: Configure API credentials
    * cPanel: Generate API key
4. Provision Payment Gateway credentials:
    * Stripe: Use existing sandbox keys, upgrade to production
    * PayPal: Create business account, generate client ID/secret
    * Klarna: Register merchant account
5. Update secrets validation:
```warp-runnable-command
./scripts/validate-secrets.sh
# Expected: All required secrets present (0 missing)
```
### Acceptance Criteria
* All 25+ credentials provisioned and stored securely
* secrets validation script passes (0 missing)
* Production deployment can proceed
* Secrets rotation schedule documented
### Implementation Files
* `.env.production` (update with real credentials, gitignored)
* `docs/SECURITY.md` (update with provisioning status)
* `scripts/validate-secrets.sh` (run to verify)
## Priority 8: Implement Secrets Rotation Automation (WSJF 7)
**Goal**: Automate credential rotation for security compliance
**Owner**: Assessor Circle
**Pattern**: guardrail-lock + security-first
### Tasks
1. Create rotation schedule:
    * Critical (AWS, Anthropic): Every 90 days
    * High (Payment gateways): Every 180 days
    * Medium (Infrastructure): Every 365 days
2. Implement rotation script:
```python
# scripts/security/rotate_secrets.py
def rotate_secret(secret_name, rotation_days):
    # Check last rotation date
    # If > rotation_days, trigger rotation
    # Update secrets manager
    # Log to audit trail
```
3. Add rotation monitoring:
    * Track rotation attempts (success/failure)
    * Alert on rotation failures
    * Log to pattern_metrics.jsonl with security tag
4. Create emergency rotation procedure:
    * Document in docs/SECURITY.md
    * Add runbook for credential compromise
    * Test emergency rotation in dev
### Acceptance Criteria
* Rotation script operational
* All secrets have rotation schedule
* Monitoring alerts on rotation failures
* Emergency procedure documented
### Implementation Files
* `scripts/security/rotate_secrets.py` (new)
* `scripts/security/audit_secrets.py` (new)
* `.goalie/secrets_rotation_schedule.yaml` (new)
* `docs/SECURITY.md` (update with rotation procedures)
## Priority 9: Deploy Discord Bot to Production (WSJF 6)
**Goal**: Deploy Discord bot with full command set
**Owner**: Orchestrator Circle
**Pattern**: federation-runtime + observability-first
### Tasks
1. Complete Discord.js integration:
    * Implement `/retro` command (show last 5 insights)
    * Implement `/metrics` command (show live pattern metrics)
    * Implement `/governance` command (trigger governance agent)
    * Implement `/wsjf` command (show top 5 WSJF items)
2. Deploy Cloudflare Workers endpoint:
```warp-runnable-command
cd workers
wrangler deploy discord-webhook.ts
```
3. Configure Discord application:
    * Set interactions endpoint URL (Cloudflare Workers URL)
    * Register slash commands
    * Test with /ping command
4. Implement production hardening:
    * Rate limiting (10 commands/min per user)
    * Error handling with retry
    * Logging to pattern_metrics.jsonl
5. Add monitoring:
    * Track command latency
    * Monitor bot uptime
    * Alert on failures
### Acceptance Criteria
* Bot responds to all slash commands
* Cloudflare Workers endpoint deployed
* Rate limiting enforced
* 99.9% uptime over 7 days
### Implementation Files
* `src/discord/bot.ts` (implement commands)
* `workers/discord-webhook.ts` (deploy to Cloudflare)
* `scripts/deploy_discord_bot.sh` (update for production)
* `.env.production` (add DISCORD_BOT_TOKEN)
# Success Metrics
## Process Metrics
* Time retro→code: <1 hour (current: <30min ✅)
* Action completion rate: >80% (current: 69.2%)
* Context switches per day: <5 (current: 0 ✅)
* WIP violations: <5% (current: 0% ✅)
## Technical Metrics
* Pattern telemetry coverage: ≥90% (current: ~70%)
* Tag coverage: ≥90% (HPC/ML/Stats/Federation)
* VS Code extension loads without errors
* Discord bot uptime: >99.9%
* Secrets rotation: 100% on schedule
## Learning Metrics
* AgentDB episodes: >100 (current: 102 ✅)
* Decision Transformer accuracy: >60%
* Retro insight→feature conversion: >60% (current: 7.1%)
# Risk Mitigation
## Risk: Pattern Instrumentation Overhead
* **Likelihood**: Medium
* **Impact**: Low (5-10ms per event)
* **Mitigation**: Async logging, batch writes every 10 events
* **Owner**: Orchestrator Circle
## Risk: VS Code Extension Performance
* **Likelihood**: Medium
* **Impact**: Medium (UI lag)
* **Mitigation**: Debounce file watchers, lazy load WebView
* **Owner**: Intuitive Circle
## Risk: Missing Credentials Block Production
* **Likelihood**: High
* **Impact**: High (blocks deployment)
* **Mitigation**: Provision in LATER tier, use sandbox/dev keys in interim
* **Owner**: Seeker Circle
## Risk: Federation Agent Integration Complexity
* **Likelihood**: High
* **Impact**: Medium (may need refactor)
* **Mitigation**: Start with simple CLI integration, iterate
* **Owner**: Innovator Circle
# Dependencies
## Technical
* Python 3.13+ (installed ✅)
* Node.js 22.21+ (installed ✅)
* Rust toolchain (for agentic-jujutsu)
* VS Code API (for extension)
* Discord.js v14
* Chart.js (for metrics visualization)
## External
* Anthropic API access (for production)
* AWS account (for secrets manager)
* Cloudflare account (for Workers)
* Discord application (created ✅)
# Timeline
## Week 1 (NOW Tier)
* Day 1-2: Enhance scripts/af telemetry (Priority 1)
* Day 3-4: VS Code extension scaffold (Priority 2)
* Day 4-5: Integrate retro coach with IDE (Priority 3)
## Week 2 (NEXT Tier)
* Day 6-7: Wire federation agents (Priority 4)
* Day 8-9: Implement Decision Transformers (Priority 5)
* Day 10-11: Build HPC/ML telemetry (Priority 6)
## Week 3 (LATER Tier)
* Day 12-13: Provision credentials (Priority 7)
* Day 14: Implement secrets rotation (Priority 8)
* Day 15-16: Deploy Discord bot (Priority 9)
**Total Estimated Duration**: 16 days (~3 weeks)