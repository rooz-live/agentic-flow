import os
import json
import urllib.request
import urllib.error
import base64

TELNYX_API_KEY = os.environ.get("TELNYX_API_KEY", "")
PLIVO_AUTH_ID = os.environ.get("PLIVO_AUTH_ID", "")
PLIVO_AUTH_TOKEN = os.environ.get("PLIVO_AUTH_TOKEN", "")

def fetch_telnyx_numbers():
    print("\n--- [Telnyx] Fetching Owned Phone Numbers ---")
    if not TELNYX_API_KEY:
        print("🔴 ERROR: TELNYX_API_KEY not found in environment.")
        return

    req = urllib.request.Request("https://api.telnyx.com/v2/phone_numbers", headers={
        'Authorization': f'Bearer {TELNYX_API_KEY}',
        'Accept': 'application/json'
    })
    
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            numbers = data.get("data", [])
            if not numbers:
                print("🟢 SUCCESS: Authentication passed, but 0 phone numbers found in Telnyx account.")
            for number in numbers:
                print(f"🟢 FOUND TELNYX NUMBER: {number.get('phone_number')} (Status: {number.get('status')})")
    except urllib.error.HTTPError as e:
        print(f"🔴 Telnyx API Error: {e.code} - {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"🔴 Network Error: {e}")

def fetch_plivo_numbers():
    print("\n--- [Plivo] Fetching Owned Phone Numbers ---")
    if not PLIVO_AUTH_ID or not PLIVO_AUTH_TOKEN:
        print("🔴 ERROR: Plivo Auth credentials not found in environment.")
        return

    auth_b64 = base64.b64encode(f"{PLIVO_AUTH_ID}:{PLIVO_AUTH_TOKEN}".encode()).decode()
    req = urllib.request.Request(f"https://api.plivo.com/v1/Account/{PLIVO_AUTH_ID}/Number/", headers={
        'Authorization': f'Basic {auth_b64}',
        'Accept': 'application/json'
    })
    
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            numbers = data.get("objects", [])
            if not numbers:
                 print("🟢 SUCCESS: Authentication passed, but 0 phone numbers found in Plivo account.")
            for number in numbers:
                print(f"🟢 FOUND PLIVO NUMBER: {number.get('number')} (Type: {number.get('number_type')})")
    except urllib.error.HTTPError as e:
        print(f"🔴 Plivo API Error: {e.code} - {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"🔴 Network Error: {e}")

if __name__ == "__main__":
    fetch_telnyx_numbers()
    fetch_plivo_numbers()
    print("\n✅ Telecom Inventory Sweep Complete.\n")
