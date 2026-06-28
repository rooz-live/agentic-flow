Feature: Timescape velocity DoR/DoD assertions
  As the Autonomous Quality Engineer
  I want inbox_zero_latest.json velocity metrics to satisfy DoR/DoD contracts
  So that cycle pacing cannot claim green without measured throughput

  Scenario: Timescape artifact satisfies velocity contract
    Given the inbox zero timescape artifact exists
    When I read the timescape velocity metrics
    Then pct_closed must equal closed over open plus closed
    And velocity must equal closed divided by window hours
    And emergent_time_source must be wall_clock
