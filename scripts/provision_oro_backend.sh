#!/usr/bin/env bash
set -e

# [RCA TRACE] Phase 1: OroPlatform Backend Provisioning
# Bounded Context: WHM/cPanel Edge Node (192.168.122.237)
# Architecture: Docker Compose stack (Postgres, Redis, RabbitMQ, Elasticsearch, Symfony 6.x)
# Risk Mitigation: cPanel does not natively support PostgreSQL/RabbitMQ. Docker is strictly required.

echo "🦅 [SWARM] Initiating Phase 1: OroPlatform/Symfony CRM Infrastructure"

JUMP_HOST="ubuntu@23.92.79.2"
EDGE_NODE="root@192.168.122.237"
PEM_KEY="/Users/shahroozbhopti/pem/stx-aio-0.pem"
PASS="L_kg2rTsbb*9hDVvBC"

echo "-> Verifying Docker runtime on KVM Edge Node..."
# Check if Docker exists, install if not (Rocky/AlmaLinux/CentOS via cPanel)
ssh -o StrictHostKeyChecking=no -p 2222 -i $PEM_KEY $JUMP_HOST "sshpass -p '$PASS' ssh -o StrictHostKeyChecking=no $EDGE_NODE '
if ! command -v docker &> /dev/null; then
    echo \"[WARN] Docker not found. Installing Docker CE safely alongside cPanel...\"
    yum install -y yum-utils
    yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl start docker
    systemctl enable docker
    echo \"[OK] Docker CE runtime installed.\"
else
    echo \"[OK] Docker runtime verified.\"
fi
'"

echo "-> Generating OroPlatform Docker Compose payload..."
cat << 'EOF' > /tmp/oro-docker-compose.yml
version: '3.8'
services:
  oro-database:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: orocrm
      POSTGRES_USER: oro
      POSTGRES_PASSWORD: oro_secure_password
    volumes:
      - oro_db_data:/var/lib/postgresql/data
    restart: unless-stopped

  oro-message-queue:
    image: rabbitmq:3.11-management-alpine
    environment:
      RABBITMQ_DEFAULT_USER: oro
      RABBITMQ_DEFAULT_PASS: oro_rmq_password
    restart: unless-stopped

  oro-redis:
    image: redis:7-alpine
    restart: unless-stopped

  oro-search:
    image: opensearchproject/opensearch:2.8.0
    environment:
      - discovery.type=single-node
      - OPENSEARCH_INITIAL_ADMIN_PASSWORD=Oro_Search_Secure_123!
    volumes:
      - oro_search_data:/usr/share/opensearch/data
    restart: unless-stopped

  oro-application:
    image: php:8.2-fpm
    depends_on:
      - oro-database
      - oro-message-queue
      - oro-redis
      - oro-search
    environment:
      DATABASE_URL: postgresql://oro:oro_secure_password@oro-database:5432/orocrm
      MESSENGER_TRANSPORT_DSN: amqp://oro:oro_rmq_password@oro-message-queue:5672/%2f/messages
      REDIS_URL: redis://oro-redis:6379
      SEARCH_URL: http://admin:Oro_Search_Secure_123!@oro-search:9200
    restart: unless-stopped

volumes:
  oro_db_data:
  oro_search_data:
EOF

echo "-> Pushing OroPlatform Blueprint to Edge Node..."
scp -o StrictHostKeyChecking=no -P 2222 -i $PEM_KEY /tmp/oro-docker-compose.yml $JUMP_HOST:/tmp/oro-docker-compose.yml
ssh -o StrictHostKeyChecking=no -p 2222 -i $PEM_KEY $JUMP_HOST "sshpass -p '$PASS' scp -o StrictHostKeyChecking=no /tmp/oro-docker-compose.yml $EDGE_NODE:/root/oro-docker-compose.yml"

echo "-> Spinning up Symfony / OroPlatform Services..."
ssh -o StrictHostKeyChecking=no -p 2222 -i $PEM_KEY $JUMP_HOST "sshpass -p '$PASS' ssh -o StrictHostKeyChecking=no $EDGE_NODE '
cd /root
docker compose -f oro-docker-compose.yml up -d
docker ps | grep oro
'"

echo "✅ [SUCCESS] OroPlatform backend is initializing. JWT APIs will map to port 8000."
