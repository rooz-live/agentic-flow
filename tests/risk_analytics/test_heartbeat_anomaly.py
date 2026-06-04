import os
import sys

sys.path.insert(0, os.path.abspath("."))
from risk_analytics.heartbeat_anomaly import (detect_heartbeat_anomaly,
                                              parse_heartbeat)


def test_parse_heartbeat_canonical():
    line = "1739571000.12|ssl_backoff|retry_delay|waiting|30.0|corr-1|platform=openstack,attempt=2"
    evt = parse_heartbeat(line)
    assert evt and evt["component"] == "ssl_backoff"
    assert evt["context"]["platform"] == "openstack"


def test_detect_heartbeat_anomaly_conservative():
    baseline = {"registry": {"ssl_backoff": {"retry_delay": {"median": 5.0, "p95": 15.0}}}}
    cfg = {"allowed_status": ["waiting", "ok", "success", "failed", "error"]}
    evt_ok = {
        "component": "ssl_backoff",
        "phase": "retry_delay",
        "status": "waiting",
        "elapsed": 30.0,
    }
    evt_bad_comp = {**evt_ok, "component": "unknown"}
    evt_bad_status = {**evt_ok, "status": "ALERT"}

    assert detect_heartbeat_anomaly(evt_bad_comp, baseline, cfg) is True
    assert detect_heartbeat_anomaly(evt_bad_status, baseline, cfg) is True
    assert detect_heartbeat_anomaly(evt_ok, baseline, cfg) is False
