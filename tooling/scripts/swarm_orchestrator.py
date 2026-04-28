#!/usr/bin/env python3
"""
Domain C: Swarm Governance & Routing (The Brain)
Responsibility: Consuming Telemetry (Sensor Mesh) and Financial data (Treasury) 
to actively sort and mutate the WSJF priority matrix. Emits physical state maps.
"""
import os
import json
import time
import datetime
import uuid
import ddd_event_bus

try:
    from dotenv import load_dotenv
    import psutil
except ImportError as e:
    print(f"[FATAL] System boundary restricted by missing constraints: {e}")
    exit(1)

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
ENV_PATH = os.path.join(ROOT_DIR, '.env')
TELEMETRY_PATH = os.path.join(ROOT_DIR, '.goalie/genuine_telemetry.json')
NUMBERS_PATH = os.path.join(ROOT_DIR, 'numbers_csv_extracted.json')

wsjf_swarm_vectors = {}
try:
    with open(NUMBERS_PATH, 'r') as f:
        db = json.load(f)
        domains = db.get("extracted_domains", [])
        for i, d in enumerate(domains):
            wsjf_swarm_vectors[d] = 5
except Exception as e:
    print(f"--> [WARNING] Failed to load domain LEDGER: {e}")

print(f"={'=' * 60}")
print(f"🚀 DOMAIN C: SWARM GOVERNANCE (THE BRAIN)")
print(f"={'=' * 60}")

if not os.path.exists(ENV_PATH):
    print(f"❌ [BOUNDARY ALERT] .env vault destroyed or missing at {ENV_PATH}")
    exit(1)

load_dotenv(dotenv_path=ENV_PATH)

def get_finance_event():
    event = ddd_event_bus.get_latest_event("FinanceLimitEvent")
    if event:
        return event["allocated"], event["spent"], event["utilization"], event["economic_modifier"]
    return 100.0, 0.0, 0.0, 1.0

def start_orchestrator_loop():
    print("--> 🧠 Governance Engine Online. Awaiting Telemetry...")
    
    # Kickstart the cycle by pushing the initial scrape target
    initial_batch = list(wsjf_swarm_vectors.keys())[:3]
    initial_id = str(uuid.uuid4())
    ddd_event_bus.publish("GOVERNANCE", "ScrapeTargetEvent", {"batch": initial_batch, "action_id": initial_id})
    last_processed_telemetry_id = None
    
    try:
        while True:
            # Domain C (Governance): Subscribing to Domain B (Sensor Mesh)
            telemetry = ddd_event_bus.get_latest_event("TelemetryDriftEvent")
            
            if telemetry and telemetry.get("action_id") != last_processed_telemetry_id:
                # We have new physical telemetry!
                results = telemetry.get("results", [])
                anomaly_drift = telemetry.get("anomalyScore", 1.0)
                avg_latency = telemetry.get("avg_latency", 9999)
                active_agents = telemetry.get("valid_scrapes_count", 0)
                
                # Domain C (Governance): Subscribing to Domain A (Treasury)
                allocated_opex, spent_opex, budget_utilization, economic_modifier = get_finance_event()
                
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
                
                # Genuine MAPE-K routing
                lbec_decision = "cloud" if (anomaly_drift > 0.3 and budget_utilization < 0.9) else "local"

                cpu_usage = psutil.cpu_percent(interval=None)
                memory = psutil.virtual_memory()

                metrics = {
                  "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                  "metrics": {
                    "cpu_utilization": round(cpu_usage, 2),
                    "memory_mapped_mb": round(memory.used / (1024 * 1024), 2),
                    "active_agents": active_agents,
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
                    "last_action_id": telemetry.get("action_id")
                  },
                  "wsjf_swarm": wsjf_swarm_vectors
                }

                tmp_path = f"{TELEMETRY_PATH}.tmp"
                with open(tmp_path, "w") as f:
                    json.dump(metrics, f, indent=2)
                os.replace(tmp_path, TELEMETRY_PATH)

                print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Swarm Governed: Routed {len(results)} nodes | Gravity: {round(anomaly_drift, 4)} | Economic Mod: {round(economic_modifier, 2)}x")
                
                # Push the next sequence of work onto the Event Bus
                sorted_channels = sorted(wsjf_swarm_vectors.items(), key=lambda item: item[1], reverse=True)
                next_batch = [channel[0] for channel in sorted_channels[:3]]
                next_id = str(uuid.uuid4())
                
                ddd_event_bus.publish("GOVERNANCE", "ScrapeTargetEvent", {"batch": next_batch, "action_id": next_id})
                
                last_processed_telemetry_id = telemetry.get("action_id")
                
            time.sleep(0.5)

    except KeyboardInterrupt:
        print("\n\n--> 🧠 Governance Engine halted.")

if __name__ == "__main__":
    start_orchestrator_loop()
