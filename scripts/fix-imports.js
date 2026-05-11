const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, '../swarm-core-app/src/components');
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
    const filePath = path.join(componentsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Fix issues like `from 'react';, { useState } from 'react';`
    content = content.replace(/';, \{.*\} from 'react';/g, "';");
    content = content.replace(/'; from 'react';/g, "';");

    fs.writeFileSync(filePath, content);
});

console.log('Fixed broken imports.');
