#!/usr/bin/env python3
"""
Replenish Manager
Parses insights from docs/QUICK_WINS.md and replenishes circle backlogs.
Supports Tiered Schemas and Auto-Calculation of WSJF/CoD.
"""

import os
import sys
import re
import argparse
import time
import random

# --- Configuration ---
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.join(PROJECT_ROOT, "scripts"))
from agentic.pattern_logger import PatternLogger

QUICK_WINS_FILE = os.path.join(PROJECT_ROOT, "docs", "QUICK_WINS.md")

# Initialize Logger
logger = PatternLogger(mode="mutate")

# Tier Definitions
TIER_1_CIRCLES = ["orchestrator", "assessor"]
TIER_2_CIRCLES = ["analyst", "innovator", "seeker"]
TIER_3_CIRCLES = ["intuitive"]
TIER_3_ROLES = ["facilitator", "scout", "synthesizer"]

def get_role_tier(circle, role_name):
    circle = circle.lower()
    role_name = role_name.lower()
    
    if role_name in TIER_3_ROLES:
        return 3
    if circle in TIER_1_CIRCLES:
        return 1
    if circle in TIER_2_CIRCLES:
        return 2
    if circle in TIER_3_CIRCLES:
        return 3
    return 2 # Default to Medium Structure

def get_header(tier):
    """Returns the Markdown header for the given Tier."""
    if tier == 1:
        return (
            "| ID | Task | Status | Budget | Method Pattern | DoR | DoD | CoD | Size | WSJF |\n"
            "|---|---|---|---|---|---|---|---|---|---|"
        )
    elif tier == 2:
        return (
            "| ID | Task | Status | DoR (Hypothesis) | DoD (Result) | WSJF |\n"
            "|---|---|---|---|---|---|"
        )
    else: # Tier 3
        return "# Backlog"

def ensure_backlog_header(file_path, tier):
    """Ensures the backlog file exists and has the correct header."""
    header = get_header(tier)
    
    if not os.path.exists(file_path):
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'w') as f:
            f.write(header + "\n")
        return True # Created
        
    # Check if empty or missing header
    with open(file_path, 'r') as f:
        content = f.read()
        
    if not content.strip():
        with open(file_path, 'w') as f:
            f.write(header + "\n")
        return True
        
    # If Tier 1 or 2, check if table header exists
    if tier in [1, 2]:
        first_line_header = header.split('\n')[0]
        if first_line_header not in content:
            # Prepend header? Or just warn?
            # Prepending might break frontmatter if it existed, but here we assume simple md
            print(f"    ⚠️  Missing schema header in {os.path.basename(file_path)}. Prepending...")
            with open(file_path, 'w') as f:
                f.write(header + "\n" + content)
            return True
            
    return False

def determine_best_role(insight_desc, circle):
    """Determines the best role for an insight based on keywords and circle context."""
    desc_lower = insight_desc.lower()
    
    # Role-specific keyword mappings
    role_keywords = {
        "Owner": ["strategy", "governance", "policy", "architecture", "overall", "system-wide"],
        "Analyst": ["analysis", "metrics", "measurement", "data", "report", "insight"],
        "Engineer": ["implement", "build", "code", "fix", "technical", "bug", "api"],
        "QA": ["test", "quality", "verification", "validation", "coverage"],
        "DevOps": ["deploy", "infrastructure", "ci/cd", "pipeline", "automation", "monitoring"],
        "Security": ["security", "vulnerability", "compliance", "audit", "encryption"],
        "Facilitator": ["process", "workflow", "coordination", "team", "collaboration"],
        "Scout": ["research", "explore", "discover", "investigate", "evaluate"],
        "Synthesizer": ["integrate", "consolidate", "combine", "unify", "merge"]
    }
    
    # Score each role
    role_scores = {}
    for role, keywords in role_keywords.items():
        score = sum(1 for kw in keywords if kw in desc_lower)
        if score > 0:
            role_scores[role] = score
    
    # Return highest scoring role, default to Owner if no matches
    if role_scores:
        return max(role_scores.items(), key=lambda x: x[1])[0]
    return "Owner"  # Default fallback

