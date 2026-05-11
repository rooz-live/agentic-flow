require('dotenv').config();
const WHOP_API_KEY = process.env.WHOP_DEV_API_KEY;
const COMPANY_ID = "biz_WKmNzKeXAiu2ks";

async function fetchCompanyPlans() {
    console.log("🔍 Authenticating with Whop V5 API to fetch Plan IDs...");
    
    try {
        const response = await fetch(`https://api.whop.com/api/v2/products`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${WHOP_API_KEY}`,
                'Accept': 'application/json'
            }
        });

        console.log(`📡 HTTP Status: ${response.status}`);
        
        if (!response.ok) {
            console.error("[❌] Failed to fetch. Ensure WHOP_DEV_API_KEY is valid.");
            console.error(await response.text());
            return;
        }

        const data = await response.json();
        console.log("\n[✅] Live Products & Plan IDs found:");
        
        if (data.data && data.data.length > 0) {
            data.data.forEach(product => {
                console.log(`\n📦 Product: ${product.name} (ID: ${product.id})`);
                if (product.plans && product.plans.length > 0) {
                    product.plans.forEach(planId => {
                        console.log(`   └─ Plan ID: ${planId}`);
                    });
                } else {
                    console.log(`   └─ (No plans found for this product)`);
                }
            });
        } else {
            console.log("No products found in this company.");
            console.log(JSON.stringify(data, null, 2));
        }

    } catch (err) {
        console.error("Network Error:", err);
    }
}

fetchCompanyPlans();
