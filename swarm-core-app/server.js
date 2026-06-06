import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load physical infrastructure vault variables
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env.integration') });
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Physical Bridge to bash scripts for Sovereign Node provisioning
app.post('/api/provision', (req, res) => {
    const { subdomain } = req.body;

    if (!subdomain) {
        return res.status(400).json({ error: 'Subdomain is required.' });
    }

    console.log(`[MCP Harness] Received physical provision request for: ${subdomain}`);

    // Load secrets from STX / cPanel Vault
    const cpanelHost = process.env.YOLIFE_STX_HOST || '23.92.79.2';
    const cpanelUser = process.env.CPANEL_USER || 'ubuntu';
    const cpanelPort = process.env.YOLIFE_CPANEL_PORTS || process.env.CPANEL_PORT || '2222';
    const sshKey = process.env.YOLIFE_STX_KEY || '~/pem/stx-aio-0.pem';

    // Construct the UAPI command to execute on the STX KVM Metal
    // Assuming root domain is tag.ooo, but this can be dynamic later
    const uapiCommand = `uapi SubDomain addsubdomain domain=${subdomain} rootdomain=tag.ooo dir=public_html/${subdomain}`;
    
    // Construct the physical SSH execution sequence
    const sshCommand = `ssh -o StrictHostKeyChecking=no -p ${cpanelPort} -i ${sshKey} ${cpanelUser}@${cpanelHost} '${uapiCommand}'`;

    console.log(`[EXEC] Firing SSH sequence to STX KVM: ssh -p ${cpanelPort} -i ${sshKey} ${cpanelUser}@${cpanelHost} 'uapi ...'`);

    // Executing the physical WHM API script via Child Process to live metal
    exec(sshCommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`[EXEC ERROR] Physical SSH connection failed: ${error.message}`);
            return res.status(500).json({ error: error.message, details: stderr, command: sshCommand });
        }
        
        console.log(`[EXEC STDOUT] ${stdout}`);
        
        if (stderr) {
            console.warn(`[EXEC STDERR] ${stderr}`);
        }

        res.json({
            success: true,
            message: `SUCCESS: Physical UAPI execution completed on STX metal for ${subdomain}.`,
            output: stdout
        });
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// Cognitum affiliate redirect tracking
app.get('/cog', (req, res) => {
    console.log(`[Affiliate] Redirecting /cog click to cognitum affiliate destination`);
    res.redirect(302, 'https://cognitum.one/?ref=2rbzTT');
});

// Cognitum sales webhooks receiver
app.post('/webhooks/cognitum', (req, res) => {
    console.log(`[Webhook] Received cognitum event:`, JSON.stringify(req.body));
    const signature = req.headers['x-cognitum-signature'];
    const secret = process.env.COGNITUM_WEBHOOK_SECRET;

    if (secret && signature !== secret) {
        console.warn(`[Webhook] Signature verification failed`);
        return res.status(401).json({ error: 'Unauthorized signature' });
    }

    res.json({ success: true, message: 'Webhook received' });
});

app.listen(PORT, () => {
    console.log(`🚀 Sovereign Swarm Node.js Bridge active on port ${PORT}`);
});
