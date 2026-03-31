<?php
/**
 * HostBill OAuth2 Module Configuration
 * File: includes/modules/OAuth2/config.php
 * 
 * RISK-005 Mitigation: SSO integration for billing.interface.tag.ooo
 */

// OAuth2 Provider Configuration
return [
    'enabled' => true,
    'provider_name' => 'Interface Identity',
    'provider_icon' => 'fa-shield-alt',
    
    // Keycloak endpoints
    'authorization_endpoint' => 'https://auth.interface.tag.ooo/realms/interface/protocol/openid-connect/auth',
    'token_endpoint' => 'https://auth.interface.tag.ooo/realms/interface/protocol/openid-connect/token',
    'userinfo_endpoint' => 'https://auth.interface.tag.ooo/realms/interface/protocol/openid-connect/userinfo',
    'logout_endpoint' => 'https://auth.interface.tag.ooo/realms/interface/protocol/openid-connect/logout',
    'jwks_uri' => 'https://auth.interface.tag.ooo/realms/interface/protocol/openid-connect/certs',
    
    // Client credentials - set via environment or HostBill admin
    'client_id' => getenv('HOSTBILL_OAUTH_CLIENT_ID') ?: 'hostbill-billing',
    'client_secret' => getenv('HOSTBILL_OAUTH_CLIENT_SECRET'),
    
    // OAuth2 flow configuration
    'scopes' => ['openid', 'email', 'profile'],
    'response_type' => 'code',
    'pkce_enabled' => true,
    'pkce_method' => 'S256',
    
    // Token configuration
    'access_token_expiry' => 3600,
    'refresh_token_enabled' => true,
    
    // Redirect URIs
    'redirect_uri' => 'https://billing.interface.tag.ooo/oauth/callback',
    'post_logout_redirect_uri' => 'https://billing.interface.tag.ooo/',
    
    // User mapping
    'user_mapping' => [
        'id' => 'sub',
        'email' => 'email',
        'first_name' => 'given_name',
        'last_name' => 'family_name',
        'username' => 'preferred_username',
    ],
    
    // Role mapping (Keycloak roles -> HostBill permissions)
    'role_mapping' => [
        'admin' => 'admin',           // Full admin access
        'enterprise_admin' => 'staff', // Staff with limited access
        'affiliate' => 'affiliate',    // Affiliate access
        'user' => 'client',           // Standard client
    ],
    
    // Auto-create user if not exists
    'auto_create_user' => true,
    'default_user_group' => 'client',
    
    // Session configuration
    'session_timeout' => 28800, // 8 hours
    'cookie_domain' => '.interface.tag.ooo',
    'cookie_secure' => true,
    'cookie_httponly' => true,
    
    // Cross-domain SSO
    'cross_domain_sso' => [
        'enabled' => true,
        'session_cookie_name' => 'interface_sso_session',
        'domains' => [
            'app.interface.tag.ooo',
            'enterprise.interface.tag.ooo',
            'forum.interface.tag.ooo',
            'blog.interface.tag.ooo',
            'analytics.interface.tag.ooo',
            'risk.interface.tag.ooo',
        ],
    ],
    
    // Logging
    'debug_mode' => getenv('HOSTBILL_OAUTH_DEBUG') === 'true',
    'log_file' => '/var/log/hostbill/oauth2.log',
];

/**
 * Installation Steps:
 * 
 * 1. Create includes/modules/OAuth2/ directory in HostBill
 * 2. Copy this file as config.php
 * 3. Create module.php with OAuth2 login hooks
 * 4. Set environment variables:
 *    - HOSTBILL_OAUTH_CLIENT_ID
 *    - HOSTBILL_OAUTH_CLIENT_SECRET
 * 5. Enable in HostBill Admin: Settings -> Modules -> OAuth2
 * 6. Test login at: https://billing.interface.tag.ooo/login
 * 
 * Validation:
 * curl -s https://billing.interface.tag.ooo/oauth/status | jq '.enabled'
 */

