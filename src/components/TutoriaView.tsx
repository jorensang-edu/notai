import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { CourseName, SubjectName, Trimestre, EvaluationComponent, Student } from '../types';
import { TUTOR_MATRIX } from '../tutorMatrix';
import { 
  computeActivityFinalGrade, 
  formatGrade, 
  getCurrentFormattedDate, 
  countStudentReinforcementsForSubject 
} from '../utils';
import { 
  Users, 
  Search, 
  Download, 
  AlertTriangle, 
  AlertOctagon, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  LogOut, 
  ShieldCheck, 
  GraduationCap, 
  BookOpen,
  Filter,
  Calendar,
  Layers,
  Mail
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { EmailNotificationModal } from './EmailNotificationModal';
import { isAdminUser } from '../authUtils';
import { auth } from '../firebase';

interface TutoriaViewProps {
  store: ReturnType<typeof useAppStore>;
  tutorCode: string;
  onLogout: () => void;
  isAdmin?: boolean;
}

const ALL_SUBJECTS: SubjectName[] = [
  'Matemáticas',
  'Lengua y Literatura',
  'Ciencias Naturales',
  'Biología',
  'Química',
  'Física',
  'Diplomado',
  'Indagación',
  'Filosofía',
  'Patrimonio',
  'Ciudadanía',
  'Ciencias Sociales',
  'Investigación'
];

export function TutoriaView({ store, tutorCode, onLogout, isAdmin: propIsAdmin }: TutoriaViewProps) {
  const { students, activities, grades, courseParams, highContrast } = store;
  const isAdmin = propIsAdmin ?? isAdminUser(auth.currentUser?.email);

  // Retrieve tutor assignment from matrix
  const tutorInfo = TUTOR_MATRIX[tutorCode];

  // If unauthorized code
  if (!tutorInfo) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="bg-slate-900/80 border border-rose-500/30 rounded-2xl p-8 max-w-md w-full text-center">
          <AlertOctagon className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Código No Autorizado</h2>
          <p className="text-slate-300 text-sm mb-6">
            El código ingresado <span className="font-mono font-bold text-rose-400">({tutorCode})</span> no cuenta con permisos registrados para el rol de Tutor.
          </p>
          <button
            onClick={onLogout}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors"
          >
            Regresar a Selección de Rol
          </button>
        </div>
      </div>
    );
  }

  // Course selector (strictly restricted to authorized courses)
  const [selectedCourse, setSelectedCourse] = useState<CourseName>(tutorInfo.courses[0]);
  const [selectedStudentCode, setSelectedStudentCode] = useState<string>('');
  const [selectedTrimestre, setSelectedTrimestre] = useState<Trimestre | 'ALL'>(courseParams?.trimestre || '1º Trimestre');
  const [selectedComponent, setSelectedComponent] = useState<EvaluationComponent | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyAlertsFilter, setOnlyAlertsFilter] = useState(false);
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [showEmailModal, setShowEmailModal] = useState(false);

  // List of students in selected course
  const courseStudents = useMemo(() => {
    return students.filter(s => s.course === selectedCourse);
  }, [students, selectedCourse]);

  // Filtered student list for quick search
  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return courseStudents;
    const term = searchTerm.toLowerCase().trim();
    return courseStudents.filter(s => 
      s.name.toLowerCase().includes(term) || s.code.includes(term)
    );
  }, [courseStudents, searchTerm]);

  // Current selected student
  const currentStudent = useMemo<Student | null>(() => {
    if (!selectedStudentCode) {
      return courseStudents.length > 0 ? courseStudents[0] : null;
    }
    return courseStudents.find(s => s.code === selectedStudentCode) || (courseStudents[0] || null);
  }, [courseStudents, selectedStudentCode]);

  // Process consolidated academic data for currentStudent
  const consolidatedData = useMemo(() => {
    if (!currentStudent) return null;

    let totalZeroAlerts = 0;
    let totalUnder7Alerts = 0;
    let totalStudentScore = 0;
    let totalGradedActivities = 0;

    const subjectsSummary = ALL_SUBJECTS.map(subject => {
      // Filter activities for this course and subject
      const subjectActivities = activities.filter(a => {
        if (a.course !== currentStudent.course || a.subject !== subject) return false;
        if (selectedTrimestre !== 'ALL' && a.trimestre !== selectedTrimestre) return false;
        if (selectedComponent !== 'ALL' && a.component !== selectedComponent) return false;
        return true;
      });

      // Sort by creation date or activity date
      subjectActivities.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      let subjectScoreSum = 0;
      let subjectGradedCount = 0;
      let zeroCount = 0;
      let under7Count = 0;

      const activityRows = subjectActivities.map(activity => {
        const grade = grades.find(g => g.studentId === currentStudent.id && g.activityId === activity.id);
        const { finalGrade, origEq10, efDetails } = computeActivityFinalGrade(activity, grade);

        let isZero = false;
        let isUnder7 = false;

        if (finalGrade !== null) {
          subjectScoreSum += finalGrade;
          subjectGradedCount++;
          totalStudentScore += finalGrade;
          totalGradedActivities++;

          if (finalGrade === 0) {
            isZero = true;
            zeroCount++;
            totalZeroAlerts++;
          } else if (finalGrade < 7) {
            isUnder7 = true;
            under7Count++;
            totalUnder7Alerts++;
          }
        }

        return {
          activity,
          grade,
          finalGrade,
          origEq10,
          efDetails,
          isZero,
          isUnder7
        };
      });

      const subjectAverage = subjectGradedCount > 0 ? subjectScoreSum / subjectGradedCount : null;
      const reinforcementsCount = countStudentReinforcementsForSubject(
        currentStudent.id,
        activities,
        grades,
        subject,
        currentStudent.course
      );

      return {
        subject,
        activities: activityRows,
        totalActivities: subjectActivities.length,
        gradedCount: subjectGradedCount,
        average: subjectAverage,
        zeroCount,
        under7Count,
        hasAlerts: zeroCount > 0 || under7Count > 0,
        reinforcementsCount
      };
    }).filter(sub => {
      // Include subjects that have activities or reinforcements
      return sub.totalActivities > 0 || sub.reinforcementsCount > 0;
    });

    const generalAverage = totalGradedActivities > 0 ? totalStudentScore / totalGradedActivities : null;
    const subjectsWithAlerts = subjectsSummary.filter(s => s.hasAlerts);

    return {
      student: currentStudent,
      subjectsSummary,
      subjectsWithAlerts,
      totalZeroAlerts,
      totalUnder7Alerts,
      totalAlerts: totalZeroAlerts + totalUnder7Alerts,
      generalAverage,
      totalGradedActivities
    };
  }, [currentStudent, activities, grades, selectedTrimestre, selectedComponent]);

  const toggleSubject = (subject: string) => {
    setExpandedSubjects(prev => ({
      ...prev,
      [subject]: prev[subject] === undefined ? false : !prev[subject]
    }));
  };

  // Export complete student history to Excel
  const handleExportExcel = () => {
    if (!currentStudent || !consolidatedData) return;

    // Detailed Activities Data
    const detailedRows: any[] = [];
    consolidatedData.subjectsSummary.forEach(sub => {
      sub.activities.forEach(row => {
        let alertStatus = 'Normal';
        if (row.isZero) {
          alertStatus = 'INCUMPLIMIENTO (0/10)';
        } else if (row.isUnder7) {
          alertStatus = 'RIESGO (< 7.00)';
        } else if (row.finalGrade !== null) {
          alertStatus = 'Aprobado';
        } else {
          alertStatus = 'Pendiente';
        }

        detailedRows.push({
          'Asignatura': sub.subject,
          'Trimestre': row.activity.trimestre || 'N/A',
          'Aporte / Componente': row.activity.component,
          'Actividad': row.activity.name,
          'Fecha': row.activity.date,
          'Nota Original (/10)': row.origEq10 !== null ? formatGrade(row.origEq10) : 'Pendiente',
          'Refuerzo / Mejora': row.grade?.reinforcementGrade !== null && row.grade?.reinforcementGrade !== undefined
            ? formatGrade(row.grade.reinforcementGrade)
            : (row.efDetails?.calculatedAvg !== null && row.efDetails?.calculatedAvg !== undefined
                ? formatGrade(row.efDetails.calculatedAvg)
                : '-'),
          'Calificación Final (/10)': row.finalGrade !== null ? formatGrade(row.finalGrade) : 'Pendiente',
          'Estado / Alerta': alertStatus
        });
      });
    });

    // Summary Per Subject
    const summaryRows = consolidatedData.subjectsSummary.map(sub => ({
      'Asignatura': sub.subject,
      'Actividades Registradas': sub.totalActivities,
      'Actividades Calificadas': sub.gradedCount,
      'Promedio Consolidado (/10)': sub.average !== null ? formatGrade(sub.average) : 'N/A',
      'Incumplimientos (0/10)': sub.zeroCount,
      'Calificaciones < 7.00': sub.under7Count,
      'Total Refuerzos Registrados': sub.reinforcementsCount,
      'Estado General': sub.zeroCount > 0 
        ? 'ALERTA CRÍTICA (0/10)' 
        : (sub.under7Count > 0 ? 'EN RIESGO (< 7.00)' : 'SATISFACTORIO')
    }));

    // Workbook construction
    const wb = XLSX.utils.book_new();

    // Sheet 1: Detailed Activities
    const wsDetailed = XLSX.utils.json_to_sheet(detailedRows);
    XLSX.utils.book_append_sheet(wb, wsDetailed, 'Historial Detallado');

    // Sheet 2: Summary by Subject
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Consolidado Materias');

    const cleanName = currentStudent.name.replace(/\s+/g, '_');
    const fileName = `Historial_${currentStudent.code}_${cleanName}_${currentStudent.course.replace(/\s+/g, '_')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className={`flex flex-col flex-1 h-full overflow-hidden ${highContrast ? 'bg-black text-white' : 'bg-slate-950 text-slate-100'}`}>
      {/* Top Navigation Bar */}
      <header className={`px-6 py-4 border-b flex flex-wrap items-center justify-between gap-4 z-20 ${
        highContrast ? 'border-white/20 bg-zinc-900' : 'border-slate-800 bg-slate-900/60 backdrop-blur-md'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-white">Módulo de Tutoría</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold uppercase tracking-wider">
                {tutorInfo.name}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Acompañamiento consolidado de materias y alertas académicas • Código: <span className="font-mono text-purple-300 font-semibold">{tutorCode}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={() => setShowEmailModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/20"
              title="Configuración de Mensajes y Reportes Semanales (Solo Administrador)"
            >
              <Mail className="w-4 h-4" />
              <span>Configuración de Mensajes</span>
            </button>
          )}

          <button
            onClick={handleExportExcel}
            disabled={!consolidatedData || consolidatedData.subjectsSummary.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-emerald-600/20"
            title="Descargar historial consolidado en Excel"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Historial (.xlsx)</span>
          </button>
          
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm font-medium rounded-xl border border-slate-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Student & Course Selector */}
        <aside className={`w-80 border-r flex flex-col shrink-0 overflow-hidden ${
          highContrast ? 'border-white/20 bg-zinc-950' : 'border-slate-800/80 bg-slate-900/30'
        }`}>
          {/* Course Selector Restricted by Matrix */}
          <div className="p-4 border-b border-slate-800/80 space-y-3">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Curso Asignado
            </label>
            <div className="grid grid-cols-2 gap-2">
              {tutorInfo.courses.map(course => (
                <button
                  key={course}
                  onClick={() => {
                    setSelectedCourse(course);
                    setSelectedStudentCode('');
                  }}
                  className={`px-3 py-2 text-xs font-bold rounded-xl transition-all border text-center ${
                    selectedCourse === course
                      ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30'
                      : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {course}
                </button>
              ))}
            </div>

            {/* Quick Student Search */}
            <div className="relative mt-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nombre o código..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Student List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
            <div className="flex items-center justify-between px-2 py-1 text-xs text-slate-400 font-medium">
              <span>Alumnos ({filteredStudents.length})</span>
              <span>{selectedCourse}</span>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                No se encontraron estudiantes para los filtros actuales.
              </div>
            ) : (
              filteredStudents.map(student => {
                const isSelected = currentStudent?.code === student.code;
                return (
                  <button
                    key={student.code}
                    onClick={() => setSelectedStudentCode(student.code)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center justify-between gap-2 border ${
                      isSelected
                        ? 'bg-purple-600/20 border-purple-500/60 text-white font-semibold'
                        : 'bg-slate-800/30 hover:bg-slate-800/70 border-transparent text-slate-300'
                    }`}
                  >
                    <div className="truncate">
                      <p className="truncate">{student.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">Cód: {student.code}</p>
                    </div>
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-purple-400 shrink-0"></div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Content: Student Consolidated Details & Academic Alerts */}
        <main className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Filters Bar: Trimestre & Componente */}
          <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4 ${
            highContrast ? 'border-white/20 bg-zinc-900' : 'border-slate-800 bg-slate-900/40 backdrop-blur-sm'
          }`}>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                <Calendar className="w-4 h-4 text-purple-400" />
                <span>Trimestre:</span>
              </div>
              <div className="flex items-center gap-1.5">
                {(['1º Trimestre', '2º Trimestre', '3º Trimestre', 'ALL'] as const).map(tri => (
                  <button
                    key={tri}
                    onClick={() => setSelectedTrimestre(tri)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedTrimestre === tri
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    {tri === 'ALL' ? 'Todos los Trimestres' : tri}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Aporte / Componente:</span>
              </div>
              <select
                value={selectedComponent}
                onChange={e => setSelectedComponent(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 text-xs text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">Todos los Aportes (Consolidado)</option>
                <option value="1º APORTE">1º APORTE</option>
                <option value="2º APORTE">2º APORTE</option>
                <option value="EVALUACIÓN FINAL">EVALUACIÓN FINAL</option>
              </select>

              <button
                onClick={() => setOnlyAlertsFilter(prev => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  onlyAlertsFilter
                    ? 'bg-rose-500/20 border-rose-500/60 text-rose-300'
                    : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 border-slate-700'
                }`}
                title="Filtrar solo materias con alertas"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Solo Alertas</span>
              </button>
            </div>
          </div>

          {!currentStudent || !consolidatedData ? (
            <div className="flex flex-1 items-center justify-center p-12 text-slate-500 text-sm">
              Seleccione un estudiante para visualizar su informe consolidado.
            </div>
          ) : (
            <>
              {/* Student Header Profile */}
              <div className={`p-6 rounded-2xl border flex flex-wrap items-center justify-between gap-4 ${
                highContrast ? 'border-white/20 bg-zinc-900' : 'border-slate-800/80 bg-gradient-to-r from-slate-900/90 to-purple-950/20'
              }`}>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <GraduationCap className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-white tracking-tight">{currentStudent.name}</h2>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Código: <span className="font-mono text-purple-300 font-semibold">{currentStudent.code}</span> • Curso: <span className="text-slate-200 font-medium">{currentStudent.course}</span> • Nivel: <span className="text-slate-200 font-medium">{currentStudent.level}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 block mb-1">Promedio General Consolidado</span>
                  <div className="text-3xl font-black font-mono tracking-tight flex items-center justify-end gap-2">
                    <span className={
                      consolidatedData.generalAverage === null 
                        ? 'text-slate-400' 
                        : (consolidatedData.generalAverage >= 7 ? 'text-emerald-400' : 'text-rose-400')
                    }>
                      {consolidatedData.generalAverage !== null ? formatGrade(consolidatedData.generalAverage) : '0.00'}
                    </span>
                    <span className="text-xs text-slate-500 font-normal">/ 10.00</span>
                  </div>
                </div>
              </div>

              {/* KPI Cards: Academic Alert System */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Incumplimientos (0/10) */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  consolidatedData.totalZeroAlerts > 0
                    ? 'border-rose-500/40 bg-rose-500/10'
                    : 'border-slate-800 bg-slate-900/40'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
                      Incumplimientos
                    </span>
                    <AlertOctagon className={`w-5 h-5 ${consolidatedData.totalZeroAlerts > 0 ? 'text-rose-400' : 'text-slate-500'}`} />
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    {consolidatedData.totalZeroAlerts}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Actividades con calificación 0/10
                  </p>
                </div>

                {/* En Riesgo (< 7.00) */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  consolidatedData.totalUnder7Alerts > 0
                    ? 'border-amber-500/40 bg-amber-500/10'
                    : 'border-slate-800 bg-slate-900/40'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                      Bajo Rendimiento
                    </span>
                    <AlertTriangle className={`w-5 h-5 ${consolidatedData.totalUnder7Alerts > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    {consolidatedData.totalUnder7Alerts}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Actividades menores a 7.00/10
                  </p>
                </div>

                {/* Materias en Observación */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  consolidatedData.subjectsWithAlerts.length > 0
                    ? 'border-purple-500/40 bg-purple-500/10'
                    : 'border-slate-800 bg-slate-900/40'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
                      Materias con Alerta
                    </span>
                    <BookOpen className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    {consolidatedData.subjectsWithAlerts.length}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Asignaturas que requieren atención
                  </p>
                </div>

                {/* Actividades Evaluadas */}
                <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Actividades Evaluadas
                    </span>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    {consolidatedData.totalGradedActivities}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Registros con nota al momento
                  </p>
                </div>
              </div>

              {/* Automatic Academic Alert Box */}
              {consolidatedData.totalAlerts > 0 ? (
                <div className="p-5 rounded-2xl border border-rose-500/40 bg-rose-950/20 space-y-3">
                  <div className="flex items-center gap-2.5 text-rose-300 font-bold text-sm">
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                    <span>Resumen de Alertas Académicas Detectadas para el Tutor</span>
                  </div>
                  <p className="text-xs text-rose-200/80 leading-relaxed">
                    El estudiante registra notas críticas o por debajo de la base reglamentaria (7.00) en las siguientes materias. Se recomienda coordinación preventiva:
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {consolidatedData.subjectsWithAlerts.map(sub => (
                      <div 
                        key={sub.subject}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-xs flex items-center gap-2"
                      >
                        <span className="font-semibold text-rose-200">{sub.subject}</span>
                        {sub.zeroCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-bold text-[10px]">
                            {sub.zeroCount} con 0/10
                          </span>
                        )}
                        {sub.under7Count > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300 font-semibold text-[10px]">
                            {sub.under7Count} &lt; 7.00
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <p className="text-xs text-emerald-200">
                    <strong className="text-emerald-300 font-semibold">Situación Académica Regular:</strong> El estudiante no presenta incumplimientos (0/10) ni notas por debajo de 7.00 en las materias evaluadas durante este período.
                  </p>
                </div>
              )}

              {/* Consolidated Subjects Breakdown */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-400" />
                    <span>Consolidado Desglosado por Materia</span>
                  </h3>
                  <span className="text-xs text-slate-400">
                    {consolidatedData.subjectsSummary.length} materias con actividades
                  </span>
                </div>

                {consolidatedData.subjectsSummary.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                    No se registran actividades para este estudiante en el período o aporte seleccionado.
                  </div>
                ) : (
                  consolidatedData.subjectsSummary
                    .filter(sub => !onlyAlertsFilter || sub.hasAlerts)
                    .map(sub => {
                      const isExpanded = expandedSubjects[sub.subject] !== false; // expanded by default
                      const avgClass = sub.average === null 
                        ? 'text-slate-400' 
                        : (sub.average >= 7 ? 'text-emerald-400' : 'text-rose-400');

                      return (
                        <div
                          key={sub.subject}
                          className={`rounded-2xl border overflow-hidden transition-all ${
                            sub.zeroCount > 0
                              ? 'border-rose-500/30 bg-slate-900/50'
                              : (sub.under7Count > 0 ? 'border-amber-500/30 bg-slate-900/50' : 'border-slate-800 bg-slate-900/30')
                          }`}
                        >
                          {/* Subject Header Card */}
                          <div
                            onClick={() => toggleSubject(sub.subject)}
                            className="p-4 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/40 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${
                                sub.zeroCount > 0 
                                  ? 'bg-rose-500 animate-pulse' 
                                  : (sub.under7Count > 0 ? 'bg-amber-400' : 'bg-emerald-400')
                              }`} />
                              <div>
                                <h4 className="font-bold text-white text-sm">{sub.subject}</h4>
                                <p className="text-[11px] text-slate-400">
                                  {sub.gradedCount} de {sub.totalActivities} actividades evaluadas
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              {/* Status Badge */}
                              {sub.zeroCount > 0 ? (
                                <span className="px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center gap-1.5">
                                  <AlertOctagon className="w-3.5 h-3.5" />
                                  <span>{sub.zeroCount} Incumplimiento(s) (0/10)</span>
                                </span>
                              ) : sub.under7Count > 0 ? (
                                <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>{sub.under7Count} En Riesgo (&lt; 7.00)</span>
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-medium text-xs flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Aprobado</span>
                                </span>
                              )}

                              {/* Average */}
                              <div className="text-right min-w-[70px]">
                                <span className="text-[10px] text-slate-400 block uppercase">Promedio</span>
                                <span className={`text-base font-black font-mono ${avgClass}`}>
                                  {sub.average !== null ? formatGrade(sub.average) : 'N/A'}
                                </span>
                              </div>

                              <div className="text-slate-400">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </div>
                            </div>
                          </div>

                          {/* Activities Table (Expanded) */}
                          {isExpanded && (
                            <div className="border-t border-slate-800/80 p-4 bg-black/20 overflow-x-auto">
                              {sub.activities.length === 0 ? (
                                <p className="text-xs text-slate-500 text-center py-2">
                                  No hay actividades registradas en este período.
                                </p>
                              ) : (
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold">
                                      <th className="py-2 px-3">Actividad</th>
                                      <th className="py-2 px-3">Aporte</th>
                                      <th className="py-2 px-3">Fecha</th>
                                      <th className="py-2 px-3 text-right">Nota Orig. (/10)</th>
                                      <th className="py-2 px-3 text-right">Refuerzo / Mejora</th>
                                      <th className="py-2 px-3 text-right">Nota Final (/10)</th>
                                      <th className="py-2 px-3 text-center">Alerta Tutor</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/60 font-mono">
                                    {sub.activities.map(row => {
                                      const isRowZero = row.isZero;
                                      const isRowUnder7 = row.isUnder7;

                                      return (
                                        <tr
                                          key={row.activity.id}
                                          className={`transition-colors ${
                                            isRowZero
                                              ? 'bg-rose-500/10 hover:bg-rose-500/15'
                                              : (isRowUnder7 ? 'bg-amber-500/10 hover:bg-amber-500/15' : 'hover:bg-slate-800/40')
                                          }`}
                                        >
                                          <td className="py-2.5 px-3 font-sans font-medium text-slate-200">
                                            {row.activity.name}
                                          </td>
                                          <td className="py-2.5 px-3 font-sans text-slate-400 text-[11px]">
                                            {row.activity.component}
                                          </td>
                                          <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                                            {row.activity.date}
                                          </td>
                                          <td className="py-2.5 px-3 text-right text-slate-300">
                                            {row.origEq10 !== null ? formatGrade(row.origEq10) : '-'}
                                          </td>
                                          <td className="py-2.5 px-3 text-right text-slate-400">
                                            {row.grade?.reinforcementGrade !== null && row.grade?.reinforcementGrade !== undefined
                                              ? formatGrade(row.grade.reinforcementGrade)
                                              : (row.efDetails?.calculatedAvg !== null && row.efDetails?.calculatedAvg !== undefined
                                                  ? formatGrade(row.efDetails.calculatedAvg)
                                                  : '-')}
                                          </td>
                                          <td className="py-2.5 px-3 text-right font-black text-sm">
                                            <span className={
                                              row.finalGrade === null
                                                ? 'text-slate-500'
                                                : (row.finalGrade >= 7 ? 'text-emerald-400' : 'text-rose-400')
                                            }>
                                              {row.finalGrade !== null ? formatGrade(row.finalGrade) : 'Pendiente'}
                                            </span>
                                          </td>
                                          <td className="py-2.5 px-3 text-center">
                                            {isRowZero ? (
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-600/30 border border-rose-500/40 text-rose-300 font-sans font-bold text-[10px]">
                                                <AlertOctagon className="w-3 h-3" />
                                                0/10 Incumplimiento
                                              </span>
                                            ) : isRowUnder7 ? (
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/30 border border-amber-500/40 text-amber-300 font-sans font-semibold text-[10px]">
                                                <AlertTriangle className="w-3 h-3" />
                                                &lt; 7.00 Riesgo
                                              </span>
                                            ) : row.finalGrade !== null ? (
                                              <span className="text-emerald-400/80 font-sans text-[11px]">
                                                Normal
                                              </span>
                                            ) : (
                                              <span className="text-slate-500 font-sans text-[11px]">
                                                Sin nota
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {isAdmin && (
        <EmailNotificationModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          store={store}
        />
      )}
    </div>
  );
}
