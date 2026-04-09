#!/usr/bin/env bats

# test_dns_ssl_matrix.bats
# Red-Green TDD implementation for strict SSL/DNS Validation logic across the Swarm TLD architecture.
# Fails correctly when the returned certificate Common Name does not match the requested domain.

@test "SSL Validation: law.rooz.live serves correct Common Name (NOT fallback autoconfig.yo.tag.ooo)" {
    # Extract the Common Name (CN) and Subject Alternative Names (SAN) from the live server
    CERT_INFO=$(echo | openssl s_client -connect law.rooz.live:443 -servername law.rooz.live 2>/dev/null | openssl x509 -noout -subject -ext subjectAltName)
    
    # Check that the certificate subject contains law.rooz.live
    run echo "$CERT_INFO"
    [[ "$output" == *"law.rooz.live"* ]] || {
        echo "SSL Certificate Mismatch (ERR_CERT_COMMON_NAME_INVALID)."
        echo "Received Certificate Info:"
        echo "$CERT_INFO"
        return 1
    }
}

@test "SSL Validation: pur.tag.vote serves correct Common Name" {
    skip "Currently NXDOMAIN completely"
}

@test "SSL Validation: hab.yo.life serves correct Common Name" {
    skip "Currently NXDOMAIN completely"
}

@test "SSL Validation: file.720.chat serves correct Common Name" {
    skip "Currently NXDOMAIN completely"
}
