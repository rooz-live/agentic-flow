# Test agentic-flow skills installation in clean Docker environment
FROM node:18-slim

# Install dependencies
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Create test user (non-root)
RUN useradd -m -s /bin/bash testuser
USER testuser
WORKDIR /home/testuser

# Copy built package
COPY --chown=testuser:testuser agentic-flow ./agentic-flow/

# Install only required dependencies manually (faster, no build needed)
WORKDIR /home/testuser/agentic-flow
RUN npm install --omit=dev dotenv yaml chalk --no-save

# Create .claude/skills directory
RUN mkdir -p /home/testuser/.claude/skills

# Test 1: Initialize skills with skill-builder
RUN node dist/cli-proxy.js skills init personal --with-builder

# Test 2: Verify skill-builder was installed at TOP LEVEL (not in namespace)
RUN test -f /home/testuser/.claude/skills/skill-builder/SKILL.md || \
    (echo "ERROR: skill-builder not found at ~/.claude/skills/skill-builder/" && exit 1)

# Test 3: Verify NOT in namespace directory
RUN test ! -d /home/testuser/.claude/skills/agentic-flow/skill-builder || \
    (echo "ERROR: skill-builder incorrectly installed in namespace directory" && exit 1)

# Test 4: Create other skills
RUN node dist/cli-proxy.js skills create

# Test 5: Verify all skills installed at TOP LEVEL
RUN for skill in agentdb-vector-search agentdb-memory-patterns swarm-orchestration reasoningbank-intelligence; do \
      if [ ! -f "/home/testuser/.claude/skills/$skill/SKILL.md" ]; then \
        echo "ERROR: Skill $skill not found at top level"; \
        exit 1; \
      fi; \
      if [ -d "/home/testuser/.claude/skills/agentic-flow/$skill" ]; then \
        echo "ERROR: Skill $skill incorrectly in namespace directory"; \
        exit 1; \
      fi; \
    done

# Test 6: List all skills
RUN node dist/cli-proxy.js skills list > /tmp/skills-list.txt

# Test 7: Verify YAML frontmatter is valid
RUN for skill in /home/testuser/.claude/skills/*/SKILL.md; do \
      head -5 "$skill" | grep -q "^name:" || (echo "ERROR: Invalid YAML in $skill" && exit 1); \
      head -5 "$skill" | grep -q "^description:" || (echo "ERROR: Missing description in $skill" && exit 1); \
    done

# Final verification
RUN echo "=== Skills Directory Structure ===" && \
    ls -la /home/testuser/.claude/skills/ && \
    echo "=== All Tests Passed! ===" && \
    echo "✅ Skills installed at top level (~/.claude/skills/[skill-name]/)" && \
    echo "✅ No skills in namespace subdirectory" && \
    echo "✅ All YAML frontmatter valid"

CMD ["sh", "-c", "echo 'Docker test completed successfully!'"]
