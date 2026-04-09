import json
import os

file_path = '.goalie/pattern_metrics.jsonl'
if not os.path.exists(file_path):
    print(f"File {file_path} not found.")
    exit(1)

temp_path = file_path + '.tmp'
with open(file_path, 'r') as f, open(temp_path, 'w') as out:
    for line in f:
        if not line.strip(): continue
        try:
            data = json.loads(line)
            if data.get('rationale') is None or data.get('rationale') == "":
                data['rationale'] = f"Backfilled rationale for {data.get('pattern', 'unknown')} pattern"
            out.write(json.dumps(data) + '\n')
        except:
            out.write(line)

os.replace(temp_path, file_path)
print("Backfilled rationales where missing.")
