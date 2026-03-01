# Red-Green TDD Deployment Gate

## 🚦 TDD Cycle Before Deployment

### Phase 1: RED - Identify Failing Tests

#### Core Validation Tests
```bash
# 1. Run all validators to establish baseline
./scripts/compare-all-validators.sh --latest

# 2. Check current DPC metrics
./scripts/validation-runner.sh --json --file test/sample.eml

# 3. Test neural trader WASM compilation
cd packages/neural-trader && wasm-pack build --target nodejs

# 4. Test reverse recruiting WASM compilation  
cd packages/reverse-recruiting && wasm-pack build --target nodejs

# 5. Test platform integrations
node -e "
const ReverseRecruiting = require('./packages/reverse-recruiting');
const r = new ReverseRecruiting();
console.log('WASM Load Test:', !!r);
"
```

#### Expected RED Results
- **Validator Coverage**: < 90% (need improvement)
- **DPC Score**: < 72 (below target)
- **WASM Compilation**: Failures expected
- **Platform Integration**: Mock responses only
- **JSON Schema**: Inconsistent outputs

### Phase 2: GREEN - Make Tests Pass

#### Fix Validation Coverage
```bash
# 1. Fix failing project-level validators
./scripts/validate_coherence.py --fix-mode
./scripts/governance/check_roam_staleness.py --auto-update

# 2. Enhance validation-runner.sh with DPC metrics
./scripts/validation-runner.sh --enhance-dpc

# 3. Add JSON output to pre-send-email-gate.sh
./scripts/pre-send-email-gate.sh --add-json

# 4. Consolidate validator inventory
./scripts/archive-legacy-validators.sh
```

#### Fix WASM Compilation
```bash
# 1. Fix neural trader Rust compilation
cd packages/neural-trader
cargo check --target wasm32-unknown-unknown
cargo fix --allow-dirty --allow-staged

# 2. Fix reverse recruiting Rust compilation  
cd packages/reverse-recruiting
cargo check --target wasm32-unknown-unknown
cargo fix --allow-dirty --allow-staged

# 3. Build WASM packages
wasm-pack build --target nodejs --out-dir pkg
```

#### Fix Platform Integration
```bash
# 1. Test platform adapters
cd packages/reverse-recruiting
node test/platforms.test.js

# 2. Fix mock API responses
node test/mock-api.test.js

# 3. Validate JSON schemas
node test/json-schema.test.js
```

### Phase 3: REFACTOR - Improve Design

#### Consolidate Architecture
```bash
# 1. Create unified validation core
./scripts/validation-core.sh --consolidate

# 2. Enhance error handling
./scripts/validation-runner.sh --add-graceful-degradation

# 3. Standardize JSON output
./scripts/standardize-json-output.sh

# 4. Add comprehensive logging
./scripts/add-structured-logging.sh
```

#### Optimize WASM Performance
```bash
# 1. Optimize WASM binary size
wasm-opt -O --enable-simd pkg/neural_trader.wasm -o pkg/neural_trader_opt.wasm

# 2. Add performance benchmarks
cd packages/neural-trader
cargo bench

# 3. Memory optimization
cd packages/reverse-recruiting  
cargo bench
```

## 🧪 Comprehensive Test Suite

### Unit Tests
```rust
// packages/neural-trader/src/lib.rs tests
#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_neural_trader_initialization() {
        let trader = NeuralTrader::new(serde_json::json!({
            "model": "test",
            "risk_threshold": 0.1
        }));
        assert!(trader.is_ok());
    }
    
    #[tokio::test]
    async fn test_market_analysis() {
        let trader = NeuralTrader::new(serde_json::json!({})).unwrap();
        let result = trader.analyze(serde_json::json!({
            "symbol": "TEST",
            "price": {"current": 100.0, "change": 1.0},
            "volume": 1000.0
        })).await;
        assert!(result.is_ok());
    }
}
```

