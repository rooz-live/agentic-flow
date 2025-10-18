#!/usr/bin/env node
/**
 * Post-build script to rename ESM output files to .mjs and fix imports
 */
const fs = require('fs');
const path = require('path');

const distEsmDir = path.join(__dirname, '../dist-esm');
const distDir = path.join(__dirname, '../dist');

function fixImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix relative imports to use .mjs extension
  // Match: from './path' or from "../path" or from './path.js'
  content = content.replace(
    /(from\s+['"])(\.\.[/\w-]+(?:\.js)?|\.\/[/\w-]+(?:\.js)?)(['"])/g,
    (match, prefix, importPath, suffix) => {
      // Replace .js with .mjs or add .mjs if no extension
      if (importPath.endsWith('.js')) {
        return `${prefix}${importPath.slice(0, -3)}.mjs${suffix}`;
      } else if (importPath.endsWith('.mjs')) {
        return match;
      } else {
        return `${prefix}${importPath}.mjs${suffix}`;
      }
    }
  );

  fs.writeFileSync(filePath, content, 'utf8');
}

function renameJsToMjs(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`Directory ${dir} does not exist, skipping ESM rename`);
    return;
  }

  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(dir, file.name);

    if (file.isDirectory()) {
      renameJsToMjs(fullPath);
    } else if (file.name.endsWith('.js')) {
      const mjsPath = fullPath.replace(/\.js$/, '.mjs');
      fs.renameSync(fullPath, mjsPath);
      // Fix imports in the renamed file
      fixImports(mjsPath);
      console.log(`Converted ${fullPath} -> ${mjsPath}`);
    }
  }
}

// Copy entire dist-esm to dist preserving structure
function copyEsmToDist() {
  console.log('Copying ESM build to dist...');
  copyRecursive(distEsmDir, distDir);
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;

  const stats = fs.statSync(src);

  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const files = fs.readdirSync(src);
    for (const file of files) {
      copyRecursive(path.join(src, file), path.join(dest, file));
    }
  } else {
    // Only copy .mjs files and skip .js files (we have CommonJS versions)
    if (src.endsWith('.mjs')) {
      fs.copyFileSync(src, dest);
      console.log(`  Copied ${src.replace(distEsmDir, 'dist-esm')} -> ${dest.replace(distDir, 'dist')}`);
    }
  }
}

console.log('Converting ESM .js files to .mjs and fixing imports...');
renameJsToMjs(distEsmDir);
copyEsmToDist();
console.log('ESM build complete!');
