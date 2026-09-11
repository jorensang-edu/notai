import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { Student, Level, SubjectName, Trimestre, EvaluationComponent } from '../types';
import { 
  calculateFinalGrade, 
  formatGrade, 
  getCurrentFormattedDate, 
  calculateComponentAverage, 
  calculateTrimestralAverage, 
  calculateAnnualAverage,
  computeActivityFinalGrade,
  countStudentReinforcementsForSubject,
  getStudentGlobalImprovementStats
} from '../utils';
import { Search, LogOut, Calendar, AlertCircle, User, GraduationCap, Download, CheckCircle2 } from 'lucide-react';
import { auth } from '../firebase';
import { validateEmailForRole, checkCodeBinding, saveCodeBinding, getEmailDomainType } from '../authUtils';

interface EstudianteViewProps {
  onLogout: () => void;
  store: ReturnType<typeof useAppStore>;
}

export function EstudianteView({ onLogout, store }: EstudianteViewProps) {
  const { students, activities, grades, courseParams } = store;
  
  const currentUser = auth.currentUser;
  const userEmail = currentUser?.email || '';
  const domainType = getEmailDomainType(userEmail);

  const [inputCode, setInputCode] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<Level>('Básica Superior');
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [error, setError] = useState('');
  
  const [selectedSubject, setSelectedSubject] = useState<SubjectName>('Matemáticas');
  const [selectedTrimestre, setSelectedTrimestre] = useState<Trimestre | 'ALL'>('ALL');
  const [selectedComponent, setSelectedComponent] = useState<EvaluationComponent | 'ALL'>('ALL');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = inputCode.trim();

    // 1. Verify institutional email domain
    const emailVal = validateEmailForRole(userEmail, 'estudiante');
    if (!emailVal.isValid) {
      setError(emailVal.errorMessage || 'Acceso restringido: Se requiere una cuenta @stu.cedfi.edu.ec.');
      return;
    }

    // 2. Find student
    const student = students.find(s => s.code === cleanCode && s.level === selectedLevel);
    if (!student) {
      setError(`No se encontró un estudiante con el código ${cleanCode} en el nivel ${selectedLevel}.`);
      return;
    }

    // 3. Verify account-to-code binding
    const bindingCheck = checkCodeBinding(userEmail, cleanCode, 'estudiante');
    if (!bindingCheck.allowed) {
      setError(bindingCheck.message || 'Este código ya está vinculado a otra cuenta institucional.');
      return;
    }

    // 4. Save binding to lock this student profile to this Google account
    saveCodeBinding(userEmail, cleanCode, 'estudiante');
    setCurrentStudent(student);
    setError('');
    // Default to Matemáticas upon successful login
    setSelectedSubject('Matemáticas');
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
    
    // Total reinforcements filtered strictly by selectedSubject for this student across all trimestres
    const totalReinforcementsSubject = countStudentReinforcementsForSubject(
      currentStudent.id, 
      activities, 
      grades, 
      selectedSubject, 
      currentStudent.course
    );

    let totalScore = 0;
    let gradedCount = 0;
    const history: { 
      activity: typeof activities[0], 
      grade: typeof grades[0] | undefined, 
      finalGrade: number | null,
      origEq10: number | null,
      efDetails?: ReturnType<typeof computeActivityFinalGrade>['efDetails']
    }[] = [];
    const pending: { activity: typeof activities[0] }[] = [];
    const requiresReinforcement: { activity: typeof activities[0], finalGrade: number }[] = [];

    studentActivities.forEach(activity => {
      const grade = grades.find(g => g.studentId === currentStudent.id && g.activityId === activity.id);
      const { finalGrade, origEq10, efDetails } = computeActivityFinalGrade(activity, grade);

      if (finalGrade !== null) {
        totalScore += finalGrade;
        gradedCount++;
        history.push({ activity, grade, finalGrade, origEq10, efDetails });
        
        if (finalGrade < 7) {
          requiresReinforcement.push({ activity, finalGrade });
        }
      } else {
        pending.push({ activity });
        history.push({ activity, grade: undefined, finalGrade: null, origEq10: null });
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
      totalReinforcementsSubject 
    };
  }, [currentStudent, activities, grades, selectedSubject, selectedTrimestre, selectedComponent, courseParams]);

  const allSubjects: SubjectName[] = [
    'Matemáticas', 'Lengua y Literatura', 'Ciencias Naturales', 'Biología',
    'Química', 'Física', 'Diplomado',
    'Indagación', 'Filosofía', 'Patrimonio', 'Ciudadanía', 'Ciencias Sociales', 'Investigación'
  ];

  const failingSubjects = useMemo(() => {
    if (!currentStudent) return [];
    
    return allSubjects.filter(subject => {
      const currentTrim = selectedTrimestre === 'ALL' ? (courseParams?.trimestre || '1º Trimestre') : selectedTrimestre;
      const averageAnual = calculateAnnualAverage(currentStudent.id, activities, grades, currentStudent.course, subject);
      const averageTrimestral = calculateTrimestralAverage(currentStudent.id, activities, grades, currentTrim, currentStudent.course, subject);
      const average = averageAnual !== null ? averageAnual : averageTrimestral;
      return average !== null && average < 7;
    });
  }, [currentStudent, activities, grades, selectedTrimestre, courseParams]);

  const globalImprovementStats = useMemo(() => {
    if (!currentStudent) return null;
    return getStudentGlobalImprovementStats(currentStudent.id, activities, grades, currentStudent.course);
  }, [currentStudent, activities, grades]);

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
          <p className="text-slate-400 mb-4 text-sm">
            Seleccione su nivel e ingrese su código único para acceder al boletín.
          </p>

          {userEmail && (
            <div className="mb-6 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
              <span className="text-slate-400">Cuenta activa:</span>
              <span className="font-mono font-semibold text-emerald-300 truncate max-w-[200px]">{userEmail}</span>
            </div>
          )}
          
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
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Refuerzos Globales ({selectedSubject})
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-lg font-bold text-blue-400">{studentData?.totalReinforcementsSubject ?? 0}</p>
                  <span className="text-[10px] text-slate-400">acumulados</span>
                </div>
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

          {/* Panel de Mejoramientos Globales (Todas las Asignaturas en el Año Lectivo) */}
          {globalImprovementStats && (
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-purple-400" />
                    Panel de Mejoramientos Globales (Año Lectivo)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Límites consolidados en todas las asignaturas para procesos de mejoramiento
                  </p>
                </div>
                <span className="text-[11px] font-mono text-purple-300/90 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-full self-start sm:self-auto">
                  Control Normativo Anual
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Mejora Directa (7.00 a 8.99) */}
                <div className="bg-purple-950/20 border border-purple-500/20 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block">
                          Categoría 1
                        </span>
                        <h4 className="text-sm font-bold text-slate-100">
                          Mejora Directa (7.00 - 8.99)
                        </h4>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        globalImprovementStats.mejoraDirecta.isLimitReached
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                      }`}>
                        {globalImprovementStats.mejoraDirecta.isLimitReached ? 'Límite Anual Alcanzado' : 'Disponible'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                      Examen escrito de mejoramiento. Límite reglamentario: <strong className="text-purple-300">máximo 3 en el año lectivo</strong> y <strong className="text-purple-300">máximo 1 por trimestre</strong>.
                    </p>

                    <div className="space-y-2 mb-3">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-400">Total acumulado en el año:</span>
                        <span className="font-mono text-purple-300">
                          {globalImprovementStats.mejoraDirecta.totalUsed} / {globalImprovementStats.mejoraDirecta.maxAllowed}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                        <div 
                          className={`h-full transition-all duration-300 ${
                            globalImprovementStats.mejoraDirecta.isLimitReached ? 'bg-rose-500' : 'bg-purple-500'
                          }`}
                          style={{ width: `${Math.min(100, (globalImprovementStats.mejoraDirecta.totalUsed / globalImprovementStats.mejoraDirecta.maxAllowed) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-center">
                      {(['1º Trimestre', '2º Trimestre', '3º Trimestre'] as Trimestre[]).map(t => {
                        const trimData = globalImprovementStats.mejoraDirecta.byTrimestre[t];
                        return (
                          <div key={t} className="bg-black/30 p-2 rounded-lg border border-white/5">
                            <span className="text-[10px] text-slate-400 block font-medium">{t.replace(' Trimestre', 'T')}</span>
                            <span className={`text-xs font-mono font-bold ${trimData.isLimitReached ? 'text-rose-400' : 'text-purple-300'}`}>
                              {trimData.used} / {trimData.maxAllowed}
                            </span>
                            <span className={`text-[9px] block ${trimData.isLimitReached ? 'text-rose-400 font-semibold' : 'text-slate-500'}`}>
                              {trimData.isLimitReached ? 'Límite' : 'Disponible'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {globalImprovementStats.mejoraDirecta.activities.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-white/5">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Materias con mejora directa:</p>
                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                        {globalImprovementStats.mejoraDirecta.activities.map(a => (
                          <div key={a.activityId} className="text-[11px] flex justify-between bg-black/20 px-2 py-1 rounded text-slate-300">
                            <span className="truncate">{a.subject} ({a.trimestre.replace(' Trimestre', 'T')})</span>
                            <span className="font-mono text-purple-300 shrink-0 ml-1">
                              {formatGrade(a.origEq10)} ➔ {formatGrade(a.finalGrade)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Mejora con Refuerzo Pedagógico (0.01 a 6.99) */}
                <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">
                          Categoría 2
                        </span>
                        <h4 className="text-sm font-bold text-slate-100">
                          Mejora con Refuerzo Pedagógico (0.01 - 6.99)
                        </h4>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        globalImprovementStats.mejoraRefuerzo.isLimitReached
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}>
                        {globalImprovementStats.mejoraRefuerzo.isLimitReached ? 'Límite Anual Alcanzado' : 'Disponible'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                      Trabajo de refuerzo y examen escrito obligatorios. Límite reglamentario: <strong className="text-amber-300">máximo 6 en todo el año lectivo</strong>.
                    </p>

                    <div className="space-y-2 mb-3">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-400">Total acumulado en el año:</span>
                        <span className="font-mono text-amber-300">
                          {globalImprovementStats.mejoraRefuerzo.totalUsed} / {globalImprovementStats.mejoraRefuerzo.maxAllowed}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                        <div 
                          className={`h-full transition-all duration-300 ${
                            globalImprovementStats.mejoraRefuerzo.isLimitReached ? 'bg-rose-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(100, (globalImprovementStats.mejoraRefuerzo.totalUsed / globalImprovementStats.mejoraRefuerzo.maxAllowed) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="bg-black/30 p-2.5 rounded-lg border border-white/5 text-center">
                      <span className="text-[10px] text-slate-400 block font-medium">Disponibilidad en el año lectivo</span>
                      <span className={`text-sm font-mono font-bold ${globalImprovementStats.mejoraRefuerzo.isLimitReached ? 'text-rose-400' : 'text-amber-300'}`}>
                        {globalImprovementStats.mejoraRefuerzo.maxAllowed - globalImprovementStats.mejoraRefuerzo.totalUsed} de {globalImprovementStats.mejoraRefuerzo.maxAllowed} mejoras disponibles
                      </span>
                    </div>
                  </div>

                  {globalImprovementStats.mejoraRefuerzo.activities.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-white/5">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Materias con mejora con refuerzo:</p>
                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                        {globalImprovementStats.mejoraRefuerzo.activities.map(a => (
                          <div key={a.activityId} className="text-[11px] flex justify-between bg-black/20 px-2 py-1 rounded text-slate-300">
                            <span className="truncate">{a.subject} ({a.trimestre.replace(' Trimestre', 'T')})</span>
                            <span className="font-mono text-amber-300 shrink-0 ml-1">
                              {formatGrade(a.origEq10)} ➔ {formatGrade(a.finalGrade)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notificación de Alerta de Evaluación Final (< 7.00 sin mejoramiento) */}
          {globalImprovementStats && globalImprovementStats.unimprovedAlerts.length > 0 && (
            <div className="bg-amber-500/15 border border-amber-500/30 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-amber-300">
                  Alerta en Evaluación Final: Calificaciones inferiores a 7.00 puntos
                </h4>
                <p className="text-xs text-amber-200/90 leading-relaxed">
                  Tienes una alerta en las siguientes asignaturas por haber obtenido una calificación menor a 7.00 puntos en la Evaluación Final. Al no registrarse el proceso de mejoramiento obligatorio (trabajo de refuerzo y examen escrito), <strong>para el cálculo trimestral se mantiene la calificación original de la evaluación final</strong>:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {globalImprovementStats.unimprovedAlerts.map(alert => (
                    <span 
                      key={alert.activityId} 
                      className="text-xs bg-black/40 border border-amber-500/30 px-3 py-1.5 rounded-lg text-amber-200 font-mono flex items-center gap-1.5"
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      <strong>{alert.subject}</strong> ({alert.trimestre}): {formatGrade(alert.origEq10)} / 10.00
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

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
                  studentData?.history.map(({ activity, grade, finalGrade, origEq10, efDetails }) => {
                    const isReinforcement = finalGrade !== null && finalGrade < 7;
                    const isEvalFinal = activity.component === 'EVALUACIÓN FINAL';
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

                        <div className="bg-black/20 rounded-xl p-4 border border-white/5 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3">
                          <div>
                            <p className="text-xs text-slate-500 mb-1">{isEvalFinal ? 'Evaluación Escrita' : 'Nota Original'}</p>
                            <p className="font-mono text-slate-300">
                              {grade?.originalGrade != null ? `${formatGrade(grade.originalGrade)} / ${activity.maxScore || 10}` : '-'}
                            </p>
                          </div>
                          {isEvalFinal && activity.hasGlobalization && (
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Globalización (20%)</p>
                              <p className="font-mono text-slate-300">
                                {grade?.globalizationGrade != null ? `${formatGrade(grade.globalizationGrade)} / ${activity.globalizationMaxScore || 10}` : '-'}
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Nota Inicial (Eq. 10)</p>
                            <p className="font-mono text-blue-400 font-semibold">
                              {origEq10 !== null ? formatGrade(origEq10) : '-'}
                            </p>
                          </div>
                          {!isEvalFinal && activity.component !== 'MEJORAMIENTO' && (
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Refuerzo</p>
                              {grade?.reinforcementGrade != null ? (
                                <p className="font-mono text-emerald-400">
                                  {formatGrade(grade.reinforcementGrade)} / {activity.reinforcementMaxScore || activity.maxScore || 10}
                                </p>
                              ) : (
                                <p className="font-mono text-slate-600">-</p>
                              )}
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Definitiva</p>
                            <span className={`font-bold px-2 py-1 rounded border text-xs inline-block ${isReinforcement ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                              {finalGrade !== null ? formatGrade(finalGrade) : '-'}
                            </span>
                          </div>
                        </div>

                        {/* Detalle del Proceso de Mejoramiento para Evaluación Final */}
                        {isEvalFinal && efDetails && (
                          <div className="mt-3 p-3 bg-purple-950/20 rounded-xl border border-purple-500/20 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                                Proceso de Mejoramiento de Evaluación Final
                              </p>
                              {efDetails.category === 'refuerzo' && (
                                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">
                                  Mejora con Refuerzo (0.01 - 6.99)
                                </span>
                              )}
                              {efDetails.category === 'directa' && (
                                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-medium">
                                  Mejora Directa (7.00 - 8.99)
                                </span>
                              )}
                              {efDetails.category === 'none' && (
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
                                  Calificación ≥ 9.00 (Sin mejoramiento)
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                              {/* Trabajo de Refuerzo */}
                              <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                                <span className="text-slate-400 block mb-1 font-medium">Trabajo de Refuerzo</span>
                                {efDetails.category === 'refuerzo' ? (
                                  efDetails.workEq10 !== null ? (
                                    <p className="font-mono font-bold text-amber-400">
                                      {grade?.improvementWorkGrade} / {activity.improvementWorkMaxScore || 10}
                                      <span className="text-slate-400 font-normal ml-1">({formatGrade(efDetails.workEq10)} / 10)</span>
                                    </p>
                                  ) : (
                                    <p className="text-amber-400/90 italic font-medium">Obligatorio (Pendiente)</p>
                                  )
                                ) : (
                                  <p className="text-slate-500 italic">No aplica (Nota ≥ 7.00)</p>
                                )}
                              </div>

                              {/* Examen de Mejoramiento */}
                              <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                                <span className="text-slate-400 block mb-1 font-medium">Examen de Mejoramiento</span>
                                {efDetails.examEq10 !== null ? (
                                  <p className="font-mono font-bold text-purple-400">
                                    {grade?.improvementExamGrade} / {activity.improvementExamMaxScore || 10}
                                    <span className="text-slate-400 font-normal ml-1">({formatGrade(efDetails.examEq10)} / 10)</span>
                                  </p>
                                ) : (
                                  efDetails.category === 'refuerzo' ? (
                                    <p className="text-amber-400/90 italic font-medium">Obligatorio (Pendiente)</p>
                                  ) : (
                                    efDetails.category === 'directa' ? (
                                      <p className="text-slate-500 italic">Opcional (No presentado)</p>
                                    ) : (
                                      <p className="text-slate-500 italic">No aplica (Nota ≥ 9.00)</p>
                                    )
                                  )
                                )}
                              </div>

                              {/* Promedio Calculado */}
                              <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                                <span className="text-slate-400 block mb-1 font-medium">Promedio Obtenido</span>
                                <p className="font-mono font-bold text-slate-200">
                                  {efDetails.calculatedAvg !== null ? `${formatGrade(efDetails.calculatedAvg)} / 10` : '-'}
                                </p>
                              </div>
                            </div>

                            {/* Mensajes explícitos según requerimientos normativos */}
                            {efDetails.hasNoRecord && (
                              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
                                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                <div className="text-xs text-amber-200 space-y-1">
                                  <p className="font-bold text-amber-300">
                                    Alerta en Evaluación Final: Calificación menor a 7.00 puntos
                                  </p>
                                  <p className="text-amber-200/90 leading-relaxed">
                                    Obtuviste una calificación menor a 7.00 puntos ({formatGrade(efDetails.origEq10)}/10.00). Al no registrarse ninguna nota de mejoramiento (trabajo de refuerzo y examen escrito), <strong>para el cálculo trimestral se mantiene la calificación original de {formatGrade(efDetails.origEq10)}</strong>.
                                  </p>
                                </div>
                              </div>
                            )}

                            {efDetails.noImprovement && !efDetails.hasNoRecord && (
                              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5">
                                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                <div className="text-xs text-slate-200 space-y-1">
                                  <p className="font-bold text-rose-400">
                                    No hubo mejora de calificación de evaluación final
                                  </p>
                                  <p className="text-slate-300 leading-relaxed">
                                    El nuevo promedio resultante del proceso de mejoramiento ({formatGrade(efDetails.calculatedAvg)}) es menor o igual a la nota original ({formatGrade(efDetails.origEq10)}). 
                                    Por regla de protección al estudiante, se mantiene la calificación original de <strong className="text-white font-bold">{formatGrade(efDetails.origEq10)}</strong>.
                                  </p>
                                </div>
                              </div>
                            )}

                            {efDetails.improved && (
                              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5">
                                <div className="text-xs text-slate-200 space-y-1">
                                  <p className="font-bold text-emerald-400">
                                    ¡Mejora de calificación aplicada!
                                  </p>
                                  <p className="text-slate-300 leading-relaxed">
                                    El proceso de mejoramiento incrementó con éxito su calificación de <span className="line-through text-slate-400">{formatGrade(efDetails.origEq10)}</span> a <strong className="text-emerald-400 font-bold">{formatGrade(efDetails.finalGrade)}</strong>.
                                  </p>
                                </div>
                              </div>
                            )}

                            {efDetails.isPending && !efDetails.hasNoRecord && (
                              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
                                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                <div className="text-xs text-amber-200 space-y-1">
                                  <p className="font-bold text-amber-300">
                                    Proceso de mejoramiento en curso
                                  </p>
                                  <p className="text-amber-200/90 leading-relaxed">
                                    {efDetails.category === 'refuerzo' 
                                      ? 'Al tener una calificación inferior a 7.00 en la Evaluación Final, se requiere registrar tanto el trabajo de refuerzo como el examen de mejoramiento para computar su nota definitiva.'
                                      : 'Pendiente de confirmación de calificación de examen de mejoramiento.'}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

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
                      <p className="text-sm text-emerald-400/80 italic">Excelente, no hay alertas en esta materia.</p>
                    )}
                  </div>

                  {globalImprovementStats && globalImprovementStats.unimprovedAlerts.length > 0 && (
                    <div className="pt-3 border-t border-white/10">
                      <p className="text-xs text-amber-400 font-semibold mb-2 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                        Eval. Finales &lt; 7 (Sin Mejora)
                      </p>
                      <ul className="space-y-1">
                        {globalImprovementStats.unimprovedAlerts.map(a => (
                          <li key={a.activityId} className="text-xs text-amber-200/90 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                            <strong>{a.subject}</strong> ({a.trimestre}): {formatGrade(a.origEq10)} (Orig.)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {globalImprovementStats && (
                    <div className="pt-3 border-t border-white/10 space-y-2">
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                        Uso de Mejoramientos
                      </p>
                      <div className="text-xs flex justify-between text-slate-300">
                        <span>Mejora directa:</span>
                        <span className="font-mono text-purple-300 font-bold">
                          {globalImprovementStats.mejoraDirecta.totalUsed} / {globalImprovementStats.mejoraDirecta.maxAllowed} (año)
                        </span>
                      </div>
                      <div className="text-xs flex justify-between text-slate-300">
                        <span>Con refuerzo:</span>
                        <span className="font-mono text-amber-300 font-bold">
                          {globalImprovementStats.mejoraRefuerzo.totalUsed} / {globalImprovementStats.mejoraRefuerzo.maxAllowed} (año)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
