import re

with open('src/components/DocenteView.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'className="flex items-center justify-between mb-4"',
    'className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4"'
)

content = content.replace(
    'className="flex items-center gap-3"',
    'className="flex flex-wrap items-center gap-3 w-full sm:w-auto"'
)

with open('src/components/DocenteView.tsx', 'w') as f:
    f.write(content)
