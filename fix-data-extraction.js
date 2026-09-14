const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'apps/web/src/components/pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

// The fix pattern: wrap d.data access to handle {success, data: {data: [...]}} nesting
// Helper function to add to each file that uses raw fetch

let totalFixed = 0;

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Pattern 1: .then(d => setX(d.data || d.something || []))
  // Replace with safe extraction
  content = content.replace(
    /\.then\((\w+) => set(\w+)\(\1\.data\b/g,
    (match, d, name) => `.then(${d} => { const _d=${d}?.data; set${name}(Array.isArray(_d)?_d:Array.isArray(_d?.data)?_d.data:[]); }`
  );

  // Pattern 2: .then(d => { ... d.data || [] ... })
  // This is harder - skip complex ones and handle them manually

  // Pattern 3: setData(d.data || d) — generic fallback
  content = content.replace(
    /set(\w+)\((\w+)\.data \|\| \2\)/g,
    (match, name, d) => `set${name}(${d}?.data?.data ?? ${d}?.data ?? ${d})`
  );

  // Pattern 4: setData(d.data || d.something || [])
  content = content.replace(
    /set(\w+)\((\w+)\.data \|\| \2\.(\w+) \|\| \[\]\)/g,
    (match, name, d, field) => {
      return `set${name}(Array.isArray(${d}?.data) ? ${d}.data : Array.isArray(${d}?.data?.data) ? ${d}.data.data : [])`;
    }
  );

  // Pattern 5: .then(d => { ... const list = Array.isArray(d) ? d : d.data || []; ... })
  content = content.replace(
    /const (\w+) = Array\.isArray\((\w+)\) \? \2 : \2\.data \|\| \[\]/g,
    (match, varName, d) => `const ${varName} = Array.isArray(${d}) ? ${d} : Array.isArray(${d}?.data) ? ${d}.data : Array.isArray(${d}?.data?.data) ? ${d}.data.data : []`
  );

  // Pattern 6: setX(d.data?.something || d.data || [])
  content = content.replace(
    /set(\w+)\((\w+)\.data\?\.(\w+) \|\| \2\.data \|\| \[\]\)/g,
    (match, name, d, field) => {
      return `set${name}(Array.isArray(${d}?.data) ? ${d}.data : Array.isArray(${d}?.data?.data) ? ${d}.data.data : [])`;
    }
  );

  // Pattern 7: setX(d.data?.data || d.data || [])
  content = content.replace(
    /set(\w+)\((\w+)\.data\?\.data \|\| \2\.data \|\| \[\]\)/g,
    (match, name, d) => {
      return `set${name}(Array.isArray(${d}?.data?.data) ? ${d}.data.data : Array.isArray(${d}?.data) ? ${d}.data : [])`;
    }
  );

  // Pattern 8: async/await setData(d.data || [])
  content = content.replace(
    /set(\w+)\((\w+)\.data \|\| \[\]\)/g,
    (match, name, d) => {
      return `set${name}(Array.isArray(${d}?.data) ? ${d}.data : Array.isArray(${d}?.data?.data) ? ${d}.data.data : [])`;
    }
  );

  // Pattern 9: setData(d.data || d)
  content = content.replace(
    /set(\w+)\((\w+)\.data \|\| \2\b(?!\.)/g,
    (match, name, d) => {
      return `set${name}(${d}?.data?.data ?? ${d}?.data ?? ${d})`;
    }
  );

  // Pattern 10: d.data?.drivers || d.drivers || d.data || []
  content = content.replace(
    /set(\w+)\((\w+)\.data\?\.(\w+) \|\| \2\.(\w+) \|\| \2\.data \|\| \[\]\)/g,
    (match, name, d, f1, f2) => {
      return `set${name}(Array.isArray(${d}?.data) ? ${d}.data : Array.isArray(${d}?.data?.data) ? ${d}.data.data : [])`;
    }
  );

  // Pattern 11: data.data || data (async/await)
  content = content.replace(
    /set(\w+)\((\w+)\.data \|\| \2(?!\.data)/g,
    (match, name, d) => {
      return `set${name}(${d}?.data?.data ?? ${d}?.data ?? ${d})`;
    }
  );

  // Pattern 12: .then(d => setData(d.data || d))  — simple single arg
  content = content.replace(
    /\.then\((\w+) => set(\w+)\(\1\.data \|\| \1\)\)/g,
    (match, d, name) => `.then(${d} => { const _d=${d}?.data; set${name>(_d?.data !== undefined ? _d.data : _d ?? ${d}); })`
  );

  // Pattern 13: .then(d => setX(d.data || d.field || [])) for single-line arrows
  content = content.replace(
    /\.then\((\w+) => set(\w+)\(\1\.data \|\| \1\.(\w+) \|\| \[\]\)\)/g,
    (match, d, name, field) => `.then(${d} => { const _d=${d}?.data; set${name}(Array.isArray(_d)?_d:Array.isArray(_d?.data)?_d.data:[]); })`
  );

  // Pattern 14: setX(d.data?.data || d.data) for async/await (no array)
  content = content.replace(
    /set(\w+)\((\w+)\.data\?\.data \|\| \2\.data\b(?!\))/g,
    (match, name, d) => {
      return `set${name}(${d}?.data?.data ?? ${d}?.data)`;
    }
  );

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalFixed++;
    console.log(`Fixed: ${file}`);
  }
}

console.log(`\nTotal files modified: ${totalFixed}`);
