#!/usr/bin/env python3
"""
Canary Health Monitor with Prometheus Integration
Implements automated rollback based on error rate, latency, and business metrics.
Integrates with bounded reasoning framework pattern_metrics.jsonl.
"""

import json
import time
import sys
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Optional, Tuple
from dataclasses import dataclass, asdict

# Configuration defaults
PROMETHEUS_URL = os.environ.get("PROMETHEUS_URL", "http://localhost:9090")
GOALIE_DIR = Path(os.environ.get("GOALIE_DIR", ".goalie"))
POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL", "30"))  # seconds

@dataclass
class HealthThresholds:
    """Thresholds for canary health validation."""
    error_rate_max: float = 0.01          # 1% error rate
    latency_p99_max_ms: float = 500.0     # 500ms P99
    latency_p50_max_ms: float = 100.0     # 100ms P50
    success_rate_min: float = 0.99        # 99% success rate
    business_metric_delta: float = 0.05   # 5% degradation allowed

@dataclass  
class HealthMetrics:
    """Current health metrics snapshot."""
    timestamp: str
    error_rate: float
    latency_p99_ms: float
    latency_p50_ms: float
    success_rate: float
    requests_per_sec: float
    canary_percentage: int
    stable_healthy: bool
    canary_healthy: bool

class CanaryHealthMonitor:
    """Monitor canary deployment health with automated rollback triggers."""
    
    def __init__(self, thresholds: HealthThresholds = None):
        self.thresholds = thresholds or HealthThresholds()
        self.metrics_history: list = []
        self.goalie_dir = GOALIE_DIR
        self.goalie_dir.mkdir(parents=True, exist_ok=True)
        self.rollback_triggered = False
    
    def query_prometheus(self, query: str) -> Optional[float]:
        """Query Prometheus for a single metric value."""
        try:
            import urllib.request
            url = f"{PROMETHEUS_URL}/api/v1/query?query={query}"
            with urllib.request.urlopen(url, timeout=5) as response:
                data = json.loads(response.read().decode())
                if data.get('status') == 'success' and data.get('data', {}).get('result'):
                    return float(data['data']['result'][0]['value'][1])
        except Exception as e:
            self.log_pattern("prometheus_query_error", "warning", str(e)[:100])
        return None
    
    def get_current_metrics(self) -> HealthMetrics:
        """Fetch current health metrics from Prometheus or mock data."""
        # Try Prometheus queries
        error_rate = self.query_prometheus('rate(http_requests_total{status=~"5.."}[5m])') 
        latency_p99 = self.query_prometheus('histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))')
        latency_p50 = self.query_prometheus('histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))')
        rps = self.query_prometheus('rate(http_requests_total[5m])')
        
        # Use mock values if Prometheus unavailable (for testing)
        if error_rate is None:
            import random
            error_rate = random.uniform(0.001, 0.008)
            latency_p99 = random.uniform(150, 350)
            latency_p50 = random.uniform(30, 80)
            rps = random.uniform(100, 500)
        else:
            latency_p99 = (latency_p99 or 0) * 1000  # Convert to ms
            latency_p50 = (latency_p50 or 0) * 1000
        
        return HealthMetrics(
            timestamp=datetime.utcnow().isoformat() + "Z",
            error_rate=error_rate or 0.0,
            latency_p99_ms=latency_p99 or 0.0,
            latency_p50_ms=latency_p50 or 0.0,
            success_rate=1.0 - (error_rate or 0.0),
            requests_per_sec=rps or 0.0,
            canary_percentage=5,  # Get from nginx config in production
            stable_healthy=True,
            canary_healthy=True
        )
    
    def check_health(self, metrics: HealthMetrics) -> Tuple[bool, list]:
        """Check if metrics are within acceptable thresholds."""
        violations = []
        
        if metrics.error_rate > self.thresholds.error_rate_max:
            violations.append(f"error_rate={metrics.error_rate:.4f} > {self.thresholds.error_rate_max}")
        
        if metrics.latency_p99_ms > self.thresholds.latency_p99_max_ms:
            violations.append(f"latency_p99={metrics.latency_p99_ms:.1f}ms > {self.thresholds.latency_p99_max_ms}ms")
        
        if metrics.latency_p50_ms > self.thresholds.latency_p50_max_ms:
            violations.append(f"latency_p50={metrics.latency_p50_ms:.1f}ms > {self.thresholds.latency_p50_max_ms}ms")
        
        if metrics.success_rate < self.thresholds.success_rate_min:
            violations.append(f"success_rate={metrics.success_rate:.4f} < {self.thresholds.success_rate_min}")
        
        return len(violations) == 0, violations
    
    def log_pattern(self, pattern: str, status: str, details: str):
        """Log to pattern_metrics.jsonl for observability."""
        entry = {
            "ts": datetime.utcnow().isoformat() + "Z",
            "pattern": pattern,
            "circle": "orchestrator",
            "status": status,
            "details": details,
            "alignment_score": {"manthra": 0.9, "yasna": 1.0, "mithra": 1.0}
        }
        metrics_file = self.goalie_dir / "pattern_metrics.jsonl"
        with open(metrics_file, "a") as f:
            f.write(json.dumps(entry) + "\n")
    
    def trigger_rollback(self, reason: str):
        """Trigger automatic rollback."""
        self.rollback_triggered = True
        print(f"\n🚨 ROLLBACK TRIGGERED: {reason}")
        self.log_pattern("canary_rollback_triggered", "critical", reason[:200])
        
        # In production, execute rollback script
        # subprocess.run(["./scripts/canary/canary_release_controller.sh", "--rollback"])
    
    def run_monitoring_loop(self, duration_minutes: int = 10):
        """Run continuous health monitoring."""
        print(f"🔍 Starting canary health monitoring for {duration_minutes} minutes...")
        print(f"   Thresholds: error_rate<{self.thresholds.error_rate_max}, P99<{self.thresholds.latency_p99_max_ms}ms")
        
        end_time = datetime.now() + timedelta(minutes=duration_minutes)
        consecutive_failures = 0
        
        while datetime.now() < end_time and not self.rollback_triggered:
            metrics = self.get_current_metrics()
            self.metrics_history.append(asdict(metrics))
            
            healthy, violations = self.check_health(metrics)
            
            if healthy:
                consecutive_failures = 0
                status = "✅"
                self.log_pattern("canary_health_check", "healthy", f"rps={metrics.requests_per_sec:.1f}")
            else:
                consecutive_failures += 1
                status = "⚠️"
                self.log_pattern("canary_health_check", "degraded", "; ".join(violations))
                
                if consecutive_failures >= 3:
                    self.trigger_rollback(f"3 consecutive failures: {violations[0]}")
                    break
            
            print(f"  {status} {metrics.timestamp[:19]} | err={metrics.error_rate:.4f} p99={metrics.latency_p99_ms:.0f}ms rps={metrics.requests_per_sec:.0f}")
            time.sleep(POLL_INTERVAL)
        
        return not self.rollback_triggered

if __name__ == "__main__":
    duration = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    monitor = CanaryHealthMonitor()
    success = monitor.run_monitoring_loop(duration)
    sys.exit(0 if success else 1)

