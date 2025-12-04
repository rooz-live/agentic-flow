import sys
import os
import json

# Add scripts/agentic to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../scripts/agentic')))

from learning_hooks_system import LearningHooksSystem

def test_beam_tagging():
    system = LearningHooksSystem(repo_root=os.getcwd())

    test_cases = [
        {
            "command": "npm run test",
            "expected": "enablement:testing"
        },
        {
            "command": "./scripts/deploy.sh prod",
            "expected": "business:delivery"
        },
        {
            "command": "python3 migrate_db.py",
            "expected": "architecture:database"
        },
        {
            "command": "npm audit fix",
            "expected": "mitigation:security" # 'audit' triggers security, 'fix' triggers debugging.
        },
        {
            "command": "echo 'hello world'",
            "expected": "enablement:general"
        }
    ]

    print("🧪 Verifying BEAM Tagging Logic...")
    failed = False

    for case in test_cases:
        context = {"command": case["command"]}
        tags = system.extract_beam_tags(context)

        # Check if expected tag is present (partial match logic for multiple tags)
        # For "npm audit fix", we expect at least mitigation:security OR mitigation:debugging

        found = False
        if case["expected"] in tags:
            found = True

        # Special handling for multi-tag expectation
        if case["command"] == "npm audit fix":
             if "mitigation:security" in tags and "mitigation:debugging" in tags:
                 found = True

        if found:
            print(f"  ✅ '{case['command']}' -> {tags}")
        else:
            print(f"  ❌ '{case['command']}' -> {tags} (Expected: {case['expected']})")
            failed = True

    if failed:
        sys.exit(1)
    else:
        print("\n✨ All BEAM tagging tests passed!")
        sys.exit(0)

if __name__ == "__main__":
    test_beam_tagging()
