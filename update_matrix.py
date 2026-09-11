import re

with open('src/teacherMatrix.ts', 'r') as f:
    content = f.read()

# Replace Estudios Sociales with Ciencias Sociales
content = content.replace('"Estudios Sociales"', '"Ciencias Sociales"')

with open('src/teacherMatrix.ts', 'w') as f:
    f.write(content)
