const ftp = require("basic-ftp");

async function deploy() {
    const client = new ftp.Client();
    client.ftp.verbose = false;
    try {
        console.log("🚀 Connecting to cPanel FTP for mbo.bio...");
        await client.access({
            host: "yo.tag.ooo",
            user: "mbo",
            password: "evg-gjk9xbh6gzp*RNB",
            secure: false
        });
        console.log("✅ Authenticated as mbo.");
        
        await client.cd("public_html");
        console.log("🧹 Clearing old artifact...");
        await client.clearWorkingDir();
        
        console.log("📤 Uploading Sovereign Swarm payload (Marketable Budgetable Options)...");
        await client.uploadFromDir("/Users/shahroozbhopti/Documents/code/swarm-core-app/dist");
        
        console.log("🎉 DEPLOYMENT COMPLETE! MBO.BIO is now LIVE with the new Gen-UI payload.");
    } catch(err) {
        console.error("❌ Deployment failed:", err);
    }
    client.close();
}

deploy();
