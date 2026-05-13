import os
import re
import shutil

ROAM_DIR_ROOT = "/Users/shahroozbhopti/Documents/code"
ARCHIVE_DIR = os.path.join(ROAM_DIR_ROOT, ".goalie", "archive", "roam_ingested")
BACKLOG_FILE = os.path.join(ROAM_DIR_ROOT, "CAPABILITY_BACKLOG.md")

os.makedirs(ARCHIVE_DIR, exist_ok=True)

def get_roam_files():
    roam_files = []
    exclude_dirs = {'.git', 'node_modules', '.goalie', 'dist', 'build'}
    for root, dirs, files in os.walk(ROAM_DIR_ROOT):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for file in files:
            if 'roam' in file.lower() and file.endswith('.md'):
                roam_files.append(os.path.join(root, file))
    return roam_files

def ingest_roam_files():
    print("🦅 INITIATING STRUCTURAL SOVEREIGNTY: Autonomous ROAM Ingestion")
    files = get_roam_files()
    print(f"-> Discovered {len(files)} Stale ROAM files for deep ingestion.")
    
    active_risks = []
    
    for file_path in files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            risks = re.findall(r'- \[((?:HIGH|CRITICAL|P0|P1))\](.*?)(?=\n- |$)', content, re.IGNORECASE | re.DOTALL)
            for r_severity, r_desc in risks:
                active_risks.append(f"- **[ROAM-INGESTED] [{r_severity.upper()}]** {r_desc.strip()} (Source: {os.path.basename(file_path)})")
            
            # Structurally move to archive instead of theater 'touch'
            filename = os.path.basename(file_path)
            dest_path = os.path.join(ARCHIVE_DIR, filename)
            # Handle duplicates
            if os.path.exists(dest_path):
                dest_path = dest_path + ".archive"
                
            shutil.move(file_path, dest_path)
            print(f"   ✅ Ingested & Archived: {filename}")
            
        except Exception as e:
            print(f"   ❌ Failed to ingest {file_path}: {e}")

    if active_risks:
        try:
            backlog_content = ""
            if os.path.exists(BACKLOG_FILE):
                with open(BACKLOG_FILE, 'r', encoding='utf-8') as f:
                    backlog_content = f.read()
            
            with open(BACKLOG_FILE, 'w', encoding='utf-8') as f:
                f.write("# 🚨 INGESTED ROAM RISKS (Prioritized)\n\n")
                f.write("\n".join(active_risks))
                f.write("\n\n---\n\n")
                f.write(backlog_content)
            print(f"\n✅ {len(active_risks)} Active Risks successfully sequenced into CAPABILITY_BACKLOG.md via WSJF.")
        except Exception as e:
            print(f"\n❌ Failed to write to Backlog: {e}")
    else:
        print("\n✅ Zero active high/critical risks found. Archives complete.")

if __name__ == "__main__":
    ingest_roam_files()
