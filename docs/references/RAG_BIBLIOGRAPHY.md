# Agentic RAG Flow — Categorized Reference Map

Generated from the reference set surfaced in the 2026-06-25 review cycle.
Purpose: turn the reading list into a decision map for what to adopt in the
agentic-flow RAG / memory / orchestration substrate.

## How to use this map

Each entry is tagged with:
- **Adopt** — pull into the codebase or process now
- **Evaluate** — run a spike / proof-of-concept before committing
- **Watch** — relevant but not immediately actionable
- **Archive** — domain-interest only, low fit for current stack

---

## 1. RAG & Memory Systems (highest fit)

| Reference | What it is | RAG problem it solves | Action |
|-----------|------------|----------------------|--------|
| [UniversalRAG](https://universalrag.github.io/) | Multi-modal / multi-granularity RAG framework (ACL 2026) | Corpora are heterogeneous; need one retrieval substrate across text, tables, images, code | **Evaluate** — prototype against our docs/proto/code mix |
| [Sakana DroPE](https://pub.sakana.ai/DroPE/) | Drop positional embeddings post-training to extend context zero-shot | Context window is too short for long traces; fine-tuning is expensive | **Evaluate** — test on long agent trajectories |
| [Sakana RePo](https://pub.sakana.ai/repo/) / [arXiv:2512.14391](https://arxiv.org/abs/2512.14391) | Re-position tokens dynamically based on context dependencies | Long-context attention is noisy; want to compress irrelevant positions | **Evaluate** — pair with AgentDB retrieval |
| [Agentic Memory (arXiv:2601.01885)](https://arxiv.org/abs/2601.01885) | Unified LTM/STM management as part of agent policy | Agents don't decide what to remember / forget / retrieve | **Adopt** — design doc for ADR-006/009 memory service |
| [Active Context Compression (arXiv:2601.07190)](https://arxiv.org/abs/2601.07190) | Slime-mold-inspired autonomous memory consolidation | Token bloat from raw interaction history | **Evaluate** — compare against our `correlate_timescape_evidence.py` summarization |
| [SimpleMem (arXiv:2601.02553)](https://arxiv.org/abs/2601.02553) | Semantic lossless compression + intent-aware retrieval | Storage cost and retrieval precision for lifelong agent memory | **Evaluate** — benchmark compression vs. HNSW recall |
| [MemRL (arXiv:2601.03192)](https://arxiv.org/abs/2601.03192) | Runtime RL on episodic memory with two-phase retrieval | Noisy memory retrieval; need utility-weighted recall | **Watch** — useful once reward signal is mature |
| [Recursive Language Models (arXiv:2512.24601)](https://arxiv.org/pdf/2512.24601) | Recursively decompose long prompts into external environment | Long context exceeds model limits; need chunking strategy | **Adopt** — apply to RAG prompt assembly |
| [Attention Is Not What You Need (arXiv:2512.19428)](https://arxiv.org/abs/2512.19428) | Attention as tensor lifting; attention-free alternatives | Latency and cost of full self-attention on edge | **Watch** — revisit when we profile edge inference |
| [Darwin QE Self-Learning Guide](https://github.com/proffesor-for-testing/agentic-qe/blob/main/docs/guides/darwin-qe-self-learning.md) | Rust-native hybrid RAG (FTS5 + embeddings), Bayesian scoring | Need local-first, privacy-respecting agent memory with quality scoring | **Adopt** — align with AgentDB/Ruflo memory backend |

### RAG Flow action items
1. Add a **multi-modal retriever** evaluation harness using UniversalRAG as the baseline.
2. Implement **context-repositioning** as a post-retrieval transform before LLM call.
3. Replace fixed-context injection with **recursive decomposition** for long evidence manifests.
4. Wire **Darwin-style hybrid retrieval** (FTS5 + HNSW) into `AgentDB` as the default backend.

---

## 2. Agentic Orchestration & Multi-Agent

| Reference | What it is | Orchestration problem it solves | Action |
|-----------|------------|--------------------------------|--------|
| [Agentic QE v3.11.1 Release](https://github.com/proffesor-for-testing/agentic-qe/blob/main/docs/releases/v3.11.1.md) | 60-agent QE fleet with Queen Coordinator | Need a proven pattern for 15+ agent hierarchical mesh | **Adopt** — model v3 swarm coordination on this pattern |
| [Agent Harness Generator](https://github.com/ruvnet/agent-harness-generator) | Factory for branded agent harnesses (MCP, memory, learning) | Every agent needs scoped memory + governance | **Evaluate** — compare against our `scripts/hire/` MCP client |
| [ElizaOS](https://github.com/elizaos) | Full agent OS with RAG ingestion, multi-agent architecture, plugins | Want a model-agnostic agent runtime with rich connectors | **Watch** — borrow plugin architecture, not full migration |
| [Pydantic AI + DBOS](https://ai.pydantic.dev/durable_execution/dbos/) | Durable execution for AI agents with automatic recovery | Agent workflows crash mid-run; need checkpointing | **Adopt** — add durable execution to long agent loops |
| [DBOS Contexts](https://docs.dbos.dev/python/reference/contexts) | Workflow spawning, events, status tracking | Need primitives for agent workflow state | **Adopt** — wrap our tick/cycle loops in durable workflows |
| [DBOS Queues](https://docs.dbos.dev/python/reference/queues) | DB-backed queues with concurrency limits | Need queue-based agent dispatch | **Adopt** — replace ad-hoc queue logic in `tick_post_hooks.sh` |
| [OrgAgent (arXiv:2604.01020)](https://arxiv.org/abs/2604.01020) | Company-style hierarchical multi-agent framework | Token burn from flat multi-agent coordination | **Evaluate** — use for executive/agent hierarchy design |
| [OpenRouter Broadcast](https://openrouter.ai/docs/guides/features/broadcast/overview) | LLM trace routing to 15+ observability platforms | Need observability for LLM calls without instrumentation | **Watch** — use if we adopt OpenRouter for model routing |
| [SkillOpt (arXiv:2605.23904)](https://arxiv.org/abs/2605.23904) | Self-evolving skill documents as trainable agent state | Agents need to learn and update skills without redeployment | **Evaluate** — integrate with ReasoningBank learning |

### Orchestration action items
1. Wrap `tick_post_hooks.sh` and `cycle_tick.sh` in **DBOS durable workflows**.
2. Add a **DBOS queue** for AQE agent dispatch.
3. Document the Queen Coordinator pattern as the canonical 15-agent mesh topology.

---

## 3. Temporal / Edge Systems

| Reference | What it is | Temporal / edge problem it solves | Action |
|-----------|------------|----------------------------------|--------|
| [RuVector emergent-time](https://github.com/ruvnet/RuVector/tree/main/crates/emergent-time) | Relational time primitive (no external clock) | Agent traces need an internal, ordered notion of time | **Adopt** — use as the substrate for `inbox_zero_timescape.py` |
| [Learning Latent Action World Models (arXiv:2601.05230)](https://arxiv.org/abs/2601.05230) | World models without action labels | Agents need to predict consequences of actions | **Watch** — relevant for planning layer, not immediate RAG |
| [Dr. Zero (arXiv:2601.07055)](https://arxiv.org/abs/2601.07055) | Self-evolving agents without training data | Need agents that generate their own practice problems | **Watch** — useful for test-generation agents |
| [Agent-as-a-Judge (arXiv:2601.05111)](https://arxiv.org/abs/2601.05111) | Survey of agentic evaluation with persistent memory | Need agentic evaluation for our own QA swarm | **Evaluate** — apply to AQE judge agents |
| [Ministral 3 (arXiv:2601.08584)](https://arxiv.org/abs/2601.08584) | 3B/8B/14B parameter-efficient models | Edge inference needs small, capable models | **Watch** — benchmark for edge gateway |
| [All elementary functions from a single binary operator (arXiv:2603.21852)](https://arxiv.org/abs/2603.21852) | `eml(x,y) = exp(x) - ln(y)` generates all elementary functions | Mathematical substrate for agent reasoning | **Archive** — interesting, not actionable |
| [LEI / ArXiv Edge-Intelligence Digest](https://arxiv.org/abs/2604.09607) | Cloud LLM generates device-side logic validated locally | TLD dashboards need per-host tailored configs | **Adopt** — generate per-TLD `evidence-manifest.json` + Caddy config |

### Temporal / edge action items
1. Adopt `emergent-time` as the canonical time primitive for timescape metrics.
2. Generate per-TLD edge manifests using the LEI pattern.

---

## 4. Error Handling, Philosophy & Reliability

| Reference | What it is | Problem it solves | Action |
|-----------|------------|--------------------|--------|
| [Philosophy of Error in Science (OUP)](https://global.oup.com/academic/product/toward-a-philosophy-of-error-in-science-9780197827673) | Philosophical framework for scientific error | How should agentic systems reason about and recover from error? | **Watch** — inform error taxonomy in ROAM |
| [Oracle and the Kernel (ResearchGate)](https://www.researchgate.net/publication/405975883_The_Oracle_and_the_Kernel_A_Falsifiable_Substrate-Bounded_Theory_of_Domain_Super-Intelligence_The_Deterministic_Oracle_as_Grounding_Anchor_the_Minimum_Grounding_Set_as_the_One-Percent_Kernel_and_an_In) | Substrate-bounded theory of domain super-intelligence | Grounding and falsifiability for agentic claims | **Watch** — not directly accessible; revisit if full text found |
| [StarlingX r/stx.11.0](https://review.opendev.org/q/projects:starlingx+branch:+r/stx.11.0) / [merged](https://review.opendev.org/q/projects:starlingx+is:merged+branch:master) | Carrier-grade edge Kubernetes development history | High-availability edge patterns | **Watch** — reference for edge infrastructure design |
| [K8s Conformance StarlingX v1.33](https://github.com/cncf/k8s-conformance/tree/master/v1.33/starlingx) | CNCF conformance results for StarlingX | Validating our own Kubernetes edge deployments | **Watch** — compare if we certify our edge stack |

### Error handling action items
1. Add an **error taxonomy** to ROAM that distinguishes recoverable, fatal, and ground-truth errors.
2. Document the one-percent-kernel idea as a grounding principle for scorecard claims.

---

## 5. Biology-Inspired Computing

| Reference | What it is | Inspiration | Action |
|-----------|------------|-------------|--------|
| [Neuron consciousness special issue](https://www.cell.com/neuron/fulltext/S0896-6273(24)00088-6) | Consciousness research reviews | Architectural inspiration for attention / awareness | **Archive** |
| [MIT digital brain research](https://direct.mit.edu/imag/article/doi/10.1162/imag_a_00137/120391/The-coming-decade-of-digital-brain-research-A) | Digital brain research vision | Multiscale data integration | **Archive** |
| [Human Connectome Project](https://www.humanconnectome.org/) | Brain connectivity mapping | Graph-based memory / relationship models | **Archive** |
| [Allen Brain Atlas](https://brain-map.org/) | Brain atlases and reference frameworks | Structured ontologies for knowledge | **Archive** |
| [Virtual Fly Brain](https://www.virtualflybrain.org/) | Drosophila connectome atlas | FAIR data integration | **Archive** |
| [FlyBase](https://flybase.org/) | Drosophila genomics database | Curated knowledge bases | **Archive** |
| [OpenWorm](https://openworm.org/index.html) / [OpenWormLLM](https://huggingface.co/spaces/openworm/OpenWormLLM) | Whole-organism simulation + LLM interface | Simulation-informed agent models | **Archive** |
| [Biodegradable synapse (Nature)](https://www.nature.com/articles/s41467-025-66511-3) | Low-power neuromorphic device | Edge hardware efficiency | **Watch** |

---

## 6. Commercial / Tooling

| Reference | What it is | Use case | Action |
|-----------|------------|----------|--------|
| [OpenSpec](https://openspec.dev) | Lightweight spec-driven development framework | Maintain system context across agents | **Evaluate** — compare with our ADR / spec process |
| [Anthropic Financial Services](https://www.anthropic.com/news/advancing-claude-for-financial-services) | Claude add-ins for financial analysis | Connector pattern for external data | **Watch** — useful if we build financial agent skills |
| [Lovable Strategy Streams](https://module-guide-play.lovable.app/strategy/streams/) | Active revenue streams module | Business strategy reference | **Watch** — inaccessible via search |
| [X / 0xCodez](https://x.com/0xcodez/status/2064374643729773029?s=46) | Social post | Unknown — requires auth | **Watch** — revisit if content becomes accessible |
| [Google Drive file](https://drive.google.com/file/d/1qzKI4DKnyHRpXK1J3ATPqwaqLc0iNu-M/view) | Private document | Unknown — requires auth | **Watch** — share access if relevant |

---

## Recommended Adoption Order

1. **Durable execution** — wrap agent loops with DBOS (highest reliability ROI).
2. **Hybrid memory retrieval** — FTS5 + HNSW in AgentDB (highest RAG ROI).
3. **Recursive decomposition** — chunking strategy for long evidence manifests.
4. **Context re-positioning** — reduce noise in retrieved context before LLM call.
5. **emergent-time** — replace external-clock assumptions in timescape metrics.
6. **Per-TLD edge manifests** — generate tailored configs per host.
7. **Queen Coordinator pattern** — document the 15-agent mesh topology.

---

*File: `docs/references/AGENTIC_RAG_BIBLIOGRAPHY.md`*
*Updated: 2026-06-25*
