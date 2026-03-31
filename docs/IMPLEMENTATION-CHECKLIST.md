# MPP Threshold Integration - Implementation Checklist

## ✅ **Step 1: Populate agentdb.db with 30+ Episodes**

### **Quick Start (Synthetic Data)**
```bash
# Generate 50 test episodes for HIGH_CONFIDENCE thresholds
npx ts-node scripts/generate-test-episodes.ts --count 50

# Custom parameters
npx ts-node scripts/generate-test-episodes.ts \
  --count 100 \
  --circle orchestrator \
  --ceremony standup \
  --success-rate 0.75 \
  --mean-reward 0.80 \
  --stddev-reward 0.12
```

### **Verify Episodes**
```bash
# Check episode count
sqlite3 agentdb.db "SELECT COUNT(*) FROM episodes WHERE task LIKE '%orchestrator%'"

# View episode stats
sqlite3 agentdb.db "
SELECT 
  COUNT(*) as total,
  SUM(success) as successes,
  AVG(reward) as avg_reward,
  MIN(created_at) as first,
  MAX(created_at) as last
FROM episodes 
WHERE task LIKE '%orchestrator%'
"

# Test threshold calculations
./scripts/ay-dynamic-thresholds.sh all orchestrator standup
```

### **Expected Output (with 50+ episodes)**
```
Circuit Breaker: 0.73 (HIGH_CONFIDENCE, 50 episodes)
Degradation: 0.82 (HIGH_CONFIDENCE, CV=0.15)
Cascade: 7 failures / 5 min (STATISTICAL)
Divergence: 0.15 (Sharpe=1.8, HIGH_CONFIDENCE)
Check Frequency: 10 episodes (DATA_DRIVEN)
Quantile 5th: 0.68 (EMPIRICAL_QUANTILE)
```

---

## ✅ **Step 2: Import Enhanced Functions in Ceremony Runners**

### **A. Update ceremony-scheduler.ts**

Add import at top of file:
```typescript
import {
  refreshDynamicThresholds,
  recordEpisodePerformance,
  recordFailureForCascade,
  performHealthCheck
} from '../runtime/processGovernorEnhanced';
import { ensureState } from '../api/health-check-endpoint';
```

Add to `executeCeremony` function (around line 188):
```typescript
async function executeCeremony(circle: string, ceremony: string): Promise<void> {
  const state = ensureState();
  const startTime = Date.now();
  
  try {
    // Refresh thresholds before execution
    await refreshDynamicThresholds(state, circle, ceremony);
    
    // Execute ceremony via ay-prod-cycle.sh
    const scriptPath = path.join(ROOT_DIR, 'scripts', 'ay-prod-cycle.sh');
    const { stdout, stderr } = await execAsync(
      `bash "${scriptPath}" ${circle} ${ceremony}`,
      { cwd: ROOT_DIR, timeout: 600000 }
    );
    
    // Record successful execution
    const latencyMs = Date.now() - startTime;
    recordEpisodePerformance(state, 0.85, true); // Adjust reward as needed
    
    console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (error) {
    // Record failure
    const latencyMs = Date.now() - startTime;
    recordEpisodePerformance(state, 0.3, false);
    recordFailureForCascade(state, `${circle}-${ceremony}-${Date.now()}`);
    
    throw error;
  }
}
```

### **B. Create Ceremony Integration Module**

File: `src/ceremonies/threshold-integration.ts`
```typescript
import {
  refreshDynamicThresholds,
  recordEpisodePerformance,
  recordFailureForCascade,
  checkDegradation,
  checkCascadeFailure,
  shouldPerformCheck
} from '../runtime/processGovernorEnhanced';

export class CeremonyThresholdMonitor {
  private episodeCount: number = 0;

  async beforeCeremony(state: any, circle: string, ceremony: string): Promise<void> {
    // Refresh thresholds
    await refreshDynamicThresholds(state, circle, ceremony);
    
    // Check for degradation
    if (shouldPerformCheck(state, this.episodeCount)) {
      const degradation = checkDegradation(state);
      if (degradation.degraded) {
        console.warn(`⚠️ Performance degradation detected: ${(degradation.degradationScore * 100).toFixed(1)}%`);
      }
      
      // Check for cascade
      const cascade = checkCascadeFailure(state);
      if (cascade.cascading) {
        console.error(`🚨 CASCADE FAILURE: ${cascade.failureCount} failures in ${cascade.windowMinutes}min`);
        throw new Error('CASCADE_FAILURE_DETECTED');
      }
    }
  }

  afterCeremony(state: any, success: boolean, reward: number, taskId?: string): void {
    this.episodeCount++;
    
    recordEpisodePerformance(state, reward, success);
    
    if (!success && taskId) {
      recordFailureForCascade(state, taskId);
    }
  }
}
```

---

## ✅ **Step 3: Add Health Check Endpoints to APIs**

