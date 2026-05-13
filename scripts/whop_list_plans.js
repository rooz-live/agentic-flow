require('dotenv').config();
const WHOP_API_KEY = process.env.WHOP_DEV_API_KEY;
const COMPANY_ID = "biz_WKmNzKeXAiu2ks";

const fs = require('fs');
const path = require('path');

async function fetchCompanyPlans() {
    console.log("🔍 Authenticating with Whop API to fetch Plan details...");
    
    try {
        const response = await fetch(`https://api.whop.com/api/v2/products`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${WHOP_API_KEY}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            console.error("[❌] Failed to fetch. Ensure WHOP_DEV_API_KEY is valid.");
            return;
        }

        const data = await response.json();
        const exportData = [];

        for (const product of data.data || []) {
            if (product.plans && product.plans.length > 0) {
                for (const planId of product.plans) {
                    const planRes = await fetch(`https://api.whop.com/api/v2/plans/${planId}`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${WHOP_API_KEY}`,
                            'Accept': 'application/json'
                        }
                    });
                    if (planRes.ok) {
                        const planData = await planRes.json();
                        exportData.push({
                            productId: product.id,
                            productName: product.name,
                            planId: planData.id,
                            planName: planData.name,
                            price: planData.initial_price ? `$${parseFloat(planData.initial_price).toFixed(2)}` : 'Free',
                            billingPeriod: planData.billing_period || 'One-time',
                            checkoutUrl: planData.direct_link || `https://whop.com/checkout/${planData.id}`
                        });
                    }
                }
            }
        }

        const targetDir = path.join(__dirname, '../swarm-core-app/src/data');
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        
        fs.writeFileSync(path.join(targetDir, 'whop_products.json'), JSON.stringify(exportData, null, 2));
        console.log("✅ Synced physical Whop pricing to swarm-core-app/src/data/whop_products.json");

    } catch (err) {
        console.error("Network Error:", err);
    }
}

fetchCompanyPlans();
