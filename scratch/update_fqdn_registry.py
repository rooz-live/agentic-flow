import yaml
from pathlib import Path

registry_path = Path("config/fqdn_registry.yaml")
with open(registry_path, "r", encoding="utf-8") as f:
    data = yaml.safe_load(f)

domains = data.get("domains", [])
new_domains = []
seen = set()

# Ensure telegram.epic.cab is present
has_telegram = False
for d in domains:
    if d.get("fqdn") == "telegram.epic.cab":
        has_telegram = True
        break

if not has_telegram:
    domains.append({
        "fqdn": "telegram.epic.cab",
        "service": "telegram-bridge",
        "origin": "23.92.79.2",
        "tls": True,
        "waf_enabled": False,
        "migration_status": "delegated",
        "health_path": "/",
        "roam_risk_id": "R-EDGE-01",
        "gate_tier": "smoke"
    })

smoke_subdomains = {
    "interface.rooz.live",
    "law.rooz.live",
    "hab.yo.life",
    "pur.tag.vote",
    "file.720.chat",
    "telegram.epic.cab"
}

for d in domains:
    fqdn = d.get("fqdn")
    if not fqdn:
        continue
    if fqdn in seen:
        print(f"Skipping duplicate: {fqdn}")
        continue
    seen.add(fqdn)
    
    # Set gate_tier
    if fqdn in smoke_subdomains:
        d["gate_tier"] = "smoke"
    else:
        if "gate_tier" not in d:
            d["gate_tier"] = "prod"
            
    new_domains.append(d)

data["domains"] = new_domains

with open(registry_path, "w", encoding="utf-8") as f:
    yaml.dump(data, f, sort_keys=False, default_flow_style=False)

print("Registry updated successfully!")
