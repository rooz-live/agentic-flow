#!/bin/bash
# Mock IRIS CLI for E2E testing

cmd="$1"

case "$cmd" in
    health)
        echo '{"status":"healthy","components":{"api":"up","db":"up"}}'
        ;;
    evaluate)
        echo '{"evaluation_id":"eval-123","score":0.85,"circles_involved":["analyst","innovator"],"actions_taken":[{"action":"optimize_latency","priority":"critical","circle":"innovator"}]}'
        ;;
    patterns)
        echo '{"patterns_detected":["feedback_loop_gap"],"severity":"medium"}'
        ;;
    config)
        echo '{"environment":"test","logging":"enabled"}'
        ;;
    *)
        echo "{}"
        ;;
esac
