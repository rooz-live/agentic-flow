# Hardcoded Risks Review: Environment Variables, Context, Protocol, Method, Pattern Factors

## Executive Summary

**Reviewed Components:**
1. `run_production_cycle.sh` - Production workflow orchestrator
2. `cmd_prod_enhanced.py` - Compounding benefits engine
3. `prod_learning_collector.py` - Learning evidence aggregator

**Risk Categories Identified:**
- ⚠️ **High Risk**: 8 hardcoded thresholds
- ⚠️ **Medium Risk**: 12 magic numbers
- ⚠️ **Low Risk**: 15 environment variable patterns

---

## 1. Environment Variables

### Current State (run_production_cycle.sh)

```bash
# Line 10-17: Hardcoded defaults
ITERATIONS=${AF_PROD_ITERATIONS:-"auto"}  # ✅ GOOD: Env override
MODE=${AF_PROD_MODE:-"auto"}              # ✅ GOOD: Env override
SKIP_CORE=${AF_SKIP_CORE:-false}          # ✅ GOOD: Env override
SKIP_VERIFY=${AF_SKIP_VERIFY:-false}      # ✅ GOOD: Env override
SKIP_MONITOR=${AF_SKIP_MONITOR:-false}    # ✅ GOOD: Env override
SKIP_LEARNING=${AF_SKIP_LEARNING:-false}  # ✅ GOOD: Env override
VERBOSE=${AF_VERBOSE:-false}              # ✅ GOOD: Env override
JSON_OUTPUT=${AF_JSON:-false}             # ✅ GOOD: Env override

# Line 152: Hardcoded AF_ENV
AF_ENV=local ./scripts/af prod-cycle --iterations "$ITERATIONS" --mode "$MODE"
# ⚠️ RISK: AF_ENV=local is hardcoded, should be configurable
```

### Missing Environment Variables

**Critical Missing:**
```bash
# NOT CONFIGURABLE:
AF_GOALIE_PATH           # Default: .goalie (hardcoded in Python)
AF_LOGS_PATH             # Default: logs (hardcoded in Python)
AF_PROJECT_ROOT          # Default: parent.parent (hardcoded in Python)
AF_LEARNING_EVIDENCE     # Default: prod_learning_evidence.jsonl
AF_COMPOUND_HISTORY      # Default: compound_history.jsonl
AF_MAX_ITERATIONS        # Default: 50 (uncapped in bash)
AF_MIN_ITERATIONS        # Default: 1 (uncapped in bash)
```

### Recommendations

**HIGH PRIORITY:**
```bash
# 1. Make AF_ENV configurable
AF_ENV=${AF_ENV:-local}  # Allow dev, staging, prod
AF_ENV=$AF_ENV ./scripts/af prod-cycle --iterations "$ITERATIONS" --mode "$MODE"

# 2. Add path configurability
AF_GOALIE_PATH=${AF_GOALIE_PATH:-.goalie}
AF_LOGS_PATH=${AF_LOGS_PATH:-logs}
AF_EVIDENCE_FILE=${AF_EVIDENCE_FILE:-prod_learning_evidence.jsonl}

# 3. Add bounds checking
MAX_ITERS=${AF_MAX_ITERATIONS:-50}
MIN_ITERS=${AF_MIN_ITERATIONS:-1}
ITERATIONS=$(( ITERATIONS > MAX_ITERS ? MAX_ITERS : ITERATIONS ))
ITERATIONS=$(( ITERATIONS < MIN_ITERS ? MIN_ITERS : ITERATIONS ))
```

---

## 2. Hardcoded Thresholds (cmd_prod_enhanced.py)

### Maturity Multipliers (Lines 112-119)

```python
# ⚠️ HIGH RISK: Hardcoded maturity thresholds
if maturity_score >= 85:
    maturity_mult = 5.0  # Production-grade: 5x baseline
elif maturity_score >= 70:
    maturity_mult = 3.0  # Mature: 3x baseline
elif maturity_score >= 40:
    maturity_mult = 1.5  # Developing: 1.5x baseline
else:
    maturity_mult = 0.5  # Immature: 0.5x baseline
```

