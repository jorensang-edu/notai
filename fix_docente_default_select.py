import re

with open('src/components/DocenteView.tsx', 'r') as f:
    content = f.read()

# Add useEffect for auto-selecting valid subject and course based on permissions
import_statement = "import React, { useState, useMemo"
if "useEffect" not in content[:content.find(";")]:
    content = content.replace("import React, { useState, useMemo } from 'react';", "import React, { useState, useMemo, useEffect } from 'react';")

hook_injection = """  const isBasica = selectedCourse.includes('EGB');
  // Allow all subjects, remove the hardcoded Matemáticas lock for Básica
  const currentSubject = selectedSubject;"""

new_hook_injection = """  const isBasica = selectedCourse.includes('EGB');
  const currentSubject = selectedSubject;

  // Auto-select valid subject and course based on permissions
  useEffect(() => {
    if (teacherCode) {
      const teacherInfo = TEACHER_MATRIX[teacherCode];
      if (teacherInfo && Array.isArray(teacherInfo.permissions) && teacherInfo.permissions.length > 0) {
        const permittedSub = teacherInfo.permissions.find(p => p.subject === currentSubject);
        if (!permittedSub) {
          // Current subject is not permitted, switch to the first permitted subject
          const firstPermitted = teacherInfo.permissions[0];
          setSelectedSubject(firstPermitted.subject as SubjectName);
          if (!firstPermitted.courses.includes(selectedCourse)) {
            setSelectedCourse(firstPermitted.courses[0] as CourseName);
          }
        } else {
          // Subject is permitted, but check if the current course is permitted for this subject
          if (!permittedSub.courses.includes(selectedCourse)) {
            setSelectedCourse(permittedSub.courses[0] as CourseName);
          }
        }
      }
    }
  }, [teacherCode, currentSubject, selectedCourse]);"""

content = content.replace(hook_injection, new_hook_injection)

with open('src/components/DocenteView.tsx', 'w') as f:
    f.write(content)
