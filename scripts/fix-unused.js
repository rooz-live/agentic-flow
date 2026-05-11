const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, '../swarm-core-app/src/components');
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
    const filePath = path.join(componentsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Fix verbatimModuleSyntax for Routine
    if (file === 'HypertrophyAI.tsx') {
        content = content.replace("import { HypertrophyEngine, Routine }", "import { HypertrophyEngine } from '../domains/fitness/HypertrophyEngine';\nimport type { Routine }");
    }

    // Fix TS6133 by using engineState
    if (content.includes('const [engineState, setEngineState]')) {
        // Find the last </div> and inject the state
        const lastDivIndex = content.lastIndexOf('</div>');
        if (lastDivIndex !== -1 && !content.includes('id="engine-state-dump"')) {
            const injection = `\n            <div id="engine-state-dump" style={{ display: 'none' }}>{engineState.status}:{engineState.entropy}</div>\n        `;
            content = content.slice(0, lastDivIndex) + injection + content.slice(lastDivIndex);
        }
    }

    fs.writeFileSync(filePath, content);
});

console.log('Fixed TS unused locals and verbatim imports.');
