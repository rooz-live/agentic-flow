#!/usr/bin/env bash

# Multi-Tenant Deployment Script
# Usage: ./scripts/deploy_multi_tenant.sh [local|stg|prod] [--dry-run]
# Env vars: IMAGE_TAG, KUBECONFIG_STAGING, KUBECONFIG_PROD, STAGING_HOST, PROD_HOST
# Per SECURITY_REVIEW.md: No hard-coded IPs/creds; use env/Vault.
# Assumes: docker-compose.multi-tenant.yml, charts/multi-tenant/, values-*.yaml
# Rollback: helm rollback multi-tenant 1
# Monitor: kubectl get hpa,pod -n multi-tenant; helm status multi-tenant

set -euo pipefail

ENV="${1:-local}"
DRY_RUN=false
if [[ "${2:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
IMAGE_TAG="${IMAGE_TAG:-latest}"

cd "$ROOT_DIR"

echo "🚀 Deploying multi-tenant to '$ENV' $( [[ $DRY_RUN == true ]] && echo '[DRY-RUN]' || echo '[LIVE]' )"

case "$ENV" in
  local)
    COMPOSE_FILE="docker-compose.multi-tenant.yml"
    if [[ $DRY_RUN == true ]]; then
      docker compose -f "$COMPOSE_FILE" config && echo "✅ Compose config valid"
      docker compose -f "$COMPOSE_FILE" up --dry-run && echo "✅ Compose dry-run valid"
    else
      docker compose -f "$COMPOSE_FILE" down || true
      docker compose -f "$COMPOSE_FILE" up -d && echo "✅ Local deployment complete"
      docker compose -f "$COMPOSE_FILE" ps && docker compose -f "$COMPOSE_FILE" logs --tail=20
    fi
    ;;
  stg)
    CHART_PATH="charts/multi-tenant"
    NS="multi-tenant-stg"
    KUBECONFIG="${KUBECONFIG_STAGING:-}"
    if [[ -z "$KUBECONFIG" ]]; then
      echo "❌ Set KUBECONFIG_STAGING (StarlingX ~/.kube/config)"
      exit 1
    fi
    helm repo add stable https://charts.helm.sh/stable || true
    if [[ $DRY_RUN == true ]]; then
      helm template multi-tenant "$CHART_PATH" \
        --kubeconfig "$KUBECONFIG" \
        --namespace "$NS" \
        --set env=stg \
        --set image.tag="$IMAGE_TAG" \
        --values values-stg.yaml && echo "✅ Helm template stg valid"
    else
      helm upgrade --install multi-tenant "$CHART_PATH" \
        --kubeconfig "$KUBECONFIG" \
        --namespace "$NS" --create-namespace \
        --set env=stg \
        --set image.tag="$IMAGE_TAG" \
        --values values-stg.yaml \
        --wait --timeout 5m && echo "✅ Stg deployment complete"
      kubectl get hpa,deployment,pod,ingress -n "$NS" --kubeconfig "$KUBECONFIG"
    fi
    ;;
  prod)
    CHART_PATH="oci://ghcr.io/${GITHUB_REPOSITORY:-user/repo}/multi-tenant"  # Or local charts/
    NS="multi-tenant-prod"
    KUBECONFIG="${KUBECONFIG_PROD:-}"
    if [[ -z "$KUBECONFIG" ]]; then
      echo "❌ Set KUBECONFIG_PROD (AWS EKS)"
      exit 1
    fi
    if [[ $DRY_RUN == true ]]; then
      helm template multi-tenant "$CHART_PATH" \
        --kubeconfig "$KUBECONFIG" \
        --namespace "$NS" \
        --set env=prod \
        --set image.tag="$IMAGE_TAG" \
        --values values-prod.yaml && echo "✅ Helm template prod valid"
    else
      helm upgrade --install multi-tenant "$CHART_PATH" \
        --kubeconfig "$KUBECONFIG" \
        --namespace "$NS" --create-namespace \
        --set env=prod \
        --set image.tag="$IMAGE_TAG" \
        --values values-prod.yaml \
        --wait --timeout 10m && echo "✅ Prod deployment complete"
      kubectl get hpa,deployment,pod,ingress -n "$NS" --kubeconfig "$KUBECONFIG"
    fi
    ;;
  *)
    echo "Usage: $0 [local|stg|prod] [--dry-run]"
    exit 1
    ;;
esac

echo "📋 Post-deploy:"
echo "  Rollback: helm rollback multi-tenant 1 -n ${NS:-multi-tenant} --kubeconfig ${KUBECONFIG:-}"
echo "  Monitor: kubectl port-forward svc/grafana -n monitoring 3001:80"
echo "  Logs: kubectl logs deployment/multi-tenant -n ${NS:-multi-tenant} --follow"
