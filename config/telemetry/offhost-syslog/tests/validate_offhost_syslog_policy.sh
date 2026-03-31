#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

TF_DIR="${ROOT_DIR}/terraform"
ANSIBLE_DIR="${ROOT_DIR}/ansible"

req_file() {
  if [ ! -f "$1" ]; then
    echo "Missing required file: $1" >&2
    exit 1
  fi
}

req_file "${TF_DIR}/main.tf"
req_file "${TF_DIR}/variables.tf"
req_file "${ANSIBLE_DIR}/playbook.yml"
req_file "${ANSIBLE_DIR}/templates/rsyslog_offhost_sink.conf.j2"
req_file "${ANSIBLE_DIR}/templates/logrotate_offhost_syslog.j2"

grep -q 'default = "us-east-1"' "${TF_DIR}/variables.tf"
grep -q 'default = "173.94.53.113/32"' "${TF_DIR}/variables.tf"
grep -q 'default = "23.92.79.2/32"' "${TF_DIR}/variables.tf"
grep -q 'default = 6514' "${TF_DIR}/variables.tf"

grep -q 'from_port = 22' "${TF_DIR}/main.tf"
grep -q 'to_port   = 22' "${TF_DIR}/main.tf"
grep -q 'cidrs     = \[var.admin_ssh_cidr\]' "${TF_DIR}/main.tf"

grep -q 'from_port = var.syslog_tls_port' "${TF_DIR}/main.tf"
grep -q 'to_port   = var.syslog_tls_port' "${TF_DIR}/main.tf"
grep -q 'cidrs     = \[var.syslog_source_cidr\]' "${TF_DIR}/main.tf"

grep -q 'syslog_tls_port: 6514' "${ANSIBLE_DIR}/playbook.yml"
grep -q '/var/log/offhost-syslog' "${ANSIBLE_DIR}/playbook.yml"

grep -q 'rotate 30' "${ANSIBLE_DIR}/templates/logrotate_offhost_syslog.j2"
grep -q 'rotate 7' "${ANSIBLE_DIR}/templates/logrotate_offhost_syslog.j2"

echo "OK: off-host syslog sink policy validated"
