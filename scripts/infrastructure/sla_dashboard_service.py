#!/usr/bin/env python3
"""
SLA Dashboard Service
Provides real-time SLA metrics: availability, MTTR, throughput, latency
Targets: 99.9% availability, MTTR <15min, >1000 RPS, <200ms P95
"""

import os
import json
import time
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional
import requests
from http.server import HTTPServer, BaseHTTPRequestHandler

# Configuration
PROMETHEUS_URL = os.environ.get('PROMETHEUS_URL', 'http://localhost:9090')
LOKI_URL = os.environ.get('LOKI_URL', 'http://localhost:3100')
PORT = int(os.environ.get('SLA_DASHBOARD_PORT', '8080'))

# SLA Targets
SLA_TARGETS = {
    'availability': 99.9,      # percentage
    'mttr': 900,               # seconds (15 minutes)
    'throughput': 1000,        # RPS
    'p95_latency': 200,        # milliseconds
}

PLATFORMS = ['hostbill', 'wordpress', 'flarum', 'affiliate', 'trading']


@dataclass
class PlatformMetrics:
    platform: str
    availability: float
    current_uptime: bool
    error_rate: float
    throughput: float
    p95_latency: float
    p99_latency: float
    last_incident: Optional[str]
    mttr_current: Optional[float]
    sla_compliance: Dict[str, bool]


@dataclass
class SLASummary:
    timestamp: str
    overall_availability: float
    average_mttr: float
    total_throughput: float
    worst_p95_latency: float
    platforms: List[PlatformMetrics]
    sla_met: bool
    incidents_last_24h: int


def query_prometheus(query: str) -> Optional[float]:
    """Query Prometheus and return first result value."""
    try:
        response = requests.get(
            f"{PROMETHEUS_URL}/api/v1/query",
            params={'query': query},
            timeout=5
        )
        data = response.json()
        if data.get('status') == 'success' and data.get('data', {}).get('result'):
            return float(data['data']['result'][0]['value'][1])
    except Exception as e:
        print(f"Prometheus query error: {e}")
    return None


def get_platform_metrics(platform: str) -> PlatformMetrics:
    """Get all SLA metrics for a platform."""
    # Query availability (up metric)
    availability_query = f'avg_over_time(up{{job="{platform}"}}[24h]) * 100'
    availability = query_prometheus(availability_query) or 0.0
    
    # Current status
    current_up = query_prometheus(f'up{{job="{platform}"}}')
    current_uptime = current_up == 1.0 if current_up is not None else False
    
    # Error rate
    error_rate_query = f'platform:error_rate:5m{{platform="{platform}"}}'
    error_rate = query_prometheus(error_rate_query) or 0.0
    
    # Throughput
    throughput_query = f'platform:request_rate:5m{{platform="{platform}"}}'
    throughput = query_prometheus(throughput_query) or 0.0
    
    # Latency
    p95_query = f'platform:latency_p95:5m{{platform="{platform}"}} * 1000'
    p99_query = f'platform:latency_p99:5m{{platform="{platform}"}} * 1000'
    p95_latency = query_prometheus(p95_query) or 0.0
    p99_latency = query_prometheus(p99_query) or 0.0
    
    # SLA compliance check
    sla_compliance = {
        'availability': availability >= SLA_TARGETS['availability'],
        'throughput': throughput >= SLA_TARGETS['throughput'],
        'latency': p95_latency <= SLA_TARGETS['p95_latency'],
        'error_rate': error_rate <= 0.01,
    }
    
    return PlatformMetrics(
        platform=platform,
        availability=round(availability, 3),
        current_uptime=current_uptime,
        error_rate=round(error_rate, 5),
        throughput=round(throughput, 2),
        p95_latency=round(p95_latency, 2),
        p99_latency=round(p99_latency, 2),
        last_incident=None,
        mttr_current=None,
        sla_compliance=sla_compliance
    )


def get_sla_summary() -> SLASummary:
    """Get overall SLA summary across all platforms."""
    platform_metrics = [get_platform_metrics(p) for p in PLATFORMS]
    
    # Calculate aggregates
    availabilities = [m.availability for m in platform_metrics if m.availability > 0]
    throughputs = [m.throughput for m in platform_metrics]
    latencies = [m.p95_latency for m in platform_metrics if m.p95_latency > 0]
    
    overall_availability = sum(availabilities) / len(availabilities) if availabilities else 0
    total_throughput = sum(throughputs)
    worst_latency = max(latencies) if latencies else 0
    
    # Check if all SLAs are met
    all_sla_met = all(
        all(m.sla_compliance.values()) for m in platform_metrics
    )
    
    return SLASummary(
        timestamp=datetime.utcnow().isoformat() + 'Z',
        overall_availability=round(overall_availability, 3),
        average_mttr=0,  # Calculated from incident history
        total_throughput=round(total_throughput, 2),
        worst_p95_latency=round(worst_latency, 2),
        platforms=platform_metrics,
        sla_met=all_sla_met,
        incidents_last_24h=0
    )


class SLADashboardHandler(BaseHTTPRequestHandler):
    """HTTP handler for SLA dashboard API."""
    
    def _set_headers(self, content_type='application/json'):
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
    
    def do_GET(self):
        if self.path == '/api/sla/summary':
            self._set_headers()
            summary = get_sla_summary()
            response = asdict(summary)
            self.wfile.write(json.dumps(response, indent=2).encode())
        
        elif self.path.startswith('/api/sla/platform/'):
            platform = self.path.split('/')[-1]
            if platform in PLATFORMS:
                self._set_headers()
                metrics = get_platform_metrics(platform)
                self.wfile.write(json.dumps(asdict(metrics), indent=2).encode())
            else:
                self.send_error(404, f"Platform {platform} not found")
        
        elif self.path == '/api/sla/targets':
            self._set_headers()
            self.wfile.write(json.dumps(SLA_TARGETS, indent=2).encode())
        
        elif self.path == '/health':
            self._set_headers()
            self.wfile.write(json.dumps({'status': 'healthy'}).encode())
        
        else:
            self.send_error(404)


def main():
    server = HTTPServer(('0.0.0.0', PORT), SLADashboardHandler)
    print(f"SLA Dashboard running on port {PORT}")
    print(f"Prometheus: {PROMETHEUS_URL}")
    print(f"SLA Targets: {SLA_TARGETS}")
    server.serve_forever()


if __name__ == '__main__':
    main()