def find_role_backlog(circle, role_name):
    """Finds the backlog for a specific role in a circle."""
    circle_dir = os.path.join(PROJECT_ROOT, "circles", circle)
    if not os.path.exists(circle_dir):
        for d in os.listdir(os.path.join(PROJECT_ROOT, "circles")):
            if d.lower() == circle.lower():
                circle_dir = os.path.join(PROJECT_ROOT, "circles", d)
                break
    
    # Get all backlogs first
    all_backlogs = []
    for root, dirs, files in os.walk(circle_dir):
        if "backlog.md" in files:
            all_backlogs.append(os.path.join(root, "backlog.md"))
    
    # Search for exact role match (case-insensitive)
    for backlog_path in all_backlogs:
        current_role = os.path.basename(os.path.dirname(backlog_path))
        if current_role.lower() == role_name.lower():
            return backlog_path
    
    # Fallback 1: find any backlog with role name in path
    for backlog_path in all_backlogs:
        if role_name.lower() in backlog_path.lower():
            return backlog_path
    
    # Fallback 2: if looking for Owner, use circle-named backlog or chief role
    if role_name.lower() == "owner":
        # Try circle-as-chief pattern
        for backlog_path in all_backlogs:
            dirname = os.path.basename(os.path.dirname(backlog_path))
            if "chief" in dirname.lower() or circle.lower() in dirname.lower():
                return backlog_path
    
    # Fallback 3: Return first available backlog as last resort
    if all_backlogs:
        return all_backlogs[0]
    
    return None

def parse_wsjf_from_line(line):
    """Extracts WSJF params from a line string."""
    params = {"ubv": 0, "tc": 0, "rr": 0, "size": 1, "has_explicit_values": False}
    
    ubv_match = re.search(r'(?:UBV|User Business Value):\s*(\d+)', line, re.IGNORECASE)
    if ubv_match: 
        params['ubv'] = int(ubv_match.group(1))
        params['has_explicit_values'] = True
    
    tc_match = re.search(r'(?:TC|Time Criticality):\s*(\d+)', line, re.IGNORECASE)
    if tc_match: 
        params['tc'] = int(tc_match.group(1))
        params['has_explicit_values'] = True
    
    rr_match = re.search(r'(?:RR|RROE|Risk Reduction):\s*(\d+)', line, re.IGNORECASE)
    if rr_match: 
        params['rr'] = int(rr_match.group(1))
        params['has_explicit_values'] = True
    
    size_match = re.search(r'(?:Size|Job Size):\s*(\d+)', line, re.IGNORECASE)
    if size_match: 
        params['size'] = int(size_match.group(1))
        params['has_explicit_values'] = True
    
    if params['has_explicit_values']:
        cod = params['ubv'] + params['tc'] + params['rr']
        wsjf = round(cod / params['size'], 1) if params['size'] > 0 else cod
        params['cod'] = cod
        params['wsjf'] = wsjf
    
    return params

def find_backlogs(circle, aggregate=False):
    """Finds target backlog files for a circle."""
    circle_dir = os.path.join(PROJECT_ROOT, "circles", circle)
    if not os.path.exists(circle_dir):
        # Try finding case-insensitive
        for d in os.listdir(os.path.join(PROJECT_ROOT, "circles")):
            if d.lower() == circle.lower():
                circle_dir = os.path.join(PROJECT_ROOT, "circles", d)
                break
    
    targets = []
    if not os.path.exists(circle_dir):
        return targets

    for root, dirs, files in os.walk(circle_dir):
        if "backlog.md" in files:
            role_name = os.path.basename(root) # Parent dir is role name
            # Heuristic: Filter for operational/lead roles if not aggregating
            if not aggregate:
                # Try to find the "Primary" role (usually matches circle name or is 'Analyst' in analyst circle)
                # This is tricky without explicit metadata. 
                # Simplification: If role name contains Circle name (ignoring case)
                if circle.lower() in role_name.lower():
                    targets.append(os.path.join(root, "backlog.md"))
            else:
                targets.append(os.path.join(root, "backlog.md"))
    
    # If no primary found in non-aggregate mode, return the first one found (fallback)
    if not aggregate and not targets:
        for root, dirs, files in os.walk(circle_dir):
            if "backlog.md" in files:
                targets.append(os.path.join(root, "backlog.md"))
                break # Just one
                
    return targets

