# IRIS Integration Guide

> **Status**: Active | **Version**: 1.0.0 | **Last Updated**: 2024-11-28

This document provides comprehensive guidance for integrating with `@foxruv/iris`, the self-improving MCP orchestration framework used by `agentic-flow` for governance and decision-making.

## Quick Links

- [IRIS Validation Quickstart](./IRIS_VALIDATION_QUICKSTART.md) - Stub-mode validation guide
- [Dependency Update Automation](../DEPENDENCY_UPDATE_AUTOMATION_SUMMARY.md) - CI/CD automation

---

## Overview

IRIS (Intelligent Reasoning and Improvement System) provides:

1. **Governance Metrics**: Real-time policy enforcement and compliance tracking
2. **Self-Improvement**: Continuous learning from execution patterns
3. **MCP Orchestration**: Multi-model coordination and routing

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    agentic-flow                         │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────┐ │
│  │ ReasoningBank │  │ MultiModel    │  │ AgentDB     │ │
│  │ (TS API)      │  │ Router        │  │ (Learning)  │ │
│  └───────┬───────┘  └───────┬───────┘  └──────┬──────┘ │
│          │                  │                 │        │
│          └──────────────────┼─────────────────┘        │
│                             ▼                          │
│                    ┌────────────────┐                  │
│                    │  @foxruv/iris  │                  │
│                    │  (Governance)  │                  │
│                    └────────────────┘                  │
└─────────────────────────────────────────────────────────┘
```

---

## Installation

```bash
# Install IRIS as a dependency
npm install @foxruv/iris

# Verify installation
npm list @foxruv/iris
```

---

## Configuration

### Environment Variables

```bash
# Required
export IRIS_MODE=stub  # Options: stub, live, hybrid

# Optional
export IRIS_GOVERNANCE_THRESHOLD=0.85
export IRIS_LOG_LEVEL=info
```

### TypeScript Configuration

```typescript
import { IRISClient } from '@foxruv/iris';

const iris = new IRISClient({
  mode: process.env.IRIS_MODE || 'stub',
  governanceThreshold: 0.85,
  metricsEnabled: true,
});
```

---

## Dependency Update Policy

> ⚠️ **CRITICAL**: All dependency updates involving `@foxruv/iris` MUST pass the full validation suite before merge.

### Update Schedule

| Check Type | Schedule | Scope | Automation |
|------------|----------|-------|------------|
| **Security/Patch** | Daily (Mon-Fri, 04:00 UTC) | `@foxruv/iris`, `sharp`, `better-sqlite3`, `@anthropic-ai/*`, `@supabase/*` | Dependabot |
| **Minor/Feature** | Weekly (Monday, 06:00 UTC) | All npm dependencies | Dependabot |
| **Python** | Weekly (Monday, 06:00 UTC) | `analysis/requirements.txt` | Dependabot |
| **GitHub Actions** | Weekly (Monday, 06:00 UTC) | `.github/workflows/**` | Dependabot |

### Required CI Checks for IRIS Updates

When `@foxruv/iris` is updated, the following checks are **mandatory**:

1. **IRIS Governance Integration Tests** - Validates governance API compatibility
2. **IRIS Prod-Cycle E2E Tests** - End-to-end production cycle validation
3. **DT Calibration Tests** - Decision Transformer threshold validation
4. **DT Quality Gates Tests** - Quality gate compliance
5. **ReasoningBank Public API Test** - TypeScript consumer API validation
6. **Dashboard Validation** - Governance dashboard health check
7. **Full Test Suite** - Comprehensive test run (when IRIS updated)
8. **Security Audit** - npm audit for vulnerabilities

### Manual Approval Gate

**Major version updates** to `@foxruv/iris` require manual approval before merge:

```yaml
# Triggered when: @foxruv/iris major version change detected
# Approvers: rooz-live
# Timeout: 72 hours
```

---

## Testing

### Run ReasoningBank Public API Test

```bash
# Critical guardrail for TS consumers
npm run test:reasoningbank-public-api
```

### Run IRIS Governance Tests

```bash
# Python-based governance validation
pytest tests/iris/ -v
python scripts/policy/governance.py --validate-iris
```

### Run Full Validation Suite

```bash
# Complete validation (recommended before IRIS updates)
npm test
python scripts/analysis/validate_dt_thresholds.py
python scripts/analysis/dt_quality_gates.py
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| `IRIS_MODE not set` | Export `IRIS_MODE=stub` for local development |
| Governance threshold failures | Check `.goalie/dt_validation_thresholds.yaml` |
| ReasoningBank API mismatch | Verify `agentic-flow/reasoningbank` exports |

### Support

- GitHub Issues: https://github.com/rooz-live/agentic-flow/issues
- IRIS Documentation: https://github.com/foxruv/iris

---

## Related Documentation

- [IRIS Validation Quickstart](./IRIS_VALIDATION_QUICKSTART.md)
- [Dependency Update Automation Summary](../DEPENDENCY_UPDATE_AUTOMATION_SUMMARY.md)
- [Goalie Action Tracking](../../.goalie/README.md)

