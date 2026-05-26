import sys
import subprocess
import json

WHM_TOKEN = "R41YFU51UMU75BCTIFNQBPRYT6S5S9NN"
SOVEREIGN_IP = "23.92.79.2"

def add_dns_record(domain, name, record_type, address):
    url = f"https://127.0.0.1:2087/json-api/addzonerecord?api.version=1&domain={domain}&name={name}&type={record_type}&address={address}"
    curl_cmd = f"ssh -J stx -o StrictHostKeyChecking=no root@192.168.122.237 \"curl -sk -H 'Authorization: whm root:{WHM_TOKEN}' '{url}'\""
    try:
        result = subprocess.run(curl_cmd, shell=True, capture_output=True, text=True, timeout=15)
        if result.returncode != 0:
            print(f"❌ Curl failed for {name}.{domain}: {result.stderr.strip()}")
            return
        data = json.loads(result.stdout)
        if data.get("metadata", {}).get("result") == 1:
            print(f"✅ Added {record_type} record: {name}.{domain} -> {address}")
        else:
            reason = data.get("metadata", {}).get("reason", "Unknown")
            print(f"⚠️ {name}.{domain}: {reason}")
    except Exception as e:
        print(f"❌ Connection failed for {name}.{domain}: {e}")

print("Pushing specialized sub-meshes (Passbolt & Kwaai Workgroups)...")
add_dns_record("tag.ooo", "pass", "A", SOVEREIGN_IP)
add_dns_record("tag.ooo", "work", "A", SOVEREIGN_IP)
