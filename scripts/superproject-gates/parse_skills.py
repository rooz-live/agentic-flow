
import sys
import re
import json

def parse_skills(input_text):
    skills = []
    current_skill = {}

    # Regex to capture skill header "#1: <Name>: <Workflow>"
    # Example: #1: Agile chaotic_workflow workflow: review, standup, refine, standup, wsjf
    header_pattern = re.compile(r'#\d+: (.*?): (.*)')

    for line in input_text.splitlines():
        line = line.strip()
        # Remove ANSI color codes
        line = re.sub(r'\x1b\[[0-9;]*m', '', line)

        header_match = header_pattern.search(line)
        if header_match:
            if current_skill:
                skills.append(current_skill)
            current_skill = {
                "name": header_match.group(1).strip(),
                "workflow": header_match.group(2).strip(),
                "description": "",
                "success_rate": 0.0,
                "uses": 0,
                "avg_reward": 0.0
            }
            continue

        if not current_skill:
            continue

        if line.startswith("Description:"):
            current_skill["description"] = line.replace("Description:", "").strip()
        elif line.startswith("Success Rate:"):
            rate_str = line.replace("Success Rate:", "").strip().replace("%", "")
            try:
                current_skill["success_rate"] = float(rate_str) / 100.0
            except:
                pass
        elif line.startswith("Uses:"):
            try:
                current_skill["uses"] = int(line.replace("Uses:", "").strip())
            except:
                pass
        elif line.startswith("Avg Reward:"):
            try:
                current_skill["avg_reward"] = float(line.replace("Avg Reward:", "").strip())
            except:
                pass

    if current_skill:
        skills.append(current_skill)

    return {"skills": skills}

if __name__ == "__main__":
    input_text = sys.stdin.read()
    result = parse_skills(input_text)
    print(json.dumps(result, indent=2))
