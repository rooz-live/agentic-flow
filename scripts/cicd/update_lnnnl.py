#!/usr/bin/env python3
import os
import sys
import yaml
from datetime import datetime, timezone


def main():
    root = "/Users/shahroozbhopti/Documents/code"
    roam_path = os.path.join(root, ".goalie/ROAM_TRACKER_COG.yaml")
    lnnnl_path = os.path.join(root, ".goalie/LNNNL.yaml")

    if not os.path.exists(roam_path):
        print(f"Error: ROAM_TRACKER_COG.yaml not found at {roam_path}")
        sys.exit(1)

    with open(roam_path, 'r') as f:
        data = yaml.safe_load(f)

    # Get risks
    risks = data.get('risks', [])
    if not risks:
        print("No risks found in ROAM_TRACKER_COG.yaml")
        sys.exit(0)

    # Severity weighting
    severity_weight = {
        'critical': 40,
        'high': 30,
        'medium': 20,
        'low': 10
    }

    # Status weighting
    status_weight = {
        'open_fail': 100,
        'open': 50,
        'monitoring': 20,
        'mitigated': 0
    }

    def get_risk_weight(risk):
        sev = risk.get('severity', 'low').lower()
        stat = risk.get('status', 'mitigated').lower()

        weight = status_weight.get(stat, 0) + severity_weight.get(sev, 0)
        return weight

    # Filter out mitigated risks unless we need more to fill 5 slots
    active_risks = [
        r for r in risks
        if r.get('status', 'mitigated').lower() != 'mitigated'
    ]
    mitigated_risks = [
        r for r in risks
        if r.get('status', 'mitigated').lower() == 'mitigated'
    ]

    active_risks.sort(key=get_risk_weight, reverse=True)
    mitigated_risks.sort(key=get_risk_weight, reverse=True)

    sorted_risks = active_risks + mitigated_risks

    schedule_labels = ['now', 'near', 'next', 'later', 'likely']
    schedule = {}

    for i, label in enumerate(schedule_labels):
        if i < len(sorted_risks):
            risk = sorted_risks[i]
            desc = risk.get('description', '')
            desc = desc.replace('"', '').replace('\n', ' ').strip()
            schedule[label] = f"[{risk.get('id', 'unknown')}] {desc}"
        else:
            schedule[label] = "No pending task."

    now_utc = datetime.now(timezone.utc)
    lnnnl_data = {
        "version": "1.0",
        "schedule": schedule,
        "last_updated": now_utc.isoformat().replace('+00:00', 'Z')
    }

    with open(lnnnl_path, 'w') as f:
        yaml.dump(lnnnl_data, f, default_flow_style=False, sort_keys=False)

    print(f"Successfully updated LNNNL.yaml at {lnnnl_path}")
    print("\nUpdated LNNNL Schedule:")
    for k, v in schedule.items():
        print(f"  {k.upper()}: {v}")


if __name__ == "__main__":
    main()
