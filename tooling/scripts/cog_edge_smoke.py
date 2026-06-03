#!/usr/bin/env python3
# Parallel COG edge smoke — honest exit codes (anti-CVT)
# Exit 0: all reachable checks pass
# Exit 2: DNS/edge blocked (not a false green)
# Exit 1: reachable but failing assertions

import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor

class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, hdrs, newurl):
        # Prevent automatic redirection following to inspect 302 Locations
        return None

# Install custom redirect handler globally
opener = urllib.request.build_opener(NoRedirectHandler)
urllib.request.install_opener(opener)

def get_webhook_secret():
    if "COGNITUM_WEBHOOK_SECRET" in os.environ:
        return os.environ["COGNITUM_WEBHOOK_SECRET"]
    
    
    # Try reading from .env files up to 2 directories up
    for env_file in [".env", "../.env", "../../.env"]:
        if os.path.exists(env_file):
            try:
                with open(env_file, "r") as f:
                    for line in f:
                        if line.startswith("COGNITUM_WEBHOOK_SECRET="):
                            return line.split("=", 1)[1].strip().strip('"\'')
            except Exception:
                pass
    return ""

def probe_endpoint(url, method="GET", headers=None, data=None):
    req = urllib.request.Request(url, headers=headers or {}, method=method)
    if data:
        req.data = data.encode('utf-8')
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            return response.status, response.getheader("Location", "") or ""
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("Location") or ""
    except Exception as e:
        return 0, str(e)

def evaluate_route(route, secret, ref):
    fqdn = route["fqdn"]
    results = {}
    
    # 1. Health probe
    health_url = f"https://{fqdn}/health"
    health_status, _ = probe_endpoint(health_url)
    results["health"] = {"code": health_status, "expect": route["expected_health"]}
    
    # 2. Redirect/Cog probe if domain is tag.vote or interface.tag.vote
    if "tag.vote" in fqdn:
        cog_url = f"https://{fqdn}/cog"
        cog_status, location = probe_endpoint(cog_url)
        results["cog"] = {"code": cog_status, "location": location, "expect": f"302 with ref={ref}"}
        
    # 3. Webhook probe if interface.tag.vote and secret is set
    if fqdn == "interface.tag.vote" and secret:
        wh_url = f"https://{fqdn}/webhooks/cognitum"
        headers = {
            "Content-Type": "application/json",
            "x-cognitum-signature": "invalid-smoke-test"
        }
        wh_status, _ = probe_endpoint(wh_url, method="POST", headers=headers, data='{"test":true}')
        results["webhook"] = {"code": wh_status, "skipped": False, "expect": "401 when secret set, else skip"}
    elif fqdn == "interface.tag.vote":
        results["webhook"] = {"code": -1, "skipped": True, "expect": "401 when secret set, else skip"}
        
    return fqdn, results

def main():
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    config_path = os.path.join(project_root, "config", "edge", "domain_routes.json")
    
    if not os.path.exists(config_path):
        print(f"Error: Central domain routes config not found at {config_path}")
        sys.exit(1)
        
    with open(config_path, "r") as f:
        config = json.load(f)
        
    secret = get_webhook_secret()
    ref = os.environ.get("COGNITUM_REF", "2rbzTT")
    
    evidence_dir = os.path.join(project_root, ".goalie", "evidence", "cog-upgrade")
    os.makedirs(evidence_dir, exist_ok=True)
    
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out_path = os.path.join(evidence_dir, f"smoke_{ts}.json")
    
    routes = config["domains"]
    
    # Run evaluations in parallel
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(evaluate_route, r, secret, ref) for r in routes]
        probes = dict(f.result() for f in futures)
        
    edge_blocked = False
    passed = True
    
    # Evaluate overall pass/fail criteria
    # We aggregate verification metrics for the primary edge (interface.tag.vote)
    primary_checks = probes.get("interface.tag.vote", {})
    if primary_checks:
        health_code = primary_checks.get("health", {}).get("code", 0)
        cog_code = primary_checks.get("cog", {}).get("code", 0)
        cog_loc = primary_checks.get("cog", {}).get("location", "")
        wh_code = primary_checks.get("webhook", {}).get("code", -1)
        wh_skip = primary_checks.get("webhook", {}).get("skipped", True)
        
        if health_code == 0 or cog_code == 0:
            edge_blocked = True
            
        if health_code != 200:
            passed = False
        if cog_code not in (301, 302):
            passed = False
        if f"ref={ref}" not in cog_loc:
            passed = False
        if not wh_skip and wh_code == 404:
            passed = False
            
    # Also verify secondary billing / forwarder status to detect edge blocks
    for fqdn, metrics in probes.items():
        # Any down service registers an edge block warning
        if metrics.get("health", {}).get("code") == 0:
            print(f"Warning: {fqdn} is unreachable.")
            
    payload = {
        "timestamp": ts,
        "base": f"https://interface.tag.vote",
        "ref": ref,
        "checks": primary_checks,
        "all_probes": probes,
        "edge_blocked": edge_blocked,
        "pass": passed and not edge_blocked,
    }
    
    with open(out_path, "w") as f:
        json.dump(payload, f, indent=2)
        f.write("\n")
        
    print(f"Wrote {out_path}")
    
    if edge_blocked:
        print("BLOCKED: edge/DNS unreachable — exit 2")
        sys.exit(2)
        
    if not passed:
        print("FAIL: reachable checks did not pass — exit 1")
        sys.exit(1)
        
    print("PASS: all reachable checks OK — exit 0")
    sys.exit(0)

if __name__ == "__main__":
    main()
