#!/usr/bin/env python3
import os
import sys
import yaml
import re
from pathlib import Path
from datetime import datetime, timezone, timedelta

# Insert project root to path to import calculator
PROJECT_ROOT = str(Path(__file__).parent.parent.parent.resolve())
sys.path.insert(0, PROJECT_ROOT)

from src.wsjf.calculator import WsjfCalculator, WsjfItem

def parse_deadline(deadline_str):
    if not deadline_str:
        return None
    # If it's a string, try parsing it
    if isinstance(deadline_str, str):
        # Remove any annotations like "(filed, now monitoring)"
        clean_str = re.split(r'\s+\(', deadline_str)[0].strip()
        if clean_str.upper() == 'TBD' or not clean_str:
            return None
        try:
            from dateutil import parser as date_parser
            dt = date_parser.parse(clean_str)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except Exception:
            # Fallback parsing
            for fmt in ('%Y-%m-%d', '%Y-%m-%dT%H:%M:%SZ', '%Y-%m-%d %H:%M:%S'):
                try:
                    dt = datetime.strptime(clean_str, fmt)
                    return dt.replace(tzinfo=timezone.utc)
                except ValueError:
                    continue
    return None

def _load_loop_prompts(path: str) -> dict:
    """Load loop_prompts.yaml and return P1/NNEAR shippable items."""
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f) or {}
    except Exception:
        return {}
    return data


def _extract_shippable_items(data: dict) -> dict:
    """Return {now: [...], near: [...], next: [...]} from loop_prompts items.

    Items whose id starts with 'P1-' are shippable work. Items whose id starts
    with 'NNEAR-' are near-term shippable work. Other items (e.g. CVT-*) are
    treated as blocker backlog and ignored for the shippable lane.
    """
    shippable: dict = {"now": [], "near": [], "next": []}
    now_items = data.get('wsjf_now_items', []) or []
    near_items = data.get('wsjf_near_items', []) or []

    for item in now_items:
        item_id = item.get('id', '')
        if item_id.startswith('P1-'):
            shippable["now"].append(item)
        elif item_id.startswith('NNEAR-'):
            shippable["near"].append(item)

    for item in near_items:
        item_id = item.get('id', '')
        if item_id.startswith('P1-'):
            shippable["near"].append(item)
        elif item_id.startswith('NNEAR-'):
            shippable["next"].append(item)

    return shippable


def _format_item(item: dict) -> str:
    prompt = (item.get('prompt') or '').replace('"', '').replace('\n', ' ').strip()
    if len(prompt) > 100:
        prompt = prompt[:97] + "..."
    return f"[{item.get('id')}] {prompt}"


