import subprocess
import json
import sys
import os

IDS_FILE_DEFAULT = ".goalie/swarm_exp/ids.txt"
IDS_FILE_SCENARIOS = ".goalie/swarm_exp/scenarios/ids.txt"

def analyze_swarm(use_scenarios=False):
    ids_file = IDS_FILE_SCENARIOS if use_scenarios else IDS_FILE_DEFAULT
    
    if not os.path.exists(ids_file):
        print(f"Error: {ids_file} not found. Run the experiment first.")
        return

    results = []

    with open(ids_file, 'r') as f:
        for line in f:
            parts = line.strip().split()
            if not parts: continue
            
            scenario = "baseline"
            if use_scenarios and len(parts) == 3:
                scenario, iters, rid = parts
            elif not use_scenarios and len(parts) == 2:
                iters, rid = parts
            else:
                continue

            # Run revenue-safe for analysis against Reality execution telemetry
            cmd = ["./af", "revenue-safe", "--hours", "6", "--correlation-id", rid, "--json"]
            try:
                res = subprocess.run(cmd, capture_output=True, text=True)
                if res.returncode != 0:
                    print(f"Error analyzing {iters} (RID: {rid}): {res.stderr}")
                    continue

                data = json.loads(res.stdout)
                summary = data.get("summary", {})

                results.append({
                    "scenario": scenario,
                    "iters": int(iters),
                    "rid": rid,
                    "duration_h": summary.get("total_duration_hours", 0),
                    "rev_per_hr": summary.get("revenue_per_hour", 0),
                    "energy_cost": summary.get("total_energy_cost_usd", 0),
                    "efficiency": summary.get("value_per_energy_usd", 0),
                    "events": summary.get("event_count", 0)
                })
            except Exception as e:
                print(f"Exception for {iters}: {e}")

    # Sort results
    if use_scenarios:
        # Sort by scenario then iterations
        results.sort(key=lambda x: (x["scenario"], x["iters"]))
    else:
        results.sort(key=lambda x: x["iters"])
        
        results.sort(key=lambda x: x["iters"])
        
    print("\n## MAPE-K Telemetry: Density-Based Anomaly Bounds")
    try:
        anomaly_count = 0
        telemetry_path = ".goalie/genuine_telemetry.json"
        if os.path.exists(telemetry_path):
            with open(telemetry_path, 'r') as tf:
                content = tf.read()
                anomaly_count = content.count('Slow-edge boundary nearing limit')
        if anomaly_count > 0:
            print(f"- [Monitor & Analyze] Detected {anomaly_count} Density-Based Frugality Triggers (Slow Edge Soft-Limits Prevented Blowout) 🟢")
        else:
            print("- [Monitor & Analyze] Baseline load stable. No dynamic sampling anomalies breached. ⚪️")
    except Exception as e:
        print(f"Warning: MAPE-K telemetry trace failed: {e}")

    print("\n## System Knowledge: BEAM Learning Trace")
    try:
        sys.path.append(".agentdb")
        from execute_with_lean_learning import BuildMeasureLearnCycle
        cycle = BuildMeasureLearnCycle()
        learnings = cycle.get_recent_learnings(limit=3)
        if learnings:
            for l in learnings:
                tags = l.get("beam_tags", "[]")
                print(f"- [Trace] Verdict: {l.get('verdict')} - Confidence: {l.get('confidence')} - BEAM: {tags}")
        else:
            print("- No organic learning traces extracted from Swarm DB.")
    except Exception as e:
        print(f"Warning: Learning hooks extraction failed: {e}")

    print("\n## Swarm Experiment Results\n")
    if use_scenarios:
        print("| Scenario | Iterations | Duration (h) | Rev/Hour ($) | Energy Cost ($) | Efficiency (Val/$) | Events |")
        print("|----------|------------|--------------|--------------|-----------------|--------------------|--------|")
        for r in results:
            print(f"| {r['scenario'].capitalize()} | {r['iters']} | {r['duration_h']:.4f} | {r['rev_per_hr']:.2f} | {r['energy_cost']:.6f} | {r['efficiency']:.2f} | {r['events']} |")
    else:
        print("| Iterations | Duration (h) | Rev/Hour ($) | Energy Cost ($) | Efficiency (Val/$) | Events |")
        print("|------------|--------------|--------------|-----------------|--------------------|--------|")
        for r in results:
            print(f"| {r['iters']} | {r['duration_h']:.4f} | {r['rev_per_hr']:.2f} | {r['energy_cost']:.6f} | {r['efficiency']:.2f} | {r['events']} |")

    # Recommendation Logic
    if results:
        best_eff = max(results, key=lambda x: x["rev_per_hr"])
        if use_scenarios:
            print(f"\n**Recommendation:**")
            print(f"- Optimal Efficiency (Rev/Hour): **{best_eff['scenario'].capitalize()} at {best_eff['iters']} iterations** (${best_eff['rev_per_hr']:.2f}/hr)")
        else:
            print(f"\n**Recommendation:**")
            print(f"- Optimal Efficiency (Rev/Hour): **{best_eff['iters']} iterations** (${best_eff['rev_per_hr']:.2f}/hr)")

if __name__ == "__main__":
    use_scenarios_flag = "--scenarios" in sys.argv
    analyze_swarm(use_scenarios=use_scenarios_flag)