def auto_estimate_cod(task_desc, existing_params=None):
    """
    Auto-estimate Cost of Delay (CoD) components from task description.
    Uses keyword analysis and heuristics when explicit values not provided.
    
    Returns dict with ubv, tc, rr, size, cod, wsjf, and confidence score.
    """
    # Start with existing params or defaults
    if existing_params:
        params = existing_params.copy()
    else:
        params = {"ubv": 0, "tc": 0, "rr": 0, "size": 1}
    
    # If explicit values provided, use them
    if params.get('has_explicit_values', False):
        if 'cod' not in params or 'wsjf' not in params:
            params['cod'] = params['ubv'] + params['tc'] + params['rr']
            params['wsjf'] = round(params['cod'] / params['size'], 1) if params['size'] > 0 else params['cod']
        params['confidence'] = 1.0  # Explicit values = high confidence
        return params
    
    # Auto-estimate from keywords
    desc_lower = task_desc.lower()
    
    # Base defaults for learning/discovery work
    ubv = 3
    tc = 3
    rr = 3
    size = 1
    confidence = 0.5  # Medium confidence for auto-estimates
    
    # USER BUSINESS VALUE (UBV) indicators
    if any(kw in desc_lower for kw in ['user', 'customer', 'client', 'ux', 'ui', 'experience']):
        ubv += 3
        confidence += 0.1
    if any(kw in desc_lower for kw in ['revenue', 'profit', 'cost savings', 'monetize']):
        ubv += 4
        confidence += 0.15
    if any(kw in desc_lower for kw in ['pain point', 'frustration', 'complaint']):
        ubv += 2
    
    # TIME CRITICALITY (TC) indicators
    if any(kw in desc_lower for kw in ['critical', 'urgent', 'blocker', 'blocking', 'asap', 'now']):
        tc += 5
        confidence += 0.15
    if any(kw in desc_lower for kw in ['deadline', 'time-sensitive', 'expires']):
        tc += 3
        confidence += 0.1
    if any(kw in desc_lower for kw in ['slow', 'performance', 'latency', 'timeout']):
        tc += 2
    if any(kw in desc_lower for kw in ['dependency', 'unblocks', 'prerequisite']):
        tc += 2
    
    # RISK REDUCTION (RR) indicators
    if any(kw in desc_lower for kw in ['security', 'vulnerability', 'exploit', 'breach', 'cve']):
        rr += 6
        confidence += 0.2
    if any(kw in desc_lower for kw in ['risk', 'compliance', 'audit', 'regulatory']):
        rr += 4
        confidence += 0.15
    if any(kw in desc_lower for kw in ['bug', 'error', 'failure', 'crash', 'outage']):
        rr += 3
        confidence += 0.1
    if any(kw in desc_lower for kw in ['debt', 'technical debt', 'refactor', 'cleanup']):
        rr += 2
    if any(kw in desc_lower for kw in ['test', 'validation', 'verification', 'quality']):
        rr += 2
    
    # SIZE estimation (inverse - higher size = more effort)
    word_count = len(task_desc.split())
    if word_count > 50 or any(kw in desc_lower for kw in ['migrate', 'refactor', 'redesign', 'overhaul']):
        size = 5
    elif word_count > 30 or any(kw in desc_lower for kw in ['implement', 'build', 'create', 'integrate']):
        size = 3
    elif word_count > 15 or any(kw in desc_lower for kw in ['add', 'update', 'modify', 'enhance']):
        size = 2
    else:
        size = 1  # Small/quick task
    
    # Cap values at reasonable ranges
    ubv = min(ubv, 10)
    tc = min(tc, 10)
    rr = min(rr, 10)
    confidence = min(confidence, 0.9)  # Never 100% confident on auto-estimates
    
    params.update({
        "ubv": ubv,
        "tc": tc,
        "rr": rr,
        "size": size,
        "cod": ubv + tc + rr,
        "wsjf": round((ubv + tc + rr) / size, 1),
        "confidence": confidence,
        "auto_estimated": True
    })
    
    return params

