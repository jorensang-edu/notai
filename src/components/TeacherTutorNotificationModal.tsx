import React, { useState, useMemo } from 'react';
import { 
  X, 
  Mail, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Users, 
  Eye, 
  RefreshCw, 
  ShieldCheck, 
  Calendar, 
  Filter,
  Check,
  ChevronRight,
  BookOpen,
  GraduationCap
} from 'lucide-react';
import { useAppStore } from '../store';
import { CourseName, SubjectName } from '../types';
import { TUTOR_MATRIX } from '../tutorMatrix';
import { 
  NotificationRangeType,
  getConfiguredPeriodText,
  extractTeacherLowGrades,
  generateTeacherTutorReportHtml,
  generateTeacherProtocolAuditHtml,
  executeTeacherNotificationPipeline,
  sendResendEmail,
  groupLowGradesByTutorAndLevel,
  consolidateAlertsByStudent,
  PROTOCOL_AUDIT_EMAIL,
  ProtocolDispatchEntry,
  ProtocolConfirmationResult
} from '../services/emailReportService';

interface TeacherTutorNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: ReturnType<typeof useAppStore>;
  teacherName: string;
  teacherCode?: string;
  currentSubject: SubjectName;
  currentCourse: CourseName;
  permittedCourses?: CourseName[];
  permittedSubjects?: SubjectName[];
}

