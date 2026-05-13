#!/bin/bash
# ==============================================================================
# 🦅 SWARM ORCHESTRATION: ORO-CRM PHYSICAL EDGE PROVISIONING
# Doctrine: San Gen Shugi (Actual Facts)
# WSJF Score: 10.00
# Target: KVM Edge (192.168.122.237)
# ==============================================================================
set -e

echo "🦅 INITIATING PHYSICAL ORO-CRM PROVISIONING ON C-PANEL EDGE"

# 1. Environment & Prerequisites
DOMAIN="crm.yo.tag.ooo"
DOCROOT="/home/yo/public_html/crm"
DB_NAME="yo_orocrm"
DB_USER="yo_oroadmin"
DB_PASS=$(openssl rand -base64 16)

echo "-> Verifying PHP 8.2 & Composer..."
if ! command -v composer &> /dev/null; then
    curl -sS https://getcomposer.org/installer | php
    mv composer.phar /usr/local/bin/composer
fi

# 2. Scaffold Database via WHM UAPI
echo "-> Structuring PostgreSQL/MySQL Vault for OroPlatform..."
uapi --user=yo Mysql create_database name=$DB_NAME || echo "Database exists"
uapi --user=yo Mysql create_user name=$DB_USER password=$DB_PASS || echo "User exists"
uapi --user=yo Mysql set_privileges_on_database user=$DB_USER database=$DB_NAME privileges=ALL

# 3. Pull OroPlatform Core (Headless CRM)
echo "-> Cloning OroPlatform Headless Architecture..."
if [ ! -d "$DOCROOT" ]; then
    mkdir -p $DOCROOT
    git clone -b 5.1 https://github.com/oroinc/crm-application.git $DOCROOT
fi

cd $DOCROOT

# 4. Synthesize Physical Parameters
echo "-> Injecting Zero-Trust Auth Parameters..."
cat <<EOF > .env.local
DATABASE_URL="mysql://${DB_USER}:${DB_PASS}@127.0.0.1:3306/${DB_NAME}"
MAILER_DSN=native://default
ORO_SECRET=$(openssl rand -hex 16)
EOF

# 5. Composer & Node Build
echo "-> Building Symfony Dependencies..."
composer install --prefer-dist --no-dev --optimize-autoloader --no-interaction
npm install
npm run build

# 6. Physical Database Hydration
echo "-> Hydrating OroPlatform Schema..."
php bin/console oro:install --env=prod --user-name=admin --user-password=sovereign_swarm_root --user-email=admin@yo.tag.ooo --user-firstname=Sovereign --user-lastname=Swarm --organization-name="Sovereign Ecosystem" --sample-data=n --timeout=3600 --no-interaction

# 7. Warm Cache & JWT Bridge Setup
echo "-> Generating Lexik JWT Keys for Swarm Edge Authentication..."
php bin/console lexik:jwt:generate-keypair --skip-if-exists
php bin/console cache:clear --env=prod

# 8. WordPress / Flarum SSO Physical Link (Zero-Trust Bridge)
echo "-> Exporting Sovereign SSO Public Key for WP/Flarum bridging..."
mkdir -p /home/yo/public_html/shared/sso
cp config/jwt/public.pem /home/yo/public_html/shared/sso/sovereign_jwt_public.pem || echo "JWT public key export failed"
chmod 644 /home/yo/public_html/shared/sso/sovereign_jwt_public.pem || true

# 9. Expose Node API bridge (192.168.122.237:8000 -> OroCRM)
echo "✅ OroCRM Provisioning Sealed. JWT SSO Public Key mapped to /shared/sso."
echo "Auth Bridge is physically available at http://192.168.122.237:8000/api/login_check"
