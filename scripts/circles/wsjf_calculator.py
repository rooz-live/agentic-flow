import sys
import os
import re
import argparse
import time
from datetime import datetime, timedelta
from typing import Dict

# --- Configuration ---
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.join(PROJECT_ROOT, "scripts"))
from agentic.pattern_logger import PatternLogger

# Initialize Logger (global for now, enriched in main)
logger = None

# --- Adaptive Schema Configuration ---
TIERS = {
    # Tier 1: High Structure (Flow-Critical)
    "orchestrator": 1,
    "assessor": 1,

    # Tier 2: Medium Structure (Learning/Discovery)
    "analyst": 2,
    "innovator": 2,
    "seeker": 2,

    # Tier 3: Flexible (Sensemaking)
    "intuitive": 3,
    "facilitator": 3,
    "scout": 3,
    "synthesizer": 3
}

TIER_3_ROLES = ["facilitator", "scout", "synthesizer"]

# --- Circle-Specific WSJF Weights ---
# REBALANCED to reduce innovator dominance (was 54.6%) and increase assessor activity (was 8%)
# Target: No single circle should exceed 40% of total activity
CIRCLE_WEIGHTS = {
    "orchestrator": {"ubv": 1.5, "tc": 1.2, "rr": 1.3},  # High urgency coordination
    "analyst": {"ubv": 1.2, "tc": 1.5, "rr": 1.2},      # BOOSTED: Data-driven, time-sensitive
    "innovator": {"ubv": 0.8, "tc": 0.6, "rr": 1.0},   # REDUCED: Was causing 54.6% dominance
    "intuitive": {"ubv": 1.8, "tc": 1.0, "rr": 1.1},   # User value focus
    "assessor": {"ubv": 1.5, "tc": 1.3, "rr": 2.5},    # BOOSTED: Risk mitigation priority (was only 8%)
    "seeker": {"ubv": 1.1, "tc": 0.9, "rr": 1.2},      # BOOSTED: Discovery, more weight
}

def get_circle_weights(circle: str) -> Dict[str, float]:
    """Get WSJF component weights for a specific circle."""
    return CIRCLE_WEIGHTS.get(circle.lower(), {"ubv": 1.0, "tc": 1.0, "rr": 1.0})

def calculate_time_decay(created_date_str: str) -> float:
    """
    Calculate time decay factor for WSJF scores based on item age.
    Items get progressively deprioritized as they age:
    - Fresh (0-7 days): 1.0 (no decay)
    - Stale (7-14 days): 0.8 (20% decay)
    - Very stale (14-30 days): 0.6 (40% decay)
    - Ancient (>30 days): 0.4 (60% decay)
    """
    if not created_date_str:
        return 1.0  # No date = assume recent

    try:
        # Parse date from common formats
        for fmt in ["%Y-%m-%d", "%Y/%m/%d", "%m/%d/%Y", "%d/%m/%Y"]:
            try:
                created_date = datetime.strptime(created_date_str, fmt)
                break
            except ValueError:
                continue
        else:
            return 1.0  # Couldn't parse, assume recent

        age_days = (datetime.now() - created_date).days

        if age_days > 30:
            return 0.4
        elif age_days > 14:
            return 0.6
        elif age_days > 7:
            return 0.8
        return 1.0
    except:
        return 1.0  # Error in parsing, assume recent

def get_tier(circle, role_name=None):
    if role_name and role_name.lower() in TIER_3_ROLES:
        return 3
    if not circle: return 2
    return TIERS.get(circle.lower(), 2)

def validate_schema(line, metrics, tier):
    """
    Validates if the task line meets the schema requirements for the given tier.
    Returns a list of warnings.
    """
    warnings = []

    # Check 1: WSJF Score Presence
    if metrics['wsjf'] == 0:
        if tier == 1:
            warnings.append("Missing WSJF/CoD components")
        elif tier == 2:
            warnings.append("Missing WSJF score (Emergent?)")

    elif tier == 2:
        # Tier 2: Hypothesis-Driven (Medium Structure)
        if "Hypothesis" not in line and "DoR" not in line:
             warnings.append("Missing Hypothesis/DoR")
        if "Result" not in line and "DoD" not in line:
             warnings.append("Missing Result/DoD")

    # Check 2: Method Pattern / Structure
    if tier == 1:
        # Tier 1 requires rigorous fields (DoR, DoD, Pattern)
        if "DoR" not in line and "Definition of Ready" not in line:
            warnings.append("Missing DoR")
        if "DoD" not in line and "Definition of Done" not in line:
            warnings.append("Missing DoD")
        # Check for Method Pattern tags or text
        if not re.search(r'Pattern:|#pattern:', line, re.IGNORECASE):
            warnings.append("Missing Method Pattern")

    elif tier == 3:
        # Tier 3 uses flexible tags
        if not re.search(r'#\w+:', line):
            warnings.append("Missing Context Tags (e.g. #pattern:X)")

    return warnings

