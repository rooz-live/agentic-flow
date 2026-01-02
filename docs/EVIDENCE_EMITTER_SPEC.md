# Evidence Emitter Unified Specification

## Problem Statement

Currently, evidence emitters have:
- **Inconsistent naming conventions**: `revenue-safe`, `tier-depth`, `gaps`, `intent-coverage`, `winner-grade`
- **No unified schema**: Each emitter produces different JSON structures
- **Performance issues**: All emitters run by default, causing noise and slow execution
- **Integration complexity**: Separate integration paths for `prod-cycle` and `prod-swarm`
- **Limited observability**: No graduation criteria tracking for autocommit readiness

## Proposed Solution: Unified Evidence Manager

### 1. Standardized Naming Convention

Map legacy names to unified semantic conventions:

| Legacy Name | Unified Name | Purpose |
|------------|--------------|---------|
| `revenue-safe` | `economic_compounding` | Economic viability tracking (energy_cost_usd, value_per_hour, wsjf_per_hour) |
| `tier-depth` | `maturity_coverage` | Tier/depth schema compliance |
| `gaps` | `observability_gaps` | Pattern coverage deficits |
| `intent-coverage` | `pattern_hit_pct` | Intent atoms → required patterns percentage |
| `winner-grade` | `prod_cycle_qualification` | Autocommit readiness qualification |
| `depth-ladder` | `phase_progression` | Phase advancement tracking (PHASE-A-1, etc.) |
| `circle-perspective` | `decision_lens_telemetry` | Circle perspective coverage |

### 2. Unified JSON Schema

All evidence events follow this structure:

```json
{
  "event_type": "evidence",
  "emitter": "economic_compounding",
  "timestamp": "2025-12-16T18:09:27Z",
  "run_id": "FLOW-RUN-12345",
  "circle": "orchestrator",
  "context": {
    "iteration": 5,
    "mode": "advisory",
    "depth": 3
  },
  "data": {
    // Emitter-specific fields
    "energy_cost_usd": 0.012,
    "value_per_hour": 150.0,
    "wsjf_per_hour": 12.5
  },
  "metadata": {
    "duration_ms": 342,
    "status": "success",
    "version": "1.0.0"
  }
}
```

### 3. Evidence Configuration System

**File**: `config/evidence_config.json`

```json
{
  "version": "1.0.0",
  "default_emitters": [
    "observability_gaps",
    "maturity_coverage",
    "economic_compounding"
  ],
  "optional_emitters": [
    "pattern_hit_pct",
    "decision_lens_telemetry",
    "phase_progression"
  ],
  "emitters": {
    "economic_compounding": {
      "enabled": true,
      "default": true,
      "timeout_sec": 30,
      "script": "scripts/agentic/revenue_attribution.py",
      "args": ["--circle", "{circle}", "--json"],
      "output_format": "json",
      "fields": ["energy_cost_usd", "value_per_hour", "wsjf_per_hour"],
      "integration": {
        "prod_cycle": true,
        "prod_swarm": true,
        "phase": "teardown"
      }
    },
    "maturity_coverage": {
      "enabled": true,
      "default": true,
      "timeout_sec": 15,
      "script": "scripts/agentic/tier_depth_checker.py",
      "args": ["--circle", "{circle}", "--json"],
      "output_format": "json",
      "fields": ["tier_compliance_pct", "depth_coverage_pct"],
      "integration": {
        "prod_cycle": true,
        "prod_swarm": true,
        "phase": "pre_iteration"
      }
    },
    "observability_gaps": {
      "enabled": true,
      "default": true,
      "timeout_sec": 20,
      "script": "scripts/af",
      "args": ["goalie-gaps", "--filter", "observability", "--json"],
      "output_format": "json",
      "fields": ["gap_count", "critical_gaps", "coverage_pct"],
      "integration": {
        "prod_cycle": true,
        "prod_swarm": true,
        "phase": "teardown"
      }
    },
    "pattern_hit_pct": {
      "enabled": false,
      "default": false,
      "timeout_sec": 25,
      "script": "scripts/agentic/intent_coverage.py",
      "args": ["--circle", "{circle}", "--json"],
      "output_format": "json",
      "fields": ["intent_atoms_total", "patterns_hit", "coverage_pct"],
      "integration": {
        "prod_cycle": false,
        "prod_swarm": true,
        "phase": "analysis"
      }
    },
    "prod_cycle_qualification": {
      "enabled": true,
      "default": false,
      "timeout_sec": 10,
      "script": "scripts/agentic/graduation_assessor.py",
      "args": ["--run-id", "{run_id}", "--json"],
      "output_format": "json",
      "fields": ["ok_rate", "stability_score", "autofix_adv_count", "sys_state_err", "abort_count"],
      "integration": {
        "prod_cycle": true,
        "prod_swarm": true,
        "phase": "post_run"
      }
    }
  },
  "graduation_thresholds": {
    "green_streak_required": 5,
    "max_autofix_adv_per_cycle": 3,
    "min_stability_score": 0.85,
    "min_ok_rate": 0.90,
    "max_sys_state_err": 0,
    "max_abort": 0,
    "shadow_cycles_before_recommend": 10,
    "retro_approval_required": true
  }
}
```

