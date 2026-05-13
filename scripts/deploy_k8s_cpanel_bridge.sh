#!/bin/bash
# Sovereign Swarm: Layered HA/DR K8s-to-cPanel Bridge
# WSJF Optimized: Resolves TLS blockers, enables Edge routing, and preserves cPanel sovereignty.

echo "🌊 Hydrating K8s Edge HA/DR Manifests..."

cat << 'EOF' > k8s-cpanel-bridge.yaml
---
# 1. DR Layer: The Sovereign cPanel Backend Service
# Maps Kubernetes networking to the internal KVM cPanel IP
apiVersion: v1
kind: Service
metadata:
  name: sovereign-cpanel-backend
  namespace: default
spec:
  type: ExternalName
  externalName: 192.168.122.237
---
# 2. HA Layer: Nginx Ingress Edge Routing
# Intercepts traffic at 23.92.79.2 and routes it seamlessly to cPanel
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: sovereign-edge-bridge
  namespace: default
  annotations:
    kubernetes.io/ingress.class: "nginx"
    # Enable SSL Passthrough so cPanel's AutoSSL handles the cryptography
    nginx.ingress.kubernetes.io/ssl-passthrough: "true"
    # Force HTTP to HTTPS at the K8s edge before hitting cPanel
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    # Required for SNI pass-through
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
spec:
  tls:
  - hosts:
    - rooz.live
    - cal.rooz.live
    - tag.vote
    - o-gov.com
  rules:
  - host: rooz.live
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: sovereign-cpanel-backend
            port:
              number: 443
  - host: cal.rooz.live
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: sovereign-cpanel-backend
            port:
              number: 443
  - host: tag.vote
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: sovereign-cpanel-backend
            port:
              number: 443
  - host: o-gov.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: sovereign-cpanel-backend
            port:
              number: 443
EOF

echo "✅ Manifest generated at k8s-cpanel-bridge.yaml"
echo "🚀 To apply this to the StarlingX cluster, run:"
echo "kubectl apply -f k8s-cpanel-bridge.yaml"
