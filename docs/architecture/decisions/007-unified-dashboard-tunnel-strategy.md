# 007. Unified Dashboard Tunnel Strategy (Discovery)

Date: 2026-03-08

## Status

Accepted (Discovery Phase Completed)

## Context

The legal swarms rely heavily on maintaining situational awareness via dynamic UI overlays, specifically `WSJF-LIVE-V4-INTERACTIVE.html` and other local semantic visualizations. Currently, access to these artifacts is rigidly bound to the local LAN filesystem (`file:///Users/...`). To enable true dynamic mobility and remote coordination (specifically matching the `interface.rooz.live` sub-domain requirement for field arbitration), we require a secure tunnel strategy routing localhost dashboard metrics over the global WWW without exposing the underlying macOS filesystem to arbitrary ingress.

## Options Evaluated

1. **ngrok (`ngrok http 8080`)**:
   - Pros: Immediate setup, dynamic wildcard DNS, industry standard for localhost relays.
   - Cons: Bandwidth limits on free tiers, unbranded URLs unless paying for Custom Domains (`interface.rooz.live`).
2. **Tailscale Funnel (`tailscale funnel 8080`)**:
   - Pros: Completely free. Securely bridges nodes over WireGuard mesh. Funnel allows public internet access to local services via a Tailnet-provisioned domain which can be CNAME'd to `interface.rooz.live`. No aggressive WAF/OAuth Pro tier paywalls.
   - Cons: Requires Tailscale client installation (`brew install tailscale`).
3. **Local Reverse Proxy (Nginx/Traefik) + Dynamic DNS**:
   - Pros: 100% self-hosted, no third-party telemetry.
   - Cons: Fragile Port Forwarding on generic residential ISPs, high maintenance ceiling for SSL cert renewals via Let's Encrypt.
4. **GitHub Codespaces Port Forwarding**:
   - Pros: Extremely fluid for remote IDEs.
   - Cons: Completely impractical for persisting a dedicated local macOS interactive dashboard into a 24/7 standalone web URI.

## Update: ngrok v3 Configuration (2026-03-09)

After upgrading to ngrok paid tier, the tunnel strategy now includes v3 configuration support:

### ngrok v3 Config Location
- **File**: `~/.ngrok2/ngrok.yml`
- **Format**: v3 with `api_key` authentication
- **Template**: `_SYSTEM/_AUTOMATION/ngrok-v3-config.yml`

### ngrok v3 Features Enabled
1. **Reserved Domain**: `interface-tag-vote.ngrok.io` (with paid plan)
2. **Persistent URL**: No more random URL changes on restart
3. **Named Tunnels**: `dashboard` tunnel defined in config
4. **Exit Code Integration**: New exit codes 170-172 for ngrok-specific failures

### Updated Cascade Priority
```
Tier 1: Tailscale Funnel (interface.rooz.live) - Free, requires CNAME
Tier 2: ngrok v3 (interface-tag-vote.ngrok.io) - Paid, reserved domain ✅ UPGRADED
Tier 3: Cloudflare Quick Tunnel (ephemeral) - Free, random URL
Tier 4: localtunnel (ephemeral) - Free, npm required
```

### Exit Code Additions
| Code | Meaning | Action |
|------|---------|--------|
| 170 | ngrok api_key missing | `ngrok config add-authtoken <token>` |
| 171 | ngrok v3 config missing | Copy template to `~/.ngrok2/ngrok.yml` |
| 172 | Reserved domain available | Upgrade ngrok plan for custom domain |

### Configuration Commands
```bash
# 1. Add authtoken (creates ~/.ngrok2/ngrok.yml)
ngrok config add-authtoken <YOUR_TOKEN>

# 2. Copy v3 template with named tunnels
cp _SYSTEM/_AUTOMATION/ngrok-v3-config.yml ~/.ngrok2/ngrok.yml

# 3. Edit to add your reserved domain (after upgrading)
# domain: interface-tag-vote.ngrok.io

# 4. Start with v3 config
ngrok start dashboard --config=~/.ngrok2/ngrok.yml
```

## Original Decision (Preserved)

We will implement **Option 2: Tailscale Funnel (`tailscale funnel 8080`)** for all internal connections and basic public tunneling.
**ngrok** will be used exclusively when there is a need to inspect specific HTTP requests or bypass stringent Tailscale port restrictions. ngrok will only be upgraded to Pro if a static domain or high-volume bandwidth is required for a client-facing demo.

Because the `WSJF-LIVE-V4-INTERACTIVE.html` capabilities have been fully augmented with the older interactive SFT+RL tracking, a dedicated `deploy-tunnel.sh` module will wrap Python's native `http.server` over the `00-DASHBOARD/` directory stringently. `tailscale` will operate as the primary ingress tying `localhost:8080` securely to the public internet, after which a DNS CNAME will map to `interface.rooz.live`.

## Consequences

- Requires Homebrew installation of `tailscale`.
- Alleviates the need for paid/premium WAF setups required by Cloudflare or ngrok for basic dashboard access.
- Creates full untethered mobility for Field Arbitration phases without compromising the root system via generic port forwarding.

## CSQBM Matrix Boundary Integration (Wave 20 Update)
Any remote tunnel ingress point deploying the dashboard interface represents a critical interactive system edge. To defend against hallucinatory states during field arbitration deployments (e.g., via `interface.rooz.live`), the underlying tunnel orchestration wrapper (`deploy-tunnel.sh`) structurally sources the `validation-core.sh` reality matrix. This guarantees that all metrics dynamically relayed across the WWW tunnel are physically bound to the `[NOW: HOUR]` intelligence loop, enforcing the `agentdb_freshness` bounds across the entire ingress perimeter.
