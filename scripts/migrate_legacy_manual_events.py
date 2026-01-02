#!/usr/bin/env python3

import argparse
import json
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class MigrationStats:
    total_lines: int = 0
    parsed_events: int = 0
    modified_events: int = 0
    legacy_events: int = 0
    failures_missing_reasons: int = 0
    economic_backfilled: int = 0
    timestamps_backfilled: int = 0
    run_kind_backfilled: int = 0


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')


def _split_csv(value: Optional[str]) -> List[str]:
    if not value:
        return []
    return [v.strip() for v in value.split(',') if v.strip()]


def _ensure_dict(value: Any) -> Dict[str, Any]:
    return value if isinstance(value, dict) else {}


def normalize_event(event: Dict[str, Any], legacy_run_kinds: set, patterns: set) -> Tuple[bool, Dict[str, Any], Dict[str, int]]:
    counters = {
        'failures_missing_reasons': 0,
        'economic_backfilled': 0,
        'timestamps_backfilled': 0,
        'run_kind_backfilled': 0,
        'legacy_events': 0,
    }

    pattern = event.get('pattern')
    if patterns and pattern not in patterns:
        return False, event, counters

    run_kind = event.get('run_kind')
    if not run_kind:
        run_kind = event.get('run') or 'manual'
        event['run_kind'] = run_kind
        counters['run_kind_backfilled'] += 1

    is_legacy = run_kind in legacy_run_kinds
    if is_legacy:
        counters['legacy_events'] += 1

    changed = False

    ts = event.get('ts')
    timestamp = event.get('timestamp')
    if not timestamp and ts:
        event['timestamp'] = ts
        counters['timestamps_backfilled'] += 1
        changed = True
    elif not ts and timestamp:
        event['ts'] = timestamp
        counters['timestamps_backfilled'] += 1
        changed = True
    elif not ts and not timestamp:
        now = _now_iso()
        event['ts'] = now
        event['timestamp'] = now
        counters['timestamps_backfilled'] += 1
        changed = True

    if 'action_completed' not in event:
        event['action_completed'] = True
        changed = True

    tags = event.get('tags')
    if tags is None or not isinstance(tags, list):
        event['tags'] = [] if tags is None else [str(tags)]
        changed = True

    if is_legacy and 'legacy' not in event['tags']:
        event['tags'].append('legacy')
        changed = True

    econ = event.get('economic')
    if econ is None or not isinstance(econ, dict):
        econ = {}
        event['economic'] = econ
        changed = True

    cod = econ.get('cod')
    cod2 = econ.get('cost_of_delay')
    if cod2 is None and cod is not None:
        econ['cost_of_delay'] = cod
        counters['economic_backfilled'] += 1
        changed = True
    if cod is None and cod2 is not None:
        econ['cod'] = cod2
        counters['economic_backfilled'] += 1
        changed = True

    if 'wsjf_score' not in econ:
        econ['wsjf_score'] = 0
        counters['economic_backfilled'] += 1
        changed = True
    if 'job_duration' not in econ:
        econ['job_duration'] = 1
        counters['economic_backfilled'] += 1
        changed = True
    if 'user_business_value' not in econ:
        econ['user_business_value'] = 0
        counters['economic_backfilled'] += 1
        changed = True

    event['economic'] = econ

    data = _ensure_dict(event.get('data'))
    if not isinstance(event.get('data'), dict):
        event['data'] = data
        changed = True

    if event.get('action_completed') is False:
        fr = data.get('failure_reasons')
        if not fr:
            data['failure_reasons'] = ['legacy_event_missing_reason']
            counters['failures_missing_reasons'] += 1
            changed = True

    event['data'] = data

    return changed, event, counters


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--file', default='.goalie/pattern_metrics.jsonl')
    parser.add_argument('--output', default='')
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--patterns', default='wsjf-enrichment,code-fix-proposal')
    parser.add_argument('--legacy-run-kinds', default='manual')
    args = parser.parse_args()

    input_path = Path(args.file)
    if not input_path.exists():
        raise SystemExit(f'File not found: {input_path}')

    patterns = set(_split_csv(args.patterns))
    legacy_run_kinds = set(_split_csv(args.legacy_run_kinds))

    stats = MigrationStats()
    out_lines: List[str] = []

    with input_path.open('r', encoding='utf8') as f:
        for line in f:
            stats.total_lines += 1
            raw = line.rstrip('\n')
            if not raw.strip():
                out_lines.append(raw)
                continue
            try:
                event = json.loads(raw)
                stats.parsed_events += 1
            except Exception:
                out_lines.append(raw)
                continue

            changed, event2, counters = normalize_event(event, legacy_run_kinds, patterns)
            stats.legacy_events += counters['legacy_events']
            stats.failures_missing_reasons += counters['failures_missing_reasons']
            stats.economic_backfilled += counters['economic_backfilled']
            stats.timestamps_backfilled += counters['timestamps_backfilled']
            stats.run_kind_backfilled += counters['run_kind_backfilled']

            if changed:
                stats.modified_events += 1
                out_lines.append(json.dumps(event2))
            else:
                out_lines.append(raw)

    report = {
        'total_lines': stats.total_lines,
        'parsed_events': stats.parsed_events,
        'modified_events': stats.modified_events,
        'legacy_events_seen': stats.legacy_events,
        'failures_missing_reasons_backfilled': stats.failures_missing_reasons,
        'economic_fields_backfilled': stats.economic_backfilled,
        'timestamps_backfilled': stats.timestamps_backfilled,
        'run_kind_backfilled': stats.run_kind_backfilled,
        'file': str(input_path),
        'output': args.output or '(overwrite)'
    }

    if args.dry_run:
        print(json.dumps(report, indent=2))
        return

    output_path = Path(args.output) if args.output else input_path
    if output_path == input_path:
        backup_path = input_path.with_suffix(input_path.suffix + f'.bak.{int(datetime.now().timestamp())}')
        backup_path.write_text(input_path.read_text(encoding='utf8'), encoding='utf8')

    output_path.write_text('\n'.join(out_lines) + '\n', encoding='utf8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
