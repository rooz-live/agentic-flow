#!/usr/bin/env python3
"""
Site Health Monitor for Multi-Tenant Domains
Monitors: app|billing|blog|dev|forum|starlingx.interface.tag.ooo
"""

import argparse
import json
import subprocess
import sys
import time
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Dict, List, Optional

@dataclass
class DomainHealth:
    domain: str
    dns_resolved: bool
    ssl_valid: bool
    ssl_expiry: Optional[str]
    http_status: Optional[int]
    response_time_ms: Optional[float]
    error: Optional[str]
    checked_at: str

@dataclass
class SiteHealthReport:
    domains: List[DomainHealth]
    total_healthy: int
    total_unhealthy: int
    overall_status: str
    generated_at: str

MONITORED_DOMAINS = [
    "app.interface.tag.ooo",
    "starlingx.interface.tag.ooo",
    "billing.interface.tag.ooo",
    "forum.interface.tag.ooo",
    "blog.interface.tag.ooo",
    "dev.interface.tag.ooo",
]

def check_domain_health(domain: str, timeout: int = 10) -> DomainHealth:
    """Check health of a single domain."""
    checked_at = datetime.now().isoformat()
    
    # Check DNS resolution
    try:
        result = subprocess.run(
            ["host", domain],
            capture_output=True,
            text=True,
            timeout=timeout
        )
        dns_resolved = result.returncode == 0 and "has address" in result.stdout
    except Exception as e:
        return DomainHealth(
            domain=domain,
            dns_resolved=False,
            ssl_valid=False,
            ssl_expiry=None,
            http_status=None,
            response_time_ms=None,
            error=f"DNS check failed: {str(e)}",
            checked_at=checked_at
        )
    
    if not dns_resolved:
        return DomainHealth(
            domain=domain,
            dns_resolved=False,
            ssl_valid=False,
            ssl_expiry=None,
            http_status=None,
            response_time_ms=None,
            error="DNS not resolving",
            checked_at=checked_at
        )
    
    # Check HTTP/HTTPS and SSL
    ssl_valid = False
    ssl_expiry = None
    http_status = None
    response_time_ms = None
    error = None
    
    try:
        start_time = time.time()
        result = subprocess.run(
            ["curl", "-sI", "--connect-timeout", str(timeout), f"https://{domain}"],
            capture_output=True,
            text=True,
            timeout=timeout + 5
        )
        response_time_ms = (time.time() - start_time) * 1000
        
        if "SSL certificate problem" in result.stderr:
            ssl_valid = False
            error = "SSL certificate expired or invalid"
        elif result.returncode == 0:
            ssl_valid = True
            # Parse HTTP status
            for line in result.stdout.split('\n'):
                if line.startswith('HTTP/'):
                    parts = line.split()
                    if len(parts) >= 2:
                        try:
                            http_status = int(parts[1])
                        except ValueError:
                            pass
                    break
        else:
            error = result.stderr.strip() if result.stderr else "Connection failed"
            
    except subprocess.TimeoutExpired:
        error = "Request timeout"
    except Exception as e:
        error = str(e)
    
    return DomainHealth(
        domain=domain,
        dns_resolved=dns_resolved,
        ssl_valid=ssl_valid,
        ssl_expiry=ssl_expiry,
        http_status=http_status,
        response_time_ms=round(response_time_ms, 2) if response_time_ms else None,
        error=error,
        checked_at=checked_at
    )

def check_all_domains(domains: List[str] = None) -> SiteHealthReport:
    """Check health of all monitored domains."""
    if domains is None:
        domains = MONITORED_DOMAINS
    
    results = []
    for domain in domains:
        health = check_domain_health(domain)
        results.append(health)
    
    healthy = sum(1 for r in results if r.dns_resolved and r.ssl_valid and (r.http_status is None or r.http_status < 400))
    unhealthy = len(results) - healthy
    
    overall_status = "healthy" if unhealthy == 0 else ("degraded" if healthy > unhealthy else "critical")
    
    # Pulse Cron Telemetry Output
    try:
        with open(".goalie/metrics_log.jsonl", "a") as f:
            pulse = {
                "source": "site_health_monitor",
                "signal": "HEALTH_CHECK",
                "value": healthy / len(results) if results else 0,
                "metadata": {"state": overall_status, "healthy": healthy, "unhealthy": unhealthy}
            }
            f.write(json.dumps(pulse) + "\n")
    except Exception:
        pass

    return SiteHealthReport(
        domains=results,
        total_healthy=healthy,
        total_unhealthy=unhealthy,
        overall_status=overall_status,
        generated_at=datetime.now().isoformat()
    )

def print_report(report: SiteHealthReport, json_output: bool = False):
    """Print the health report."""
    if json_output:
        print(json.dumps({
            "domains": [asdict(d) for d in report.domains],
            "total_healthy": report.total_healthy,
            "total_unhealthy": report.total_unhealthy,
            "overall_status": report.overall_status,
            "generated_at": report.generated_at
        }, indent=2))
        return
    
    status_icon = {"healthy": "✅", "degraded": "⚠️", "critical": "❌"}
    
    print(f"\n{'='*60}")
    print(f"  Site Health Report - {report.generated_at[:19]}")
    print(f"{'='*60}")
    print(f"  Overall: {status_icon.get(report.overall_status, '?')} {report.overall_status.upper()}")
    print(f"  Healthy: {report.total_healthy} | Unhealthy: {report.total_unhealthy}")
    print(f"{'='*60}\n")
    
    for d in report.domains:
        dns_icon = "✅" if d.dns_resolved else "❌"
        ssl_icon = "✅" if d.ssl_valid else "❌"
        http_icon = "✅" if d.http_status and d.http_status < 400 else ("⚠️" if d.http_status else "❌")
        
        print(f"  {d.domain}")
        print(f"    DNS: {dns_icon} | SSL: {ssl_icon} | HTTP: {http_icon} {d.http_status or 'N/A'}")
        if d.response_time_ms:
            print(f"    Response: {d.response_time_ms}ms")
        if d.error:
            print(f"    Error: {d.error}")
        print()

def save_report(report: SiteHealthReport, output_path: str):
    """Save report to file."""
    data = {
        "domains": [asdict(d) for d in report.domains],
        "total_healthy": report.total_healthy,
        "total_unhealthy": report.total_unhealthy,
        "overall_status": report.overall_status,
        "generated_at": report.generated_at
    }
    with open(output_path, 'w') as f:
        json.dump(data, f, indent=2)

def main():
    parser = argparse.ArgumentParser(description="Site Health Monitor for Multi-Tenant Domains")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--domains", nargs="+", help="Specific domains to check")
    parser.add_argument("--save", type=str, help="Save report to file")
    parser.add_argument("--watch", action="store_true", help="Continuous monitoring mode")
    parser.add_argument("--interval", type=int, default=60, help="Watch interval in seconds")
    
    args = parser.parse_args()
    
    domains = args.domains if args.domains else MONITORED_DOMAINS
    
    if args.watch:
        print("Starting continuous monitoring (Ctrl+C to stop)...")
        while True:
            report = check_all_domains(domains)
            print_report(report, args.json)
            if args.save:
                save_report(report, args.save)
            time.sleep(args.interval)
    else:
        report = check_all_domains(domains)
        print_report(report, args.json)
        if args.save:
            save_report(report, args.save)
        
        # Exit with error code if unhealthy
        sys.exit(0 if report.overall_status == "healthy" else 1)

if __name__ == "__main__":
    main()
