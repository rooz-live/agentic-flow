/**
 * Billing Platform Integration E2E Test
 * End-to-end flow: Identity → Rate → Event → Ledger → Tax → Invoice
 * 
 * WSJF Priority: 8.00 (Critical Path Validation)
 * Anti-CVT: This test MUST pass before any deployment
 */

import { test, expect } from '@playwright/test';
import { chromium, Browser, Page } from 'playwright';

// Test configuration
const BASE_URL = process.env.BILLING_API_URL || 'http://localhost:8000';
const WS_URL = process.env.BILLING_WS_URL || 'ws://localhost:8001';

// Domain endpoints
const ENDPOINTS = {
  identity: `${BASE_URL}/api/v1/identity`,
  rates: `${BASE_URL}/api/v1/rates`,
  events: `${BASE_URL}/api/v1/events`,
  ledger: `${BASE_URL}/api/v1/ledger`,
  tax: `${BASE_URL}/api/v1/tax`,
  calculate: `${BASE_URL}/api/v1/calculate`,
  projects: `${BASE_URL}/api/v1/projects`,
};

test.describe('Billing Platform Full Integration', () => {
  test.describe.configure({ mode: 'serial' });
  
  let browser: Browser;
  let page: Page;
  
  // Test context - shared across tests
  const ctx = {
    technicianUuid: '',
    clientUuid: '',
    projectId: '',
    rateId: '',
    eventIds: [] as string[],
    sessionToken: '',
  };

  test.beforeAll(async () => {
    browser = await chromium.launch();
    page = await browser.newPage();
    
    // Health check
    const health = await page.goto(`${BASE_URL}/health`);
    expect(health?.status()).toBe(200);
  });

  test.afterAll(async () => {
    await browser.close();
  });

  test('Step 1: Entity Identity - Create Technician and Client', async () => {
    // Create technician
    const techResponse = await page.request.post(ENDPOINTS.identity, {
      data: {
        entity_type: 'field_technician',
        role: 'Technician',
        alias: 'tech-integration-test',
        metadata: {
          skill_level: 'senior',
          certifications: ['electrical', 'hvac'],
        },
      },
    });
    
    expect(techResponse.status()).toBe(201);
    const techData = await techResponse.json();
    expect(techData.uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    ctx.technicianUuid = techData.uuid;
    
    // Create client
    const clientResponse = await page.request.post(ENDPOINTS.identity, {
      data: {
        entity_type: 'end_client',
        role: 'Client',
        alias: 'client-integration-test',
        metadata: {
          tier: 'enterprise',
          payment_terms: 'net_30',
        },
      },
    });
    
    expect(clientResponse.status()).toBe(201);
    const clientData = await clientResponse.json();
    ctx.clientUuid = clientData.uuid;
    
    console.log(`✅ Identity: Tech=${ctx.technicianUuid}, Client=${ctx.clientUuid}`);
  });

  test('Step 2: Project Context - Create Project with Budget', async () => {
    const response = await page.request.post(ENDPOINTS.projects, {
      data: {
        client_id: ctx.clientUuid,
        name: 'Integration Test Project',
        status: 'development',
        budget: {
          total: 50000.00,
          currency: 'USD',
          alert_threshold: 0.8,
        },
        constraints: {
          geo_fence: {
            center_lat: 35.2271,
            center_lon: -80.8431,
            radius_meters: 5000,
          },
        },
      },
    });
    
    expect(response.status()).toBe(201);
    const data = await response.json();
    ctx.projectId = data.project_id;
    expect(data.budget.total).toBe(50000.00);
    
    console.log(`✅ Project: ${ctx.projectId}`);
  });

  test('Step 3: Rate Engine - Create Multi-Dimensional Rate', async () => {
    const response = await page.request.post(ENDPOINTS.rates, {
      data: {
        technician_id: ctx.technicianUuid,
        project_id: ctx.projectId,
        base_rate: '150.00',
        currency: 'USD',
        dimensions: [
          { type: 'location', multiplier: '1.0', condition: 'onsite' },
          { type: 'location', multiplier: '0.85', condition: 'remote' },
          { type: 'time', multiplier: '1.5', condition: 'after_hours' },
          { type: 'urgency', multiplier: '2.0', condition: 'emergency' },
        ],
        effective_date: '2024-01-01',
      },
    });
    
    expect(response.status()).toBe(201);
    const data = await response.json();
    ctx.rateId = data.rate_id;
    expect(data.dimensions).toHaveLength(4);
    
    console.log(`✅ Rate: ${ctx.rateId}`);
  });

  test('Step 4: EventOps - Log Clock In (Onsite)', async () => {
    const response = await page.request.post(ENDPOINTS.events, {
      data: {
        event_type: 'clock_in',
        entity_uuid: ctx.technicianUuid,
        project_id: ctx.projectId,
        timestamp: new Date().toISOString(),
        location: {
          latitude: 35.2275, // Within geo_fence
          longitude: -80.8435,
          accuracy: 5.0,
        },
        metadata: {
          device_id: 'test-device-001',
          battery_level: 0.85,
        },
      },
    });
    
    expect(response.status()).toBe(201);
    const data = await response.json();
    ctx.eventIds.push(data.event_id);
    expect(data.content_hash).toBeDefined();
    expect(data.integrity_verified).toBe(true);
    
    console.log(`✅ Clock In: ${data.event_id}`);
  });

  test('Step 5: Ceremony Logger - Log Standup (Billable)', async () => {
    const response = await page.request.post(`${ENDPOINTS.events}/ceremony`, {
      data: {
        ceremony_type: 'standup',
        session_id: `standup-${Date.now()}`,
        project_id: ctx.projectId,
        technician_uuid: ctx.technicianUuid,
        start_time: new Date(Date.now() - 15 * 60000).toISOString(), // 15 min ago
        end_time: new Date().toISOString(),
        participants: [ctx.technicianUuid],
        billable: true,
        action_items: ['Update deployment docs', 'Review PR #123'],
      },
    });
    
    expect(response.status()).toBe(201);
    const data = await response.json();
    ctx.eventIds.push(data.event_id);
    expect(data.duration_minutes).toBeCloseTo(15, 0);
    expect(data.billable_amount).toBeGreaterThan(0);
    
    console.log(`✅ Standup: ${data.event_id} (${data.duration_minutes}min)`);
  });

  test('Step 6: Job Manifest - Complete Task with Materials', async () => {
    const response = await page.request.post(`${ENDPOINTS.events}/job`, {
      data: {
        job_type: 'hardware_install',
        project_id: ctx.projectId,
        technician_uuid: ctx.technicianUuid,
        tasks: [
          { name: 'Install sensor', completed: true },
          { name: 'Configure network', completed: true },
          { name: 'Test connectivity', completed: true },
        ],
        materials: [
          { sku: 'SENSOR-001', quantity: 2, unit_cost: 45.00 },
          { sku: 'CABLE-RJ45', quantity: 10, unit_cost: 2.50 },
        ],
        sign_off: {
          client_present: true,
          client_uuid: ctx.clientUuid,
          signature_hash: 'sha256:abc123...',
          satisfaction_rating: 5,
        },
      },
    });
    
    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.total_material_cost).toBe(115.00); // (2*45) + (10*2.50)
    
    console.log(`✅ Job Complete: Materials=$${data.total_material_cost}`);
  });

  test('Step 7: EventOps - Log Clock Out', async () => {
    // Wait 1 second to ensure time difference
    await new Promise(r => setTimeout(r, 1000));
    
    const response = await page.request.post(ENDPOINTS.events, {
      data: {
        event_type: 'clock_out',
        entity_uuid: ctx.technicianUuid,
        project_id: ctx.projectId,
        timestamp: new Date().toISOString(),
        location: {
          latitude: 35.2275,
          longitude: -80.8435,
          accuracy: 5.0,
        },
      },
    });
    
    expect(response.status()).toBe(201);
    const data = await response.json();
    ctx.eventIds.push(data.event_id);
    
    console.log(`✅ Clock Out: ${data.event_id}`);
  });

  test('Step 8: Calculation Engine - Aggregate Billable Hours', async () => {
    const response = await page.request.post(ENDPOINTS.calculate, {
      data: {
        calculation_type: 'time_aggregation',
        project_id: ctx.projectId,
        technician_uuid: ctx.technicianUuid,
        date_range: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
        },
        include_ceremony: true,
      },
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.billable_hours).toBeGreaterThan(0);
    expect(data.ceremony_hours).toBeGreaterThan(0);
    expect(data.total_hours).toBe(data.billable_hours + data.ceremony_hours);
    
    console.log(`✅ Calculated: ${data.total_hours}h total (${data.billable_hours}h work + ${data.ceremony_hours}h ceremony)`);
  });

  test('Step 9: Cost & Budget Ledger - Track Expenditure', async () => {
    const response = await page.request.post(ENDPOINTS.ledger, {
      data: {
        entry_type: 'expenditure',
        project_id: ctx.projectId,
        entries: [
          {
            category: 'labor',
            description: 'Technician onsite work',
            gross_cost: 300.00, // 2 hours @ $150
            net_billable: 300.00,
          },
          {
            category: 'ceremony',
            description: 'Standup participation',
            gross_cost: 37.50, // 15 min @ $150
            net_billable: 37.50,
          },
          {
            category: 'materials',
            description: 'Hardware installation',
            gross_cost: 115.00,
            net_billable: 149.50, // With 30% markup
          },
        ],
      },
    });
    
    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.total_gross).toBe(452.50);
    expect(data.total_net).toBe(487.00);
    expect(data.budget_remaining).toBe(49513.00); // 50000 - 487
    expect(data.budget_utilization).toBeCloseTo(0.0097, 3); // 487/50000
    
    console.log(`✅ Ledger: $${data.total_net} billed, $${data.budget_remaining} remaining`);
  });

  test('Step 10: Tax & Currency - Calculate Jurisdiction Tax', async () => {
    const response = await page.request.post(ENDPOINTS.tax, {
      data: {
        jurisdiction_code: 'US-NC-MECKLENBURG',
        base_amount: '487.00',
        tax_rate: '0.0725', // 7.25% NC state + local
        calculation_type: 'percentage',
        currency: 'USD',
      },
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.base_amount).toBe('487.00');
    expect(data.tax_amount).toBe('35.31'); // 487 * 0.0725
    expect(data.total_amount).toBe('522.31');
    
    console.log(`✅ Tax: $${data.tax_amount} (jurisdiction: ${data.jurisdiction_code})`);
  });

  test('Step 11: Full Invoice Generation', async () => {
    const response = await page.request.post(`${BASE_URL}/api/v1/invoices`, {
      data: {
        client_id: ctx.clientUuid,
        project_id: ctx.projectId,
        line_items: [
          {
            description: 'Onsite technician work',
            quantity: 2.0,
            unit_price: '150.00',
            subtotal: '300.00',
          },
          {
            description: 'Ceremony time (standup)',
            quantity: 0.25, // 15 minutes
            unit_price: '150.00',
            subtotal: '37.50',
          },
          {
            description: 'Materials + markup',
            quantity: 1,
            unit_price: '149.50',
            subtotal: '149.50',
          },
        ],
        tax: {
          jurisdiction: 'US-NC-MECKLENBURG',
          rate: '0.0725',
          amount: '35.31',
        },
        totals: {
          subtotal: '487.00',
          tax_total: '35.31',
          total_due: '522.31',
          currency: 'USD',
        },
      },
    });
    
    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.invoice_id).toMatch(/^INV-[0-9]{8}-[0-9]{6}$/);
    expect(data.total_due).toBe('522.31');
    expect(data.status).toBe('generated');
    
    console.log(`✅ Invoice: ${data.invoice_id} for $${data.total_due}`);
  });

  test('Step 12: Immutability Verification - All Events', async () => {
    const response = await page.request.post(`${ENDPOINTS.events}/verify`, {
      data: {
        event_ids: ctx.eventIds,
        verify_hashes: true,
        verify_chain: true,
      },
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.all_valid).toBe(true);
    expect(data.verified_count).toBe(ctx.eventIds.length);
    expect(data.failed_count).toBe(0);
    
    console.log(`✅ Immutability: ${data.verified_count} events verified, 0 tampering detected`);
  });

  test('Step 13: Schema Validation - Full Platform Contract Check', async () => {
    const response = await page.request.post(`${BASE_URL}/api/v1/validate`, {
      data: {
        validation_type: 'full_platform',
        schemas: [
          'entity_identity',
          'rate',
          'event_fact',
          'ceremony_session',
          'job_manifest',
          'cost_entry',
          'project_context',
          'tax_calculation',
          'calculation_result',
        ],
        check_coverage: true,
      },
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.coverage_percentage).toBe(100);
    expect(data.failed_validations).toHaveLength(0);
    
    console.log(`✅ Schema: 100% contract coverage, all validations passed`);
  });

  test('Step 14: Performance - p99 Latency Check', async () => {
    const latencies: number[] = [];
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await page.request.get(`${ENDPOINTS.identity}/${ctx.technicianUuid}`);
      const end = Date.now();
      latencies.push(end - start);
    }
    
    // Calculate p99
    const sorted = latencies.sort((a, b) => a - b);
    const p99 = sorted[Math.floor(iterations * 0.99)];
    
    expect(p99).toBeLessThan(50); // p99 < 50ms target
    
    const avg = latencies.reduce((a, b) => a + b, 0) / iterations;
    console.log(`✅ Performance: p99=${p99}ms, avg=${avg.toFixed(2)}ms (${iterations} requests)`);
  });
});

