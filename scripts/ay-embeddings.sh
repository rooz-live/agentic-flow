#!/bin/bash
# Qwen3-VL embedding integration
EMBEDDING_MODEL="Qwen/qwen3-vl-embedding"
curl -X POST "https://huggingface.co/api/models/$EMBEDDING_MODEL" \
  -H "Authorization: Bearer $HF_TOKEN" \
  -d '{"inputs": ["$1"]}'