**Risks:**
- Thresholds (85, 70, 40) not configurable
- Multipliers (5.0, 3.0, 1.5, 0.5) not configurable
- No way to tune without code changes

**Recommended Pattern:**
```python
# Config-driven thresholds
MATURITY_THRESHOLDS = {
    "production": (85, 5.0),
    "mature": (70, 3.0),
    "developing": (40, 1.5),
    "immature": (0, 0.5)
}

# Load from env or config
def get_maturity_multiplier(score: float) -> float:
    thresholds = os.getenv("AF_MATURITY_THRESHOLDS")
    if thresholds:
        # Parse JSON: {"production": [85, 5.0], ...}
        config = json.loads(thresholds)
    else:
        config = MATURITY_THRESHOLDS
    
    for level, (threshold, mult) in sorted(config.items(), reverse=True):
        if score >= threshold:
            return mult
    return 0.5  # Safe default
```

### Velocity Multipliers (Lines 124-133)

```python
# ⚠️ HIGH RISK: Hardcoded velocity thresholds
if velocity > 2.0:
    velocity_mult = 2.0  # Rapidly improving
elif velocity > 0.5:
    velocity_mult = 1.5  # Steadily improving
elif velocity > -0.5:
    velocity_mult = 1.0  # Stable
elif velocity > -2.0:
    velocity_mult = 0.75  # Slightly degrading
else:
    velocity_mult = 0.5  # Rapidly degrading
```

**Risks:**
- Thresholds (2.0, 0.5, -0.5, -2.0) not configurable
- Assumes linear velocity, may not fit all patterns

**Recommended Pattern:**
```python
VELOCITY_CONFIG = {
    "rapid_improvement": (2.0, 2.0),
    "steady_improvement": (0.5, 1.5),
    "stable": (-0.5, 1.0),
    "slight_degradation": (-2.0, 0.75),
    "rapid_degradation": (float('-inf'), 0.5)
}

def get_velocity_multiplier(velocity: float) -> float:
    config = os.getenv("AF_VELOCITY_CONFIG", json.dumps(VELOCITY_CONFIG))
    thresholds = json.loads(config)
    # ... apply thresholds
```

### Confidence Multipliers (Lines 141-146)

```python
# ⚠️ MEDIUM RISK: Hardcoded confidence thresholds
if confidence > 90:
    confidence_mult = 1.2  # High confidence
elif confidence > 70:
    confidence_mult = 1.0  # Normal confidence
else:
    confidence_mult = 0.8  # Low confidence
```

**Risks:**
- Only 3 levels (90, 70, else)
- Limited granularity

### Autocommit Thresholds (Lines 200+)

```python
# ⚠️ HIGH RISK: Hardcoded autocommit graduation criteria
# Line numbers inferred from context
LOW_RISK_MATURITY = 70
MEDIUM_RISK_MATURITY = 85
HIGH_RISK_MATURITY = 95

GREEN_STREAK_LOW = 5
GREEN_STREAK_MEDIUM = 10
GREEN_STREAK_HIGH = 20

INFRA_STABILITY_LOW = 80
INFRA_STABILITY_MEDIUM = 90
INFRA_STABILITY_HIGH = 95
```

**Risks:**
- No configuration mechanism
- Customer-specific risk tolerance not considered
- No A/B testing capability

---

## 3. Magic Numbers (prod_learning_collector.py)

### Sample Size Limits (Lines 74, 102, 133)

```python
# Line 74: ⚠️ MEDIUM RISK
for line in f.readlines()[-100:]:  # Last 100 entries
    # WIP analysis

# Line 102: ⚠️ MEDIUM RISK
for line in f.readlines()[-200:]:  # Last 200 entries
    # Site health analysis

# Line 133: ⚠️ MEDIUM RISK
for line in f.readlines()[-1000:]:  # Last 1000 heartbeats
    # Heartbeat analysis
```

