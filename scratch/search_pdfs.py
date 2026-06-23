import os
import sys
import json
import urllib.parse
import urllib.request
import ssl

def main():
    # Load .env
    env = {}
    with open("/Users/shahroozbhopti/Documents/code/.env") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            env[key.strip()] = val.strip().strip('"').strip("'")
            
    token_url = env.get("WHM_API_TOKEN", "")
    if token_url.startswith("op://"):
        # Let's run op read
        import subprocess
        res = subprocess.run(["op", "read", token_url], capture_output=True, text=True)
        token = res.stdout.strip()
    else:
        token = token_url
        
    host = env.get("CPANEL_HOST")
    user = "bhopti"
    
    ctx = ssl._create_unverified_context()
    
    def list_dir(path):
        url = f"https://{host}:2087/json-api/cpanel?cpanel_jsonapi_user={user}&cpanel_jsonapi_apiversion=3&cpanel_jsonapi_module=Fileman&cpanel_jsonapi_func=list_files&dir={urllib.parse.quote(path)}"
        req = urllib.request.Request(url)
        req.add_header("Authorization", f"whm root:{token}")
        try:
            with urllib.request.urlopen(req, context=ctx) as response:
                data = json.loads(response.read().decode())
                return data.get("result", {}).get("data", [])
        except Exception as e:
            print(f"Error listing {path}: {e}")
            return []

    def crawl(path):
        print(f"Crawling directory: {path}")
        items = list_dir(path)
        for item in items:
            name = item.get("file")
            fullpath = item.get("fullpath")
            # fullpath is like /home/bhopti/public_html/...
            # target path for API needs to be relative to home or public_html
            relpath = fullpath.replace("/home/bhopti/", "")
            
            if item.get("type") == "dir":
                crawl(relpath)
            elif item.get("type") == "file":
                if name.lower().endswith(".pdf"):
                    print(f"PDF Found: {fullpath} -> https://shahrooz.bhopti.com/{relpath.replace('public_html/', '')}")

    print("Crawling public_html/wp-content/uploads...")
    crawl("public_html/wp-content/uploads")

if __name__ == "__main__":
    main()