### **A. Register Health Check Routes**

File: `src/api/server.ts` (or your main API file)

```typescript
import healthCheckRouter from './health-check-endpoint';

// ... existing imports ...

const app = express();

// ... existing middleware ...

// Register health check endpoints
app.use('/api', healthCheckRouter);

// ... existing routes ...
```

### **B. Test Health Check Endpoints**

```bash
# Start your API server
npm run dev

# Test comprehensive health check
curl -s http://localhost:3000/api/health | jq

# Test individual endpoints
curl -s http://localhost:3000/api/health/thresholds | jq
curl -s http://localhost:3000/api/health/degradation | jq
curl -s http://localhost:3000/api/health/cascade | jq
curl -s http://localhost:3000/api/health/divergence | jq
curl -s http://localhost:3000/api/health/metrics | jq

# Test with custom circle/ceremony
curl -s "http://localhost:3000/api/health?circle=assessor&ceremony=review" | jq

# Force threshold refresh
curl -s "http://localhost:3000/api/health/thresholds?refresh=true" | jq
```

### **C. Test Episode Recording**

```bash
# Record successful episode
curl -X POST http://localhost:3000/api/health/episode \
  -H "Content-Type: application/json" \
  -d '{"reward": 0.85, "success": true, "taskId": "test-123"}'

# Record failed episode
curl -X POST http://localhost:3000/api/health/episode \
  -H "Content-Type: application/json" \
  -d '{"reward": 0.3, "success": false, "taskId": "test-456"}'

# Check updated metrics
curl -s http://localhost:3000/api/health/metrics | jq
```

---

## ✅ **Step 4: Configure Monitoring Dashboards**

### **A. Grafana Dashboard (JSON)**

File: `dashboards/dynamic-thresholds-dashboard.json`

```json
{
  "dashboard": {
    "title": "Dynamic MPP Threshold Monitoring",
    "panels": [
      {
        "title": "Degradation Score",
        "targets": [
          {
            "expr": "threshold_degradation_score"
          }
        ],
        "alert": {
          "conditions": [
            {
              "evaluator": {
                "params": [0.3],
                "type": "gt"
              }
            }
          ]
        }
      },
      {
        "title": "Cascade Failure Count",
        "targets": [
          {
            "expr": "threshold_cascade_failure_count"
          }
        ]
      },
      {
        "title": "Divergence Rate",
        "targets": [
          {
            "expr": "threshold_divergence_rate_current"
          }
        ]
      },
      {
        "title": "Circuit Breaker State",
        "targets": [
          {
            "expr": "circuit_breaker_state"
          }
        ]
      }
    ]
  }
}
```

### **B. Prometheus Metrics Export**

File: `src/monitoring/threshold-metrics.ts`

```typescript
import { Register, Gauge } from 'prom-client';
import { ensureState } from '../api/health-check-endpoint';

const register = new Register();

const degradationScoreGauge = new Gauge({
  name: 'threshold_degradation_score',
  help: 'Current degradation score (0-1)',
  registers: [register]
});

const cascadeFailureCountGauge = new Gauge({
  name: 'threshold_cascade_failure_count',
  help: 'Number of failures in cascade window',
  registers: [register]
});

const divergenceRateGauge = new Gauge({
  name: 'threshold_divergence_rate_current',
  help: 'Current divergence rate (0-1)',
  registers: [register]
});

const circuitBreakerStateGauge = new Gauge({
  name: 'circuit_breaker_state',
  help: 'Circuit breaker state (0=CLOSED, 1=OPEN, 2=HALF_OPEN)',
  registers: [register]
});

// Update metrics every 10 seconds
setInterval(() => {
  const state = ensureState();
  
  degradationScoreGauge.set(state.metrics.degradation_score);
  cascadeFailureCountGauge.set(state.metrics.cascade_failure_count);
  divergenceRateGauge.set(state.metrics.divergence_rate_current);
  
  const cbStateMap = { CLOSED: 0, OPEN: 1, HALF_OPEN: 2 };
  circuitBreakerStateGauge.set(cbStateMap[state.circuitBreaker.state] || 0);
}, 10000);

export { register };
```

### **C. Dashboard Alert Rules**

File: `.monitoring/alert-rules.yml`

```yaml
groups:
  - name: dynamic_thresholds
    interval: 30s
    rules:
      - alert: PerformanceDegradation
        expr: threshold_degradation_score > 0.3
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Performance degradation detected"
          description: "Degradation score {{ $value }} exceeds threshold"

      - alert: CascadeFailure
        expr: threshold_cascade_failure_count >= 5
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Cascade failure detected"
          description: "{{ $value }} failures detected in time window"

      - alert: CircuitBreakerOpen
        expr: circuit_breaker_state == 1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Circuit breaker is OPEN"
          description: "System in failure state"

      - alert: LowThresholdConfidence
        expr: threshold_confidence == 0  # NO_DATA
        for: 10m
        labels:
          severity: info
        annotations:
          summary: "Threshold confidence is LOW"
          description: "Need more episode data for accurate thresholds"
```

