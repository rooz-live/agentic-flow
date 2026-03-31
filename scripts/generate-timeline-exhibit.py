#!/usr/bin/env python3
"""
Generate Exhibit D: Timeline Visual for Trial #1
Converts timeline_exhibit_data.json into printable court exhibit
"""

import json
import sys
from pathlib import Path
from datetime import datetime

def generate_timeline_exhibit(json_path: str, output_path: str):
    """Generate timeline exhibit from JSON data"""
    
    # Load timeline data
    with open(json_path, 'r') as f:
        data = json.load(f)
    
    # Generate markdown exhibit
    exhibit = []
    exhibit.append("# EXHIBIT D: Timeline of Habitability Failures")
    exhibit.append(f"\n**{data['title']}**")
    exhibit.append(f"*{data['subtitle']}*\n")
    exhibit.append("---\n")
    
    # Timeline events
    exhibit.append("## Chronology of Events (22-Month Pattern)\n")
    
    for i, event in enumerate(data['events'], 1):
        event_date = datetime.strptime(event['date'], '%Y-%m-%d')
        formatted_date = event_date.strftime('%B %d, %Y')
        
        # Color-code by type
        icon = {
            'complaint': '🔴',
            'legal': '⚖️',
            'trial': '🏛️'
        }.get(event['type'], '•')
        
        exhibit.append(f"{i}. **{formatted_date}** {icon} {event['label']}")
    
    exhibit.append("\n---\n")
    
    # Stats summary
    exhibit.append("## Case Statistics\n")
    exhibit.append(f"- **Duration**: {data['stats']['duration_months']} months")
    exhibit.append(f"- **Work Orders Filed**: {data['stats']['work_orders']}")
    exhibit.append(f"- **Rent Paid**: {data['stats']['rent_paid']}")
    exhibit.append(f"- **Damages Claimed**: {data['stats']['damages_claimed']}")
    
    exhibit.append("\n---\n")
    
    # Key pattern observations
    exhibit.append("## Pattern Analysis\n")
    exhibit.append("1. **Systemic Non-Response**: 40+ work orders over 22 months")
    exhibit.append("2. **Continued Payment**: $37,400 paid despite uninhabitable conditions")
    exhibit.append("3. **Retaliation Timing**: Eviction filed during settlement negotiations")
    exhibit.append("4. **Organizational Indifference**: Pattern of cancelled work orders")
    
    exhibit.append("\n---\n")
    exhibit.append("\n*Prepared for Trial: March 3, 2026*")
    exhibit.append("\n*Mecklenburg County Civil Court*")
    exhibit.append("\n*Case No. 26CV005596-590*\n")
    
    # Write output
    output = '\n'.join(exhibit)
    with open(output_path, 'w') as f:
        f.write(output)
    
    print(f"✅ Exhibit D generated: {output_path}")
    print(f"   Events: {len(data['events'])}")
    print(f"   Duration: {data['stats']['duration_months']} months")
    
    return output_path

if __name__ == '__main__':
    # Default paths
    json_path = Path(__file__).parent.parent / 'reports' / 'timeline_exhibit_data.json'
    output_path = Path.home() / 'Documents' / 'Personal' / 'CLT' / 'MAA' / 'Uptown' / 'BHOPTI-LEGAL' / 'EVIDENCE_BUNDLE' / 'EXHIBIT-D-TIMELINE.md'
    
    # Allow CLI override
    if len(sys.argv) > 1:
        json_path = sys.argv[1]
    if len(sys.argv) > 2:
        output_path = sys.argv[2]
    
    generate_timeline_exhibit(str(json_path), str(output_path))
