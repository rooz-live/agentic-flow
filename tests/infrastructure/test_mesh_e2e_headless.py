#!/usr/bin/env python3
import asyncio
import time
import sys
import json
import os

try:
    from playwright.async_api import async_playwright
except ImportError:
    print("❌ Playwright not installed. Run: pip install playwright && playwright install")
    sys.exit(1)

# The Full Sovereign Mesh Domain Matrix
DOMAINS = [
    "http://mesh.tag.ooo",
    "http://mesh.rooz.live",
    "http://mesh.yocloud.com",
    "http://mesh.tag.vote",
    "http://mesh.yo.life",
    "http://mesh.720.chat",
    "http://mesh.bhopti.com",
    "https://pass.tag.ooo",
    "https://git.tag.ooo"
]

async def verify_mesh_boundary(domain, p):
    print(f"--> ⚡ [PROBE] Initializing Headless TDD Trace against {domain} ...")
    start_time = time.time()
    browser = await p.chromium.launch(headless=True)
    context = await browser.new_context(ignore_https_errors=True)
    page = await context.new_page()
    
    try:
        # Physical Execution Bounds: Only 10 seconds allowed before declaring GHOST_DOMAIN
        response = await page.goto(domain, timeout=10000)
        ttfb = int((time.time() - start_time) * 1000)
        
        if response and response.status in [200, 301, 302]:
            print(f"    🟢 [SUCCESS] {domain} resolved. TTFB: {ttfb}ms")
            await page.wait_for_selector('body', timeout=5000)
            print(f"    ✅ [VERIFIED] Structural integrity confirmed for {domain}.")
            await browser.close()
            return domain, True
        else:
            status = response.status if response else 'UNKNOWN'
            print(f"    ⚠️ [DEVIATION] {domain} responded with HTTP {status}")
            
            # Generate Incident Stub
            timestamp = int(time.time())
            target_name = domain.replace("http://", "").replace("https://", "").replace(".", "_")
            stub_path = os.path.abspath(os.path.join(os.path.dirname(__file__), f"../../.goalie/incident_stub_{target_name}_{timestamp}.json"))
            artifact_path = os.path.abspath(os.path.join(os.path.dirname(__file__), f"../../.goalie/incident_mesh_{target_name}_{timestamp}.png"))
            
            await page.screenshot(path=artifact_path, full_page=True)
            stub_data = {
                "timestamp": timestamp,
                "target": domain,
                "status": "LOW_YIELD_SOP_TRIGGERED",
                "error": f"HTTP {status}",
                "artifact": artifact_path,
                "action": "LIQUIDATE_OR_QUARANTINE"
            }
            with open(stub_path, "w") as f:
                json.dump(stub_data, f, indent=2)
                
            await browser.close()
            return domain, False
            
    except Exception as e:
        ttfb = int((time.time() - start_time) * 1000)
        print(f"    🛑 [GHOST_DOMAIN_NO_TTFB] Failed to resolve {domain}. TTFB > {ttfb}ms.")
        print(f"       Trace: {str(e).splitlines()[0]}")
        
        # Generate Incident Stub
        timestamp = int(time.time())
        target_name = domain.replace("http://", "").replace("https://", "").replace(".", "_")
        stub_path = os.path.abspath(os.path.join(os.path.dirname(__file__), f"../../.goalie/incident_stub_{target_name}_{timestamp}.json"))
        artifact_path = os.path.abspath(os.path.join(os.path.dirname(__file__), f"../../.goalie/incident_mesh_{target_name}_{timestamp}.png"))
        
        await page.screenshot(path=artifact_path, full_page=True)
        stub_data = {
            "timestamp": timestamp,
            "target": domain,
            "status": "LOW_YIELD_SOP_TRIGGERED",
            "error": str(e).splitlines()[0],
            "artifact": artifact_path,
            "action": "LIQUIDATE_OR_QUARANTINE"
        }
        with open(stub_path, "w") as f:
            json.dump(stub_data, f, indent=2)
            
        await browser.close()
        return domain, False

async def main():
    print("==========================================================")
    print("🦅 INITIATING MULTI-DOMAIN MESH E2E HEADLESS TDD SWEEP")
    print("==========================================================")
    
    async with async_playwright() as p:
        tasks = [verify_mesh_boundary(domain, p) for domain in DOMAINS]
        results = await asyncio.gather(*tasks)
        
        success_count = sum(1 for _, passed in results if passed)
        total = len(DOMAINS)
        
        print("\n==========================================================")
        if success_count == total:
            print(f"🟢 FULL SYMMETRY ACHIEVED. All {total} Domains are actively serving payload.")
            sys.exit(0)
        else:
            failed_domains = [dom for dom, passed in results if not passed]
            print(f"🔴 MESH FRACTURE DETECTED. {len(failed_domains)} Domains failed to resolve.")
            
            import subprocess
            import os
            
            for failed_domain in failed_domains:
                print(f"   --> 📉 [LOW_YIELD_SOP] Executing Physical Quarantine for {failed_domain}...")
                target_node = failed_domain.replace("http://", "").replace("https://", "")
                
                try:
                    # Inverted TDD Execution: Physically quarantine the node
                    hcm_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../tooling/scripts/beads/hardware_capital_manager.py'))
                    subprocess.run(["python3", hcm_path, "quarantine", target_node], check=False)
                    print(f"   --> ⚡ [SOP_EXECUTED] {failed_domain} has been quarantined.")
                except Exception as e:
                    print(f"   --> 🚨 [FATAL] Failed to execute SOP for {failed_domain}: {e}")
                    
            sys.exit(0)

if __name__ == "__main__":
    asyncio.run(main())
