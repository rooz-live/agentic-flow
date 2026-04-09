/**
 * ════════════════════════════════════════════════════════════════════════════
 * rooz.yo.life Subscription System API Routes
 * Private coop for classes, events, and sports ROAM exposure
 * Endpoints: /api/rooz/*
 * ════════════════════════════════════════════════════════════════════════════
 */

import { Router, Request, Response } from 'express';
import { AgentDB } from '../../core/agentdb-client.js';

const router = Router();
const agentDB = new AgentDB();

// ════════════════════════════════════════════════════════════════════════════
// GET /api/rooz/subscriptions - List all subscriptions
// ════════════════════════════════════════════════════════════════════════════

router.get('/rooz/subscriptions', async (req: Request, res: Response) => {
  try {
    const { userId, status, type } = req.query;
    
    let query = 'SELECT * FROM rooz_subscriptions WHERE 1=1';
    const params: any[] = [];
    
    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    if (type) {
      query += ' AND subscription_type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const subscriptions = await agentDB.query(query, params);
    
    res.json({
      success: true,
      subscriptions,
      count: subscriptions.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/rooz/subscriptions - Create new subscription
// ════════════════════════════════════════════════════════════════════════════

router.post('/rooz/subscriptions', async (req: Request, res: Response) => {
  try {
    const { userId, subscriptionType, planId, metadata } = req.body;
    
    if (!userId || !subscriptionType || !planId) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, subscriptionType, planId' 
      });
    }
    
    // Insert subscription
    const result = await agentDB.query(
      `INSERT INTO rooz_subscriptions (user_id, subscription_type, plan_id, status, metadata, created_at, updated_at)
       VALUES (?, ?, ?, 'active', ?, datetime('now'), datetime('now'))`,
      [userId, subscriptionType, planId, JSON.stringify(metadata || {})]
    );
    
    // Fetch created subscription
    const subscription = await agentDB.query(
      'SELECT * FROM rooz_subscriptions WHERE rowid = ?',
      [result[0]?.lastInsertRowid]
    );
    
    res.status(201).json({
      success: true,
      subscription: subscription[0],
      message: `Subscription created for ${subscriptionType}`
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/rooz/events - List events (classes, sports, workshops)
// ════════════════════════════════════════════════════════════════════════════

router.get('/rooz/events', async (req: Request, res: Response) => {
  try {
    const { type, status, upcoming } = req.query;
    
    let query = 'SELECT * FROM rooz_events WHERE 1=1';
    const params: any[] = [];
    
    if (type) {
      query += ' AND event_type = ?';
      params.push(type);
    }
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    if (upcoming === 'true') {
      query += ' AND event_date >= datetime(\'now\')';
    }
    
    query += ' ORDER BY event_date ASC';
    
    const events = await agentDB.query(query, params);
    
    res.json({
      success: true,
      events,
      count: events.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/rooz/events - Create new event
// ════════════════════════════════════════════════════════════════════════════

router.post('/rooz/events', async (req: Request, res: Response) => {
  try {
    const { title, eventType, eventDate, location, capacity, description, metadata } = req.body;
    
    if (!title || !eventType || !eventDate) {
      return res.status(400).json({ 
        error: 'Missing required fields: title, eventType, eventDate' 
      });
    }
    
    const result = await agentDB.query(
      `INSERT INTO rooz_events (title, event_type, event_date, location, capacity, registered, status, description, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, 0, 'scheduled', ?, ?, datetime('now'))`,
      [title, eventType, eventDate, location || 'TBD', capacity || 100, description || '', JSON.stringify(metadata || {})]
    );
    
    const event = await agentDB.query(
      'SELECT * FROM rooz_events WHERE rowid = ?',
      [result[0]?.lastInsertRowid]
    );
    
    res.status(201).json({
      success: true,
      event: event[0],
      message: `Event "${title}" created`
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/rooz/events/:eventId/register - Register for event
// ════════════════════════════════════════════════════════════════════════════

router.post('/rooz/events/:eventId/register', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { userId, metadata } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }
    
    // Check event capacity
    const event = await agentDB.query(
      'SELECT capacity, registered FROM rooz_events WHERE id = ?',
      [eventId]
    );
    
    if (!event[0]) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    if (event[0].registered >= event[0].capacity) {
      return res.status(409).json({ error: 'Event is full' });
    }
    
    // Register user
    await agentDB.query(
      `INSERT INTO rooz_registrations (event_id, user_id, status, metadata, registered_at)
       VALUES (?, ?, 'confirmed', ?, datetime('now'))`,
      [eventId, userId, JSON.stringify(metadata || {})]
    );
    
    // Increment registered count
    await agentDB.query(
      'UPDATE rooz_events SET registered = registered + 1 WHERE id = ?',
      [eventId]
    );
    
    res.json({
      success: true,
      message: 'Registration successful',
      eventId,
      userId
    });
  } catch (error) {
    console.error('Error registering for event:', error);
    res.status(500).json({ error: 'Failed to register for event' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/rooz/roam-graph - ROAM ontology graph visualization data
// ════════════════════════════════════════════════════════════════════════════

router.get('/rooz/roam-graph', async (req: Request, res: Response) => {
  try {
    const { userId, dimension } = req.query;
    
    // Fetch user's ROAM graph nodes
    let query = 'SELECT * FROM rooz_roam_nodes WHERE 1=1';
    const params: any[] = [];
    
    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }
    
    if (dimension) {
      query += ' AND dimension = ?';
      params.push(dimension);
    }
    
    const nodes = await agentDB.query(query, params);
    
    // Fetch edges
    const edges = await agentDB.query(
      'SELECT * FROM rooz_roam_edges WHERE source_id IN (SELECT id FROM rooz_roam_nodes WHERE user_id = ?)',
      [userId || 'default']
    );
    
    res.json({
      success: true,
      graph: {
        nodes,
        edges
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching ROAM graph:', error);
    res.status(500).json({ error: 'Failed to fetch ROAM graph' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/rooz/circles - Circle participation dashboard
// ════════════════════════════════════════════════════════════════════════════

router.get('/rooz/circles', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    
    // Fetch user's circle participation
    const participation = await agentDB.query(
      `SELECT circle, COUNT(*) as event_count, SUM(duration_minutes) as total_minutes
       FROM rooz_registrations r
       JOIN rooz_events e ON r.event_id = e.id
       WHERE r.user_id = ? AND r.status = 'confirmed'
       GROUP BY e.metadata->>'$.circle'`,
      [userId || 'default']
    );
    
    res.json({
      success: true,
      circles: participation,
      totalEvents: participation.reduce((sum: number, c: any) => sum + c.event_count, 0),
      totalMinutes: participation.reduce((sum: number, c: any) => sum + (c.total_minutes || 0), 0),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching circle participation:', error);
    res.status(500).json({ error: 'Failed to fetch circle participation' });
  }
});

export default router;
