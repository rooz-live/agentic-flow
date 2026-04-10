# Infrastructure Workflow — cPanel / WHM / STX / OpenStack / HostBill

Operational guide for the unified infra automation layer added in
[feat(infra/phase1)](../scripts/infra/credentials/.env.cpanel.example) and
[feat(infra/phases2-6)](../scripts/infra/run-health.sh).

---

## Quick Start

```bash
# 1. Bootstrap credentials (one-time)
./scripts/infra/cpanel/cpanel-env-setup.sh --persist
#    → creates scripts/infra/credentials/.env.cpanel (gitignored)
#    → fill in tokens and keys in that file

# 2. Register SSL monitor as a background launchd service (macOS)
./scripts/infra/cpanel/cpanel-env-setup.sh --register-launchd
#    → installs com.agentic-flow.ssl-monitor every 4 hours

# 3. Source credentials into the current shell
source scripts/infra/credentials/.env.cpanel

# 4. Run a passive health check across all targets
./scripts/infra/run-health.sh
```

---

## Credential File

**Path**: `scripts/infra/credentials/.env.cpanel`
**Template**: `scripts/infra/credentials/.env.cpanel.example`
**Status**: gitignored — never committed

The credential file is the single source of truth for:

| Variable | Service | Purpose |
|---|---|---|
| `CPANEL_HOST` | cPanel | Remote hostname (`yo.tag.ooo`) |
| `CPANEL_USER` | cPanel | cPanel account username |
| `CPANEL_API_TOKEN` | cPanel | UAPI token (not root password) |
| `WHM_API_TOKEN` | WHM | WHM `whmapi1` token (separate from cPanel) |
| `CPANEL_SSH_KEY` | SSH | Path to PEM key (`~/pem/rooz.pem`) |
| `HOSTBILL_URL` | HostBill | API base URL |
| `HOSTBILL_API_KEY` | HostBill | Admin API key |
| `HOSTBILL_API_ID` | HostBill | API user ID (integer) |
| `OS_AUTH_URL` | OpenStack | Keystone endpoint |
| `OS_USERNAME` | OpenStack | Admin username |
| `OS_PASSWORD` | OpenStack | Admin password |
| `STX_SSH_KEY` | STX | Path to STX SSH key |
| `GITLAB_API_TOKEN` | GitLab | GitLab API token |
| `PASSBOLT_SERVER` | Passbolt | Vault server URL |

**Setup workflow:**
```bash
# Create .env.cpanel from the example template
./scripts/infra/cpanel/cpanel-env-setup.sh --persist

# Verify which vars are filled vs empty
./scripts/infra/cpanel/cpanel-env-setup.sh --persist   # re-run shows status

# Load into shell for immediate use
source scripts/infra/credentials/.env.cpanel

# Run all setup in one step (persist + launchd)
./scripts/infra/cpanel/cpanel-env-setup.sh --all
```

**Ansible integration**: all playbooks read from `lookup('env', ...)` via
`scripts/infra/ansible/inventory/group_vars/all.yml` — sourcing `.env.cpanel`
before running any playbook is sufficient.

---

## Passive Health Check Runner

**File**: `scripts/infra/run-health.sh`
**Risk**: Read-only. No production state is mutated.

```bash
# All targets (default)
./scripts/infra/run-health.sh

# Specific target
./scripts/infra/run-health.sh cpanel
./scripts/infra/run-health.sh stx
./scripts/infra/run-health.sh hostbill
./scripts/infra/run-health.sh local

# JSON output
./scripts/infra/run-health.sh --json | jq .

# Help
./scripts/infra/run-health.sh --help
```

**Execution order** (dependency-ordered, passive):

1. `cpanel-health.yml` — services, SSL expiry, disk, Nginx errors
2. `stx-health.yml` — K8s nodes, containerd, IPMI, disk
3. `openstack-status.yml` — token, servers, networks, compute/volume services
4. `hostbill-sync.yml --extra-vars dry_run=true` — sync status without writes
5. `macos-services.yml` + `macos-dev-env.yml` — local tooling

**Prerequisites:**
```bash
pip install ansible          # or: brew install ansible
source scripts/infra/credentials/.env.cpanel
```

---

## cPanel / WHM Scripts

### SSL Monitor (launchd)

**File**: `scripts/infra/cpanel/cpanel-ssl-monitor.sh`
**Plist**: `scripts/infra/cpanel/com.agentic-flow.ssl-monitor.plist`

Runs every 4 hours as a macOS LaunchAgent. Reads credentials from
`scripts/infra/credentials/.env.cpanel` and checks SSL certificate expiry
for all domains in `group_vars/cpanel.yml`.

