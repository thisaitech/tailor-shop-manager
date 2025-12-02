const fs = require('fs');

const file_path = 'src\\components\\OrderAllotmentForm.tsx';
const content = fs.readFileSync(file_path, 'utf8');

// Find the materialCost input
const idx = content.indexOf('value={materialCost}');
if (idx > 0) {
  const section = content.substring(idx - 200, idx + 300);
  console.log('===== Section around materialCost input =====');
  console.log(section);
  console.log('===== End Section =====');
} else {
  console.log('materialCost not found');
}
