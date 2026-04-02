# CAPABILITY BACKLOG - WSJF-Prioritized Integration Pipeline
## Generated: 2026-04-02T18:50:00Z
## Sort Order: Cost of Delay ÷ Job Size (Highest First)

---

## 📍 CRITICAL TRUST BLOCKERS (WSJF 95-100)
### Must resolve before any capability migration

#### 1. GitNexus Code Intelligence (WSJF: 100)
- **Repo**: https://github.com/abhigyanpatwari/GitNexus
- **Purpose**: Zero-server code intelligence with knowledge graph
- **Integration**: MCP server for code navigation
- **Action**: `npx gitnexus analyze` (already indexed: 153624 symbols)
- **Status**: ✅ Active - CLI and MCP available

#### 2. Superproject Git Health (WSJF: 100)
- **Blocker**: Corrupted `.git/objects/pack` in superproject
- **Impact**: Pre-commit hooks bypassed, CI/CD blocked
- **Solution**: Isolate to healthy submodule `investing/agentic-flow`
- **Evidence**: CSQBM verified active in submodule

---

## 🏗️ INFRASTRUCTURE & GATES (WSJF 90-94)

#### 3. Agentic QE Fleet (WSJF: 95)
- **Repo**: https://github.com/proffesor-for-testing/agentic-qe
- **Purpose**: AI-powered quality engineering (82 skills)
- **Key Skills**: brutal-honesty-review, chaos-engineering-resilience
- **Action**: `npx agentic-qe init --auto`
- **Integration**: Mutation testing, coverage analysis

#### 4. PI MCP Adapter (WSJF: 92)
- **Repo**: https://github.com/nicobailon/pi-mcp-adapter
- **Purpose**: Raspberry Pi hardware abstraction
- **Status**: ✅ Implemented at `src/mcp/pi-adapter.ts`
- **Features**: GPIO control, sensor reading, health validation

#### 5. Polyglot LLM Integration (WSJF: 90)
- **Repo**: https://github.com/eleutherai/polyglot
- **Purpose**: Multilingual model support
- **Integration**: Language-agnostic agent communication

---

## 🔍 VALIDATION & VERIFICATION (WSJF 80-89)

#### 6. Stryker Mutation Testing (WSJF: 88)
- **Config**: `stryker.conf.js`
- **Thresholds**: high=80%, low=60%
- **Target**: `scripts/policy/governance.py`
- **Action**: `npx stryker run`

#### 7. Contract Enforcement Gate (WSJF: 85)
- **Script**: `scripts/contract-enforcement-gate.sh`
- **Rules**: No shortcuts, no fake data, always verify
- **Audit**: `.contract-enforcement/audit-trail.jsonl`

#### 8. Deep CSQBM Validation (WSJF: 82)
- **Script**: `scripts/validators/project/check-csqbm.sh`
- **Feature**: Deep-why analysis with 120min lookback
- **Status**: ✅ Verified (3 targets matched)

---

## 📊 TELEMETRY & CAUSALITY (WSJF 70-79)

#### 9. HostBill STX Integration (WSJF: 78)
- **File**: `scripts/ci/hostbill-sync-agent.py`
- **Enhancement**: STX ipmitool baseline
- **Output**: `.goalie/hostbill_ledger.json`
- **Test Mode**: `HOSTBILL_TEST_MODE=1`

#### 10. Governance Engine (WSJF: 75)
- **File**: `scripts/policy/governance.py`
- **Pattern**: AdmissionController with DI
- **Enhancement**: Guard clauses with early exits
- **Test**: Parameterized boundary testing

#### 11. AgentDB Integration (WSJF: 72)
- **Path**: `agentdb.db`
- **Freshness**: <96 hours required
- **Query**: CSQBM Current-State Query Before Merge
- **Risk**: Stale data → hallucinations

---

## 🎯 CAPABILITY MIGRATION (WSJF 60-69)

#### 12. ElizaOS Integration (WSJF: 68)
- **Repo**: https://github.com/elizaos/eliza
- **Purpose**: Agent orchestration framework
- **Plugin Registry**: https://github.com/elizaos-plugins/registry
- **Action**: Evaluate for billing integration

#### 13. Risk Analytics Dashboard (WSJF: 65)
- **Repo**: https://github.com/rooz-live/risk-analytics
- **Domain**: https://rooz.live/
- **Action**: Soft launch with blockers resolved

