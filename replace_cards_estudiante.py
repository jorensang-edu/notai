import re

with open('src/components/EstudianteView.tsx', 'r') as f:
    content = f.read()

old_cards = """          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 md:p-6 rounded-2xl flex flex-col justify-center">
              <div className="flex-1">
                <p className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">Estudiante</p>
                <h2 className="text-2xl font-bold">{currentStudent.name}</h2>
                <p className="text-sm text-emerald-400 font-mono mt-1">{currentStudent.course} • {currentStudent.code}</p>
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 md:p-6 rounded-2xl flex flex-col justify-center relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                 <GraduationCap className="w-16 h-16 text-emerald-400" />
               </div>
               <p className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 relative z-10">Promedio {selectedComponent === 'ALL' ? 'General' : selectedComponent}</p>
               <p className={`text-3xl md:text-4xl font-bold relative z-10 ${studentData?.average !== null && studentData!.average < 7 ? 'text-amber-500' : 'text-emerald-400'}`}>
                 {formatGrade(studentData?.average ?? null)}
               </p>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 md:p-6 rounded-2xl flex flex-col justify-center relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                 <AlertCircle className="w-16 h-16 text-blue-400" />
               </div>
               <p className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 relative z-10">Total Refuerzos (Global)</p>
               <p className="text-3xl md:text-4xl font-bold relative z-10 text-blue-400">
                 {studentData?.totalReinforcements ?? 0}
               </p>
            </div>
          </div>"""

new_cards = """          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex flex-col justify-center mb-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">Estudiante</p>
                <h2 className="text-xl md:text-2xl font-bold">{currentStudent.name}</h2>
                <p className="text-sm text-emerald-400 font-mono mt-1">{currentStudent.course} • {currentStudent.code}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Refuerzos</p>
                <p className="text-xl md:text-2xl font-bold text-blue-400">{studentData?.totalReinforcements ?? 0}</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 md:p-6 rounded-2xl flex flex-col justify-center relative overflow-hidden">
               <p className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 relative z-10">Prom. {selectedComponent === 'ALL' ? 'Trimestral' : selectedComponent}</p>
               <p className={`text-3xl font-bold relative z-10 ${studentData?.averageAporte !== null && studentData!.averageAporte < 7 ? 'text-rose-400' : 'text-slate-200'}`}>
                 {formatGrade(studentData?.averageAporte ?? null)}
               </p>
            </div>
            <div className="bg-[#0f172a]/60 backdrop-blur-md border border-white/10 p-4 md:p-6 rounded-2xl flex flex-col justify-center relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-5">
                 <GraduationCap className="w-12 h-12 text-blue-400" />
               </div>
               <p className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 relative z-10">Prom. Trimestral (40-40-20)</p>
               <p className={`text-3xl font-bold relative z-10 ${studentData?.averageTrimestral !== null && studentData!.averageTrimestral < 7 ? 'text-amber-500' : 'text-blue-400'}`}>
                 {formatGrade(studentData?.averageTrimestral ?? null)}
               </p>
            </div>
            <div className="bg-emerald-900/10 backdrop-blur-md border border-emerald-500/20 p-4 md:p-6 rounded-2xl flex flex-col justify-center relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                 <GraduationCap className="w-16 h-16 text-emerald-400" />
               </div>
               <p className="text-[11px] sm:text-xs font-bold text-emerald-500/70 uppercase tracking-widest mb-1 relative z-10">Promedio Anual</p>
               <p className={`text-3xl md:text-4xl font-bold relative z-10 ${studentData?.averageAnual !== null && studentData!.averageAnual < 7 ? 'text-rose-400' : 'text-emerald-400'}`}>
                 {formatGrade(studentData?.averageAnual ?? null)}
               </p>
            </div>
          </div>"""

content = content.replace(old_cards, new_cards)

# Also need to update the failing calculation in failingSubjects
old_failing = """      const average = gradedCount > 0 ? totalScore / gradedCount : null;
      return average !== null && average < 7;"""

new_failing = """      const currentTrim = selectedTrimestre === 'ALL' ? '1º Trimestre' : selectedTrimestre;
      const averageAnual = calculateAnnualAverage(currentStudent.id, activities, grades, currentStudent.course, subject);
      const averageTrimestral = calculateTrimestralAverage(currentStudent.id, activities, grades, currentTrim, currentStudent.course, subject);
      const average = averageAnual !== null ? averageAnual : averageTrimestral;
      return average !== null && average < 7;"""

content = content.replace(old_failing, new_failing)

with open('src/components/EstudianteView.tsx', 'w') as f:
    f.write(content)