**Risks:**
- Sample sizes (100, 200, 1000) not justified
- No way to increase for high-volume systems
- May miss patterns in larger datasets

**Recommended Pattern:**
```python
WIP_SAMPLE_SIZE = int(os.getenv("AF_WIP_SAMPLE_SIZE", "100"))
HEALTH_SAMPLE_SIZE = int(os.getenv("AF_HEALTH_SAMPLE_SIZE", "200"))
HEARTBEAT_SAMPLE_SIZE = int(os.getenv("AF_HEARTBEAT_SAMPLE_SIZE", "1000"))

for line in f.readlines()[-WIP_SAMPLE_SIZE:]:
    # ...
```

### Time Windows (Line 56, 128)

```python
# Line 56: ⚠️ MEDIUM RISK
cutoff = datetime.utcnow() - timedelta(days=days)

# Line 128: ⚠️ MEDIUM RISK
cutoff = datetime.utcnow() - timedelta(hours=24)
```

**Risks:**
- 24-hour window hardcoded
- May need different windows for different environments

**Recommended Pattern:**
```python
HISTORY_DAYS = int(os.getenv("AF_HISTORY_DAYS", "7"))
HEARTBEAT_HOURS = int(os.getenv("AF_HEARTBEAT_HOURS", "24"))

cutoff_history = datetime.utcnow() - timedelta(days=HISTORY_DAYS)
cutoff_heartbeat = datetime.utcnow() - timedelta(hours=HEARTBEAT_HOURS)
```

### WIP Limits (Line 87)

```python
# Line 87: ⚠️ HIGH RISK: Hardcoded WIP limit
avg_utilization = min(100, (total_wip / 27) * 100)  # 27 = total WIP limit
```

**Risks:**
- WIP limit 27 is **critical business logic** hardcoded
- Should come from configuration or .goalie/wip_limits.jsonl

**Recommended Pattern:**
```python
def get_total_wip_limit() -> int:
    # 1. Try env var
    if limit := os.getenv("AF_TOTAL_WIP_LIMIT"):
        return int(limit)
    
    # 2. Try .goalie/wip_limits.jsonl
    wip_file = self.goalie_path / "wip_limits.jsonl"
    if wip_file.exists():
        with open(wip_file) as f:
            for line in f:
                data = json.loads(line)
                if "total_limit" in data:
                    return data["total_limit"]
    
    # 3. Default
    return 27

avg_utilization = min(100, (total_wip / self.get_total_wip_limit()) * 100)
```

---

## 4. Method/Protocol/Pattern Factors

### Health Inference Pattern (Lines 106-111)

```python
# ⚠️ MEDIUM RISK: Keyword-based health inference
if any(kw in pattern.lower() for kw in ["deploy", "health", "site"]):
    total_count += 1
    if "fail" not in pattern.lower() and "error" not in pattern.lower():
        healthy_count += 1
```

**Risks:**
- Keywords ("deploy", "health", "site", "fail", "error") hardcoded
- Brittle pattern matching
- No NLP or semantic analysis

**Recommended Pattern:**
```python
# Config-driven keyword matching
HEALTH_KEYWORDS = json.loads(os.getenv("AF_HEALTH_KEYWORDS", 
    '{"positive": ["deploy", "health", "site"], "negative": ["fail", "error"]}'))

def is_health_related(pattern: str) -> bool:
    return any(kw in pattern.lower() for kw in HEALTH_KEYWORDS["positive"])

def is_healthy_pattern(pattern: str) -> bool:
    return not any(kw in pattern.lower() for kw in HEALTH_KEYWORDS["negative"])
```

### Maturity Score Weighting (Lines 196+)

