<?php
/**
 * WordPress SSO Configuration for Nextend Social Login
 * File: wp-content/mu-plugins/interface-sso.php
 * 
 * RISK-005 Mitigation: Multi-domain SSO integration
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Configure Nextend Social Login OAuth2 Provider
 * Install: wp plugin install nextend-facebook-connect --activate
 */
add_filter('nsl_oauth2_providers', function($providers) {
    $providers['interface-identity'] = [
        'name' => 'Interface Identity',
        'label' => 'Login with Interface',
        'icon' => 'interface-identity-icon.svg',
        'settings' => [
            'client_id' => getenv('WORDPRESS_OAUTH_CLIENT_ID') ?: 'wordpress-blog',
            'client_secret' => getenv('WORDPRESS_OAUTH_CLIENT_SECRET'),
            'authorization_endpoint' => 'https://auth.interface.tag.ooo/realms/interface/protocol/openid-connect/auth',
            'token_endpoint' => 'https://auth.interface.tag.ooo/realms/interface/protocol/openid-connect/token',
            'userinfo_endpoint' => 'https://auth.interface.tag.ooo/realms/interface/protocol/openid-connect/userinfo',
            'scopes' => ['openid', 'email', 'profile'],
            'pkce_enabled' => true,
        ]
    ];
    return $providers;
});

/**
 * Map Keycloak claims to WordPress user data
 */
add_filter('nsl_oauth2_map_user_data', function($user_data, $provider_id, $token_data) {
    if ($provider_id !== 'interface-identity') {
        return $user_data;
    }
    
    // Map Keycloak userinfo to WordPress
    return [
        'user_login' => $token_data['preferred_username'] ?? $token_data['email'],
        'user_email' => $token_data['email'],
        'display_name' => $token_data['name'] ?? $token_data['preferred_username'],
        'first_name' => $token_data['given_name'] ?? '',
        'last_name' => $token_data['family_name'] ?? '',
        'roles' => interface_map_keycloak_roles($token_data['realm_access']['roles'] ?? []),
    ];
}, 10, 3);

/**
 * Map Keycloak roles to WordPress roles
 */
function interface_map_keycloak_roles($keycloak_roles) {
    $role_map = [
        'admin' => 'administrator',
        'enterprise_admin' => 'editor',
        'enterprise_user' => 'author',
        'analyst' => 'contributor',
        'user' => 'subscriber',
    ];
    
    $wp_roles = [];
    foreach ($keycloak_roles as $role) {
        if (isset($role_map[$role])) {
            $wp_roles[] = $role_map[$role];
        }
    }
    
    // Default to subscriber if no roles matched
    return empty($wp_roles) ? ['subscriber'] : $wp_roles;
}

/**
 * Cross-domain session sync via shared cookie
 */
add_action('wp_login', function($user_login, $user) {
    // Set cross-domain cookie for SSO detection
    $cookie_domain = getenv('COOKIE_DOMAIN') ?: '.interface.tag.ooo';
    setcookie(
        'interface_sso_session',
        wp_hash($user->ID . time()),
        time() + 28800, // 8 hours
        '/',
        $cookie_domain,
        true, // Secure
        true  // HttpOnly
    );
}, 10, 2);

/**
 * Logout from all interface domains
 */
add_action('wp_logout', function() {
    $cookie_domain = getenv('COOKIE_DOMAIN') ?: '.interface.tag.ooo';
    setcookie('interface_sso_session', '', time() - 3600, '/', $cookie_domain, true, true);
    
    // Redirect to Keycloak logout
    $logout_url = 'https://auth.interface.tag.ooo/realms/interface/protocol/openid-connect/logout';
    $redirect_uri = urlencode(home_url('/'));
    wp_redirect($logout_url . '?post_logout_redirect_uri=' . $redirect_uri);
    exit;
});

/**
 * Add SSO status to admin bar
 */
add_action('admin_bar_menu', function($wp_admin_bar) {
    if (is_user_logged_in()) {
        $wp_admin_bar->add_node([
            'id' => 'interface-sso',
            'title' => '🔐 Interface SSO',
            'href' => 'https://auth.interface.tag.ooo/realms/interface/account',
            'meta' => ['target' => '_blank']
        ]);
    }
}, 100);