```bash
# Register (one-time)
./scripts/infra/cpanel/cpanel-env-setup.sh --register-launchd

# Check status
launchctl list com.agentic-flow.ssl-monitor

# View logs
tail -f /tmp/ssl-monitor.log

# Unregister
launchctl unload ~/Library/LaunchAgents/com.agentic-flow.ssl-monitor.plist
```

### DNS Zone Manager

**File**: `scripts/infra/cpanel/cpanel-dns-zone.sh`

```bash
source scripts/infra/credentials/.env.cpanel

# List DNS records for a domain
./scripts/infra/cpanel/cpanel-dns-zone.sh list bhopti.com

# Add a record
./scripts/infra/cpanel/cpanel-dns-zone.sh add bhopti.com A myhost 1.2.3.4

# Delete a record
./scripts/infra/cpanel/cpanel-dns-zone.sh delete bhopti.com A myhost

# Check propagation
./scripts/infra/cpanel/cpanel-dns-zone.sh check-propagation bhopti.com
```

**Requires**: `CPANEL_HOST`, `CPANEL_USER`, `CPANEL_API_TOKEN`

### Paramiko SSH Client

**File**: `scripts/infra/cpanel/cpanel_ssh_client.py`

Python SSH client for complex cPanel automation. Complements Ansible for
dynamic, conditional, or streaming remote workflows.

```bash
# Read-only system audit
python3 scripts/infra/cpanel/cpanel_ssh_client.py --gather

# Run a single read-only command
python3 scripts/infra/cpanel/cpanel_ssh_client.py --cmd "df -h /"

# Enable write commands (requires explicit flag)
python3 scripts/infra/cpanel/cpanel_ssh_client.py --write --cmd "sudo systemctl status nginx"
```

**Safety model**:
- Read-only by default (`allow_writes=False`)
- Write commands matched against `_WRITE_PATTERNS` blocklist are rejected unless `--write` is passed
- Falls back to `ssh` CLI if `paramiko` is not installed (`pip3 install paramiko fabric`)
- Reads `CPANEL_HOST`, `CPANEL_USER`, `CPANEL_SSH_KEY`, `CPANEL_SSH_PORT` from env

---

## WHM Firewall

**File**: `scripts/infra/whm/whm-firewall-check.sh`
**Requires**: `WHM_API_TOKEN`, `WHM_HOST`, `WHM_USER`

### Passive commands (no gate)

```bash
source scripts/infra/credentials/.env.cpanel

./scripts/infra/whm/whm-firewall-check.sh status      # load, services, CSF
./scripts/infra/whm/whm-firewall-check.sh accounts    # list cPanel accounts
./scripts/infra/whm/whm-firewall-check.sh blocked     # CSF blocked IPs
```

### Active commands (require `--confirm`)

Write operations require an explicit `--confirm` flag to prevent accidental
invocation from scripts or copy-paste errors. All write actions are logged
to `.goalie/whm-audit.jsonl` before execution.

```bash
./scripts/infra/whm/whm-firewall-check.sh allow 1.2.3.4 --confirm
./scripts/infra/whm/whm-firewall-check.sh deny  1.2.3.4 --confirm
```

---

## HostBill API

**File**: `scripts/infra/hostbill/hostbill_api_client.py`

```python
from scripts.infra.hostbill.hostbill_api_client import HostBillAPIClient

# Automatically selects real client if env vars are set, mock otherwise
client = HostBillAPIClient.from_env()

# Check connectivity (read-only)
result = client.sync_status()

# Fetch billing info
info = client.get_billing_info("YO-LIFE-001")

# Create invoice — dry_run=True by default (logs intent, no write)
result = client.create_invoice({"client_id": "...", "amount": 127.97,
                                "description": "Monthly"}, dry_run=True)

# Actually write (requires explicit opt-in)
result = client.create_invoice({...}, dry_run=False)
```

**CLI:**
```bash
# Verify connectivity (real or mock)
python3 scripts/infra/hostbill/hostbill_api_client.py --check

# Fetch billing info (mock if no env vars)
python3 scripts/infra/hostbill/hostbill_api_client.py --client YO-LIFE-001

# Force mock mode
python3 scripts/infra/hostbill/hostbill_api_client.py --check --mock
```

**Requires**: `HOSTBILL_URL`, `HOSTBILL_API_KEY`, `HOSTBILL_API_ID`
Falls back to mock automatically if any of these are missing.

---

## Ansible Playbooks

**Directory**: `scripts/infra/ansible/playbooks/`
**Inventory**: `scripts/infra/ansible/inventory/hosts.yml`
**Group vars**: `scripts/infra/ansible/inventory/group_vars/`

