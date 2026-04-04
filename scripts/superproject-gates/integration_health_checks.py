#!/usr/bin/env python3
"""
Integration Health Checks for HostBill/StarlingX TLS Verification
Usage: python3 scripts/monitoring/integration_health_checks.py [--json]
Checks TLS verification, connectivity, status codes.
"""

import sys
import json
import requests
from requests.exceptions import SSLError, ConnectTimeout, RequestException

def run_checks():
    checks = [
        {
            "name": "hostbill",
            "url": "https://hostbill.interface.tag.ooo"
        },
        {
            "name": "stx",
            "url": "https://stx.interface.tag.ooo"
        },
        {
            "name": "starlingx_ip",
            "url": "http://23.92.79.2"
        }
    ]
    results = {}
    for check in checks:
        name = check["name"]
        url = check["url"]
        try:
            resp = requests.get(url, timeout=10, verify=True)
            results[name] = {
                "status": "pass" if resp.ok else "warn",
                "code": resp.status_code,
                "tls_verified": True
            }
        except SSLError as e:
            results[name] = {
                "status": "fail",
                "reason": "TLS certificate verification failed",
                "error": str(e)[:200]  # truncate
            }
        except ConnectTimeout:
            results[name] = {
                "status": "fail",
                "reason": "Connection timeout"
            }
        except RequestException as e:
            results[name] = {
                "status": "fail",
                "reason": "Request failed",
                "error": str(e)[:200]
            }
    return results

if __name__ == "__main__":
    results = run_checks()
    if "--json" in sys.argv:
        print(json.dumps(results, indent=2))
    else:
        from pprint import pprint
        pprint(results)
