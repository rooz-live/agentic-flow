import csv
import json
import os
import sys
from pathlib import Path

def extract_domains_from_csv(csv_path, output_json):
    if not os.path.exists(csv_path):
        print(f"Error: File {csv_path} not found.")
        return False

    print(f"[*] Starting extraction for: {csv_path}")
    extracted_data = []

    try:
        with open(csv_path, 'r', encoding='utf-8-sig', errors='ignore') as f:
            reader = csv.reader(f)
            for row in reader:
                for cell in row:
                    cell = cell.strip()
                    # Same heuristic as before: contains '.' and > 3 length
                    # But we can split by space/slash if there are multiples
                    parts = cell.replace('/', ' ').split()
                    for part in parts:
                        part = part.strip()
                        if '.' in part and len(part) > 3:
                            # Basic check to avoid weird csv artifacts
                            if part not in extracted_data:
                                extracted_data.append(part)

        if extracted_data:
            final_payload = {
                "source": csv_path,
                "timestamp": str(Path(csv_path).stat().st_mtime),
                "extracted_domains": extracted_data,
                "count": len(extracted_data),
            }

            with open(output_json, "w") as out_f:
                json.dump(final_payload, out_f, indent=4)

            print(f"[+] Success! Extracted {len(extracted_data)} domains to {output_json}")
            return True
        else:
            print("[-] Extraction complete, but no domain patterns were identified.")
            return False

    except Exception as e:
        print(f"[-] Unexpected error during extraction: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 extract_csv_domains.py <input.csv> <output.json>")
        sys.exit(1)
        
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    success = extract_domains_from_csv(input_file, output_file)
    if not success:
        sys.exit(1)
