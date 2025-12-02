const fs = require('fs');
const path = require('path');

const file_path = 'd:\\tailor app\\26-11-25\\tailor-shop-manager\\src\\components\\OrderAllotmentForm.tsx';

let content = fs.readFileSync(file_path, 'utf8');

// Fix for Material Cost input
const old_material = `                        type="number"
                        min="0"
                        step="0.01"
                        value={materialCost}
                        onChange={(e) => setMaterialCost(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"`;

const new_material = `                        type="number"
                        min="0"
                        step="0.01"
                        value={materialCost}
                        onChange={(e) => setMaterialCost(parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0.00"`;

content = content.replace(old_material, new_material);

// Fix for Job Work Cost input
const old_jobwork = `                        type="number"
                        min="0"
                        step="0.01"
                        value={jobWorkCost}
                        onChange={(e) => setJobWorkCost(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"`;

const new_jobwork = `                        type="number"
                        min="0"
                        step="0.01"
                        value={jobWorkCost}
                        onChange={(e) => setJobWorkCost(parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0.00"`;

content = content.replace(old_jobwork, new_jobwork);

fs.writeFileSync(file_path, content, 'utf8');
console.log('Fixed input fields');
