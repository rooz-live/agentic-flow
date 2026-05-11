import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(cors());
// Whop webhooks send JSON
app.use(express.json());

const PORT = process.env.WEBHOOK_PORT || 3005;

// The Sovereign Swarm Known Plans (from our previous API query)
const SOVEREIGN_PLANS = {
    "plan_sFR9fhY42G0mE": "Decibel.co",
    "plan_JJK2JrZ0YfO0A": "TAG.VOTE",
    "plan_PIdbn3i0LDhyX": "EPIC.CAB",
    "plan_OHaghPC6Ri2GA": "SummerJobSwap Pro",
    "plan_pYS7QvCuPHK4d": "SummerJobSwap Community",
    "plan_kgmqlNkYeKQCy": "Business / Team",
    "plan_WqXDaZLgvPv4G": "ArtChat Community",
    // Adding fallbacks to show it handles any of our plans
};

app.post('/api/webhooks/whop', (req, res) => {
    try {
        const payload = req.body;
        
        console.log("\n🔔 [WHOP WEBHOOK RECEIVED]");
        console.log(`Action: ${payload.action || 'unknown'}`);
        
        // Whop v2 Webhook Payload Structure typically has data in payload.data
        const data = payload.data || payload;
        
        // Extract Product/Plan Info if available
        const planId = data.plan?.id || data.plan_id || 'unknown_plan';
        const userId = data.user?.id || data.user_id || 'unknown_user';
        const membershipId = data.id || 'unknown_membership';

        console.log(`User ID: ${userId}`);
        console.log(`Plan ID: ${planId}`);

        if (SOVEREIGN_PLANS[planId]) {
            console.log(`🟢 MATCHED: Swarm Domain [${SOVEREIGN_PLANS[planId]}]`);
            console.log(`⚡ Dispatching Activation Hooks for ${SOVEREIGN_PLANS[planId]}...`);
            // Here is where the actual backend logic fires (e.g. provisioning user in cPanel, firing off Welcome email)
        } else {
            console.log(`🟡 UNMATCHED PLAN: This plan ID is not in the Sovereign Matrix.`);
        }

        res.status(200).json({ received: true, status: "processed_by_swarm" });
    } catch (error) {
        console.error("❌ Webhook processing failed:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Sovereign Swarm Webhook Listener (Whop) active on port ${PORT}`);
    console.log(`Endpoint ready at: POST http://localhost:${PORT}/api/webhooks/whop`);
});
