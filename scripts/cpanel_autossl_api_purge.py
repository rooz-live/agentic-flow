import os
import json
import urllib.request
import urllib.error
import ssl

WHM_HOST = "yo.tag.ooo"
WHM_PORT = 2087
WHM_USER = "root"
WHM_TOKEN = os.environ.get("WHM_API_TOKEN", "")

# Ignore self-signed cert errors for the API if they don't have AutoSSL yet
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def whm_api_call(endpoint):
    url = f"https://{WHM_HOST}:{WHM_PORT}/json-api/{endpoint}"
    req = urllib.request.Request(url, headers={
        'Authorization': f'whm {WHM_USER}:{WHM_TOKEN}',
        'Accept': 'application/json'
    })
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=10) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        print(f"🔴 WHM API Error: {e.code} - {e.read().decode('utf-8')}")
        return None
    except Exception as e:
        print(f"🔴 Network Error: {e}")
        return None

def purge_autossl_exclusions():
    print(f"🦅 INITIATING WHM API EDGE PURGE -> {WHM_HOST}")
    if not WHM_TOKEN:
        print("❌ CRITICAL: WHM_API_TOKEN not found in environment. Ensure 'op run' is injecting it.")
        return

    print("--- 1. Fetching all cPanel users via WHM API ---")
    accts_data = whm_api_call("listaccts?api.version=1")
    if not accts_data or 'data' not in accts_data:
        print("❌ Failed to list accounts. Is the WHM_API_TOKEN valid?")
        return
    
    users = [acct['user'] for acct in accts_data['data']['acct']]
    print(f"✅ Discovered {len(users)} users.")

    print("--- 2. Purging AutoSSL Exclusions per Domain ---")
    for user in users:
        print(f"\nProcessing User: {user}")
        domain_data = whm_api_call(f"uapi_cpanel_call?api.version=1&cpanel.user={user}&module=DomainInfo&func=list_domains")
        
        if not domain_data or 'data' not in domain_data or 'result' not in domain_data['data']:
            continue
            
        domains_list = domain_data['data']['result']['data']
        
        # Domains can be under sub_domains, main_domain, parked_domains, addon_domains
        all_domains = []
        if 'main_domain' in domains_list:
            all_domains.append(domains_list['main_domain'])
        if 'sub_domains' in domains_list:
            all_domains.extend(domains_list['sub_domains'])
        if 'addon_domains' in domains_list:
            all_domains.extend(domains_list['addon_domains'])
        if 'parked_domains' in domains_list:
            all_domains.extend(domains_list['parked_domains'])

        for domain in all_domains:
            print(f" -> Removing SSL exclusion for {domain}")
            whm_api_call(f"uapi_cpanel_call?api.version=1&cpanel.user={user}&module=SSL&func=remove_autossl_excluded_domains&domains={domain}")

    print("\n--- 3. Triggering Global AutoSSL Check ---")
    # Note: WHM doesn't expose a direct 'run for all' API reliably in v1, so we run per user
    for user in users:
        print(f" -> Queuing AutoSSL check for user: {user}")
        whm_api_call(f"start_background_autossl_check?api.version=1&username={user}")

    print("\n✅ API Edge Purge Complete. AutoSSL is re-running in the background.")

if __name__ == "__main__":
    purge_autossl_exclusions()
