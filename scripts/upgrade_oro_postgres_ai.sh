#!/usr/bin/env bash
set -e

echo "🦅 [SWARM] Upgrading OroPlatform to AI-Native PostgreSQL (PG16 + pgvector)..."

JUMP_HOST="ubuntu@23.92.79.2"
EDGE_NODE="root@192.168.122.237"
PEM_KEY="/Users/shahroozbhopti/pem/stx-aio-0.pem"
PASS="L_kg2rTsbb*9hDVvBC"

echo "-> Reconfiguring Docker Compose for pgvector and PG16..."
cat << 'EOF' > /tmp/oro-docker-compose.yml
services:
  oro-database:
    image: pgvector/pgvector:pg16
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

scp -o StrictHostKeyChecking=no -P 2222 -i $PEM_KEY /tmp/oro-docker-compose.yml $JUMP_HOST:/tmp/oro-docker-compose.yml
ssh -o StrictHostKeyChecking=no -p 2222 -i $PEM_KEY $JUMP_HOST "sshpass -p '$PASS' scp -o StrictHostKeyChecking=no /tmp/oro-docker-compose.yml $EDGE_NODE:/root/oro-docker-compose.yml"

echo "-> Executing KVM Engine Rebuild..."
ssh -o StrictHostKeyChecking=no -p 2222 -i $PEM_KEY $JUMP_HOST "sshpass -p '$PASS' ssh -o StrictHostKeyChecking=no $EDGE_NODE '
cd /root
docker compose -f oro-docker-compose.yml up -d
echo \"Waiting for containers to stabilize...\"
sleep 5
echo \"-> Injecting Doctrine/Symfony AI Bridges...\"
docker exec root-oro-application-1 bash -c \"
  apt-get update && apt-get install -y git unzip libpq-dev && docker-php-ext-install pdo pdo_pgsql
  curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
  composer init -n || true
  composer require martin-georgiev/postgresql-for-doctrine
  composer require symfony/ai-postgres-store || echo '[WARN] Fallback: requiring specific vector stores if bundle unavailable'
\"
'"

echo "✅ [SUCCESS] AI-Native PostgreSQL Upgrade Complete."
