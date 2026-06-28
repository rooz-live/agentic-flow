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
    import hashlib
    # 1. Load edge state cache and compute edge_gateway.cfg hash drift at the beginning
    cache_path = project_root / ".goalie" / "evidence" / "edge_gateway" / "last_known_state.json"
    cache = {}
    if cache_path.exists():
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                cache = json.load(f)
        except Exception:
            pass

    cfg_path = project_root / "src" / "proxies" / "edge_gateway.cfg"
    current_hash = "unknown"
    if cfg_path.exists():
        try:
            current_hash = hashlib.sha256(cfg_path.read_bytes()).hexdigest()
        except Exception:
            pass

    cached_hash = cache.get("_cfg_hash")
    config_changed = (current_hash != "unknown" and current_hash != cached_hash)

    results = []
    to_sync_set = set(to_sync)
    meta = fqdn_metadata or {}
    any_sync_succeeded = False

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

        if sync_success:
            any_sync_succeeded = True

        # DLQ + ROAM on failure (inside loop, handles pre-reload failures)
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

    # 2. Run Caddy configuration reload on StarlingX ONCE at the end of the validation run
    #    if the config changed or if any domain synchronization succeeded.
    reload_failed = False
    reload_error = None
    if config_changed or any_sync_succeeded:
        print("  --> Reloading Caddy configuration on StarlingX...")
        import os
        use_alias = False
        try:
            ssh_alias_check = subprocess.run(["ssh", "-o", "ConnectTimeout=2", "stx", "echo 'stx_connected'"], capture_output=True, text=True)
            if ssh_alias_check.returncode == 0:
                use_alias = True
        except Exception:
            pass

        if use_alias:
            host_str = "stx"
            scp_args = ["scp", "-o", "ConnectTimeout=5", str(project_root / "src" / "proxies" / "edge_gateway.cfg"), "stx:/tmp/edge_gateway.cfg"]
            ssh_base = ["ssh", "stx"]
        else:
            stx_host = os.environ.get("STX_HOST", "ubuntu@stx-aio-0.corp.interface.tag.ooo")
            stx_key = os.environ.get("STX_KEY")
            if not stx_key:
                home = Path.home()
                candidate_keys = [
                    home / ".ssh" / "starlingx_key",
                    home / "pem" / "rooz.pem",
                ]
                for ck in candidate_keys:
                    if ck.exists():
                        stx_key = str(ck)
                        break
            stx_port = os.environ.get("YOLIFE_CPANEL_PORTS", "2222")
            
            scp_args = ["scp", "-P", stx_port]
            ssh_base = ["ssh", "-p", stx_port]
            if stx_key:
                scp_args.extend(["-i", stx_key])
                ssh_base.extend(["-i", stx_key])
            scp_args.extend(["-o", "ConnectTimeout=5", "-o", "StrictHostKeyChecking=accept-new", str(project_root / "src" / "proxies" / "edge_gateway.cfg"), f"{stx_host}:/tmp/edge_gateway.cfg"])
            ssh_base.extend(["-o", "ConnectTimeout=5", "-o", "StrictHostKeyChecking=accept-new", stx_host])
            host_str = f"{stx_host} (port={stx_port})"

        print(f"  --> Connecting to {host_str}...")
        test_cmd = list(ssh_base)
        test_cmd.append("echo 'connected'")
        conn_check = subprocess.run(test_cmd, capture_output=True, text=True)
        
        if conn_check.returncode == 0:
            print(f"  --> SCP-ing config to {host_str}...")
            ok, log_scp = run_ssh_sync_command(scp_args)
            if ok:
                reload_cmd = list(ssh_base)
                reload_cmd.append("sudo cp /tmp/edge_gateway.cfg /etc/caddy/Caddyfile && sudo caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy")
                print("  --> Validating and reloading Caddy...")
                ok_reload, log_reload = run_ssh_sync_command(reload_cmd)
                if not ok_reload:
                    reload_failed = True
                    reload_error = f"[Caddy Reload Failed] {log_reload}"
                else:
                    print("  ✓ Caddy configuration reloaded successfully on StarlingX.")
            else:
                reload_failed = True
                reload_error = f"[SCP Failed] {log_scp}"
        else:
            reload_error = f"Advisory: Target host {host_str} is offline or SSH connection failed."

    # 3. Flag errors in domains' results if reload fails
    if reload_error:
        for res in results:
            if not res.get("skipped", False):
                if reload_failed:
                    res["status"] = "FAIL"
                res_log = res.get("log") or ""
                res["log"] = (res_log + "\n" + reload_error).strip()

    return results
