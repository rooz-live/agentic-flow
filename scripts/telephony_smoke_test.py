import os
import json
import urllib.request
import urllib.error

TELNYX_API_KEY = os.environ.get("TELNYX_API_KEY", "mock_telnyx_key")
PLIVO_AUTH_ID = os.environ.get("PLIVO_AUTH_ID", "mock_plivo_id")
PLIVO_AUTH_TOKEN = os.environ.get("PLIVO_AUTH_TOKEN", "mock_plivo_token")

TARGET_NUMBER = "+14122568390"

def send_telnyx_sms():
    print(f"\n--- [Telnyx] Initiating Physical SMS Handshake to {TARGET_NUMBER} ---")
    message = "Hey Shahrooz, noticed your Niche business doesn't have a modern website. We build sovereign UI phase gates. Open to a quick chat?"
    
    payload = json.dumps({
        "to": TARGET_NUMBER,
        "from": "+15550000000",
        "text": message
    }).encode('utf-8')
    
    req = urllib.request.Request("https://api.telnyx.com/v2/messages", data=payload, headers={
        'Authorization': f'Bearer {TELNYX_API_KEY}',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    })
    
    try:
        urllib.request.urlopen(req, timeout=5)
        print("🟢 SUCCESS: SMS Dispatched via Telnyx.")
    except urllib.error.HTTPError as e:
        print(f"🔴 Telnyx Boundary Response: {e.code} (Expected 401 if OP keys aren't injected)")
    except Exception as e:
        print(f"🔴 Telnyx Network Error: {e}")

def send_plivo_tts():
    print(f"\n--- [Plivo] Initiating Physical TTS/Voice Handshake to {TARGET_NUMBER} ---")
    import base64
    auth_b64 = base64.b64encode(f"{PLIVO_AUTH_ID}:{PLIVO_AUTH_TOKEN}".encode()).decode()
    
    payload = json.dumps({
        "to": TARGET_NUMBER,
        "from": "15550000000",
        "answer_url": "https://raw.githubusercontent.com/plivo/plivo-examples/master/speak.xml",
        "answer_method": "GET"
    }).encode('utf-8')
    
    req = urllib.request.Request(f"https://api.plivo.com/v1/Account/{PLIVO_AUTH_ID}/Call/", data=payload, headers={
        'Authorization': f'Basic {auth_b64}',
        'Content-Type': 'application/json'
    })
    
    try:
        urllib.request.urlopen(req, timeout=5)
        print("🟢 SUCCESS: Voice Call Dispatched via Plivo.")
    except urllib.error.HTTPError as e:
        print(f"🔴 Plivo Boundary Response: {e.code} (Expected 401/404 if OP keys aren't injected)")
    except Exception as e:
        print(f"🔴 Plivo Network Error: {e}")

if __name__ == "__main__":
    send_telnyx_sms()
    send_plivo_tts()
    print("\n✅ Physical Telecom Sweeps Complete.\n")
