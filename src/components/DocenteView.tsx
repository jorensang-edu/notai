import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store';
import { EvaluationComponent, Activity, Grade, CourseName, SubjectName } from '../types';
import { calculateFinalGrade, computeCompositeOriginal, convertTo10, formatGrade, calculateComponentAverage, calculateTrimestralAverage, calculateAnnualAverage } from '../utils';
import { PlusCircle, LogOut, Table, SlidersHorizontal, ChevronDown, ChevronUp, Trash2, Download, StickyNote, Search, BarChart2, AlertTriangle } from 'lucide-react';
import { auth } from '../firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import * as XLSX from 'xlsx';

interface DocenteViewProps {
  onLogout: () => void;
  store: ReturnType<typeof useAppStore>;
  teacherCode?: string;
}

import { TEACHER_MATRIX } from '../teacherMatrix';
export function DocenteView({ onLogout, store, teacherCode }: DocenteViewProps) {
  const { courseParams, setCourseParams, students, activities, grades, addActivity, updateGrade, deleteActivity, updateActivity, classNotes, updateClassNote } = store;
  
  const [selectedCourse, setSelectedCourse] = useState<CourseName>('3 BACH. B');
  const [selectedSubject, setSelectedSubject] = useState<SubjectName>('Matemáticas');
  
  const isBasica = selectedCourse.includes('EGB');
  const currentSubject = selectedSubject;

  // Auto-select valid subject and course based on permissions
  useEffect(() => {
    if (teacherCode) {
      const teacherInfo = TEACHER_MATRIX[teacherCode];
      if (teacherInfo && Array.isArray(teacherInfo.permissions) && teacherInfo.permissions.length > 0) {
        const permittedSub = teacherInfo.permissions.find(p => p.subject === currentSubject);
        if (!permittedSub) {
          // Current subject is not permitted, switch to the first permitted subject
          const firstPermitted = teacherInfo.permissions[0];
          setSelectedSubject(firstPermitted.subject as SubjectName);
          if (!firstPermitted.courses.includes(selectedCourse)) {
            setSelectedCourse(firstPermitted.courses[0] as CourseName);
          }
        } else {
          // Subject is permitted, but check if the current course is permitted for this subject
          if (!permittedSub.courses.includes(selectedCourse)) {
            setSelectedCourse(permittedSub.courses[0] as CourseName);
          }
        }
      }
    }
  }, [teacherCode, currentSubject, selectedCourse]);

  const [isCreatingActivity, setIsCreatingActivity] = useState(false);
  const [newActivityName, setNewActivityName] = useState('');
  const [newActivityComponent, setNewActivityComponent] = useState<EvaluationComponent>('1º APORTE');
  const [newActivityMaxScore, setNewActivityMaxScore] = useState<string>('10');
  const [newActivityHasGlobalization, setNewActivityHasGlobalization] = useState<boolean>(false);

  const [selectedComponent, setSelectedComponent] = useState<EvaluationComponent | 'ALL'>('ALL');
  const [selectedActivityId, setSelectedActivityId] = useState<string | 'ALL'>('ALL');
  const [activeView, setActiveView] = useState<'registro' | 'matriz' | 'stats'>('registro');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(true);
const [searchQuery, setSearchQuery] = useState('');
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);

  const filteredStudents = useMemo(() => {
    let filtered = students.filter(s => s.course === selectedCourse);
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(query) || 
        s.code.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [students, selectedCourse, searchQuery]);
  const { isUnauthorized, existingTeacherEmail } = useMemo(() => {
    let unauthorized = false;
    
    // Check TEACHER_MATRIX logic if a teacherCode is present
    if (teacherCode) {
      const teacherInfo = TEACHER_MATRIX[teacherCode];
      if (teacherInfo) {
        if (teacherInfo.permissions === 'all') {
          unauthorized = false; // Code 'RWCV9' gets ALL access
        } else if (Array.isArray(teacherInfo.permissions)) {
          // Check if current course/subject is in the allowed list for this code
          const isAllowed = teacherInfo.permissions.some(p => 
            p.subject === currentSubject && p.courses.includes(selectedCourse)
          );
          if (!isAllowed) {
            unauthorized = true;
          }
        } else {
          unauthorized = true;
        }
      } else {
        // Unknown code -> unauthorized for everything
        unauthorized = true;
      }
    }
    
    return { isUnauthorized: unauthorized, existingTeacherEmail: undefined };
  }, [selectedCourse, currentSubject, teacherCode]);

  const filteredActivities = useMemo(() => {
    return activities.filter(a => {
      const matchCourse = a.course === selectedCourse;
      const matchSubject = a.subject === currentSubject;
      const matchTrimestre = a.trimestre === courseParams.trimestre || (!a.trimestre && courseParams.trimestre === '1º Trimestre');
      const matchComponent = selectedComponent === 'ALL' || a.component === selectedComponent;
      return matchCourse && matchSubject && matchTrimestre && matchComponent;
    }).sort((a, b) => {
      const order = { '1º APORTE': 1, '2º APORTE': 2, 'EVALUACIÓN FINAL': 3, 'SUPLETORIO': 4, 'MEJORAMIENTO': 5 };
      if (order[a.component] !== order[b.component]) {
        return order[a.component] - order[b.component];
      }
      return (a.createdAt || 0) - (b.createdAt || 0);
    });
  }, [activities, selectedCourse, currentSubject, courseParams.trimestre, selectedComponent]);

  const statsData = useMemo(() => {
    let excelente = 0;
    let muyBueno = 0;
    let bueno = 0;
    let riesgo = 0;

    filteredStudents.forEach(student => {
      let totalScore = 0;
      let gradedCount = 0;

      filteredActivities.forEach(activity => {
        const grade = grades.find(g => g.studentId === student.id && g.activityId === activity.id);
        const finalGrade = calculateFinalGrade(grade?.originalGrade ?? null, grade?.reinforcementGrade ?? null, activity.maxScore, activity.reinforcementMaxScore);
        if (finalGrade !== null) {
          totalScore += finalGrade;
          gradedCount++;
        }
      });

      if (gradedCount > 0) {
        const avg = totalScore / gradedCount;
        if (avg >= 9) excelente++;
        else if (avg >= 8) muyBueno++;
        else if (avg >= 7) bueno++;
        else riesgo++;
      }
    });

    return [
      { name: 'Excelente (9-10)', count: excelente, color: '#10b981' },
      { name: 'Muy Bueno (8-8.9)', count: muyBueno, color: '#3b82f6' },
      { name: 'Bueno (7-7.9)', count: bueno, color: '#f59e0b' },
      { name: 'En Riesgo (<7)', count: riesgo, color: '#f43f5e' },
    ];
  }, [filteredStudents, filteredActivities, grades]);

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivityName.trim()) return;
    const newAct = await addActivity({ 
      name: newActivityName, 
      component: newActivityComponent,
      course: selectedCourse,
      subject: currentSubject,
      trimestre: courseParams.trimestre,
      maxScore: newActivityMaxScore ? parseFloat(newActivityMaxScore) : undefined,
      hasGlobalization: newActivityComponent === 'EVALUACIÓN FINAL' ? newActivityHasGlobalization : undefined
    });
    setNewActivityName('');
    setNewActivityMaxScore('10');
    setNewActivityHasGlobalization(false);
    setIsCreatingActivity(false);
    
    // Automatically select the newly created activity to speed up grading
    setSelectedComponent('ALL');
    if (newAct) {
      setSelectedActivityId(newAct.id);
    }
    setActiveView('registro');
    setIsMobileMenuOpen(false);
  };

  const handleGradeChange = (studentId: string, activityId: string, field: 'original' | 'reinforcement' | 'globalization' | 'observation', value: string) => {
    let numValue: number | null = null;
    if (field !== 'observation') {
      numValue = value === '' ? null : parseFloat(value);
      if (numValue !== null && numValue < 0) return;
    }

    const existing = grades.find(g => g.studentId === studentId && g.activityId === activityId);
    
    let orig = existing?.originalGrade ?? null;
    let reinf = existing?.reinforcementGrade ?? null;
    let glob = existing?.globalizationGrade ?? null;
    let obs = existing?.observation;

    if (field === 'original') orig = numValue;
    if (field === 'reinforcement') reinf = numValue;
    if (field === 'globalization') glob = numValue;
    if (field === 'observation') obs = value;

    updateGrade(studentId, activityId, orig, reinf, glob, obs);
  };

  const confirmDeleteActivity = (activity: Activity) => {
    setActivityToDelete(activity);
  };

  const executeDeleteActivity = () => {
    if (activityToDelete) {
      deleteActivity(activityToDelete.id);
      if (selectedActivityId === activityToDelete.id) {
        setSelectedActivityId('ALL');
      }
      setActivityToDelete(null);
    }
  };

  const handleExportConsolidatedExcel = () => {
    const workbook = XLSX.utils.book_new();
    const trimestres = ['1º Trimestre', '2º Trimestre', '3º Trimestre'] as const;
    
    let hasData = false;

    trimestres.forEach(trimestre => {
      const trimActivities = activities.filter(a => {
        const matchCourse = a.course === selectedCourse;
        const matchSubject = a.subject === currentSubject;
        const matchTrimestre = a.trimestre === trimestre || (!a.trimestre && trimestre === '1º Trimestre');
        return matchCourse && matchSubject && matchTrimestre;
      });

      if (trimActivities.length === 0) return; // Skip empty trimestres
      hasData = true;

      const data: any[] = [];
      data.push(['UNIDAD EDUCATIVA DE FORMACIÓN INTEGRAL - CEDFI']);
      data.push(['REPORTE CONSOLIDADO DE DESEMPEÑO ACADÉMICO']);
      data.push([]);
      data.push(['Paralelo:', selectedCourse, 'AÑO LECTIVO', courseParams.period]);
      data.push(['Asignatura:', currentSubject, trimestre]);
      data.push(['Docente:', courseParams.teacher]);
      data.push([]);
      
      const headerRow1 = ['Nº', 'Cod.', 'Estudiantes'];
      const headerRow2 = ['', '', ''];
      const headerRow3 = ['', '', ''];

      trimActivities.forEach(act => {
        headerRow1.push(`${act.name} (${act.component})`);
        headerRow1.push('');
        headerRow1.push('');

        headerRow2.push(act.date || '');
        headerRow2.push('');
        headerRow2.push('');

        headerRow3.push('10');
        headerRow3.push('Ref. pedag.');
        headerRow3.push('Calif. Modif.');
      });

      headerRow1.push(`Total Ref. Global`, `Promedio ${selectedComponent === 'ALL' ? 'Trimestral' : 'Aporte'}`);
      headerRow2.push('', '');
      headerRow3.push('', '');

      data.push(headerRow1);
      data.push(headerRow2);
      data.push(headerRow3);

      filteredStudents.forEach((student, index) => {
        const rowData: any[] = [index + 1, student.code, student.name];
        
        const studentActivitiesData = trimActivities.map(a => {
          const grade = getGradeRecord(student.id, a.id);
          const isEvalFinal = a.component === 'EVALUACIÓN FINAL';
          const origEq10 = computeCompositeOriginal(grade?.originalGrade ?? null, grade?.globalizationGrade ?? null, a.maxScore, a.globalizationMaxScore, isEvalFinal, a.hasGlobalization);
          const refEq10 = convertTo10(grade?.reinforcementGrade ?? null, a.reinforcementMaxScore || a.maxScore);
          const finalGrade = origEq10 !== null ? calculateFinalGrade(origEq10, grade?.reinforcementGrade ?? null, 10, a.reinforcementMaxScore) : null;
          return { origEq10, refEq10, finalGrade };
        });
        
        studentActivitiesData.forEach(actData => {
           rowData.push(actData.origEq10 !== null ? actData.origEq10 : '');
           rowData.push(actData.refEq10 !== null ? actData.refEq10 : '');
           rowData.push(actData.finalGrade !== null ? actData.finalGrade : '');
        });
        
        const totalReinforcements = grades.filter(g => g.studentId === student.id && trimActivities.some(a => a.id === g.activityId) && g.reinforcementGrade !== null).length;
        rowData.push(totalReinforcements);

        const evaluated = studentActivitiesData.filter(a => a.finalGrade !== null);
        const avg = calculateTrimestralAverage(student.id, activities, grades, trimestre, selectedCourse, currentSubject);
        rowData.push(avg !== null ? Number(avg.toFixed(2)) : '');

        data.push(rowData);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(data);
      // Sheet names max length is 31
      let sheetName = trimestre.replace(' Trimestre', 'T').substring(0, 31);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    if (!hasData) {
      alert("No hay actividades registradas para generar el reporte consolidado.");
      return;
    }

    const date = new Date();
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    XLSX.writeFile(workbook, `Consolidado - ${currentSubject} - ${selectedCourse} (${dateStr}).xlsx`);
  };

  const handleExportExcel = () => {
    // Construct the data array for Excel
    const data: any[] = [];
    
    // Add header info rows
    data.push(['UNIDAD EDUCATIVA DE FORMACIÓN INTEGRAL - CEDFI']);
    data.push(['CÁLCULO DE DESEMPEÑO ACADÉMICO - EVALUACIÓN FORMATIVA']);
    data.push([]);
    data.push(['Paralelo:', selectedCourse, 'AÑO LECTIVO', courseParams.period]);
    data.push(['Asignatura:', currentSubject, courseParams.trimestre]);
    data.push(['Docente:', courseParams.teacher]);
    data.push([]);
    
    // Header row for columns
    const headerRow1 = ['Nº', 'Cod.', 'Estudiantes'];
    const headerRow2 = ['', '', ''];
    const headerRow3 = ['', '', ''];

    filteredActivities.forEach(act => {
      headerRow1.push(`${act.name}`);
      headerRow1.push('');
      headerRow1.push('');

      headerRow2.push(act.date || '');
      headerRow2.push('');
      headerRow2.push('');

      headerRow3.push('10');
      headerRow3.push('Ref. pedag.');
      headerRow3.push('Calif. Modif.');
    });

    headerRow1.push(`Total Ref. Global`, `Promedio ${selectedComponent === 'ALL' ? 'Trimestral' : 'Aporte'}`);
    headerRow2.push('', '');
    headerRow3.push('', '');

    data.push(headerRow1);
    data.push(headerRow2);
    data.push(headerRow3);

    // Student rows
    filteredStudents.forEach((student, index) => {
      const rowData: any[] = [index + 1, student.code, student.name];
      
      const studentActivitiesData = filteredActivities.map(a => {
        const grade = getGradeRecord(student.id, a.id);
        const isEvalFinal = a.component === 'EVALUACIÓN FINAL';
        const origEq10 = computeCompositeOriginal(grade?.originalGrade ?? null, grade?.globalizationGrade ?? null, a.maxScore, a.globalizationMaxScore, isEvalFinal, a.hasGlobalization);
        const refEq10 = convertTo10(grade?.reinforcementGrade ?? null, a.reinforcementMaxScore || a.maxScore);
        const finalGrade = origEq10 !== null ? calculateFinalGrade(origEq10, grade?.reinforcementGrade ?? null, 10, a.reinforcementMaxScore) : null;
        return { origEq10, refEq10, finalGrade };
      });
      
      studentActivitiesData.forEach(data => {
         rowData.push(data.origEq10 !== null ? data.origEq10 : '');
         rowData.push(data.refEq10 !== null ? data.refEq10 : '');
         rowData.push(data.finalGrade !== null ? data.finalGrade : '');
      });
      
      const totalReinforcements = grades.filter(g => g.studentId === student.id && g.reinforcementGrade !== null).length;
      rowData.push(totalReinforcements);

      const evaluated = studentActivitiesData.filter(a => a.finalGrade !== null);
      let avg = null;
      if (selectedComponent === 'ALL') {
        avg = calculateTrimestralAverage(student.id, activities, grades, courseParams.trimestre, selectedCourse, currentSubject);
      } else {
        avg = calculateComponentAverage(student.id, activities, grades, courseParams.trimestre, selectedComponent as any, selectedCourse, currentSubject);
      }
      rowData.push(avg !== null ? Number(avg.toFixed(2)) : '');

      data.push(rowData);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Matriz_Calificaciones');

    // Construir el nombre del archivo basado en los filtros
    const nameParts = [currentSubject, selectedCourse, courseParams.trimestre];
    if (selectedComponent !== 'ALL') {
      nameParts.push(selectedComponent);
    }
    const baseName = nameParts.join(' - ');
    
    // Obtener la fecha en formato aaaa-mm-dd
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    XLSX.writeFile(workbook, `${baseName} (${dateStr}).xlsx`);
  };

  const displayActivities = selectedActivityId === 'ALL' ? filteredActivities : filteredActivities.filter(a => a.id === selectedActivityId);

  // Helper to get grade for student and activity
  const getGradeRecord = (studentId: string, activityId: string) => {
    return grades.find(g => g.studentId === studentId && g.activityId === activityId);
  };

  return (
    <div className="w-full flex flex-col overflow-hidden h-full">
      <header className="flex items-center justify-between px-8 py-6 bg-white/5 backdrop-blur-xl border-b border-white/10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="font-bold text-xl text-white">N</span>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">NotAI <span className="text-blue-400 font-medium text-sm ml-2">Panel Docente</span></h1>
            <p className="text-xs text-slate-400 uppercase tracking-widest">Gestión de Calificaciones</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold">{courseParams.institution}</p>
            <p className="text-xs text-slate-400">Periodo Lectivo: {courseParams.period}</p>
          </div>
          <div className="h-8 w-px bg-white/10 hidden sm:block"></div>
          <button
            onClick={onLogout}
            className="flex items-center space-x-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Salir</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden flex items-center justify-between bg-[#0f172a] border-b border-white/10 p-4 text-slate-200 font-semibold shrink-0 z-20 shadow-md"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-blue-400" />
            Configuración y Filtros
          </div>
          {isMobileMenuOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        <aside className={`w-full md:w-64 bg-[#0f172a] md:bg-white/5 backdrop-blur-lg border-b md:border-b-0 md:border-r border-white/10 p-6 flex-col gap-4 md:p-8 shrink-0 overflow-y-auto ${isMobileMenuOpen ? 'flex absolute md:relative z-10 top-[60px] md:top-0 bottom-0 left-0 right-0 md:right-auto' : 'hidden md:flex'}`}>
          <div className="space-y-4">
            <p className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest ml-2">Contexto Actual</p>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
              <div>
                <label className="block text-[11px] sm:text-xs text-slate-500 uppercase">Docente</label>
                <input
                  type="text"
                  value={courseParams.teacher}
                  onChange={(e) => setCourseParams({ ...courseParams, teacher: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-[#0f172a] border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-sm font-semibold text-slate-300"
                  placeholder="Nombre del docente"
                />
              </div>
              <div>
                <label className="block text-[11px] sm:text-xs text-slate-500 uppercase">Asignatura</label>
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
                </select>
              </div>
              <div>
                <label className="block text-[11px] sm:text-xs text-slate-500 uppercase">Curso / Paralelo</label>
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
                </select>
              </div>
              <div>
                <label className="block text-[11px] sm:text-xs text-slate-500 uppercase">Trimestre</label>
                <select
                  value={courseParams.trimestre}
                  onChange={(e) => setCourseParams({ ...courseParams, trimestre: e.target.value as any })}
                  className="w-full mt-1 px-3 py-2 bg-[#0f172a] border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-sm font-semibold text-blue-400"
                >
                  <option value="1º Trimestre">1º Trimestre</option>
                  <option value="2º Trimestre">2º Trimestre</option>
                  <option value="3º Trimestre">3º Trimestre</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <p className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest ml-2">Filtros de Actividad</p>
            <select
              value={selectedComponent}
              onChange={(e) => {
                setSelectedComponent(e.target.value as any);
                setSelectedActivityId('ALL');
                setIsMobileMenuOpen(false);
              }}
              className="w-full px-4 py-3 bg-[#0f172a] border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 text-sm text-slate-300"
            >
              <option value="ALL">Aporte/Evaluación</option>
              <option value="1º APORTE">1º APORTE</option>
              <option value="2º APORTE">2º APORTE</option>
              <option value="EVALUACIÓN FINAL">EVALUACIÓN FINAL</option>
              <option value="SUPLETORIO">SUPLETORIO</option>
              <option value="MEJORAMIENTO">MEJORAMIENTO</option>
            </select>

            <select
              value={selectedActivityId}
              onChange={(e) => {
                setSelectedActivityId(e.target.value);
                if (e.target.value !== 'ALL') {
                  setIsMobileMenuOpen(false);
                  setActiveView('registro');
                }
              }}
              className="w-full px-4 py-3 bg-[#0f172a] border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 text-sm text-slate-300"
            >
              <option value="ALL">Todas las Actividades</option>
              {filteredActivities.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>

            <button
              onClick={() => {
                setActiveView(activeView === 'matriz' ? 'registro' : 'matriz');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-xl text-sm transition-colors border font-semibold ${activeView === 'matriz' ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-black/20 hover:bg-white/10 text-slate-300 border-white/10'}`}
            >
              <Table className="w-4 h-4" />
              Matriz de Calificaciones
            </button>
            <button
              onClick={() => {
                setActiveView(activeView === 'stats' ? 'registro' : 'stats');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-xl text-sm transition-colors border font-semibold ${activeView === 'stats' ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-500/20' : 'bg-black/20 hover:bg-white/10 text-slate-300 border-white/10'}`}
            >
              <BarChart2 className="w-4 h-4" />
              Estadísticas
            </button>
          </div>
        </aside>

        <section className="flex-1 p-4 md:p-8 flex flex-col gap-6 overflow-hidden">
          {isUnauthorized && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-start gap-3 shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-rose-400 text-sm">Acceso Restringido</h3>
                <p className="text-xs text-rose-300 mt-1">
                  Su código de docente no tiene permisos para modificar la asignatura de <b>{currentSubject}</b> en el curso <b>{selectedCourse}</b>. 
                  Solo puede visualizar las calificaciones en modo lectura.
                </p>
              </div>
            </div>
          )}
          <div className="relative shrink-0 w-full max-w-2xl mx-auto md:mx-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar estudiante por nombre o código..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0f172a] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors shadow-sm shadow-black/20"
            />
          </div>
          
          {activeView === 'stats' ? (
            <div className="flex-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden flex flex-col">
              <div className="px-4 py-3 md:px-6 md:py-4 bg-white/5 border-b border-white/10 flex justify-between items-center shrink-0">
                <h2 className="font-bold flex items-center gap-2 text-lg">
                  Distribución de Calificaciones
                  <span className="text-purple-400 font-medium ml-2">{selectedCourse}</span>
                  <span className="text-slate-400 font-medium text-sm ml-2">({currentSubject})</span>
                </h2>
              </div>
              <div className="flex-1 p-6 flex flex-col md:flex-row items-center justify-center gap-8 overflow-auto">
                <div className="w-full h-80 max-w-2xl">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={statsData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#ffffff1a', color: '#f8fafc', borderRadius: '8px' }}
                        itemStyle={{ color: '#f8fafc' }}
                        cursor={{ fill: '#ffffff0a' }}
                      />
                      <Bar dataKey="count" name="Estudiantes" radius={[4, 4, 0, 0]}>
                        {statsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : activeView === 'matriz' ? (
            <div className="flex-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden flex flex-col">
              <div className="px-4 py-3 md:px-6 md:py-4 bg-white/5 border-b border-white/10 flex justify-between items-center shrink-0">
                <h2 className="font-bold flex items-center gap-2 text-lg">
                  Matriz de Calificaciones
                  <span className="text-blue-400 font-medium ml-2">{selectedCourse}</span>
                  <span className="text-slate-400 font-medium text-sm ml-2">({currentSubject})</span>
                </h2>
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={handleExportConsolidatedExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-sm transition-all shadow-lg shadow-indigo-600/20"
                    title="Descargar consolidado de todos los trimestres"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Consolidado</span>
                  </button>
                  <button
                    onClick={handleExportExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium text-sm transition-all shadow-lg shadow-emerald-600/20"
                    title="Descargar vista actual"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar Aporte</span>
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead className="bg-[#0f172a] text-[11px] sm:text-xs uppercase tracking-wider text-slate-500 sticky top-0 z-30 shadow-md">
                    <tr>
                      <th className="px-3 py-2 md:px-4 md:py-3 font-semibold border-b border-r border-white/5 bg-[#0f172a] sticky left-0 z-40">Estudiante</th>
                      {filteredActivities.map(activity => (
                        <th key={activity.id} className="px-3 py-2 md:px-4 md:py-3 font-semibold text-center border-b border-white/5 bg-[#0f172a] min-w-[120px] relative group/th">
                          <div className="truncate px-4" title={activity.name}>{activity.name}</div>
                          {activity.date && <div className="text-[9px] text-amber-400/80 font-mono mt-0.5">{activity.date}</div>}
                          <div className="text-[9px] text-blue-400 font-mono mt-0.5" title="Calificación máxima">10</div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmDeleteActivity(activity);
                            }}
                            disabled={isUnauthorized}
                            className="absolute top-1/2 -translate-y-1/2 right-1 p-1.5 opacity-100 md:opacity-0 md:group-hover/th:opacity-100 text-rose-400 hover:bg-rose-500/20 rounded transition-all z-10 cursor-pointer"
                            title="Eliminar actividad"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </th>
                      ))}
                      <th className="px-3 py-2 md:px-4 md:py-3 font-semibold text-center border-b border-l border-white/5 bg-[#0f172a] md:sticky md:right-0 z-20">Total Ref. Global</th>
                      <th className="px-3 py-2 md:px-4 md:py-3 font-semibold text-center border-b border-l border-white/5 bg-[#0f172a] md:sticky md:right-0 z-20">Promedio {selectedComponent === 'ALL' ? 'Trimestral' : 'Aporte'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {filteredStudents.map(student => {
                      const studentActivitiesData = filteredActivities.map(a => {
                        const grade = getGradeRecord(student.id, a.id);
                        const isEvalFinal = a.component === 'EVALUACIÓN FINAL';
                        const origEq10 = computeCompositeOriginal(grade?.originalGrade ?? null, grade?.globalizationGrade ?? null, a.maxScore, a.globalizationMaxScore, isEvalFinal, a.hasGlobalization);
                        const refEq10 = convertTo10(grade?.reinforcementGrade ?? null, a.reinforcementMaxScore || a.maxScore);
                        const finalGrade = origEq10 !== null ? calculateFinalGrade(origEq10, grade?.reinforcementGrade ?? null, 10, a.reinforcementMaxScore) : null;
                        return { activity: a, grade, finalGrade, origEq10, refEq10 };
                      });

                      const totalReinforcements = grades.filter(g => g.studentId === student.id && g.reinforcementGrade !== null).length;

                      const evaluated = studentActivitiesData.filter(a => a.finalGrade !== null);
                      let avg = null;
                      if (selectedComponent === 'ALL') {
                        avg = calculateTrimestralAverage(student.id, activities, grades, courseParams.trimestre, selectedCourse, currentSubject);
                      } else {
                        avg = calculateComponentAverage(student.id, activities, grades, courseParams.trimestre, selectedComponent as any, selectedCourse, currentSubject);
                      }

                      return (
                        <tr key={student.id} className="hover:bg-white/5 transition-colors group">
                          <td className="px-3 py-2 md:px-4 md:py-3 border-r border-white/5 bg-[#0f172a] group-hover:bg-[#162032] sticky left-0 z-10 transition-colors">
                            <div className="font-bold text-slate-200 text-xs truncate max-w-[200px]" title={student.name}>{student.name}</div>
                            <div className="text-[11px] sm:text-xs text-slate-500 font-mono mt-0.5">{student.code}</div>
                          </td>
                          {studentActivitiesData.map(data => {
                            const isRequiringReinforcement = data.finalGrade !== null && data.finalGrade < 7;
                            return (
                              <td key={data.activity.id} className={`px-3 py-2 md:px-4 md:py-3 text-center border-white/5 ${isRequiringReinforcement ? 'bg-amber-500/5' : ''}`}>
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
                              </td>
                            );
                          })}
                          <td className="px-3 py-2 md:px-4 md:py-3 text-center border-l border-white/5 bg-[#0f172a] group-hover:bg-[#162032] md:sticky md:right-[90px] z-10 transition-colors">
                            <span className="font-bold text-base text-blue-400">
                              {totalReinforcements}
                            </span>
                          </td>
                          <td className="px-3 py-2 md:px-4 md:py-3 text-center border-l border-white/5 bg-[#0f172a] group-hover:bg-[#162032] md:sticky md:right-0 z-10 transition-colors">
                            <span className={`font-bold text-base ${avg !== null && avg < 7 ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {formatGrade(avg)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredStudents.length === 0 && (
                      <tr>
                        <td colSpan={filteredActivities.length + 3} className="px-6 py-12 text-center text-slate-500 italic">
                          No hay estudiantes registrados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 md:px-6 md:py-4 bg-white/5 border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
              <h2 className="font-bold flex flex-wrap items-center gap-2">
                Registro de Calificaciones
                <span className="text-blue-400 font-medium ml-2">
                  {currentSubject} | {selectedCourse} | {courseParams.trimestre}
                  {selectedComponent !== 'ALL' && ` | ${selectedComponent}`}
                </span>
              </h2>
              
              {!isCreatingActivity ? (
                <button
                  onClick={() => setIsCreatingActivity(true)}
                  disabled={isUnauthorized}
                  className={`px-4 py-2 rounded-lg text-sm font-bold shadow-lg transition-all flex items-center gap-2 ${isUnauthorized ? 'bg-slate-700 text-slate-400 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'}`}
                >
                  <PlusCircle className="w-4 h-4" />
                  Nueva Actividad
                </button>
              ) : (
                <form onSubmit={handleCreateActivity} className="flex flex-wrap items-center gap-3 bg-black/20 p-3 md:p-2 rounded-lg border border-white/10">
                  <input
                    type="text"
                    placeholder="Nombre de la actividad"
                    value={newActivityName}
                    onChange={(e) => setNewActivityName(e.target.value)}
                    className="px-3 py-1.5 bg-[#0f172a] border border-white/10 rounded-md focus:outline-none focus:border-blue-500 text-sm text-slate-200 flex-1 min-w-[140px]"
                    required
                  />
                  <select
                    value={newActivityComponent}
                    onChange={(e) => setNewActivityComponent(e.target.value as EvaluationComponent)}
                    className="px-3 py-1.5 bg-[#0f172a] border border-white/10 rounded-md focus:outline-none focus:border-blue-500 text-sm text-slate-200 flex-1 min-w-[120px]"
                  >
                    <option value="1º APORTE">1º APORTE</option>
                    <option value="2º APORTE">2º APORTE</option>
                    <option value="EVALUACIÓN FINAL">EVALUACIÓN FINAL</option>
                    <option value="SUPLETORIO">SUPLETORIO</option>
                    <option value="MEJORAMIENTO">MEJORAMIENTO</option>
                  </select>
                  {newActivityComponent === 'EVALUACIÓN FINAL' && (
                    <label className="flex items-center gap-2 text-sm text-slate-200">
                      <input 
                        type="checkbox"
                        checked={newActivityHasGlobalization}
                        onChange={(e) => setNewActivityHasGlobalization(e.target.checked)}
                        className="rounded border-white/10 bg-black/40 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                      />
                      Con Globalización
                    </label>
                  )}
                  <input
                    type="number"
                    placeholder="Calif. sobre"
                    value={newActivityMaxScore}
                    onChange={(e) => setNewActivityMaxScore(e.target.value)}
                    className="w-24 px-3 py-1.5 bg-[#0f172a] border border-white/10 rounded-md focus:outline-none focus:border-blue-500 text-sm text-slate-200"
                    title="Calificación máxima de la actividad (ej. 10)"
                  />
                  <button type="submit" className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-sm font-medium">
                    Guardar
                  </button>
                  <button type="button" onClick={() => setIsCreatingActivity(false)} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-md text-sm">
                    Cancelar
                  </button>
                </form>
              )}
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse min-w-max">
                <thead className="bg-[#0f172a] text-[11px] sm:text-xs uppercase tracking-wider text-slate-500 sticky top-0 z-30 shadow-md">
                  <tr>
                    <th className="px-4 py-3 font-semibold border-b border-r border-white/5 bg-[#0f172a] sticky left-0 z-40" rowSpan={2}>
                      Estudiante
                    </th>
                    {displayActivities.map(activity => {
                      const isEvalFinal = activity.component === 'EVALUACIÓN FINAL';
                      const isMejoramiento = activity.component === 'MEJORAMIENTO';
                      const hasGlob = isEvalFinal && activity.hasGlobalization;
                                            let colSpan = 6;
                      if (isEvalFinal) {
                        colSpan = hasGlob ? 5 : 4;
                      } else if (isMejoramiento) {
                        colSpan = 4;
                      }
                      
                      return (
                        <th key={activity.id} colSpan={colSpan} className="px-4 py-3 font-semibold text-center border-b border-r border-white/5 bg-[#162032] relative group/th">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmDeleteActivity(activity);
                            }}
                            disabled={isUnauthorized}
                            className="absolute top-2 right-2 p-1.5 opacity-100 md:opacity-0 md:group-hover/th:opacity-100 text-rose-400 hover:bg-rose-500/20 rounded transition-all z-10 cursor-pointer"
                            title="Eliminar actividad"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="flex flex-col items-center gap-2">
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
                          </div>
                        </th>
                      )
                    })}
                    <th className="px-4 py-3 font-semibold text-center border-b border-l border-white/5 bg-[#0f172a] md:sticky md:right-[90px] z-20" rowSpan={2}>
                      Promedio<br/>{selectedComponent === 'ALL' ? 'Trimestral' : 'Aporte'}
                    </th>
                    <th className="px-4 py-3 font-semibold text-center border-b border-l border-white/5 bg-[#0f172a] md:sticky md:right-0 z-20" rowSpan={2}>
                      Refuerzos<br/>Totales
                    </th>
                  </tr>
                  <tr>
                    {displayActivities.map(activity => {
                      const isEvalFinal = activity.component === 'EVALUACIÓN FINAL';
                      const isMejoramiento = activity.component === 'MEJORAMIENTO';
                      const hasGlob = isEvalFinal && activity.hasGlobalization;
                      return (
                      <React.Fragment key={'sub-'+activity.id}>
                        {hasGlob && <th className="px-2 py-2 font-semibold text-center border-b border-white/5 bg-[#0f172a] min-w-[70px]">Glob.</th>}
                        <th className="px-2 py-2 font-semibold text-center border-b border-white/5 bg-[#0f172a] min-w-[80px]">{isEvalFinal ? 'Escrita' : 'Orig.'}</th>
                        <th className="px-2 py-2 font-semibold text-center border-b border-r border-white/5 bg-[#0f172a] min-w-[70px] text-blue-400/70">Eq. 10</th>
                        {!isEvalFinal && !isMejoramiento && <th className="px-2 py-2 font-semibold text-center border-b border-white/5 bg-[#0f172a] min-w-[80px]">Ref.</th>}
                        {!isEvalFinal && !isMejoramiento && <th className="px-2 py-2 font-semibold text-center border-b border-r border-white/5 bg-[#0f172a] min-w-[70px] text-emerald-400/70">Ref Eq. 10</th>}
                        <th className="px-2 py-2 font-semibold text-center border-b border-white/5 bg-[#0f172a] min-w-[80px] text-slate-300">Definitiva</th>
                        <th className="px-2 py-2 font-semibold text-center border-b border-r border-white/5 bg-[#0f172a] min-w-[150px] text-slate-400">Obs.</th>
                      </React.Fragment>
                      )
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {filteredStudents.map(student => {
                    if (displayActivities.length === 0) return null;

                    const studentActivitiesData = displayActivities.map(a => {
                      const grade = getGradeRecord(student.id, a.id);
                      const isEvalFinal = a.component === 'EVALUACIÓN FINAL';
                      const origEq10 = computeCompositeOriginal(grade?.originalGrade ?? null, grade?.globalizationGrade ?? null, a.maxScore, a.globalizationMaxScore, isEvalFinal, a.hasGlobalization);
                      // Since we already calculated the eq10 for original, we pass it as 'original' and set maxScore to 10
                      const finalGrade = origEq10 !== null ? calculateFinalGrade(origEq10, grade?.reinforcementGrade ?? null, 10, a.reinforcementMaxScore) : null;
                      return { activity: a, grade, finalGrade, origEq10 };
                    });

                    const evaluated = studentActivitiesData.filter(a => a.finalGrade !== null);
                    
                    let avg = null;
                    if (selectedComponent === 'ALL') {
                      avg = calculateTrimestralAverage(student.id, activities, grades, courseParams.trimestre, selectedCourse, currentSubject);
                    } else {
                      avg = calculateComponentAverage(student.id, activities, grades, courseParams.trimestre, selectedComponent as any, selectedCourse, currentSubject);
                    }

                    const missingReinforcements = evaluated.filter(a => a.finalGrade! < 7 && a.grade?.reinforcementGrade == null);

                    const globalActivities = activities.filter(a => a.course === selectedCourse && a.subject === currentSubject);
                    const globalEvaluated = globalActivities.map(a => {
                       const g = getGradeRecord(student.id, a.id);
                       const isEvalFinal = a.component === 'EVALUACIÓN FINAL';
                       const origEq10 = computeCompositeOriginal(g?.originalGrade ?? null, g?.globalizationGrade ?? null, a.maxScore, a.globalizationMaxScore, isEvalFinal, a.hasGlobalization);
                       return origEq10 !== null ? calculateFinalGrade(origEq10, g?.reinforcementGrade ?? null, 10, a.reinforcementMaxScore) : null;
                    }).filter(val => val !== null);
                    const globalAvg = globalEvaluated.length > 0 ? globalEvaluated.reduce((acc, curr) => acc + curr!, 0) / globalEvaluated.length : null;
                    
                    const globalRefuerzos = grades.filter(g => 
                      g.studentId === student.id && 
                      g.reinforcementGrade !== null &&
                      globalActivities.some(a => a.id === g.activityId)
                    ).length;

                    return (
                      <tr key={student.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-4 py-3 border-r border-white/5 bg-[#0f172a] group-hover:bg-[#162032] sticky left-0 z-10 transition-colors">
                          <div className="font-bold text-slate-200 text-xs truncate max-w-[200px]" title={student.name}>{student.name}</div>
                          <div className="text-[11px] sm:text-xs text-slate-500 font-mono mt-0.5">{student.code}</div>
                        </td>
                        
                        {studentActivitiesData.map(({ activity, grade, finalGrade, origEq10 }) => {
                          const origMax = activity.maxScore || 10;
                          const refMax = activity.reinforcementMaxScore || origMax;
                          const isEvalFinal = activity.component === 'EVALUACIÓN FINAL';
                          const isMejoramiento = activity.component === 'MEJORAMIENTO';
                          const hasGlob = isEvalFinal && activity.hasGlobalization;
                          
                          const refEq10 = grade?.reinforcementGrade != null && !isNaN(grade.reinforcementGrade) ? (grade.reinforcementGrade / refMax) * 10 : null;
                          const isRequiringReinforcement = finalGrade !== null && finalGrade < 7 && !isEvalFinal && !isMejoramiento;
                          const isDefinitivaLow = finalGrade !== null && finalGrade < 7;
                          
                          return (
                            <React.Fragment key={student.id + '-' + activity.id}>
                              {hasGlob && (
                                <td className={'px-2 py-2 text-center border-white/5 ' + (isDefinitivaLow ? 'bg-amber-500/5' : '')}>
                                  <input
                                    type="number"
                                    min="0" step="0.01"
                                    value={grade?.globalizationGrade ?? ''}
                                    onChange={(e) => handleGradeChange(student.id, activity.id, 'globalization', e.target.value)}
                                    className={'w-14 px-1 py-1 text-center bg-[#0f172a] border border-white/10 rounded focus:outline-none focus:border-purple-500 font-mono text-xs ' + (isDefinitivaLow ? 'text-rose-400' : 'text-slate-200')}
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
                              </td>
                              
                              {/* Observation Input */}
                              <td className="px-2 py-2 text-center border-r border-white/5 bg-white/5">
                                <input
                                  type="text"
                                  value={grade?.observation ?? ''}
                                  placeholder="Obs..."
                                  onChange={(e) => handleGradeChange(student.id, activity.id, 'observation', e.target.value)}
                                  className="w-full px-2 py-1 text-left bg-[#0f172a] border border-white/10 rounded focus:outline-none focus:border-blue-500 text-xs text-slate-300 placeholder:text-slate-600"
                                  disabled={isUnauthorized}
                                />
                              </td>
                            </React.Fragment>
                          );
                        })}
                        
                        {/* Promedio Total Row */}
                        <td className="px-4 py-3 text-center border-l border-white/5 bg-[#0f172a] group-hover:bg-[#162032] md:sticky md:right-[90px] z-10 transition-colors">
                          <div className={'text-base font-bold ' + (avg !== null && avg < 7 ? 'text-rose-400' : 'text-emerald-400')} title="Promedio del periodo seleccionado">
                            {formatGrade(avg)}
                          </div>
                          {missingReinforcements.length > 0 && (
                            <div className="mt-1 text-[9px] sm:text-[10px] text-amber-400 leading-tight">
                              Falta Ref: {missingReinforcements.length} act.
                            </div>
                          )}
                        </td>
                        {/* Refuerzos Totales Row */}
                        <td className="px-4 py-3 text-center border-l border-white/5 bg-[#0f172a] group-hover:bg-[#162032] md:sticky md:right-0 z-10 transition-colors">
                          <span className="font-bold text-base text-blue-400" title="Total de refuerzos en todos los trimestres/aportes">
                            {globalRefuerzos}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={(displayActivities.length * 5) + 3} className="px-6 py-12 text-center text-slate-500 italic">
                        No hay estudiantes registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </section>
      </div>

      {/* Delete Confirmation Modal */}
      {activityToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Eliminar Actividad</h3>
            <p className="text-slate-300 text-sm mb-6">
              ¿Está seguro de eliminar la actividad <span className="font-semibold text-rose-400">"{activityToDelete.name}"</span>? 
              <br/><br/>
              Todas las calificaciones asociadas se perderán permanentemente. Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setActivityToDelete(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors font-medium text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={executeDeleteActivity}
                className="px-4 py-2 bg-rose-500/90 hover:bg-rose-500 text-white rounded-lg transition-colors font-medium text-sm shadow-lg shadow-rose-500/20"
              >
                Sí, eliminar actividad
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