test.describe('Billing Platform Error Handling', () => {
  test('Invalid schema returns ERR_INVALID_CONTRACT_FORMAT', async ({ page }) => {
    const response = await page.request.post(ENDPOINTS.events, {
      data: {
        // Missing required fields
        event_type: 'clock_in',
        // entity_uuid missing
        // timestamp missing
      },
    });
    
    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error_code).toBe('ERR_INVALID_CONTRACT_FORMAT');
  });

  test('Geo fence violation returns ERR_GEO_FENCE_VIOLATION', async ({ page }) => {
    const response = await page.request.post(ENDPOINTS.events, {
      data: {
        event_type: 'clock_in',
        entity_uuid: 'test-tech-001',
        project_id: 'test-proj-001',
        timestamp: new Date().toISOString(),
        location: {
          latitude: 40.7128, // NYC - outside Charlotte geo_fence
          longitude: -74.0060,
          accuracy: 5.0,
        },
      },
    });
    
    expect(response.status()).toBe(403);
    const data = await response.json();
    expect(data.error_code).toBe('ERR_GEO_FENCE_VIOLATION');
  });

  test('Budget exceeded returns ERR_BUDGET_EXCEEDED', async ({ page }) => {
    const response = await page.request.post(ENDPOINTS.ledger, {
      data: {
        entry_type: 'expenditure',
        project_id: 'low-budget-proj',
        entries: [
          {
            category: 'labor',
            description: 'Expensive work',
            gross_cost: 100000.00, // Exceeds budget
            net_billable: 100000.00,
          },
        ],
      },
    });
    
    expect(response.status()).toBe(402); // Payment Required
    const data = await response.json();
    expect(data.error_code).toBe('ERR_BUDGET_EXCEEDED');
  });
});
