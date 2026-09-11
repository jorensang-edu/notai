import re

with open('src/components/DocenteView.tsx', 'r') as f:
    content = f.read()

old_sort = """      return matchCourse && matchSubject && matchTrimestre && matchComponent;
    }).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));"""

new_sort = """      return matchCourse && matchSubject && matchTrimestre && matchComponent;
    }).sort((a, b) => {
      const order = { '1º APORTE': 1, '2º APORTE': 2, 'EVALUACIÓN FINAL': 3, 'SUPLETORIO': 4, 'MEJORAMIENTO': 5 };
      if (order[a.component] !== order[b.component]) {
        return order[a.component] - order[b.component];
      }
      return (a.createdAt || 0) - (b.createdAt || 0);
    });"""

content = content.replace(old_sort, new_sort)

with open('src/components/DocenteView.tsx', 'w') as f:
    f.write(content)
