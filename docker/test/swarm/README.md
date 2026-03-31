# Docker Swarm Deployment Guide

Complete guide for deploying the trading platform to Docker Swarm with integrated monitoring and secret management.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Swarm Cluster                  │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Traefik     │  │  Trading API │  │  IBKR Gateway│  │
│  │  (Ingress)   │  │  (2 replicas)│  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  PostgreSQL  │  │  Redis       │  │  Prometheus  │  │
│  │              │  │              │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐                     │
│  │  Grafana     │  │  cAdvisor    │                     │
│  │              │  │  (global)    │                     │
│  └──────────────┘  └──────────────┘                     │
└─────────────────────────────────────────────────────────┘
```

## Prerequisites

### Local Development
- Docker Desktop with Swarm mode enabled
- 1Password CLI (`brew install --cask 1password-cli`) OR
- Passbolt CLI (`pip install passbolt-python-api`)

### AWS Production
- AWS instance i-097706d9355b9f1b2 (c7i.xlarge)
- Docker installed on instance
- Ports open: 80, 443, 2377, 7946, 4789, 4001-4002

## Quick Start

### 1. Initialize Swarm (First Time Only)

**Local:**
```bash
docker swarm init
```

**AWS Instance:**
```bash
ssh -i pem/aws-key.pem ubuntu@<public-ip>
docker swarm init --advertise-addr <public-ip>
```

### 2. Set Environment Variables

```bash
# Required
export ANTHROPIC_API_KEY="sk-ant-..."
export AWS_ACCESS_KEY_ID="AKIA..."
export AWS_SECRET_ACCESS_KEY="..."
export POSTGRES_PASSWORD="secure-password"

# Optional
export IBKR_USERNAME="your-username"
export IBKR_PASSWORD="your-password"
export DOMAIN="yourdomain.com"
export VERSION="v1.0.0"
```

### 3. Deploy Stack

```bash
cd docker/swarm
./deploy.sh deploy
```

### 4. Monitor Deployment

```bash
# Watch services come online
watch docker stack services trading

# View logs
docker service logs -f trading_trading-api

# Check health
curl http://trading.localhost/health
```

## Credential Management

### Using 1Password

```bash
# Store credentials in 1Password
op item create --category=login \
  --title="Trading Platform" \
  --vault=Private \
  ANTHROPIC_API_KEY=sk-ant-... \
  AWS_ACCESS_KEY_ID=AKIA... \
  AWS_SECRET_ACCESS_KEY=...

# Deploy with 1Password integration
./deploy.sh deploy
```

### Using Passbolt

```bash
export PASSBOLT_BASE_URL="https://passbolt.your-domain.com"
export PASSBOLT_API_TOKEN="your-token"

# Deploy with Passbolt integration
./deploy.sh deploy
```

### Manual Secret Creation

```bash
# Create individual secrets
echo -n "sk-ant-..." | docker secret create anthropic_api_key -
echo -n "AKIA..." | docker secret create aws_access_key_id -
echo -n "..." | docker secret create aws_secret_access_key -
echo -n "postgres-pass" | docker secret create postgres_password -
echo -n "admin" | docker secret create grafana_password -
echo -n "user:pass" | docker secret create ibkr_credentials -

# List secrets
docker secret ls
```

## Service Access

### Development (localhost)
- Trading API: http://trading.localhost
- Grafana: http://grafana.localhost (admin / password from GRAFANA_PASSWORD)
- Prometheus: http://prometheus.localhost
- Traefik Dashboard: http://traefik.localhost:8080

### Production
- Trading API: https://trading.yourdomain.com
- Grafana: https://grafana.yourdomain.com
- Prometheus: https://prometheus.yourdomain.com
- Traefik: https://traefik.yourdomain.com

## Operations

### Update Service

```bash
# Build new image
docker build -t trading-api:v1.1.0 -f docker/Dockerfile.trading-api .

# Update service
docker service update \
  --image trading-api:v1.1.0 \
  trading_trading-api
```

### Scale Service

```bash
# Scale trading API to 4 replicas
docker service scale trading_trading-api=4

# Verify scaling
docker service ps trading_trading-api
```

### Rolling Update

```bash
# Update with zero downtime
VERSION=v1.1.0 ./deploy.sh deploy
```

### Rollback

```bash
# Rollback to previous version
docker service rollback trading_trading-api

# Or specify previous version
docker service update \
  --image trading-api:v1.0.0 \
  trading_trading-api
```

### View Logs

```bash
# Follow logs for specific service
docker service logs -f trading_trading-api

# Last 100 lines
docker service logs --tail 100 trading_prometheus

