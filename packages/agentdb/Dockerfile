# Dockerfile for AgentDB - Agent Memory & Vector Database
# Production-ready Docker image with MCP server support
FROM node:18-alpine

LABEL maintainer="rUv (@ruvnet)"
LABEL description="AgentDB - Agent Memory & Vector Database with ReasoningBank and MCP Server"
LABEL version="1.0.0"

# Install build dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    sqlite

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY tsconfig.json tsconfig.esm.json ./

# Copy source and build output
COPY src/ ./src/
COPY dist/ ./dist/
COPY bin/ ./bin/
COPY examples/ ./examples/
COPY templates/ ./templates/

# Copy license and documentation
COPY LICENSE* ./
COPY README.md ./

# Install dependencies (production mode)
RUN npm install --production

# Create data directory for vector databases
RUN mkdir -p /data

# Expose MCP server stdio (no port needed for stdio transport)
# MCP uses stdin/stdout for communication

# Set environment variables
ENV NODE_ENV=production
ENV AGENTDB_DATA_DIR=/data

# Health check script
RUN echo '#!/bin/sh\nnode bin/agentdb.js help > /dev/null && echo "AgentDB is healthy" || exit 1' > /healthcheck.sh && \
    chmod +x /healthcheck.sh

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["/healthcheck.sh"]

# Default command: Show help
# Override with specific commands:
# - docker run agentdb mcp (start MCP server)
# - docker run agentdb create-plugin
# - docker run agentdb list-templates
CMD ["node", "bin/agentdb.js", "help"]
