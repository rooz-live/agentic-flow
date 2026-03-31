#!/bin/bash
export GITLAB_IP_OVERRIDE="127.0.0.1"
echo "Running migration check with override..."
ssh -o Hostname=$GITLAB_IP_OVERRIDE -o ConnectTimeout=5 gitlab.yocloud.com echo OK || echo "[FAIL] SSH failed (Expected)"
