import os
import shutil

BASE_DIR = "investing/agentic-flow/circles"

ROLES_CONFIG = {
    "analyst": [
        "Architect", "Custodian", "Owner", "Partner", "Researcher", "Steward", "Synthesizer"
    ],
    "assessor": [
        "Custodian", "Facilitator", "Lead", "Partner", "Steward", "Synthesizer"
    ],
    "innovator": [
        "AI Architect:Prototyper", "Builder", "Lead", "Owner", "Partner", "Researcher", "Scout", "Steward", "Synthesizer"
    ],
    "intuitive": [
        "Facilitator", "Framer", "Lead", "Mapper", "Partner", "Scout", "Steward"
    ],
    "orchestrator": [
        "Coordinator", "Facilitator", "Liaison", "Manager", "Partner", "Planner", "Steward"
    ],
    "seeker": [
        "Explorer", "Framer", "Lead", "Partner", "Pathfinder", "Prospector", "Researcher", "Scanner"
    ]
}

METRICS_CONFIG = {
    "orchestrator": """
**Key Metrics:**
*   **Flow Metrics:**
    *   Lead Time
    *   Cycle Time
    *   Throughput
    *   WIP Violations
""",
    "assessor": """
**Key Metrics:**
*   **Process Metrics:**
    *   Retro Insight -> Commit Time
    *   % Action Items Completed
    *   Context Switches
""",
    "analyst": """
**Key Metrics:**
*   **Learning Metrics:**
    *   # Experiments
    *   % Retro Items -> Features
    *   Time to Implement Learning
"""
}

def get_operational_dir_name(circle):
    if circle == "orchestrator":
        return "operational-orchestration-roles"
    else:
        return f"operational-{circle}-roles"

def cleanup_directories():
    print("--- Cleaning up directories ---")
    for circle in ROLES_CONFIG.keys():
        circle_path = os.path.join(BASE_DIR, circle)
        if not os.path.exists(circle_path):
            continue
            
        # Look for directories with trailing spaces in the circle directory
        for item in os.listdir(circle_path):
            item_path = os.path.join(circle_path, item)
            if os.path.isdir(item_path) and item.endswith(" "):
                new_name = item.rstrip()
                new_path = os.path.join(circle_path, new_name)
                print(f"Renaming '{item_path}' to '{new_path}'")
                shutil.move(item_path, new_path)

        # Also check inside the operational roles directory if it exists (as seen in file listing)
        # The file listing showed: analyst/operational-analyst-roles/operational-analyst-roles /
        # Let's handle recursive cleanup slightly deeper just in case
        op_dir_name = get_operational_dir_name(circle)
        op_path = os.path.join(circle_path, op_dir_name)
        
        if os.path.exists(op_path):
             for item in os.listdir(op_path):
                item_path = os.path.join(op_path, item)
                if os.path.isdir(item_path) and item.endswith(" "):
                    new_name = item.rstrip()
                    new_path = os.path.join(op_path, new_name)
                    print(f"Renaming '{item_path}' to '{new_path}'")
                    shutil.move(item_path, new_path)

def create_roles():
    print("\n--- Creating Roles ---")
    for circle, roles in ROLES_CONFIG.items():
        op_dir_name = get_operational_dir_name(circle)
        # Correct path seems to be: circles/<circle>/<op_dir>/<Role> based on standard, 
        # but listing shows circles/<circle>/<op_dir>/<op_dir> / ... sometimes?
        # Let's stick to the cleanest intended structure: circles/<circle>/<op_dir>/<Role>
        
        # However, looking at the file list:
        # analyst/operational-analyst-roles/Analyst/purpose.md exists.
        # So base for roles is circles/<circle>/<op_dir>
        
        base_role_path = os.path.join(BASE_DIR, circle, op_dir_name)
        
        if not os.path.exists(base_role_path):
            print(f"Creating directory: {base_role_path}")
            os.makedirs(base_role_path)

        for role in roles:
            role_path = os.path.join(base_role_path, role)
            if not os.path.exists(role_path):
                print(f"Creating role directory: {role_path}")
                os.makedirs(role_path)
            
            purpose_file = os.path.join(role_path, "purpose.md")
            if not os.path.exists(purpose_file):
                print(f"Creating purpose.md for {circle}/{role}")
                with open(purpose_file, "w") as f:
                    f.write(f"# {role} Role Purpose\n\nTo be defined.")

def update_metrics():
    print("\n--- Updating Metrics ---")
    for circle, metrics_text in METRICS_CONFIG.items():
        circle_path = os.path.join(BASE_DIR, circle)
        if not os.path.exists(circle_path):
            print(f"Circle directory not found: {circle}")
            continue

        # Find Circle Lead file
        # Priority 1: circles/<circle>/circle-lead-<...>/purpose.md
        # Priority 2: circles/<circle>/operational-<...>/<LeadRole>/purpose.md
        
        target_file = None
        
        # Search for circle-lead-* directories
        lead_dirs = [d for d in os.listdir(circle_path) if d.startswith("circle-lead-")]
        if lead_dirs:
            # Use the first one found, assuming one lead per circle
            lead_dir = lead_dirs[0]
            potential_file = os.path.join(circle_path, lead_dir, "purpose.md")
            if os.path.exists(potential_file):
                target_file = potential_file
        
        # Fallback to operational roles
        if not target_file:
            op_dir_name = get_operational_dir_name(circle)
            # Common lead role names
            possible_roles = ["Lead", "Circle Lead", "Orchestrator", "Analyst", "Assessor"] 
            # For specific circles, the primary role often acts as lead if no specific lead dir
            
            for role in possible_roles:
                 potential_file = os.path.join(circle_path, op_dir_name, role, "purpose.md")
                 if os.path.exists(potential_file):
                     target_file = potential_file
                     break
        
        if target_file:
            print(f"Updating metrics in: {target_file}")
            with open(target_file, "r") as f:
                content = f.read()
            
            if metrics_text.strip() not in content:
                with open(target_file, "a") as f:
                    f.write("\n" + metrics_text)
            else:
                print("Metrics already present.")
        else:
            print(f"Could not find Circle Lead purpose file for {circle}")

if __name__ == "__main__":
    cleanup_directories()
    create_roles()
    update_metrics()