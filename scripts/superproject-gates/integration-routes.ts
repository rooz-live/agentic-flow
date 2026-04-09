import express, { Request, Response } from 'express';
import { getStripeInstance } from '../../rooz/stripe-integration.js';
import { getSlopDetectionInstance } from '../../af-prod/slop-detection.js';

const router = express.Router();

// ============================================================================
// Stripe Integration Endpoints
// ============================================================================

/**
 * POST /api/stripe/checkout
 * Create Stripe checkout session
 */
router.post('/stripe/checkout', async (req: Request, res: Response) => {
  const stripe = getStripeInstance();
  
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe not configured' });
  }
  
  const { userId, email, tier = 'pro' } = req.body;
  
  if (!userId || !email) {
    return res.status(400).json({ error: 'userId and email are required' });
  }
  
  if (tier !== 'pro' && tier !== 'enterprise') {
    return res.status(400).json({ error: 'Invalid tier (must be pro or enterprise)' });
  }
  
  try {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const { sessionId, url } = await stripe.createCheckoutSession(
      userId,
      email,
      tier,
      `${baseUrl}/rooz/success`,
      `${baseUrl}/rooz/cancel`
    );
    
    res.json({ sessionId, url });
  } catch (error: any) {
    console.error('[API] Stripe checkout error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/stripe/webhook
 * Handle Stripe webhooks
 */
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const stripe = getStripeInstance();
  
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe not configured' });
  }
  
  const signature = req.headers['stripe-signature'];
  
  if (!signature || typeof signature !== 'string') {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }
  
  try {
    const event = await stripe.handleWebhook(req.body, signature);
    console.log(`[API] Processed Stripe webhook: ${event.type}`);
    res.json({ received: true, type: event.type });
  } catch (error: any) {
    console.error('[API] Stripe webhook error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/stripe/subscription/:userId
 * Get subscription status for a user
 */
router.get('/stripe/subscription/:userId', async (req: Request, res: Response) => {
  const stripe = getStripeInstance();
  
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe not configured' });
  }
  
  const { userId } = req.params;
  
  try {
    const subscription = await stripe.getSubscriptionStatus(userId);
    res.json(subscription);
  } catch (error: any) {
    console.error('[API] Get subscription error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/stripe/subscription/:userId
 * Cancel subscription
 */
router.delete('/stripe/subscription/:userId', async (req: Request, res: Response) => {
  const stripe = getStripeInstance();
  
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe not configured' });
  }
  
  const { userId } = req.params;
  
  try {
    await stripe.cancelSubscription(userId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[API] Cancel subscription error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/stripe/portal
 * Get customer portal URL
 */
router.post('/stripe/portal', async (req: Request, res: Response) => {
  const stripe = getStripeInstance();
  
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe not configured' });
  }
  
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  
  try {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const url = await stripe.createCustomerPortalSession(userId, `${baseUrl}/rooz`);
    res.json({ url });
  } catch (error: any) {
    console.error('[API] Portal session error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/stripe/stats
 * Get subscription statistics
 */
router.get('/stripe/stats', async (req: Request, res: Response) => {
  const stripe = getStripeInstance();
  
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe not configured' });
  }
  
  try {
    const stats = stripe.getStatistics();
    res.json(stats);
  } catch (error: any) {
    console.error('[API] Stripe stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Slop Detection Endpoints
// ============================================================================

/**
 * GET /api/slop/dashboard
 * Get slop detection dashboard
 */
router.get('/slop/dashboard', (req: Request, res: Response) => {
  const slopDetection = getSlopDetectionInstance();
  
  if (!slopDetection) {
    return res.status(503).json({ error: 'Slop detection not initialized' });
  }
  
  try {
    const dashboard = slopDetection.getDashboard();
    res.json(dashboard);
  } catch (error: any) {
    console.error('[API] Slop dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/slop/metrics
 * Get all slop metrics
 */
router.get('/slop/metrics', (req: Request, res: Response) => {
  const slopDetection = getSlopDetectionInstance();
  
  if (!slopDetection) {
    return res.status(503).json({ error: 'Slop detection not initialized' });
  }
  
  const { type, severity } = req.query;
  
  try {
    let metrics;
    
    if (type) {
      metrics = slopDetection.getMetricsByType(type as any);
    } else if (severity) {
      metrics = slopDetection.getMetricsBySeverity(severity as any);
    } else {
      metrics = slopDetection.exportMetrics();
    }
    
    res.json({ metrics, count: metrics.length });
  } catch (error: any) {
    console.error('[API] Slop metrics error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/slop/metrics/:id/resolve
 * Resolve a slop metric
 */
router.post('/slop/metrics/:id/resolve', (req: Request, res: Response) => {
  const slopDetection = getSlopDetectionInstance();
  
  if (!slopDetection) {
    return res.status(503).json({ error: 'Slop detection not initialized' });
  }
  
  const { id } = req.params;
  
  try {
    slopDetection.resolveMetric(id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[API] Resolve metric error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/slop/metrics/:id/false-positive
 * Mark metric as false positive
 */
router.post('/slop/metrics/:id/false-positive', (req: Request, res: Response) => {
  const slopDetection = getSlopDetectionInstance();
  
  if (!slopDetection) {
    return res.status(503).json({ error: 'Slop detection not initialized' });
  }
  
  const { id } = req.params;
  
  try {
    slopDetection.markAsFalsePositive(id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[API] Mark false positive error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/slop/false-positive-rate
 * Get false positive rate
 */
router.get('/slop/false-positive-rate', (req: Request, res: Response) => {
  const slopDetection = getSlopDetectionInstance();
  
  if (!slopDetection) {
    return res.status(503).json({ error: 'Slop detection not initialized' });
  }
  
  try {
    const rate = slopDetection.getFalsePositiveRate();
    const acceptable = slopDetection.isFalsePositiveRateAcceptable();
    
    res.json({
      rate,
      ratePercentage: (rate * 100).toFixed(2) + '%',
      acceptable,
      threshold: 0.05
    });
  } catch (error: any) {
    console.error('[API] False positive rate error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/slop/metrics/old
 * Clear old resolved metrics
 */
router.delete('/slop/metrics/old', (req: Request, res: Response) => {
  const slopDetection = getSlopDetectionInstance();
  
  if (!slopDetection) {
    return res.status(503).json({ error: 'Slop detection not initialized' });
  }
  
  const { days = 30 } = req.query;
  
  try {
    const cleared = slopDetection.clearOldMetrics(Number(days));
    res.json({ success: true, cleared });
  } catch (error: any) {
    console.error('[API] Clear old metrics error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