def format_item(tier, task_desc, params, method_pattern="TDD"):
    """Formats the backlog item string based on Tier. Returns (formatted_line, item_id)."""
    item_id = f"FLOW-R-{int(time.time())}-{random.randint(100,999)}"
    
    if tier == 1:
        # | ID | Task | Status | Budget | Method Pattern | DoR | DoD | CoD | Size | WSJF |
        line = f"| {item_id} | {task_desc} | PENDING | OpEx | {method_pattern} | None | [ ] Verified | {params['cod']} | {params['size']} | {params['wsjf']} |"
    elif tier == 2:
        # | ID | Task | Status | DoR | DoD | WSJF |
        line = f"| {item_id} | {task_desc} | PENDING | None | [ ] Verified | {params['wsjf']} |"
    else: # Tier 3
        # - [ ] #pattern:X #wsjf:Y Task description
        line = f"- [ ] #pattern:{method_pattern} #wsjf:{params['wsjf']} {task_desc}"
    
    return line, item_id

def replenish(circle, auto_calc=True, aggregate=False, deduplicate=True):
    print(f"🔄 Replenishing {circle} (Aggregate: {aggregate}, Deduplicate: {deduplicate})...")
    
    # 1. Read Insights (Inbox Only)
    insights = []
    if os.path.exists(QUICK_WINS_FILE):
        with open(QUICK_WINS_FILE, 'r') as f:
            lines = f.readlines()
            
        in_inbox = False
        for line in lines:
            if "## 📥 Inbox" in line:
                in_inbox = True
                continue
            if in_inbox and line.startswith("##"):
                in_inbox = False
                break # End of Inbox
                
            if in_inbox and "Source:retro" in line and "- [ ]" in line:
                # Ignore HTML comments
                if line.strip().startswith("<!--"):
                    continue

                # Parse description
                clean_desc = line.split("Source:retro")[0].replace("- [ ]", "").strip()
                clean_desc = clean_desc.replace("**", "")
                
                # Parse existing params if any, then auto-estimate if needed
                params = parse_wsjf_params(line)
                if auto_calc:
                    # Auto-estimate CoD if not explicitly provided
                    params = auto_estimate_cod(clean_desc, params)
                insights.append({"desc": clean_desc, "params": params, "raw": line.strip()})
    
    if not insights:
        print("  ℹ️  No new 'Source:retro' insights found in Inbox.")
        return

    # 2. Find Targets with Deduplication Support
    if deduplicate and aggregate:
        # Smart routing: each insight goes to best-fit role only
        print(f"  🎯 Using intelligent routing for {len(insights)} insights...")
        backlogs = None  # Will determine per-insight
    else:
        # Legacy behavior: all insights to all backlogs (or primary)
        backlogs = find_backlogs(circle, aggregate)
        if not backlogs:
            print(f"  ❌ No backlogs found for circle {circle}")
            return
        print(f"  🎯 Found {len(backlogs)} target backlog(s).")

    # 3. Process with Smart Routing
    items_processed = []
    
    if deduplicate and aggregate:
        # Deduplicated mode: Route each insight to best-fit role only
        for insight in insights:
            # Determine best role
            best_role = determine_best_role(insight['desc'], circle)
            backlog_path = find_role_backlog(circle, best_role)
            
            if not backlog_path:
                print(f"    ⚠️  No backlog found for {best_role}, skipping: {insight['desc'][:50]}...")
                continue
            
            role_name = os.path.basename(os.path.dirname(backlog_path))
            tier = get_role_tier(circle, role_name)
            
            # Enforce Schema Header
            ensure_backlog_header(backlog_path, tier)
            
            # Read current backlog to avoid dupes
            current_content = ""
            if os.path.exists(backlog_path):
                with open(backlog_path, 'r') as f:
                    current_content = f.read()
            
            # Check for dupe
            if insight['desc'] in current_content:
                if insight not in items_processed:
                    items_processed.append(insight)
                continue
            
            # Format and add
            formatted_line, item_id = format_item(tier, insight['desc'], insight['params'])
            
            # Show confidence if auto-estimated
            confidence_str = ""
            if insight['params'].get('auto_estimated'):
                conf_pct = int(insight['params'].get('confidence', 0.5) * 100)
                confidence_str = f" [Auto-est: {conf_pct}% conf]"
            
            print(f"    ✨ Routing to {role_name}: {insight['desc'][:50]}... (Tier {tier}, WSJF {insight['params']['wsjf']}){confidence_str}")
            
            # Append to backlog
            with open(backlog_path, 'a') as f:
                if current_content and not current_content.endswith('\n'):
                    f.write('\n')
                f.write(formatted_line + "\n")
            
            # Log forensic audit event
            logger.log(
                pattern_name="backlog_replenishment",
                data={
                    "role": role_name,
                    "tier": tier,
                    "desc": insight['desc'][:100],
                    "source": "replenish_manager",
                    "action": "create_item",
                    "auto_estimated": insight['params'].get('auto_estimated', False),
                    "estimation_confidence": insight['params'].get('confidence', 1.0),
                    "routing_mode": "deduplicated"
                },
                gate="governance",
                behavioral_type="enforcement",
                backlog_item=item_id,
                economic={
                    "wsjf_score": float(insight['params'].get('wsjf', 0)),
                    "cod": float(insight['params'].get('cod', 0)),
                    "size": float(insight['params'].get('size', 1)),
                    "ubv": float(insight['params'].get('ubv', 0)),
                    "tc": float(insight['params'].get('tc', 0)),
                    "rr": float(insight['params'].get('rr', 0))
                },
                run_type="replenishment"
            )
            
            items_processed.append(insight)
    
    else:
        # Legacy mode: Add all insights to all backlogs (or primary)
        for backlog_path in backlogs:
            role_name = os.path.basename(os.path.dirname(backlog_path))
            tier = get_role_tier(circle, role_name)
            
            # Enforce Schema Header
            ensure_backlog_header(backlog_path, tier)
            
            # Read current backlog to avoid dupes
            current_content = ""
            if os.path.exists(backlog_path):
                with open(backlog_path, 'r') as f:
                    current_content = f.read()
            
            added_count = 0
            new_items = []
            
            for insight in insights:
                # Check for dupe
                if insight['desc'] in current_content:
                    if insight not in items_processed:
                        items_processed.append(insight)
                    continue
                
                # Format
                formatted_line, item_id = format_item(tier, insight['desc'], insight['params'])
                new_items.append(formatted_line)
                added_count += 1
                
                # Show confidence if auto-estimated
                confidence_str = ""
                if insight['params'].get('auto_estimated'):
                    conf_pct = int(insight['params'].get('confidence', 0.5) * 100)
                    confidence_str = f" [Auto-est: {conf_pct}% conf]"
                
                print(f"    ✨ Adding to {role_name}: {insight['desc'][:50]}... (Tier {tier}, WSJF {insight['params']['wsjf']}){confidence_str}")
                
                # Log forensic audit event
                logger.log(
                    pattern_name="backlog_replenishment",
                    data={
                        "role": role_name,
                        "tier": tier,
                        "desc": insight['desc'][:100],
                        "source": "replenish_manager",
                        "action": "create_item",
                        "auto_estimated": insight['params'].get('auto_estimated', False),
                        "estimation_confidence": insight['params'].get('confidence', 1.0),
                        "routing_mode": "broadcast"
                    },
                    gate="governance",
                    behavioral_type="enforcement",
                    backlog_item=item_id,
                    economic={
                        "wsjf_score": float(insight['params'].get('wsjf', 0)),
                        "cod": float(insight['params'].get('cod', 0)),
                        "size": float(insight['params'].get('size', 1)),
                        "ubv": float(insight['params'].get('ubv', 0)),
                        "tc": float(insight['params'].get('tc', 0)),
                        "rr": float(insight['params'].get('rr', 0))
                    },
                    run_type="replenishment"
                )
                
                # Mark as processed
                if insight not in items_processed:
                    items_processed.append(insight)
            
            if new_items:
                with open(backlog_path, 'a') as f:
                    if current_content and not current_content.endswith('\n'):
                        f.write('\n')
                    for item in new_items:
                        f.write(item + "\n")
                print(f"    ✅ Added {added_count} items to {role_name}/backlog.md")
            else:
                print(f"    ℹ️  No new unique items for {role_name}")

    # 4. Move Processed Items to In-Flight
    if items_processed:
        move_insights_to_inflight(items_processed)

