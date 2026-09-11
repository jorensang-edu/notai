const fs = require('fs');
let content = fs.readFileSync('src/components/EstudianteView.tsx', 'utf8');

const t = `      const studentActivities = activities.filter(a => a.course === currentStudent.course && a.subject === subject);`;

const r = `      const studentActivities = activities.filter(a => 
        a.course === currentStudent.course && 
        a.subject === subject &&
        (selectedTrimestre === 'ALL' || a.trimestre === selectedTrimestre) &&
        (selectedComponent === 'ALL' || a.component === selectedComponent)
      );`;

content = content.replace(t, r);

const t2 = `}, [currentStudent, activities, grades]);`;
const r2 = `}, [currentStudent, activities, grades, selectedTrimestre, selectedComponent]);`;

content = content.replace(t2, r2);

fs.writeFileSync('src/components/EstudianteView.tsx', content, 'utf8');
console.log('Fixed failing subjects');
