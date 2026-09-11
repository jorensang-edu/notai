const fs = require('fs');
let content = fs.readFileSync('src/components/EstudianteView.tsx', 'utf8');

content = content.replace(/import jsPDF from 'jspdf';\n/, '');
content = content.replace(/import autoTable from 'jspdf-autotable';\n/, '');

fs.writeFileSync('src/components/EstudianteView.tsx', content, 'utf8');
console.log('Removed PDF imports');
