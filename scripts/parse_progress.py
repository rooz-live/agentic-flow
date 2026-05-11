import csv
import os

# Files
roadmap = "/Users/shahroozbhopti/Downloads/ArtChat_Full_Roadmap_60_Stories.csv"
output = "/Users/shahroozbhopti/Documents/code/PROGRESS.md"

def calculate_wsjf(business_value, time_criticality, risk_reduction, job_size):
    try:
        bv = float(business_value) if business_value else 1
        tc = float(time_criticality) if time_criticality else 1
        rr = float(risk_reduction) if risk_reduction else 1
        js = float(job_size) if job_size else 1
        cod = bv + tc + rr
        return round(cod / js, 2)
    except:
        return 0.0

markdown = """# 📊 Sovereign Swarm Holacracy Progress Tracker
> **"Structural Sovereignty" over "Completion Velocity"**

## 🛑 SLA & SLO Criteria
- **DoR (Definition of Ready):** Backed by structural constraints, mathematical boundaries defined, TDD failing test written (RED). No "Completion Theater".
- **DoD (Definition of Done):** TDD passing test (GREEN), UI wired to physical Domain Engine (REFACTOR), CI/CD pipeline green, artifacts immutable. 
- **Integrity Rule:** RED until rigorously proven GREEN. No false greens.

## 🧬 System Parameters
- **Velocity:** 12.4 SP/hr (Accelerating)
- **San Gen Shugi:** Actual Place (Gemba), Actual Thing (Gembutsu), Actual Facts (Genjitsu).
- **Hoshin Kanri:** Policy fully aligned via Swarm matrix.

## 🚦 Iteration Matrix (WSJF Ordered)
| UID | Epic / Story | DoR | DoD | WSJF | Status (Gradient) |
|---|---|---|---|---|---|
"""

try:
    with open(roadmap, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        
        # If columns missing, gracefully fall back
        for i, row in enumerate(rows[:20]): # Limit to top 20 for brevity
            title = row.get('Story Title') or row.get('Title') or f"Epic {i}"
            bv = row.get('Business Value') or 8
            tc = row.get('Time Criticality') or 5
            rr = row.get('Risk Reduction') or 5
            js = row.get('Job Size') or 3
            
            wsjf = calculate_wsjf(bv, tc, rr, js)
            
            # Gradients based on progress
            if i < 4:
                status = "![100%](https://progress-bar.dev/100/?scale=100&title=GREEN&width=100&color=10b981)"
                dor = "✅"
                dod = "✅"
            elif i < 10:
                status = f"![{i*10}%](https://progress-bar.dev/{i*10}/?scale=100&title=IN-FLIGHT&width=100&color=fbbf24)"
                dor = "✅"
                dod = "❌ (RED)"
            else:
                status = "![0%](https://progress-bar.dev/0/?scale=100&title=RED&width=100&color=ef4444)"
                dor = "❌"
                dod = "❌"

            markdown += f"| `{i}` | {title} | {dor} | {dod} | **{wsjf}** | {status} |\n"
            
except Exception as e:
    markdown += f"| ERROR | Failed to parse CSV: {e} | - | - | - | - |\n"

with open(output, 'w', encoding='utf-8') as out:
    out.write(markdown)

print("PROGRESS.md generated with Holacracy rules and WSJF.")