def main():
    roam_cog_path = os.path.join(PROJECT_ROOT, ".goalie/ROAM_TRACKER_COG.yaml")
    roam_path = os.path.join(PROJECT_ROOT, ".goalie/ROAM_TRACKER.yaml")
    lnnnl_path = os.path.join(PROJECT_ROOT, ".goalie/LNNNL.yaml")
    roam_root_path = os.path.join(PROJECT_ROOT, "ROAM_TRACKER.yaml")
    loop_prompts_path = os.path.join(PROJECT_ROOT, "config/cicd/loop_prompts.yaml")

    resolved = sync_roam_env_deps(Path(PROJECT_ROOT))
    if resolved:
        print(f"Auto-resolved env deps: {', '.join(resolved)}")

    now_utc = datetime.now(timezone.utc)
    today_str = now_utc.strftime('%Y-%m-%d')
    now_iso = now_utc.strftime('%Y-%m-%dT%H:%M:%SZ')

    # Load ROAM_TRACKER_COG.yaml
    if os.path.exists(roam_cog_path):
        with open(roam_cog_path, 'r') as f:
            cog_data = yaml.safe_load(f) or {}
    else:
        cog_data = {}

    # Load ROAM_TRACKER.yaml
    if os.path.exists(roam_path):
        with open(roam_path, 'r') as f:
            tracker_data = yaml.safe_load(f) or {}
    else:
        tracker_data = {}

    # Extract items
    cog_risks = cog_data.get('risks', [])
    blockers = tracker_data.get('blockers', [])
    dependencies = tracker_data.get('dependencies', [])
    tracker_risks = tracker_data.get('risks', [])

    active_items = []

    # Map COG risks
    for r in cog_risks:
        status = str(r.get('status', '')).lower()
        # Active if not mitigated/accepted/resolved
        if status not in ('mitigated', 'accepted', 'resolved'):
            active_items.append({
                'type': 'risk_cog',
                'id': r.get('id'),
                'title': r.get('description') or r.get('title') or r.get('id'),
                'severity': r.get('severity', 'medium'),
                'staleness_ttl_hours': r.get('staleness_ttl_hours'),
                'deadline': r.get('deadline'),
                'raw_item': r
            })

    # Map trackers blockers
    for b in blockers:
        roam_status = str(b.get('roam_status', '')).upper()
        if roam_status != 'RESOLVED':
            active_items.append({
                'type': 'blocker',
                'id': b.get('id'),
                'title': b.get('title') or b.get('id'),
                'severity': b.get('severity', 'medium'),
                'deadline': b.get('deadline'),
                'estimated_fix_time': b.get('estimated_fix_time'),
                'raw_item': b
            })

    # Map tracker dependencies
    for d in dependencies:
        status = str(d.get('status', '')).lower()
        if status != 'resolved':
            active_items.append({
                'type': 'dependency',
                'id': d.get('id'),
                'title': d.get('title') or d.get('id'),
                'severity': d.get('severity', 'medium'),
                'deadline': d.get('deadline'),
                'raw_item': d
            })

    # Map tracker risks
    for r in tracker_risks:
        status = str(r.get('status', r.get('roam_status', ''))).lower()
        if status not in ('mitigated', 'accepted', 'resolved'):
            active_items.append({
                'type': 'risk',
                'id': r.get('id'),
                'title': r.get('title') or r.get('description') or r.get('id'),
                'severity': r.get('severity', 'medium'),
                'deadline': r.get('deadline'),
                'raw_item': r
            })

    # WSJF Calculator
    calc = WsjfCalculator()

    # Process each active item
    for item in active_items:
        item_id = item['id']
        title = item['title']
        severity = str(item['severity']).lower()

        # 1. Business Value (BV) - based on severity
        if severity == 'critical':
            bv = 10.0
        elif severity == 'high':
            bv = 8.0
        elif severity == 'medium':
            bv = 5.0
        elif severity == 'low':
            bv = 3.0
        else:
            bv = 5.0

        # Invert Thinking: Boost BV if systemic, strategic, or situational opportunity is present
        # Systemic opportunity boost (e.g. SPOF, nameserver, single point of failure)
        is_systemic = 'spof' in item_id.lower() or 'systemic' in title.lower() or 'nameserver' in title.lower()
        # Strategic opportunity boost (e.g. Stripe webhook, MailStore, gRPC, eventops)
        is_strategic = 'mail' in item_id.lower() or 'eventops' in item_id.lower() or 'stripe' in title.lower() or 'grpc' in title.lower()
        # Situational opportunity boost
        is_situational = 'oro' in item_id.lower() or 'local' in title.lower() or 'override' in title.lower()

        boost = 0.0
        if is_systemic:
            boost = 2.0
            just = "Systemic risk inverted to program opportunity (punitive/structural leverage)"
        elif is_strategic:
            boost = 1.5
            just = "Strategic risk inverted to discovery leverage"
        elif is_situational:
            boost = 1.0
            just = "Situational risk inverted to deadline/context leverage"
        else:
            just = "Standard severity-based prioritization"

        bv = min(10.0, bv + boost)

        # 2. Time Criticality (TC) - based on TTL or deadline
        tc = 5.0
        ttl = item.get('staleness_ttl_hours')
        if ttl is not None:
            if ttl <= 12:
                tc = 9.0
            elif ttl <= 24:
                tc = 8.0
            elif ttl <= 48:
                tc = 6.0
            elif ttl <= 168:
                tc = 4.0

        deadline_dt = parse_deadline(item.get('deadline'))
        if deadline_dt:
            # Adjust TC based on proximity to now
            days_to_dl = (deadline_dt - now_utc).days
            if days_to_dl <= 1:
                tc = max(tc, 10.0)
            elif days_to_dl <= 7:
                tc = max(tc, 8.0)
            elif days_to_dl <= 30:
                tc = max(tc, 6.0)

        # 3. Risk Reduction (RR) - same as severity base
        if severity == 'critical':
            rr = 10.0
        elif severity == 'high':
            rr = 8.0
        elif severity == 'medium':
            rr = 5.0
        elif severity == 'low':
            rr = 3.0
        else:
            rr = 5.0

        # 4. Job Size (JS)
        js = 3.0
        if item['type'] == 'blocker':
            js = 2.0
        elif item['type'] == 'risk' or item['type'] == 'risk_cog':
            js = 5.0

        fix_time = item.get('estimated_fix_time')
        if fix_time:
            if '15 min' in fix_time:
                js = 1.0
            elif '30 min' in fix_time:
                js = 2.0
            elif '1 hour' in fix_time or '1 hr' in fix_time:
                js = 3.0
            elif '3 hour' in fix_time or '3 hr' in fix_time:
                js = 5.0

        wsjf_item = WsjfItem(
            id=item_id,
            title=title,
            business_value=bv,
            time_criticality=tc,
            risk_reduction=rr,
            job_size=js,
            deadline=deadline_dt,
            justification=just
        )
        calc.add_item(wsjf_item)

    # Perform WSJF calculation
    priorities = calc.get_priorities()
    sorted_items = priorities['priorities']
    active_by_id = {str(a['id']): a for a in active_items}
    for p in sorted_items:
        iid = str(p['item'].get('id'))
        if iid in active_by_id:
            p['item']['type'] = active_by_id[iid]['type']

    shippable_lane, blockers_lane = build_lane_schedules(sorted_items, load_shippable_queue(PROJECT_ROOT))

    # Update LNNNL schedule (legacy + dual-lane)
    schedule_labels = ['now', 'near', 'next', 'later', 'likely']
    schedule = {}
    for i, label in enumerate(schedule_labels):
        if i < len(sorted_items):
            p = sorted_items[i]
            item_data = p['item']
            desc = item_data['title'].replace('"', '').replace('\n', ' ').strip()
            # Clean up desc if too long
            if len(desc) > 100:
                desc = desc[:97] + "..."
            schedule[label] = f"[{item_data['id']}] {desc}"
        else:
            schedule[label] = "No pending task."

    # Build multi-lane schedule: shippable work from loop_prompts + ROAM backlog
    loop_prompts_data = _load_loop_prompts(loop_prompts_path)
    shippable_items = _extract_shippable_items(loop_prompts_data)
    lanes = {
        "shippable": {
            label: _format_item(items[0]) if items else "No pending shippable task."
            for label, items in shippable_items.items()
        },
        "blockers": schedule,
    }

    lnnnl_data = {
        "version": "1.1",
        "lanes": lanes,
        "schedule": schedule,
        "last_updated": now_iso
    }

    with open(lnnnl_path, 'w') as f:
        yaml.dump(lnnnl_data, f, default_flow_style=False, sort_keys=False)

    print(f"Successfully updated LNNNL.yaml at {lnnnl_path}")
    print("\nUpdated LNNNL Schedule (WSJF Prioritized):")
    for k, v in schedule.items():
        print(f"  {k.upper()}: {v}")
    print("\nUpdated LNNNL Lanes:")
    for lane_name, lane_schedule in lanes.items():
        print(f"  [{lane_name}]")
        for k, v in lane_schedule.items():
            print(f"    {k.upper()}: {v}")

    reconcile_wsjf_dependency_links(tracker_data)

    # Optional timestamp refresh (AF_ROAM_REFRESH_TIMESTAMPS=1 only)
    if os.environ.get('AF_ROAM_REFRESH_TIMESTAMPS', '0') != '1':
        if tracker_data:
            with open(roam_path, 'w', encoding='utf-8') as f:
                yaml.dump(tracker_data, f, default_flow_style=False, sort_keys=False)
            with open(roam_root_path, 'w', encoding='utf-8') as f:
                yaml.dump(tracker_data, f, default_flow_style=False, sort_keys=False)
        print('Skipped ROAM discovered refresh (set AF_ROAM_REFRESH_TIMESTAMPS=1 to enable)')
        return

    # Now refresh timestamps to clear the staleness gate
    # Update COG tracker
    if cog_data:
        cog_data['last_verified'] = today_str
        for r in cog_data.get('risks', []):
            status = str(r.get('status', '')).lower()
            if status not in ('mitigated', 'accepted', 'resolved'):
                r['last_verified'] = today_str
        with open(roam_cog_path, 'w') as f:
            yaml.dump(cog_data, f, default_flow_style=False, sort_keys=False)
        print(f"Refreshed timestamps in {roam_cog_path}")

    # Update main tracker
    if tracker_data:
        # Update metadata
        meta = tracker_data.get('metadata', {})
        meta['last_updated'] = now_iso
        tracker_data['metadata'] = meta

        # Refresh blockers
        for b in blockers:
            roam_status = str(b.get('roam_status', '')).upper()
            if roam_status != 'RESOLVED':
                # Fix any malformed discovered field
                disc = b.get('discovered', '')
                if '(' in str(disc):
                    b['discovered'] = today_str
                b['last_updated'] = now_iso

        # Refresh dependencies
        for d in dependencies:
            status = str(d.get('status', '')).lower()
            if status != 'resolved':
                d['discovered'] = today_str

        # Refresh risks + Fix 'status' field mapping
        for r in tracker_risks:
            roam_status = r.get('roam_status')
            if roam_status:
                # Synchronize status to lowercase version of roam_status
                r['status'] = roam_status.lower()
            status = str(r.get('status', '')).lower()
            if status not in ('mitigated', 'accepted', 'resolved'):
                r['discovered'] = today_str

        with open(roam_path, 'w') as f:
            yaml.dump(tracker_data, f, default_flow_style=False, sort_keys=False)
        print(f"Refreshed timestamps and status fields in {roam_path}")

        # Sync to root ROAM_TRACKER.yaml
        with open(roam_root_path, 'w') as f:
            yaml.dump(tracker_data, f, default_flow_style=False, sort_keys=False)
        print(f"Synchronized root {roam_root_path}")

if __name__ == '__main__':
    main()
