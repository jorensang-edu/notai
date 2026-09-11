const fs = require('fs');
let content = fs.readFileSync('src/components/EstudianteView.tsx', 'utf8');

content = content.replace(/import jsPDF from 'jspdf';\nimport autoTable from 'jspdf-autotable';\n/, '');

const funcStart = content.indexOf('  const generatePDF = () => {');
if (funcStart !== -1) {
  const funcEnd = content.indexOf('  };\n\n  const today = getCurrentFormattedDate();', funcStart);
  if (funcEnd !== -1) {
    content = content.substring(0, funcStart) + content.substring(funcEnd + 5);
  }
}

fs.writeFileSync('src/components/EstudianteView.tsx', content, 'utf8');
console.log('Removed generatePDF');
