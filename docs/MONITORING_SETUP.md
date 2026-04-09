# 🔭 Monitoring & Analytics Environment Setup

> [!NOTE]
> This runbook is intended specifically for the local, private Mac agentic execution topology (Ollama / Qwen / Gemma + OpenCode) mapping organically alongside STX12 / HostBill baseline nodes natively.

## 1. Local CLI Metrics Output (OpenCode / Ollama)
When utilizing `OPENCODE_DISABLE_DEFAULT_PLUGINS=true opencode`, explicit token sizes, reasoning lengths, and fallback actions will be securely bound mapped strictly locally. 

**STX & JIT Telemetry Bounding**: 
`scripts/ci/collect_metrics.py` now specifically watches the `.agentic_logs` for `opencode` execution streams binding physical metrics mapping locally directly alongside the HostBill STX ($130.14) baselines. 

## 2. Agentic QE Telemetry (`npx agentic-qe@3.9.0`)
Agentic-QE local Unified Memory (`.agentic-qe/memory.db`) will inherently output the trace metrics:
*  **Hooks Activated**: Claude Code / OpenCode compatibility tracing.
*  **Nodes Captured**: 88k+ nodes mapped globally from the repository tree automatically.

## 3. Real-Time Dashboards
To launch the real-time observer locally mapping to OpenStack integration traces:
```bash
python scripts/monitoring_dashboard.py --target local-swarm
```

---
# ⚠️ Operations & Incident Management Protocol
