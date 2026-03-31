#!/bin/bash
SOURCE="gitlab.yocloud.com"

if [[ -n "$GITLAB_IP_OVERRIDE" ]]; then
  echo "Overriding IP: $GITLAB_IP_OVERRIDE"
  ssh -o Hostname=$GITLAB_IP_OVERRIDE -o ConnectTimeout=5 "$SOURCE" echo OK
else
  ssh -o ConnectTimeout=5 "$SOURCE" echo OK
fi
