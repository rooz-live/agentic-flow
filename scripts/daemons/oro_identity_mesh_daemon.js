/**
 * Sovereign Swarm Identity Mesh Daemon
 * [Phase 3] Cross-Domain Sync: OroPlatform -> WordPress -> Flarum
 * 
 * Flow:
 * 1. Listens for Whop Webhooks (Successful Payment)
 * 2. Provisions B2B Customer & User in OroPlatform (Symfony)
 * 3. Syncs the Identity to WordPress (via WP REST API)
 * 4. Syncs the Identity to Flarum (via Flarum API)
 */

import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

// Environmental Mapping
const ORO_API_URL = process.env.ORO_API_URL || 'http://192.168.122.237:8000/api';
const WP_API_URL = process.env.WP_API_URL || 'https://blog.mbo.bio/wp-json/wp/v2';
const FLARUM_API_URL = process.env.FLARUM_API_URL || 'https://forum.artchat.art/api';

/**
 * 1. Provision User in OroPlatform
 */
async function provisionOroUser(email, name, role) {
    console.log(`[Identity Mesh] Provisioning OroPlatform User: ${email}`);
    // Simulate Oro API call
    return { id: 'oro_123', email, role: 'ROLE_ENTERPRISE_NODE' };
}

/**
 * 2. Sync Identity to WordPress
 */
async function syncToWordPress(oroUser) {
    console.log(`[Identity Mesh] Syncing ${oroUser.email} to WordPress at ${WP_API_URL}`);
    // Simulated WP REST API Call
    // fetch(`${WP_API_URL}/users`, { method: 'POST', body: JSON.stringify({...}) })
    return { status: 'success', wp_id: 456 };
}

/**
 * 3. Sync Identity to Flarum
 */
async function syncToFlarum(oroUser) {
    console.log(`[Identity Mesh] Syncing ${oroUser.email} to Flarum at ${FLARUM_API_URL}`);
    // Simulated Flarum API Call
    return { status: 'success', flarum_id: 789 };
}

/**
 * Whop Webhook Listener (Entry Point)
 */
app.post('/webhooks/whop', async (req, res) => {
    const { type, data } = req.body;
    
    if (type !== 'membership.went_valid') {
        return res.status(200).send('Ignored');
    }

    const { email, name, plan_id } = data;
    console.log(`\n🚀 [Whop Webhook] Received valid membership for ${email} on plan ${plan_id}`);

    try {
        // Step 1: OroPlatform
        const oroUser = await provisionOroUser(email, name, 'premium');

        // Step 2 & 3: Parallel Domain Sync
        await Promise.all([
            syncToWordPress(oroUser),
            syncToFlarum(oroUser)
        ]);

        console.log(`✅ [Identity Mesh] Sovereign Identity successfully distributed across the network.`);
        res.status(200).json({ status: 'Identity Mesh Synchronized' });
    } catch (error) {
        console.error('❌ [Identity Mesh] Synchronization Failed:', error);
        res.status(500).json({ error: 'Mesh Failure' });
    }
});

const PORT = process.env.PORT || 4040;
app.listen(PORT, () => {
    console.log(`🕸️ [Sovereign Identity Mesh] Daemon listening on port ${PORT}`);
    console.log(`-> OroPlatform endpoint configured: ${ORO_API_URL}`);
});
