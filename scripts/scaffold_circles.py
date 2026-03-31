import os
from pathlib import Path

# Base directory for circles
BASE_DIR = Path("/Users/shahroozbhopti/Documents/code/investing/agentic-flow/circles")

# Structure definition based on user request
# Format: Circle -> { Subdir -> [Roles/Subdirs] }
STRUCTURE = {
    "analyst": {
        "circle-lead-analytics/Standards Steward/analyst-as-chief": [],
        "operational-analyst-roles": [
            "Analyst", "Architect", "Custodian", "Owner", "Partner",
            "Researcher", "Steward", "Synthesizer"
        ]
    },
    "assessor": {
        "circle-lead-performance-assurance-assessment/Standards Steward/assessor-as-chief": [],
        "operational-assessor-roles": [
            "Assessor", "Custodian", "Facilitator", "Lead", "Partner",
            "Steward", "Synthesizer"
        ]
    },
    "innovator": {
        "circle-lead-innovation/Investment Council Facilitator/innovator-as-chief": [],
        "operational-innovator-roles": [
            "AI Architect:Prototyper", "Builder", "Catalyst", "Lead",
            "Owner", "Partner", "Researcher", "Scout", "Steward", "Synthesizer"
        ]
    },
    "intuitive": {
        "circle-lead-sensemaking-strategy-experience/Standards Steward/intuitive-as-chief": [],
        "operational-intuitive-roles": [
            "Facilitator", "Framer", "Lead", "Mapper", "Partner",
            "Scout", "Steward", "Synthesizer"
        ]
    },
    "orchestrator": {
        "circle-lead-accountabilities/Standards Steward/orchestrator-as-chief": [],
        "operational-orchestration-roles": [
            "Coordinator", "Facilitator", "Liaison", "Manager",
            "Orchestrator", "Partner", "Planner", "Steward"
        ]
    },
    "seeker": {
        "circle-lead-exploration-discovery/Standards Steward/seeker-as-chief": [],
        "operational-exploration-discovery-roles": [
            "Explorer", "Framer", "Lead", "Partner", "Pathfinder",
            "Prospector", "Researcher", "Scanner", "Scout"
        ]
    }
}

# Default files to create in each role directory
ROLE_FILES = {
    "purpose.md": "# Purpose\n\n[Define the purpose of this role]",
    "accountabilities.md": "# Accountabilities\n\n- [List accountabilities]",
    "domains.md": "# Domains\n\n- [List domains]",
    "backlog.md": "# Backlog\n\n## Current\n- [ ] \n\n## Future\n- [ ] "
}

def create_structure():
    print(f"🚀 Scaffolding Circles in {BASE_DIR}...")

    for circle, contents in STRUCTURE.items():
        circle_dir = BASE_DIR / circle
        if not circle_dir.exists():
            print(f"Creating circle directory: {circle}")
            circle_dir.mkdir(parents=True, exist_ok=True)

        for path, roles in contents.items():
            # Handle nested paths like "circle-lead-analytics/Standards Steward/..."
            full_path = circle_dir / path
            full_path.mkdir(parents=True, exist_ok=True)

            # Create files for the leaf node of the path if it's a specific role path
            # e.g. analyst-as-chief
            if not roles:
                # It's a specific role path, create standard files
                for filename, content in ROLE_FILES.items():
                    file_path = full_path / filename
                    if not file_path.exists():
                        with open(file_path, "w") as f:
                            f.write(content)

            # Handle operational roles lists
            for role in roles:
                # Handle roles with colons (replace with underscore or keep as dir name?)
                # macOS supports colons in Finder but they appear as forward slashes in terminal usually.
                # Best practice: replace colon with underscore for filesystem safety
                safe_role_name = role.replace(":", "_")
                role_dir = full_path / safe_role_name
                role_dir.mkdir(parents=True, exist_ok=True)

                print(f"  + Role: {circle}/{path}/{safe_role_name}")

                for filename, content in ROLE_FILES.items():
                    file_path = role_dir / filename
                    if not file_path.exists():
                        with open(file_path, "w") as f:
                            f.write(content)

    print("✅ Scaffolding complete.")

if __name__ == "__main__":
    create_structure()
