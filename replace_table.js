const fs = require('fs');
const content = fs.readFileSync('src/components/DocenteView.tsx', 'utf8');

const startMarker = '<table className="w-full text-left border-collapse min-w-max">';
const endMarker = '</table>';

const startIndex = content.indexOf(startMarker, content.indexOf('activeView === \'matriz\'') + 500);
const lastStartIndex = content.lastIndexOf(startMarker); // this is the second table
const lastEndIndex = content.indexOf(endMarker, lastStartIndex) + endMarker.length;

if (lastStartIndex === -1 || lastEndIndex === -1) {
  console.log('Markers not found');
  process.exit(1);
}

const replacement = `<table className="w-full text-left border-collapse min-w-max">
                <thead className="sticky top-0 bg-[#0f172a] text-[11px] sm:text-xs uppercase tracking-wider text-slate-500 z-10 shadow-md">
                  <tr>
                    <th className="px-4 py-3 font-semibold border-b border-r border-white/5 bg-[#0f172a] sticky left-0 z-20" rowSpan={2}>
                      Estudiante
                    </th>
                    {displayActivities.map(activity => (
                      <th key={activity.id} colSpan={5} className="px-4 py-3 font-semibold text-center border-b border-r border-white/5 bg-[#162032]">
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-sm font-bold text-slate-200">{activity.name}</span>
                          <span className="text-[10px] opacity-60">{activity.component}</span>
                          <div className="flex items-center justify-center gap-4 mt-1 bg-black/20 p-1.5 rounded-lg border border-white/5 w-full">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[9px] text-slate-400 uppercase">Base Orig.</span>
                              <input
                                type="number"
                                value={activity.maxScore || 10}
                                onChange={(e) => updateActivity(activity.id, { maxScore: parseFloat(e.target.value) || 10 })}
                                className="w-16 px-1 py-1 bg-black/40 border border-white/10 rounded text-xs text-blue-400 focus:outline-none focus:border-blue-500 text-center font-mono"
                                title="Calificación máxima de la actividad"
                              />
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[9px] text-slate-400 uppercase">Base Ref.</span>
                              <input
                                type="number"
                                value={activity.reinforcementMaxScore || activity.maxScore || 10}
                                onChange={(e) => updateActivity(activity.id, { reinforcementMaxScore: parseFloat(e.target.value) || 10 })}
                                className="w-16 px-1 py-1 bg-black/40 border border-white/10 rounded text-xs text-emerald-400 focus:outline-none focus:border-emerald-500 text-center font-mono"
                                title="Calificación máxima del refuerzo"
                              />
                            </div>
                          </div>
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 font-semibold text-center border-b border-white/5 bg-[#0f172a]" rowSpan={2}>
                      Promedio<br/>Total
                    </th>
                  </tr>
                  <tr>
                    {displayActivities.map(activity => (
                      <React.Fragment key={'sub-'+activity.id}>
                        <th className="px-2 py-2 font-semibold text-center border-b border-white/5 bg-[#0f172a] min-w-[80px]">Orig.</th>
                        <th className="px-2 py-2 font-semibold text-center border-b border-r border-white/5 bg-[#0f172a] min-w-[70px] text-blue-400/70">Eq. 10</th>
                        <th className="px-2 py-2 font-semibold text-center border-b border-white/5 bg-[#0f172a] min-w-[80px]">Ref.</th>
                        <th className="px-2 py-2 font-semibold text-center border-b border-r border-white/5 bg-[#0f172a] min-w-[70px] text-emerald-400/70">Ref Eq. 10</th>
                        <th className="px-2 py-2 font-semibold text-center border-b border-r border-white/5 bg-[#0f172a] min-w-[80px] text-slate-300">Definitiva</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {filteredStudents.map(student => {
                    if (displayActivities.length === 0) return null;

                    const studentActivitiesData = displayActivities.map(a => {
                      const grade = getGradeRecord(student.id, a.id);
                      const finalGrade = calculateFinalGrade(grade?.originalGrade ?? null, grade?.reinforcementGrade ?? null, a.maxScore, a.reinforcementMaxScore);
                      return { activity: a, grade, finalGrade };
                    });

                    const evaluated = studentActivitiesData.filter(a => a.finalGrade !== null);
                    const avg = evaluated.length > 0 ? evaluated.reduce((acc, curr) => acc + curr.finalGrade!, 0) / evaluated.length : null;
                    const missingReinforcements = evaluated.filter(a => a.finalGrade! < 7 && a.grade?.reinforcementGrade == null);

                    return (
                      <tr key={student.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-4 py-3 border-r border-white/5 bg-[#0f172a] group-hover:bg-[#162032] sticky left-0 z-10 transition-colors">
                          <div className="font-bold text-slate-200 text-xs truncate max-w-[200px]" title={student.name}>{student.name}</div>
                          <div className="text-[11px] sm:text-xs text-slate-500 font-mono mt-0.5">{student.code}</div>
                        </td>
                        
                        {studentActivitiesData.map(({ activity, grade, finalGrade }) => {
                          const origMax = activity.maxScore || 10;
                          const refMax = activity.reinforcementMaxScore || origMax;
                          
                          // We calculate the Eq10 precisely
                          const origEq10 = grade?.originalGrade != null && !isNaN(grade.originalGrade) ? (grade.originalGrade / origMax) * 10 : null;
                          const refEq10 = grade?.reinforcementGrade != null && !isNaN(grade.reinforcementGrade) ? (grade.reinforcementGrade / refMax) * 10 : null;
                          
                          const isRequiringReinforcement = finalGrade !== null && finalGrade < 7;
                          
                          return (
                            <React.Fragment key={student.id + '-' + activity.id}>
                              {/* Original Input */}
                              <td className={'px-2 py-2 text-center border-white/5 ' + (isRequiringReinforcement ? 'bg-amber-500/5' : '')}>
                                <input
                                  type="number"
                                  min="0" step="0.01"
                                  value={grade?.originalGrade ?? ''}
                                  onChange={(e) => handleGradeChange(student.id, activity.id, 'original', e.target.value)}
                                  className={'w-16 px-1 py-1 text-center bg-[#0f172a] border border-white/10 rounded focus:outline-none focus:border-blue-500 font-mono text-xs ' + (isRequiringReinforcement ? 'text-rose-400' : 'text-slate-200')}
                                />
                              </td>
                              {/* Original Eq 10 */}
                              <td className={'px-2 py-2 text-center border-r border-white/5 ' + (isRequiringReinforcement ? 'bg-amber-500/5' : '')}>
                                <span className="font-mono text-xs text-blue-400/80">
                                  {origEq10 !== null ? formatGrade(origEq10) : '-'}
                                </span>
                              </td>
                              
                              {/* Reinforcement Input */}
                              <td className={'px-2 py-2 text-center border-white/5 ' + (isRequiringReinforcement ? 'bg-amber-500/5' : '')}>
                                <input
                                  type="number"
                                  min="0" step="0.01"
                                  value={grade?.reinforcementGrade ?? ''}
                                  onChange={(e) => handleGradeChange(student.id, activity.id, 'reinforcement', e.target.value)}
                                  className="w-16 px-1 py-1 text-center bg-[#0f172a] border border-white/10 rounded focus:outline-none focus:border-emerald-500 font-mono text-xs text-emerald-400 disabled:opacity-30"
                                  disabled={origEq10 === null || origEq10 >= 7}
                                />
                              </td>
                              {/* Reinforcement Eq 10 */}
                              <td className={'px-2 py-2 text-center border-r border-white/5 ' + (isRequiringReinforcement ? 'bg-amber-500/5' : '')}>
                                <span className="font-mono text-xs text-emerald-400/80">
                                  {refEq10 !== null ? formatGrade(refEq10) : '-'}
                                </span>
                              </td>
                              
                              {/* Definitiva */}
                              <td className={'px-2 py-2 text-center border-r border-white/5 ' + (isRequiringReinforcement ? 'bg-amber-500/10' : 'bg-white/5')}>
                                {finalGrade !== null ? (
                                  <span className={'font-bold px-2 py-0.5 rounded text-xs ' + (isRequiringReinforcement ? 'text-rose-400' : grade?.reinforcementGrade != null ? 'text-emerald-400' : 'text-slate-200')}>
                                    {formatGrade(finalGrade)}
                                  </span>
                                ) : (
                                  <span className="text-slate-600">-</span>
                                )}
                              </td>
                            </React.Fragment>
                          );
                        })}
                        
                        {/* Promedio Total Row */}
                        <td className="px-4 py-3 text-center border-l border-white/5 bg-[#0f172a] group-hover:bg-[#162032] sticky right-0 z-10 transition-colors">
                          <div className={'text-base font-bold ' + (avg !== null && avg < 7 ? 'text-rose-400' : 'text-emerald-400')}>
                            {formatGrade(avg)}
                          </div>
                          {missingReinforcements.length > 0 && (
                            <div className="mt-1 text-[9px] sm:text-[10px] text-amber-400 leading-tight">
                              Falta Ref: {missingReinforcements.length} act.
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={(displayActivities.length * 5) + 2} className="px-6 py-12 text-center text-slate-500 italic">
                        No hay estudiantes registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>`;

const newContent = content.substring(0, lastStartIndex) + replacement + content.substring(lastEndIndex);
fs.writeFileSync('src/components/DocenteView.tsx', newContent, 'utf8');
console.log('Replaced');
