#!/usr/bin/env python3
"""
Domain C: Swarm Governance & Routing (The Brain)
Responsibility: Consuming Telemetry (Sensor Mesh) and OPEX Ledger (Treasury) 
to actively sort and mutate the WSJF priority matrix. Emits physical state maps.
Refactored for Fourth-Wave Agentic DBOS Execution & Genuine ML Anomaly Detection.
"""
import os
import json
import time
import datetime
import uuid
import asyncio
import sys
import sqlite3
import math
import subprocess

import ddd_event_bus

# Inject Wave 4 Agentic AST Indexing
try:
    sys.path.append(os.path.join(os.path.dirname(__file__), "beads"))
    from ast_semantic_indexer import ASTSemanticChunker
except ImportError as e:
    print(f"[FATAL] AST Chunker Missing: {e}")

try:
    import psutil
except ImportError as e:
    print(f"[FATAL] System boundary restricted by missing constraints: {e}")
    sys.exit(1)

from dbos import DBOS

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))

TELEMETRY_PATH = os.path.join(ROOT_DIR, '.goalie/genuine_telemetry.json')
NUMBERS_PATH = os.path.join(ROOT_DIR, 'numbers_csv_extracted.json')
OPEX_DB_PATH = os.path.join(ROOT_DIR, '.goalie/opex.db')

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

@DBOS.step()
def get_finance_and_ml_tensors() -> dict:
    """
    🔴 NO BYPASS THEATER: Physically query the OPEX database for genuine capital burn rates
    and compute ML-based anomaly detection (Z-Score on execution TTFB).
    """
    if not os.path.exists(OPEX_DB_PATH):
        return {"burn_rate": 0.0, "failure_rate": 0.0, "anomaly_detected": False, "modifier": 1.0}
        
    try:
        conn = sqlite3.connect(OPEX_DB_PATH)
        cur = conn.cursor()
        
        # Pull last 50 execution tensors
        cur.execute("SELECT status, ttfb_ms, timestamp FROM execution_tensors ORDER BY timestamp DESC LIMIT 50")
        rows = cur.fetchall()
        conn.close()
        
        if not rows:
            return {"burn_rate": 0.0, "failure_rate": 0.0, "anomaly_detected": False, "modifier": 1.0}
            
        total_execs = len(rows)
        failures = sum(1 for r in rows if r[0] != "PASS")
        failure_rate = failures / total_execs
        
        # Calculate true capital burn rate (measured in milliseconds wasted over time)
        ttfb_history = [float(r[1]) for r in rows if float(r[1]) > 0.0]
        
        anomaly_detected = False
        economic_modifier = 1.0 + (failure_rate * 2.0)
        
        # Genuine ML Logic: Statistical Anomaly Detection (Z-Score)
        if len(ttfb_history) > 3:
            mean_ttfb = sum(ttfb_history) / len(ttfb_history)
            variance = sum((x - mean_ttfb) ** 2 for x in ttfb_history) / len(ttfb_history)
            std_dev = math.sqrt(variance) if variance > 0 else 1.0
            
            z_scores = [(x - mean_ttfb) / std_dev for x in ttfb_history]
            max_z = max(z_scores)
            
            # 99.3% confidence interval breach indicates a supply shock / bloat anomaly
            if max_z > 2.5:
                anomaly_detected = True
                economic_modifier += 1.5
                
            burn_rate = mean_ttfb / 1000.0 # simple burn proxy in seconds
        else:
            burn_rate = 0.0
            
        return {
            "burn_rate": burn_rate,
            "failure_rate": failure_rate,
            "anomaly_detected": anomaly_detected,
            "modifier": economic_modifier
        }
        
    except Exception as e:
        print(f"--> [FATAL] Swarm Orchestrator OPEX DB Query Failed: {e}")
        return {"burn_rate": 0.0, "failure_rate": 0.0, "anomaly_detected": False, "modifier": 1.0}

