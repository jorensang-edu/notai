import re

with open('src/components/DocenteView.tsx', 'r') as f:
    content = f.read()

old_select = """                <label className="block text-[11px] sm:text-xs text-slate-500 uppercase">Asignatura</label>
                <select
                  value={currentSubject}
                  onChange={(e) => setSelectedSubject(e.target.value as SubjectName)}
                  className="w-full mt-1 px-3 py-2 bg-[#0f172a] border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-sm font-semibold text-slate-200"
                >
                  <option value="Matemáticas">Matemáticas</option>
                  <option value="Lengua y Literatura">Lengua y Literatura</option>
                  <option value="Ciencias Naturales">Ciencias Naturales</option>
                  <option value="Biología">Biología</option>
                  <option value="Estudios Sociales">Estudios Sociales</option>
                  <option value="Química">Química</option>
                  <option value="Física">Física</option>
                  <option value="Diplomado">Diplomado</option>
                  <option value="Educación Física">Educación Física</option>
                </select>"""

new_select = """                <label className="block text-[11px] sm:text-xs text-slate-500 uppercase">Asignatura</label>
                <select
                  value={currentSubject}
                  onChange={(e) => setSelectedSubject(e.target.value as SubjectName)}
                  className="w-full mt-1 px-3 py-2 bg-[#0f172a] border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-sm font-semibold text-slate-200"
                >
                  {(() => {
                    const allSubjectsList: SubjectName[] = [
                      'Matemáticas', 'Lengua y Literatura', 'Ciencias Naturales', 'Biología',
                      'Química', 'Física', 'Diplomado', 'Educación Física',
                      'Indagación', 'Filosofía', 'Patrimonio', 'Ciudadanía', 'Ciencias Sociales', 'Investigación'
                    ];
                    
                    let allowedSubjects = allSubjectsList;
                    if (teacherCode) {
                      const teacherInfo = TEACHER_MATRIX[teacherCode];
                      if (teacherInfo && Array.isArray(teacherInfo.permissions)) {
                        const permitted = new Set(teacherInfo.permissions.map(p => p.subject));
                        allowedSubjects = allSubjectsList.filter(sub => permitted.has(sub));
                      }
                    }

                    return allowedSubjects.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ));
                  })()}
                </select>"""

content = content.replace(old_select, new_select)

with open('src/components/DocenteView.tsx', 'w') as f:
    f.write(content)
