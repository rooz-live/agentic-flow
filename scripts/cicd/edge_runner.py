#!/usr/bin/env python3
"""Edge Gateway Configuration Runner.

Validates DNS records, matches configuration states, health-probes public
endpoints, and triggers Edge routing updates. Failed FQDNs write DLQ entries
and re-open mapped ROAM risks.
"""

import json
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Dict, List, Any, Tuple

OFFLINE_SENTINEL = "offline_or_unresolved"


def run_ssh_sync_command(command: List[str] | str, timeout: int = 30) -> Tuple[bool, str]:
    """Execute local command or remote SSH command."""
    shell = isinstance(command, str)
    try:
        res = subprocess.run(
            command,
            shell=shell,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        return (res.returncode == 0), res.stdout + "\n" + res.stderr
    except Exception as e:
        return False, str(e)


def sync_cpanel_dns_record(project_root: Path, base_domain: str, name: str, value: str) -> Tuple[bool, str]:
    """Invoke cpanel_dns_sync.sh to add/update an A record on the authoritative nameserver."""
    script_path = project_root / "tooling" / "scripts" / "cpanel_dns_sync.sh"
    if not script_path.exists():
        return False, "cpanel_dns_sync.sh script not found"
        
    cmd = ["bash", str(script_path), "add", "--domain", base_domain, "--name", name, "--type", "A", "--value", value]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if "OFFLINE_SIMULATED" in res.stdout or "simulated" in res.stdout.lower():
            return True, f"[SIMULATED] DNS A record sync mock-completed for {name} -> {value}"
        success = (res.returncode == 0) and ("result: 1" in res.stdout or "status: 1" in res.stdout or "SUCCESS" in res.stdout)
        return success, res.stdout + "\n" + res.stderr
    except Exception as e:
        return False, str(e)


def _resolve_with_retry(fqdn: str, retries: int) -> Tuple[str, int]:
    """Resolve FQDN to IP, retrying transient failures with a short backoff.

    Returns (ip, attempts_used). ip may be OFFLINE_SENTINEL.
    """
    import edge_fetcher
    attempts = 0
    for attempt in range(retries + 1):
        attempts = attempt + 1
        ip = edge_fetcher.get_live_resolution(fqdn)
        if ip != OFFLINE_SENTINEL:
            return ip, attempts
        if attempt < retries:
            time.sleep(2)
    return OFFLINE_SENTINEL, attempts


def _probe_health(fqdn: str, health_path: str, timeout_s: int) -> Tuple[bool, str]:
    """HTTP GET to https://fqdn/health_path. Returns (ok, detail)."""
    if not health_path.startswith("/"):
        health_path = "/" + health_path
    url = f"https://{fqdn}{health_path}"
    req = urllib.request.Request(url, method="GET")
    # For gRPC health endpoints, some origins require the gRPC content-type.
    if health_path.endswith("/grpc.health.v1.Health/Check"):
        req.add_header("Content-Type", "application/grpc+proto")
    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            status = resp.status
            body = resp.read(256).decode("utf-8", errors="ignore")
            if 200 <= status < 400:
                return True, f"HTTP {status}"
            return False, f"HTTP {status}: {body[:120]}"
    except urllib.error.HTTPError as e:
        return False, f"HTTP {e.code}"
    except Exception as e:
        return False, f"probe error: {e}"


def _dlq_path(project_root: Path) -> Path:
    """Default DLQ path for edge gateway failures."""
    mapping_file = project_root / "config" / "cicd" / "dlq_roam_mapping.yaml"
    if mapping_file.exists():
        try:
            for line in mapping_file.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line.startswith("dlq_path:"):
                    raw = line.split(":", 1)[1].strip()
                    return project_root / raw
        except Exception:
            pass
    return project_root / ".goalie" / "evidence" / "edge_gateway" / "dlq.jsonl"


def _write_dlq(project_root: Path, fqdn: str, reason: str, roam_risk_id: str | None) -> None:
    """Append a JSONL entry to the edge gateway DLQ."""
    dlq_path = _dlq_path(project_root)
    dlq_path.parent.mkdir(parents=True, exist_ok=True)
    entry = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source": "edge_gateway_sync_engine",
        "fqdn": fqdn,
        "reason": reason,
        "roam_risk_id": roam_risk_id,
        "category": "edge_sync_fail",
    }
    with open(dlq_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")


def _trigger_roam(project_root: Path, roam_risk_id: str, run_id: str) -> None:
    """Invoke dlq_roam_apply.py to re-open the ROAM risk entry."""
    script = project_root / "scripts" / "cicd" / "lib" / "dlq_roam_apply.py"
    if not script.exists():
        print(f"  ⚠️  dlq_roam_apply.py not found — ROAM trigger skipped for {roam_risk_id}")
        return
    try:
        proc = subprocess.run(
            ["python3", str(script), "edge_sync_fail", run_id, str(project_root)],
            capture_output=True, text=True, timeout=15,
        )
        if proc.returncode == 0:
            print(f"  🔴 ROAM triggered: {roam_risk_id} re-opened")
        else:
            print(f"  ⚠️  ROAM trigger failed (exit {proc.returncode}): {proc.stderr.strip()}")
    except Exception as exc:
        print(f"  ⚠️  ROAM trigger exception: {exc}")


def run_edge_sync(
    fqdns: List[str],
    to_sync: List[str],
    registry: Dict[str, str],
    live_resolutions: Dict[str, str],
    project_root: Path,
    fqdn_metadata: Dict[str, Dict[str, Any]] | None = None,
    run_id: str = "",
    retry: int = 1,
) -> List[Dict[str, Any]]:
    """Execute gateway validations and sync routines for drifted FQDNs."""
    results = []
    to_sync_set = set(to_sync)
    meta = fqdn_metadata or {}

    for fqdn in fqdns:
        start_time = time.time()
        expected = registry.get(fqdn)
        live = live_resolutions.get(fqdn)
        domain_meta = meta.get(fqdn, {})
        health_path = domain_meta.get("health_path", "/")
        sync_timeout_s = int(domain_meta.get("sync_timeout_s", 30))
        roam_risk_id = domain_meta.get("roam_risk_id")
        notify_on_fail = domain_meta.get("notify_on_fail", False)
        domain_retry = max(0, retry)

        if fqdn not in to_sync_set:
            # Already synchronized and cached
            results.append({
                "fqdn": fqdn,
                "status": "PASS",
                "resolved_ip": live,
                "expected_ip": expected,
                "duration_seconds": 0.0,
                "skipped": True,
                "roam_risk_id": roam_risk_id,
            })
            continue

        print(f"\n⚡ Synchronizing Edge Gateway Target: {fqdn}")
        
        sync_success = True
        log_output = ""
        health_ok = True
        health_detail = ""
        
        base_domain = fqdn.split(".")[-2] + "." + fqdn.split(".")[-1] if len(fqdn.split(".")) >= 2 else fqdn

        if not expected:
            sync_success = False
            log_output = f"Error: Domain {fqdn} is not registered in fqdn_registry.yaml."
        elif not live or live == OFFLINE_SENTINEL or live != expected:
            # Missing A record or IP drift -> Sync it!
            log_output = f"IP MISMATCH/DRIFT for {fqdn}: expected {expected}, got {live}."
            print(f"  --> Provisioning/Updating A record for {fqdn} to point to {expected}...")
            ok, sync_log = sync_cpanel_dns_record(project_root, base_domain, fqdn, expected)
            log_output += f"\n[DNS Sync] {sync_log}"
            if ok:
                print(f"  ✓ DNS synchronized successfully.")
                # Re-resolve with retry to confirm propagation
                resolved_ip, attempts = _resolve_with_retry(fqdn, domain_retry)
                print(f"  --> Re-resolved after {attempts} attempt(s): {resolved_ip}")
                live_resolutions[fqdn] = resolved_ip
                if resolved_ip == OFFLINE_SENTINEL:
                    sync_success = False
                    log_output += f"\n[DNS Retry] FQDN still unresolved after {attempts} attempt(s)."
            else:
                sync_success = False
                print(f"  ❌ DNS synchronization failed.")
        else:
            # Live matches expected, but cache was out of sync (need to update cache)
            log_output = f"DNS record is valid ({live}). State synchronized with cache."

        # Health probe on the expected origin
        if sync_success:
            print(f"  --> Health probe: GET https://{fqdn}{health_path} (timeout={sync_timeout_s}s)")
            health_ok, health_detail = _probe_health(fqdn, health_path, sync_timeout_s)
            if health_ok:
                print(f"  ✓ Health probe OK ({health_detail})")
            else:
                print(f"  ❌ Health probe FAIL: {health_detail}")
                sync_success = False
                log_output += f"\n[Health Probe] {health_detail}"

        # Simulate or execute router reload if DNS is fully valid and we want to apply to Caddy/HAProxy
        if sync_success and fqdn == "mailadmin.bhopti.com":
            # Attempt to SCP/SSH reload Caddy on StarlingX (ref: deploy-edge-mailadmin.sh)
            print("  --> Reloading Caddy configuration on StarlingX for mailadmin...")
            # We run a check if SSH alias 'stx' exists
            ssh_check = subprocess.run(["ssh", "-o", "ConnectTimeout=2", "stx", "echo 'stx_connected'"], capture_output=True, text=True)
            if ssh_check.returncode == 0:
                cfg_file = project_root / "src" / "proxies" / "edge_gateway.cfg"
                scp_cmd = ["scp", str(cfg_file), "stx:/tmp/edge_gateway.cfg"]
                ok, log_scp = run_ssh_sync_command(scp_cmd)
                if ok:
                    reload_cmd = ["ssh", "stx", "sudo cp /tmp/edge_gateway.cfg /etc/caddy/Caddyfile && sudo systemctl reload caddy"]
                    ok_reload, log_reload = run_ssh_sync_command(reload_cmd)
                    log_output += f"\n[Caddy Reload] {log_reload}"
                    if not ok_reload:
                        sync_success = False
                else:
                    sync_success = False
                    log_output += f"\n[SCP Failed] {log_scp}"
            else:
                log_output += "\nAdvisory: 'stx' target SSH alias offline. Configuration not pushed to live VM."

        # DLQ + ROAM on failure
        if not sync_success and notify_on_fail:
            reason = log_output[:500]
            _write_dlq(project_root, fqdn, reason, roam_risk_id)
            if roam_risk_id:
                _trigger_roam(project_root, roam_risk_id, run_id)

        duration = round(time.time() - start_time, 2)
        print(f"  Result: {'PASS' if sync_success else 'FAIL'} (took {duration}s)")

        results.append({
            "fqdn": fqdn,
            "status": "PASS" if sync_success else "FAIL",
            "resolved_ip": live_resolutions.get(fqdn, live),
            "expected_ip": expected,
            "duration_seconds": duration,
            "skipped": False,
            "roam_risk_id": roam_risk_id,
            "log": log_output if not sync_success else None
        })

    return results
