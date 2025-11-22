#!/usr/bin/env python3
"""
StarlingX / HostBill Integration
Checks integration status with StarlingX and HostBill APIs.
"""

import os
import sys

def check_integrations():
    starlingx_url = os.getenv("STARLINGX_API_URL")
    hostbill_url = os.getenv("HOSTBILL_API_URL")

    status = True

    if not starlingx_url:
        print("⚠️ STARLINGX_API_URL not set.")
        status = False
    else:
        print(f"✅ StarlingX: Configured ({starlingx_url})")

    if not hostbill_url:
        print("⚠️ HOSTBILL_API_URL not set.")
        status = False
    else:
        print(f"✅ HostBill: Configured ({hostbill_url})")

    return status

if __name__ == "__main__":
    check_integrations()
    sys.exit(0) # Always exit 0 for now as these are optional
