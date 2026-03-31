import subprocess
import json
import re
import statistics
import os

def get_failed_episodes():
    # Corrected export command: Just db path, defaults to ./agentdb-export.json
    cmd_export = ["npx", "agentdb", "export", "agentdb.db"]
    subprocess.run(cmd_export, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    export_path = "agentdb-export.json"
    if not os.path.exists(export_path):
        return []
        
    with open(export_path, "r") as f:
        data = json.load(f)
        
    # Clean up
    os.remove(export_path)
    
    # Data is a list of episodes
    if isinstance(data, list):
        episodes = data
    else:
        episodes = data.get("episodes", [])
        
    failed = []
    for ep in episodes:
        task = ep.get("task")
        success = ep.get("success")
        
        # Check falsy success (0, false, false)
        is_success = False
        if isinstance(success, str):
            is_success = success.lower() == "true"
        elif isinstance(success, (int, float)):
            is_success = success > 0
        elif isinstance(success, bool):
            is_success = success
            
        if task == "maintain_system_stability" and not is_success:
            failed.append(ep)
            
    return failed

def analyze_loads(episodes):
    loads = []
    # Regex to extract Load1: 70.03...
    pattern = r"Load1:\s*([\d\.]+)"
    
    for ep in episodes:
        critique = ep.get("critique", "")
        match = re.search(pattern, critique)
        if match:
            try:
                loads.append(float(match.group(1)))
            except ValueError:
                pass
                
    if not loads:
        return None
        
    return {
        "count": len(loads),
        "min_failure_load": min(loads),
        "max_failure_load": max(loads),
        "avg_failure_load": statistics.mean(loads),
        "median_failure_load": statistics.median(loads)
    }

def generate_config(stats):
    if not stats:
        return "No data to tune governor."
    
    # Tuning Logic
    min_fail = stats["min_failure_load"]
    
    # If the system warned at load 45, maybe we should throttle at 40 (10% buffer)
    recommended_threshold = min_fail * 0.9 
    
    CORES = 28 # Hardcoded based on logs
    utilization_target = (recommended_threshold / CORES) * 100
    headroom_target = 100 - utilization_target
    
    # Clamp to reasonable bounds (10% to 90% idle)
    headroom_target = max(10, min(90, headroom_target))
    
    return {
        "AF_CPU_HEADROOM_TARGET": round(headroom_target / 100, 2),
        "AF_MAX_WIP": max(1, int(stats["min_failure_load"] / 5)), 
        "stats": stats
    }

def main():
    print("🔍 Querying AgentDB for failure patterns...")
    episodes = get_failed_episodes()
    print(f"📊 Found {len(episodes)} failure episodes.")
    
    stats = analyze_loads(episodes)
    if stats:
        print("\n📈 Load Analysis:")
        print(f"   Count: {stats['count']}")
        print(f"   Min Failure Load: {stats['min_failure_load']:.2f}")
        print(f"   Avg Failure Load: {stats['avg_failure_load']:.2f}")
        print(f"   Max Failure Load: {stats['max_failure_load']:.2f}")
        
        config = generate_config(stats)
        
        print("\n🎯 Recommended Configuration:")
        print(f"   AF_CPU_HEADROOM_TARGET: {config['AF_CPU_HEADROOM_TARGET']} (Current default: 0.40)")
        print(f"   AF_MAX_WIP: {config['AF_MAX_WIP']} (Current default: 6)")
        
        with open(".goalie/governor_tuning_recommendation.json", "w") as f:
            json.dump(config, f, indent=2)
            
        print("\n✅ Recommendation saved to .goalie/governor_tuning_recommendation.json")
    else:
        print("❌ No load data extracted.")

if __name__ == "__main__":
    main()
