#!/usr/bin/env python3
"""Load canonical tag.vote redirect policy and render Apache htaccess."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:
    yaml = None  # type: ignore

CANONICAL_REL = "config/edge/tag_vote_redirect.yaml"
DOMAIN_ROUTES_REL = "config/edge/domain_routes.json"


def project_root(start: Path | None = None) -> Path:
    here = (start or Path(__file__)).resolve().parent
    for parent in [here, *here.parents]:
        if (parent / CANONICAL_REL).is_file():
            return parent
    return here.parents[1]


def load_policy(root: Path | None = None) -> dict[str, Any]:
    root = root or project_root()
    path = root / CANONICAL_REL
    if not path.is_file():
        raise FileNotFoundError(f"missing canonical redirect config: {path}")
    text = path.read_text(encoding="utf-8")
    if yaml is None:
        raise RuntimeError("PyYAML required to load tag_vote_redirect.yaml")
    data = yaml.safe_load(text)
    if not isinstance(data, dict):
        raise ValueError("tag_vote_redirect.yaml must be a mapping")
    return data


def destinations(policy: dict[str, Any]) -> tuple[str, str, str]:
    domain = str(policy.get("domain", "tag.vote"))
    apex = str(policy["policy"]["apex"]["destination"])
    cog = str(policy["policy"]["cog"]["destination"])
    return domain, apex, cog


def render_htaccess(policy: dict[str, Any]) -> str:
    _, apex, cog = destinations(policy)
    # Escape for Apache RewriteRule target (minimal)
    apex_esc = apex.replace("\\", "\\\\")
    cog_esc = cog.replace("\\", "\\\\")
    return f"""RewriteEngine On
RewriteCond %{{HTTPS}} off
RewriteRule ^(.*)$ https://%{{HTTP_HOST}}%{{REQUEST_URI}} [L,R=301,QSA]

RewriteRule ^cog/?$ {cog_esc} [R=301,L]
RewriteCond %{{HTTP_HOST}} ^tag\\.vote$ [OR]
RewriteCond %{{HTTP_HOST}} ^www\\.tag\\.vote$
RewriteRule ^/?$ {apex_esc} [R=301,L]

<IfModule mod_headers.c>
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires 0
</IfModule>
"""


def sync_domain_routes(root: Path | None = None, write: bool = False) -> dict[str, Any]:
    root = root or project_root()
    policy = load_policy(root)
    domain, apex, cog = destinations(policy)
    routes_path = root / DOMAIN_ROUTES_REL
    routes = json.loads(routes_path.read_text(encoding="utf-8"))
    updated = False
    for entry in routes.get("domains", []):
        if entry.get("fqdn") == domain:
            entry["expected_health"] = 302
            entry["expected_redirect"] = apex
            entry["expected_cog_redirect"] = cog
            entry["canonical"] = CANONICAL_REL
            updated = True
            break
    else:
        routes.setdefault("domains", []).append(
            {
                "fqdn": domain,
                "expected_health": 302,
                "expected_redirect": apex,
                "expected_cog_redirect": cog,
                "canonical": CANONICAL_REL,
            }
        )
        updated = True
    if write and updated:
        routes_path.write_text(json.dumps(routes, indent=2) + "\n", encoding="utf-8")
    return routes


def main(argv: list[str] | None = None) -> int:
    argv = argv or sys.argv[1:]
    root = project_root()
    if not argv:
        policy = load_policy(root)
        print(json.dumps({"domain": destinations(policy)[0], "apex": destinations(policy)[1], "cog": destinations(policy)[2]}))
        return 0
    cmd = argv[0]
    if cmd == "htaccess":
        print(render_htaccess(load_policy(root)), end="")
        return 0
    if cmd == "sync-domain-routes":
        sync_domain_routes(root, write="--write" in argv)
        return 0
    if cmd == "check":
        routes = sync_domain_routes(root, write=False)
        policy = load_policy(root)
        _, apex, cog = destinations(policy)
        for entry in routes.get("domains", []):
            if entry.get("fqdn") == policy.get("domain"):
                if entry.get("expected_redirect") != apex or entry.get("expected_cog_redirect") != cog:
                    print("FAIL: domain_routes.json drift from tag_vote_redirect.yaml", file=sys.stderr)
                    return 1
                print("OK: domain_routes.json matches canonical")
                return 0
        print("FAIL: tag.vote missing from domain_routes.json", file=sys.stderr)
        return 1
    print(f"unknown command: {cmd}", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
