import re

with open('src/components/DocenteView.tsx', 'r') as f:
    content = f.read()

content = content.replace("'Total Ref. Global', 'Promedio final'", "`Total Ref. Global`, `Promedio ${selectedComponent === 'ALL' ? 'Trimestral' : 'Aporte'}`")
content = content.replace("Promedio final</th>", "Promedio {selectedComponent === 'ALL' ? 'Trimestral' : 'Aporte'}</th>")

with open('src/components/DocenteView.tsx', 'w') as f:
    f.write(content)
