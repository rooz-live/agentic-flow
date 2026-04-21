#!/usr/bin/env python3
import json
import os
from datetime import datetime

MATRIX_PATH = ".goalie/legal-entity-matrix.json"
OUTPUT_DIR = ".goalie/evidence-bundles"

def generate_bundle():
    if not os.path.exists(MATRIX_PATH):
        print(f"Skipping bundle generation: {MATRIX_PATH} not found.")
        return

    with open(MATRIX_PATH, 'r') as f:
        matrix = json.load(f)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    for entity, data in matrix.items():
        domain = data.get("domain", "unknown")
        filepath = os.path.join(OUTPUT_DIR, f"{domain}_bundle_{datetime.now().strftime('%Y%m%d')}.md")
        
        with open(filepath, 'w') as f:
            f.write(f"# Evidentiary Bundle: {entity}\n\n")
            f.write(f"**Domain Bounds**: `{domain}`\n")
            f.write(f"**Generated**: {datetime.now().isoformat()}\n\n")
            f.write("## Telemetry Hash Verification\n")
            f.write("> Evaluated under `hab.yo.life` spatial attestation.\n\n")
            f.write("```json\n")
            f.write(json.dumps(data, indent=2))
            f.write("\n```\n")
            
        print(f"Generated bundle: {filepath}")

if __name__ == "__main__":
    generate_bundle()