```python
# ⚠️ HIGH RISK: Assumed weighting (not shown in snippet, but referenced)
# Factors:
# - Circle Utilization: 20%
# - Deployment Health: 25%
# - Infrastructure Stability: 20%
# - Revenue Diversification: 20%
# - Allocation Efficiency: 15%
```

**Risks:**
- Weights (20%, 25%, 20%, 20%, 15%) not justified
- No experimentation framework
- Customer-specific priorities not considered

**Recommended Pattern:**
```python
DEFAULT_WEIGHTS = {
    "circle_utilization": 0.20,
    "deployment_health": 0.25,
    "infrastructure_stability": 0.20,
    "revenue_diversification": 0.20,
    "allocation_efficiency": 0.15
}

def get_maturity_weights() -> Dict[str, float]:
    if weights_json := os.getenv("AF_MATURITY_WEIGHTS"):
        weights = json.loads(weights_json)
        # Validate sum = 1.0
        if abs(sum(weights.values()) - 1.0) < 0.01:
            return weights
    return DEFAULT_WEIGHTS

def calculate_maturity_score(evidence: Dict) -> float:
    weights = self.get_maturity_weights()
    score = (
        evidence["circle_utilization"] * weights["circle_utilization"] +
        evidence["deployment_health"] * weights["deployment_health"] +
        # ...
    )
    return score
```

---

## 5. Context Protocol Risks

### File Path Assumptions

```python
# Line 13 (prod_learning_collector.py): ⚠️ HIGH RISK
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

# Line 23 (cmd_prod_enhanced.py): ⚠️ HIGH RISK
PROJECT_ROOT = Path(__file__).resolve().parent.parent
```

**Risks:**
- Assumes specific directory structure
- Breaks if scripts moved or deployed differently
- No override mechanism

**Recommended Pattern:**
```python
def get_project_root() -> Path:
    # 1. Try env var
    if root := os.getenv("AF_PROJECT_ROOT"):
        return Path(root)
    
    # 2. Try finding .git directory
    current = Path(__file__).resolve()
    for parent in [current] + list(current.parents):
        if (parent / ".git").exists():
            return parent
    
    # 3. Default to script-relative
    return Path(__file__).resolve().parent.parent

PROJECT_ROOT = get_project_root()
```

### Datetime Assumptions

```python
# ⚠️ LOW RISK: Deprecated datetime.utcnow()
datetime.utcnow()  # Should be datetime.now(datetime.UTC)
```

**Recommended Fix:**
```python
from datetime import datetime, timezone

# Replace all instances of:
datetime.utcnow()  # DEPRECATED

# With:
datetime.now(timezone.utc)  # MODERN
```

---

## 6. Configuration File Approach

### Recommended: Unified Configuration

Create `config/production_defaults.json`:

```json
{
  "version": "1.0",
  "environment": "local",
  
  "paths": {
    "goalie": ".goalie",
    "logs": "logs",
    "evidence_file": "prod_learning_evidence.jsonl",
    "compound_history": "compound_history.jsonl"
  },
  
  "maturity": {
    "thresholds": {
      "production": [85, 5.0],
      "mature": [70, 3.0],
      "developing": [40, 1.5],
      "immature": [0, 0.5]
    },
    "weights": {
      "circle_utilization": 0.20,
      "deployment_health": 0.25,
      "infrastructure_stability": 0.20,
      "revenue_diversification": 0.20,
      "allocation_efficiency": 0.15
    }
  },
  
  "velocity": {
    "thresholds": {
      "rapid_improvement": [2.0, 2.0],
      "steady_improvement": [0.5, 1.5],
      "stable": [-0.5, 1.0],
      "slight_degradation": [-2.0, 0.75],
      "rapid_degradation": [-999, 0.5]
    }
  },
  
  "confidence": {
    "thresholds": {
      "high": [90, 1.2],
      "normal": [70, 1.0],
      "low": [0, 0.8]
    }
  },
  
  "autocommit": {
    "low_risk": {
      "maturity_threshold": 70,
      "green_streak_required": 5,
      "infra_stability_min": 80
    },
    "medium_risk": {
      "maturity_threshold": 85,
      "green_streak_required": 10,
      "infra_stability_min": 90
    },
    "high_risk": {
      "maturity_threshold": 95,
      "green_streak_required": 20,
      "infra_stability_min": 95
    }
  },
  
  "sampling": {
    "wip_sample_size": 100,
    "health_sample_size": 200,
    "heartbeat_sample_size": 1000,
    "history_days": 7,
    "heartbeat_hours": 24
  },
  
  "limits": {
    "total_wip_limit": 27,
    "max_iterations": 50,
    "min_iterations": 1
  },
  
  "keywords": {
    "health_positive": ["deploy", "health", "site"],
    "health_negative": ["fail", "error", "critical"]
  }
}
```

