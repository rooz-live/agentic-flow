#!/usr/bin/env python3
"""
Timeline Exhibit Generator for Legal Cases
Generates visual timeline from JSON data for trial exhibits

Pre-Trial ROI: Judge comprehension (22-month pattern in 10 seconds)
Post-Trial Scale: Reusable for 100+ tenant cases
"""

import json
import sys
from datetime import datetime
from pathlib import Path

def generate_ascii_timeline(timeline_data):
    """Generate ASCII timeline for terminal/PDF export"""
    output = []
    output.append("=" * 80)
    output.append(f"  {timeline_data['title']}")
    output.append(f"  {timeline_data['subtitle']}")
    output.append("=" * 80)
    output.append("")
    
    # Events by type
    events_by_type = {}
    for event in timeline_data['events']:
        event_type = event['type']
        if event_type not in events_by_type:
            events_by_type[event_type] = []
        events_by_type[event_type].append(event)
    
    # Type symbols
    symbols = {
        'complaint': '⚠️',
        'legal': '⚖️',
        'trial': '🏛️'
    }
    
    # Print events chronologically
    output.append("TIMELINE:")
    output.append("")
    for event in timeline_data['events']:
        date = datetime.fromisoformat(event['date']).strftime('%b %d, %Y')
        symbol = symbols.get(event['type'], '•')
        output.append(f"  {symbol}  {date:15} - {event['label']}")
    
    output.append("")
    output.append("-" * 80)
    output.append("SUMMARY STATISTICS:")
    output.append("-" * 80)
    stats = timeline_data['stats']
    output.append(f"  Duration: {stats['duration_months']} months")
    output.append(f"  Work Orders: {stats['work_orders']}")
    output.append(f"  Rent Paid: {stats['rent_paid']}")
    output.append(f"  Damages Claimed: {stats['damages_claimed']}")
    output.append("=" * 80)
    
    return "\n".join(output)

def generate_markdown_timeline(timeline_data):
    """Generate Markdown timeline for exhibits"""
    output = []
    output.append(f"# {timeline_data['title']}")
    output.append(f"**{timeline_data['subtitle']}**")
    output.append("")
    output.append("---")
    output.append("")
    
    # Events table
    output.append("| Date | Event | Type |")
    output.append("|------|-------|------|")
    for event in timeline_data['events']:
        date = datetime.fromisoformat(event['date']).strftime('%b %d, %Y')
        output.append(f"| {date} | {event['label']} | {event['type'].title()} |")
    
    output.append("")
    output.append("---")
    output.append("")
    output.append("## Summary Statistics")
    output.append("")
    stats = timeline_data['stats']
    output.append(f"- **Duration:** {stats['duration_months']} months")
    output.append(f"- **Work Orders:** {stats['work_orders']}")
    output.append(f"- **Rent Paid:** {stats['rent_paid']}")
    output.append(f"- **Damages Claimed:** {stats['damages_claimed']}")
    
    return "\n".join(output)

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 generate_trial_timeline.py <timeline_json> [format]")
        print("Formats: ascii (default), markdown")
        sys.exit(1)
    
    json_file = Path(sys.argv[1])
    format_type = sys.argv[2] if len(sys.argv) > 2 else 'ascii'
    
    if not json_file.exists():
        print(f"Error: File not found: {json_file}")
        sys.exit(1)
    
    with open(json_file) as f:
        timeline_data = json.load(f)
    
    if format_type == 'markdown':
        output = generate_markdown_timeline(timeline_data)
    else:
        output = generate_ascii_timeline(timeline_data)
    
    print(output)
    
    # Save to file
    output_file = json_file.parent / f"{json_file.stem}_exhibit.{'md' if format_type == 'markdown' else 'txt'}"
    output_file.write_text(output)
    print(f"\n✓ Timeline saved to: {output_file}", file=sys.stderr)

if __name__ == '__main__':
    main()
