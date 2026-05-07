import json

with open('numbers_csv_extracted.json', 'r') as f:
    extracted = json.load(f)
    domains = extracted.get("extracted_domains", [])

with open('legal-entity-matrix.json', 'r') as f:
    matrix = json.load(f)

# Insert it as a new structural boundary
matrix["layer_4"]["raw_ingestion_layer"] = {
    "description": "Raw mathematical topological boundaries imported from Apple Numbers Domains.csv",
    "domains_count": len(domains),
    "extracted_domains": domains,
    "status": "ingested_pending_wsjf_sort"
}

with open('legal-entity-matrix.json', 'w') as f:
    json.dump(matrix, f, indent=2)

print("Injected 392 domains into legal-entity-matrix.json")
