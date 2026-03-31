#!/usr/bin/env bats

setup() {
    export TEST_TEMP_DIR="$(mktemp -d)"
    export LOG_FILE="$TEST_TEMP_DIR/test.log"
    export PID_FILE="$TEST_TEMP_DIR/test.pid"
    export DASHBOARD_DIR="$TEST_TEMP_DIR"
    export PORT="8081"
}

teardown() {
    # Clean up any lingering python servers on the test port
    lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
    rm -rf "$TEST_TEMP_DIR"
}

@test "cascade-tunnel.sh syntax is valid" {
    run bash -n scripts/orchestrators/cascade-tunnel.sh
    [ "$status" -eq 0 ]
}

@test "start_http_server starts successfully" {
    run bash -c "
        source scripts/orchestrators/cascade-tunnel.sh >/dev/null 2>&1
        export DASHBOARD_DIR='$TEST_TEMP_DIR'
        export PORT='8081'
        export LOG_FILE='$LOG_FILE'
        start_http_server
    "
    
    # Python server should start and we should get a 200 via curl
    [ "$status" -eq 0 ]
    
    # Verify curl actually works against the local port
    run curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8081/
    [ "$output" = "200" ]
}

@test "save_tunnel_state creates JSON correctly" {
    run bash -c "
        source scripts/orchestrators/cascade-tunnel.sh >/dev/null 2>&1
        echo 'tailscale' > /tmp/active-tunnel-provider.txt
        echo 'https://test.ts.net' > /tmp/active-tunnel-url.txt
        export ACTIVE_TUNNEL_PID=12345
        save_tunnel_state
        cat /tmp/tunnel-state.json
    "
    
    [ "$status" -eq 0 ]
    echo "$output" | grep '"provider": "tailscale"'
    echo "$output" | grep '"url": "https://test.ts.net"'
    echo "$output" | grep '"pid": 12345'
}