def parse_wsjf_params(line, circle=None, apply_weights=False, apply_decay=False):
    # Search for patterns like (UBV: 5, TC: 3, RR: 2, Size: 1)
    params = {}

    # Defaults
    ubv = 0
    tc = 0
    rr = 0
    size = 1
    created_date = None

    # Table-based extraction (if applicable)
    is_table = line.strip().startswith("|")
    if is_table:
        cols = [c.strip() for c in line.split("|")]
        # Tier 1 check (10+ columns)
        if len(cols) >= 11:
            try:
                # Cols: 0(empty), 1(ID), 2(Task), 3(Status), 4(Budget), 5(Pattern), 6(DoR), 7(DoD), 8(CoD), 9(Size), 10(WSJF)
                if cols[8] and cols[8].isdigit(): ubv = int(cols[8]) # Fallback: treat CoD as UBV if others missing
                if cols[9] and cols[9].isdigit(): size = int(cols[9])
            except: pass
        # Tier 2 check (6+ columns)
        elif len(cols) >= 7:
             pass # No CoD/Size columns in Tier 2 table by default

    # Regex extraction (overrides or supplements table)
    ubv_match = re.search(r'(?:UBV|User Business Value):\s*(\d+)', line, re.IGNORECASE)
    if ubv_match: ubv = int(ubv_match.group(1))

    tc_match = re.search(r'(?:TC|Time Criticality):\s*(\d+)', line, re.IGNORECASE)
    if tc_match: tc = int(tc_match.group(1))

    rr_match = re.search(r'(?:RR|RROE|Risk Reduction):\s*(\d+)', line, re.IGNORECASE)
    if rr_match: rr = int(rr_match.group(1))

    size_match = re.search(r'(?:Size|Job Size):\s*(\d+)', line, re.IGNORECASE)
    if size_match: size = int(size_match.group(1))

    # Extract creation date if present (format: Created: YYYY-MM-DD)
    date_match = re.search(r'Created:\s*([\d/-]+)', line, re.IGNORECASE)
    if date_match:
        created_date = date_match.group(1)

    # Apply circle-specific weights if requested
    if apply_weights and circle:
        weights = get_circle_weights(circle)
        ubv = ubv * weights["ubv"]
        tc = tc * weights["tc"]
        rr = rr * weights["rr"]

    # Tag-based extraction for Tier 3 (e.g., #wsjf:13)
    tag_wsjf = re.search(r'#wsjf:([\d.]+)', line, re.IGNORECASE)
    if tag_wsjf:
        wsjf = float(tag_wsjf.group(1))
        cod = wsjf * size # Reverse engineer approx CoD
    else:
        cod = ubv + tc + rr
        wsjf = round(cod / size, 2) if size > 0 else 0

    # Apply time decay if requested
    if apply_decay and created_date:
        decay_factor = calculate_time_decay(created_date)
        wsjf = round(wsjf * decay_factor, 2)

    return {
        "ubv": ubv, "tc": tc, "rr": rr, "size": size, "cod": cod,
        "wsjf": wsjf, "created_date": created_date
    }

def enrich_line_with_wsjf(line, metrics, tier):
    """Add or update CoD/WSJF annotations in task line."""
    is_table = line.strip().startswith("|")

    if is_table:
        cols = [c.strip() for c in line.split("|")]
        # Tier 1: Update columns 8 (CoD) and 10 (WSJF)
        if tier == 1 and len(cols) >= 11:
            cols[8] = str(metrics['cod'])
            cols[10] = str(metrics['wsjf'])
            return " | ".join(cols).strip() + "\n"
        # Tier 2: Update column 6 (WSJF)
        elif tier == 2 and len(cols) >= 7:
            cols[6] = str(metrics['wsjf'])
            return " | ".join(cols).strip() + "\n"
        # Tier 3 can sometimes have tables (legacy), but usually list items

    # Checkbox lists / Tag-based fallback
    line = re.sub(r'\(CoD:\s*\d+,\s*WSJF:\s*[\d.]+\)', '', line)
    line = re.sub(r'#wsjf:[\d.]+', '', line)

    if tier == 1:
        annotation = f" (CoD: {metrics['cod']}, WSJF: {metrics['wsjf']})"
    elif tier == 2:
        annotation = f" (WSJF: {metrics['wsjf']})"
    else:
        annotation = f" #wsjf:{metrics['wsjf']}"

    return line.rstrip() + annotation + "\n"

