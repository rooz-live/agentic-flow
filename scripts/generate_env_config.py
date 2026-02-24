#!/usr/bin/env python3
import json
import os

CATALOG_PATH = os.path.join(os.path.dirname(__file__), '../config/env.catalog.json')
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), '../.env.example')

def generate_env_example():
    try:
        with open(CATALOG_PATH, 'r') as f:
            data = json.load(f)

        lines = []
        lines.append("# Environment Configuration Template")
        lines.append("# Generated from config/env.catalog.json")
        lines.append("# DO NOT EDIT MANUALLY - Update env.catalog.json instead")
        lines.append("")

        # Sort keys for consistency or use catalog order (Python 3.7+ dicts preserve order)
        # Assuming catalog order is logical
        for key, info in data.items():
            desc = info.get('desc', '')
            default = info.get('default', '')

            lines.append(f"# {desc}")
            if info.get('secret', False):
                lines.append(f"{key}=")
            else:
                lines.append(f"{key}={default}")
            lines.append("")

        with open(OUTPUT_PATH, 'w') as f:
            f.write('\n'.join(lines))

        print(f"Generated {OUTPUT_PATH}")

    except FileNotFoundError:
        print(f"Error: {CATALOG_PATH} not found.")
    except json.JSONDecodeError:
        print(f"Error: Invalid JSON in {CATALOG_PATH}")

if __name__ == "__main__":
    generate_env_example()
