import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.integration') });

const stxHost = process.env.YOLIFE_STX_HOST || '23.92.79.2';
const stxUser = 'ubuntu';
const stxPort = '2222';
const sshKey = process.env.YOLIFE_STX_KEY || '/Users/shahroozbhopti/pem/stx-aio-0.pem';
const kvmHost = '192.168.122.237';
const cpanelMasterPass = 'L_kg2rTsbb*9hDVvBC';

const distPath = path.resolve(__dirname, '../swarm-core-app/dist');
const zipPath = path.resolve(__dirname, '../deploy.zip');

async function runCmd(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
            if (error) reject(error);
            else resolve(stdout.trim());
        });
    });
}

async function deploy() {
    console.log(`[ORCHESTRATOR] Packaging compiled Gen-UI Phase Gates for KVM Deployment...`);
    
    // 1. Zip the dist folder
    if (!fs.existsSync(distPath)) {
        console.error(`❌ Dist folder not found at ${distPath}. Run 'npm run build' first.`);
        process.exit(1);
    }
    
    try {
        await runCmd(`cd ${distPath} && zip -r ${zipPath} .`);
        console.log(`✅ Packaged dist to deploy.zip`);
    } catch (e) {
        console.error(`❌ Zip failed:`, e);
        process.exit(1);
    }

    // 2. SCP the zip file to the STX Jump Host
    console.log(`[NETWORK] Transferring deploy.zip to STX Router (${stxHost})...`);
    const scpCmd = `scp -o StrictHostKeyChecking=no -P ${stxPort} -i ${sshKey} ${zipPath} ${stxUser}@${stxHost}:/tmp/deploy.zip`;
    try {
        await runCmd(scpCmd);
        console.log(`✅ Payload cached on STX Router.`);
    } catch (e) {
        console.error(`❌ SCP failed:`, e);
        process.exit(1);
    }

    // 3. Extract mappings and push to each domain via cPanel API
    let mappingStr = process.env.CPANEL_USERS_MAPPING;
    mappingStr = mappingStr.replace(/^'|'$/g, '');
    const domains = JSON.parse(mappingStr);
    const domainKeys = Object.keys(domains);

    console.log(`[SEEKER] Initiating REST Multi-Tenant Deployment across ${domainKeys.length} domains...`);

    for (const domain of domainKeys) {
        const cpanelUser = domains[domain];
        console.log(`\n[ACTION] Deploying to ${domain} (Tenant: ${cpanelUser})...`);

        // Upload ZIP to public_html via Fileman API from STX
        const uploadUrl = `https://${kvmHost}:2083/execute/Fileman/upload_files`;
        const uploadCurl = `curl -s -u ${cpanelUser}:'${cpanelMasterPass}' -F "dir=public_html" -F "file-1=@/tmp/deploy.zip" '${uploadUrl}' -k`;
        
        // Extract ZIP via Fileman API from STX
        const extractUrl = `https://${kvmHost}:2083/json-api/cpanel?cpanel_jsonapi_apiversion=2&cpanel_jsonapi_module=Fileman&cpanel_jsonapi_func=fileop&op=extract&sourcefiles=public_html/deploy.zip&destfile=public_html/`;
        const extractCurl = `curl -s -u ${cpanelUser}:'${cpanelMasterPass}' '${extractUrl}' -k`;

        try {
            // Upload
            const uploadCmd = `ssh -o StrictHostKeyChecking=no -o IdentitiesOnly=yes -p ${stxPort} -i ${sshKey} ${stxUser}@${stxHost} "${uploadCurl}"`;
            const uploadOut = await runCmd(uploadCmd);
            const uploadRes = JSON.parse(uploadOut);
            if (uploadRes.status === 1) {
                console.log(`  └─ ✅ Uploaded deploy.zip securely.`);
            } else {
                console.error(`  └─ ❌ Upload Error: ${uploadRes.errors?.[0]}`);
                continue;
            }

            // Extract
            const extractCmd = `ssh -o StrictHostKeyChecking=no -o IdentitiesOnly=yes -p ${stxPort} -i ${sshKey} ${stxUser}@${stxHost} "${extractCurl}"`;
            const extractOut = await runCmd(extractCmd);
            const extractRes = JSON.parse(extractOut);
            if (extractRes.status === 1) {
                console.log(`  └─ ✅ Extracted Gen-UI Phase Gates into public_html.`);
            } else {
                console.error(`  └─ ❌ Extract Error: ${extractRes.errors?.[0]}`);
            }

        } catch (e) {
            console.error(`  └─ ❌ Network Error during proxy.`, e.message.split('\n')[0]);
        }
    }
    
    // Cleanup local zip
    if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
    }
    
    console.log("\n[PI SYNC] Deploy Pipeline Complete. The Gen-UI Multi-Agent Interfaces are now physically live on the domains.");
}

deploy();
