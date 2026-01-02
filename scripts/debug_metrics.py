import json
from pathlib import Path

metrics_file = Path(".goalie/metrics_log.jsonl")
print(f"Reading {metrics_file.resolve()}")

if metrics_file.exists():
    try:
        with open(metrics_file, "r") as f:
            lines = f.readlines()
            print(f"Total lines: {len(lines)}")
            for i, line in enumerate(reversed(lines)):
                try:
                    data = json.loads(line)
                    print(f"Line -{i+1}: {data.keys()}")
                    if "average_score" in data:
                        print(f"Found score: {data['average_score']}")
                        break
                except json.JSONDecodeError as e:
                    print(f"JSON Error on line -{i+1}: {e}")
    except Exception as e:
        print(f"File Error: {e}")
else:
    print("File not found")
