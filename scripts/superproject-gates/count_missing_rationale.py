import json
import os

file_path = '.goalie/pattern_metrics.jsonl'
if not os.path.exists(file_path):
    print(f"File {file_path} not found.")
    exit(1)

missing = 0
total = 0
with open(file_path, 'r') as f:
    for line in f:
        if not line.strip(): continue
        total += 1
        try:
            data = json.loads(line)
            if data.get('rationale') is None or data.get('rationale') == "":
                missing += 1
        except: pass

print(f"Total entries: {total}")
print(f"Missing rationales: {missing}")
print(f"Coverage: {((total-missing)/total)*100:.1f}%")
