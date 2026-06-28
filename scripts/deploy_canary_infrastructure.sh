#!/usr/bin/env bash
# DEPRECATED: use ./scripts/one.sh (deploy-uapi | deploy-edge | ...)
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/deploy_deprecation.sh" "deploy_canary_infrastructure" "$@"
