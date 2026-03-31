
import argparse
import json
import os
import sys
from collections import defaultdict
from pathlib import Path

# --- Configuration ---
# Hardcoded for now, ideal later: read from .goalie/config.yaml or similar
TIER1_CIRCLES = ["analyst", "orchestrator", "assessor", "testing"]

def main():
    parser = argparse.ArgumentParser(description="Calculate Tier 1/2/3 Depth Coverage")
    parser.add_argument("--json", action="store_true", help="Output JSON format")
    parser.add_argument("--circle", help="Filter for specific circle")
    parser.add_argument("--tier1-circles", help="Comma-separated list of Tier 1 circles")
    parser.add_argument("--correlation-id", help="Filter metrics by correlation ID")
    args = parser.parse_args()

    circles = args.circle.split(',') if args.circle else []
    tier1_list = args.tier1_circles.split(',') if args.tier1_circles else TIER1_CIRCLES

    results = {}

    # 1. Backlog Schema Compliance (Static Analysis)
    # Checks if circle backlogs exist and have required fields (id, priority, estimate)
    backlog_coverage = {}

    project_root = os.environ.get("PROJECT_ROOT", ".")
    circles_dir = Path(project_root) / "circles"

    # Identify all available circles
    available_circles = [d.name for d in circles_dir.iterdir() if d.is_dir()] if circles_dir.exists() else []

    target_circles = circles if circles else available_circles

    for circle in target_circles:
        backlog_coverage[circle] = {"status": "unknown", "score": 0}

        # Check potential backlog paths
        # Standard: circles/<circle>/<role>/backlog.md or .goalie/backlog.md (global)
        # We'll just look for any backlog.md in the circle specific path for now
        # Actually agentic-flow seems to use a flexible structure.
        # Let's check for 'backlog.md' anywhere inside circles/<circle>

        circle_path = circles_dir / circle
        if not circle_path.exists():
            backlog_coverage[circle] = {"status": "missing_dir", "score": 0}
            continue

        backlogs = list(circle_path.rglob("backlog.md"))
        if not backlogs:
            backlog_coverage[circle] = {"status": "no_backlog", "score": 0}
            continue

        # Parse first found backlog
        bl_file = backlogs[0]
        try:
            content = bl_file.read_text()
            # Simple heuristic checks
            has_id = "<!-- id:" in content or "ID:" in content
            has_priority = "priority" in content.lower()
            has_est = "estimate" in content.lower() or "size" in content.lower()

            score = 0
            if has_id: score += 1
            if has_priority: score += 1
            if has_est: score += 1

            # Normalize to 0-100
            final_score = int((score / 3) * 100)
            backlog_coverage[circle] = {
                "status": "ok" if final_score == 100 else "partial",
                "score": final_score,
                "path": str(bl_file.relative_to(project_root))
            }
        except Exception as e:
            backlog_coverage[circle] = {"status": "error", "error": str(e), "score": 0}

    # 2. Telemetry Coverage (Dynamic Analysis from Metrics)
    # Checks if circles are emitting required patterns
    # Tier 1 Req: full_cycle_complete, action_completed
    telemetry_coverage = {}

    metrics_file = Path(project_root) / ".goalie/pattern_metrics.jsonl"
    collected_patterns = defaultdict(set)

    if metrics_file.exists():
        with open(metrics_file, 'r') as f:
            for line in f:
                try:
                    ev = json.loads(line)
                    c = ev.get('circle')
                    p = ev.get('pattern')
                    cid = ev.get('correlation_id') or ev.get('run_id')

                    if args.correlation_id and str(cid) != str(args.correlation_id):
                        continue

                    if c and p:
                        collected_patterns[c].add(p)
                except:
                    pass

    for circle in target_circles:
        patterns = collected_patterns.get(circle, set())
        has_cycle = 'full_cycle_complete' in patterns
        has_action = 'action_completed' in patterns

        t_score = 0
        if has_cycle: t_score += 50
        if has_action: t_score += 50

        telemetry_coverage[circle] = {
            "score": t_score,
            "patterns_found": list(patterns)
        }

    # Aggregate Results
    for circle in target_circles:
        is_tier1 = circle in tier1_list
        bl = backlog_coverage.get(circle, {})
        tl = telemetry_coverage.get(circle, {})

        bl_score = bl.get("score", 0)
        tl_score = tl.get("score", 0)

        # Combined Maturity Score (50% Backlog, 50% Telemetry)
        total_maturity = (bl_score + tl_score) / 2

        results[circle] = {
            "in_tier1_scope": is_tier1,
            "maturity_score": total_maturity,
            "backlog_health": bl,
            "telemetry_health": tl
        }

    if args.json:
        print(json.dumps(results, indent=2))
    else:
        print("\n# Tier & Depth Coverage Report\n")
        print(f"| Circle | Tier 1? | Maturity | Backlog | Telemetry |")
        print(f"|--------|---------|----------|---------|-----------|")
        for c, data in results.items():
            print(f"| {c} | {data['in_tier1_scope']} | {data['maturity_score']:.1f}% | {data['backlog_health'].get('score')}% | {data['telemetry_health'].get('score')}% |")

        print("\n## Details")
        for c, data in results.items():
            if data['maturity_score'] < 100:
                print(f"- **{c}**: Backlog Status: {data['backlog_health'].get('status')}; Patterns: {data['telemetry_health'].get('patterns_found')}")

if __name__ == "__main__":
    main()
