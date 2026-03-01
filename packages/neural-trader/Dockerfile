# ═══════════════════════════════════════════════════════════════════
# Neural Trader v2.8.0 — Docker Image
# ═══════════════════════════════════════════════════════════════════
# Uses pre-built WASM from pkg/ (built via wasm-pack on host).
# Server is pure-JS (zero npm deps) — no Rust toolchain required.
#
# Build:  docker build -t neural-trader:latest .
# Run:    docker run -d -p 8080:8080 neural-trader:latest --mode paper-trading
# Test:   curl http://localhost:8080/health
# Logs:   docker logs <container-id>
# ═══════════════════════════════════════════════════════════════════

FROM node:20-slim

LABEL maintainer="Agentic Flow Team"
LABEL version="2.8.0"
LABEL description="Neural Trader — Kelly/Sharpe paper trading engine"

WORKDIR /app

# Pre-built WASM package (wasm-pack output committed in repo)
COPY pkg/ ./pkg/

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
