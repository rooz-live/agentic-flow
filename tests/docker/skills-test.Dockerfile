# Docker test for agentic-flow skills functionality
FROM node:18-alpine

# Install build dependencies
RUN apk add --no-cache git bash curl

# Create test user (non-root)
RUN addgroup -g 1001 testuser && \
    adduser -D -u 1001 -G testuser testuser

# Switch to test user
USER testuser
WORKDIR /home/testuser

# Copy built distribution
COPY --chown=testuser:testuser dist/ ./agentic-flow/

# Create package.json for testing
RUN echo '{"type":"module"}' > agentic-flow/package.json

# Test script
COPY --chown=testuser:testuser tests/docker/test-skills.sh ./test-skills.sh
RUN chmod +x ./test-skills.sh

# Run tests
CMD ["./test-skills.sh"]
