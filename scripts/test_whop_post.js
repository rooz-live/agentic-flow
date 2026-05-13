require('dotenv').config();
const fetch = require('node-fetch') || fetch; // fallback

async function test() {
    const res = await fetch('https://api.whop.com/api/v2/products', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.WHOP_DEV_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            name: "MBO Matrix Architecture",
            visibility: "hidden"
        })
    });
    console.log(res.status);
    console.log(await res.text());
}
test();
