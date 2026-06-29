#!/usr/bin/env python3
import os
import sys
import yaml
import re
from pathlib import Path
from datetime import datetime, timezone, timedelta

# Insert project root to path to import calculator
PROJECT_ROOT = os.environ.get("REPO_ROOT") or str(Path(__file__).resolve().parents[2])
sys.path.insert(0, PROJECT_ROOT)

from src.wsjf.calculator import WsjfCalculator, WsjfItem

sys.path.insert(0, os.path.join(PROJECT_ROOT, "scripts", "cicd", "lib"))
from env_key_resolver import sync_roam_cog_env_deps, sync_roam_env_deps

SHIPPABLE_ID_RE = re.compile(r"^(P1-[A-Z0-9]+-\d+|NNEAR-\d+)$", re.I)
BLOCKER_ID_RE = re.compile(r"^(DEP-|BLK-|B-|R04|R-)", re.I)


def load_shippable_queue(root):
    prompts_path = os.path.join(root, "config/cicd/loop_prompts.yaml")
    if not os.path.exists(prompts_path):
        return []
    with open(prompts_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    done_ids = {
        str(row.get("id") or "")
        for row in (data.get("wsjf_done_items") or [])
        if str(row.get("status", "")).lower() in ("done", "complete", "completed", "resolved")
    }
    out = []
    seen = set()
    for key in ("wsjf_now_items", "wsjf_near_items", "wsjf_backlog_items"):
        for row in data.get(key, []):
            iid = str(row.get("id") or "")
            if iid in done_ids or iid in seen:
                continue
            if SHIPPABLE_ID_RE.match(iid):
                out.append({"id": iid, "title": iid, "type": "shippable"})
                seen.add(iid)
    return out


def format_slot(item_id, title):
    desc = str(title or item_id).replace('"', "").replace("\n", " ").strip()
    if len(desc) > 100:
        desc = desc[:97] + "..."
    return f"[{item_id}] {desc}"


def is_blocker_item(item_id, item_type):
    iid = str(item_id or "")
    if SHIPPABLE_ID_RE.match(iid):
        return False
    if BLOCKER_ID_RE.match(iid):
        return True
    return item_type in ("blocker", "dependency", "risk", "risk_cog")


def build_lane_schedules(sorted_items, shippable_queue):
    labels = ["now", "near", "next", "later", "likely"]
    blockers = []
    for p in sorted_items:
        item_data = p["item"]
        if is_blocker_item(item_data.get("id"), item_data.get("type", "")):
            blockers.append(item_data)
    shippable = list(shippable_queue)
    for p in sorted_items:
        item_data = p["item"]
        iid = str(item_data.get("id") or "")
        if SHIPPABLE_ID_RE.match(iid) and not any(s["id"] == iid for s in shippable):
            shippable.append({"id": iid, "title": item_data.get("title", iid), "type": "shippable"})

    def lane_from(items):
        lane = {}
        for i, label in enumerate(labels):
            if i < len(items):
                row = items[i]
                lane[label] = format_slot(row.get("id"), row.get("title"))
            else:
                lane[label] = "No pending task."
        return lane

    return lane_from(shippable), lane_from(blockers)


def reconcile_wsjf_dependency_links(tracker_data):
    deps = {}
    for d in tracker_data.get("dependencies", []):
        deps[str(d.get("id"))] = str(d.get("status", "")).lower()
    for b in tracker_data.get("blockers", []):
        deps[str(b.get("id"))] = str(b.get("roam_status", "")).lower()
    for r in tracker_data.get("risks", []):
        status = r.get("status") or r.get("roam_status") or ""
        deps[str(r.get("id"))] = str(status).lower()

    wsjf_key = "wsjf_integration" if "wsjf_integration" in tracker_data else "wsjf"
    wsjf = tracker_data.get(wsjf_key) or {}
    links = wsjf.get("dependency_links") or []
    changed = False
    for link in links:
        current_status = str(link.get("status", "")).upper()
        if current_status in ("RESOLVED", "COMPLETED"):
            continue
        dep_ids = link.get("depends_on") or []
        if dep_ids and all(deps.get(str(d)) in ("resolved", "mitigated", "accepted") for d in dep_ids):
            link["status"] = "RESOLVED"
            changed = True
    if changed:
        wsjf["dependency_links"] = links
        tracker_data[wsjf_key] = wsjf
    return changed


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



STALE_EXIT = 2
DEFAULT_ROAM_TTL_HOURS = float(os.environ.get("AF_ROAM_DEFAULT_TTL_HOURS", "168"))


def _parse_roam_timestamp(value, now_utc):
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        dt = value
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    return parse_deadline(str(value))


def _item_verification_anchor(raw_item, now_utc):
    """Prefer last_verified (post-remediation) over discovered (open date)."""
    raw = raw_item or {}
    for key in ("last_verified", "discovered"):
        ts = _parse_roam_timestamp(raw.get(key), now_utc)
        if ts is not None:
            return ts
    return None


def find_stale_roam_items(active_items, now_utc):
    """Active ROAM rows past TTL without verified closure."""
    stale = []
    for item in active_items:
        raw = item.get("raw_item") or {}
        ttl_raw = item.get("staleness_ttl_hours")
        if ttl_raw is None:
            ttl_raw = raw.get("staleness_ttl_hours")
        try:
            ttl = float(ttl_raw) if ttl_raw is not None else DEFAULT_ROAM_TTL_HOURS
        except (TypeError, ValueError):
            ttl = DEFAULT_ROAM_TTL_HOURS
        anchor = _item_verification_anchor(raw, now_utc)
        if anchor is None:
            stale.append({
                "id": item.get("id"),
                "type": item.get("type"),
                "reason": "missing_verification_timestamp",
                "ttl_hours": ttl,
            })
            continue
        age_hours = (now_utc - anchor).total_seconds() / 3600.0
        if age_hours > ttl:
            stale.append({
                "id": item.get("id"),
                "type": item.get("type"),
                "reason": f"age_hours={age_hours:.1f}>ttl={ttl}",
                "ttl_hours": ttl,
                "anchor": anchor.isoformat(),
            })
    return stale



def _load_roam_refresh_evidence(project_root: str):
    """Evidence-gated ROAM timestamp refresh (anti-WSJF-gaming)."""
    evidence_path = os.environ.get("AF_ROAM_REFRESH_EVIDENCE", "").strip()
    if not evidence_path:
        return None
    p = Path(evidence_path)
    if not p.is_absolute():
        p = Path(project_root) / p
    if not p.is_file():
        raise SystemExit(f"AF_ROAM_REFRESH_EVIDENCE missing: {p}")
    import json
    doc = json.loads(p.read_text(encoding="utf-8"))
    items = doc.get("items") or []
    if not items:
        raise SystemExit("AF_ROAM_REFRESH_EVIDENCE: items[] required")
    allowed = {}
    for row in items:
        rid = str(row.get("id") or "").strip()
        if not rid:
            continue
        allowed[rid] = {
            "disposition": str(row.get("disposition") or row.get("roam") or "owned").lower(),
            "evidence": row.get("evidence") or row.get("evidence_ref") or "",
            "note": row.get("note") or "",
        }
    if not allowed:
        raise SystemExit("AF_ROAM_REFRESH_EVIDENCE: no valid item ids")
    return allowed, p


def _append_roam_refresh_audit(project_root: str, item_id: str, evidence_file: Path, note: str = ""):
    audit = Path(project_root) / ".goalie/evidence/roam_refresh_audit.jsonl"
    audit.parent.mkdir(parents=True, exist_ok=True)
    import json
    from datetime import datetime, timezone
    row = {
        "at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "item_id": item_id,
        "evidence": str(evidence_file),
        "note": note,
    }
    with open(audit, "a", encoding="utf-8") as f:
        f.write(json.dumps(row) + "\n")


def _row_id_matches_allowed(row: dict, allowed_ids: set) -> bool:
    for key in ("id", "risk_id", "dependency_id"):
        val = str(row.get(key) or "").strip()
        if val in allowed_ids:
            return True
    return False


def enforce_stale_roam_gate(stale_items):
    if not stale_items:
        return 0
    print(f"STALE ROAM items ({len(stale_items)}):")
    for row in stale_items[:25]:
        print(f"  - {row.get('id')}: {row.get('reason')}")
    if len(stale_items) > 25:
        print(f"  ... and {len(stale_items) - 25} more")
    if os.environ.get("AF_LNNNL_STALE_ENFORCE", "1") == "1":
        return STALE_EXIT
    return 0


def main():
    roam_cog_path = os.path.join(PROJECT_ROOT, ".goalie/ROAM_TRACKER_COG.yaml")
    roam_path = os.path.join(PROJECT_ROOT, ".goalie/ROAM_TRACKER.yaml")
    lnnnl_path = os.path.join(PROJECT_ROOT, ".goalie/LNNNL.yaml")
    roam_root_path = os.path.join(PROJECT_ROOT, "ROAM_TRACKER.yaml")
    loop_prompts_path = os.path.join(PROJECT_ROOT, "config/cicd/loop_prompts.yaml")

    resolved = []
    if os.environ.get("AF_SKIP_ROAM_SYNC", "0") != "1":
        resolved = sync_roam_env_deps(Path(PROJECT_ROOT))
        cog_resolved = sync_roam_cog_env_deps(Path(PROJECT_ROOT))
        resolved.extend(cog_resolved)
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
        # Treat as closed if either ROAM disposition or status is terminal.
        status = str(r.get('status', '')).lower()
        roam = str(r.get('roam') or r.get('roam_status') or '').lower()
        if status in ('mitigated', 'accepted', 'resolved') or roam in ('mitigated', 'accepted', 'resolved'):
            continue
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
        # Treat as closed if either ROAM disposition or status is terminal.
        status = str(r.get('status', '')).lower()
        roam = str(r.get('roam') or r.get('roam_status') or '').lower()
        if status in ('mitigated', 'accepted', 'resolved') or roam in ('mitigated', 'accepted', 'resolved'):
            continue
        active_items.append({
                'type': 'risk',
                'id': r.get('id'),
                'title': r.get('title') or r.get('description') or r.get('id'),
                'severity': r.get('severity', 'medium'),
                'deadline': r.get('deadline'),
                'raw_item': r
            })

    stale_items = find_stale_roam_items(active_items, now_utc)
    stale_exit = enforce_stale_roam_gate(stale_items)
    if stale_exit != 0:
        raise SystemExit(stale_exit)

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

    # Dual-lane schedule: top-level schedule is shippable-only. Blockers live in
    # lanes.blockers. This keeps pace/schedule consumers focused on shippable
    # work while preserving blocker visibility under lanes.blockers.
    schedule = {}
    for label in ['now', 'near', 'next', 'later', 'likely']:
        ship = shippable_lane.get(label, "")
        if ship and ship != "No pending task.":
            schedule[label] = ship
        else:
            schedule[label] = "No pending task."
    schedule["shippable_now"] = shippable_lane.get("now", "")
    schedule["shippable_near"] = shippable_lane.get("near", "")
    schedule["shippable_next"] = shippable_lane.get("next", "")
    schedule["blockers_now"] = blockers_lane.get("now", "")
    schedule["blockers_near"] = blockers_lane.get("near", "")
    schedule["blockers_next"] = blockers_lane.get("next", "")

    lnnnl_data = {
        "version": "1.1",
        "schedule": schedule,
        "lanes": {"shippable": shippable_lane, "blockers": blockers_lane},
        "last_updated": now_iso,
    }

    with open(lnnnl_path, 'w') as f:
        yaml.dump(lnnnl_data, f, default_flow_style=False, sort_keys=False)

    print(f"Successfully updated LNNNL.yaml at {lnnnl_path}")
    print("\nUpdated LNNNL Schedule (WSJF Prioritized):")
    for k, v in schedule.items():
        print(f"  {k.upper()}: {v}")
    print("\nShippable NOW:", schedule.get("shippable_now", ""))
    print("Blockers NOW:", schedule.get("blockers_now", ""))

    reconcile_wsjf_dependency_links(tracker_data)

    # Optional timestamp refresh — evidence-gated only (AF_ROAM_REFRESH_TIMESTAMPS=1)
    if os.environ.get('AF_ROAM_REFRESH_TIMESTAMPS', '0') != '1':
        if tracker_data:
            with open(roam_path, 'w', encoding='utf-8') as f:
                yaml.dump(tracker_data, f, default_flow_style=False, sort_keys=False)
            with open(roam_root_path, 'w', encoding='utf-8') as f:
                yaml.dump(tracker_data, f, default_flow_style=False, sort_keys=False)
        print('Skipped ROAM discovered refresh (set AF_ROAM_REFRESH_TIMESTAMPS=1 to enable)')
        return

    if os.environ.get('AF_ROAM_REFRESH_TIMESTAMPS', '0') == '1':
        if not os.environ.get('AF_ROAM_REFRESH_EVIDENCE', '').strip():
            raise SystemExit(
                'AF_ROAM_REFRESH_TIMESTAMPS=1 requires AF_ROAM_REFRESH_EVIDENCE JSON listing item ids'
            )
    allowed_map, evidence_file = _load_roam_refresh_evidence(PROJECT_ROOT)
    allowed_ids = set(allowed_map.keys())
    print(f"ROAM refresh evidence: {evidence_file} ({len(allowed_ids)} ids)")

    def _matched_allowed_id(row: dict) -> str | None:
        for key in ("id", "risk_id", "dependency_id"):
            val = str(row.get(key) or "").strip()
            if val in allowed_ids:
                return val
        return None

    def _touch_row(row: dict) -> bool:
        rid = _matched_allowed_id(row)
        if not rid:
            return False
        meta = allowed_map.get(rid, {})
        row['last_verified'] = today_str
        row['last_verified_evidence'] = str(evidence_file)
        if meta.get('disposition'):
            row['roam_status'] = meta['disposition'].upper()
            row['status'] = meta['disposition'].lower()
        _append_roam_refresh_audit(PROJECT_ROOT, rid, evidence_file, meta.get('note', ''))
        return True

    touched = 0
    if cog_data:
        for r in cog_data.get('risks', []):
            if _touch_row(r):
                touched += 1
        if touched:
            with open(roam_cog_path, 'w', encoding='utf-8') as f:
                yaml.dump(cog_data, f, default_flow_style=False, sort_keys=False)
            print(f"Evidence-gated refresh in {roam_cog_path} ({touched} rows)")

    if tracker_data:
        meta = tracker_data.get('metadata', {}) or {}
        meta['last_updated'] = now_iso
        tracker_data['metadata'] = meta
        for collection in (blockers, dependencies, tracker_risks):
            for row in collection:
                if _touch_row(row):
                    touched += 1
        with open(roam_path, 'w', encoding='utf-8') as f:
            yaml.dump(tracker_data, f, default_flow_style=False, sort_keys=False)
        with open(roam_root_path, 'w', encoding='utf-8') as f:
            yaml.dump(tracker_data, f, default_flow_style=False, sort_keys=False)
        print(f"Evidence-gated refresh in trackers ({touched} total touches)")

if __name__ == '__main__':
    main()
