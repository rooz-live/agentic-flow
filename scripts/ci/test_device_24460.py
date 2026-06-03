#!/usr/bin/env python3
"""Test device #24460 (hv2b40b82 / stx-aio-0.corp.interface.tag.ooo / 23.92.79.2) connectivity."""

import asyncio
import json
import sys
import os
from pathlib import Path

sys.path.insert(0, ".")
from risk_analytics.device_diagnostics import DeviceDiagnostics


async def main():
    """Run diagnostics on device #24460."""
    print("=" * 70)
    print("Device #24460 Diagnostics")
    print("=" * 70)
    print()

    # Device configuration
    device_id = "24460"
    hostname = "stx-aio-0.corp.interface.tag.ooo"
    ip_address = "23.92.79.2"
    ipmi_host = "hv2b40b82"
    ssh_key = os.path.expanduser("~/.ssh/device_24460")

    print(f"Device ID:        {device_id}")
    print(f"Hostname:         {hostname}")
    print(f"IP Address:       {ip_address}")
    print(f"IPMI Host:        {ipmi_host}")
    print(f"SSH Key:          {ssh_key}")
    print(f"SSH Key Exists:   {Path(ssh_key).exists()}")
    print()

    # Run diagnostics
    print("Running diagnostics...")
    print("-" * 70)

    diag = DeviceDiagnostics(
        device_id=device_id,
        hostname=ip_address,  # Use IP for SSH
        ipmi_host=ipmi_host,
        ssh_key=ssh_key,
        ssh_user="ubuntu",
    )

    results = await diag.run_all_diagnostics()

    # Display results
    print()
    print("Diagnostic Results:")
    print("-" * 70)

    for check_name, result in results.items():
        status = "✓ PASS" if result.passed else "✗ FAIL"
        print(f"{status} | {check_name:25} | {result.latency_ms:7.1f}ms")
        print(f"       Message: {result.message}")
        if result.remediation:
            print(f"       Remediation: {result.remediation}")
        print()

    # Generate summary
    summary = diag.summarize(results)

    print("Summary:")
    print("-" * 70)
    print(f"Device ID:        {summary['device_id']}")
    print(f"Health Score:     {summary['health_score']:.1f}%")
    print(f"Passed:           {summary['passed']}/{summary['total']}")
    print()

    if summary["remediations"]:
        print("Recommended Actions:")
        for i, remediation in enumerate(summary["remediations"], 1):
            print(f"  {i}. {remediation}")
        print()

    # Save report
    report_file = ".device_24460_diagnostics.json"
    with open(report_file, "w") as f:
        json.dump(summary, f, indent=2)

    print(f"Report saved to: {report_file}")
    print()

    # Determine severity
    if summary["health_score"] >= 75:
        severity = "P0 (Critical)"
    elif summary["health_score"] >= 50:
        severity = "P1 (High)"
    elif summary["health_score"] >= 25:
        severity = "P2 (Medium)"
    else:
        severity = "P3 (Low)"

    print(f"Risk Severity:    {severity}")
    print("=" * 70)

    return 0 if summary["health_score"] >= 50 else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)

