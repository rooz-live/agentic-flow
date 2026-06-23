Feature: Agent Harness Integration
  As a repo maintainer
  I want a scaffolded metaharness for my repository
  So that I have a repo-aware AI agent CLI with MCP servers

  Scenario: The generated harness is healthy and passes the doctor check
    Given the repository root contains the "apps/agent-harness" directory
    When I run "npm run doctor" within the harness directory
    Then it should exit successfully
    And the ".harness/manifest.json" file should exist
