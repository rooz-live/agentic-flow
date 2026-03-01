# ═══════════════════════════════════════════════════════════════════
# Neural Trader v2.8.0 — Docker Image
# ═══════════════════════════════════════════════════════════════════
# Multi-stage: Rust WASM build → Node.js runtime
#
# Build:  docker build -t neural-trader:latest .
# Run:    docker run -d -p 8080:8080 neural-trader:latest --mode paper-trading
# Test:   curl http://localhost:8080/health
# Logs:   docker logs <container-id>
# ═══════════════════════════════════════════════════════════════════

# ── Stage 1: Build WASM from Rust source ─────────────────────────────

FROM rust:1.77-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl pkg-config libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Install wasm-pack
RUN curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

WORKDIR /build
COPY Cargo.toml ./
COPY src/ ./src/

# Build WASM (nodejs target for server-side use)
RUN wasm-pack build --target nodejs --release --out-dir pkg

# ── Stage 2: Node.js runtime ────────────────────────────────────────

FROM node:20-slim

LABEL maintainer="Agentic Flow Team"
LABEL version="2.8.0"
LABEL description="Neural Trader — Kelly/Sharpe paper trading engine"

WORKDIR /app

# Copy WASM artifacts from builder
COPY --from=builder /build/pkg/ ./pkg/

# Copy server and package config (zero npm deps — pure Node stdlib)
COPY server.js ./
COPY package.json ./
COPY index.js ./

# Create data directories
RUN mkdir -p /app/data/trading-logs /app/data/statements

ENV PORT=8080
ENV SIGNAL_INTERVAL=60000
ENV NODE_ENV=production

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD node -e "const h=require('http');h.get('http://localhost:8080/health',r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

ENTRYPOINT ["node", "server.js"]
CMD ["--mode", "paper-trading"]
