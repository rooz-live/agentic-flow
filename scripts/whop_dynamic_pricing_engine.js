require('dotenv').config();
const fs = require('fs');
const path = require('path');

const WHOP_API_KEY = process.env.WHOP_DEV_API_KEY;

// Market Dynamics Harness (Simulated MCP for Iterative Recalibration)
const DYNAMIC_FACTORS = {
    demandMultiplier: 1.15, // 15% increase based on platform velocity
    networkLoadPenalty: 1.05, // 5% increase for SLA maintenance
    baseProfitMargin: 1.20 // Minimum sustainable profitability
};

async function executeDynamicPricing() {
    console.log("📈 Initiating Swarm Dynamic Pricing Harness...");
    console.log(`Evaluating factors: Demand (x${DYNAMIC_FACTORS.demandMultiplier}), Load (x${DYNAMIC_FACTORS.networkLoadPenalty})`);
    
    try {
        const response = await fetch(`https://api.whop.com/api/v2/products`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${WHOP_API_KEY}`, 'Accept': 'application/json' }
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
                        headers: { 'Authorization': `Bearer ${WHOP_API_KEY}`, 'Accept': 'application/json' }
                    });
                    
                    if (planRes.ok) {
                        const planData = await planRes.json();
                        
                        // Recalibrate Pricing based on Dynamic Factors
                        const basePriceCent = planData.initial_price || 0;
                        
                        let dynamicPriceCent = basePriceCent;
                        if (basePriceCent > 0) {
                            dynamicPriceCent = Math.round(
                                basePriceCent * 
                                DYNAMIC_FACTORS.demandMultiplier * 
                                DYNAMIC_FACTORS.networkLoadPenalty * 
                                DYNAMIC_FACTORS.baseProfitMargin
                            );
                        }
                        
                        const newPriceFormatted = dynamicPriceCent > 0 ? `$${(dynamicPriceCent / 100).toFixed(2)}` : 'Free';
                        const oldPriceFormatted = basePriceCent > 0 ? `$${(basePriceCent / 100).toFixed(2)}` : 'Free';

                        console.log(`[MCP] Recalibrated ${planData.name} (${planId}) | Old: ${oldPriceFormatted} -> New Dynamic: ${newPriceFormatted}`);

                        // TODO: Implement PATCH request to Whop API once physical approval is given
                        // await fetch(`https://api.whop.com/api/v2/plans/${planId}`, {
                        //     method: 'PATCH',
                        //     headers: { 'Authorization': `Bearer ${WHOP_API_KEY}`, 'Content-Type': 'application/json' },
                        //     body: JSON.stringify({ initial_price: dynamicPriceCent })
                        // });

                        exportData.push({
                            productId: product.id,
                            productName: product.name,
                            planId: planData.id,
                            planName: planData.name,
                            basePrice: oldPriceFormatted,
                            dynamicPrice: newPriceFormatted, // Feed dynamic price to UI
                            billingPeriod: planData.billing_period || 'One-time',
                            checkoutUrl: `https://whop.com/checkout/plan_${planData.id}/`
                        });
                    }
                }
            }
        }

        const targetDir = path.join(__dirname, '../swarm-core-app/src/data');
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        
        fs.writeFileSync(path.join(targetDir, 'whop_dynamic_pricing.json'), JSON.stringify(exportData, null, 2));
        console.log("✅ Dynamic Pricing Harness completed. Data staged to swarm-core-app/src/data/whop_dynamic_pricing.json");

    } catch (err) {
        console.error("Network Error:", err);
    }
}

executeDynamicPricing();
