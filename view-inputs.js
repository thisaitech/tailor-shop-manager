const fs = require('fs');
const content = fs.readFileSync('src/components/OrderAllotmentForm.tsx', 'utf8');
const lines = content.split('\n');

console.log('=== Around line 668 (type="number") ===');
for(let i = 660; i < 675; i++) {
  console.log((i+1) + ': ' + lines[i]);
}

console.log('\n=== Around line 683 (type="number") ===');
for(let i = 675; i < 695; i++) {
  console.log((i+1) + ': ' + lines[i]);
}