### 4. Unified Evidence Manager Architecture

**File**: `scripts/agentic/evidence_manager.py`

```python
import json
import subprocess
import asyncio
from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime

@dataclass
class EmitterResult:
    emitter: str
    success: bool
    data: Dict
    duration_ms: int
    error: Optional[str] = None

class EvidenceManager:
    """Unified evidence collection and emission manager"""
    
    def __init__(self, config_path: str = "config/evidence_config.json"):
        with open(config_path) as f:
            self.config = json.load(f)
        self.results = []
    
    async def run_emitter(self, emitter_name: str, context: Dict) -> EmitterResult:
        """Run a single emitter asynchronously"""
        emitter_config = self.config['emitters'][emitter_name]
        
        # Substitute context variables in args
        args = [arg.format(**context) for arg in emitter_config['args']]
        cmd = [emitter_config['script']] + args
        
        start_time = datetime.now()
        try:
            result = await asyncio.wait_for(
                asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                ),
                timeout=emitter_config['timeout_sec']
            )
            stdout, stderr = await result.communicate()
            duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)
            
            if result.returncode == 0:
                data = json.loads(stdout.decode()) if emitter_config['output_format'] == 'json' else {'raw': stdout.decode()}
                return EmitterResult(emitter_name, True, data, duration_ms)
            else:
                return EmitterResult(emitter_name, False, {}, duration_ms, stderr.decode())
        except asyncio.TimeoutError:
            duration_ms = emitter_config['timeout_sec'] * 1000
            return EmitterResult(emitter_name, False, {}, duration_ms, "Timeout")
        except Exception as e:
            duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)
            return EmitterResult(emitter_name, False, {}, duration_ms, str(e))
    
    async def collect_evidence(self, phase: str, context: Dict, emitter_list: Optional[List[str]] = None) -> List[EmitterResult]:
        """Collect evidence from all enabled emitters for a phase"""
        
        # Determine which emitters to run
        if emitter_list:
            emitters_to_run = emitter_list
        else:
            emitters_to_run = [
                name for name, config in self.config['emitters'].items()
                if config['enabled'] and config['integration'].get(context.get('mode', 'prod_cycle'))
                and config['integration']['phase'] == phase
            ]
        
        # Run emitters concurrently
        tasks = [self.run_emitter(name, context) for name in emitters_to_run]
        results = await asyncio.gather(*tasks)
        
        self.results.extend(results)
        return results
    
    def emit_unified_event(self, result: EmitterResult, context: Dict) -> Dict:
        """Convert emitter result to unified schema"""
        return {
            "event_type": "evidence",
            "emitter": result.emitter,
            "timestamp": datetime.now().isoformat(),
            "run_id": context.get('run_id'),
            "circle": context.get('circle'),
            "context": {
                "iteration": context.get('iteration'),
                "mode": context.get('mode'),
                "depth": context.get('depth')
            },
            "data": result.data,
            "metadata": {
                "duration_ms": result.duration_ms,
                "status": "success" if result.success else "failure",
                "error": result.error,
                "version": self.config['version']
            }
        }
    
    def write_evidence(self, output_path: str = ".goalie/evidence.jsonl"):
        """Write all collected evidence to JSONL"""
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'a') as f:
            for result in self.results:
                event = self.emit_unified_event(result, {})
                f.write(json.dumps(event) + '\n')
```

### 5. Integration with prod-cycle and prod-swarm

**Integration Points:**

1. **Pre-Iteration**: `maturity_coverage` check
2. **Per-Iteration**: No emitters (keep fast)
3. **Teardown**: `economic_compounding`, `observability_gaps`, `prod_cycle_qualification`
4. **Post-Run**: Graduation assessment with thresholds

**Example Integration in cmd_prod_cycle.py:**