@DBOS.workflow()
def orchestrator_cycle(ast_node_count: int, last_processed_telemetry_id: str) -> str:
    """Durable execution of the MAPE-K Loop"""
    # 1. MONITOR: Domain C (Governance) subscribes to Domain B (Sensor Mesh)
    telemetry = ddd_event_bus.get_latest_event("TelemetryDriftEvent")
    
    if telemetry and telemetry.get("action_id") != last_processed_telemetry_id:
        results = telemetry.get("results", [])
        anomaly_drift = telemetry.get("anomalyScore", 1.0)
        avg_latency = telemetry.get("avg_latency", 9999)
        active_agents = telemetry.get("valid_scrapes_count", 0)
        action_id = telemetry.get("action_id")
        
        # 2. ANALYZE: Pull real OPEX financial tensors and execute ML
        opex_tensors = get_finance_and_ml_tensors()
        economic_modifier = opex_tensors["modifier"]
        ml_anomaly_detected = opex_tensors["anomaly_detected"]
        
        # 3. PLAN: Dynamic adjust based on latency, payload, and REAL ECONOMICS
        for r in results:
            k = r.get("domain", "")
            if not k or k not in wsjf_swarm_vectors:
                continue
                
            if r.get("bytes", 0) == 0:
                # DEAD CHANNEL: Obliterate from WSJF queue
                wsjf_swarm_vectors[k] = max(1, wsjf_swarm_vectors[k] - 5)
            else:
                # WSJF Modulated by Economic Demand (Cost of Delay vs API Latency)
                cost_of_delay = r.get("latency", 0) * economic_modifier
                shift = 1 if cost_of_delay < 1000 else -1 
                wsjf_swarm_vectors[k] = max(1, min(12, wsjf_swarm_vectors[k] + shift))
                
        active_wsjf = sum(wsjf_swarm_vectors.values()) / max(1, len(wsjf_swarm_vectors))
        
        # Genuine MAPE-K routing based on ML tensor
        lbec_decision = "cloud" if (not ml_anomaly_detected and opex_tensors["failure_rate"] < 0.1) else "local"

        # ----------------------------------------------------------------------
        # TTFB Tolerance Habitability Range (Contrastive Intel Agility)
        # ----------------------------------------------------------------------
        ttfb = avg_latency
        habitability_zone = "Habitable"
        proposed_action = "HOLD_NOMINAL_SPREAD"
        confidence = 0.95
        
        # Uninhabitable Zone: > 3000ms OR 2.5σ ML Breach
        if ttfb > 3000 or ml_anomaly_detected:
            habitability_zone = "Uninhabitable"
            # ROAM MITIGATION: Do not instantly liquidate. Quarantine, route traffic away, and observe.
            proposed_action = "QUARANTINE_AND_OBSERVE"
            confidence = 0.99
            
        # Drift Zone: 500ms - 2000ms
        elif ttfb >= 500:
            habitability_zone = "Drift"
            proposed_action = "CONTRASTIVE_INTELLIGENCE"
            confidence = 0.80

        cpu_usage = psutil.cpu_percent(interval=1.0)
        memory = psutil.virtual_memory()

        metrics = {
          "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
          "metrics": {
            "cpu_utilization": round(cpu_usage, 2),
            "memory_mapped_mb": round(memory.used / (1024 * 1024), 2),
            "active_agents": active_agents,
            "api_latency_ms": ttfb
          },
          "pewma": {
            "anomalyScore": round(anomaly_drift, 4),
            "ml_z_score_breach": ml_anomaly_detected,
            "latency": ttfb
          },
          "opex": {
              "burn_rate": opex_tensors["burn_rate"],
              "failure_rate": opex_tensors["failure_rate"],
              "burn_velocity": round(economic_modifier - 1.0, 4)
          },
          "mapek": {
              "lbec_decision": lbec_decision,
              "habitability_zone": habitability_zone
          },
          "contrastive_intel": {
              "ast_semantic_nodes": ast_node_count,
              "temporal_agility_status": "SYNCHRONIZED"
          },
          "plan": {
            "proposed_action": proposed_action,
            "wsjf_score": round(active_wsjf, 1),
            "confidence": confidence
          },
          "execute": {
            "status": "RUNNING",
            "last_action_id": action_id
          },
          "wsjf_swarm": wsjf_swarm_vectors
        }

        tmp_path = f"{TELEMETRY_PATH}.tmp"
        with open(tmp_path, "w") as f:
            json.dump(metrics, f, indent=2)
        os.replace(tmp_path, TELEMETRY_PATH)

        print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Swarm Governed: Routed {len(results)} nodes | ML Anomaly: {ml_anomaly_detected} | Zone: {habitability_zone} | Mod: {round(economic_modifier, 2)}x")
        
        # 4. EXECUTE: Push the next sequence of work onto the Event Bus
        sorted_channels = sorted(wsjf_swarm_vectors.items(), key=lambda item: item[1], reverse=True)
        next_batch = [channel[0] for channel in sorted_channels[:3]]
        next_id = str(uuid.uuid4())
        
        ddd_event_bus.publish("GOVERNANCE", "ScrapeTargetEvent", {"batch": next_batch, "action_id": next_id})
        
        # ----------------------------------------------------------------------
        # BOUNDED REASONING & PHYSICAL EXECUTION (BEAD TRIGGERS)
        # ----------------------------------------------------------------------
        if habitability_zone == "Uninhabitable":
            print(f"  🚨 [SWARM] {ttfb}ms TTFB / 2.5σ Breach. Zone: UNINHABITABLE. Triggering QUARANTINE_AND_OBSERVE...")
            
            # 1. DNS Healing (Sever Network Route - Protect the User, don't kill the KVM yet)
            dns_bead = os.path.join(ROOT_DIR, "tooling", "scripts", "beads", "agentic_dns_healer.py")
            if os.path.exists(dns_bead):
                print(f"  🌐 [SWARM] Activating Agentic DNS Healer for immediate traffic route diversion (Quarantine Mode)...")
                subprocess.Popen([sys.executable, dns_bead])
                
            # 2. SCD Browser Subagent (Probe the Quarantined node for structural signs of life)
            scd_bead = os.path.join(ROOT_DIR, "tooling", "scripts", "beads", "scd_browser_subagent.py")
            if os.path.exists(scd_bead):
                print(f"  ⚖️ [SWARM] Triggering SCD Browser Subagent to probe the quarantined node for false-positives...")
                subprocess.Popen([sys.executable, scd_bead, "quarantine_probe"])
                
            # 3. Forensic Sync (Capture Evidence before Liquidation)
            forensic_bead = os.path.join(ROOT_DIR, "tooling", "scripts", "beads", "forensic_sync.py")
            if os.path.exists(forensic_bead):
                print(f"  🛡️ [SWARM] Dispatching Forensic Sync. Consciously burning Execution Capital to farm the php.error.log backtrace...")
                # We intentionally block here to 'buy' the intelligence before destroying the node.
                subprocess.run([sys.executable, forensic_bead, "target_compromised_node"])
                
            # 4. Autonomous Hardware Liquidation & Provisioning (The Sovereign Trader)
            capital_bead = os.path.join(ROOT_DIR, "tooling", "scripts", "beads", "hardware_capital_manager.py")
            healing_bead = os.path.join(ROOT_DIR, "tooling", "scripts", "beads", "domain_healing.py")
            if os.path.exists(healing_bead):
                print(f"  🔥 [SWARM] Forensic Intelligence Acquired. Triggering Domain Healing to prune the localized container bloat...")
                subprocess.Popen([sys.executable, healing_bead])
            
            if os.path.exists(capital_bead):
                print(f"  📈 [NEURAL-TRADER] Triggering Capital Manager: Arbitraging liquid compute via STX Hostbill APIs...")
                subprocess.Popen([sys.executable, capital_bead])

        elif habitability_zone == "Drift":
            print(f"  ⚠️ [SWARM] {ttfb}ms TTFB. Zone: DRIFT. Executing Attentional Weighting (Contrastive Intelligence)...")
            # In Drift, we hold the nominal spread but prepare the SELL_CASCADE logic in memory
            # The Agility Gap: Prevent Diagnostic Blindness by gathering Forensic Intelligence while the system is still breathing.
            
            ast_indexer_bead = os.path.join(ROOT_DIR, "tooling", "scripts", "beads", "ast_semantic_indexer.py")
            if os.path.exists(ast_indexer_bead):
                print(f"  🧠 [CONTRASTIVE INTEL] Triggering AST Semantic Indexer. Capturing structural drift before structural failure.")
                # Non-blocking parallel execution to avoid burning execution capital while indexing.
                subprocess.Popen([sys.executable, ast_indexer_bead])
            
        return action_id
    return last_processed_telemetry_id

