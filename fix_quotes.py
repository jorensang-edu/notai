import re

with open('src/components/DocenteView.tsx', 'r') as f:
    content = f.read()

content = content.replace(r'\"', '"')

with open('src/components/DocenteView.tsx', 'w') as f:
    f.write(content)
