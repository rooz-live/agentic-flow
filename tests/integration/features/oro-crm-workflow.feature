Feature: OroCommerce CRM Real Workflow
  As a B2B user
  I want to access the OroCommerce storefront and sign in
  So that I can manage my billing and plans

  @live @edge
  Scenario: Oro health endpoint responds correctly
    Given the OroCommerce CRM is active on "https://crm.bhopti.com"
    When I check the "/health" endpoint
    Then the response status should be less than 500

  @live @edge
  Scenario: B2B Sign In page renders
    Given I navigate to "https://crm.bhopti.com"
    When I visit the "/user/login" page
    Then the page should contain the text "OroCommerce" or "Sovereign Swarm" or "Login"

  @live @edge
  Scenario: API endpoint responds to login check
    Given the OroCommerce CRM is active on "https://crm.bhopti.com"
    When I POST to "/api/login_check" with test credentials
    Then the API should respond with an authorized or expected unauthorized status
