import json
import sys
import os
from datetime import datetime

GOV_LOG = "/Users/shahroozbhopti/Documents/code/investing/agentic-flow/logs/governor_incidents.jsonl"
METRICS_LOG = "/Users/shahroozbhopti/Documents/code/investing/agentic-flow/.goalie/metrics_log.jsonl"

def parse_iso(ts):
    if not ts: return None
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except ValueError:
        return None

def main():
    print(f"🔍 Validating parity between:")
    print(f"   - Governor: {GOV_LOG}")
    print(f"   - Metrics:  {METRICS_LOG}")

    gov_incidents = []
    if os.path.exists(GOV_LOG):
        with open(GOV_LOG, 'r') as f:
            for line in f:
                try: gov_incidents.append(json.loads(line))
                except: pass
    
    metrics = []
    if os.path.exists(METRICS_LOG):
        with open(METRICS_LOG, 'r') as f:
            for line in f:
                try: metrics.append(json.loads(line))
                except: pass

    if not gov_incidents:
        print("✅ No governor incidents found (Parity: OK)")
        return

    last_gov = gov_incidents[-1]
    print(f"📊 Governor Incidents: {len(gov_incidents)} (Last: {last_gov.get('timestamp')})")
    
    if not metrics:
        print("❌ Metrics log empty while Governor has incidents. (Parity: FAIL)")
        return

    last_metric = metrics[-1]
    print(f"📊 Metrics Entries: {len(metrics)} (Last: {last_metric.get('timestamp')})")

    ts_gov = parse_iso(last_gov.get('timestamp'))
    ts_metric = parse_iso(last_metric.get('timestamp'))

    if ts_gov and ts_metric:
        if ts_metric < ts_gov:
            print("⚠️  Metrics log is lagging behind Governor logs. (Parity: WARNING)")
            print(f"   Gap: {ts_gov - ts_metric}")
        else:
            print("✅ Metrics log is up to date with Governor logs. (Parity: OK)")
    else:
        print("⚠️  Could not parse timestamps.")

if __name__ == "__main__":
    main()