```rust
// packages/reverse-recruiting/src/lib.rs tests
#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_reverse_recruiting_initialization() {
        let recruiter = ReverseRecruiting::new();
        let health = recruiter.get_health();
        assert!(health.is_ok());
    }
    
    #[tokio::test]
    async fn test_career_progression_analysis() {
        let mut recruiter = ReverseRecruiting::new();
        recruiter.set_profile(serde_json::json!({
            "name": "Test User",
            "skills": ["JavaScript", "React"],
            "experience_years": 3.0
        })).unwrap();
        
        let progression = recruiter.analyze_career_progression("Senior Developer".to_string()).await;
        assert!(progression.is_ok());
    }
}
```

### Integration Tests
```javascript
// test/integration.test.js
const { NeuralTrader } = require('../packages/neural-trader/pkg/neural_trader.js');
const { ReverseRecruiting } = require('../packages/reverse-recruiting/pkg/reverse_recruiting.js');

describe('Integration Tests', () => {
    test('Neural Trader WASM Integration', async () => {
        const trader = new NeuralTrader({ model: 'test' });
        await trader.initialize();
        
        const result = await trader.analyze({
            symbol: 'AAPL',
            price: { current: 150.0, change: 2.5 },
            volume: 1000000
        });
        
        expect(result.signals).toBeDefined();
        expect(result.signals.length).toBeGreaterThan(0);
    });
    
    test('Reverse Recruiting WASM Integration', async () => {
        const recruiter = new ReverseRecruiting();
        
        await recruiter.set_profile({
            name: 'Test User',
            skills: ['JavaScript', 'Python'],
            experience_years: 5
        });
        
        const recommendations = await recruiter.get_recommendations(5);
        expect(recommendations).toBeDefined();
        expect(recommendations.length).toBeGreaterThan(0);
    });
    
    test('Cross-Platform Integration', async () => {
        const recruiter = new ReverseRecruiting();
        const platformJobs = await recruiter.get_platform_recommendations('linkedin', 3);
        expect(platformJobs).toBeDefined();
        expect(platformJobs.length).toBeGreaterThan(0);
    });
});
```

