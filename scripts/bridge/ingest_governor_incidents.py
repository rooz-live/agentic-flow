import json
import subprocess
import os
import sys

# Paths relative to project root
GOV_LOG = "logs/governor_incidents.jsonl"
WATERMARK_FILE = ".goalie/governor_ingest_watermark"

def get_watermark():
    if os.path.exists(WATERMARK_FILE):
        try:
            with open(WATERMARK_FILE, 'r') as f:
                return int(f.read().strip())
        except:
            return 0
    return 0

def set_watermark(lines_read):
    os.makedirs(os.path.dirname(WATERMARK_FILE), exist_ok=True)
    with open(WATERMARK_FILE, 'w') as f:
        f.write(str(lines_read))

def ingest():
    if not os.path.exists(GOV_LOG):
        print(f"❌ Log file {GOV_LOG} not found.")
        return

    start_line = get_watermark()
    current_line = 0
    ingested = 0
    
    print(f"🚀 Starting ingestion from line {start_line}...")
    
    with open(GOV_LOG, 'r') as f:
        for line in f:
            current_line += 1
            if current_line <= start_line:
                continue
            
            try:
                incident = json.loads(line)
                
                # Map incident to agentdb reflexion
                timestamp = incident.get("timestamp", "unknown")
                session_id = f"governor-{timestamp[:10]}"
                task = "maintain_system_stability"
                reward = "0.0" # Punishment for incident
                success = "false"
                reason = incident.get('reason', 'unknown')
                load1 = incident.get('load1', 'N/A')
                critique = f"Incident: {reason} - {incident.get('command')}. Load1: {load1}"
                input_data = line.strip()
                output_data = incident.get("action", "unknown")
                
                cmd = [
                    "npx", "agentdb", "reflexion", "store",
                    session_id, task, reward, success,
                    critique, input_data, output_data
                ]
                
                # Execute (suppress stdout to avoid noise, print errors)
                result = subprocess.run(cmd, capture_output=True, text=True)
                
                if result.returncode == 0:
                    ingested += 1
                    if ingested % 5 == 0:
                        print(f"  Processed {ingested} incidents...")
                else:
                    print(f"⚠️ Failed to ingest line {current_line}: {result.stderr.strip()}")

            except json.JSONDecodeError:
                print(f"⚠️ Skipping invalid JSON at line {current_line}")
            except Exception as e:
                print(f"❌ Error on line {current_line}: {e}")

    set_watermark(current_line)
    print(f"✅ Ingestion complete. Ingested {ingested} new incidents.")

if __name__ == "__main__":
    ingest()
