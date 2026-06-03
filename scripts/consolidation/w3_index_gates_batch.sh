#!/usr/bin/env bash
# w3_index_gates_batch.sh — Delegates to allowlisted index slice (anti scope-creep).
exec "$(dirname "$0")/../cicd/index_slice_allowlist.sh" "$@"