### Validation Tests
```bash
#!/bin/bash
# test/validation-gate.test.sh

# Test 1: Core validation functions
test_core_validation() {
    echo "Testing core validation functions..."
    
    # Test placeholder detection
    local result=$(./scripts/validation-core.sh placeholders --file test/sample.eml)
    assert_equals "$?" "0" "Placeholder detection should pass"
    
    # Test legal citation validation
    result=$(./scripts/validation-core.sh legal --file test/sample.eml)
    assert_equals "$?" "0" "Legal citation validation should pass"
    
    # Test signature validation
    result=$(./scripts/validation-core.sh signature --file test/sample.eml)
    assert_equals "$?" "0" "Signature validation should pass"
    
    # Test attachment validation
    result=$(./scripts/validation-core.sh attachments --file test/sample.eml)
    assert_equals "$?" "0" "Attachment validation should pass"
}

# Test 2: DPC metrics calculation
test_dpc_metrics() {
    echo "Testing DPC metrics calculation..."
    
    local result=$(./scripts/validation-runner.sh --json --file test/sample.eml)
    local dpc=$(echo $result | jq -r '.metrics.dpc_score')
    
    # DPC should be >= 72 for deployment
    assert_ge "$dpc" "72" "DPC score should be >= 72 for deployment"
    
    local coverage=$(echo $result | jq -r '.metrics.coverage')
    assert_ge "$coverage" "80" "Coverage should be >= 80% for deployment"
    
    local robustness=$(echo $result | jq -r '.metrics.robustness')
    assert_ge "$robustness" "0.8" "Robustness should be >= 80% for deployment"
}

# Test 3: JSON schema validation
test_json_schema() {
    echo "Testing JSON schema validation..."
    
    local result=$(./scripts/validation-runner.sh --json --file test/sample.eml)
    
    # Validate JSON structure
    echo $result | jq -e '.file' > /dev/null
    assert_equals "$?" "0" "JSON should have 'file' field"
    
    echo $result | jq -e '.verdict' > /dev/null
    assert_equals "$?" "0" "JSON should have 'verdict' field"
    
    echo $result | jq -e '.metrics' > /dev/null
    assert_equals "$?" "0" "JSON should have 'metrics' field"
    
    echo $result | jq -e '.exit_code' > /dev/null
    assert_equals "$?" "0" "JSON should have 'exit_code' field"
}

# Test 4: Platform integration
test_platform_integration() {
    echo "Testing platform integration..."
    
    cd packages/reverse-recruiting
    
    # Test WASM compilation
    wasm-pack build --target nodejs --out-dir pkg
    assert_equals "$?" "0" "WASM compilation should succeed"
    
    # Test Node.js integration
    node -e "
    const fs = require('fs');
    const path = require('path');
    
    try {
        const wasmPath = path.join(__dirname, 'pkg', 'reverse_recruiting.js');
        const { ReverseRecruiting } = require(wasmPath);
        const recruiter = new ReverseRecruiting();
        console.log('WASM integration: SUCCESS');
    } catch (error) {
        console.log('WASM integration: FAILED -', error.message);
        process.exit(1);
    }
    "
    assert_equals "$?" "0" "WASM Node.js integration should succeed"
    
    cd - > /dev/null
}

# Test 5: Cross-platform compatibility
test_cross_platform() {
    echo "Testing cross-platform compatibility..."
    
    # Test Neural Trader WASM
    cd packages/neural-trader
    wasm-pack build --target nodejs --out-dir pkg
    assert_equals "$?" "0" "Neural Trader WASM should compile"
    
    node -e "
    const { NeuralTrader } = require('./pkg/neural_trader.js');
    const trader = new NeuralTrader({ model: 'test' });
    console.log('Neural Trader WASM: SUCCESS');
    "
    assert_equals "$?" "0" "Neural Trader WASM integration should succeed"
    
    cd - > /dev/null
}

# Test runner
run_all_tests() {
    echo "🚦 Running TDD Deployment Gate Tests..."
    echo "========================================"
    
    test_core_validation
    test_dpc_metrics  
    test_json_schema
    test_platform_integration
    test_cross_platform
    
    echo "========================================"
    echo "✅ All tests passed! Ready for deployment."
}

# Assert functions
assert_equals() {
    if [ "$1" -eq "$2" ]; then
        echo "✅ $3"
    else
        echo "❌ $3 (expected $2, got $1)"
        exit 1
    fi
}

assert_ge() {
    if (( $(echo "$1 >= $2" | bc -l) )); then
        echo "✅ $3"
    else
        echo "❌ $3 (expected >= $2, got $1)"
        exit 1
    fi
}

# Run tests if called directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    run_all_tests
fi
```

## 🔄 Continuous Integration TDD Pipeline

### GitHub Actions Workflow
```yaml
name: TDD Deployment Gate

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  red-phase:
    name: RED - Identify Failing Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run baseline tests
        run: |
          ./scripts/compare-all-validators.sh --latest
          ./scripts/validation-runner.sh --json --file test/sample.eml
          
      - name: Test WASM compilation
        run: |
          cd packages/neural-trader && wasm-pack build --target nodejs
          cd packages/reverse-recruiting && wasm-pack build --target nodejs
          
      - name: Record baseline metrics
        run: |
          echo "BASELINE_DPC=$(./scripts/get-dpc-metrics.sh)" >> $GITHUB_ENV
          echo "BASELINE_COVERAGE=$(./scripts/get-coverage.sh)" >> $GITHUB_ENV

  green-phase:
    name: GREEN - Make Tests Pass
    runs-on: ubuntu-latest
    needs: red-phase
    steps:
      - uses: actions/checkout@v4
      
      - name: Fix failing validators
        run: |
          ./scripts/fix-validators.sh
          ./scripts/enhance-dpc-metrics.sh
          
      - name: Fix WASM compilation
        run: |
          cd packages/neural-trader && cargo fix --allow-dirty
          cd packages/reverse-recruiting && cargo fix --allow-dirty
          wasm-pack build --target nodejs --out-dir pkg
          
      - name: Run comprehensive tests
        run: ./test/validation-gate.test.sh

  refactor-phase:
    name: REFACTOR - Improve Design
    runs-on: ubuntu-latest
    needs: green-phase
    steps:
      - uses: actions/checkout@v4
      
      - name: Consolidate architecture
        run: |
          ./scripts/consolidate-validation.sh
          ./scripts/standardize-json-output.sh
          
      - name: Optimize WASM performance
        run: |
          wasm-opt -O --enable-simd packages/neural-trader/pkg/neural_trader.wasm -o packages/neural-trader/pkg/neural_trader_opt.wasm
          wasm-opt -O --enable-simd packages/reverse-recruiting/pkg/reverse_recruiting.wasm -o packages/reverse-recruiting/pkg/reverse_recruiting_opt.wasm
          
      - name: Final validation gate
        run: |
          ./test/validation-gate.test.sh
          ./scripts/final-deployment-check.sh

  deployment-gate:
    name: Deployment Gate
    runs-on: ubuntu-latest
    needs: refactor-phase
    steps:
      - uses: actions/checkout@v4
      
      - name: Final DPC verification
        run: |
          DPC=$(./scripts/get-dpc-metrics.sh)
          if (( $(echo "$DPC < 72" | bc -l) )); then
            echo "❌ DPC score $DPC below deployment threshold 72"
            exit 1
          fi
          echo "✅ DPC score $DPC meets deployment requirements"
          
      - name: Create deployment artifact
        run: |
          tar -czf deployment-artifact.tar.gz \
            packages/neural-trader/pkg/ \
            packages/reverse-recruiting/pkg/ \
            scripts/validation-*.sh \
            CONSOLIDATION-TRUTH-REPORT.md
            
      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: deployment-ready
          path: deployment-artifact.tar.gz
```