def process_backlog(file_path, circle, auto_calc=False, aggregate=False, apply_weights=False, apply_decay=False, sort_by_wsjf=False):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    start_time = time.time()

    role_name = os.path.basename(os.path.dirname(file_path))
    tier = get_tier(circle, role_name)
    print(f"📊 Adaptive Schema: Applying Tier {tier} rules for '{circle}' (Role: {role_name})")

    with open(file_path, 'r') as f:
        lines = f.readlines()

    tasks = []
    updated_lines = []
    modified = False

    for idx, line in enumerate(lines):
        # Detect task lines: checkbox lists OR table rows with task data
        is_task_line = (line.strip().startswith("- [ ]") or
                       line.strip().startswith("- [x]") or
                       (line.strip().startswith("|") and "FLOW-" in line and "PENDING" in line))

        if is_task_line:
            metrics = parse_wsjf_params(line, circle=circle, apply_weights=apply_weights, apply_decay=apply_decay)

            # Auto-calculate missing WSJF if enabled
            if auto_calc and metrics['wsjf'] == 0:
                # Use depth-aware defaults based on tier
                if tier == 1:
                    # Flow-critical: assume medium values
                    metrics['ubv'] = 5
                    metrics['tc'] = 3
                    metrics['rr'] = 2
                    metrics['size'] = 2
                elif tier == 2:
                    # Learning/discovery: lower values
                    metrics['ubv'] = 3
                    metrics['tc'] = 2
                    metrics['rr'] = 1
                    metrics['size'] = 1
                else:
                    # Flexible: minimal values
                    metrics['ubv'] = 2
                    metrics['tc'] = 1
                    metrics['rr'] = 1
                    metrics['size'] = 1

                metrics['cod'] = metrics['ubv'] + metrics['tc'] + metrics['rr']
                metrics['wsjf'] = round(metrics['cod'] / metrics['size'], 2) if metrics['size'] > 0 else 0

                # Enrich the line
                line = enrich_line_with_wsjf(line, metrics, tier)
                modified = True

            warnings = validate_schema(line, metrics, tier)

            tasks.append({
                "line": line,
                "original_idx": idx,
                "metrics": metrics,
                "warnings": warnings
            })
            updated_lines.append(line)
        else:
            updated_lines.append(line)

    # Write back to file if modified
    if modified and auto_calc:
        with open(file_path, 'w') as f:
            f.writelines(updated_lines)
        print(f"✅ Updated {len([t for t in tasks if t['metrics']['wsjf'] > 0])} tasks with auto-calculated WSJF")

    # Log to PatternLogger if initialized
    if logger:
        # Ensure minimum 1ms duration to distinguish from "not measured"
        duration_ms = max(1, int((time.time() - start_time) * 1000))
        # Log summary event
        logger.log(
            pattern_name="wsjf_prioritization",
            data={
                "file": os.path.basename(file_path),
                "total_tasks": len(tasks),
                "modified_count": len([t for t in tasks if t.get('metrics', {}).get('wsjf', 0) > 0]),
                "top_wsjf": tasks[0]['metrics']['wsjf'] if tasks else 0,
                "action": "prioritize",
                "duration_ms": duration_ms,
                "duration_measured": True,
            },
            gate="governance",
            behavioral_type="advisory",
            economic={
                "cod": sum(t['metrics']['cod'] for t in tasks),
                "wsjf_score": sum(t['metrics']['wsjf'] for t in tasks) / len(tasks) if tasks else 0
            },
            run_type="wsjf_calculator"
        )

        # Log individual item details for forensic audit (only top items to avoid spam)
        for t in tasks[:5]:
             # Extract ID if present (e.g. | FLOW-R-123 | ...)
             item_id_match = re.search(r'\|\s*(FLOW-[A-Z0-9-]+)\s*\|', t['line'])
             item_id = item_id_match.group(1) if item_id_match else None

             logger.log(
                pattern_name="backlog_item_scored",
                data={
                    "item_id": item_id,
                    "desc": t['line'].split('|')[2].strip() if '|' in t['line'] else t['line'].strip()[:50],
                    "rank": tasks.index(t) + 1,
                    "duration_ms": duration_ms,
                    "duration_measured": True,
                },
                gate="governance",
                behavioral_type="observability",
                backlog_item=item_id,
                economic={
                    "wsjf_score": t['metrics']['wsjf'],
                    "cod": t['metrics']['cod'],
                    "size": t['metrics']['size'],
                    "ubv": t['metrics']['ubv'],
                    "tc": t['metrics']['tc'],
                    "rr": t['metrics']['rr']
                },
                run_type="wsjf_calculator"
             )

        # OBS-2: Log interpretability for WSJF prioritization decisions
        if tasks:
            top_task = tasks[0]
            total_cod = sum(t['metrics']['cod'] for t in tasks)
            # Calculate feature attribution based on relative contribution
            logger.log_interpretability(
                circle=circle,
                model_type="wsjf_prioritizer_v1",
                explanation_type="prioritization_decision",
                top_features=["ubv", "tc", "rr", "size", "time_decay"],
                attribution={
                    "ubv": top_task['metrics']['ubv'] / max(top_task['metrics']['cod'], 1),
                    "tc": top_task['metrics']['tc'] / max(top_task['metrics']['cod'], 1),
                    "rr": top_task['metrics']['rr'] / max(top_task['metrics']['cod'], 1),
                    "size_impact": 1.0 / max(top_task['metrics']['size'], 0.1),
                    "circle_weight": 0.15
                },
                confidence=0.85,
                duration_ms=duration_ms
            )

    # Sort tasks by WSJF descending
    tasks.sort(key=lambda x: x['metrics']['wsjf'], reverse=True)

    # Write sorted backlog if requested
    if sort_by_wsjf:
        # Reconstruct file with sorted tasks while preserving headers
        sorted_lines = []
        task_lines_added = False

        for line in updated_lines:
            # Detect task lines
            is_task = (line.strip().startswith("- [ ]") or
                      line.strip().startswith("- [x]") or
                      (line.strip().startswith("|") and "FLOW-" in line and "PENDING" in line))

            # Preserve non-task lines (headers, table separators, comments)
            if not is_task:
                sorted_lines.append(line)
            elif not task_lines_added:
                # Insert sorted tasks after header
                for task in tasks:
                    sorted_lines.append(task['line'])
                task_lines_added = True

        with open(file_path, 'w') as f:
            f.writelines(sorted_lines)
        print(f"✅ Sorted {len(tasks)} items by WSJF (descending)")

    # Output Priorities
    print(f"\n--- Top WSJF Priorities for {os.path.basename(file_path)} ---")
    for t in tasks[:10]:
        m = t['metrics']
        clean_line = t['line'].strip().split('(')[0] # Truncate for display

        warn_str = ""
        if t['warnings']:
            warn_str = f" ⚠️  {','.join(t['warnings'])}"

        print(f"[{m['wsjf']}] {clean_line[:60]}... (CoD: {m['cod']} / Size: {m['size']}){warn_str}")

    # Aggregate metrics if requested
    if aggregate:
        total_cod = sum(t['metrics']['cod'] for t in tasks)
        avg_wsjf = sum(t['metrics']['wsjf'] for t in tasks) / len(tasks) if tasks else 0
        print(f"\n📈 Aggregate Metrics: Total CoD: {total_cod}, Avg WSJF: {avg_wsjf:.2f}, Tasks: {len(tasks)}")

    return tasks

