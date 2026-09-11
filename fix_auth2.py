import re

with open('src/components/DocenteView.tsx', 'r') as f:
    content = f.read()

old = r"""  const \{ isUnauthorized, existingTeacherEmail \} = useMemo\(\(\) => \{\n    let unauthorized = false;\n        \n    // Check TEACHER_MATRIX logic if a teacherCode is present\n    if \(teacherCode\) \{\n      const allowed = TEACHER_MATRIX\[teacherCode\];\n      if \(allowed\) \{\n        if \(allowed === 'ALL'\) \{\n          unauthorized = false; // Code 'RWCV9' gets ALL access\n        \} else \{\n          // Check if current course/subject is in the allowed list for this code\n          const isAllowed = allowed\.some\(a => a\.course === selectedCourse && a\.subject === currentSubject\);\n          if \(\!isAllowed\) \{\n            unauthorized = true;\n          \}\n        \}\n      \} else \{\n        // Unknown code -> unauthorized for everything\n        unauthorized = true;\n      \}\n    \}\n        \n    return \{ isUnauthorized: unauthorized, existingTeacherEmail: undefined \};\n  \}, \[selectedCourse, currentSubject, teacherCode\]\);"""

new_auth = """  const { isUnauthorized, existingTeacherEmail } = useMemo(() => {
    let unauthorized = false;
    
    // Check TEACHER_MATRIX logic if a teacherCode is present
    if (teacherCode) {
      const teacherInfo = TEACHER_MATRIX[teacherCode];
      if (teacherInfo) {
        if (teacherInfo.permissions === 'all') {
          unauthorized = false; // Code 'RWCV9' gets ALL access
        } else if (Array.isArray(teacherInfo.permissions)) {
          // Check if current course/subject is in the allowed list for this code
          const isAllowed = teacherInfo.permissions.some(p => 
            p.subject === currentSubject && p.courses.includes(selectedCourse)
          );
          if (!isAllowed) {
            unauthorized = true;
          }
        } else {
          unauthorized = true;
        }
      } else {
        // Unknown code -> unauthorized for everything
        unauthorized = true;
      }
    }
    
    return { isUnauthorized: unauthorized, existingTeacherEmail: undefined };
  }, [selectedCourse, currentSubject, teacherCode]);"""

content = re.sub(old, new_auth, content)

with open('src/components/DocenteView.tsx', 'w') as f:
    f.write(content)