export function TeacherTutorNotificationModal({
  isOpen,
  onClose,
  store,
  teacherName,
  currentSubject,
  currentCourse,
  permittedCourses = [],
  permittedSubjects = [],
}: TeacherTutorNotificationModalProps) {
  const { activities, grades, students, courseParams } = store;

  // Tabs: 'config' (Alertas y Filtros), 'preview-tutor' (Vista previa tutor), 'preview-protocol' (Vista previa protocolo)
  const [activeTab, setActiveTab] = useState<'config' | 'preview-tutor' | 'preview-protocol'>('config');

  // Configuración de semanas / rango de tiempo
  const [rangeType, setRangeType] = useState<NotificationRangeType>('1-week');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Filtros de Asignatura y Cursos
  const [subjectFilter, setSubjectFilter] = useState<'current' | 'all'>('current');
  const [courseFilter, setCourseFilter] = useState<'current' | 'all'>('current');

  // Modo de envío: 'real' o 'pilot'
  const [deliveryMode, setDeliveryMode] = useState<'real' | 'pilot'>('real');
  const [testEmail, setTestEmail] = useState('jorensang@gmail.com');
  const [customApiKey, setCustomApiKey] = useState('');

  // Selector de tutor para vista previa
  const [selectedPreviewTutorIndex, setSelectedPreviewTutorIndex] = useState(0);

  // Estados de despacho
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
    error?: string;
  } | null>(null);

  // Lista de cursos evaluados según filtro
  const effectiveCourses = useMemo<CourseName[]>(() => {
    if (courseFilter === 'current') {
      return [currentCourse];
    }
    if (permittedCourses.length > 0) {
      return permittedCourses;
    }
    // Si no hay permisos explícitos, usar cursos únicos con actividades del docente
    const unique = Array.from(new Set(activities.map(a => a.course))) as CourseName[];
    return unique.length > 0 ? unique : [currentCourse];
  }, [courseFilter, currentCourse, permittedCourses, activities]);

  // Asignatura evaluada según filtro
  const effectiveSubject = useMemo<string>(() => {
    if (subjectFilter === 'current') {
      return currentSubject;
    }
    return 'ALL';
  }, [subjectFilter, currentSubject]);

  // Texto amigable del período compilado
  const configuredPeriodText = useMemo(() => {
    return getConfiguredPeriodText(
      rangeType,
      rangeType === 'custom' ? { start: customStartDate, end: customEndDate } : undefined,
      courseParams.trimestre
    );
  }, [rangeType, customStartDate, customEndDate, courseParams.trimestre]);

  // Extracción en vivo de calificaciones < 7.00
  const detectedAlerts = useMemo(() => {
    return extractTeacherLowGrades({
      activities,
      grades,
      students,
      selectedSubject: effectiveSubject,
      selectedCourses: effectiveCourses,
      rangeType,
      customRange: rangeType === 'custom' ? { start: customStartDate, end: customEndDate } : undefined,
      fallbackToSimulatedIfEmpty: false,
    });
  }, [activities, grades, students, effectiveSubject, effectiveCourses, rangeType, customStartDate, customEndDate]);

  // Consolidado de alertas por estudiante
  const consolidatedStudents = useMemo(() => {
    return consolidateAlertsByStudent(detectedAlerts);
  }, [detectedAlerts]);

  // Agrupación por Tutor de los cursos seleccionados
  const tutorGroups = useMemo(() => {
    const all = groupLowGradesByTutorAndLevel(detectedAlerts);
    return all.filter(t => {
      // Incluir tutores cuyos cursos a cargo coincidan con los cursos seleccionados
      return t.courses.some(c => effectiveCourses.includes(c));
    });
  }, [detectedAlerts, effectiveCourses]);

  const currentPreviewTutor = tutorGroups[selectedPreviewTutorIndex] || tutorGroups[0];

  // HTML generado para el tutor seleccionado
  const previewTutorHtml = useMemo(() => {
    if (!currentPreviewTutor) return '';
    return generateTeacherTutorReportHtml({
      teacherName,
      tutorName: currentPreviewTutor.tutorName,
      tutorEmail: currentPreviewTutor.tutorEmail,
      level: currentPreviewTutor.level,
      courses: currentPreviewTutor.courses.filter(c => effectiveCourses.includes(c)),
      alerts: currentPreviewTutor.alerts,
      periodText: configuredPeriodText,
      subjectTitle: effectiveSubject !== 'ALL' ? effectiveSubject : undefined,
    });
  }, [currentPreviewTutor, teacherName, effectiveCourses, configuredPeriodText, effectiveSubject]);

  // HTML generado para la constancia de protocolo institucional a jsangurimas@cedfi.edu.ec
  const previewProtocolHtml = useMemo(() => {
    const simulatedDispatches: ProtocolDispatchEntry[] = tutorGroups.map(t => ({
      tutorName: t.tutorName,
      tutorEmail: t.tutorEmail,
      sentTo: deliveryMode === 'pilot' ? testEmail : t.tutorEmail,
      level: t.level,
      courses: t.courses.filter(c => effectiveCourses.includes(c)),
      alertsCount: t.alerts.length,
      success: true,
      resendId: 're_simulacion_previa',
    }));

    return generateTeacherProtocolAuditHtml({
      teacherName,
      periodText: configuredPeriodText,
      tutorReports: tutorGroups,
      dispatches: simulatedDispatches,
      protocolEmail: PROTOCOL_AUDIT_EMAIL,
    });
  }, [tutorGroups, teacherName, configuredPeriodText, deliveryMode, testEmail, effectiveCourses]);

  // Manejo del despacho del correo
  const handleSendNotifications = async () => {
    setIsSending(true);
    setSendResult(null);

    const isPilot = deliveryMode === 'pilot';
    const overrideRecipient = isPilot ? testEmail.trim() : undefined;

    const payload = {
      action: 'teacher-notification',
      isTeacherSend: true,
      teacherName,
      rangeType,
      customRange: rangeType === 'custom' ? { start: customStartDate, end: customEndDate } : undefined,
      trimestreName: courseParams.trimestre,
      selectedSubject: effectiveSubject,
      selectedCourses: effectiveCourses,
      activities,
      grades,
      apiKey: customApiKey.trim() || undefined,
      overrideRecipientEmail: overrideRecipient,
      sendToRealTutors: !isPilot,
      simulatedFallback: detectedAlerts.length === 0,
    };

    try {
      // 1. Intentar endpoint backend en /api/probar-correo
      const response = await fetch('/api/probar-correo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Fallback en cliente si la API falló y el usuario proporcionó customApiKey o en dev
        const clientResult = await executeTeacherNotificationPipeline({
          teacherName,
          rangeType,
          customRange: rangeType === 'custom' ? { start: customStartDate, end: customEndDate } : undefined,
          trimestreName: courseParams.trimestre,
          selectedSubject: effectiveSubject,
          selectedCourses: effectiveCourses,
          activities,
          grades,
          students,
          apiKey: customApiKey.trim() || undefined,
          overrideRecipientEmail: overrideRecipient,
          protocolRecipientEmail: PROTOCOL_AUDIT_EMAIL,
          simulatedFallback: detectedAlerts.length === 0,
        });

        setSendResult({
          success: clientResult.failureCount === 0,
          message: `Despacho completado: ${clientResult.successCount} tutores notificados y constancia de protocolo enviada a ${PROTOCOL_AUDIT_EMAIL}.`,
          details: clientResult,
        });
        return;
      }

      setSendResult({
        success: data.success,
        message: data.message || `Notificaciones enviadas a los tutores con éxito y constancia de protocolo remitida a ${PROTOCOL_AUDIT_EMAIL}.`,
        details: data.data,
      });
    } catch (err: any) {
      // Fallback directo con client execution
      try {
        const clientResult = await executeTeacherNotificationPipeline({
          teacherName,
          rangeType,
          customRange: rangeType === 'custom' ? { start: customStartDate, end: customEndDate } : undefined,
          trimestreName: courseParams.trimestre,
          selectedSubject: effectiveSubject,
          selectedCourses: effectiveCourses,
          activities,
          grades,
          students,
          apiKey: customApiKey.trim() || undefined,
          overrideRecipientEmail: overrideRecipient,
          protocolRecipientEmail: PROTOCOL_AUDIT_EMAIL,
          simulatedFallback: detectedAlerts.length === 0,
        });

        setSendResult({
          success: clientResult.failureCount === 0,
          message: `Despacho completado: ${clientResult.successCount} tutores notificados y constancia de protocolo enviada a ${PROTOCOL_AUDIT_EMAIL}.`,
          details: clientResult,
        });
      } catch (fallbackErr: any) {
        setSendResult({
          success: false,
          message: 'Error al enviar notificaciones a los tutores.',
          error: fallbackErr.message || err.message || String(err),
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Notificar a Tutores con Calificaciones Bajas (&lt; 7.00/10)
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold hidden sm:inline-block">
                  Perfil Docente
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Remitente: <strong className="text-white">Prof. {teacherName}</strong> • {currentSubject} • {currentCourse}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-800 bg-slate-950/40 flex gap-2 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('config')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'config'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>1. Configurar Compilado y Alertas</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
              {detectedAlerts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('preview-tutor')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'preview-tutor'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>2. Vista Previa Correo al Tutor</span>
          </button>

          <button
            onClick={() => setActiveTab('preview-protocol')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'preview-protocol'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>3. Constancia de Protocolo ({PROTOCOL_AUDIT_EMAIL})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* Status Result Alert */}
          {sendResult && (
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 animate-in fade-in ${
                sendResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {sendResult.success ? (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
              )}
              <div className="text-xs space-y-1.5 flex-1">
                <p className="font-semibold text-sm">{sendResult.message}</p>
                {sendResult.error && (
                  <p className="font-mono text-xs opacity-90 break-words bg-rose-950/60 p-2 rounded border border-rose-800/40">
                    {sendResult.error}
                  </p>
                )}

                {/* Protocol confirmation info */}
                {sendResult.details?.protocolConfirmation && (
                  <div className="p-2 rounded-lg bg-indigo-950/70 border border-indigo-500/40 flex items-center justify-between text-[11px] text-indigo-200">
                    <div>
                      <span className="font-bold">Protocolo Institucional Entregado: </span>
                      <code className="text-white font-mono">{sendResult.details.protocolConfirmation.protocolEmail}</code>
                      {sendResult.details.protocolConfirmation.redirected && (
                        <span className="text-amber-400 ml-1.5">
                          (Modo prueba ➔ {sendResult.details.protocolConfirmation.sentTo})
                        </span>
                      )}
                    </div>
                    <span className="text-emerald-400 font-bold">✓ Constancia Registrada</span>
                  </div>
                )}

                {/* Dispatches list */}
                {sendResult.details?.dispatches && Array.isArray(sendResult.details.dispatches) && (
                  <div className="mt-2 pt-2 border-t border-slate-700/50 space-y-1 max-h-40 overflow-y-auto">
                    <p className="text-[11px] font-bold text-slate-300">Desglose de Tutores Notificados:</p>
                    {sendResult.details.dispatches.map((d: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] py-0.5">
                        <span className="text-slate-300">
                          {d.tutorName} ({d.alertsCount} casos &lt; 7.00)
                          {d.redirected && <span className="text-amber-400 ml-1.5">(Modo prueba ➔ {d.sentTo})</span>}
                        </span>
                        <span className={d.success ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          {d.success ? '✓ Entregado' : '✗ Falló'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 1: CONFIGURACIÓN Y ALERTA */}
          {activeTab === 'config' && (
            <div className="space-y-6">

              {/* Range & Filter Settings Card */}
              <div className="bg-slate-800/50 border border-slate-700/70 rounded-xl p-5 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-bold text-white">
                      1. Configurar Compilado de Semanas a Notificar
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-blue-300 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                    {configuredPeriodText}
                  </span>
                </div>

                {/* Range Selector Options */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Seleccione el período de evaluaciones a compilar:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                    {[
                      { type: '1-week', label: '1 Semana', desc: 'Últimos 7 días' },
                      { type: '2-weeks', label: '2 Semanas', desc: 'Últimos 14 días' },
                      { type: '3-weeks', label: '3 Semanas', desc: 'Últimos 21 días' },
                      { type: '4-weeks', label: '4 Semanas', desc: 'Último mes (28d)' },
                      { type: 'trimestre', label: 'Trimestre', desc: courseParams.trimestre },
                      { type: 'custom', label: 'Personalizado', desc: 'Rango de fechas' },
                    ].map((opt) => (
                      <button
                        key={opt.type}
                        type="button"
                        onClick={() => setRangeType(opt.type as NotificationRangeType)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          rangeType === opt.type
                            ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        <div className="text-xs font-bold">{opt.label}</div>
                        <div className="text-[10px] text-slate-400 truncate">{opt.desc}</div>
                      </button>
                    ))}
                  </div>

                  {/* Custom Date Pickers if custom range selected */}
                  {rangeType === 'custom' && (
                    <div className="mt-3 p-3 bg-slate-900 rounded-xl border border-slate-800 flex flex-wrap items-center gap-4 animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-400" />
                        <span className="text-xs font-semibold text-slate-300">Rango específico:</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] text-slate-400">Desde:</label>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] text-slate-400">Hasta:</label>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Scope: Asignatura y Cursos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-700/60">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                      <span>Alcance de Asignatura:</span>
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSubjectFilter('current')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                          subjectFilter === 'current'
                            ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                        }`}
                      >
                        {currentSubject}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubjectFilter('all')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                          subjectFilter === 'all'
                            ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                        }`}
                      >
                        Todas mis asignaturas
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
                      <span>Cursos a Notificar:</span>
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setCourseFilter('current')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                          courseFilter === 'current'
                            ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                        }`}
                      >
                        Solo {currentCourse}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCourseFilter('all')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                          courseFilter === 'all'
                            ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                        }`}
                      >
                        Todos mis cursos ({effectiveCourses.length})
                      </button>
                    </div>
                  </div>
                </div>

                {/* Delivery Mode & Protocol Confirmation Banner */}
                <div className="pt-3 border-t border-slate-700/60 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <span>Modo de Envío:</span>
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDeliveryMode('real')}
                        className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-all ${
                          deliveryMode === 'real'
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                        }`}
                      >
                        Envío Real a Tutores Institucionales
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryMode('pilot')}
                        className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-all ${
                          deliveryMode === 'pilot'
                            ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                        }`}
                      >
                        Modo Prueba (Simulación a mi correo)
                      </button>
                    </div>
                  </div>

                  {deliveryMode === 'pilot' && (
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center gap-3 animate-in fade-in">
                      <label className="text-xs text-slate-400">Correo destino de prueba:</label>
                      <input
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                        placeholder="tu-correo@gmail.com"
                      />
                    </div>
                  )}

                  {/* Protocol Institutional Notice Card */}
                  <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-xl flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-indigo-200">
                        Protocolo Institucional de Notificación a Tutores
                      </p>
                      <p className="text-slate-300 leading-relaxed text-[11px]">
                        Al confirmar el envío, cada tutor de curso recibirá su consolidado correspondiente y el sistema despachará automáticamente un e-mail de constancia de envío realizado con el contenido íntegro a <code className="text-white font-mono font-bold">{PROTOCOL_AUDIT_EMAIL}</code>.
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Detected Alerts Summary */}
              <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Calificaciones &lt; 7.00/10 Detectadas en este Período
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-bold">
                      {detectedAlerts.length} casos
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Tutores destinatarios: <strong className="text-white">{tutorGroups.length}</strong>
                  </span>
                </div>

                {/* Tutor groups cards preview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {tutorGroups.map((tg) => (
                    <div 
                      key={tg.tutorCode}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-2"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                            {tg.level}
                          </span>
                          <span className="text-[11px] font-bold text-rose-400">
                            {tg.alerts.length} alertas
                          </span>
                        </div>
                        <p className="text-xs font-bold text-white truncate">{tg.tutorName}</p>
                        <p className="text-[11px] font-mono text-slate-400 truncate">{tg.tutorEmail}</p>
                      </div>
                      <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                        Cursos: <span className="text-slate-200 font-medium">{tg.courses.filter(c => effectiveCourses.includes(c)).join(', ') || tg.courses.join(', ')}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Consolidated student cards */}
                {consolidatedStudents.length > 0 ? (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {consolidatedStudents.map((st, idx) => {
                      const isMulti = st.alerts.length > 1;
                      const isCritical = st.lowestGrade < 5.0;

                      return (
                        <div 
                          key={`${st.studentCode}_${st.course}`}
                          className={`rounded-xl border p-3.5 transition-all ${
                            isCritical 
                              ? 'bg-rose-950/20 border-rose-500/40' 
                              : isMulti 
                                ? 'bg-amber-950/20 border-amber-500/40' 
                                : 'bg-slate-900/90 border-slate-800'
                          }`}
                        >
                          {/* Student Header */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[10px] font-bold flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <div>
                                <span className="text-xs font-bold text-white">
                                  {st.studentName}
                                </span>
                                <div className="text-[10px] text-slate-400">
                                  Cód: <span className="text-slate-300 font-mono">{st.studentCode}</span> • Curso: <span className="text-blue-300 font-semibold">{st.course}</span> • {st.level}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                isCritical 
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' 
                                  : isMulti 
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                                    : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}>
                                {st.alerts.length} {st.alerts.length === 1 ? 'alerta' : 'alertas acumuladas'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Mín: <strong className="text-rose-400">{st.lowestGrade.toFixed(2)}</strong> | Prom: {st.averageGrade.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Individual evaluations under student */}
                          <div className="mt-2 space-y-1.5">
                            {st.alerts.map((al, aIdx) => (
                              <div 
                                key={aIdx} 
                                className="flex items-center justify-between gap-3 text-[11px] p-2 rounded-lg bg-slate-950/60 border border-slate-800/60"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-slate-200">{al.subject}</span>
                                    <span className="text-[10px] text-slate-400">({al.component})</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate">
                                    {al.activityName} • <span className="text-slate-500">{al.date}</span>
                                  </div>
                                  {al.observation && (
                                    <div className="text-[10px] text-slate-400 italic truncate mt-0.5">
                                      💬 {al.observation}
                                    </div>
                                  )}
                                </div>

                                <div className="text-right shrink-0">
                                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${
                                    al.grade < 5.0 
                                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' 
                                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  }`}>
                                    {al.grade.toFixed(2)} / 10
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center text-emerald-300 text-xs">
                    🎉 ¡Excelente! No se registraron calificaciones inferiores a 7.00/10 en el período y cursos configurados.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: VISTA PREVIA CORREO AL TUTOR */}
          {activeTab === 'preview-tutor' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700/60">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-300 font-semibold">Previsualizar Reporte para el Tutor:</label>
                  <select
                    value={selectedPreviewTutorIndex}
                    onChange={(e) => setSelectedPreviewTutorIndex(Number(e.target.value))}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {tutorGroups.map((tg, idx) => (
                      <option key={tg.tutorCode} value={idx}>
                        {tg.tutorName} • {tg.level} ({tg.alerts.length} alertas)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>Destinatario Tutor:</span>
                  <code className="text-blue-300 font-mono">{currentPreviewTutor?.tutorEmail}</code>
                </div>
              </div>

              {/* Iframe preview */}
              <div className="border border-slate-700 rounded-xl overflow-hidden shadow-inner bg-slate-100 h-[460px]">
                <iframe
                  title="Vista Previa del Correo al Tutor"
                  srcDoc={previewTutorHtml}
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          )}

          {/* TAB 3: VISTA PREVIA CONSTANCIA DE PROTOCOLO */}
          {activeTab === 'preview-protocol' && (
            <div className="space-y-4">
              <div className="p-3 bg-indigo-950/40 border border-indigo-500/40 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-indigo-200">
                    Constancia Oficial de Protocolo de Envío Realizado
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Este es el correo de auditoría institucional que recibirá <strong className="text-white font-mono">{PROTOCOL_AUDIT_EMAIL}</strong> con todo el compilado despachado.
                  </p>
                </div>
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                  Destinatario: {PROTOCOL_AUDIT_EMAIL}
                </span>
              </div>

              {/* Iframe preview protocol */}
              <div className="border border-slate-700 rounded-xl overflow-hidden shadow-inner bg-slate-100 h-[460px]">
                <iframe
                  title="Vista Previa de la Constancia de Protocolo"
                  srcDoc={previewProtocolHtml}
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer / Action Button */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="text-xs text-slate-400">
            <span>Compilado: </span>
            <strong className="text-white">{configuredPeriodText}</strong> • <span>Alertas: </span>
            <strong className="text-rose-400">{detectedAlerts.length}</strong>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>

            <button
              onClick={handleSendNotifications}
              disabled={isSending}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Despachando notificaciones y constancia...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Enviar Notificaciones a Tutores ({tutorGroups.length})</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
