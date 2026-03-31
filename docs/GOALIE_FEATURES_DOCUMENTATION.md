# Goalie System Features Documentation

**Date**: 2025-11-20  
**Version**: 1.0.0  
**Status**: ✅ COMPLETE

---

## Table of Contents

1. [Overview](#overview)
2. [Pattern Recognition](#pattern-recognition)
3. [Economic Gap Analysis](#economic-gap-analysis)
4. [Observability Actions](#observability-actions)
5. [Code Fix Proposals](#code-fix-proposals)
6. [Workload-Specific Features](#workload-specific-features)
7. [VS Code Extension](#vs-code-extension)
8. [Real-Time Dashboard](#real-time-dashboard)
9. [User Study Framework](#user-study-framework)

---

## Overview

The Goalie system provides comprehensive governance, audit, review, retrospective, and replenishment capabilities for the `agentic-flow` project. It supports multiple workload types including Machine Learning (TensorFlow/PyTorch), High Performance Computing (HPC), Statistical Analysis, and Device/Web prototype workflows.

### Key Features

- **Pattern Recognition**: Automatic detection of development and operational patterns
- **Economic Gap Analysis**: Cost of Delay (COD) and WSJF prioritization
- **Observability Actions**: Automated generation of observability gap actions
- **Code Fix Proposals**: AI-generated code snippets for common patterns
- **Workload-Specific Analysis**: Domain-specific economic models and calculators
- **Real-Time Monitoring**: Live dashboard for cluster health and training jobs
- **VS Code Integration**: Seamless integration with VS Code for developer workflow

---

## Pattern Recognition

### Pattern Sources

Patterns are defined in `.goalie/PATTERNS.yaml`, which serves as the single source of truth for all pattern definitions. This file is used by:

- `governance_agent.ts` (economic gap analysis)
- `retro_coach.ts` (retrospective insights)
- `goalieGapsProvider.ts` (VS Code extension)
- `suggest_actions.py` (observability action generation)

### Pattern Categories

1. **ML Patterns**: Machine learning training and serving patterns
   - `ml-training-guardrail`
   - `distributed-training-failure`
   - `mixed-precision-check`
   - `checkpoint-corruption`
   - And more...

2. **HPC Patterns**: High performance computing cluster patterns
   - `hpc-batch-window`
   - `cluster-fragmentation`
   - `network-bottleneck`
   - `node-failure-recovery`

3. **Stats Patterns**: Statistical analysis patterns
   - `stat-robustness-sweep`
   - `multiple-testing-correction`
   - `data-leakage-detection`
   - And more...

4. **Device/Web Patterns**: Mobile, desktop, and web prototype patterns
   - `device-coverage`
   - `mobile-interaction-lag`
   - `web-vitals-cls`
   - And more...

### Pattern Schema

Each pattern in `PATTERNS.yaml` includes:

```yaml
- id: pattern-name
  name: Human Readable Name
  description: Pattern description
  category: ML | HPC | Stats | Device/Web | General
  workload_tags: [ML, HPC, Stats, Device/Web]
  frameworks: [tensorflow, pytorch, etc.]
  schedulers: [slurm, k8s, etc.]
  cod_threshold: 6
  observability_required: true
  code_fix_available: true
```

---

## Economic Gap Analysis

### Cost of Delay (COD)

COD is calculated using workload-specific calculators that account for domain-specific cost structures:

- **HPC**: GPU idle time, cluster fragmentation, network bottlenecks
- **ML**: Training delays, model serving latency, checkpoint corruption
- **Stats**: Statistical validity costs, data quality issues
- **Device/Web**: User experience impact, performance degradation

### COD Calculators

Workload-specific COD calculators are available in `tools/federation/cod_calculators.ts`:

- `calculateHPCCOD()`: HPC-specific calculations
- `calculateMLCOD()`: ML-specific calculations
- `calculateStatsCOD()`: Stats-specific calculations
- `calculateDeviceWebCOD()`: Device/Web-specific calculations
- `calculateCOD()`: Main router function

### Usage

```typescript
import { calculateCOD } from './cod_calculators';

const context = {
  pattern: 'hpc-batch-window',
  workloadType: 'HPC',
  queue_time_sec: 1800,
  gpu_util_pct: 60,
  node_count: 16,
  // ... other context fields
};

const result = calculateCOD(context);
console.log(`COD: $${result.cod.toFixed(2)}`);
console.log(result.breakdown);
```

---

## Observability Actions

### Auto-Generation

Observability actions are automatically generated from pattern metrics using `scripts/agentic/generate_observability_actions.py`. This script:

1. Reads `pattern_metrics.jsonl` and `PATTERNS.yaml`
2. Identifies patterns with high COD but no observability actions
3. Generates `OBSERVABILITY_ACTIONS.yaml` entries

### Manual Generation

You can also manually create observability actions by editing `.goalie/OBSERVABILITY_ACTIONS.yaml` or using the template at `.goalie/OBSERVABILITY_ACTIONS.yaml.template`.

### Command

```bash
# Generate observability actions from pattern metrics
af suggest-actions

# This will:
# 1. Run suggest_actions.py (from retro insights)
# 2. Run generate_observability_actions.py (from pattern metrics)
```

### Action Schema

```yaml
items:
  - id: OBS-<pattern>-<timestamp>
    title: "Action description"
    category: observability
    source: pattern_metrics | retro_insight | manual
    timestamp: "ISO 8601 timestamp"
    depth: 0-4
    circle: "Analyst|Assessor|Innovator|Intuitive|Seeker|Architect"
    pattern: "pattern-name"
    tags: ["tag1", "tag2"]
    status: pending | in_progress | done
    observability_type: logging | metrics | tracing | alerting | dashboard
    framework_hint: "tensorflow|pytorch" (optional)
    scheduler_hint: "slurm|k8s" (optional)
```

---

## Code Fix Proposals

The Governance Agent can automatically generate code fix proposals for patterns that support it. Proposals include:

- **Code Snippets**: Framework-specific implementations (TensorFlow, PyTorch, etc.)
- **Config Snippets**: Configuration files (SLURM scripts, YAML configs)
- **Test Snippets**: Test code (Jest, pytest, etc.)

### Supported Patterns

- `guardrail-lock`: Jest test snippet
- `ml-training-guardrail`: TensorFlow/PyTorch checkpointing and early stopping
- `hpc-batch-window`: Optimized SLURM batch script
- `safe-degrade`: TypeScript `SafeGuard` wrapper class
- `observability-first`: `observability.yaml` configuration
- `iteration-budget`: `autocommit_policy.yaml` configuration
- And more...

### Accessing Proposals

Code fix proposals are included in the Governance Agent JSON output:

```bash
af governance-agent --json | jq '.codeFixProposals'
```

---

## Workload-Specific Features

### ML Workloads

**Supported Frameworks**: TensorFlow, PyTorch  
**Schedulers**: Kubernetes, SLURM  
**Key Metrics**: GPU utilization, training latency, gradient stability, checkpoint integrity

**Patterns**:
- Training guardrails (gradient explosions, NaN batches)
- Distributed training failures
- Mixed precision issues
- Checkpoint corruption
- OOM recovery

### HPC Workloads

**Schedulers**: SLURM  
**Key Metrics**: Queue time, GPU utilization, throughput, node count, network bandwidth

**Patterns**:
- Batch window optimization
- Cluster fragmentation
- Network bottlenecks
- Node failure recovery

### Stats Workloads

**Frameworks**: sklearn, scipy, statsmodels  
**Key Metrics**: Coverage scores, p-values, sample sizes, false discovery rates

**Patterns**:
- Statistical robustness sweeps
- Multiple testing correction
- Data leakage detection
- Sample size inadequacy

### Device/Web Workloads

**Frameworks**: React Native, Electron, Next.js  
**Key Metrics**: Core Web Vitals (CLS, LCP, FID), touch target sizes, response times

**Patterns**:
- Device coverage
- Mobile interaction lag
- Web vitals issues
- Desktop memory leaks

---

## VS Code Extension

### Installation

1. Build the extension:
   ```bash
   cd tools/goalie-vscode
   npm install
   npm run build
   ```

2. Package the extension:
   ```bash
   npm run package
   ```

3. Install the `.vsix` file in VS Code

### Features

- **Goalie Kanban View**: Kanban board visualization
- **Pattern Metrics View**: Pattern event visualization with workload badges
- **Governance Economics View**: Economic gap analysis with severity indicators
- **Depth Ladder Timeline View**: Timeline visualization
- **Goalie Gaps View**: Observability gaps and economic gaps

### Commands

- `goalie.runGovernanceAudit`: Run governance audit
- `goalie.runRetro`: Run retro coach
- `goalie.openLiveGapsPanel`: Open real-time dashboard

### Configuration

```json
{
  "goalie.directoryPath": ".goalie",
  "goalie.autoDetectLens": true,
  "goalie.defaultLens": "ALL",
  "goalie.enableRealtimeDashboard": false
}
```

---

## Real-Time Dashboard

### Enabling

Set `goalie.enableRealtimeDashboard` to `true` in VS Code settings, or set environment variable `AF_ENABLE_REALTIME_DASHBOARD=1`.

### Features

- **Live Updates**: File watcher monitors `.goalie/*.{yaml,jsonl}` files
- **Governance Gaps**: Top economic gaps from governance agent
- **Retro Gaps**: Top workload-specific gaps from retro coach
- **Workload Filtering**: Color-coded by workload type (ML, HPC, Stats, Device/Web)

### Architecture

The real-time dashboard uses:
- File system watcher for change detection
- Debounced refresh (300ms) to avoid spam
- JSON output parsing from `governance-agent` and `retro-coach`
- HTML rendering with workload color coding

---

## User Study Framework

### Purpose

The user study framework is designed to assess the effectiveness of alert icons in driving action on "Guardrail Locks" and "Safe Degrade" patterns.

### Components

1. **Event Tracking**: Track user interactions with alert icons
2. **Action Tracking**: Track actions taken after viewing alerts
3. **Effectiveness Metrics**: Measure alert-to-action conversion rates

### Implementation

See `docs/USER_STUDY_FRAMEWORK.md` for detailed implementation guide.

---

## Quick Reference

### Commands

```bash
# Run governance audit
af governance-agent

# Run governance audit (JSON output)
af governance-agent --json

# Run retro coach
af retro-coach

# Run retro coach (JSON output)
af retro-coach --json

# View goalie gaps
af goalie-gaps

# Suggest actions (includes observability action generation)
af suggest-actions

# Generate observability actions from pattern metrics
python3 scripts/agentic/generate_observability_actions.py
```

### Files

- `.goalie/PATTERNS.yaml`: Pattern definitions (single source of truth)
- `.goalie/OBSERVABILITY_ACTIONS.yaml`: Observability actions
- `.goalie/pattern_metrics.jsonl`: Pattern event data
- `.goalie/OBSERVABILITY_ACTIONS.yaml.template`: Template for observability actions

### Tools

- `tools/federation/governance_agent.ts`: Governance agent
- `tools/federation/retro_coach.ts`: Retro coach
- `tools/federation/cod_calculators.ts`: Workload-specific COD calculators
- `scripts/agentic/generate_observability_actions.py`: Observability action generator

---

## Support

For issues, questions, or contributions, please refer to the main project documentation or open an issue in the repository.

---

**Last Updated**: 2025-11-20  
**Maintainer**: Development Team