```python
from agentic.evidence_manager import EvidenceManager

# Initialize once at script start
evidence_mgr = EvidenceManager()

# Pre-iteration phase
context = {
    "run_id": run_id,
    "circle": circle,
    "iteration": 0,
    "mode": mode,
    "depth": current_depth
}
results = await evidence_mgr.collect_evidence("pre_iteration", context)

# Teardown phase
context.update({"iteration": iterations})
results = await evidence_mgr.collect_evidence("teardown", context)

# Write unified evidence
evidence_mgr.write_evidence(".goalie/evidence.jsonl")
```

### 6. Graduation Assessment System

**File**: `scripts/agentic/graduation_assessor.py`

```python
class GraduationAssessor:
    """Assess autocommit readiness using evidence"""
    
    def __init__(self, config_path: str = "config/evidence_config.json"):
        with open(config_path) as f:
            self.thresholds = json.load(f)['graduation_thresholds']
    
    def assess(self, run_id: str) -> Dict:
        """Assess graduation status based on collected evidence"""
        
        # Load evidence for this run
        evidence = self._load_evidence(run_id)
        
        # Calculate metrics
        ok_rate = self._calculate_ok_rate(evidence)
        stability_score = self._calculate_stability(evidence)
        autofix_adv_count = self._count_autofix_advisories(evidence)
        sys_state_err = self._count_sys_state_errors(evidence)
        abort_count = self._count_aborts(evidence)
        green_streak = self._calculate_green_streak(evidence)
        
        # Check thresholds
        passed = (
            green_streak >= self.thresholds['green_streak_required'] and
            autofix_adv_count <= self.thresholds['max_autofix_adv_per_cycle'] and
            stability_score >= self.thresholds['min_stability_score'] and
            ok_rate >= self.thresholds['min_ok_rate'] and
            sys_state_err <= self.thresholds['max_sys_state_err'] and
            abort_count <= self.thresholds['max_abort']
        )
        
        return {
            "qualified_for_autocommit": passed,
            "metrics": {
                "ok_rate": ok_rate,
                "stability_score": stability_score,
                "autofix_adv_count": autofix_adv_count,
                "sys_state_err": sys_state_err,
                "abort_count": abort_count,
                "green_streak": green_streak
            },
            "thresholds": self.thresholds,
            "recommendation": "APPROVE" if passed else "BLOCK",
            "requires_retro_approval": self.thresholds['retro_approval_required']
        }
```

### 7. CLI Integration

**New subcommands in scripts/af:**

```bash
# Collect evidence manually
af evidence collect --phase teardown --circle orchestrator

# Check graduation status
af evidence assess --run-id FLOW-RUN-12345

# List available emitters
af evidence list

# Enable/disable emitters
af evidence enable pattern_hit_pct
af evidence disable decision_lens_telemetry
```

### 8. Migration Strategy

**Phase 1: Parallel Operation (Weeks 1-2)**
- Deploy unified evidence manager
- Run both old and new emitters
- Compare outputs for consistency
- Fix schema mapping issues

**Phase 2: Migration (Weeks 3-4)**
- Switch prod-cycle to use EvidenceManager
- Deprecate old emitter calls
- Update documentation
- Train team on new conventions

**Phase 3: Cleanup (Week 5)**
- Remove legacy emitter code
- Archive old evidence files
- Finalize schema version 1.0.0

### 9. Performance Optimization

**Default Emitters (Fast Path)**:
- `observability_gaps`: ~20ms
- `maturity_coverage`: ~15ms
- `economic_compounding`: ~30ms
- **Total overhead**: ~65ms per cycle

**Optional Emitters (Slow Path)**:
- `pattern_hit_pct`: ~25ms
- `decision_lens_telemetry`: ~40ms
- `phase_progression`: ~20ms

**Async Execution**: All emitters run concurrently using `asyncio.gather()`, reducing total time to max(individual_times) instead of sum(individual_times)

### 10. Observability & Debugging

**Evidence Viewer Tool:**
```bash
# View evidence for a run
af evidence view --run-id FLOW-RUN-12345

# Filter by emitter
af evidence view --emitter economic_compounding

# Export to CSV
af evidence export --format csv --output evidence_report.csv
```

## Benefits

1. **Performance**: 65ms overhead vs 150ms+ with legacy system
2. **Clarity**: Semantic names instead of cryptic abbreviations
3. **Consistency**: Single JSON schema for all evidence
4. **Extensibility**: Easy to add new emitters via config
5. **Graduation**: Automated qualification assessment
6. **Observability**: Unified evidence trail for debugging

## References

- Implementation: `scripts/agentic/evidence_manager.py`
- Configuration: `config/evidence_config.json`
- Integration: `scripts/cmd_prod_cycle.py` lines 1553-1609
- Economic Analysis: `docs/ECONOMIC_OBSERVABILITY_ANALYSIS.md`
