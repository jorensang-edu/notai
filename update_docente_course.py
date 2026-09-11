import re

with open('src/components/DocenteView.tsx', 'r') as f:
    content = f.read()

old_select = """                <label className="block text-[11px] sm:text-xs text-slate-500 uppercase">Curso / Paralelo</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => {
                    setSelectedCourse(e.target.value as CourseName);
                    setSelectedActivityId('ALL');
                    setActiveView('registro');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full mt-1 px-3 py-2 bg-[#0f172a] border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-sm font-semibold text-slate-200"
                >
                  <option value="8 EGB A">8 EGB A</option>
                  <option value="8 EGB B">8 EGB B</option>
                  <option value="9 EGB A">9 EGB A</option>
                  <option value="9 EGB B">9 EGB B</option>
                  <option value="10 EGB A">10 EGB A</option>
                  <option value="10 EGB B">10 EGB B</option>
                  <option value="1 BACH. A">1 BACH. A</option>
                  <option value="1 BACH. B">1 BACH. B</option>
                  <option value="2 BACH. A">2 BACH. A</option>
                  <option value="2 BACH. B">2 BACH. B</option>
                  <option value="3 BACH. A">3 BACH. A</option>
                  <option value="3 BACH. B">3 BACH. B</option>
                </select>"""

new_select = """                <label className="block text-[11px] sm:text-xs text-slate-500 uppercase">Curso / Paralelo</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => {
                    setSelectedCourse(e.target.value as CourseName);
                    setSelectedActivityId('ALL');
                    setActiveView('registro');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full mt-1 px-3 py-2 bg-[#0f172a] border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-sm font-semibold text-slate-200"
                >
                  {(() => {
                    const allCourses: CourseName[] = [
                      '8 EGB A', '8 EGB B', '9 EGB A', '9 EGB B', '10 EGB A', '10 EGB B',
                      '1 BACH. A', '1 BACH. B', '2 BACH. A', '2 BACH. B', '3 BACH. A', '3 BACH. B'
                    ];

                    let allowedCourses = allCourses;
                    if (teacherCode) {
                      const teacherInfo = TEACHER_MATRIX[teacherCode];
                      if (teacherInfo && Array.isArray(teacherInfo.permissions)) {
                        const permittedSub = teacherInfo.permissions.find(p => p.subject === currentSubject);
                        if (permittedSub) {
                          const permitted = new Set(permittedSub.courses);
                          allowedCourses = allCourses.filter(c => permitted.has(c));
                        }
                      }
                    }

                    return allowedCourses.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ));
                  })()}
                </select>"""

content = content.replace(old_select, new_select)

with open('src/components/DocenteView.tsx', 'w') as f:
    f.write(content)