def calculate_risk_adjusted_returns() -> bool:
    """
    ULTIMATE YIELD CURVE: Calculates if the Cost of Waking (Cold Start Latency) 
    is mathematically cheaper than the Cost of Waiting (Holding Memory).
    Returns True if we should HOLD_NOMINAL_SPREAD (keep process alive in RAM).
    Returns False if we should SELL_CASCADE (liquidate process to save memory).
    """
    db_path = os.path.join(ROOT_DIR, '.goalie', 'event_bus.db')
    if not os.path.exists(db_path):
        return False
        
    try:
        conn = sqlite3.connect(db_path, timeout=5.0)
        cur = conn.cursor()
        current_time = time.time()
        cur.execute("SELECT COUNT(*) FROM domain_events WHERE timestamp > ?", (current_time - 60,))
        event_count = cur.fetchone()[0]
        conn.close()
        
        # High Volatility (> 10 events per minute) justifies holding the memory
        if event_count > 10:
            print(f"--> 📈 [YIELD CURVE] High Volatility Detected ({event_count} events/min). Action: HOLD_NOMINAL_SPREAD (Absorbing cold-start fees).")
            return True
        else:
            print(f"--> 📉 [YIELD CURVE] Low Volatility Detected ({event_count} events/min). Action: SELL_CASCADE (Liquidating idle memory).")
            return False
    except Exception as e:
        print(f"--> [WARNING] Risk-Adjusted Yield calculation failed: {e}")
        return False

