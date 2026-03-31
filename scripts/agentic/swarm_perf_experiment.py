#!/usr/bin/env python3
"""Swarm Performance Analysis: Validate optimal iteration count for af prod-cycle."""
import subprocess
import time
import re
import json
import sys

ITERATIONS_TO_TEST = [5, 25, 50, 100, 250]
PREVIOUS_MODEL = {"fixed_overhead_s": 26.6, "per_iter_s": 6.5}

def extract(pattern, text, default="N/A"):
    match = re.search(pattern, text)
    return match.group(1) if match else default

def run_experiment(iteration_count, expected_duration_s):
    print(f"\n{'='*70}")
    print(f"AGENT: Testing iterations={iteration_count}")
    print(f"   Expected duration: {expected_duration_s:.1f}s ({expected_duration_s/60:.1f} min)")
    print(f"{'='*70}")
    sys.stdout.flush()
    
    start_time = time.time()
    cmd = f"./scripts/af prod-cycle --iterations {iteration_count} --circle testing --mode advisory --no-early-stop"
    
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=2000)
        output = result.stdout + result.stderr
    except subprocess.TimeoutExpired:
        print(f"   TIMEOUT after 2000s")
        return None
    
    end_time = time.time()
    duration_s = end_time - start_time
    
    metrics = {
        "iterations_requested": iteration_count,
        "expected_duration_s": expected_duration_s,
        "actual_duration_s": round(duration_s, 2),
        "projection_error_pct": round((duration_s - expected_duration_s) / expected_duration_s * 100, 2),
        "iterations_done": extract(r'Iterations: (\d+/\d+)', output),
        "operations": extract(r'Operations: (\d+) total', output),
        "successful": extract(r'Successful: (\d+)', output),
        "failed": extract(r'Failed: (\d+)', output),
        "throughput": extract(r'Throughput: ([0-9.]+)/hr', output),
        "efficiency": extract(r'Efficiency: (\d+)%', output),
        "total_wsjf": extract(r'Total WSJF=([0-9.]+)', output),
        "events_analyzed": extract(r'Analyzed (\d+) pattern events', output),
    }
    metrics["s_per_iteration"] = round(duration_s / iteration_count, 2)
    
    print(f"\n   Completed in {metrics['actual_duration_s']}s (expected: {expected_duration_s}s)")
    print(f"   Iterations: {metrics['iterations_done']} | s/iter: {metrics['s_per_iteration']}")
    print(f"   Throughput: {metrics['throughput']}/hr | Efficiency: {metrics['efficiency']}%")
    print(f"   Projection Error: {metrics['projection_error_pct']:+.1f}%")
    sys.stdout.flush()
    return metrics

def main():
    results = []
    print("=" * 70)
    print("SWARM PERFORMANCE ANALYSIS EXPERIMENT")
    print("=" * 70)
    print(f"Testing iterations: {ITERATIONS_TO_TEST}")
    print(f"Previous model: Duration = {PREVIOUS_MODEL['fixed_overhead_s']}s + (iters * {PREVIOUS_MODEL['per_iter_s']}s)")
    print("Estimated total experiment time: ~48 minutes")
    
    for iteration_count in ITERATIONS_TO_TEST:
        expected = PREVIOUS_MODEL['fixed_overhead_s'] + (iteration_count * PREVIOUS_MODEL['per_iter_s'])
        metrics = run_experiment(iteration_count, expected)
        if metrics:
            results.append(metrics)
        print(f"\n   Progress: {len(results)}/{len(ITERATIONS_TO_TEST)} complete")
    
    # Analysis
    print("\n" + "=" * 70)
    print("PERFORMANCE COMPARISON TABLE")
    print("=" * 70)
    print(f"{'Iter':<6} {'Actual(s)':<10} {'Expected(s)':<12} {'Error%':<10} {'s/Iter':<8} {'Ops':<6} {'Throughput':<12}")
    print("-" * 75)
    for r in results:
        print(f"{r['iterations_requested']:<6} {r['actual_duration_s']:<10} {r['expected_duration_s']:<12} {r['projection_error_pct']:+.1f}%{'':<5} {r['s_per_iteration']:<8} {r['operations']:<6} {r['throughput']:<12}")
    
    # Linear regression for validated model
    if len(results) >= 2:
        n = len(results)
        sum_x = sum(r['iterations_requested'] for r in results)
        sum_y = sum(r['actual_duration_s'] for r in results)
        sum_xy = sum(r['iterations_requested'] * r['actual_duration_s'] for r in results)
        sum_xx = sum(r['iterations_requested'] ** 2 for r in results)
        
        per_iter_actual = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x ** 2)
        fixed_overhead_actual = (sum_y - per_iter_actual * sum_x) / n
        
        print("\n" + "=" * 70)
        print("SCALING MODEL VALIDATION")
        print("=" * 70)
        print(f"  Previous Model:  Duration = {PREVIOUS_MODEL['fixed_overhead_s']:.1f}s + (iters * {PREVIOUS_MODEL['per_iter_s']:.2f}s)")
        print(f"  Validated Model: Duration = {fixed_overhead_actual:.1f}s + (iters * {per_iter_actual:.2f}s)")
        
        avg_error = sum(abs(r['projection_error_pct']) for r in results) / len(results)
        print(f"\n  Average Projection Error: {avg_error:.1f}%")
        
        print("\n  UPDATED PROJECTIONS:")
        for target in [10, 15, 25, 50, 100, 250]:
            proj_s = fixed_overhead_actual + (target * per_iter_actual)
            print(f"     {target:>3} iterations: {proj_s:>7.1f}s ({proj_s/60:>5.1f} min)")
        
        # Save results
        with open('/tmp/swarm_perf_results.json', 'w') as f:
            json.dump({'results': results, 'validated_model': {'fixed_overhead_s': fixed_overhead_actual, 'per_iter_s': per_iter_actual}}, f, indent=2)
        print("\nResults saved to /tmp/swarm_perf_results.json")

if __name__ == "__main__":
    main()

