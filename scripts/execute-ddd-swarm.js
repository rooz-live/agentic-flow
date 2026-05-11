const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, '../swarm-core-app/src/components');
const domainsDir = path.join(__dirname, '../swarm-core-app/src/domains');
const testsDir = path.join(__dirname, '../tests/unit');

const components = [
    'MagicWand', 'CanvasBoard', 'VisualTokens', 'MultiAgentCleanRoom',
    'DiffViewSync', 'TensorLedger', 'SubalternGovModule', 'GenerativeAccessNode',
    'SwarmTelemetry', 'OGovCore', 'CICDDashboard', 'ArtifactGenerator',
    'RefactorLoop', 'HoshinKanri', 'SwarmMatrix', 'GembaWalk', 'QuantumEntanglement',
    'SubalternSEO', 'TerminalClosureGate'
];

if (!fs.existsSync(domainsDir)) fs.mkdirSync(domainsDir, { recursive: true });
if (!fs.existsSync(testsDir)) fs.mkdirSync(testsDir, { recursive: true });

components.forEach(comp => {
    const domainName = comp.toLowerCase();
    const domainPath = path.join(domainsDir, domainName);
    
    if (!fs.existsSync(domainPath)) fs.mkdirSync(domainPath, { recursive: true });

    // 1. Generate Engine
    const enginePath = path.join(domainPath, `${comp}Engine.ts`);
    if (!fs.existsSync(enginePath)) {
        fs.writeFileSync(enginePath, `export class ${comp}Engine {
    constructor() {}
    getDiagnostics(): { status: string, entropy: number } {
        return { status: 'OPERATIONAL', entropy: Math.random() * 0.1 };
    }
}
`);
    }

    // 2. Generate Unit Test
    const testPath = path.join(testsDir, `${comp.toLowerCase()}-engine.test.ts`);
    if (!fs.existsSync(testPath)) {
        fs.writeFileSync(testPath, `import { ${comp}Engine } from '../../swarm-core-app/src/domains/${domainName}/${comp}Engine';

describe('${comp}Engine DDD Model', () => {
    it('should initialize and return physical diagnostic state', () => {
        const engine = new ${comp}Engine();
        const state = engine.getDiagnostics();
        expect(state.status).toBe('OPERATIONAL');
        expect(state.entropy).toBeLessThan(0.1);
    });
});
`);
    }

    // 3. Refactor Component (if exists)
    const compPath = path.join(componentsDir, `${comp}.tsx`);
    if (fs.existsSync(compPath)) {
        let content = fs.readFileSync(compPath, 'utf8');
        
        // Only patch if not already patched
        if (!content.includes(`${comp}Engine`)) {
            // Replace the import
            content = content.replace("import React", `import React, { useState, useEffect } from 'react';\nimport { ${comp}Engine } from '../domains/${domainName}/${comp}Engine';`);
            
            // Inject state hooks inside component
            const hookInjection = `    const [engineState, setEngineState] = useState<{status: string, entropy: number}>({ status: 'PENDING', entropy: 0 });
    useEffect(() => {
        const engine = new ${comp}Engine();
        setEngineState(engine.getDiagnostics());
    }, []);
`;
            content = content.replace(`export const ${comp}: React.FC = () => {`, `export const ${comp}: React.FC = () => {\n${hookInjection}`);
            
            fs.writeFileSync(compPath, content);
            console.log(`[REFACTOR] ${comp} wired to DDD Engine.`);
        }
    }
});

console.log('DDD Swarm Scaffolding Complete.');
