#!/usr/bin/env bash
# FA-gated: rotate MailStore admin creds via 1Password + redeploy STX .env (stub — expand before production rotate).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
echo "mailstore-credential-refresh: stub — set MAILSTORE_ADMIN_PASSWORD and run wire-mailstore-ingest.sh" >&2
echo "See config/mail/op_credential_map.yaml (mailstore_admin)" >&2
exit 2
