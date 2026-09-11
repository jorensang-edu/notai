import re

with open('src/components/DocenteView.tsx', 'r') as f:
    content = f.read()

# Restore the td inputs
bad_td = r"""                              <td className=\{'px-3 py-2 md:px-4 md:py-3 text-center border-r border-white/5 ' \+ \(isDefinitivaLow \? 'bg-amber-500/5' : ''\)\}>\n                                <div className="flex flex-col items-center justify-center">\n                                  <span className=\{`font-semibold \$\{isRequiringReinforcement && grade\?\.reinforcementGrade == null \? 'text-amber-500' : 'text-slate-200'\}`\}>\n                                    \{origEq10 !== null \? formatGrade\(origEq10\) : '-'\}\n                                  </span>\n                                  \{refEq10 !== null && \(\n                                    <span className="text-\[11px\] sm:text-xs text-emerald-400 font-medium mt-0\.5 bg-emerald-500/10 px-1\.5 rounded">\n                                      R: \{formatGrade\(refEq10\)\}\n                                    </span>\n                                  \)\}\n                                </div>\n                              </td>"""

good_td = """                              {hasGlob && (
                                <td className={'px-2 py-2 text-center border-white/5 ' + (isDefinitivaLow ? 'bg-amber-500/5' : '')}>
                                  <input
                                    type="number"
                                    min="0" step="0.01"
                                    value={grade?.globalizationGrade ?? ''}
                                    onChange={(e) => handleGradeChange(student.id, activity.id, 'globalization', e.target.value)}
                                    className={'w-14 px-1 py-1 text-center bg-[#0f172a] border border-white/10 rounded focus:outline-none focus:border-purple-500 font-mono text-xs ' + (isDefinitivaLow ? 'text-rose-400' : 'text-slate-200')}
                                    disabled={isUnauthorized}
                                  />
                                </td>
                              )}
                              {/* Original Input */}
                              <td className={'px-2 py-2 text-center border-white/5 ' + (isDefinitivaLow ? 'bg-amber-500/5' : '')}>
                                <input
                                  type="number"
                                  min="0" step="0.01"
                                  value={grade?.originalGrade ?? ''}
                                  onChange={(e) => handleGradeChange(student.id, activity.id, 'original', e.target.value)}
                                  className={'w-16 px-1 py-1 text-center bg-[#0f172a] border border-white/10 rounded focus:outline-none focus:border-blue-500 font-mono text-xs ' + (isDefinitivaLow ? 'text-rose-400' : 'text-slate-200')}
                                  disabled={isUnauthorized}
                                />
                              </td>
                              {/* Original Eq 10 */}
                              <td className={'px-2 py-2 text-center border-r border-white/5 ' + (isDefinitivaLow ? 'bg-amber-500/5' : '')}>
                                <span className="font-mono text-xs text-blue-400/80">
                                  {origEq10 !== null ? formatGrade(origEq10) : '-'}
                                </span>
                              </td>
                              
                              {!isEvalFinal && !isMejoramiento && (
                                <>
                                  {/* Reinforcement Input */}
                                  <td className={'px-2 py-2 text-center border-white/5 ' + (isRequiringReinforcement ? 'bg-amber-500/5' : '')}>
                                    <input
                                      type="number"
                                      min="0" step="0.01"
                                      value={grade?.reinforcementGrade ?? ''}
                                      onChange={(e) => handleGradeChange(student.id, activity.id, 'reinforcement', e.target.value)}
                                      className="w-16 px-1 py-1 text-center bg-[#0f172a] border border-white/10 rounded focus:outline-none focus:border-emerald-500 font-mono text-xs text-emerald-400 disabled:opacity-30"
                                      disabled={isUnauthorized || origEq10 === null || origEq10 >= 7}
                                    />
                                  </td>
                                  {/* Reinforcement Eq 10 */}
                                  <td className={'px-2 py-2 text-center border-r border-white/5 ' + (isRequiringReinforcement ? 'bg-amber-500/5' : '')}>
                                    <span className="font-mono text-xs text-emerald-400/80">
                                      {refEq10 !== null ? formatGrade(refEq10) : '-'}
                                    </span>
                                  </td>
                                </>
                              )}
                              
                              {/* Definitiva */}
                              <td className={'px-2 py-2 text-center border-white/5 ' + (isDefinitivaLow ? 'bg-amber-500/10' : 'bg-white/5')}>
                                {finalGrade !== null ? (
                                  <span className={'font-bold px-2 py-0.5 rounded text-xs ' + (isDefinitivaLow ? 'text-rose-400' : (!isEvalFinal && !isMejoramiento && grade?.reinforcementGrade != null) ? 'text-emerald-400' : 'text-slate-200')}>
                                    {formatGrade(finalGrade)}
                                  </span>
                                ) : (
                                  <span className="text-slate-600">-</span>
                                )}
                              </td>"""