# All services
for service in $(docker stack services trading --format {{.Name}}); do
  echo "=== $service ==="
  docker service logs --tail 5 $service
done
```

### Health Checks

```bash
# Check service health
docker stack ps trading --filter "desired-state=running"

# Inspect specific service
docker service inspect trading_trading-api --pretty

# Test endpoints
curl -f http://trading.localhost/health || echo "API unhealthy"
curl -f http://grafana.localhost/api/health || echo "Grafana unhealthy"
```

## Monitoring

### Prometheus Queries

Access Prometheus at http://prometheus.localhost

**Useful queries:**
```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# Container CPU usage
container_cpu_usage_seconds_total

# Memory usage
container_memory_usage_bytes

# Service replicas
docker_swarm_service_replicas_desired
```

### Grafana Dashboards

Access Grafana at http://grafana.localhost

1. Add Prometheus datasource:
   - URL: http://prometheus:9090
   
2. Import dashboards:
   - Docker Swarm: Dashboard ID 1152
   - cAdvisor: Dashboard ID 193
   - Traefik: Dashboard ID 11462

## Troubleshooting

### Services Not Starting

```bash
# Check service tasks
docker service ps trading_trading-api --no-trunc

# Inspect failed tasks
docker inspect <task-id>

# Check logs
docker service logs trading_trading-api
```

### Network Issues

```bash
# List networks
docker network ls

# Inspect overlay network
docker network inspect trading_trading_net

# Test connectivity
docker run --rm --network trading_trading_net \
  alpine ping -c 3 trading-api
```

### Secret Issues

```bash
# List secrets
docker secret ls

# Remove old secret (requires service update)
docker service update --secret-rm old_secret trading_trading-api
docker secret rm old_secret

# Add new secret
echo -n "new-value" | docker secret create new_secret -
docker service update --secret-add new_secret trading_trading-api
```

### Disk Space

```bash
# Check disk usage
docker system df

# Cleanup
docker system prune -a --volumes

# Remove unused images
docker image prune -a
```

## Security

### TLS/SSL Configuration

```bash
# Generate self-signed certs (dev only)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout traefik/certs/key.pem \
  -out traefik/certs/cert.pem

# Production: Use Let's Encrypt
# Configure in traefik service
```

### Firewall Rules (AWS)

```bash
# Allow Swarm ports
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxx \
  --protocol tcp \
  --port 2377 \
  --source-group sg-xxx

# Allow overlay network
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxx \
  --protocol udp \
  --port 4789 \
  --source-group sg-xxx

# Allow HTTP/HTTPS
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxx \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id sg-xxx \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0
```

## Backup & Recovery

### Database Backup

```bash
# Backup PostgreSQL
docker exec $(docker ps -q -f name=trading_postgres) \
  pg_dump -U trading trading_db > backup.sql

# Restore
cat backup.sql | docker exec -i $(docker ps -q -f name=trading_postgres) \
  psql -U trading trading_db
```

### Volume Backup

```bash
# Backup volume
docker run --rm \
  -v trading_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres_data.tar.gz /data

# Restore volume
docker run --rm \
  -v trading_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/postgres_data.tar.gz -C /
```

## Advanced Configuration

### Multi-Node Swarm

```bash
# On manager node
docker swarm init --advertise-addr <manager-ip>

# On worker nodes
docker swarm join --token <token> <manager-ip>:2377

# Verify cluster
docker node ls
```

### Resource Constraints

Edit `trading-stack.yml`:
```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 4G
    reservations:
      cpus: '1.0'
      memory: 2G
```

### Auto-Scaling (External)

Use Docker Swarm autoscaler or AWS Auto Scaling:
```bash
# Example: Scale based on CPU
if [ $(docker stats --no-stream --format "{{.CPUPerc}}" | cut -d% -f1 | awk '{s+=$1}END{print s/NR}') -gt 80 ]; then
  docker service scale trading_trading-api=$(( $(docker service ls --filter name=trading_trading-api --format "{{.Replicas}}" | cut -d/ -f1) + 1 ))
fi
```

## Performance Tuning

### Database Optimization

```sql
-- PostgreSQL tuning
ALTER SYSTEM SET shared_buffers = '2GB';
ALTER SYSTEM SET effective_cache_size = '6GB';
ALTER SYSTEM SET work_mem = '16MB';
SELECT pg_reload_conf();
```

### Redis Tuning

```bash
# In redis config
maxmemory 512mb
maxmemory-policy allkeys-lru
```

## Support

- Documentation: /docs
- Issues: GitHub Issues
- Monitoring: Grafana dashboards
- Logs: `docker service logs <service>`
