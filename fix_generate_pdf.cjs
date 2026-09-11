const fs = require('fs');
let content = fs.readFileSync('src/components/EstudianteView.tsx', 'utf8');

const t = `    // Subject Summary Table
    const tableData = allSubjects.map(subject => {
      const studentActivities = activities.filter(a => a.course === currentStudent.course && a.subject === subject);`;

const r = `    // Subject Summary Table
    const tableData = allSubjects.map(subject => {
      const studentActivities = activities.filter(a => 
        a.course === currentStudent.course && 
        a.subject === subject &&
        (selectedTrimestre === 'ALL' || a.trimestre === selectedTrimestre) &&
        (selectedComponent === 'ALL' || a.component === selectedComponent)
      );`;

content = content.replace(t, r);
fs.writeFileSync('src/components/EstudianteView.tsx', content, 'utf8');
console.log('Fixed PDF generation');