#### 14. TLD Tunnel Exposure (WSJF: 62)
- **Scripts**: `scripts/start-tld-tunnel.sh`
- **Config**: `.tld-config`
- **Integration**: ngrok/agent-skills

---

## 🔧 EXTERNAL INTEGRATIONS (WSJF 50-59)

#### 15. StarlingX STX-11 (WSJF: 58)
- **Review**: https://review.opendev.org/q/projects:starlingx+branch:+r/stx.11.0
- **Certs**: https://github.com/cncf/k8s-conformance/tree/master/v1.33/starlingx
- **Focus**: PI sync roam risks

#### 16. OpenCode AI (WSJF: 55)
- **Repo**: https://github.com/code-yeongyu/oh-my-opencode
- **Purpose**: Multi-provider Claude Code adapter
- **Providers**: OpenAI, openrouter, x.ai

#### 17. MCP Ecosystem (WSJF: 52)
- **Google MCP**: https://github.com/google/mcp
- **MCP Use**: https://github.com/mcp-use/mcp-use
- **Skills**: https://github.com/ComposioHQ/awesome-claude-skills

---

## 📚 RESEARCH & INNOVATION (WSJF 40-49)

#### 18. AlphaEvolve (DeepMind) (WSJF: 48)
- **Paper**: https://deepmind.google/blog/alphaevolve-a-gemini-powered-coding-agent
- **Purpose**: Algorithm design optimization
- **PDF**: Available for review

#### 19. TurboQuant (Google) (WSJF: 45)
- **Blog**: https://research.google/blog/turboquant-redefining-ai-efficiency
- **Purpose**: Extreme model compression
- **Doc**: `docs/TURBOQUANT-DGM-METRICS-2026-03-28.md`

#### 20. Darwin Gödel Machine (WSJF: 42)
- **Paper**: https://arxiv.org/abs/2603.19461
- **Purpose**: Open-ended self-improvement
- **Pattern**: Generate and evaluate variants

---

## 🚀 EMERGING CAPABILITIES (WSJF 30-39)

#### 21. NotebookLM CLI (WSJF: 38)
- **Repo**: https://github.com/jacob-bd/notebooklm-cli
- **Purpose**: Local NotebookLM implementation
- **Integration**: Document processing

#### 22. VisionClaw Skills (WSJF: 35)
- **Repo**: https://github.com/DreamLab-AI/VisionClaw/tree/main/multi-agent-docker/skills
- **Skill**: build-with-quality
- **Purpose**: Quality-focused development

#### 23. Agentic Jujutsu (WSJF: 32)
- **Crate**: https://crates.io/crates/agentic-jujutsu
- **NPM**: https://www.npmjs.com/package/agentic-jujutsu
- **Purpose**: Quantum-resistant version control

---

## 📋 INTEGRATION CHECKLIST

### Before Next Merge:
- [ ] Run `npx tsc --noEmit` (TypeScript validation)
- [ ] Run `npx eslint . --quiet` (Lint validation)
- [ ] Run `npx stryker run` (Mutation testing >80%)
- [ ] Run `scripts/contract-enforcement-gate.sh verify`
- [ ] Verify agentdb.db freshness (<96 hours)
- [ ] Check submodule git status clean

### Evidence Required:
- [ ] Test output showing all guard clauses exercised
- [ ] Mutation testing report with kill rate
- [ ] CSQBM deep-why scan results
- [ ] Pre-commit hook execution log

---

## 🔄 WSJF RESCORE AFTER CYCLE

### Completed This Cycle:
1. ✅ PI MCP Adapter - Implemented with DI
2. ✅ Governance Guard Clauses - Early exits added
3. ✅ HostBill STX Enhancement - MockSTXSensor for TDD
4. ✅ Workflow WSJF Prioritization - CI updated

### Next Cycle Candidates:
1. Meta-Prioritization: Prompt Re-sorting & WSJF Reindex (Complete)
2. GitNexus analyze workflow (Iterative/Incremental)
3. MPP/TDD Specification-Driven Development Alignment
4. UI Component Evolution & Live TLD Tuning

---

*This backlog is dynamically regenerated. WSJF scores are recalculated each cycle based on Cost of Delay and Job Size changes.*