### **D. Simple Dashboard HTML**

File: `dashboards/simple-threshold-dashboard.html`

```html
<!DOCTYPE html>
<html>
<head>
    <title>Dynamic Threshold Monitor</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: Arial; padding: 20px; }
        .metric { display: inline-block; margin: 10px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .healthy { background: #d4edda; }
        .warning { background: #fff3cd; }
        .critical { background: #f8d7da; }
    </style>
</head>
<body>
    <h1>Dynamic MPP Threshold Dashboard</h1>
    
    <div id="status"></div>
    <div id="metrics"></div>
    
    <canvas id="degradationChart" width="400" height="200"></canvas>
    <canvas id="cascadeChart" width="400" height="200"></canvas>
    
    <script>
        const API_URL = 'http://localhost:3000/api';
        
        async function fetchHealth() {
            const response = await fetch(`${API_URL}/health`);
            return await response.json();
        }
        
        async function updateDashboard() {
            const health = await fetchHealth();
            
            // Update status
            document.getElementById('status').innerHTML = `
                <h2 class="${health.healthy ? 'healthy' : 'critical'}">
                    Status: ${health.healthy ? '✅ HEALTHY' : '🚨 UNHEALTHY'}
                </h2>
                <p>Confidence: ${health.thresholdsConfidence}</p>
            `;
            
            // Update metrics
            document.getElementById('metrics').innerHTML = `
                <div class="metric">
                    <strong>Degradation Score</strong><br>
                    ${(health.checks.degradation.score * 100).toFixed(1)}%
                </div>
                <div class="metric">
                    <strong>Cascade Failures</strong><br>
                    ${health.checks.cascadeFailure.failureCount}
                </div>
                <div class="metric">
                    <strong>Divergence Rate</strong><br>
                    ${(health.checks.divergenceRate.currentRate * 100).toFixed(1)}%
                </div>
                <div class="metric">
                    <strong>Circuit Breaker</strong><br>
                    ${health.checks.circuitBreaker.state}
                </div>
            `;
        }
        
        // Update every 10 seconds
        updateDashboard();
        setInterval(updateDashboard, 10000);
    </script>
</body>
</html>
```

---

## 🚀 **Quick Start Commands**

```bash
# 1. Generate episodes
npx ts-node scripts/generate-test-episodes.ts --count 50

# 2. Verify thresholds
./scripts/ay-dynamic-thresholds.sh all orchestrator standup

# 3. Start API with health checks
npm run dev

# 4. Test health endpoint
curl -s http://localhost:3000/api/health | jq

# 5. Open dashboard
open dashboards/simple-threshold-dashboard.html
```

---

## 📊 **Verification Checklist**

- [ ] agentdb.db has 30+ episodes
- [ ] Threshold script returns HIGH_CONFIDENCE
- [ ] Health check endpoint returns 200
- [ ] All 6 thresholds have valid values
- [ ] Ceremony runners call enhanced functions
- [ ] Dashboard displays real-time metrics
- [ ] Alerts trigger on threshold violations

---

## 🎯 **Success Criteria**

| Metric | Target | Status |
|--------|--------|--------|
| Episode Count | ≥ 30 | Check with query |
| Threshold Confidence | HIGH_CONFIDENCE | Check script output |
| Circuit Breaker | Dynamic (not 0.7) | Check /api/health/thresholds |
| Degradation | < 0.3 score | Check /api/health/degradation |
| Cascade Failures | < threshold | Check /api/health/cascade |
| API Response Time | < 500ms | Check /api/health |
| Dashboard Update | < 10s latency | Check browser |

---

## 🐛 **Troubleshooting**

### Issue: NO_DATA confidence
**Solution**: Generate more episodes
```bash
npx ts-node scripts/generate-test-episodes.ts --count 100
```

### Issue: Script returns empty values
**Solution**: Check AGENTDB_PATH
```bash
export AGENTDB_PATH="./agentdb.db"
./scripts/ay-dynamic-thresholds.sh all orchestrator standup
```

### Issue: Health endpoint 500 error
**Solution**: Check imports and state initialization
```bash
npm run typecheck
```

### Issue: Dashboard not updating
**Solution**: Check API CORS and fetch URL
```javascript
// Add CORS if needed
app.use(cors({ origin: '*' }));
```

---

## 📚 **Additional Resources**

- [Dynamic Threshold Integration Guide](./dynamic-threshold-integration.md)
- [Bash Script Documentation](../scripts/ay-dynamic-thresholds.sh)
- [API Endpoint Reference](../src/api/health-check-endpoint.ts)
- [Process Governor Enhanced](../src/runtime/processGovernorEnhanced.ts)
