import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { Student, Level, SubjectName, Trimestre, EvaluationComponent } from '../types';
import { calculateFinalGrade, formatGrade, getCurrentFormattedDate, calculateComponentAverage, calculateTrimestralAverage, calculateAnnualAverage } from '../utils';
import { Search, LogOut, Calendar, AlertCircle, User, GraduationCap, Download } from 'lucide-react';

interface EstudianteViewProps {
  onLogout: () => void;
  store: ReturnType<typeof useAppStore>;
}

export function EstudianteView({ onLogout, store }: EstudianteViewProps) {
  const { students, activities, grades, courseParams } = store;
  
  const [inputCode, setInputCode] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<Level>('Básica Superior');
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [error, setError] = useState('');
  
  const [selectedSubject, setSelectedSubject] = useState<SubjectName>('Matemáticas');
  const [selectedTrimestre, setSelectedTrimestre] = useState<Trimestre | 'ALL'>('ALL');
  const [selectedComponent, setSelectedComponent] = useState<EvaluationComponent | 'ALL'>('ALL');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find(s => s.code === inputCode.trim() && s.level === selectedLevel);
    
    if (student) {
      setCurrentStudent(student);
      setError('');
      // Default to Matemáticas upon successful login
      setSelectedSubject('Matemáticas');
    } else {
      setError(`No se encontró un estudiante con ese código en el nivel ${selectedLevel}.`);
    }
  };

  const studentData = useMemo(() => {
    if (!currentStudent) return null;

    // Filter activities for this student's course and the currently selected subject
    const studentActivities = activities.filter(a => 
      a.course === currentStudent.course && 
      a.subject === selectedSubject &&
      (selectedTrimestre === 'ALL' || a.trimestre === selectedTrimestre) &&
      (selectedComponent === 'ALL' || a.component === selectedComponent)
    );
    
    // Total reinforcements across ALL subjects and activities for this student
    const totalReinforcements = grades.filter(g => g.studentId === currentStudent.id && g.reinforcementGrade !== null).length;

    let totalScore = 0;
    let gradedCount = 0;
    const history: { activity: typeof activities[0], grade: typeof grades[0] | undefined, finalGrade: number | null }[] = [];
    const pending: { activity: typeof activities[0] }[] = [];
    const requiresReinforcement: { activity: typeof activities[0], finalGrade: number }[] = [];

    studentActivities.forEach(activity => {
      const grade = grades.find(g => g.studentId === currentStudent.id && g.activityId === activity.id);
      const isEvalFinal = activity.component === 'EVALUACIÓN FINAL';
      const origEq10 = grade ? (
        isEvalFinal ? (
          (activity.hasGlobalization && grade.globalizationGrade != null) 
            ? (((grade.globalizationGrade/(activity.globalizationMaxScore||10))*10)*0.2 + ((grade.originalGrade||0)/(activity.maxScore||10))*10*0.8) 
            : (grade.originalGrade!=null ? (grade.originalGrade/(activity.maxScore||10))*10 : null)
        ) : (grade.originalGrade!=null ? (grade.originalGrade/(activity.maxScore||10))*10 : null)
      ) : null;
      const finalGrade = origEq10 !== null ? (isEvalFinal ? origEq10 : calculateFinalGrade(origEq10, grade?.reinforcementGrade ?? null, 10, activity.reinforcementMaxScore)) : null;

      if (finalGrade !== null) {
        totalScore += finalGrade;
        gradedCount++;
        history.push({ activity, grade, finalGrade });
        
        if (finalGrade < 7) {
          requiresReinforcement.push({ activity, finalGrade });
        }
      } else {
        pending.push({ activity });
        history.push({ activity, grade: undefined, finalGrade: null }); // Show pending in history too
      }
    });

    const average = gradedCount > 0 ? totalScore / gradedCount : null;

    const activeTrimestre = selectedTrimestre === 'ALL' ? (courseParams?.trimestre || '1º Trimestre') : selectedTrimestre;

    const averageAporte = selectedComponent !== 'ALL'
      ? calculateComponentAverage(currentStudent.id, activities, grades, activeTrimestre, selectedComponent as any, currentStudent.course, selectedSubject)
      : average;

    const averageTrimestral = calculateTrimestralAverage(currentStudent.id, activities, grades, activeTrimestre, currentStudent.course, selectedSubject);
    const averageAnual = calculateAnnualAverage(currentStudent.id, activities, grades, currentStudent.course, selectedSubject);

    return { 
      history, 
      pending, 
      requiresReinforcement, 
      average, 
      averageAporte, 
      averageTrimestral, 
      averageAnual, 
      totalReinforcements 
    };
  }, [currentStudent, activities, grades, selectedSubject, selectedTrimestre, selectedComponent, courseParams]);

  const allSubjects: SubjectName[] = [
    'Matemáticas', 'Lengua y Literatura', 'Ciencias Naturales', 'Biología',
    'Química', 'Física', 'Diplomado', 'Educación Física',
    'Indagación', 'Filosofía', 'Patrimonio', 'Ciudadanía', 'Ciencias Sociales', 'Investigación'
  ];

  const failingSubjects = useMemo(() => {
    if (!currentStudent) return [];
    
    return allSubjects.filter(subject => {
      const studentActivities = activities.filter(a => 
        a.course === currentStudent.course && 
        a.subject === subject &&
        (selectedTrimestre === 'ALL' || a.trimestre === selectedTrimestre) &&
        (selectedComponent === 'ALL' || a.component === selectedComponent)
      );
      let totalScore = 0;
      let gradedCount = 0;
      
      studentActivities.forEach(activity => {
        const grade = grades.find(g => g.studentId === currentStudent.id && g.activityId === activity.id);
        const isEvalFinal = activity.component === 'EVALUACIÓN FINAL';
        const origEq10 = grade ? (
        isEvalFinal ? (
          (activity.hasGlobalization && grade.globalizationGrade != null) 
            ? (((grade.globalizationGrade/(activity.globalizationMaxScore||10))*10)*0.2 + ((grade.originalGrade||0)/(activity.maxScore||10))*10*0.8) 
            : (grade.originalGrade!=null ? (grade.originalGrade/(activity.maxScore||10))*10 : null)
        ) : (grade.originalGrade!=null ? (grade.originalGrade/(activity.maxScore||10))*10 : null)
      ) : null;
        const finalGrade = origEq10 !== null ? (isEvalFinal ? origEq10 : calculateFinalGrade(origEq10, grade?.reinforcementGrade ?? null, 10, activity.reinforcementMaxScore)) : null;
        if (finalGrade !== null) {
          totalScore += finalGrade;
          gradedCount++;
        }
      });
      
      const currentTrim = selectedTrimestre === 'ALL' ? '1º Trimestre' : selectedTrimestre;
      const averageAnual = calculateAnnualAverage(currentStudent.id, activities, grades, currentStudent.course, subject);
      const averageTrimestral = calculateTrimestralAverage(currentStudent.id, activities, grades, currentTrim, currentStudent.course, subject);
      const average = averageAnual !== null ? averageAnual : averageTrimestral;
      return average !== null && average < 7;
    });
  }, [currentStudent, activities, grades, selectedTrimestre, selectedComponent]);


  const today = getCurrentFormattedDate();

  if (!currentStudent) {
    return (
      <div className="w-full flex items-center justify-center p-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl max-w-md w-full relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-blue-500"></div>
          
          <div className="flex justify-between items-center mb-8">
             <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center border border-emerald-500/30">
               <GraduationCap className="w-5 h-5 text-emerald-400" />
             </div>
             <button onClick={onLogout} className="text-slate-400 hover:text-white transition-colors">
               <LogOut className="w-5 h-5" />
             </button>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Portal Estudiante</h2>
          <p className="text-slate-400 mb-8 text-sm">
            Seleccione su nivel e ingrese su código único para acceder al boletín.
          </p>
          
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Nivel Educativo</label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value as Level)}
                className="w-full px-4 py-3 bg-[#0f172a] border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-slate-200 transition-colors"
              >
                <option value="Básica Superior">Básica Superior</option>
                <option value="Bachillerato">Bachillerato</option>
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Código de Estudiante</label>
              <div className="relative">
                <Search className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder="Ej: 03313"
                  className="w-full pl-12 pr-4 py-3 bg-[#0f172a] border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-slate-200 font-mono transition-colors"
                  required
                />
              </div>
            </div>
            {error && <p className="text-rose-400 text-sm mb-6 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">{error}</p>}
            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20"
            >
              Consultar Calificaciones
            </button>
          </form>
        </div>
      </div>
    );
  }

  const isBasica = currentStudent.level === 'Básica Superior';

  return (
    <div className="w-full flex flex-col overflow-hidden h-full">
      <header className="flex items-center justify-between px-8 py-6 bg-white/5 backdrop-blur-xl border-b border-white/10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <span className="font-bold text-xl text-white">N</span>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">NotAI <span className="text-emerald-400 font-medium text-sm ml-2">Portal Estudiante</span></h1>
            <p className="text-xs text-slate-400 uppercase tracking-widest">Boletín Día a Día</p>
          </div>
        </div>
        <div className="flex items-center gap-4 md:p-6">
          <div className="flex flex-col items-end">
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-tighter">Fecha Actual</span>
            <span className="text-sm font-bold">{today}</span>
          </div>
          <div className="h-8 w-px bg-white/10 hidden sm:block"></div>
          <button
            onClick={() => setCurrentStudent(null)}
            className="flex items-center space-x-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:block">Salir</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Tarjeta de Información del Estudiante */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 md:p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30 shrink-0">
                <User className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <p className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">Estudiante</p>
                <h2 className="text-xl md:text-2xl font-bold text-slate-100">{currentStudent.name}</h2>
                <p className="text-sm text-emerald-400 font-mono mt-0.5">{currentStudent.course} • {currentStudent.code}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/5 px-4 py-2.5 rounded-xl border border-white/5 self-stretch sm:self-auto justify-between sm:justify-start">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="text-right sm:text-left">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Refuerzos Globales</p>
                <p className="text-lg font-bold text-blue-400">{studentData?.totalReinforcements ?? 0}</p>
              </div>
            </div>
          </div>

          {/* Tres Promedios Independientes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 1. Promedio por aporte */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 md:p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden">
              <div>
                <p className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  1. Promedio por Aporte
                </p>
                <p className="text-xs text-slate-500 truncate mb-3">
                  {selectedComponent === 'ALL' ? 'General (Todos los aportes)' : selectedComponent}
                </p>
              </div>
              <div className="flex items-baseline justify-between">
                <p className={`text-3xl md:text-4xl font-bold ${studentData?.averageAporte !== null && studentData!.averageAporte < 7 ? 'text-amber-500' : 'text-slate-100'}`}>
                  {formatGrade(studentData?.averageAporte ?? null)}
                </p>
                <span className="text-[11px] text-slate-500 font-medium">/ 10.00</span>
              </div>
            </div>

            {/* 2. Promedio Trimestral (40-40-20) */}
            <div className="bg-blue-950/20 backdrop-blur-md border border-blue-500/20 p-4 md:p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <GraduationCap className="w-14 h-14 text-blue-400" />
              </div>
              <div>
                <p className="text-[11px] sm:text-xs font-bold text-blue-400 uppercase tracking-wider mb-1 relative z-10">
                  2. Promedio Trimestral
                </p>
                <p className="text-xs text-blue-300/70 truncate mb-3 relative z-10">
                  Ponderado (40% A1 + 40% A2 + 20% EF)
                </p>
              </div>
              <div className="flex items-baseline justify-between relative z-10">
                <p className={`text-3xl md:text-4xl font-bold ${studentData?.averageTrimestral !== null && studentData!.averageTrimestral < 7 ? 'text-amber-500' : 'text-blue-400'}`}>
                  {formatGrade(studentData?.averageTrimestral ?? null)}
                </p>
                <span className="text-[11px] text-blue-300/60 font-medium">/ 10.00</span>
              </div>
            </div>

            {/* 3. Promedio Anual (Progresivo 3 trimestres) */}
            <div className="bg-emerald-950/20 backdrop-blur-md border border-emerald-500/30 p-4 md:p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-15">
                <GraduationCap className="w-14 h-14 text-emerald-400" />
              </div>
              <div>
                <p className="text-[11px] sm:text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1 relative z-10">
                  3. Promedio Anual
                </p>
                <p className="text-xs text-emerald-300/70 truncate mb-3 relative z-10">
                  Acumulado Progresivo (3 Trimestres)
                </p>
              </div>
              <div className="flex items-baseline justify-between relative z-10">
                <p className={`text-3xl md:text-4xl font-bold ${studentData?.averageAnual !== null && studentData!.averageAnual < 7 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {formatGrade(studentData?.averageAnual ?? null)}
                </p>
                <span className="text-[11px] text-emerald-300/60 font-medium">/ 10.00</span>
              </div>
            </div>
          </div>

          {failingSubjects.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-400 mb-1">Atención requerida</h4>
                <p className="text-xs text-amber-500/90">
                  Tienes un promedio menor a 7 en: <span className="font-semibold">{failingSubjects.join(', ')}</span>.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-xl flex items-center gap-4 flex-1">
              <span className="text-sm font-bold text-slate-400">Asignatura:</span>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value as SubjectName)}
                className="flex-1 px-4 py-2 bg-[#0f172a] border border-white/10 rounded-lg focus:outline-none focus:border-emerald-500 text-sm font-semibold text-slate-200"
              >
                {allSubjects.map(subject => (
                  <option key={subject} value={subject}>
                    {subject} {failingSubjects.includes(subject) ? '⚠️ (Promedio < 7)' : ''}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-xl flex items-center gap-4 flex-1">
              <span className="text-sm font-bold text-slate-400">Trimestre:</span>
              <select
                value={selectedTrimestre}
                onChange={(e) => setSelectedTrimestre(e.target.value as any)}
                className="flex-1 px-4 py-2 bg-[#0f172a] border border-white/10 rounded-lg focus:outline-none focus:border-emerald-500 text-sm font-semibold text-slate-200"
              >
                <option value="ALL">Todos los Trimestres</option>
                <option value="1º Trimestre">1º Trimestre</option>
                <option value="2º Trimestre">2º Trimestre</option>
                <option value="3º Trimestre">3º Trimestre</option>
              </select>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-xl flex items-center gap-4 flex-1">
              <span className="text-sm font-bold text-slate-400">Aporte:</span>
              <select
                value={selectedComponent}
                onChange={(e) => setSelectedComponent(e.target.value as any)}
                className="flex-1 px-4 py-2 bg-[#0f172a] border border-white/10 rounded-lg focus:outline-none focus:border-emerald-500 text-sm font-semibold text-slate-200"
              >
                <option value="ALL">Todos los Aportes</option>
                <option value="1º APORTE">1º APORTE</option>
                <option value="2º APORTE">2º APORTE</option>
                <option value="EVALUACIÓN FINAL">EVALUACIÓN FINAL</option>
                <option value="SUPLETORIO">SUPLETORIO</option>
                <option value="MEJORAMIENTO">MEJORAMIENTO</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:p-6">
            <div className="md:col-span-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden flex flex-col">
              <div className="px-4 py-3 md:px-6 md:py-4 bg-white/5 border-b border-white/10">
                <h3 className="font-bold flex items-center gap-2">Historial Cronológico</h3>
              </div>
              <div className="p-4 md:p-6 space-y-6 overflow-y-auto">
                {studentData?.history.length === 0 ? (
                  <p className="text-slate-500 italic text-sm">No hay actividades registradas.</p>
                ) : (
                  studentData?.history.map(({ activity, grade, finalGrade }) => {
                    const isReinforcement = finalGrade !== null && finalGrade < 7;
                    return (
                      <div key={activity.id} className="relative pl-6 pb-2 border-l border-white/10 last:border-0 last:pb-0">
                        <div className={`absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full ${isReinforcement ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'}`}></div>
                        
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-2 mb-2">
                          <div>
                            <p className="font-bold text-slate-200">{activity.name}</p>
                            <p className="text-[11px] sm:text-xs text-slate-500 uppercase tracking-widest mt-0.5">{activity.component}</p>
                          </div>
                          <div className="flex items-center gap-1 text-xs font-mono text-slate-400 bg-black/20 px-2 py-1 rounded border border-white/5 w-fit">
                            <Calendar className="w-3 h-3" />
                            {grade?.lastUpdated || activity.date}
                          </div>
                        </div>

                        <div className="bg-black/20 rounded-xl p-4 border border-white/5 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mt-3">
                          <div>
                            <p className="text-xs text-slate-500 mb-1">{activity.component === 'EVALUACIÓN FINAL' ? 'Evaluación Escrita' : 'Nota Original'}</p>
                            <p className="font-mono text-slate-300">{formatGrade(grade?.originalGrade ?? null)}</p>
                          </div>
                          {activity.component === 'EVALUACIÓN FINAL' && grade?.globalizationGrade != null && (
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Globalización</p>
                              <p className="font-mono text-slate-300">{formatGrade(grade.globalizationGrade)}</p>
                            </div>
                          )}
                          {activity.component !== 'EVALUACIÓN FINAL' && activity.component !== 'MEJORAMIENTO' && (
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Refuerzo</p>
                              {grade?.reinforcementGrade != null ? (
                                <p className="font-mono text-emerald-400">{formatGrade(grade.reinforcementGrade)}</p>
                              ) : (
                                <p className="font-mono text-slate-600">-</p>
                              )}
                            </div>
                          )}
                          <div className="col-span-2 md:col-span-1">
                            <p className="text-xs text-slate-500 mb-1">Definitiva</p>
                            <span className={`font-bold px-2 py-1 rounded border text-xs ${isReinforcement ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                              {formatGrade(finalGrade)}
                            </span>
                          </div>
                        </div>
                        {grade?.observation && (
                          <div className="mt-4 pt-3 border-t border-white/5">
                            <p className="text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wider">Observación del Docente:</p>
                            <p className="text-sm text-slate-300 italic">"{grade.observation}"</p>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="space-y-6 flex flex-col">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden p-4 md:p-6">
                <h3 className="font-bold text-sm text-slate-400 uppercase tracking-widest mb-4">Contexto Curso</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Institución</p>
                    <p className="text-sm font-semibold">{courseParams.institution}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Nivel Educativo</p>
                    <p className="text-sm font-semibold">{currentStudent.level}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Docente</p>
                    <p className="text-sm font-semibold">{courseParams.teacher}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden p-4 md:p-6 flex-1">
                <h3 className="font-bold text-sm text-slate-400 uppercase tracking-widest mb-4">Alertas</h3>
                
                <div className="space-y-4">
                  {studentData?.pending.length ? (
                    <div>
                      <p className="text-xs text-slate-500 mb-2">Pendientes de Calificar</p>
                      <ul className="space-y-1">
                        {studentData.pending.map(p => (
                          <li key={p.activity.id} className="text-sm text-slate-300 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                            {p.activity.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div>
                    <p className="text-xs text-amber-500/80 mb-2 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Requieren Refuerzo (&lt; 7.00)
                    </p>
                    {studentData?.requiresReinforcement.length ? (
                      <ul className="space-y-1">
                        {studentData.requiresReinforcement.map(r => (
                          <li key={r.activity.id} className="text-sm text-amber-400 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            {r.activity.name}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-emerald-400/80 italic">Excelente, no hay alertas.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
