import os
import sys
import logging
import logging.handlers
import requests
import json
from datetime import datetime
from src.infrastructure.provider_selection import AWSLightsailProvider, HivelocityProvider

# Setup logging
logger = logging.getLogger('ProviderMonitor')
logger.setLevel(logging.INFO)

# Syslog handler (simulated for local dev if /dev/log missing)
try:
    syslog_handler = logging.handlers.SysLogHandler(address='/dev/log')
    logger.addHandler(syslog_handler)
except Exception:
    console_handler = logging.StreamHandler()
    logger.addHandler(console_handler)

def check_hivelocity_health():
    """Check Hivelocity API availability and device status."""
    api_key = os.environ.get('HIVELOCITY_API_KEY')
    if not api_key:
        logger.warning("HIVELOCITY_API_KEY not set, skipping deep health check")
        return {"status": "skipped", "provider": "Hivelocity"}

    # Stub for actual API call
    # In reality: requests.get("https://core.hivelocity.net/api/v2/...", ...)
    return {"status": "ok", "provider": "Hivelocity", "latency_ms": 120}

def check_aws_health():
    """Check AWS Lightsail availability."""
    # Stub for boto3 check
    return {"status": "ok", "provider": "AWS Lightsail", "region": "us-east-1"}

def check_sink_connectivity(sink_ip: str):
    """Check connectivity to the syslog sink."""
    response = os.system(f"ping -c 1 -W 1 {sink_ip} > /dev/null 2>&1")
    if response == 0:
        return {"status": "up", "target": sink_ip}
    else:
        return {"status": "down", "target": sink_ip}

def monitor_drift():
    """Main monitoring loop (one-off execution)."""
    logger.info("Starting Provider Drift Monitor")

    events = []

    # 1. AWS Health
    aws_status = check_aws_health()
    events.append(aws_status)
    logger.info(f"AWS Status: {aws_status}")

    # 2. Hivelocity Health
    hv_status = check_hivelocity_health()
    events.append(hv_status)
    logger.info(f"HV Status: {hv_status}")

    # 3. Sink Connectivity (Mock IP for safety)
    sink_ip = "127.0.0.1"
    conn_status = check_sink_connectivity(sink_ip)
    events.append(conn_status)
    logger.info(f"Connectivity: {conn_status}")

    # Logic to detect drift (e.g. if provider API returns unexpected instance state)
    # Stubbed here.

    report = {
        "timestamp": datetime.now().isoformat(),
        "events": events
    }

    print(json.dumps(report, indent=2))
    return report

if __name__ == "__main__":
    monitor_drift()
