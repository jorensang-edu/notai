import re

with open('src/components/EstudianteView.tsx', 'r') as f:
    content = f.read()

old_sort = """    const studentActivities = activities.filter(a => 
       a.course === currentStudent.course && 
       a.subject === selectedSubject &&
      (selectedTrimestre === 'ALL' || a.trimestre === selectedTrimestre) &&
      (selectedComponent === 'ALL' || a.component === selectedComponent)
    );"""

new_sort = """    const studentActivities = activities.filter(a => 
       a.course === currentStudent.course && 
       a.subject === selectedSubject &&
      (selectedTrimestre === 'ALL' || a.trimestre === selectedTrimestre) &&
      (selectedComponent === 'ALL' || a.component === selectedComponent)
    ).sort((a, b) => {
      const order: Record<string, number> = { '1º APORTE': 1, '2º APORTE': 2, 'EVALUACIÓN FINAL': 3, 'SUPLETORIO': 4, 'MEJORAMIENTO': 5 };
      if (order[a.component] !== order[b.component]) {
        return order[a.component] - order[b.component];
      }
      return (a.createdAt || 0) - (b.createdAt || 0);
    });"""

content = content.replace(old_sort, new_sort)

with open('src/components/EstudianteView.tsx', 'w') as f:
    f.write(content)
