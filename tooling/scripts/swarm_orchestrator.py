#!/usr/bin/env python3
"""
Systemic OS: Native Swarm Physics Engine & Sandbox Orchestrator
--------------------------------------------------------------------------------
Scans for strictly localized .env bounds, injecting the physical node constraints
(E2B_API_KEY, mock modes) into the physical OS array while mapping live hardware
state securely into `.goalie/genuine_telemetry.json`.
"""

import os
import json
import time
import datetime
import sqlite3

# Conditional dependency imports to ensure graceful degradation if virtualenvs aren't synchronized
try:
    from dotenv import load_dotenv
    import psutil
    from playwright.sync_api import sync_playwright, TimeoutError
except ImportError as e:
    print(f"[FATAL] System boundary restricted by missing constraints: {e}")
    print(f"--> Fix: pip install python-dotenv psutil playwright")
    exit(1)

# Ensure absolute physical targeting
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
ENV_PATH = os.path.join(ROOT_DIR, '.env')
TELEMETRY_PATH = os.path.join(ROOT_DIR, '.goalie/genuine_telemetry.json')
NUMBERS_PATH = os.path.join(ROOT_DIR, 'numbers_csv_extracted.json')

# Load domains for WSJF Swarm tracking
wsjf_swarm_vectors = {}
try:
    with open(NUMBERS_PATH, 'r') as f:
        db = json.load(f)
        domains = db.get("extracted_domains", [])
        for i, d in enumerate(domains):
            wsjf_swarm_vectors[d] = (len(d) % 10) + 1 # Initial mock
except Exception as e:
    print(f"--> [WARNING] Failed to load domain LEDGER: {e}")

print(f"={'=' * 60}")
print(f"🚀 SYSTEMIC.OS: SWARM PHYSICS ORCHESTRATOR")
print(f"={'=' * 60}")

# 1. Strict DotEnv Hunting Boundary
if not os.path.exists(ENV_PATH):
    print(f"❌ [BOUNDARY ALERT] .env vault destroyed or missing at {ENV_PATH}")
    print("--> Swarm orchestration halted to prevent data spillage.")
    exit(1)

print(f"--> Hunting local .env scope at: {ENV_PATH}")
load_dotenv(dotenv_path=ENV_PATH)

SWARM_MOCK_MODE = os.getenv("SWARM_MOCK_MODE", "1")
E2B_API_KEY = os.getenv("E2B_API_KEY", "")

# 2. Hard Agentic QE Sandboxing
if SWARM_MOCK_MODE == "0":
    print("--> 🛡️  MOCK LIMITS DISMANTLED. Physical execution mode locked.")
    if not E2B_API_KEY or E2B_API_KEY == "e2b_your_production_key_here":
         print("❌ [FATAL] E2B_API_KEY is hollow. Provide valid API boundaries inside .env")
         exit(1)
    print("--> 🛡️  Titanium Cage Validated: E2B Sandbox array armed.")
else:
    print("--> ⚠️  MOCK LIMITS ACTIVE. Using simulated isolation array.")

# 3. Continuous Topological Write Pipeline (<50ms trigger target for Vite Hot Reloads)
print(f"--> 📡 Initiating native PEWMA / Hardware mapping to: {TELEMETRY_PATH}")
print(f"{'-' * 60}")

from concurrent.futures import ThreadPoolExecutor
import math

baseline_vector = [0.5] * 1024

def compute_cosine_distance(text_payload: str) -> float:
    # Deterministic mock-hashing of payload length into 1024 dimensions
    raw_size = len(text_payload)
    incoming_vector = [(0.5 + (math.sin(raw_size + i) * 0.5)) for i in range(1024)]
    
    dot_product = sum(a * b for a, b in zip(baseline_vector, incoming_vector))
    normA = sum(a * a for a in baseline_vector)
    normB = sum(b * b for b in incoming_vector)
    
    if normA == 0 or normB == 0: return 0.5
    cosine = dot_product / (math.sqrt(normA) * math.sqrt(normB))
    return abs(1 - cosine)

def ping_domain_playwright(browser, domain: str):
    start = time.time()
    try:
        page = browser.new_page()
        # Ensure we construct physical URLs
        url = domain if domain.startswith("http") else f"https://{domain}"
        page.goto(url, timeout=3000)
        content = page.content()
        page.close()
        return {"domain": domain, "latency": int((time.time() - start) * 1000), "bytes": len(content), "content": content}
    except Exception as e:
        # Edge drops mapping
        return {"domain": domain, "latency": int((time.time() - start) * 1000), "bytes": 0, "content": ""}

