import sys
import os

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

    for case in test_cases:
        context = {"command": case["command"]}
        tags = system.extract_beam_tags(context)

        # For "npm audit fix", accept either mitigation:security or mitigation:debugging
        if case["command"] == "npm audit fix":
            assert (
                "mitigation:security" in tags or "mitigation:debugging" in tags
            ), f"Expected mitigation tag for '{case['command']}', got {tags}"
        else:
            assert case["expected"] in tags, (
                f"Expected '{case['expected']}' in tags for '{case['command']}', got {tags}"
            )

if __name__ == "__main__":
    test_beam_tagging()
