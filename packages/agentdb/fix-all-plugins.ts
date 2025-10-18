import * as fs from 'fs';
import * as path from 'path';

const PLUGINS_DIR = path.join(__dirname, 'src/plugins/implementations');

const fixes = [
  // Fix implicit any types
  { pattern: /\.map\(x =>/g, replacement: '.map((x: number) =>' },
  { pattern: /\.map\(wi =>/g, replacement: '.map((wi: number) =>' },
  { pattern: /\.map\(a =>/g, replacement: '.map((a: any) =>' },
  { pattern: /\.map\(b =>/g, replacement: '.map((b: any) =>' },
  { pattern: /\.reduce\(sum =>/g, replacement: '.reduce((sum: number) =>' },
  { pattern: /, i\)/g, replacement: ', (i: number))' },
  
  // Fix selectAction return types
  { pattern: /id: (\d+),\s*type:/g, replacement: "id: '$1',\n      embedding: stateArray,\n      type:" },
  { pattern: /id: actionId,/g, replacement: "id: String(actionId)," },
  
  // Fix retrieveSimilar return types  
  { pattern: /async retrieveSimilar\(state: Vector, limit: number\): Promise<Experience\[\]>/g, 
    replacement: 'async retrieveSimilar(state: number[], k: number): Promise<import(\'../..\').SearchResult<Experience>[]>' },
];

const files = fs.readdirSync(PLUGINS_DIR).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(PLUGINS_DIR, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  let modified = false;
  fixes.forEach(fix => {
    if (fix.pattern.test(content)) {
      content = content.replace(fix.pattern, fix.replacement);
      modified = true;
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed ${file}`);
  }
});

console.log('✅ All plugins fixed');
