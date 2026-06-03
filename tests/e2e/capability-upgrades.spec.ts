import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const THEMES_PATH = path.resolve(__dirname, '../../config/domain_themes.json');

let domainThemes: any = {};
if (fs.existsSync(THEMES_PATH)) {
    domainThemes = JSON.parse(fs.readFileSync(THEMES_PATH, 'utf-8'));
}

test.describe('Incremental Post-Payment Capabilities', () => {
    
    for (const [domain, theme] of Object.entries(domainThemes)) {
        
        test(`Capabilities match theme for ${domain}`, async ({ page }) => {
            // In a real environment, we would navigate to the live sovereign domain
            // await page.goto(`https://${domain}`);
            
            // For now, we simulate capability validation based on the institutional retro
            const plans = (theme as any).plans;
            
            if (plans) {
                // Assert Basic capabilities
                if (plans.free) {
                    expect(plans.free.capabilities).toBeDefined();
                    expect(plans.free.capabilities.length).toBeGreaterThan(0);
                }
                
                // Assert Incremental upgrades (Creator/Summer Seeker)
                if (plans.creator) {
                    expect(plans.creator.price).not.toBe("$0");
                    expect(plans.creator.capabilities.length).toBeGreaterThan(0);
                    // The capabilities must reflect the upgrade from Free
                }
                
                // Assert Business/Institution capabilities
                if (plans.business) {
                    expect(plans.business.price).not.toBe("$0");
                    expect(plans.business.capabilities).toContainEqual(expect.stringMatching(/post|manage|unlimited|api/i));
                }
            }
        });
        
    }
    
});
