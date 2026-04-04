#!/usr/bin/env bash

set -euo pipefail

DRY_RUN=false
ROLLBACK=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --rollback)
      ROLLBACK=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

STX_HOST="${STX_HOST:-23.92.79.2}"
PEM_PATH="${PEM_PATH:-pem/rooz.pem}"
IPMI_HOST="${IPMI_HOST?IPMI_HOST required}"
IPMI_USER="${IPMI_USER?IPMI_USER required}"
IPMI_PASS="${IPMI_PASS?IPMI_PASS required}"
IPMI_DEVICE_ID="${IPMI_DEVICE_ID:-device-24460}"

if [[ "$ROLLBACK" == true ]]; then
  cmd="ssh -i '$PEM_PATH' -o StrictHostKeyChecking=no ubuntu@'$STX_HOST' 'echo \"Executing rollback\"; stx-manage rollback || kubectl rollout undo deployment/starlingx-platform -n kube-system || docker-compose -f /opt/platform/docker-compose.yml down'"
  if [[ "$DRY_RUN" == true ]]; then
    echo "$cmd"
  else
    eval "$cmd"
  fi
  echo "Rollback complete for StarlingX."
  exit 0
fi

# Pre-deployment backup/snapshot
backup_cmd="ssh -i '$PEM_PATH' ubuntu@'$STX_HOST' 'mkdir -p /opt/stx-backup && stx-dumpbackup -d /opt/stx-backup/$(date +%Y%m%d-%H%M%S)'"
if [[ "$DRY_RUN" == false ]]; then
  eval "$backup_cmd"
else
  echo "$backup_cmd"
fi

# IPMI power on for compute node
ipmi_cmd="ipmitool -I lanplus -H '$IPMI_HOST' -U '$IPMI_USER' -P '$IPMI_PASS' chassis power on"
if [[ "$DRY_RUN" == false ]]; then
  eval "$ipmi_cmd"
  sleep 30 # Wait for boot
else
  echo "$ipmi_cmd"
fi

# Greenfield deploy via SSH
deploy_ssh="ssh -i '$PEM_PATH' -o StrictHostKeyChecking=no ubuntu@'$STX_HOST'"
deploy_script='
  cd /opt/stx
  stx-config generate --force
  system apply-config
  stx-tools bootstrap controller
  stx-tools deploy-compute --name '$IPMI_DEVICE_ID'
  stx-health-report
'
if [[ "$DRY_RUN" == true ]]; then
  echo "$deploy_ssh -- \"$deploy_script\""
else
  $deploy_ssh "
    $deploy_script
  "
fi

echo "StarlingX stx11 greenfield deployment complete."
echo "Rollback: $0 --rollback"
echo "Monitoring: ssh ubuntu@$STX_HOST 'stx-health-report | tail' or Prometheus scrape."