| Playbook | Hosts | Risk | Description |
|---|---|---|---|
| `cpanel-health.yml` | cpanel | Passive | Services, SSL, disk, ports |
| `cpanel-ssl-renew.yml` | cpanel | Medium | Trigger AutoSSL |
| `cpanel-firewall.yml` | cpanel | High\* | CSF status; `csf_restart=true` to write |
| `stx-health.yml` | stx | Passive | K8s, containerd, IPMI, disk |
| `stx-deploy.yml` | stx | Medium | rsync deploy to STX |
| `openstack-status.yml` | stx | Passive | Token, servers, networks |
| `hostbill-sync.yml` | local | Medium\* | HostBill sync; `dry_run=true` for passive |
| `macos-services.yml` | local | Passive | LaunchAgents, brew services |
| `macos-dev-env.yml` | local | Passive | CLI tools, SSH keys, git |

\* All active operations require explicit opt-in via `--extra-vars`.

**Running playbooks:**
```bash
source scripts/infra/credentials/.env.cpanel
cd scripts/infra/ansible

# Passive health check
ansible-playbook -i inventory/hosts.yml playbooks/cpanel-health.yml

# Active: SSL renewal (opt-in)
ansible-playbook -i inventory/hosts.yml playbooks/cpanel-ssl-renew.yml

# Active: firewall restart (double opt-in)
ansible-playbook -i inventory/hosts.yml playbooks/cpanel-firewall.yml \
  --extra-vars "csf_restart=true"
```

---

## Security Scanning

**File**: `.semgrep.yml`
**Workflow**: `.github/workflows/codeql.yml`, `.github/workflows/scorecard.yml`

Custom Semgrep rules tuned for this stack:

| Rule ID | Detects |
|---|---|
| `nginx-proxy-pass-variable-with-uri` | `proxy_pass $var/path/` pattern that silently drops URI |
| `cpanel-api-token-in-url` | API tokens embedded in URLs |
| `subprocess-shell-string` | `subprocess.run(str, shell=True)` injection risk |
| `os-system-call` | `os.system()` usage |
| `bash-eval-injection` | `eval "$var"` shell injection |
| `ssh-no-host-check` | `StrictHostKeyChecking=no` in production |

```bash
# Run locally (requires: brew install semgrep)
semgrep --config .semgrep.yml scripts/

# Run with community packs
semgrep --config p/security-audit --config .semgrep.yml scripts/
```

CodeQL is configured with the `security-extended` query suite and runs on
every push to `main` and weekly. OpenSSF Scorecard publishes SARIF results.

---

## Active vs Passive Operations

All scripts follow a consistent active/passive boundary:

**Passive** (no explicit opt-in required):
- `run-health.sh` (any target)
- `whm-firewall-check.sh status|accounts|blocked`
- `cpanel_ssh_client.py --gather|--cmd <read-only>`
- `hostbill_api_client.py --check|--client`
- All `*-health.yml` and `*-status.yml` playbooks

**Active** (require explicit opt-in):
- `whm-firewall-check.sh allow|deny <ip> --confirm`
- `cpanel_ssh_client.py --write --cmd <mutating>`
- `hostbill_api_client.py` `create_invoice(dry_run=False)`
- `cpanel-ssl-renew.yml` (always active)
- `cpanel-firewall.yml --extra-vars csf_restart=true`
- `stx-deploy.yml` (rsync write)
- `hostbill-sync.yml` (without `dry_run=true`)

---

## Test Suite

Run locally to verify all phases:

```bash
cd /Users/shahroozbhopti/Documents/code
bash -c '
PASS=0; FAIL=0
check() { local n="$1"; shift; "$@" &>/dev/null && { echo "  ✓ $n"; ((PASS++)); } || { echo "  ✗ $n"; ((FAIL++)); }; }
check "env-setup syntax"   bash -n scripts/infra/cpanel/cpanel-env-setup.sh
check "run-health syntax"  bash -n scripts/infra/run-health.sh
check "whm syntax"         bash -n scripts/infra/whm/whm-firewall-check.sh
check "hostbill compiles"  python3 -m py_compile scripts/infra/hostbill/hostbill_api_client.py
check "ssh client compiles" python3 -m py_compile scripts/infra/cpanel/cpanel_ssh_client.py
check "hostbill mock"      python3 scripts/infra/hostbill/hostbill_api_client.py --check --mock
check "run-health --help"  bash scripts/infra/run-health.sh --help
check "whm --help"         bash scripts/infra/whm/whm-firewall-check.sh --help
printf "\n%d passed, %d failed\n" $PASS $FAIL
'
```

Full 50-assertion suite is embedded in the session history.
