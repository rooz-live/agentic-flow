# Qdrant Kubernetes Setup Guide

## Prerequisites

### 1. Enable Kubernetes in Docker Desktop
```bash
# On macOS: Docker Desktop → Settings → Kubernetes → Enable Kubernetes
# Wait for "Kubernetes is running" status
```

### 2. Verify Kubernetes is Running
```bash
kubectl cluster-info
# Should show: Kubernetes control plane is running at https://...
```

## Setup Steps

### Step 1: Create Namespace and Secrets
```bash
# Create qdrant namespace
kubectl create namespace qdrant || true

# Clean up old secrets
kubectl --namespace qdrant delete secret qdrant-registry-creds || true
kubectl --namespace qdrant delete secret qdrant-cloud-creds || true

# Create docker registry credentials
kubectl --namespace qdrant create secret docker-registry qdrant-registry-creds \
  --docker-server='registry.cloud.qdrant.io' \
  --docker-username='robot$private-region-065c13d9-1d96-44a4-b567-3859ef8ffc80' \
  --docker-password='hNpnJtPXQHYSXQRnNYw7cUAJGbrFrs0Z'

# Create cloud credentials
kubectl --namespace qdrant create secret generic qdrant-cloud-creds \
  --from-literal=access-key='d90b8063-6765-49d1-9a81-58f645e430c6|vRestXY-y7CqRZ8pcz3zK0lNWztRSCdNnkvctfpVzgZfbAbYFTlyiw'
```

### Step 2: Login to Helm Registry
```bash
helm registry login 'registry.cloud.qdrant.io' \
  --username 'robot$private-region-065c13d9-1d96-44a4-b567-3859ef8ffc80' \
  --password 'hNpnJtPXQHYSXQRnNYw7cUAJGbrFrs0Z'
```

### Step 3: Deploy Qdrant Cloud Agent
```bash
helm upgrade --install qdrant-cloud-agent \
  'oci://registry.cloud.qdrant.io/qdrant-charts/qdrant-cloud-agent' \
  --version=1.33.0 \
  --namespace qdrant \
  --set podAnnotations.accessKeyHash=df072bb2a6ac3e4ebc5b075f1652a92c2bc35c934489fbb4ea9a5c9d9cdb473d \
  --set-json config='{"serverURL": "https://cloud.qdrant.io", "hybridCloud": {"id": "065c13d9-1d96-44a4-b567-3859ef8ffc80", "accountId": "d066744c-3ee0-4823-9fc3-b7a1cfc35af0"}, "grpcServerURL": "grpc.cloud.qdrant.io", "logLevel": "INFO"}' \
  --set-json image='{"repository": "registry.cloud.qdrant.io/qdrant/qdrant-cloud-agent"}' \
  --set-json imagePullSecrets='[{"name": "qdrant-registry-creds"}]'
```

## Verification

### Check Deployment Status
```bash
# Check pods
kubectl --namespace qdrant get pods

# Check agent logs
kubectl --namespace qdrant logs -l app.kubernetes.io/name=qdrant-cloud-agent --tail=50

# Check services
kubectl --namespace qdrant get services
```

### Expected Output
```
NAME                     READY   STATUS    RESTARTS   AGE
qdrant-cloud-agent-xxx   1/1     Running   0          1m
```

## Troubleshooting

### Issue: Connection Refused
**Cause:** Kubernetes not enabled in Docker Desktop  
**Fix:** Settings → Kubernetes → Enable Kubernetes

### Issue: ImagePullBackOff
**Cause:** Registry credentials incorrect or expired  
**Fix:** Re-run Step 1 to recreate secrets

### Issue: CrashLoopBackOff
**Cause:** Configuration error or cloud credentials invalid  
**Fix:** Check logs: `kubectl --namespace qdrant logs <pod-name>`

## Integration with Agentic Flow

Once Qdrant is deployed, update your environment:

```bash
# Add to .env or export
export QDRANT_URL="http://qdrant-cloud-agent.qdrant.svc.cluster.local:6333"
export QDRANT_API_KEY="d90b8063-6765-49d1-9a81-58f645e430c6|vRestXY-y7CqRZ8pcz3zK0lNWztRSCdNnkvctfpVzgZfbAbYFTlyiw"
```

## Configuration Details

- **Namespace:** qdrant
- **Hybrid Cloud ID:** 065c13d9-1d96-44a4-b567-3859ef8ffc80
- **Account ID:** d066744c-3ee0-4823-9fc3-b7a1cfc35af0
- **Server URL:** https://cloud.qdrant.io
- **gRPC URL:** grpc.cloud.qdrant.io
- **Chart Version:** 1.33.0

## Next Steps

1. Enable Kubernetes in Docker Desktop
2. Run setup commands from this guide
3. Verify deployment
4. Configure agentic-flow integration
