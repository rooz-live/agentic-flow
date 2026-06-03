import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

test.describe('Native App Registration Pipeline', () => {
    
    test('generate_native_app.sh correctly scaffolds iOS and Android bundles for App Store deployment', async ({}, testInfo) => {
        const TEST_DOMAIN = `summerjobswap-${testInfo.workerIndex}`;
        const APP_DIR = path.resolve(__dirname, `../../apps/${TEST_DOMAIN}`);
        
        // Clean up previous test runs
        if (fs.existsSync(APP_DIR)) {
            fs.rmSync(APP_DIR, { recursive: true, force: true });
        }
        
        // Execute the native app generator script
        const scriptPath = path.resolve(__dirname, '../../scripts/generate_native_app.sh');
        
        console.log(`Executing Native App Generator for ${TEST_DOMAIN}...`);
        
        try {
            execSync(`bash ${scriptPath} ${TEST_DOMAIN}`, { stdio: 'pipe' });
        } catch (error: any) {
            console.error(error.stdout?.toString());
            console.error(error.stderr?.toString());
            throw new Error('Native app generator script failed to execute.');
        }
        
        // TDD Validations
        expect(fs.existsSync(APP_DIR), `App directory ${APP_DIR} was not created`).toBeTruthy();
        
        // Validate Capacitor Config
        const capConfigPath = path.join(APP_DIR, 'capacitor.config.json');
        expect(fs.existsSync(capConfigPath), 'Capacitor config missing').toBeTruthy();
        
        const config = JSON.parse(fs.readFileSync(capConfigPath, 'utf8'));
        expect(config.appId).toBe(`com.sovereign.${TEST_DOMAIN}`);
        
        // Validate Native iOS Project exists (ready for Xcode/App Store Connect)
        expect(fs.existsSync(path.join(APP_DIR, 'ios/App/App.xcodeproj')), 'iOS Xcode project not generated').toBeTruthy();
        
        // Validate Native Android Project exists (ready for Android Studio/Google Play)
        expect(fs.existsSync(path.join(APP_DIR, 'android/app/src/main/AndroidManifest.xml')), 'Android Manifest not generated').toBeTruthy();
    });
});
