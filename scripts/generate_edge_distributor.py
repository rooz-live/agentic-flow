import os
import json
import re

env_file = ".env"
build_dir = "build_artifacts"

with open(env_file, "r") as f:
    content = f.read()

# Extract the JSON mapping
match = re.search(r"CPANEL_USERS_MAPPING='({.*?})'", content, re.DOTALL)
if not match:
    print("Could not find CPANEL_USERS_MAPPING in .env")
    exit(1)

mapping = json.loads(match.group(1))

script_content = """#!/bin/bash
# Sovereign Swarm Zero-Trust Edge Distributor
# Deconstructed Monolith: Pushes only sterile artifacts to isolated boundaries.

if [ -z "$1" ]; then
    echo "Usage: bash deploy_to_edge.sh <swarm_access_node_zip_file>"
    exit 1
fi

ZIP_FILE="$1"

if [ ! -f "$ZIP_FILE" ]; then
    echo "Error: Zip file $ZIP_FILE not found!"
    exit 1
fi

echo "🌊 Initiating Zero-Trust Artifact Distribution..."

"""

for domain, user in mapping.items():
    script_content += f"""
echo "⚡ Provisioning tenant: {domain} (User: {user})"
TARGET_DIR="/home/{user}/public_html"

if [ -d "/home/{user}" ]; then
    # Wipe old monolith/remnants for clean room environment
    rm -rf "$TARGET_DIR"/*
    
    # Extract sterile artifact directly into the boundary
    unzip -q "$ZIP_FILE" -d "$TARGET_DIR"
    
    # Enforce Unix Cryptographic Identity (Zero Trust)
    chown -R {user}:{user} "$TARGET_DIR"
    find "$TARGET_DIR" -type d -exec chmod 750 {{}} \;
    find "$TARGET_DIR" -type f -exec chmod 640 {{}} \;
    
    echo "  ✅ {domain} Secured & Deployed."
else
    echo "  ❌ Tenant {user} does not exist on this physical hardware. Skipping."
fi
"""

script_content += "\necho \"🦅 Swarm Edge Distribution Complete!\"\n"

os.makedirs(build_dir, exist_ok=True)
script_path = os.path.join(build_dir, "deploy_to_edge.sh")

with open(script_path, "w") as f:
    f.write(script_content)

print(f"Generated physical zero-trust deployment ledger at {script_path}")
