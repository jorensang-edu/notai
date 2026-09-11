import re

with open('src/components/DocenteView.tsx', 'r') as f:
    content = f.read()

# Replace the useMemo for isUnauthorized
old_auth = r"""  const \{ isUnauthorized, existingTeacherEmail \} = useMemo\(\(\) => \{\n    const courseActivities = activities\.filter\(a => a\.course === selectedCourse && a\.subject === currentSubject\);\n    const ownerEmail = courseActivities\.find\(a => a\.teacherEmail\)\?\.teacherEmail;\n    const currentUserEmail = auth\.currentUser\?\.email;\n    const unauthorized = !!\(ownerEmail && currentUserEmail && ownerEmail !== currentUserEmail\);\n    return \{ isUnauthorized: unauthorized, existingTeacherEmail: ownerEmail \};\n  \}, \[activities, selectedCourse, currentSubject\]\);"""

new_auth = """  const { isUnauthorized, existingTeacherEmail } = useMemo(() => {
    let unauthorized = false;
    
    // Check TEACHER_MATRIX logic if a teacherCode is present
    if (teacherCode) {
      const allowed = TEACHER_MATRIX[teacherCode];
      if (allowed) {
        if (allowed === 'ALL') {
          unauthorized = false; // Code 'RWCV9' gets ALL access
        } else {
          // Check if current course/subject is in the allowed list for this code
          const isAllowed = allowed.some(a => a.course === selectedCourse && a.subject === currentSubject);
          if (!isAllowed) {
            unauthorized = true;
          }
        }
      } else {
        // Unknown code -> unauthorized for everything
        unauthorized = true;
      }
    }
    
    return { isUnauthorized: unauthorized, existingTeacherEmail: undefined };
  }, [selectedCourse, currentSubject, teacherCode]);"""

content = re.sub(old_auth, new_auth, content)

with open('src/components/DocenteView.tsx', 'w') as f:
    f.write(content)