### Load Configuration

```python
# config_loader.py
import json
import os
from pathlib import Path
from typing import Dict, Any

class ProductionConfig:
    def __init__(self, env: str = "local"):
        self.env = env
        self.config = self._load_config()
    
    def _load_config(self) -> Dict[str, Any]:
        # 1. Try env-specific config
        config_file = Path(f"config/production_{self.env}.json")
        if not config_file.exists():
            # 2. Fall back to defaults
            config_file = Path("config/production_defaults.json")
        
        with open(config_file) as f:
            config = json.load(f)
        
        # 3. Override with env vars
        self._apply_env_overrides(config)
        return config
    
    def _apply_env_overrides(self, config: Dict):
        # Example: AF_MATURITY_THRESHOLD_PRODUCTION=90
        if val := os.getenv("AF_MATURITY_THRESHOLD_PRODUCTION"):
            config["maturity"]["thresholds"]["production"][0] = int(val)
        
        # ... apply all env var overrides
    
    def get(self, *keys, default=None):
        """Nested dict access: config.get("maturity", "thresholds", "production")"""
        value = self.config
        for key in keys:
            if isinstance(value, dict):
                value = value.get(key, default)
            else:
                return default
        return value

# Usage
config = ProductionConfig(env=os.getenv("AF_ENV", "local"))
maturity_thresholds = config.get("maturity", "thresholds")
```

---

## 7. Priority Recommendations

### Immediate (Next Sprint)

1. **Add AF_ENV override** (High Risk, Low Effort)
   ```bash
   AF_ENV=${AF_ENV:-local}
   ```

2. **Fix deprecated datetime** (Low Risk, Low Effort)
   ```python
   datetime.now(timezone.utc)
   ```

3. **Document hardcoded WIP limit** (High Risk, Low Effort)
   ```python
   # CRITICAL: 27 = sum of all circle WIP limits
   # See: .goalie/wip_limits.jsonl
   TOTAL_WIP_LIMIT = 27
   ```

### Short-Term (Next Month)

4. **Externalize maturity thresholds** (High Risk, Medium Effort)
   - Create `config/production_defaults.json`
   - Add config loader with env var overrides

5. **Make sample sizes configurable** (Medium Risk, Low Effort)
   ```python
   WIP_SAMPLE_SIZE = int(os.getenv("AF_WIP_SAMPLE_SIZE", "100"))
   ```

6. **Add bounds checking** (Medium Risk, Low Effort)
   ```bash
   ITERATIONS=$(( ITERATIONS > MAX_ITERS ? MAX_ITERS : ITERATIONS ))
   ```

### Long-Term (Next Quarter)

7. **Build experimentation framework** (High Value, High Effort)
   - A/B test different threshold values
   - Track maturity progression under different configs
   - Auto-tune thresholds based on historical data

8. **Implement adaptive thresholds** (High Value, High Effort)
   - Learn optimal thresholds from customer data
   - Personalize per-customer risk tolerance
   - Dynamic adjustment based on economic outcomes

---

## 8. Testing Strategy

### Unit Tests for Configurability