def main():
    global logger
    parser = argparse.ArgumentParser()
    parser.add_argument("file", help="Path to backlog.md")
    parser.add_argument("--circle", help="Circle name for schema validation")
    parser.add_argument("--auto-calc-wsjf", action="store_true", help="Auto-calculate missing WSJF scores")
    parser.add_argument("--aggregate", action="store_true", help="Show aggregate metrics")
    parser.add_argument("--apply-weights", action="store_true", help="Apply circle-specific WSJF weights")
    parser.add_argument("--apply-decay", action="store_true", help="Apply time decay to WSJF scores")
    parser.add_argument("--sort", action="store_true", help="Sort backlog by WSJF descending and write back to file")
    parser.add_argument("--tenant-id", help="Tenant ID for multi-tenant context", default="default")
    args = parser.parse_args()

    # Initialize Logger
    logger = PatternLogger(
        mode="advisory",
        circle=args.circle or "unknown",
        run_id=f"wsjf-{int(time.time())}",
        tenant_id=args.tenant_id,
        tenant_platform="agentic-flow-core"
    )

    if args.apply_weights:
        print(f"🎯 Applying circle-specific weights for '{args.circle}'")
        weights = get_circle_weights(args.circle) if args.circle else {"ubv": 1.0, "tc": 1.0, "rr": 1.0}
        print(f"   Weights: UBV={weights['ubv']}x, TC={weights['tc']}x, RR={weights['rr']}x")

    if args.apply_decay:
        print("⏰ Applying time decay to WSJF scores (items >7 days get reduced priority)")

    process_backlog(args.file, args.circle, args.auto_calc_wsjf, args.aggregate, args.apply_weights, args.apply_decay, args.sort)

if __name__ == "__main__":
    main()
