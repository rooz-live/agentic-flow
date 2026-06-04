import os
import sys

sys.path.insert(0, os.path.abspath("."))
from risk_analytics.device_state import (merge_device_signals,
                                         score_device_state)
from risk_analytics.risk_scoring import compute_risk_score


def test_scenario_ipmi_down_device_24460():
    """Scenario: hv2b40b82 (device #24460) IPMI unreachable"""
    ipmi = {"device_id": "#24460", "ok": False}
    net = {"hostname": "stx-aio-0.corp.interface.tag.ooo", "ip": "23.92.79.2", "ok": True}
    svc = {"nginx_ok": True, "tls_ok": True, "notes": "hv2b40b82 IPMI timeout"}

    ds = merge_device_signals(ipmi, net, svc)
    cfg = {"weights": {"ipmi": 0.35, "network": 0.3, "nginx": 0.2, "tls": 0.15}}
    risk = score_device_state(ds, cfg)
    # IPMI down but network/services ok → P2 (medium)
    assert 25 <= risk < 50, f"Expected P2 (25-49), got {risk}"


def test_scenario_network_latency_stx_aio():
    """Scenario: stx-aio-0 network endpoint slow/unreachable"""
    ipmi = {"device_id": "stx-aio-0", "ok": True}
    net = {"hostname": "stx-aio-0.corp.interface.tag.ooo", "ip": "23.92.79.2", "ok": False}
    svc = {"nginx_ok": True, "tls_ok": True, "notes": "DNS/HTTPS timeout"}

    ds = merge_device_signals(ipmi, net, svc)
    cfg = {"weights": {"ipmi": 0.35, "network": 0.3, "nginx": 0.2, "tls": 0.15}}
    risk = score_device_state(ds, cfg)
    # Network down but IPMI/services ok → P2 (medium)
    assert 25 <= risk < 50, f"Expected P2 (25-49), got {risk}"


def test_scenario_cascading_failures():
    """Scenario: Multiple failures (IPMI + network + nginx)"""
    ipmi = {"device_id": "#24460", "ok": False}
    net = {"hostname": "stx-aio-0.corp.interface.tag.ooo", "ip": "23.92.79.2", "ok": False}
    svc = {"nginx_ok": False, "tls_ok": True, "notes": "Cascading failures detected"}

    ds = merge_device_signals(ipmi, net, svc)
    cfg = {"weights": {"ipmi": 0.35, "network": 0.3, "nginx": 0.2, "tls": 0.15}}
    risk = score_device_state(ds, cfg)
    # Multiple failures → P1 (high) or P0 (critical)
    assert risk >= 50, f"Expected P1+ (50+), got {risk}"


def test_scenario_all_healthy():
    """Scenario: All systems healthy"""
    ipmi = {"device_id": "#24460", "ok": True}
    net = {"hostname": "stx-aio-0.corp.interface.tag.ooo", "ip": "23.92.79.2", "ok": True}
    svc = {"nginx_ok": True, "tls_ok": True, "notes": "All systems nominal"}

    ds = merge_device_signals(ipmi, net, svc)
    cfg = {"weights": {"ipmi": 0.35, "network": 0.3, "nginx": 0.2, "tls": 0.15}}
    risk = score_device_state(ds, cfg)
    # All ok → P3 (low)
    assert risk < 25, f"Expected P3 (<25), got {risk}"


def test_scenario_tls_certificate_expired():
    """Scenario: TLS/HSTS misconfiguration (single failure)"""
    ipmi = {"device_id": "stx-aio-0", "ok": True}
    net = {"hostname": "stx-aio-0.corp.interface.tag.ooo", "ip": "23.92.79.2", "ok": True}
    svc = {"nginx_ok": True, "tls_ok": False, "notes": "TLS cert expired or HSTS missing"}

    ds = merge_device_signals(ipmi, net, svc)
    cfg = {"weights": {"ipmi": 0.35, "network": 0.3, "nginx": 0.2, "tls": 0.15}}
    risk = score_device_state(ds, cfg)
    # TLS down but others ok → P3 (low, single failure)
    assert risk < 25, f"Expected P3 (<25), got {risk}"
