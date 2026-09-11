import re

with open('src/components/DocenteView.tsx', 'r') as f:
    content = f.read()

content = re.sub(
    r"interface DocenteViewProps \{\n  onLogout: \(\) => void;\n  store: ReturnType<typeof useAppStore>;\n\}",
    r"interface DocenteViewProps {\n  onLogout: () => void;\n  store: ReturnType<typeof useAppStore>;\n  teacherCode?: string;\n}",
    content
)

content = re.sub(
    r"export function DocenteView\(\{ onLogout, store \}: DocenteViewProps\) \{",
    r"import { TEACHER_MATRIX } from '../teacherMatrix';\nexport function DocenteView({ onLogout, store, teacherCode }: DocenteViewProps) {",
    content
)

# Replace isUnauthorized logic
new_unauthorized_logic = """
  const { isUnauthorized, existingTeacherEmail } = useMemo(() => {
    if (!teacherCode) return { isUnauthorized: false, existingTeacherEmail: '' };
    
    const permissions = TEACHER_MATRIX[teacherCode]?.permissions;
    if (permissions === 'all') return { isUnauthorized: false, existingTeacherEmail: '' };
    
    let isAllowed = false;
    if (permissions && Array.isArray(permissions)) {
      const subjectPerms = permissions.find(p => p.subject === currentSubject);
      if (subjectPerms && subjectPerms.courses.includes(selectedCourse)) {
        isAllowed = true;
      }
    }
    
    return { isUnauthorized: !isAllowed, existingTeacherEmail: '' };
  }, [teacherCode, selectedCourse, currentSubject]);
"""

content = re.sub(
    r"  const \{ isUnauthorized, existingTeacherEmail \} = useMemo\(\(\) => \{[^}]+\}[^}]+\}[^\)]+\), \[activities, selectedCourse, currentSubject\]\);",
    new_unauthorized_logic,
    content
)

# Update the alert text
content = re.sub(
    r"<strong className=\"text-rose-100 font-semibold\">Acceso restringido:</strong> Esta asignatura \(\{currentSubject\}\) en \{selectedCourse\} ya está siendo gestionada por otro docente \(\{existingTeacherEmail\}\)\. No puedes crear actividades ni modificar calificaciones\.",
    r"<strong className=\"text-rose-100 font-semibold\">Acceso denegado:</strong> No tienes autorización para modificar esta asignatura o curso.",
    content
)

with open('src/components/DocenteView.tsx', 'w') as f:
    f.write(content)
