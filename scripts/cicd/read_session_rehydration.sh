#!/usr/bin/env bash
exec "$(dirname "$0")/session_rehydration_reader.sh" --compact "$@"