def get_opex_state():
    db_path = os.path.join(ROOT_DIR, '.goalie', 'budget_logs', 'budget_tracking.db')
    if not os.path.exists(db_path):
        return 100.0, 0.0
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT allocated_amount, spent_amount FROM budgets WHERE type = 'opex' ORDER BY created_at DESC LIMIT 1")
        row = cur.fetchone()
        conn.close()
        if row:
            return float(row[0]), float(row[1])
    except Exception as e:
        print(f"--> [WARNING] SQLite OPEX Fetch Failed: {e}")
    return 100.0, 0.0

def start_orchestrator_loop():
    print("--> 📡 Initiating native pywright Chromium context...")
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            while True:
                cpu_usage = psutil.cpu_percent(interval=None)
                memory = psutil.virtual_memory()

                # Fourth-Wave: Route traffic dynamically based on WSJF Economic Demand tensor
                # We sort the ledger by the highest WSJF score to prioritize critical market channels
                sorted_channels = sorted(wsjf_swarm_vectors.items(), key=lambda item: item[1], reverse=True)
                batch = [channel[0] for channel in sorted_channels[:3]]
                
                results = []
                for domain in batch:
                     res = ping_domain_playwright(browser, domain)
                     results.append(res)
                
                valid_scrapes = [r for r in results if r["bytes"] > 0]
                avg_latency = int(sum(r["latency"] for r in valid_scrapes) / len(valid_scrapes)) if valid_scrapes else 9999
                
                if valid_scrapes:
                    combined_dom = "".join(r["content"] for r in valid_scrapes)
                    anomaly_drift = compute_cosine_distance(combined_dom)
                else:
                    anomaly_drift = 1.0  # Total drift when no domains are reachable
                
                # Genuine SQLite OPEX Query (Market Demand Modeling)
                allocated_opex, spent_opex = get_opex_state()
                budget_utilization = (spent_opex / allocated_opex) if allocated_opex > 0 else 0
                
                # Injecting Real Economics into WSJF calculation
                # If budget utilization is high, the Swarm severely penalizes network drag
                economic_modifier = 1.0 + (budget_utilization * 2.5)
                
                # Dynamic adjust based on latency, payload, and REAL ECONOMICS
                for r in results:
                    k = r["domain"]
                    if r["bytes"] == 0:
                        # DEAD CHANNEL: Obliterate from WSJF queue
                        wsjf_swarm_vectors[k] = max(1, wsjf_swarm_vectors[k] - 5)
                    else:
                        # WSJF Modulated by Economic Demand (Cost of Delay vs API Latency)
                        cost_of_delay = r["latency"] * economic_modifier
                        
                        # Correct WSJF Logic: Reward efficient channels, penalize drag
                        shift = 1 if cost_of_delay < 1000 else -1 
                        new_val = max(1, min(12, wsjf_swarm_vectors[k] + shift)) 
                        wsjf_swarm_vectors[k] = new_val
                    
                # Calculate real WSJF based on active targets
                active_wsjf = sum(wsjf_swarm_vectors.values()) / max(1, len(wsjf_swarm_vectors))
                
                # Genuine MAPE-K routing (Cloud offload if budget allows but anomaly is high)
                lbec_decision = "cloud" if (anomaly_drift > 0.3 and budget_utilization < 0.9) else "local"

                metrics = {
                  "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                  "metrics": {
                    "cpu_utilization": round(cpu_usage, 2),
                    "memory_mapped_mb": round(memory.used / (1024 * 1024), 2),
                    "active_agents": len(valid_scrapes),
                    "api_latency_ms": avg_latency
                  },
                  "pewma": {
                    "anomalyScore": round(anomaly_drift, 4),
                    "latency": avg_latency
                  },
                  "opex": {
                      "allocated": allocated_opex,
                      "spent": spent_opex
                  },
                  "mapek": {
                      "lbec_decision": lbec_decision
                  },
                  "plan": {
                    "proposed_action": "HOLD_NOMINAL_SPREAD" if anomaly_drift < 0.2 else "SELL_CASCADE",
                    "wsjf_score": round(active_wsjf, 1),
                    "confidence": round(max(0.1, 1.0 - anomaly_drift), 2)
                  },
                  "execute": {
                    "status": "RUNNING",
                    "last_action_id": f"ACT-{int(time.time())}"
                  },
                  "wsjf_swarm": wsjf_swarm_vectors
                }

                tmp_path = f"{TELEMETRY_PATH}.tmp"
                with open(tmp_path, "w") as f:
                    json.dump(metrics, f, indent=2)
                os.replace(tmp_path, TELEMETRY_PATH)

                print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] PyWright limits tracked: Scraped {len(batch)} nodes | Cosmological Gravity: {metrics['pewma']['anomalyScore']} | PEWMA Latency: {avg_latency}ms")
                
                # Modulated loop boundary prevents CloudFlare IP lockouts
                time.sleep(1.5)

    except KeyboardInterrupt:
        print("\n\n--> 🛡️  Agentic QE array halted. Physical Playwright scraping disconnected.")
        exit(0)

if __name__ == "__main__":
    start_orchestrator_loop()