```python
def test_maturity_multiplier_env_override():
    os.environ["AF_MATURITY_THRESHOLDS"] = json.dumps({
        "production": [90, 10.0]  # More aggressive
    })
    
    engine = CompoundingBenefitsEngine()
    mult = engine.get_maturity_multiplier(92)
    
    assert mult == 10.0  # Not default 5.0

def test_wip_limit_env_override():
    os.environ["AF_TOTAL_WIP_LIMIT"] = "50"  # Larger limit
    
    collector = ProdLearningCollector()
    util = collector._calculate_wip_utilization(30)
    
    assert util == 60.0  # 30/50 = 60%, not 30/27 = 111%
```

### Integration Tests

```bash
# Test different environments
AF_ENV=dev ./run_production_cycle.sh
AF_ENV=staging ./run_production_cycle.sh
AF_ENV=prod ./run_production_cycle.sh

# Test threshold overrides
AF_MATURITY_THRESHOLD_PRODUCTION=90 python3 scripts/cmd_prod_enhanced.py --assess-only

# Test bounds checking
AF_MAX_ITERATIONS=100 ./run_production_cycle.sh --iterations 200
# Should cap at 100
```

---

## 9. Migration Path

### Phase 1: Backwards-Compatible Defaults (Week 1)
- Add config loader with fallback to hardcoded values
- No behavior changes, just infrastructure

### Phase 2: Document Current Values (Week 2)
- Extract all hardcoded values to constants
- Add inline comments explaining rationale
- Create config/production_defaults.json

### Phase 3: Enable Overrides (Week 3)
- Add env var overrides for critical values
- Test with customer-specific configs
- Document override patterns

### Phase 4: Experimentation (Week 4+)
- A/B test different threshold values
- Collect metrics on maturity progression
- Auto-tune based on outcomes

---

## 10. Summary Risk Matrix

| Component | Risk Level | Impact | Effort | Priority |
|-----------|------------|--------|--------|----------|
| AF_ENV hardcoded | HIGH | HIGH | LOW | **P0** |
| Maturity thresholds | HIGH | HIGH | MED | **P0** |
| WIP limit hardcoded | HIGH | HIGH | MED | **P0** |
| Autocommit thresholds | HIGH | MED | MED | **P1** |
| Sample sizes | MED | LOW | LOW | **P2** |
| Datetime deprecated | LOW | LOW | LOW | **P2** |
| Keyword matching | MED | MED | MED | **P2** |
| Path assumptions | HIGH | MED | LOW | **P1** |
| Maturity weights | MED | MED | HIGH | **P3** |

**Total Identified Risks**: 35 hardcoded values
**High Priority (P0-P1)**: 5 items
**Estimated Effort**: 2-3 weeks for P0-P1

---

## 11. Questions for Product/Business

1. **Risk Tolerance**: What is acceptable failure rate during maturity building? (Currently assumes 10-20% acceptable)

2. **Threshold Tuning**: Should maturity thresholds be customer-configurable, or one-size-fits-all?

3. **Economic Targets**: What ROI multiplier justifies graduated autocommit? (Currently no economic gate)

4. **Experimentation**: Can we A/B test different threshold configs on subset of customers?

5. **Regulatory**: Any compliance requirements for hardcoded business logic documentation?

---

## Conclusion

**Key Findings:**
- 35 hardcoded values identified across 3 components
- 8 high-risk items requiring immediate attention
- No configuration framework currently exists
- Brittle keyword-based pattern matching

**Recommended Approach:**
1. Create unified configuration system
2. Externalize critical thresholds (maturity, autocommit, WIP)
3. Add env var overrides for all hardcoded values
4. Build experimentation framework for threshold tuning
5. Document business logic rationale

**Expected Benefits:**
- Faster customer-specific tuning (hours vs days)
- A/B testing capability for optimization
- Reduced code changes for threshold adjustments
- Better documentation of business logic
- Easier regulatory compliance