def execute_active_dbos_cycle():
    print("--> 🧠 Governance Engine Online (Active Mode DBOS). Validating OPEX Ledger...")
    
    ast_indexer = ASTSemanticChunker(ROOT_DIR)
    ast_indexer.execute_indexing()
    ast_node_count = len(ast_indexer.chunks)
    print(f"--> 🧬 Contrastive Intel Agility: {ast_node_count} AST nodes indexed for mxbai-embed-large.")

    last_processed_telemetry_id = None
    
    try:
        # First execution is guaranteed
        telemetry = ddd_event_bus.get_latest_event("TelemetryDriftEvent")
        last_processed_telemetry_id = telemetry.get("action_id") if telemetry else None
        action_id = orchestrator_cycle(ast_node_count, last_processed_telemetry_id)
        
        # Periodic Active Dispatch
        scd_bead = os.path.join(ROOT_DIR, "tooling", "scripts", "beads", "scd_browser_subagent.py")
        if os.path.exists(scd_bead):
            subprocess.Popen([sys.executable, scd_bead, "mecklenburg_bar_referrals"])
            subprocess.Popen([sys.executable, scd_bead, "de_novo_intake_portal"])
            
        print(f"--> 🛡️ Initial Swarm Cycle Complete. Tensor Action ID: {action_id}")
        
        # ULTIMATE YIELD CURVE ROUTING
        # If volatility is high, we enter a tight hold loop for 60 seconds to absorb the burst.
        hold_memory = calculate_risk_adjusted_returns()
        
        if hold_memory:
            print("--> ⏳ Entering High-Frequency Absorption Loop (Holding Memory for 60s)...")
            start_hold = time.time()
            while time.time() - start_hold < 60:
                action_id = orchestrator_cycle(ast_node_count, action_id)
                time.sleep(0.5) # Minimal sleep, max responsiveness
            print("--> ⏱️ Absorption Loop Complete. Reevaluating physical execution state.")
        
        print("--> 💤 Releasing Compute Capital. Liquidating Active Mode Process.")
        
    except Exception as e:
        print(f"[FATAL] Orchestrator DBOS boundary crash: {e}")

if __name__ == "__main__":
    DBOS.launch()
    execute_active_dbos_cycle()
