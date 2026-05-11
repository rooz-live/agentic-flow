import csv
import os

CSV_PATH = '/Users/shahroozbhopti/Downloads/ArtChat_Full_Roadmap_60_Stories.csv'
BACKLOG_PATH = '/Users/shahroozbhopti/Documents/code/CAPABILITY_BACKLOG.md'

def generate_markdown_backlog():
    if not os.path.exists(CSV_PATH):
        print(f"Error: Could not find {CSV_PATH}")
        return

    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        stories = list(reader)

    # Sort by Sprint target and Priority
    # (Assuming P0, P1, P2 sorting works lexically)
    stories.sort(key=lambda x: (x.get('sprint_target', 'Z'), x.get('priority', 'Z')))

    md_content = [
        "# 🌐 SOVEREIGN SWARM: HORIZON BACKLOG",
        "**Holacracy DoR / DoD Enforced Tracking**\n",
        "| ID | Status | Epic | Capability | Product Domain | Priority | Effort |",
        "|----|--------|------|------------|----------------|----------|--------|"
    ]

    for row in stories:
        # Determine status (All RED by default for Structural Sovereignty, unless completed)
        status = "🔴 RED"
        epic = row.get('epic', 'Unknown')
        capability = row.get('theme', 'Unknown')
        domain = row.get('product_domain', 'All')
        priority = row.get('priority', 'P3')
        effort = row.get('effort_points', '?')
        uid = row.get('id', 'US-XXX')

        md_content.append(f"| {uid} | {status} | {epic} | {capability} | {domain} | {priority} | {effort} |")

    # Add WSJF metrics block
    md_content.append("\n## 📊 WSJF Orchestration Metrics")
    md_content.append("- **Total Ingested Stories**: " + str(len(stories)))
    md_content.append("- **Current Velocity**: 0.0 (Awaiting CI/CD TDD Verification)")
    md_content.append("- **Sovereign Status**: All signals RED until tests map to true physics.")

    with open(BACKLOG_PATH, 'w', encoding='utf-8') as f:
        f.write("\n".join(md_content))

    print(f"Successfully ingested {len(stories)} stories into CAPABILITY_BACKLOG.md")

if __name__ == "__main__":
    generate_markdown_backlog()
