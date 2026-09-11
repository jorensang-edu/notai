import re

with open('src/components/DocenteView.tsx', 'r') as f:
    content = f.read()

# Replace the studentActivitiesData mapping for Matriz view
old_map = r"""                      const studentActivitiesData = filteredActivities\.map\(a => \{\n                        const grade = getGradeRecord\(student\.id, a\.id\);\n                        const finalGrade = calculateFinalGrade\(grade\?\.originalGrade \?\? null, grade\?\.reinforcementGrade \?\? null, a\.maxScore, a\.reinforcementMaxScore\);\n                        return \{ activity: a, grade, finalGrade \};\n                      \}\);"""

new_map = """                      const studentActivitiesData = filteredActivities.map(a => {
                        const grade = getGradeRecord(student.id, a.id);
                        const isEvalFinal = a.component === 'EVALUACIÓN FINAL';
                        const origEq10 = computeCompositeOriginal(grade?.originalGrade ?? null, grade?.globalizationGrade ?? null, a.maxScore, a.globalizationMaxScore, isEvalFinal, a.hasGlobalization);
                        const refEq10 = convertTo10(grade?.reinforcementGrade ?? null, a.reinforcementMaxScore || a.maxScore);
                        const finalGrade = origEq10 !== null ? calculateFinalGrade(origEq10, grade?.reinforcementGrade ?? null, 10, a.reinforcementMaxScore) : null;
                        return { activity: a, grade, finalGrade, origEq10, refEq10 };
                      });"""

content = re.sub(old_map, new_map, content)

# Replace the cell rendering for Matriz view
old_cell = r"""                              <td key=\{data\.activity\.id\} className=\{`px-3 py-2 md:px-4 md:py-3 text-center border-white/5 \$\{isRequiringReinforcement \? 'bg-amber-500/5' : ''\}`\}>\n                                \{data\.grade\?\.originalGrade !== undefined && data\.grade\.originalGrade !== null \? \(\n                                  <div className="flex flex-col items-center justify-center">\n                                    <span className=\{`font-semibold \$\{isRequiringReinforcement && data\.grade\.reinforcementGrade == null \? 'text-amber-500' : 'text-slate-300'\}`\}>\n                                      \{formatGrade\(data\.grade\.originalGrade\)\}\n                                    </span>\n                                    \{data\.grade\.reinforcementGrade \!= null && \(\n                                      <span className="text-\[11px\] sm:text-xs text-emerald-400 font-medium mt-0\.5 bg-emerald-500/10 px-1\.5 rounded">\n                                        R: \{formatGrade\(data\.grade\.reinforcementGrade\)\}\n                                      </span>\n                                    \)\}\n                                  </div>\n                                \) : \(\n                                  <span className="text-slate-600">-</span>\n                                \)\}\n                              </td>"""

new_cell = """                              <td key={data.activity.id} className={`px-3 py-2 md:px-4 md:py-3 text-center border-white/5 ${isRequiringReinforcement ? 'bg-amber-500/5' : ''}`}>
                                {data.origEq10 !== null ? (
                                  <div className="flex flex-col items-center justify-center">
                                    <span className={`font-semibold ${isRequiringReinforcement && data.grade?.reinforcementGrade == null ? 'text-amber-500' : 'text-slate-300'}`}>
                                      {formatGrade(data.origEq10)}
                                    </span>
                                    {data.refEq10 !== null && (
                                      <span className="text-[11px] sm:text-xs text-emerald-400 font-medium mt-0.5 bg-emerald-500/10 px-1.5 rounded">
                                        R: {formatGrade(data.refEq10)}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-600">-</span>
                                )}
                              </td>"""

content = re.sub(old_cell, new_cell, content)

with open('src/components/DocenteView.tsx', 'w') as f:
    f.write(content)
