#!/usr/bin/env python3
"""Edge Gateway Configuration Fetcher.

Parses edge proxy configurations, expected registry mappings, and live DNS states.
"""

import re
import json
import socket
import subprocess
from pathlib import Path
from typing import Dict, List, Tuple, Any

OFFLINE_SENTINEL = "offline_or_unresolved"


def parse_edge_cfg(cfg_path: Path) -> List[str]:
    """Parse vhosts (FQDNs) from the Caddy-style configuration file."""
    if not cfg_path.exists():
        return []
    
    with open(cfg_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Strip comment lines
    lines = [l for l in content.splitlines() if not l.strip().startswith('#')]
    fqdns = []
    
    for line in lines:
        line = line.strip()
        # Look for domain declarations ending optionally with { or ,
        if re.search(r'[a-z0-9][\w.-]+\.[a-z]{2,}\s*\{?$', line, re.I):
            line = line.rstrip('{').strip()
            for part in line.split(','):
                part = part.strip()
                # Filter out port numbers or local addresses, keep valid domain format
                if re.match(r'^[a-zA-Z0-9][\w.-]+\.[a-zA-Z]{2,}$', part):
                    fqdns.append(part.lower())
                    
    # Return unique domains keeping order
    seen = set()
    return [f for f in fqdns if not (f in seen or seen.add(f))]


def load_fqdn_metadata(registry_path: Path) -> Dict[str, Dict[str, Any]]:
    """Parse fqdn_registry.yaml into per-FQDN metadata dict.

    Captures: origin, health_path, sync_timeout_s, roam_risk_id, notify_on_fail.
    """
    if not registry_path.exists():
        return {}

    metadata: Dict[str, Dict[str, Any]] = {}
    current: str | None = None
    for line in registry_path.read_text(encoding="utf-8").splitlines():
        s = line.strip()
        if s.startswith('- fqdn:'):
            current = s.split(':', 1)[1].strip().strip('"').strip("'").lower()
            metadata[current] = {
                "origin": None,
                "health_path": "/",
                "sync_timeout_s": 30,
                "roam_risk_id": None,
                "notify_on_fail": False,
            }
        elif current and ':' in s and not s.startswith('-'):
            key, val = s.split(':', 1)
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            if key == 'origin':
                metadata[current]["origin"] = val
            elif key == 'health_path':
                metadata[current]["health_path"] = val
            elif key == 'sync_timeout_s':
                try:
                    metadata[current]["sync_timeout_s"] = int(val)
                except ValueError:
                    pass
            elif key == 'roam_risk_id':
                metadata[current]["roam_risk_id"] = val if val.lower() != 'null' else None
            elif key == 'notify_on_fail':
                metadata[current]["notify_on_fail"] = val.lower() in ('true', 'yes', '1')
    return metadata


def load_fqdn_registry(registry_path: Path) -> Dict[str, str]:
    """Simple origin-only mapping for backward compatibility."""
    metadata = load_fqdn_metadata(registry_path)
    return {
        fqdn: meta["origin"]
        for fqdn, meta in metadata.items()
        if meta.get("origin") and not meta["origin"].startswith('${')
    }


def get_live_resolution(fqdn: str) -> str:
    """Fetch live A record IP address for the FQDN using dig or socket lookup."""
    try:
        # Use dig for strict A-record check
        cmd = ["dig", "+short", fqdn, "A"]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        output = result.stdout.strip()
        if output:
            # Take the first line (first resolved IP)
            lines = [l.strip() for l in output.splitlines() if l.strip()]
            for line in lines:
                # Basic IP validation
                if re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', line):
                    return line
    except Exception:
        pass

    # Fallback to standard DNS resolver
    try:
        return socket.gethostbyname(fqdn)
    except Exception:
        return OFFLINE_SENTINEL


def load_edge_state_cache(cache_path: Path) -> Dict[str, str]:
    """Load the last known synchronized state cache."""
    if cache_path.exists():
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return data
        except Exception:
            pass
    return {}


def parse_whmapi_dumpzone(text: str) -> List[Dict[str, Any]]:
    """Parse raw whmapi1 dumpzone output into list of records."""
    records = []
    current = {}
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith("-") or (line.startswith("record:") and current):
            if current:
                records.append(current)
                current = {}
            line = line.lstrip("-").strip()
            
        if ":" in line:
            k, v = line.split(":", 1)
            k = k.strip().lower()
            v = v.strip().strip('"').strip("'")
            if k in ("line", "ttl"):
                try:
                    current[k] = int(v)
                except ValueError:
                    current[k] = v
            else:
                current[k] = v
    if current:
        records.append(current)
    return records


def get_base_domain(fqdn: str) -> str:
    """Extract base domain from FQDN (e.g. api.interface.tag.ooo -> tag.ooo)."""
    parts = fqdn.split(".")
    if len(parts) >= 2:
        return ".".join(parts[-2:])
    return fqdn


def fetch_cpanel_zone_records(project_root: Path, base_domain: str) -> List[Dict[str, Any]]:
    """Fetch DNS zone records from authoritative cPanel server for a base domain."""
    script_path = project_root / "tooling" / "scripts" / "cpanel_dns_sync.sh"
    if not script_path.exists():
        return []
    
    cmd = ["bash", str(script_path), "list", "--domain", base_domain]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if res.returncode == 0:
            if "OFFLINE_SIMULATED" in res.stdout or "simulated" in res.stdout.lower():
                return []
            return parse_whmapi_dumpzone(res.stdout)
    except Exception as e:
        print(f"  ⚠️  Error fetching cPanel zone records for {base_domain}: {e}")
    return []


def fetch_edge_status(project_root: Path) -> Tuple[List[str], Dict[str, str], Dict[str, str], Dict[str, str], List[str], Dict[str, Dict[str, Any]]]:
    """Parse configuration files, resolve live DNS, and determine synchronization delta queue.

    Returns:
        (fqdns, registry, live_resolutions, cache, to_sync, fqdn_metadata)
    """
    cfg_path = project_root / "src" / "proxies" / "edge_gateway.cfg"
    registry_path = project_root / "config" / "fqdn_registry.yaml"
    cache_path = project_root / ".goalie" / "evidence" / "edge_gateway" / "last_known_state.json"

    fqdns = parse_edge_cfg(cfg_path)
    fqdn_metadata = load_fqdn_metadata(registry_path)
    registry = {fqdn: meta["origin"] for fqdn, meta in fqdn_metadata.items()
                if meta.get("origin") and not meta["origin"].startswith('${')}
    cache = load_edge_state_cache(cache_path)
    
    live_resolutions = {}
    to_sync = []

    print("🔍 Fetching live DNS status for edge gateway domains...")
    
    # Pre-fetch zone records for unique base domains to optimize network roundtrips
    unique_bases = {get_base_domain(f) for f in fqdns}
    zone_cache = {}
    for base in unique_bases:
        zone_cache[base] = fetch_cpanel_zone_records(project_root, base)

    for fqdn in fqdns:
        # Check standard resolution first
        live_ip = get_live_resolution(fqdn)
        
        # Check if the authoritative cPanel DNS zone has this record
        base_domain = get_base_domain(fqdn)
        zone_records = zone_cache.get(base_domain, [])
        zone_ip = None
        for r in zone_records:
            name_clean = r.get("name", "").rstrip(".").lower()
            if name_clean == fqdn and r.get("type") == "A":
                zone_ip = r.get("address")
                break
                
        # Authoritative nameserver IP takes precedence over standard DNS
        if zone_ip:
            live_ip = zone_ip
            
        live_resolutions[fqdn] = live_ip
        
        expected_ip = registry.get(fqdn)
        cached_ip = cache.get(fqdn)

        if live_ip == OFFLINE_SENTINEL:
            if cached_ip:
                print(f"  🌐 {fqdn}: DNS unresolved. Using cached IP: {cached_ip}")
                live_resolutions[fqdn] = cached_ip
            else:
                print(f"  🌐 {fqdn}: DNS unresolved, no cache. Queued for sync.")
                to_sync.append(fqdn)
        elif live_ip != expected_ip:
            print(f"  🌐 {fqdn}: Drift detected! Live IP: {live_ip} (expected origin: {expected_ip or 'none'}). Queued.")
            to_sync.append(fqdn)
        elif cached_ip != live_ip:
            print(f"  🌐 {fqdn}: Up to date but cache is stale (staged). Queued.")
            to_sync.append(fqdn)
        else:
            print(f"  🌐 {fqdn}: DNS matches registry and cache: {live_ip}. Skipped.")

    return fqdns, registry, live_resolutions, cache, to_sync, fqdn_metadata