content = re.sub(bad_td, good_td, content)

# Restore the th config inputs
bad_th = r"""                          <div className="flex flex-col items-center gap-2">\n                            <span className="text-sm font-bold text-slate-200">\{activity\.name\}</span>\n                            \{activity\.date && <span className="text-\[9px\] text-amber-400/80 font-mono mt-0\.5">\{activity\.date\}</span>\}\n                            <span className="text-\[9px\] text-blue-400 font-mono mt-0\.5" title="Calificación máxima">10</span>\n                            </div>"""

good_th = """                          <div className="flex flex-col items-center gap-2">
                            <span className="text-sm font-bold text-slate-200">{activity.name}</span>
                            {activity.date && <span className="text-[9px] text-amber-400/80 font-mono mt-0.5">{activity.date}</span>}
                            <span className="text-[9px] text-blue-400 font-mono mt-0.5" title="Calificación máxima">10</span>
                            <div className="flex items-center justify-center gap-2 mt-1 bg-black/20 p-1.5 rounded-lg border border-white/5 w-full">
                              {hasGlob && (
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-[9px] text-slate-400 uppercase">Base Glob.</span>
                                  <input
                                    type="number"
                                    value={activity.globalizationMaxScore ?? ''}
                                    placeholder="10"
                                    onChange={(e) => updateActivity(activity.id, { globalizationMaxScore: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                                    className="w-12 px-1 py-1 bg-black/40 border border-white/10 rounded text-xs text-purple-400 focus:outline-none focus:border-purple-500 text-center font-mono"
                                    title="Calificación máxima de Globalización"
                                    disabled={isUnauthorized}
                                  />
                                </div>
                              )}
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[9px] text-slate-400 uppercase">{isEvalFinal ? 'Base Escrita' : 'Base Orig.'}</span>
                                <input
                                  type="number"
                                  value={activity.maxScore ?? ''}
                                  placeholder="10"
                                  onChange={(e) => updateActivity(activity.id, { maxScore: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                                  className="w-12 px-1 py-1 bg-black/40 border border-white/10 rounded text-xs text-blue-400 focus:outline-none focus:border-blue-500 text-center font-mono"
                                  title={isEvalFinal ? "Calificación máxima de Eval Escrita" : "Calificación máxima de la actividad"}
                                  disabled={isUnauthorized}
                                />
                              </div>
                              {!isEvalFinal && !isMejoramiento && (
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-[9px] text-slate-400 uppercase">Base Ref.</span>
                                  <input
                                    type="number"
                                    value={activity.reinforcementMaxScore ?? ''}
                                    placeholder={activity.maxScore ? activity.maxScore.toString() : "10"}
                                    onChange={(e) => updateActivity(activity.id, { reinforcementMaxScore: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                                    className="w-12 px-1 py-1 bg-black/40 border border-white/10 rounded text-xs text-emerald-400 focus:outline-none focus:border-emerald-500 text-center font-mono"
                                    title="Calificación máxima del refuerzo"
                                    disabled={isUnauthorized}
                                  />
                                </div>
                              )}
                            </div>
                          </div>"""
content = re.sub(bad_th, good_th, content)

# Restore colSpan
content = content.replace("let colSpan = 1;", """                      let colSpan = 6;
                      if (isEvalFinal) {
                        colSpan = hasGlob ? 5 : 4;
                      } else if (isMejoramiento) {
                        colSpan = 4;
                      }""")

with open('src/components/DocenteView.tsx', 'w') as f:
    f.write(content)
