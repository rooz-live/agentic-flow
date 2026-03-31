#!/bin/bash
set -e

echo "🚀 Deploying Qdrant Cloud Agent to Kubernetes"
echo "================================================"

# Verify k8s is running
echo "📋 Checking Kubernetes availability..."
if ! kubectl cluster-info &>/dev/null; then
    echo "❌ ERROR: Kubernetes is not running"
    echo "   Enable Kubernetes in Docker Desktop:"
    echo "   Docker Desktop → Settings → Kubernetes → Enable Kubernetes"
    exit 1
fi

# Switch to docker-desktop context
echo "🔄 Switching to docker-desktop context..."
kubectl config use-context docker-desktop

# Create namespace
echo "📦 Creating qdrant namespace..."
kubectl create namespace qdrant || true

# Delete old secrets
echo "🗑️  Cleaning up old secrets..."
kubectl --namespace qdrant delete secret qdrant-registry-creds 2>/dev/null || true
kubectl --namespace qdrant delete secret qdrant-cloud-creds 2>/dev/null || true

# Create registry credentials
echo "🔐 Creating registry credentials..."
kubectl --namespace qdrant create secret docker-registry qdrant-registry-creds \
  --docker-server='registry.cloud.qdrant.io' \
  --docker-username='robot$private-region-065c13d9-1d96-44a4-b567-3859ef8ffc80' \
  --docker-password='hNpnJtPXQHYSXQRnNYw7cUAJGbrFrs0Z'

# Create cloud credentials
echo "🔐 Creating cloud credentials..."
kubectl --namespace qdrant create secret generic qdrant-cloud-creds \
  --from-literal=access-key='d90b8063-6765-49d1-9a81-58f645e430c6|vRestXY-y7CqRZ8pcz3zK0lNWztRSCdNnkvctfpVzgZfbAbYFTlyiw'

# Login to Helm registry
echo "🔑 Logging into Helm registry..."
helm registry login 'registry.cloud.qdrant.io' \
  --username 'robot$private-region-065c13d9-1d96-44a4-b567-3859ef8ffc80' \
  --password 'hNpnJtPXQHYSXQRnNYw7cUAJGbrFrs0Z'

# Deploy Qdrant cloud agent
echo "📦 Deploying Qdrant cloud agent..."
helm upgrade --install qdrant-cloud-agent \
  'oci://registry.cloud.qdrant.io/qdrant-charts/qdrant-cloud-agent' \
  --version=1.33.0 \
  --namespace qdrant \
  --set podAnnotations.accessKeyHash=df072bb2a6ac3e4ebc5b075f1652a92c2bc35c934489fbb4ea9a5c9d9cdb473d \
  --set-json config='{"serverURL": "https://cloud.qdrant.io", "hybridCloud": {"id": "065c13d9-1d96-44a4-b567-3859ef8ffc80", "accountId": "d066744c-3ee0-4823-9fc3-b7a1cfc35af0"}, "grpcServerURL": "grpc.cloud.qdrant.io", "logLevel": "INFO"}' \
  --set-json image='{"repository": "registry.cloud.qdrant.io/qdrant/qdrant-cloud-agent"}' \
  --set-json imagePullSecrets='[{"name": "qdrant-registry-creds"}]'

# Wait for deployment
echo "⏳ Waiting for deployment to be ready..."
kubectl --namespace qdrant rollout status deployment/qdrant-cloud-agent --timeout=120s

# Verify deployment
echo "✅ Verifying deployment..."
kubectl --namespace qdrant get pods
kubectl --namespace qdrant get services

echo ""
echo "================================================"
echo "✅ Qdrant Cloud Agent deployed successfully!"
echo ""
echo "📊 Connection details:"
echo "   URL: http://qdrant-cloud-agent.qdrant.svc.cluster.local:6333"
echo "   API Key: (stored in qdrant-cloud-creds secret)"
echo ""
echo "🔍 View logs:"
echo "   kubectl --namespace qdrant logs -l app.kubernetes.io/name=qdrant-cloud-agent --tail=50"
echo ""
echo "🧪 Test connection:"
echo "   kubectl --namespace qdrant port-forward svc/qdrant-cloud-agent 6333:6333"
echo "   curl http://localhost:6333/collections"
echo ""
