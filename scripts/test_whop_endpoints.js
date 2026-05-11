require('dotenv').config();

async function testEndpoints() {
    const key = process.env.WHOP_DEV_API_KEY;
    console.log("Using key:", key.substring(0, 10) + "...");

    const endpoints = [
        { url: "https://api.whop.com/api/v2/companies/biz_WKmNzKeXAiu2ks", method: "GET" },
        { url: "https://api.whop.com/api/v2/companies/biz_WKmNzKeXAiu2ks/products", method: "GET" },
        { url: "https://api.whop.com/api/v3/company", method: "GET" }
    ];

    for (const ep of endpoints) {
        console.log(`\nTesting ${ep.method} ${ep.url}...`);
        const options = {
            method: ep.method,
            headers: {
                'Authorization': `Bearer ${key}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        };
        if (ep.body) options.body = JSON.stringify(ep.body);

        try {
            const res = await fetch(ep.url, options);
            console.log(`Status: ${res.status} ${res.statusText}`);
            const text = await res.text();
            console.log(`Body: ${text.substring(0, 200)}`);
        } catch (e) {
            console.error("Error:", e.message);
        }
    }
}

testEndpoints();
