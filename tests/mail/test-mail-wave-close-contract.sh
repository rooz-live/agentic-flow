#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
for f in mail-wave-close.sh mail-mdod-a3-verify.sh mail-imap-source-probe.sh capture-macos-mail-backup-evidence.sh; do
  test -x "$ROOT/scripts/mail/$f" || { echo "missing $f"; exit 1; }
done
grep -q mail-imap-source-probe "$ROOT/scripts/mail/mail-wave-close.sh" || {
  echo "mail-wave-close must chain imap probe"
  exit 1
}
echo "PASS mail_wave_close_contract"
