
import subprocess
import json
import sys
import os

IDS_FILE = ".goalie/swarm_exp/ids.txt"

def analyze_swarm():
    if not os.path.exists(IDS_FILE):
        print(f"Error: {IDS_FILE} not found. Run the experiment first.")
        return

    results = []

    with open(IDS_FILE, 'r') as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) != 2: continue
            iters, rid = parts

            # Run revenue-safe
            cmd = ["./scripts/af", "revenue-safe", "--hours", "6", "--correlation-id", rid, "--json"]
            try:
                res = subprocess.run(cmd, capture_output=True, text=True)
                if res.returncode != 0:
                    print(f"Error analyzing {iters} (RID: {rid}): {res.stderr}")
                    continue

                data = json.loads(res.stdout)
                summary = data.get("summary", {})

                results.append({
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

    # Sort by iterations
    results.sort(key=lambda x: x["iters"])

    print("\n## Swarm Experiment Results\n")
    print("| Iterations | Duration (h) | Rev/Hour ($) | Energy Cost ($) | Efficiency (Val/$) | Events |")
    print("|------------|--------------|--------------|-----------------|--------------------|--------|")

    for r in results:
        print(f"| {r['iters']} | {r['duration_h']:.4f} | {r['rev_per_hr']:.2f} | {r['energy_cost']:.6f} | {r['efficiency']:.2f} | {r['events']} |")

    # Recommendation Logic
    if results:
        best_eff = max(results, key=lambda x: x["rev_per_hr"])
        print(f"\n**Recommendation:**")
        print(f"- Optimal Efficiency (Rev/Hour): **{best_eff['iters']} iterations** (${best_eff['rev_per_hr']:.2f}/hr)")

if __name__ == "__main__":
    analyze_swarm()
