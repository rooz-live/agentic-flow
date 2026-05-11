import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.integration') });

// Load Env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.integration') });

// STX Router (Jump Host)
const stxHost = process.env.YOLIFE_STX_HOST || '23.92.79.2';
const stxUser = 'ubuntu';
const stxPort = '2222';
const sshKey = process.env.YOLIFE_STX_KEY || '/Users/shahroozbhopti/pem/stx-aio-0.pem';

// KVM Metal (cPanel Destination via internal REST)
const kvmHost = '192.168.122.237';
const cpanelMasterPass = 'L_kg2rTsbb*9hDVvBC'; // Decrypted from 1Password vault

async function hydrateDomains() {
    console.log(`[ORCHESTRATOR] Initiating Domain REST Hydration Matrix across KVM ${kvmHost} (Proxied via STX: ${stxHost})...`);
    
    let mappingStr = process.env.CPANEL_USERS_MAPPING;
    if (!mappingStr) {
        console.error("❌ CPANEL_USERS_MAPPING not found in .env");
        process.exit(1);
    }
    
    // Clean up bash string wrapping if present
    mappingStr = mappingStr.replace(/^'|'$/g, '');
    const domains = JSON.parse(mappingStr);
    const domainKeys = Object.keys(domains);
    
    console.log(`[SEEKER] Found ${domainKeys.length} domains to hydrate. Processing...`);

    for (const domain of domainKeys) {
        const cpanelUser = domains[domain];
        const rootDomain = domain.includes('tag.vote') || domain.includes('amp.vote') ? domain : 'tag.ooo';
        const subdomain = domain.split('.')[0];
        
        console.log(`\n[ACTION] Hydrating ${domain} (Sub: ${subdomain}, Root: ${rootDomain}, Tenant: ${cpanelUser})...`);
        
        // Use STX to proxy an HTTP REST request to the isolated KVM cPanel port
        const cpanelApiUrl = `https://${kvmHost}:2083/execute/SubDomain/addsubdomain?domain=${subdomain}&rootdomain=${rootDomain}&dir=public_html/${subdomain}`;
        const curlPayload = `curl -s -u ${cpanelUser}:'${cpanelMasterPass}' '${cpanelApiUrl}' -k`;
        
        const sshCommand = `ssh -o StrictHostKeyChecking=no -o IdentitiesOnly=yes -o ConnectTimeout=15 -p ${stxPort} -i ${sshKey} ${stxUser}@${stxHost} "${curlPayload}"`;
        
        await new Promise((resolve) => {
            exec(sshCommand, (error, stdout, stderr) => {
                if (error) {
                    console.error(`❌ [FAILED] ${domain} Network Error: ${error.message.split('\n')[0]}`);
                } else {
                    try {
                        const response = JSON.parse(stdout);
                        if (response.status === 1) {
                            console.log(`✅ [SUCCESS] ${domain} physically provisioned via REST API.`);
                        } else {
                            console.error(`⚠️ [API ERROR] ${domain}: ${response.errors?.[0] || 'Unknown error'}`);
                        }
                    } catch (e) {
                        console.error(`❌ [PARSE ERROR] ${domain}: Could not parse API response.`);
                    }
                }
                resolve();
            });
        });
    }
    
    console.log("\n[PI SYNC] Domain Hydration Loop Complete. Subdomains are now pending Cloudflare TTL propagation.");
}

hydrateDomains();
