const https = require('https');
const tls = require('tls');
const dns = require('dns').promises;

async function traceDomain(domain) {
    console.log(`\n🔍 Tracing Domain: ${domain}`);
    try {
        const addresses = await dns.resolve4(domain);
        console.log(`📡 DNS Resolution: ${addresses.join(', ')}`);
        
        // Test TLS Handshake
        const options = {
            host: addresses[0],
            port: 443,
            servername: domain,
            rejectUnauthorized: false
        };

        return new Promise((resolve) => {
            const req = https.request(options, (res) => {
                const cert = res.socket.getPeerCertificate(true);
                console.log(`🔒 TLS Issuer: ${cert.issuer ? cert.issuer.CN : 'Unknown'}`);
                console.log(`📄 HTTP Status: ${res.statusCode}`);
                console.log(`🌐 Server Header: ${res.headers.server || 'None'}`);
                
                let body = '';
                res.on('data', d => body += d);
                res.on('end', () => {
                    if (res.statusCode === 404) {
                        console.log(`❌ 404 Body Signature: ${body.includes('nginx') ? 'Nginx Default 404' : 'Unknown'}`);
                    }
                    if ([301, 302].includes(res.statusCode)) {
                        console.log(`✅ Redirect Target: ${res.headers.location}`);
                    }
                    resolve();
                });
            });

            req.on('error', (e) => {
                console.log(`❌ Connection Error: ${e.message}`);
                resolve();
            });
            req.end();
        });
    } catch (e) {
        console.log(`❌ DNS Error: ${e.message}`);
    }
}

async function run() {
    await traceDomain('goodreadr.com');
    await traceDomain('cal.rooz.live');
    await traceDomain('rooz.live');
    await traceDomain('tag.vote');
}

run();
