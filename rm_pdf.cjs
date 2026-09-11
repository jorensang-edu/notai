const fs = require('fs');
let content = fs.readFileSync('src/components/EstudianteView.tsx', 'utf8');

const regex = /const generatePDF = \(\) => \{[\s\S]*?doc\.save\([^\)]+\);\s*\};\s*/;
content = content.replace(regex, '');

fs.writeFileSync('src/components/EstudianteView.tsx', content, 'utf8');
console.log('Removed generatePDF');
