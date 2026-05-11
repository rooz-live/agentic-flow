const ftp = require("basic-ftp");

async function deploy() {
    const client = new ftp.Client();
    client.ftp.verbose = false;
    try {
        console.log("🚀 Connecting to cPanel FTP...");
        await client.access({
            host: "yo.tag.ooo",
            user: "ogov",
            password: "pgr6KZD1ubh2dxj@rbx",
            secure: false
        });
        console.log("✅ Authenticated as ogov.");
        
        await client.cd("public_html");
        console.log("🧹 Clearing old artifact...");
        await client.clearWorkingDir();
        
        console.log("📤 Uploading Sovereign Swarm payload...");
        await client.uploadFromDir("/Users/shahroozbhopti/Documents/code/swarm-core-app/dist");
        
        console.log("🎉 DEPLOYMENT COMPLETE! The domains are now LIVE.");
    } catch(err) {
        console.error("❌ Deployment failed:", err);
    }
    client.close();
}

deploy();
