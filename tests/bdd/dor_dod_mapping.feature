Feature: Definition of Ready (DoR) and Definition of Done (DoD) Criteria Enforcement
  As the Autonomous Quality Engineer
  I want to actively enforce the DoR and DoD criteria using executable BDD steps
  So that the continuous verification loop cannot be bypassed

  Scenario: Code Search Tool DoR Validation
    Given the codebase has an active search pattern
    And the root directory is accessible and readable
    And the performance baseline file "tests/perf/baseline_code_search.json" exists
    When the Code Search tool executes
    Then it must meet the Definition of Ready

  Scenario: Code Search Tool DoD Performance and Quality
    Given the Code Search tool has finished executing
    When evaluating the performance metrics
    Then the search must complete in under 5000 ms for 1000 files
    And the processing rate must be greater than 100 files per second
    And there must be no false positives in regex mode

  Scenario: Document Query Tool DoR Validation
    Given a non-empty document query string
    And the ".goalie" directory exists in the project root
    And the ".goalie/insights_log.jsonl" baseline has more than 10 entries
    When the Doc Query tool initializes
    Then it must meet the Definition of Ready

  Scenario: Document Query Tool DoD Critical Relevance
    Given the Doc Query tool has finished executing
    When evaluating the relevance metrics
    Then the query must complete in under 1000 ms for 372 files
    And the average relevance score must be greater than or equal to 0.80
    And the cache hit rate must be greater than or equal to 0.50
