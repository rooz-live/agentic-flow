#!/usr/bin/env python3
"""
scripts/infra/cpanel/dnssec-audit.py

Audits DNSSEC status across all hosted cPanel domains.
Compares DS records registered in the parent registry (public DNS)
against local PowerDNS DNSSEC keys on the cPanel server.

If a mismatch is found (e.g. parent has DS records but local signing is
disabled), it can automatically enable DNSSEC locally to restore resolution
sanity.

Usage:
    python3 dnssec-audit.py --audit
    python3 dnssec-audit.py --fix
    python3 dnssec-audit.py --domain yocloud.com
"""

import argparse
import json
import os
import subprocess
import sys
from typing import Dict, List, Any

# Ensure we can import cpanel_ssh_client
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from cpanel_ssh_client import CpanelSSHClient  # noqa: E402


def get_public_ds(domain: str) -> List[Dict[str, Any]]:
    """Query public DNS for parent zone DS records."""
    cmd = ["dig", "ds", domain, "+short"]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        records = []
        for line in res.stdout.strip().split("\n"):
            parts = line.split()
            if len(parts) >= 4:
                records.append({
                    "keytag": parts[0],
                    "algo": parts[1],
                    "digest_type": parts[2],
                    "digest": "".join(parts[3:]).lower()
                })
        return records
    except Exception as e:
        print(f"Error querying public DNS for {domain}: {e}")
        return []


def main():
    parser = argparse.ArgumentParser(
        description="cPanel DNSSEC Auditor & Alignment Tool"
    )
    parser.add_argument(
        "--audit", action="store_true", help="Audit all domains"
    )
    parser.add_argument(
        "--fix",
        action="store_true",
        help="Auto-enable DNSSEC locally for domains with parent DS records",
    )
    parser.add_argument("--domain", help="Audit or fix a specific domain")
    args = parser.parse_args()

    if not (args.audit or args.fix or args.domain):
        parser.print_help()
        sys.exit(1)

    # Initialize SSH client to the StarlingX host and wrap for VM access
    base_client = CpanelSSHClient.from_env(allow_writes=True)

    class VMClientWrapper:

        def __init__(self, client):
            self.client = client

        def run(self, cmd: str):
            escaped_cmd = cmd.replace("'", "'\\''")
            vm_cmd = (
                f"ssh -i /home/ubuntu/.ssh/sovereign_swarm "
                f"-o StrictHostKeyChecking=no root@192.168.122.237 "
                f"'{escaped_cmd}'"
            )
            return self.client.run(vm_cmd)

    client = VMClientWrapper(base_client)

    # 1. Fetch user domains from cPanel VM
    print("Connecting to cPanel VM to list domains...")
    userdomains_res = client.run("cat /etc/userdomains")
    if not userdomains_res.ok:
        print(f"Failed to read /etc/userdomains: {userdomains_res.stderr}")
        sys.exit(1)

    # Parse apex domains and their cPanel users
    domain_to_user = {}
    for line in userdomains_res.stdout.strip().split("\n"):
        if not line or ":" not in line or line.startswith("*"):
            continue
        dom, user = line.split(":", 1)
        dom = dom.strip()
        user = user.strip()

        # Normalize subdomains to apex
        parts = dom.split(".")
        if len(parts) > 2:
            # Check for common multi-part TLDs (co.uk, org.uk, etc.)
            if parts[-2] in ["co", "org", "gov", "net", "edu", "me", "ac"]:
                apex = ".".join(parts[-3:])
            else:
                apex = ".".join(parts[-2:])
        else:
            apex = dom

        domain_to_user[apex] = user

    # Filter by specific domain if requested
    target_domains = list(domain_to_user.keys())
    if args.domain:
        target_domains = [d for d in target_domains if d == args.domain]
        if not target_domains:
            print(f"Domain '{args.domain}' not found in cPanel mapping.")
            sys.exit(1)

    # Unique sorted domains
    target_domains = sorted(list(set(target_domains)))
    print(f"Auditing {len(target_domains)} domains...")

    results = []

    for idx, domain in enumerate(target_domains, 1):
        user = domain_to_user[domain]
        print(f"[{idx}/{len(target_domains)}] Auditing {domain}...")

        # Get public DS records
        parent_ds = get_public_ds(domain)
        parent_has_ds = len(parent_ds) > 0
        parent_tags = {r["keytag"] for r in parent_ds}

        # Get local cPanel DNSSEC status
        local_keys = {}
        local_has_keys = False

        # Request json using --output=json
        uapi_json_res = client.run(
            f"uapi --output=json --user={user} "
            f"DNSSEC fetch_ds_records domain={domain}"
        )
        if uapi_json_res.ok:
            try:
                res_data = json.loads(uapi_json_res.stdout)
                result_obj = res_data.get("result", {})
                if result_obj.get("status") == 1:
                    data = result_obj.get("data", {}).get(domain, {})
                    local_keys = data.get("keys", {})
                    local_has_keys = len(local_keys) > 0
            except Exception as e:
                print(f"  Error parsing local cPanel DNSSEC data: {e}")

        local_tags = {str(k) for k in local_keys.keys()}

        status = "OK"
        message = ""
        action_taken = ""

        if parent_has_ds and not local_has_keys:
            status = "CRITICAL"
            message = (
                "Parent registry has DS records, but local signing is "
                "DISABLED (resolution will fail!)."
            )

            if args.fix:
                print(f"  -> Enabling local DNSSEC signing for {domain}...")
                enable_res = client.run(
                    f"uapi --user={user} DNSSEC enable_dnssec domain={domain}"
                )
                if enable_res.ok:
                    action_taken = "Auto-enabled local DNSSEC."
                    status = "FIXED"
                    print("     ✓ DNSSEC enabled.")
                else:
                    action_taken = "Failed to enable DNSSEC."
                    status = "FAILED_TO_FIX"
                    print(f"     ✗ Failed: {enable_res.stderr}")

        elif not parent_has_ds and local_has_keys:
            status = "WARNING"
            message = (
                "Local signing is enabled, but no DS records are published "
                "at the registrar."
            )

        elif parent_has_ds and local_has_keys:
            mismatch_tags = parent_tags - local_tags
            if mismatch_tags:
                status = "WARNING"
                message = (
                    f"Keytag mismatch! Parent has tags {parent_tags}, "
                    f"local has tags {local_tags}."
                )
            else:
                status = "OK"
                message = (
                    f"DNSSEC healthy. Matching parent tags: {parent_tags}."
                )
        else:
            status = "OK"
            message = "DNSSEC disabled both at parent registrar and locally."

        results.append({
            "domain": domain,
            "user": user,
            "parent_ds": [r["keytag"] for r in parent_ds],
            "local_keys": list(local_keys.keys()),
            "status": status,
            "message": message,
            "action": action_taken
        })

    # Print summary table
    print("\n" + "=" * 80)
    print(
        f"{'Domain':<25} | {'Status':<10} | "
        f"{'Parent Tags':<15} | {'Local Tags':<15}"
    )
    print("=" * 80)
    for r in results:
        p_tags = ",".join(r["parent_ds"]) if r["parent_ds"] else "None"
        l_tags = (
            ",".join(map(str, r["local_keys"])) if r["local_keys"] else "None"
        )
        print(
            f"{r['domain']:<25} | {r['status']:<10} | "
            f"{p_tags:<15} | {l_tags:<15}"
        )
        if r["message"]:
            print(f"  └─ Message: {r['message']}")
        if r["action"]:
            print(f"  └─ Action Taken: {r['action']}")
    print("=" * 80)


if __name__ == "__main__":
    main()
