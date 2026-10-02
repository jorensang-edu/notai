import React, { useState, useMemo } from 'react';
import { 
  X, 
  Mail, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Clock, 
  Users, 
  Code, 
  Copy, 
  Check, 
  Eye, 
  RefreshCw,
  Sparkles,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { TUTOR_MATRIX } from '../tutorMatrix';
import { 
  getSimulatedWeeklyLowGrades, 
  groupLowGradesByTutorAndLevel, 
  generateTutorReportHtml, 
  getWeeklyPeriodText,
  executeWeeklyReportsPipeline,
  sendResendEmail,
  TutorReportData
} from '../services/emailReportService';
import { useAppStore } from '../store';

interface EmailNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: ReturnType<typeof useAppStore>;
}

export function EmailNotificationModal({ isOpen, onClose, store }: EmailNotificationModalProps) {
  const [activeTab, setActiveTab] = useState<'pilot' | 'preview' | 'cron' | 'all-tutors'>('pilot');
  const [testEmail, setTestEmail] = useState('jorensang@gmail.com');
  const [customApiKey, setCustomApiKey] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedTutorIndex, setSelectedTutorIndex] = useState(0);
  
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
    error?: string;
  } | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const weekPeriod = useMemo(() => getWeeklyPeriodText(7), []);

  // Prepare simulated alerts and group by tutor
  const simulatedAlerts = useMemo(() => {
    let alerts = getSimulatedWeeklyLowGrades();
    if (selectedLevel !== 'all') {
      alerts = alerts.filter(a => a.level.toLowerCase() === selectedLevel.toLowerCase());
    }
    return alerts;
  }, [selectedLevel]);

  const tutorReports = useMemo(() => {
    return groupLowGradesByTutorAndLevel(simulatedAlerts);
  }, [simulatedAlerts]);

  const currentPreviewTutor = tutorReports[selectedTutorIndex] || tutorReports[0];

  const currentPreviewHtml = useMemo(() => {
    if (!currentPreviewTutor) return '';
    return generateTutorReportHtml(currentPreviewTutor, weekPeriod);
  }, [currentPreviewTutor, weekPeriod]);

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSendPilot = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      setSendResult({
        success: false,
        message: 'Por favor ingrese un correo electrónico de destino válido.',
      });
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      // 1. Try hitting the local/Next.js/Vercel API endpoint
      const response = await fetch('/api/probar-correo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail.trim(),
          apiKey: customApiKey.trim() || undefined,
          simulated: true,
          level: selectedLevel !== 'all' ? selectedLevel : undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // If API returned an error, check if client fallback is possible
        if (customApiKey.trim()) {
          // Direct fallback from browser if API key provided in UI
          const sampleTutor = tutorReports.find(t => t.alerts.length > 0) || tutorReports[0];
          const pilotReport: TutorReportData = {
            tutorCode: 'PILOTO',
            tutorName: `${sampleTutor.tutorName} (Prueba Piloto)`,
            tutorEmail: testEmail.trim(),
            level: selectedLevel !== 'all' ? selectedLevel : 'Básica Superior y Bachillerato',
            courses: ['8 EGB A', '9 EGB B', '10 EGB B', '1 BACH. A', '2 BACH. B', '3 BACH. A'],
            alerts: simulatedAlerts,
          };

          const html = generateTutorReportHtml(pilotReport, weekPeriod);
          const res = await sendResendEmail({
            apiKey: customApiKey.trim(),
            to: testEmail.trim(),
            subject: `[Prueba Piloto CEDFI] Reporte Semanal de Calificaciones Bajas (< 7/10) - ${weekPeriod}`,
            html,
          });

          setSendResult({
            success: true,
            message: `¡Correo enviado exitosamente a ${testEmail}! ID de Resend: ${res.id}`,
            details: res,
          });
          return;
        }

        throw new Error(data.error || data.message || `Error del servidor (${response.status})`);
      }

      setSendResult({
        success: true,
        message: data.message || `¡Correo de prueba piloto enviado con éxito a ${testEmail}!`,
        details: data,
      });
    } catch (err: any) {
      setSendResult({
        success: false,
        message: 'No se pudo enviar el correo de prueba.',
        error: err.message || String(err),
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendAllTutors = async () => {
    setIsSending(true);
    setSendResult(null);

    try {
      const response = await fetch('/api/probar-correo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail.trim(),
          sendAllTutors: true,
          apiKey: customApiKey.trim() || undefined,
          simulated: false,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (customApiKey.trim()) {
          // Direct fallback from browser if API key provided in UI
          const pipelineResult = await executeWeeklyReportsPipeline({
            apiKey: customApiKey.trim(),
            overrideRecipientEmail: testEmail.trim(),
            simulated: store.activities.length === 0,
            activities: store.activities,
            grades: store.grades,
            students: store.students,
          });

          setSendResult({
            success: pipelineResult.failureCount === 0,
            message: `Despacho completado: ${pipelineResult.successCount} reportes enviados exitosamente.`,
            details: pipelineResult,
          });
          return;
        }

        throw new Error(data.error || data.message || `Error del servidor (${response.status})`);
      }

      setSendResult({
        success: data.success,
        message: data.message,
        details: data.data,
      });
    } catch (err: any) {
      setSendResult({
        success: false,
        message: 'Error al enviar reportes consolidados a los tutores.',
        error: err.message || String(err),
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Envío Semanal de Calificaciones Bajas (&lt; 7/10)
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
                  Resend API & Cron
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Automatización de reportes semanales por correo a los tutores con notas en riesgo
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-800 bg-slate-950/40 flex gap-2">
          <button
            onClick={() => setActiveTab('pilot')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'pilot'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>1. Prueba Piloto Directa</span>
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'preview'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>2. Vista Previa del Correo HTML</span>
          </button>

          <button
            onClick={() => setActiveTab('all-tutors')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'all-tutors'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>3. Matriz de Tutores y Niveles</span>
          </button>

          <button
            onClick={() => setActiveTab('cron')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'cron'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>4. Configuración Vercel Cron</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* Alert Status Banner (Visible across all tabs) */}
          {sendResult && (
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 ${
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
              <div className="text-xs space-y-1 flex-1">
                <p className="font-semibold text-sm">{sendResult.message}</p>
                {sendResult.error && (
                  <p className="font-mono text-xs opacity-90 break-words bg-rose-950/60 p-2 rounded border border-rose-800/40">
                    {sendResult.error}
                  </p>
                )}
                {sendResult.details?.resendId && (
                  <p className="text-[11px] text-slate-400">
                    ID de Seguimiento Resend: <code className="text-emerald-400">{sendResult.details.resendId}</code>
                  </p>
                )}
                {sendResult.details?.dispatches && Array.isArray(sendResult.details.dispatches) && (
                  <div className="mt-2 pt-2 border-t border-slate-700/50 space-y-1 max-h-40 overflow-y-auto">
                    <p className="text-[11px] font-bold text-slate-300">Desglose de Envíos:</p>
                    {sendResult.details.dispatches.map((d: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] py-0.5">
                        <span className="text-slate-300">
                          {d.tutorName} ({d.alertsCount} alertas)
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

          {/* TAB 1: PILOT TEST */}
          {activeTab === 'pilot' && (
            <div className="space-y-6">

              {/* Form Card */}
              <div className="bg-slate-800/50 border border-slate-700/70 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    Parámetros de la Prueba Piloto
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Petición directa HTTP a <code className="text-blue-300">api.resend.com/emails</code>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Correo personal de destino (Para recibir la prueba):
                    </label>
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="tu-correo@gmail.com"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      El reporte consolidado de notas &lt; 7.00/10 se enviará a este correo.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Clave de API de Resend (Opcional si está en .env):
                    </label>
                    <input
                      type="password"
                      value={customApiKey}
                      onChange={(e) => setCustomApiKey(e.target.value)}
                      placeholder="re_xxxxxxxxxxxxxx"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Si se deja vacío, se utilizará <code className="text-blue-300">process.env.RESEND_API_KEY</code>.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-slate-700/60">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-300 font-medium">Filtrar Nivel:</label>
                    <select
                      value={selectedLevel}
                      onChange={(e) => setSelectedLevel(e.target.value)}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="all">Ambos Niveles (Básica Superior y Bachillerato)</option>
                      <option value="Básica Superior">Únicamente Básica Superior</option>
                      <option value="Bachillerato">Únicamente Bachillerato</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSendPilot}
                      disabled={isSending}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-lg shadow-blue-600/30 transition-all"
                    >
                      {isSending ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Enviando...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Enviar Correo de Prueba Piloto</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Data Summary of simulated records */}
              <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                    <span>Notas &lt; 7.00/10 Preparadas para el Reporte Semanal:</span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-bold">
                      {simulatedAlerts.length} casos detectados
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Semana: <strong className="text-slate-200">{weekPeriod}</strong>
                  </span>
                </div>

                <div className="overflow-x-auto max-h-48 border border-slate-700/50 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800 text-slate-300 uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">Estudiante</th>
                        <th className="p-2.5">Curso</th>
                        <th className="p-2.5">Nivel</th>
                        <th className="p-2.5">Asignatura</th>
                        <th className="p-2.5 text-center">Calificación</th>
                        <th className="p-2.5">Observación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {simulatedAlerts.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="p-2.5 font-medium text-white">{item.studentName}</td>
                          <td className="p-2.5">{item.course}</td>
                          <td className="p-2.5 text-blue-400">{item.level}</td>
                          <td className="p-2.5">{item.subject}</td>
                          <td className="p-2.5 text-center">
                            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                              {item.grade.toFixed(2)} / 10
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-400 text-[11px]">{item.observation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: EMAIL PREVIEW */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700/60">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-300 font-semibold">Previsualizar Reporte de Tutor:</label>
                  <select
                    value={selectedTutorIndex}
                    onChange={(e) => setSelectedTutorIndex(Number(e.target.value))}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {tutorReports.map((t, idx) => (
                      <option key={t.tutorCode} value={idx}>
                        {t.tutorName} • {t.level} ({t.courses.join(', ')})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>Destinatario Real:</span>
                  <code className="text-blue-300 font-mono">{currentPreviewTutor?.tutorEmail}</code>
                </div>
              </div>

              {/* Iframe preview */}
              <div className="border border-slate-700 rounded-xl overflow-hidden shadow-inner bg-slate-100 h-[480px]">
                <iframe
                  title="Vista Previa de Correo"
                  srcDoc={currentPreviewHtml}
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          )}

          {/* TAB 3: ALL TUTORS & LEVELS */}
          {activeTab === 'all-tutors' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Nómina de Tutores y Cursos Asignados</h3>
                  <p className="text-xs text-slate-400">
                    Cada tutor recibe única y estrictamente el consolidado de sus cursos a cargo
                  </p>
                </div>

                <button
                  onClick={handleSendAllTutors}
                  disabled={isSending}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-indigo-600/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar a Todos (Simulación con override a {testEmail})</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tutorReports.map((tutor) => (
                  <div
                    key={tutor.tutorCode}
                    className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          {tutor.level}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">Cód: {tutor.tutorCode}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-1">{tutor.tutorName}</h4>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{tutor.tutorEmail}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-700/40 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-400">Cursos: </span>
                        <strong className="text-slate-200">{tutor.courses.join(', ')}</strong>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold text-[11px]">
                        {tutor.alerts.length} casos &lt; 7.00
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: VERCEL CRON CONFIG */}
          {activeTab === 'cron' && (
            <div className="space-y-5 text-xs text-slate-300">
              
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    1. Programación Automática con vercel.json
                  </h4>
                  <button
                    onClick={() => copyToClipboard(`{\n  "$schema": "https://openapi.vercel.sh/vercel.json",\n  "crons": [\n    {\n      "path": "/api/cron-reporte",\n      "schedule": "0 8 * * 1"\n    }\n  ]\n}`, 'vercel-json')}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded text-[11px] text-white"
                  >
                    {copiedKey === 'vercel-json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'vercel-json' ? 'Copiado' : 'Copiar vercel.json'}</span>
                  </button>
                </div>
                <p className="text-slate-400">
                  El archivo <code className="text-blue-300">vercel.json</code> ya se encuentra generado en la raíz del proyecto con la siguiente directiva:
                </p>
                <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-x-auto">
{`{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron-reporte",
      "schedule": "0 8 * * 1"
    }
  ]
}`}
                </pre>
                <p className="text-slate-400 text-[11px]">
                  • <strong>0 8 * * 1</strong>: Ejecuta el reporte todos los lunes a las 8:00 AM automáticamente.
                </p>
              </div>

              <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  2. Variables de Entorno Requeridas en Vercel
                </h4>
                <p className="text-slate-400">
                  En tu proyecto de Vercel, dirígete a <strong>Project Settings &gt; Environment Variables</strong> y añade las siguientes claves:
                </p>

                <div className="space-y-2">
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-mono font-bold text-blue-400">RESEND_API_KEY</div>
                      <div className="text-[11px] text-slate-400">Clave de API obtenida en resend.com/api-keys</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard('RESEND_API_KEY', 'key1')}
                      className="p-1.5 text-slate-400 hover:text-white"
                    >
                      {copiedKey === 'key1' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-mono font-bold text-blue-400">RESEND_FROM_EMAIL</div>
                      <div className="text-[11px] text-slate-400">Remitente: ej. "Reporte Semanal &lt;onboarding@resend.dev&gt;"</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard('RESEND_FROM_EMAIL', 'key2')}
                      className="p-1.5 text-slate-400 hover:text-white"
                    >
                      {copiedKey === 'key2' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-mono font-bold text-blue-400">CRON_SECRET</div>
                      <div className="text-[11px] text-slate-400">Token secreto para autorizar peticiones del Cron de Vercel (opcional pero recomendado)</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard('CRON_SECRET', 'key3')}
                      className="p-1.5 text-slate-400 hover:text-white"
                    >
                      {copiedKey === 'key3' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-2">
                <h4 className="font-bold text-sm text-white">3. Rutas de API Disponibles</h4>
                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="p-2 bg-slate-950 rounded border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-emerald-400 font-bold">POST / GET</span>{' '}
                      <span className="text-white">/api/probar-correo</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Prueba piloto personalizada</span>
                  </div>

                  <div className="p-2 bg-slate-950 rounded border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-blue-400 font-bold">GET</span>{' '}
                      <span className="text-white">/api/cron-reporte</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Invocado por el Cron de Vercel</span>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Unidad Educativa de Formación Integral - CEDFI • Sistema NotAI v2
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
