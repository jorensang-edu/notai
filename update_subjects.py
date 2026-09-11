import re

with open('src/types.ts', 'r') as f:
    content = f.read()

old_subject = "'Matemáticas' | 'Lengua y Literatura' | 'Ciencias Naturales' | 'Biología' | 'Estudios Sociales' | 'Química' | 'Física' | 'Diplomado' | 'Educación Física'"
new_subject = "'Matemáticas' | 'Lengua y Literatura' | 'Ciencias Naturales' | 'Biología' | 'Estudios Sociales' | 'Química' | 'Física' | 'Diplomado' | 'Educación Física' | 'Indagación' | 'Filosofía' | 'Patrimonio' | 'Ciudadanía' | 'Ciencias Sociales' | 'Investigación'"

content = content.replace(old_subject, new_subject)

with open('src/types.ts', 'w') as f:
    f.write(content)

with open('src/components/EstudianteView.tsx', 'r') as f:
    content = f.read()

old_all = """  const allSubjects: SubjectName[] = [
    'Matemáticas', 'Lengua y Literatura', 'Ciencias Naturales', 'Biología',
    'Estudios Sociales', 'Química', 'Física', 'Diplomado', 'Educación Física'
  ];"""

new_all = """  const allSubjects: SubjectName[] = [
    'Matemáticas', 'Lengua y Literatura', 'Ciencias Naturales', 'Biología',
    'Estudios Sociales', 'Química', 'Física', 'Diplomado', 'Educación Física',
    'Indagación', 'Filosofía', 'Patrimonio', 'Ciudadanía', 'Ciencias Sociales', 'Investigación'
  ];"""

content = content.replace(old_all, new_all)

with open('src/components/EstudianteView.tsx', 'w') as f:
    f.write(content)