## 📊 TDD Metrics Dashboard

### Real-time TDD Status
```javascript
// TDD Dashboard Component
const TDDDashboard = {
  metrics: {
    redPhase: {
      failingTests: 0,
      baselineDPC: 0,
      wasmCompilation: false
    },
    greenPhase: {
      passingTests: 0,
      currentDPC: 0,
      coverage: 0
    },
    refactorPhase: {
      codeQuality: 0,
      performance: 0,
      maintainability: 0
    }
  },
  
  status: 'RED', // RED | GREEN | REFACTOR | DEPLOY
  
  updateStatus: function(phase, results) {
    this.metrics[phase] = { ...this.metrics[phase], ...results };
    this.calculateOverallStatus();
  },
  
  calculateOverallStatus: function() {
    const red = this.metrics.redPhase;
    const green = this.metrics.greenPhase;
    const refactor = this.metrics.refactorPhase;
    
    if (red.failingTests > 0 || !red.wasmCompilation) {
      this.status = 'RED';
    } else if (green.currentDPC < 72 || green.coverage < 80) {
      this.status = 'GREEN';
    } else if (refactor.codeQuality < 0.8) {
      this.status = 'REFACTOR';
    } else {
      this.status = 'DEPLOY';
    }
  }
};
```

## 🎯 Deployment Readiness Checklist

### RED Phase ✅
- [ ] Baseline tests executed
- [ ] Failing tests identified
- [ ] DPC metrics recorded
- [ ] WASM compilation tested
- [ ] Platform integration assessed

### GREEN Phase ✅
- [ ] All validators fixed
- [ ] DPC score ≥ 72
- [ ] Coverage ≥ 80%
- [ ] WASM compilation successful
- [ ] JSON schema validated

### REFACTOR Phase ✅
- [ ] Architecture consolidated
- [ ] Code quality ≥ 0.8
- [ ] Performance optimized
- [ ] Documentation updated
- [ ] Security review passed

### DEPLOY Phase ✅
- [ ] Final validation gate passed
- [ ] Deployment artifact created
- [ ] Rollback plan prepared
- [ ] Monitoring configured
- [ ] Team notification sent

## 🚀 Deployment Command

### Final Deployment
```bash
# Run complete TDD cycle
./test/validation-gate.test.sh

# If all tests pass, deploy
if [ $? -eq 0 ]; then
    echo "🚀 Deploying to production..."
    ./scripts/deploy-to-production.sh
else
    echo "❌ Deployment blocked - TDD gate failed"
    exit 1
fi
```

**Status**: 🟢 **TDD DEPLOYMENT GATE READY**

The Red-Green TDD cycle ensures robust validation before deployment with comprehensive testing, DPC metrics verification, and WASM integration testing. All components must pass the deployment gate before release.
