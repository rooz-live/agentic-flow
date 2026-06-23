import json
import os

manifests = [
    "TLD/art/artchat/manifest.json",
    "TLD/bio/mbo/manifest.json",
    "TLD/cab/epic/manifest.json",
    "TLD/chat/720/manifest.json",
    "TLD/com/decisioncall/manifest.json",
    "TLD/com/goodreadr/manifest.json",
    "TLD/com/nextwavenetwork/manifest.json",
    "TLD/com/paylicious/manifest.json",
    "TLD/com/quoteparty/manifest.json",
    "TLD/com/splitcite/manifest.json",
    "TLD/com/summerjobswap/manifest.json",
    "TLD/com/yocloud/manifest.json",
    "TLD/com/yoservice/manifest.json",
    "TLD/dev/iconoclash/manifest.json",
    "TLD/fans/chatfans/manifest.json",
    "TLD/life/yo/manifest.json",
    "TLD/org/eneu/manifest.json",
    "TLD/vote/amp/manifest.json",
    "TLD/vote/tag/manifest.json"
]

for p in manifests:
    if not os.path.exists(p): continue
    try:
        with open(p, "r") as f:
            data = json.load(f)
        if "app_id" not in data:
            data["app_id"] = f"com.bhopti.{data.get('short_name', data.get('name', 'app')).lower().replace(' ', '')}"
            with open(p, "w") as f:
                json.dump(data, f, indent=2)
            print(f"Updated {p}")
    except Exception as e:
        print(e)
