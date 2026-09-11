import re

with open('src/components/DocenteView.tsx', 'r') as f:
    content = f.read()

# Make the Matriz view read-only and show only eq10 values
old_matriz_td = r"""                            <React\.Fragment key=\{student\.id \+ '-' \+ activity\.id\}>\n                              \{hasGlob && \(\n                                <td className=\{'px-2 py-2 text-center border-white/5 ' \+ \(isDefinitivaLow \? 'bg-amber-500/5' : ''\)\}>\n                                  <input[^>]+/>\n                                </td>\n                              \)\}\n                              \{\/\* Original Input \*\/\}\n                              <td className=\{'px-2 py-2 text-center border-white/5 ' \+ \(isDefinitivaLow \? 'bg-amber-500/5' : ''\)\}>\n                                <input[^>]+/>\n                              </td>\n                              \{\/\* Original Eq 10 \*\/\}\n                              <td className=\{'px-2 py-2 text-center border-r border-white/5 ' \+ \(isDefinitivaLow \? 'bg-amber-500/5' : ''\)\}>\n                                <span className=\"font-mono text-xs text-blue-400/80\">\n                                  \{origEq10 !== null \? formatGrade\(origEq10\) : '-'\}\n                                </span>\n                              </td>\n                              \n                              \{\!isEvalFinal && \!isMejoramiento && \(\n                                <>\n                                  \{\/\* Reinforcement Input \*\/\}\n                                  <td className=\{'px-2 py-2 text-center border-white/5 ' \+ \(isRequiringReinforcement \? 'bg-amber-500/5' : ''\)\}>\n                                    <input[^>]+/>\n                                  </td>\n                                  \{\/\* Reinforcement Eq 10 \*\/\}\n                                  <td className=\{'px-2 py-2 text-center border-r border-white/5 ' \+ \(isRequiringReinforcement \? 'bg-amber-500/5' : ''\)\}>\n                                    <span className=\"font-mono text-xs text-emerald-400/80\">\n                                      \{refEq10 !== null \? formatGrade\(refEq10\) : '-'\}\n                                    </span>\n                                  </td>\n                                </>\n                              \)\}\n                              \n                              \{\/\* Definitiva \*\/\}\n                              <td className=\{'px-2 py-2 text-center border-white/5 ' \+ \(isDefinitivaLow \? 'bg-amber-500/10' : 'bg-white/5'\)\}>\n                                \{finalGrade !== null \? \(\n                                  <span className=\{'font-bold px-2 py-0\.5 rounded text-xs ' \+ \(isDefinitivaLow \? 'text-rose-400' : \(\!isEvalFinal && \!isMejoramiento && grade\?\.reinforcementGrade \!= null\) \? 'text-emerald-400' : 'text-slate-200'\)\}>\n                                    \{formatGrade\(finalGrade\)\}\n                                  </span>\n                                \) : \(\n                                  <span className=\"text-slate-600\">-</span>\n                                \)\}\n                              </td>\n                            </React\.Fragment>"""

new_matriz_td = """                            <React.Fragment key={student.id + '-' + activity.id}>
                              {/* Eq10 and Reinforcement Eq10 ONLY */}
                              <td className={'px-3 py-2 md:px-4 md:py-3 text-center border-r border-white/5 ' + (isDefinitivaLow ? 'bg-amber-500/5' : '')}>
                                <div className="flex flex-col items-center justify-center">
                                  <span className={`font-semibold ${isRequiringReinforcement && grade?.reinforcementGrade == null ? 'text-amber-500' : 'text-slate-200'}`}>
                                    {origEq10 !== null ? formatGrade(origEq10) : '-'}
                                  </span>
                                  {refEq10 !== null && (
                                    <span className="text-[11px] sm:text-xs text-emerald-400 font-medium mt-0.5 bg-emerald-500/10 px-1.5 rounded">
                                      R: {formatGrade(refEq10)}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </React.Fragment>"""

content = re.sub(old_matriz_td, new_matriz_td, content)

# Remove the maxScore inputs from the Matriz header because it's read-only now
old_matriz_th = r"""                            <div className=\"flex items-center justify-center gap-2 mt-1 bg-black/20 p-1\.5 rounded-lg border border-white/5 w-full\">\n                              \{hasGlob && \(\n                                <div className=\"flex flex-col items-center gap-1\">\n                                  <span className=\"text-\[9px\] text-slate-400 uppercase\">Base Glob\.</span>\n                                  <input[^>]+/>\n                                </div>\n                              \)\}\n                              <div className=\"flex flex-col items-center gap-1\">\n                                <span className=\"text-\[9px\] text-slate-400 uppercase\">\{isEvalFinal \? 'Base Escrita' : 'Base Orig\.'\}</span>\n                                <input[^>]+/>\n                              </div>\n                              \{\!isEvalFinal && \!isMejoramiento && \(\n                                <div className=\"flex flex-col items-center gap-1\">\n                                  <span className=\"text-\[9px\] text-slate-400 uppercase\">Base Ref\.</span>\n                                  <input[^>]+/>\n                                </div>\n                              \)\}\n                            </div>"""

content = re.sub(old_matriz_th, "", content)

# We also need to fix the colSpan logic in Matriz th
content = re.sub(
    r"let colSpan = 3;\n\s*if \(\!isEvalFinal && \!isMejoramiento\) \{\n\s*colSpan \+= 2;\n\s*\}\n\s*if \(hasGlob\) \{\n\s*colSpan \+= 1;\n\s*\}",
    r"let colSpan = 1;",
    content
)

with open('src/components/DocenteView.tsx', 'w') as f:
    f.write(content)
