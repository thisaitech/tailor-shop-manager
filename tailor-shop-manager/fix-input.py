import os

file_path = r'd:\tailor app\26-11-25\tailor-shop-manager\src\components\OrderAllotmentForm.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix for Material Cost input
old_material = '''                        type="number"
                        min="0"
                        step="0.01"
                        value={materialCost}
                        onChange={(e) => setMaterialCost(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"'''

new_material = '''                        type="number"
                        min="0"
                        step="0.01"
                        value={materialCost}
                        onChange={(e) => setMaterialCost(parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0.00"'''

content = content.replace(old_material, new_material)

# Fix for Job Work Cost input
old_jobwork = '''                        type="number"
                        min="0"
                        step="0.01"
                        value={jobWorkCost}
                        onChange={(e) => setJobWorkCost(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"'''

new_jobwork = '''                        type="number"
                        min="0"
                        step="0.01"
                        value={jobWorkCost}
                        onChange={(e) => setJobWorkCost(parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0.00"'''

content = content.replace(old_jobwork, new_jobwork)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed input fields")
