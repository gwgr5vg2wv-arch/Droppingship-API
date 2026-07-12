import fs from 'fs';
import path from 'path';

const roots = ['server', 'src', 'public/assets/js', 'test'];
const failures = [];

for (const file of walkFiles(roots)) {
  if (!file.endsWith('.js')) continue;
  const source = fs.readFileSync(file, 'utf8');
  const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);

  for (const specifier of imports) {
    if (!specifier.startsWith('.')) continue;
    const resolved = resolveImport(path.dirname(file), specifier);
    if (!resolved) failures.push(`${file} -> ${specifier}`);
  }
}

if (failures.length) {
  console.error('Imports quebrados encontrados:');
  failures.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}

console.log('Imports locais OK.');

function* walkFiles(entries) {
  for (const entry of entries) {
    if (!fs.existsSync(entry)) continue;
    const stat = fs.statSync(entry);
    if (stat.isFile()) {
      yield entry;
      continue;
    }
    for (const child of fs.readdirSync(entry)) {
      yield* walkFiles([path.join(entry, child)]);
    }
  }
}

function resolveImport(base, specifier) {
  const full = path.resolve(base, specifier);
  const candidates = [full, `${full}.js`, path.join(full, 'index.js')];
  return candidates.find((candidate) => fs.existsSync(candidate));
}
