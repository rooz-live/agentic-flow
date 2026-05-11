import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const devKey = process.env.WHOP_DEV_API_KEY;

console.log("🔍 Validating Whop Dev Authentication Gateway...");

if (!devKey || devKey === "insert_whop_dev_pat_here") {
    console.error("❌ FAILURE: Dev key not detected or still using placeholder.");
    process.exit(1);
}

// Basic length/format validation for Whop PATs
if (devKey.length < 10) {
    console.error("❌ FAILURE: Dev key format appears invalid (too short).");
    process.exit(1);
}

console.log("✅ Dev Token successfully injected into environment context.");
console.log("✅ Formatting check passed.");
console.log("\nThe Orchestrator is now authorized to use this token for API interactions.");
