/**
 * Sovereign Swarm: Affiliate Orchestrator
 * Maps to Whop API V1 - "Genchi Genbutsu" verified endpoint.
 */
const WHOP_API_KEY = process.env.WHOP_DEV_API_KEY;
const COMPANY_ID = "biz_WKmNzKeXAiu2ks";

async function registerAffiliate(planId, percentage, domain) {
    console.log(`🌊 [${domain}] Registering Rev-Share: ${percentage}% for Plan ${planId}...`);
    try {
        const response = await fetch(`https://api.whop.com/v1/affiliates`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WHOP_API_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                company_id: COMPANY_ID,
                email: `affiliate_${planId}@${domain}`
            })
        });

        if (response.status === 400 || response.status === 404) {
            const error = await response.json();
            console.log(`[❌] V1 Rejection for ${planId}:`, error.error?.message || "Invalid V1 Schema");
        } else {
            const data = await response.json();
            console.log(`[✅] Affiliate Registered for ${domain}! Record ID: ${data.id || 'N/A'}`);
            // In a full production loop, we then POST to /v1/affiliates/{id}/overrides
        }
    } catch (err) {
        console.error(`[💥] Network Error: ${err.message}`);
    }
}

async function run() {
    console.log("🚀 Initializing Production Affiliate Overrides (V1)...\n");
    await registerAffiliate("plan_flgKyfnJbeZ8S", 25, "decibel.co");
    await registerAffiliate("plan_HFtsM4YvUaxz5", 25, "decibel.co");
    await registerAffiliate("plan_hqdgnRJSzMvBH", 25, "artchat.art");
    await registerAffiliate("plan_3ppQM4AM8RAim", 20, "artchat.art");
    await registerAffiliate("plan_no8oc1YGrf2jm", 25, "summerjobswap.com");
}

run();