def move_insights_to_inflight(processed_insights):
    """Moves processed insights from Inbox to In-Flight in QUICK_WINS.md"""
    if not os.path.exists(QUICK_WINS_FILE):
        return

    print(f"  📦 Moving {len(processed_insights)} items to In-Flight...")
    
    with open(QUICK_WINS_FILE, 'r') as f:
        lines = f.readlines()
        
    new_lines = []
    inbox_raws = [i['raw'] for i in processed_insights]
    
    in_inbox = False
    in_inflight = False
    inflight_idx = -1
    
    # Pass 1: Remove from Inbox
    for line in lines:
        if "## 📥 Inbox" in line:
            in_inbox = True
            new_lines.append(line)
            continue
        if in_inbox and line.startswith("##"):
            in_inbox = False
        
        if in_inbox:
            # Check if line matches any processed insight
            # Using strip() to match 'raw'
            if line.strip() in inbox_raws:
                continue # Skip (Remove)
        
        if "## 🔄 In-Flight" in line:
            in_inflight = True
            new_lines.append(line)
            inflight_idx = len(new_lines) # Mark insertion point
            continue
            
        new_lines.append(line)
        
    # Pass 2: Insert into In-Flight
    # If In-Flight section exists
    if inflight_idx != -1:
        timestamp = int(time.time())
        to_insert = []
        for insight in processed_insights:
            # Add trace
            new_line = f"{insight['raw']} [Trace: FLOW-R-{timestamp}-{random.randint(100,999)}]\n"
            to_insert.append(new_line)
            
        # Insert after header (and maybe comments). 
        # Ideally finding the end of the section comments.
        # Simple approach: Insert at inflight_idx
        # But we might want to check for <!-- comments -->
        # Let's just append at the end of the file? No, that's messy.
        # Let's insert right after the header.
        
        # Check if next lines are comments
        insert_pos = inflight_idx
        while insert_pos < len(new_lines) and new_lines[insert_pos].strip().startswith("<!--"):
            insert_pos += 1
            
        for l in reversed(to_insert):
            new_lines.insert(insert_pos, l)
            
    with open(QUICK_WINS_FILE, 'w') as f:
        f.writelines(new_lines)
    print("    ✅ QUICK_WINS.md updated.")

def parse_wsjf_params(line):
    # Reuse the logic from parse_wsjf_from_line
    return parse_wsjf_from_line(line)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("circle", help="Circle name")
    parser.add_argument("--auto-calc-wsjf", action="store_true", 
                        help="Auto-calculate WSJF from task description")
    parser.add_argument("--aggregate", action="store_true",
                        help="Replenish all roles in the circle (default: primary only)")
    parser.add_argument("--no-deduplicate", dest="deduplicate", action="store_false",
                        help="Disable intelligent routing (legacy broadcast mode)")
    args = parser.parse_args()
    
    replenish(args.circle, args.auto_calc_wsjf, args.aggregate, args.deduplicate)
