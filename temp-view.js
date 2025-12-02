const fs = require('fs');
const lines = fs.readFileSync('src/components/OrderAllotmentForm.tsx', 'utf8').split('\n');
for(let i = 665; i < 685; i++) {
  console.log((i+1) + ': ' + lines[i]);
}
