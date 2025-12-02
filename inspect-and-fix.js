const fs = require('fs');
const path = require('path');

const filePath = 'src\\components\\OrderAllotmentForm.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Log the section before replacement for inspection
const idx = content.indexOf('value={materialCost}');
if (idx > 0) {
  const section = content.substring(idx - 200, idx + 300);
  fs.writeFileSync('before-fix.txt', section, 'utf8');
}

// Try multiple replacement patterns - starting with simpler ones
let replaced = false;

// Pattern 1: with the exact whitespace
const pattern1 = `value={materialCost}
                        onChange={(e) => setMaterialCost(parseFloat(e.target.value) || 0)}`;

const replacement1 = `value={materialCost}
                        onChange={(e) => setMaterialCost(parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}`;

if (content.includes(pattern1)) {
  content = content.replace(new RegExp(pattern1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement1);
  replaced = true;
}

// Same for jobWorkCost
const pattern2 = `value={jobWorkCost}
                        onChange={(e) => setJobWorkCost(parseFloat(e.target.value) || 0)}`;

const replacement2 = `value={jobWorkCost}
                        onChange={(e) => setJobWorkCost(parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}`;

if (content.includes(pattern2)) {
  content = content.replace(new RegExp(pattern2.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement2);
  replaced = true;
}

if (replaced) {
  fs.writeFileSync(filePath, content, 'utf8');
  fs.writeFileSync('fix-result.txt', 'Fixed successfully', 'utf8');
} else {
  fs.writeFileSync('fix-result.txt', 'No replacements made', 'utf8');
}
