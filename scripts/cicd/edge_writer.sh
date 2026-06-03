#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib/cls_common.sh"
cls_repo_root
export PUBLIC_WRITE_EVIDENCE=1
exec "$(cls_public_synthetic)" "${CLS_BILLING_FQDN:-billing.bhopti.com}"
