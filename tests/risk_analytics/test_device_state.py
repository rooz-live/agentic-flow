import os
import sys

sys.path.insert(0, os.path.abspath("."))
from risk_analytics.device_state import (merge_device_signals,
                                         score_device_state)


def test_merge_device_signals_and_score():
    ipmi = {"device_id": "#24460", "ok": False}
    net = {"hostname": "stx-aio-0.corp.interface.tag.ooo", "ip": "23.92.79.2", "ok": True}
    svc = {"nginx_ok": False, "tls_ok": False, "notes": "hv2b40b82 unstable"}

    ds = merge_device_signals(ipmi, net, svc)
    assert ds.device_id == "#24460"
    assert ds.hostname.startswith("stx-aio-0")

    cfg = {"weights": {"ipmi": 0.35, "network": 0.3, "nginx": 0.2, "tls": 0.15}}
    risk = score_device_state(ds, cfg)
    assert 0 <= risk <= 100
    assert risk > 0  # since there are failures
