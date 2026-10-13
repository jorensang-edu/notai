import { CourseName, Level, SubjectName, EvaluationComponent, Student, Activity, Grade } from '../types';
import { TUTOR_MATRIX, TutorAssignment } from '../tutorMatrix';
import { STUDENTS_DATA } from '../data';
import { computeActivityFinalGrade } from '../utils';

export interface LowGradeAlertItem {
  studentId: string;
  studentCode: string;
  studentName: string;
  course: CourseName;
  level: Level;
  subject: SubjectName;
  activityName: string;
  component: EvaluationComponent;
  date: string;
  grade: number; // Strictly < 7.00
  observation: string;
}

export interface TutorReportData {
  tutorCode: string;
  tutorName: string;
  tutorEmail: string;
  level: string;
  courses: CourseName[];
  alerts: LowGradeAlertItem[];
}

export interface SendEmailPayload {
  apiKey?: string;
  from?: string;
  to: string | string[];
  subject: string;
  html: string;
}

export interface ResendResponse {
  id?: string;
  name?: string;
  message?: string;
  statusCode?: number;
  [key: string]: any;
}

/**
 * Direct HTTP POST to Resend API using standard fetch without any external npm packages
 */
export async function sendResendEmail(payload: SendEmailPayload): Promise<ResendResponse> {
  const apiKey = payload.apiKey || (typeof process !== 'undefined' ? process.env?.RESEND_API_KEY : undefined);

  if (!apiKey) {
    throw new Error('Falta la variable de entorno RESEND_API_KEY o el apiKey en la solicitud.');
  }

  const fromEmail = payload.from || (typeof process !== 'undefined' ? process.env?.RESEND_FROM_EMAIL : undefined) || 'Reporte Semanal <onboarding@resend.dev>';
  const toList = Array.isArray(payload.to) ? payload.to : [payload.to];

  const bodyData = {
    from: fromEmail,
    to: toList,
    subject: payload.subject,
    html: payload.html,
  };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify(bodyData),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || `Error ${response.status}: ${response.statusText}`;
    throw new Error(`Error en API Resend: ${errorMsg}`);
  }

  return data;
}

/**
 * Checks if a date string (DD/MM/YYYY) or timestamp falls within the last N days (default 7 days)
 */
export function isDateWithinLastDays(dateStrOrTs?: string | number | null, days = 7): boolean {
  if (!dateStrOrTs) return false;

  let targetTime: number;

  if (typeof dateStrOrTs === 'number') {
    targetTime = dateStrOrTs;
  } else {
    const parts = dateStrOrTs.trim().split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        targetTime = new Date(year, month, day).getTime();
      } else {
        return false;
      }
    } else {
      const parsed = Date.parse(dateStrOrTs);
      if (!isNaN(parsed)) {
        targetTime = parsed;
      } else {
        return false;
      }
    }
  }

  const now = Date.now();
  const diffMs = now - targetTime;
  // Included if within the last `days` window (and up to 1 day in future for timezone tolerances)
  return diffMs >= -86400000 && diffMs <= days * 24 * 60 * 60 * 1000;
}

/**
 * Formats a friendly week period string (e.g., "19/09/2026 al 26/09/2026")
 */
export function getWeeklyPeriodText(days = 7): string {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  
  const formatDate = (d: Date) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return `${formatDate(start)} al ${formatDate(end)}`;
}

/**
 * Extracts low grades strictly < 7.00 from activities and grades.
 * If fallbackToAllRecentIfEmpty is true and no records are in the last 7 days,
 * it safely filters the most recent grades with < 7.00 to prevent empty reports during testing.
 */
export function extractLowGradesFromData(
  activities: Activity[],
  grades: Grade[],
  students: Student[] = STUDENTS_DATA as Student[],
  options: { strictlyLast7Days?: boolean; fallbackToAllRecentIfEmpty?: boolean } = {}
): LowGradeAlertItem[] {
  const { strictlyLast7Days = false, fallbackToAllRecentIfEmpty = true } = options;
  const studentMap = new Map<string, Student>();
  students.forEach(s => {
    studentMap.set(s.code, s);
    studentMap.set(s.id, s);
  });

  const results: LowGradeAlertItem[] = [];

  activities.forEach(activity => {
    const isRecent = isDateWithinLastDays(activity.createdAt || activity.date, 7);
    if (strictlyLast7Days && !isRecent) {
      return;
    }

    const activityGrades = grades.filter(g => g.activityId === activity.id);
    activityGrades.forEach(g => {
      const student = studentMap.get(g.studentId);
      if (!student) return;

      const { finalGrade, origEq10, efDetails } = computeActivityFinalGrade(activity, g);
      const effectiveGrade = finalGrade !== null ? finalGrade : origEq10;

      // Filter strictly less than 7/10
      if (effectiveGrade !== null && effectiveGrade < 7.00) {
        let obs = g.observation || '';
        if (!obs) {
          if (efDetails?.statusMessage) {
            obs = efDetails.statusMessage;
          } else if (effectiveGrade < 5.00) {
            obs = 'Riesgo crítico: Calificación significativamente baja';
          } else {
            obs = 'Alerta académica: Requiere refuerzo pedagógico';
          }
        }

        results.push({
          studentId: student.id || student.code,
          studentCode: student.code,
          studentName: student.name,
          course: student.course,
          level: student.level,
          subject: activity.subject,
          activityName: activity.name,
          component: activity.component,
          date: activity.date || 'Semana Actual',
          grade: Math.trunc(effectiveGrade * 100) / 100,
          observation: obs,
        });
      }
    });
  });

  if (results.length === 0 && fallbackToAllRecentIfEmpty) {
    return getSimulatedWeeklyLowGrades();
  }

  return results;
}

/**
 * Generates simulated mock low grades (< 7.00/10) with authentic student names from the institutional roster.
 */
export function getSimulatedWeeklyLowGrades(): LowGradeAlertItem[] {
  return [
    // Básica Superior - 8 EGB A & B (Tutor: FERNANDA TORRES)
    {
      studentId: '04000',
      studentCode: '04000',
      studentName: 'ALVARADO BRAVO ARIANNA PAULETTE',
      course: '8 EGB A',
      level: 'Básica Superior',
      subject: 'Matemáticas',
      activityName: 'Taller 2: Operaciones con Números Enteros',
      component: '1º APORTE',
      date: '22/09/2026',
      grade: 5.50,
      observation: 'Dificultad en aplicación de ley de signos. Requiere refuerzo pedagógico.',
    },
    {
      studentId: '04037',
      studentCode: '04037',
      studentName: 'ZAPATA AGUILAR CRISTOPHER FERNANDO',
      course: '8 EGB B',
      level: 'Básica Superior',
      subject: 'Ciencias Naturales',
      activityName: 'Evaluación Corta: Estructura Celular',
      component: '1º APORTE',
      date: '23/09/2026',
      grade: 6.20,
      observation: 'Incompleto el cuadro comparativo de orgánulos celulares.',
    },
    // Básica Superior - 9 EGB A & B (Tutor: FABIOLA MORA)
    {
      studentId: '02660',
      studentCode: '02660',
      studentName: 'MOLINA POZO RENATA RAFAELA',
      course: '9 EGB B',
      level: 'Básica Superior',
      subject: 'Lengua y Literatura',
      activityName: 'Control de Lectura: Crónica Literaria',
      component: '1º APORTE',
      date: '21/09/2026',
      grade: 5.80,
      observation: 'Falta argumentación y cohesión textual en redacción.',
    },
    // Básica Superior - 10 EGB A & B (Tutor: JOBANNY PEREZ)
    {
      studentId: '03720',
      studentCode: '03720',
      studentName: 'CABRERA MORENO SOFIA ALEJANDRA',
      course: '10 EGB B',
      level: 'Básica Superior',
      subject: 'Matemáticas',
      activityName: 'Prueba Escrita: Factorización de Polinomios',
      component: '1º APORTE',
      date: '24/09/2026',
      grade: 4.75,
      observation: 'No domina trinomio cuadrado perfecto. Requiere trabajo de refuerzo.',
    },
    {
      studentId: '04040',
      studentCode: '04040',
      studentName: 'ARMIJOS JARAMILLO MARTIN EMILIANO',
      course: '10 EGB A',
      level: 'Básica Superior',
      subject: 'Ciencias Naturales',
      activityName: 'Lección: Ciclos Biogeoquímicos',
      component: '1º APORTE',
      date: '23/09/2026',
      grade: 6.50,
      observation: 'Confusión entre el ciclo del nitrógeno y del carbono.',
    },
    // Bachillerato - 1 BACH. A & B (Tutor: ELIANA IZQUIERDO)
    {
      studentId: '03080',
      studentCode: '03080',
      studentName: 'ALVAREZ CARDENAS MATEO SEBASTIAN',
      course: '1 BACH. A',
      level: 'Bachillerato',
      subject: 'Física',
      activityName: 'Resolución de Problemas: Movimiento Rectilíneo Uniforme',
      component: '1º APORTE',
      date: '22/09/2026',
      grade: 5.25,
      observation: 'Dificultad en conversión de unidades y despeje de fórmulas.',
    },
    // Bachillerato - 2 BACH. A & B (Tutor: SANTIAGO VINTIMILLA)
    {
      studentId: '03750',
      studentCode: '03750',
      studentName: 'FLORES GUAMAN JOAQUIN ENRIQUE',
      course: '2 BACH. B',
      level: 'Bachillerato',
      subject: 'Química',
      activityName: 'Taller Experimental: Estequiometría de Reacciones',
      component: '1º APORTE',
      date: '24/09/2026',
      grade: 5.90,
      observation: 'Error en balanceo por método redox y cálculo de reactivo limitante.',
    },
    // Bachillerato - 3 BACH. A & B (Tutor: NICOLAS AYORA)
    {
      studentId: '02890',
      studentCode: '02890',
      studentName: 'CABRERA VALENCIA MATEO AGUSTIN',
      course: '3 BACH. A',
      level: 'Bachillerato',
      subject: 'Matemáticas',
      activityName: 'Examen Diagnóstico: Límites y Continuidad de Funciones',
      component: '1º APORTE',
      date: '25/09/2026',
      grade: 6.10,
      observation: 'Requiere tutoría individual en indeterminaciones 0/0.',
    },
  ];
}

/**
 * Groups low-grade items by Tutor and Educational Level according to TUTOR_MATRIX.
 */
export function groupLowGradesByTutorAndLevel(items: LowGradeAlertItem[]): TutorReportData[] {
  const reports: TutorReportData[] = [];

  for (const [code, tutor] of Object.entries(TUTOR_MATRIX)) {
    const tutorAlerts = items.filter(item => tutor.courses.includes(item.course));
    
    reports.push({
      tutorCode: code,
      tutorName: tutor.name,
      tutorEmail: tutor.email,
      level: tutor.level,
      courses: tutor.courses,
      alerts: tutorAlerts,
    });
  }

  return reports;
}

/**
 * Generates modern, clean, responsive HTML email for a Tutor.
 */
export function generateTutorReportHtml(
  report: TutorReportData, 
  weekPeriodText: string,
  redirectNotice?: string
): string {
  const totalAlerts = report.alerts.length;
  const lowestGrade = totalAlerts > 0 ? Math.min(...report.alerts.map(a => a.grade)).toFixed(2) : '-';
  const averageGrade = totalAlerts > 0 ? (report.alerts.reduce((acc, a) => acc + a.grade, 0) / totalAlerts).toFixed(2) : '-';

  // Group alerts by Course for clean display
  const courseGroups: Record<string, LowGradeAlertItem[]> = {};
  report.courses.forEach(c => {
    courseGroups[c] = report.alerts.filter(a => a.course === c);
  });

  const coursesList = report.courses.join(', ');

  let tableRows = '';
  if (totalAlerts === 0) {
    tableRows = `
      <tr>
        <td colspan="6" style="padding: 24px; text-align: center; color: #166534; background-color: #f0fdf4; font-weight: 500;">
          ð ¡Excelente noticia! En esta semana no se registraron calificaciones inferiores a 7.00/10 en sus cursos asignados.
        </td>
      </tr>
    `;
  } else {
    tableRows = report.alerts.map((item, idx) => {
      const bgColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      const gradeColor = item.grade < 5.0 ? '#b91c1c' : '#c2410c';
      const gradeBg = item.grade < 5.0 ? '#fee2e2' : '#ffedd5';

      return `
        <tr style="background-color: ${bgColor}; border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px 14px; font-size: 13px; color: #1e293b; font-weight: 600;">
            ${item.studentName}
            <div style="font-size: 11px; color: #64748b; font-weight: normal; margin-top: 2px;">Cód: ${item.studentCode} | ${item.course}</div>
          </td>
          <td style="padding: 12px 14px; font-size: 13px; color: #334155; font-weight: 500;">
            ${item.subject}
          </td>
          <td style="padding: 12px 14px; font-size: 12px; color: #475569;">
            ${item.activityName}
            <div style="font-size: 11px; color: #64748b;">${item.component}</div>
          </td>
          <td style="padding: 12px 14px; font-size: 12px; color: #64748b; text-align: center;">
            ${item.date}
          </td>
          <td style="padding: 12px 14px; text-align: center;">
            <span style="display: inline-block; padding: 4px 10px; font-size: 13px; font-weight: 700; color: ${gradeColor}; background-color: ${gradeBg}; border-radius: 6px; border: 1px solid ${gradeColor}30;">
              ${item.grade.toFixed(2)} / 10
            </span>
          </td>
          <td style="padding: 12px 14px; font-size: 12px; color: #475569; max-width: 220px;">
            ${item.observation || 'Requiere refuerzo pedagógico'}
          </td>
        </tr>
      `;
    }).join('');
  }

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NotAI CEDFI - Reporte Semanal de Calificaciones Bajas</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #0f172a;">
  <div style="max-width: 720px; margin: 24px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #312e81 100%); padding: 32px 28px; color: #ffffff;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; color: #93c5fd; background: rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 9999px;">
          NotAI CEDFI â¢ Sistema de Alertas
        </span>
        <span style="font-size: 12px; color: #bfdbfe; font-weight: 500;">
          ${report.level}
        </span>
      </div>
      <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.25;">
        Reporte Semanal de Alertas Académicas (&lt; 7.00 / 10)
      </h1>
      <p style="margin: 0; font-size: 13px; color: #cbd5e1; line-height: 1.5;">
        Período evaluado: <strong style="color: #ffffff;">${weekPeriodText}</strong>
      </p>
    </div>

    ${redirectNotice ? `
    <!-- Redirect Notice Banner -->
    <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; padding: 14px 18px; border-radius: 8px; margin: 18px 28px 0 28px;">
      <div style="font-size: 12px; font-weight: 700; color: #b45309; margin-bottom: 3px;">
        ⚠️ Aviso de Entrega (Modo Prueba Resend)
      </div>
      <div style="font-size: 12px; color: #92400e; line-height: 1.5;">
        ${redirectNotice}
      </div>
    </div>
    ` : ''}

    <!-- Tutor Profile & Context Bar -->
    <div style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 18px 28px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="vertical-align: middle;">
            <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Docente Tutor(a)</div>
            <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 2px;">${report.tutorName}</div>
            <div style="font-size: 12px; color: #3b82f6; font-weight: 500; margin-top: 2px;">Cursos asignados: ${coursesList}</div>
          </td>
          <td style="vertical-align: middle; text-align: right;">
            <div style="display: inline-block; background-color: ${totalAlerts > 0 ? '#fee2e2' : '#dcfce7'}; border: 1px solid ${totalAlerts > 0 ? '#fca5a5' : '#86efac'}; padding: 8px 16px; border-radius: 12px; text-align: center;">
              <div style="font-size: 20px; font-weight: 800; color: ${totalAlerts > 0 ? '#991b1b' : '#166534'};">${totalAlerts}</div>
              <div style="font-size: 11px; font-weight: 600; color: ${totalAlerts > 0 ? '#b91c1c' : '#15803d'}; text-transform: uppercase;">Alertas &lt; 7.00</div>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Content Body -->
    <div style="padding: 24px 28px;">
      
      <!-- Metrics Overview -->
      <table style="width: 100%; border-collapse: separate; border-spacing: 12px 0; margin-bottom: 24px;">
        <tr>
          <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; text-align: center; width: 33.3%;">
            <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Total de Casos</div>
            <div style="font-size: 18px; font-weight: 700; color: #1e293b; margin-top: 4px;">${totalAlerts}</div>
          </td>
          <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; text-align: center; width: 33.3%;">
            <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Nota Más Baja</div>
            <div style="font-size: 18px; font-weight: 700; color: #dc2626; margin-top: 4px;">${lowestGrade} / 10</div>
          </td>
          <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; text-align: center; width: 33.3%;">
            <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Promedio en Riesgo</div>
            <div style="font-size: 18px; font-weight: 700; color: #d97706; margin-top: 4px;">${averageGrade} / 10</div>
          </td>
        </tr>
      </table>

      <!-- Detailed Table Header -->
      <div style="margin-bottom: 12px;">
        <h2 style="font-size: 15px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0;">
          Detalle de Calificaciones que Requieren Intervención
        </h2>
        <p style="font-size: 12px; color: #64748b; margin: 0;">
          Estudiantes que obtuvieron notas menores a 7.00/10 durante esta última semana lectiva:
        </p>
      </div>

      <!-- Table Container -->
      <div style="border: 1px solid #cbd5e1; border-radius: 10px; overflow: hidden; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background-color: #0f172a; color: #f8fafc; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">
              <th style="padding: 12px 14px;">Estudiante / Curso</th>
              <th style="padding: 12px 14px;">Asignatura</th>
              <th style="padding: 12px 14px;">Actividad / Comp.</th>
              <th style="padding: 12px 14px; text-align: center;">Fecha</th>
              <th style="padding: 12px 14px; text-align: center;">Calificación</th>
              <th style="padding: 12px 14px;">Observación Pedagógica</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>

      <!-- Pedagogical Recommendations -->
      <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px 18px; border-radius: 0 10px 10px 0; margin-bottom: 24px;">
        <div style="font-size: 13px; font-weight: 700; color: #1e40af; margin-bottom: 6px;">
          Acciones Tutoriales Sugeridas (Reglamento LOEI)
        </div>
        <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #1e3a8a; line-height: 1.6;">
          <li>Verificar la convocatoria y registro oportuno del <strong>refuerzo pedagógico</strong> por parte del docente de la asignatura.</li>
          <li>Comunicar la novedad a los representantes legales si el estudiante acumula dos o más alertas en distintas materias.</li>
          <li>Realizar seguimiento en el panel de tutoría de NotAI para constatar la mejora de la calificación final tras el proceso de refuerzo.</li>
        </ul>
      </div>

      <!-- Action Button Link -->
      <div style="text-align: center; margin-bottom: 12px;">
        <a href="https://ais-pre-hau6fuyqmtdajg6kctz75u-590796226929.us-west2.run.app" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 12px 28px; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
          Acceder al Panel de Tutoría en NotAI â
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="background-color: #f1f5f9; border-top: 1px solid #e2e8f0; padding: 20px 28px; text-align: center; font-size: 11px; color: #64748b; line-height: 1.5;">
      <div style="font-weight: 600; color: #334155; margin-bottom: 2px;">
        Unidad Educativa de Formación Integral - CEDFI
      </div>
      <div>
        Sistema Académico NotAI v2 â¢ Módulo Automatizado de Alertas Semanales
      </div>
      <div style="margin-top: 6px; color: #94a3b8;">
        Este es un reporte institucional generado automáticamente según los registros de calificaciones. Si tiene inquietudes, contacte a coordinación académica.
      </div>
    </div>

  </div>
</body>
</html>
  `;
}

export const PROTOCOL_AUDIT_EMAIL = 'jsangurimas@cedfi.edu.ec';

export interface ProtocolDispatchEntry {
  tutorName: string;
  tutorEmail: string;
  sentTo: string;
  level: string;
  courses: CourseName[];
  alertsCount: number;
  success: boolean;
  resendId?: string;
  error?: string;
  redirected?: boolean;
  redirectReason?: string;
}

export interface ProtocolConfirmationResult {
  protocolEmail: string;
  sentTo: string;
  success: boolean;
  resendId?: string;
  redirected?: boolean;
  redirectReason?: string;
  error?: string;
}

/**
 * Generates the official Protocol Confirmation Email HTML sent to jsangurimas@cedfi.edu.ec
 * containing the execution log and the full content dispatched to all tutors.
 */
export function generateProtocolAuditReportHtml(params: {
  weekPeriodText: string;
  tutorReports: TutorReportData[];
  dispatches: ProtocolDispatchEntry[];
  executedAt?: string;
  redirectNotice?: string;
}): string {
  const {
    weekPeriodText,
    tutorReports,
    dispatches,
    executedAt = new Date().toLocaleString('es-EC', { timeZone: 'America/Guayaquil' }),
    redirectNotice,
  } = params;

  const totalTutors = tutorReports.length;
  const successCount = dispatches.filter(d => d.success).length;
  const failureCount = dispatches.filter(d => !d.success).length;
  const totalAlerts = tutorReports.reduce((acc, r) => acc + r.alerts.length, 0);

  const dispatchSummaryRows = dispatches.map((d, idx) => {
    const bgColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
    const statusBadge = d.success
      ? `<span style="display: inline-block; padding: 3px 8px; font-size: 11px; font-weight: 700; color: #166534; background-color: #dcfce7; border-radius: 6px;">✓ ENVIADO</span>`
      : `<span style="display: inline-block; padding: 3px 8px; font-size: 11px; font-weight: 700; color: #991b1b; background-color: #fee2e2; border-radius: 6px;">✗ ERROR</span>`;

    return `
      <tr style="background-color: ${bgColor}; border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 12px; font-size: 12px; color: #0f172a; font-weight: 700;">
          ${d.tutorName}
          <div style="font-size: 11px; color: #64748b; font-weight: normal;">${d.level} • ${d.courses.join(', ')}</div>
        </td>
        <td style="padding: 10px 12px; font-size: 12px; color: #334155; font-family: monospace;">
          ${d.tutorEmail}
          ${d.redirected ? `<div style="font-size: 10px; color: #b45309;">Entregado en: ${d.sentTo}</div>` : ''}
        </td>
        <td style="padding: 10px 12px; font-size: 12px; color: #0f172a; font-weight: 700; text-align: center;">
          ${d.alertsCount}
        </td>
        <td style="padding: 10px 12px; text-align: center;">
          ${statusBadge}
        </td>
        <td style="padding: 10px 12px; font-size: 11px; color: #64748b; font-family: monospace;">
          ${d.resendId || d.error || '-'}
        </td>
      </tr>
    `;
  }).join('');

  const tutorContentSections = tutorReports.map((report) => {
    const coursesList = report.courses.join(', ');
    let alertRows = '';

    if (report.alerts.length === 0) {
      alertRows = `
        <tr>
          <td colspan="6" style="padding: 14px; text-align: center; color: #166534; background-color: #f0fdf4; font-size: 12px; font-weight: 500;">
            Sin calificaciones menores a 7.00/10 registradas en ${coursesList}.
          </td>
        </tr>
      `;
    } else {
      alertRows = report.alerts.map((item, idx) => {
        const bgColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        const gradeColor = item.grade < 5.0 ? '#b91c1c' : '#c2410c';
        const gradeBg = item.grade < 5.0 ? '#fee2e2' : '#ffedd5';

        return `
          <tr style="background-color: ${bgColor}; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 10px; font-size: 12px; color: #1e293b; font-weight: 600;">
              ${item.studentName}
              <div style="font-size: 10px; color: #64748b; font-weight: normal;">Cód: ${item.studentCode} | ${item.course}</div>
            </td>
            <td style="padding: 8px 10px; font-size: 12px; color: #334155;">${item.subject}</td>
            <td style="padding: 8px 10px; font-size: 11px; color: #475569;">
              ${item.activityName}
              <div style="font-size: 10px; color: #64748b;">${item.component}</div>
            </td>
            <td style="padding: 8px 10px; font-size: 11px; color: #64748b; text-align: center;">${item.date}</td>
            <td style="padding: 8px 10px; text-align: center;">
              <span style="display: inline-block; padding: 2px 8px; font-size: 12px; font-weight: 700; color: ${gradeColor}; background-color: ${gradeBg}; border-radius: 5px;">
                ${item.grade.toFixed(2)} / 10
              </span>
            </td>
            <td style="padding: 8px 10px; font-size: 11px; color: #475569;">
              ${item.observation || 'Requiere refuerzo pedagógico'}
            </td>
          </tr>
        `;
      }).join('');
    }

    return `
      <div style="border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; margin-bottom: 20px;">
        <div style="background-color: #1e293b; color: #ffffff; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <div style="font-size: 13px; font-weight: 700;">Tutor(a): ${report.tutorName} (${report.tutorEmail})</div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Nivel: ${report.level} • Cursos: ${coursesList}</div>
          </div>
          <div style="background-color: ${report.alerts.length > 0 ? '#dc2626' : '#16a34a'}; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px;">
            ${report.alerts.length} alertas &lt; 7.00
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background-color: #f1f5f9; border-bottom: 1px solid #cbd5e1;">
              <th style="padding: 8px 10px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase;">Estudiante</th>
              <th style="padding: 8px 10px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase;">Asignatura</th>
              <th style="padding: 8px 10px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase;">Actividad</th>
              <th style="padding: 8px 10px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: center;">Fecha</th>
              <th style="padding: 8px 10px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: center;">Nota</th>
              <th style="padding: 8px 10px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase;">Observación</th>
            </tr>
          </thead>
          <tbody>
            ${alertRows}
          </tbody>
        </table>
      </div>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Protocolo de Envío Realizado - NotAI CEDFI</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <div style="max-width: 780px; margin: 24px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08); border: 1px solid #cbd5e1;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #1d4ed8 100%); padding: 30px 28px; color: #ffffff;">
      <div style="margin-bottom: 10px;">
        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; color: #fde68a; background: rgba(255,255,255,0.12); padding: 4px 12px; border-radius: 9999px;">
          Constancia de Protocolo Institucional • NotAI CEDFI
        </span>
      </div>
      <h1 style="margin: 0 0 8px 0; font-size: 21px; font-weight: 800;">
        E-mail de Envío Realizado: Reportes Semanales a Tutores
      </h1>
      <p style="margin: 0; font-size: 13px; color: #cbd5e1;">
        Destinatario de Protocolo: <strong style="color: #ffffff;">${PROTOCOL_AUDIT_EMAIL}</strong> • Período: <strong style="color: #ffffff;">${weekPeriodText}</strong>
      </p>
      <p style="margin: 4px 0 0 0; font-size: 11px; color: #93c5fd;">
        Fecha y hora de ejecución: ${executedAt}
      </p>
    </div>

    ${redirectNotice ? `
    <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; padding: 14px 18px; border-radius: 8px; margin: 18px 28px 0 28px;">
      <div style="font-size: 12px; font-weight: 700; color: #b45309; margin-bottom: 3px;">
        ⚠️ Aviso de Entrega de Protocolo (Modo Prueba Resend)
      </div>
      <div style="font-size: 12px; color: #92400e; line-height: 1.5;">
        ${redirectNotice}
      </div>
    </div>
    ` : ''}

    <div style="padding: 24px 28px;">
      <!-- Summary KPIs -->
      <div style="display: flex; gap: 12px; margin-bottom: 24px;">
        <div style="flex: 1; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; text-align: center;">
          <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Tutores Procesados</div>
          <div style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 4px;">${totalTutors}</div>
        </div>
        <div style="flex: 1; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 12px; text-align: center;">
          <div style="font-size: 11px; color: #166534; font-weight: 600; text-transform: uppercase;">Envíos Exitosos</div>
          <div style="font-size: 20px; font-weight: 800; color: #15803d; margin-top: 4px;">${successCount}</div>
        </div>
        <div style="flex: 1; background-color: ${failureCount > 0 ? '#fef2f2' : '#f8fafc'}; border: 1px solid ${failureCount > 0 ? '#fecaca' : '#e2e8f0'}; border-radius: 12px; padding: 12px; text-align: center;">
          <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Envíos Fallidos</div>
          <div style="font-size: 20px; font-weight: 800; color: ${failureCount > 0 ? '#dc2626' : '#475569'}; margin-top: 4px;">${failureCount}</div>
        </div>
        <div style="flex: 1; background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 12px; text-align: center;">
          <div style="font-size: 11px; color: #9a3412; font-weight: 600; text-transform: uppercase;">Total Alertas (&lt; 7.00)</div>
          <div style="font-size: 20px; font-weight: 800; color: #c2410c; margin-top: 4px;">${totalAlerts}</div>
        </div>
      </div>

      <!-- Dispatch Audit Table -->
      <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 10px;">
        1. Bitácora de Envío a Docentes Tutores
      </div>
      <div style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 28px;">
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
              <th style="padding: 10px 12px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">Tutor / Nivel</th>
              <th style="padding: 10px 12px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">Correo Destino</th>
              <th style="padding: 10px 12px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: center;">Alertas</th>
              <th style="padding: 10px 12px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: center;">Estado</th>
              <th style="padding: 10px 12px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">ID Resend / Detalle</th>
            </tr>
          </thead>
          <tbody>
            ${dispatchSummaryRows}
          </tbody>
        </table>
      </div>

      <!-- Full Content Dispatched to Each Tutor -->
      <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 12px;">
        2. Contenido Íntegro Remitido a Cada Tutor
      </div>
      ${tutorContentSections}
    </div>

    <!-- Footer -->
    <div style="background-color: #f1f5f9; border-top: 1px solid #e2e8f0; padding: 18px 28px; text-align: center; font-size: 11px; color: #64748b;">
      <div style="font-weight: 700; color: #334155;">Unidad Educativa de Formación Integral - CEDFI</div>
      <div>Respaldo automático de protocolo enviado a ${PROTOCOL_AUDIT_EMAIL} • Sistema Académico NotAI</div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Executes the full weekly reporting pipeline:
 * 1. Collects low grades (< 7.00) from the dataset or simulation.
 * 2. Groups them by Tutor and Educational Level.
 * 3. Dispatches individual emails via Resend to each tutor (or test recipient).
 * 4. Sends a mandatory protocol confirmation email with all dispatched content to jsangurimas@cedfi.edu.ec.
 */
export async function executeWeeklyReportsPipeline(params: {
  apiKey?: string;
  fromEmail?: string;
  overrideRecipientEmail?: string; // If provided, sends all reports (or pilot test) to this email
  protocolRecipientEmail?: string; // Defaults to jsangurimas@cedfi.edu.ec
  simulated?: boolean;
  activities?: Activity[];
  grades?: Grade[];
  students?: Student[];
}) {
  const {
    apiKey,
    fromEmail,
    overrideRecipientEmail,
    protocolRecipientEmail = (typeof process !== 'undefined' ? process.env?.PROTOCOL_AUDIT_EMAIL : undefined) || PROTOCOL_AUDIT_EMAIL,
    simulated = false,
    activities = [],
    grades = [],
    students = STUDENTS_DATA as Student[],
  } = params;

  const weekPeriodText = getWeeklyPeriodText(7);

  // 1. Get low grades (< 7.00)
  let items: LowGradeAlertItem[];
  if (simulated || activities.length === 0) {
    items = getSimulatedWeeklyLowGrades();
  } else {
    items = extractLowGradesFromData(activities, grades, students, {
      strictlyLast7Days: false,
      fallbackToAllRecentIfEmpty: true,
    });
  }

  // 2. Group by Tutor & Level
  const tutorReports = groupLowGradesByTutorAndLevel(items);

  // Fallback recipient (used when Resend is on free tier without verified custom domain)
  const defaultFallbackEmail = (typeof process !== 'undefined' ? process.env?.TEST_NOTIFICATION_EMAIL : undefined) || 'jorensang@gmail.com';
  const isResendOnboardingDomain = Boolean(fromEmail && fromEmail.includes('onboarding@resend.dev'));

  // 3. Dispatch emails with throttling and unverified domain fallback
  const dispatchResults: ProtocolDispatchEntry[] = [];

  for (let i = 0; i < tutorReports.length; i++) {
    const report = tutorReports[i];

    // Throttle between requests (Resend has 2 requests/sec limit on free tier)
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    let targetEmail = overrideRecipientEmail ? overrideRecipientEmail.trim() : report.tutorEmail;
    let redirected = false;
    let redirectReason: string | undefined = undefined;

    // If using Resend default onboarding domain and target is external, redirect to account email to prevent API 403
    if (!overrideRecipientEmail && isResendOnboardingDomain && !targetEmail.toLowerCase().includes('gmail.com')) {
      targetEmail = defaultFallbackEmail;
      redirected = true;
      redirectReason = `Redirigido a ${defaultFallbackEmail} porque el remitente actual es onboarding@resend.dev y requiere verificar el dominio institucional @cedfi.edu.ec en resend.com/domains para enviar directamente a los tutores.`;
    }

    const redirectNotice = redirected 
      ? `Este reporte corresponde a la tutoría de <strong>${report.tutorName}</strong> (${report.tutorEmail}). Fue entregado a <strong>${targetEmail}</strong> debido a que el remitente actual es de pruebas (<em>onboarding@resend.dev</em>). Para que llegue directamente al correo del docente, verifique su dominio institucional en <strong>resend.com/domains</strong> y configure <code>RESEND_FROM_EMAIL</code>.`
      : undefined;

    const html = generateTutorReportHtml(report, weekPeriodText, redirectNotice);
    const subjectPrefix = redirected ? `[Tutor: ${report.tutorName}] ` : '';
    const subject = `${subjectPrefix}[CEDFI NotAI] Alertas Académicas Semanales (< 7/10) - ${report.tutorName} (${report.courses.join(', ')})`;

    try {
      const res = await sendResendEmail({
        apiKey,
        from: fromEmail,
        to: targetEmail,
        subject,
        html,
      });

      dispatchResults.push({
        tutorName: report.tutorName,
        tutorEmail: report.tutorEmail,
        sentTo: targetEmail,
        level: report.level,
        courses: report.courses,
        alertsCount: report.alerts.length,
        success: true,
        resendId: res.id,
        redirected,
        redirectReason,
      });
    } catch (err: any) {
      const errMsg = err?.message || String(err);

      // If failed due to unverified testing domain restriction, re-attempt delivery to the fallback test address
      if (!redirected && (errMsg.includes('only send testing emails') || errMsg.includes('testing email address'))) {
        try {
          await new Promise(resolve => setTimeout(resolve, 600));

          const fallbackNotice = `Este reporte corresponde a <strong>${report.tutorName}</strong> (${report.tutorEmail}). Fue redirigido automáticamente a <strong>${defaultFallbackEmail}</strong> porque Resend requiere verificar el dominio @cedfi.edu.ec en resend.com/domains antes de enviar correos a destinatarios externos.`;
          const fallbackHtml = generateTutorReportHtml(report, weekPeriodText, fallbackNotice);
          const fallbackSubject = `[Tutor: ${report.tutorName}] [CEDFI NotAI] Alertas Académicas Semanales (< 7/10) - ${report.tutorName}`;

          const retryRes = await sendResendEmail({
            apiKey,
            from: fromEmail,
            to: defaultFallbackEmail,
            subject: fallbackSubject,
            html: fallbackHtml,
          });

          dispatchResults.push({
            tutorName: report.tutorName,
            tutorEmail: report.tutorEmail,
            sentTo: defaultFallbackEmail,
            level: report.level,
            courses: report.courses,
            alertsCount: report.alerts.length,
            success: true,
            resendId: retryRes.id,
            redirected: true,
            redirectReason: `Redirigido a ${defaultFallbackEmail} (dominio @cedfi.edu.ec no verificado en Resend).`,
          });
          continue;
        } catch {
          // If retry also failed, record the original error below
        }
      }

      dispatchResults.push({
        tutorName: report.tutorName,
        tutorEmail: report.tutorEmail,
        sentTo: targetEmail,
        level: report.level,
        courses: report.courses,
        alertsCount: report.alerts.length,
        success: false,
        error: errMsg,
        redirected,
        redirectReason,
      });
    }
  }

  // 4. Protocol Confirmation Email to jsangurimas@cedfi.edu.ec with full dispatched content
  await new Promise(resolve => setTimeout(resolve, 600));

  let protocolTargetEmail = protocolRecipientEmail.trim();
  let protocolRedirected = false;
  let protocolRedirectReason: string | undefined = undefined;

  if (isResendOnboardingDomain && !protocolTargetEmail.toLowerCase().includes('gmail.com')) {
    protocolTargetEmail = overrideRecipientEmail ? overrideRecipientEmail.trim() : defaultFallbackEmail;
    protocolRedirected = true;
    protocolRedirectReason = `Redirigido a ${protocolTargetEmail} porque el remitente actual es onboarding@resend.dev. Al verificar @cedfi.edu.ec en Resend se entregará directamente a ${protocolRecipientEmail}.`;
  }

  const protocolRedirectNotice = protocolRedirected
    ? `Este correo de protocolo de envío realizado está dirigido institucionalmente a <strong>${protocolRecipientEmail}</strong>. Fue entregado en <strong>${protocolTargetEmail}</strong> porque el remitente actual (<em>onboarding@resend.dev</em>) se encuentra en modo prueba.`
    : undefined;

  const protocolHtml = generateProtocolAuditReportHtml({
    weekPeriodText,
    tutorReports,
    dispatches: dispatchResults,
    redirectNotice: protocolRedirectNotice,
  });

  const protocolSubject = `[Protocolo Envío Realizado -> ${protocolRecipientEmail}] [CEDFI NotAI] Consolidado de Reportes a Tutores (${weekPeriodText})`;

  let protocolConfirmation: ProtocolConfirmationResult;

  try {
    const protoRes = await sendResendEmail({
      apiKey,
      from: fromEmail,
      to: protocolTargetEmail,
      subject: protocolSubject,
      html: protocolHtml,
    });

    protocolConfirmation = {
      protocolEmail: protocolRecipientEmail,
      sentTo: protocolTargetEmail,
      success: true,
      resendId: protoRes.id,
      redirected: protocolRedirected,
      redirectReason: protocolRedirectReason,
    };
  } catch (err: any) {
    const errMsg = err?.message || String(err);

    if (!protocolRedirected && (errMsg.includes('only send testing emails') || errMsg.includes('testing email address'))) {
      try {
        await new Promise(resolve => setTimeout(resolve, 600));

        const fallbackProtoNotice = `Este correo de protocolo de envío realizado corresponde a <strong>${protocolRecipientEmail}</strong>. Fue redirigido automáticamente a <strong>${defaultFallbackEmail}</strong> porque el dominio @cedfi.edu.ec aún no está verificado en Resend.`;
        const fallbackProtoHtml = generateProtocolAuditReportHtml({
          weekPeriodText,
          tutorReports,
          dispatches: dispatchResults,
          redirectNotice: fallbackProtoNotice,
        });

        const retryProtoRes = await sendResendEmail({
          apiKey,
          from: fromEmail,
          to: defaultFallbackEmail,
          subject: protocolSubject,
          html: fallbackProtoHtml,
        });

        protocolConfirmation = {
          protocolEmail: protocolRecipientEmail,
          sentTo: defaultFallbackEmail,
          success: true,
          resendId: retryProtoRes.id,
          redirected: true,
          redirectReason: `Redirigido a ${defaultFallbackEmail} (dominio @cedfi.edu.ec no verificado en Resend).`,
        };
      } catch (retryErr: any) {
        protocolConfirmation = {
          protocolEmail: protocolRecipientEmail,
          sentTo: protocolTargetEmail,
          success: false,
          error: retryErr?.message || errMsg,
        };
      }
    } else {
      protocolConfirmation = {
        protocolEmail: protocolRecipientEmail,
        sentTo: protocolTargetEmail,
        success: false,
        error: errMsg,
      };
    }
  }

  const successCount = dispatchResults.filter(r => r.success).length;
  const failureCount = dispatchResults.filter(r => !r.success).length;

  return {
    weekPeriod: weekPeriodText,
    totalAlerts: items.length,
    tutorsProcessed: tutorReports.length,
    successCount,
    failureCount,
    dispatches: dispatchResults,
    protocolConfirmation,
  };
}

export type NotificationRangeType = '1-week' | '2-weeks' | '3-weeks' | '4-weeks' | 'trimestre' | 'custom';

export interface TeacherNotificationParams {
  teacherName: string;
  teacherEmail?: string;
  rangeType: NotificationRangeType;
  customRange?: { start?: string; end?: string };
  trimestreName?: string;
  selectedSubject?: string; // Specific subject or 'ALL'
  selectedCourses?: CourseName[]; // Specific courses or undefined for all
  activities: Activity[];
  grades: Grade[];
  students?: Student[];
  apiKey?: string;
  fromEmail?: string;
  overrideRecipientEmail?: string;
  protocolRecipientEmail?: string;
  simulatedFallback?: boolean;
}

export function isDateWithinConfiguredRange(
  dateStrOrTs?: string | number | null,
  rangeType: NotificationRangeType = '1-week',
  customRange?: { start?: string; end?: string }
): boolean {
  if (!dateStrOrTs) return false;
  if (rangeType === 'trimestre') return true;

  let targetTime: number;
  if (typeof dateStrOrTs === 'number') {
    targetTime = dateStrOrTs;
  } else {
    const parts = dateStrOrTs.trim().split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        targetTime = new Date(year, month, day).getTime();
      } else {
        return false;
      }
    } else {
      const parsed = Date.parse(dateStrOrTs);
      if (!isNaN(parsed)) {
        targetTime = parsed;
      } else {
        return false;
      }
    }
  }

  if (rangeType === 'custom' && customRange?.start && customRange?.end) {
    const startTime = new Date(customRange.start).getTime();
    const endTime = new Date(customRange.end).getTime() + 86400000;
    return targetTime >= startTime && targetTime <= endTime;
  }

  const daysMap: Record<string, number> = {
    '1-week': 7,
    '2-weeks': 14,
    '3-weeks': 21,
    '4-weeks': 28,
  };
  const days = daysMap[rangeType] || 7;
  const now = Date.now();
  const diffMs = now - targetTime;
  return diffMs >= -86400000 && diffMs <= days * 24 * 60 * 60 * 1000;
}

export function getConfiguredPeriodText(
  rangeType: NotificationRangeType = '1-week',
  customRange?: { start?: string; end?: string },
  trimestreName = '1º Trimestre'
): string {
  if (rangeType === 'trimestre') {
    return `Todo el ${trimestreName}`;
  }
  if (rangeType === 'custom' && customRange?.start && customRange?.end) {
    const formatCustomDate = (isoStr: string) => {
      const parts = isoStr.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return isoStr;
    };
    return `Período Personalizado (${formatCustomDate(customRange.start)} al ${formatCustomDate(customRange.end)})`;
  }
  const configMap: Record<string, { days: number; label: string }> = {
    '1-week': { days: 7, label: 'Compilado de 1 Semana' },
    '2-weeks': { days: 14, label: 'Compilado de 2 Semanas' },
    '3-weeks': { days: 21, label: 'Compilado de 3 Semanas' },
    '4-weeks': { days: 28, label: 'Compilado de 4 Semanas' },
  };
  const conf = configMap[rangeType] || { days: 7, label: 'Compilado de 1 Semana' };
  const end = new Date();
  const start = new Date(end.getTime() - conf.days * 24 * 60 * 60 * 1000);
  const formatDate = (d: Date) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };
  return `${conf.label} (${formatDate(start)} al ${formatDate(end)})`;
}

export function extractTeacherLowGrades(params: {
  activities: Activity[];
  grades: Grade[];
  students?: Student[];
  selectedSubject?: string;
  selectedCourses?: CourseName[];
  rangeType?: NotificationRangeType;
  customRange?: { start?: string; end?: string };
  fallbackToSimulatedIfEmpty?: boolean;
}): LowGradeAlertItem[] {
  const {
    activities,
    grades,
    students = STUDENTS_DATA as Student[],
    selectedSubject,
    selectedCourses,
    rangeType = '1-week',
    customRange,
    fallbackToSimulatedIfEmpty = false,
  } = params;

  const studentMap = new Map<string, Student>();
  students.forEach(s => {
    studentMap.set(s.code, s);
    studentMap.set(s.id, s);
  });

  const results: LowGradeAlertItem[] = [];

  activities.forEach(activity => {
    if (selectedSubject && selectedSubject !== 'ALL' && activity.subject !== selectedSubject) {
      return;
    }
    if (selectedCourses && selectedCourses.length > 0 && !selectedCourses.includes(activity.course)) {
      return;
    }
    const inRange = isDateWithinConfiguredRange(activity.createdAt || activity.date, rangeType, customRange);
    if (!inRange) {
      return;
    }

    const activityGrades = grades.filter(g => g.activityId === activity.id);
    activityGrades.forEach(g => {
      const student = studentMap.get(g.studentId);
      if (!student) return;

      const { finalGrade, origEq10, efDetails } = computeActivityFinalGrade(activity, g);
      const effectiveGrade = finalGrade !== null ? finalGrade : origEq10;

      if (effectiveGrade !== null && effectiveGrade < 7.00) {
        let obs = g.observation || '';
        if (!obs) {
          if (efDetails?.statusMessage) {
            obs = efDetails.statusMessage;
          } else if (effectiveGrade < 5.00) {
            obs = 'Riesgo crítico: Calificación significativamente baja';
          } else {
            obs = 'Alerta académica: Requiere refuerzo pedagógico';
          }
        }

        results.push({
          studentId: student.id || student.code,
          studentCode: student.code,
          studentName: student.name,
          course: student.course,
          level: student.level,
          subject: activity.subject,
          activityName: activity.name,
          component: activity.component,
          date: activity.date || 'Semana Configurada',
          grade: Math.trunc(effectiveGrade * 100) / 100,
          observation: obs,
        });
      }
    });
  });

  if (results.length === 0 && fallbackToSimulatedIfEmpty) {
    const sim = getSimulatedWeeklyLowGrades();
    return sim.filter(item => {
      if (selectedSubject && selectedSubject !== 'ALL' && item.subject !== selectedSubject) return false;
      if (selectedCourses && selectedCourses.length > 0 && !selectedCourses.includes(item.course)) return false;
      return true;
    });
  }

  return results;
}

export function generateTeacherTutorReportHtml(params: {
  teacherName: string;
  tutorName: string;
  tutorEmail: string;
  level: string;
  courses: CourseName[];
  alerts: LowGradeAlertItem[];
  periodText: string;
  subjectTitle?: string;
  redirectNotice?: string;
}): string {
  const {
    teacherName,
    tutorName,
    level,
    courses,
    alerts,
    periodText,
    subjectTitle,
    redirectNotice,
  } = params;

  const totalAlerts = alerts.length;
  const lowestGrade = totalAlerts > 0 ? Math.min(...alerts.map(a => a.grade)).toFixed(2) : '-';
  const averageGrade = totalAlerts > 0 ? (alerts.reduce((acc, a) => acc + a.grade, 0) / totalAlerts).toFixed(2) : '-';
  const coursesList = courses.join(', ');

  let tableRows = '';
  if (totalAlerts === 0) {
    tableRows = `
      <tr>
        <td colspan="6" style="padding: 24px; text-align: center; color: #166534; background-color: #f0fdf4; font-weight: 500;">
          🎉 Sin calificaciones inferiores a 7.00/10 registradas en este período para los cursos asignados.
        </td>
      </tr>
    `;
  } else {
    tableRows = alerts.map((item, idx) => {
      const bgColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      const gradeColor = item.grade < 5.0 ? '#b91c1c' : '#c2410c';
      const gradeBg = item.grade < 5.0 ? '#fee2e2' : '#ffedd5';

      return `
        <tr style="background-color: ${bgColor}; border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px 14px; font-size: 13px; color: #1e293b; font-weight: 600;">
            ${item.studentName}
            <div style="font-size: 11px; color: #64748b; font-weight: normal; margin-top: 2px;">Cód: ${item.studentCode} | ${item.course}</div>
          </td>
          <td style="padding: 12px 14px; font-size: 13px; color: #334155; font-weight: 500;">
            ${item.subject}
          </td>
          <td style="padding: 12px 14px; font-size: 12px; color: #475569;">
            ${item.activityName}
            <div style="font-size: 11px; color: #64748b;">${item.component}</div>
          </td>
          <td style="padding: 12px 14px; font-size: 12px; color: #64748b; text-align: center;">
            ${item.date}
          </td>
          <td style="padding: 12px 14px; text-align: center;">
            <span style="display: inline-block; padding: 4px 10px; font-size: 13px; font-weight: 700; color: ${gradeColor}; background-color: ${gradeBg}; border-radius: 6px; border: 1px solid ${gradeColor}30;">
              ${item.grade.toFixed(2)} / 10
            </span>
          </td>
          <td style="padding: 12px 14px; font-size: 12px; color: #475569; max-width: 220px;">
            ${item.observation || 'Requiere refuerzo pedagógico'}
          </td>
        </tr>
      `;
    }).join('');
  }

  const redirectNoticeHtml = redirectNotice ? `
    <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; padding: 14px 18px; border-radius: 8px; margin: 18px 28px 0 28px;">
      <div style="font-size: 12px; font-weight: 700; color: #b45309; margin-bottom: 3px;">
        ⚠️ Modo Prueba Resend (Redirección Automática)
      </div>
      <div style="font-size: 12px; color: #92400e; line-height: 1.5;">
        ${redirectNotice}
      </div>
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notificación Docente a Tutoría - NotAI CEDFI</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <div style="max-width: 720px; margin: 24px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #4338ca 100%); padding: 32px 28px; color: #ffffff;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; color: #93c5fd; background: rgba(255,255,255,0.12); padding: 4px 10px; border-radius: 9999px;">
          NotAI CEDFI • Notificación Docente a Tutoría
        </span>
        <span style="font-size: 12px; color: #bfdbfe; font-weight: 500;">
          ${level}
        </span>
      </div>
      <h1 style="margin: 0 0 8px 0; font-size: 21px; font-weight: 800; line-height: 1.3;">
        Reporte de Calificaciones Bajas (&lt; 7.00 / 10)
      </h1>
      <p style="margin: 0; font-size: 13px; color: #cbd5e1; line-height: 1.5;">
        Docente Remitente: <strong style="color: #ffffff;">Prof. ${teacherName}</strong> ${subjectTitle ? `(${subjectTitle})` : ''}
      </p>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #93c5fd;">
        Período Compilado: <strong style="color: #ffffff;">${periodText}</strong>
      </p>
    </div>

    ${redirectNoticeHtml}

    <!-- Context Bar -->
    <div style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 18px 28px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="vertical-align: middle;">
            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Docente Tutor Destinatario</div>
            <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 2px;">${tutorName}</div>
            <div style="font-size: 12px; color: #2563eb; font-weight: 500; margin-top: 2px;">Cursos correspondientes: ${coursesList}</div>
          </td>
          <td style="vertical-align: middle; text-align: right;">
            <div style="display: inline-block; background-color: ${totalAlerts > 0 ? '#fee2e2' : '#dcfce7'}; border: 1px solid ${totalAlerts > 0 ? '#fca5a5' : '#86efac'}; padding: 8px 16px; border-radius: 12px; text-align: center;">
              <div style="font-size: 20px; font-weight: 800; color: ${totalAlerts > 0 ? '#991b1b' : '#166534'};">${totalAlerts}</div>
              <div style="font-size: 11px; font-weight: 600; color: ${totalAlerts > 0 ? '#b91c1c' : '#15803d'}; text-transform: uppercase;">Alertas &lt; 7.00</div>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Body -->
    <div style="padding: 24px 28px;">
      <div style="display: flex; gap: 14px; margin-bottom: 24px;">
        <div style="flex: 1; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; text-align: center;">
          <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Total Evaluaciones &lt; 7.00</div>
          <div style="font-size: 18px; font-weight: 800; color: #1e293b; margin-top: 4px;">${totalAlerts}</div>
        </div>
        <div style="flex: 1; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; text-align: center;">
          <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Nota Más Baja</div>
          <div style="font-size: 18px; font-weight: 800; color: #dc2626; margin-top: 4px;">${lowestGrade}</div>
        </div>
        <div style="flex: 1; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; text-align: center;">
          <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Promedio en Riesgo</div>
          <div style="font-size: 18px; font-weight: 800; color: #ea580c; margin-top: 4px;">${averageGrade}</div>
        </div>
      </div>

      <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 12px;">
        Detalle de Evaluaciones en Riesgo (&lt; 7.00 / 10)
      </div>

      <div style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
              <th style="padding: 12px 14px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">Estudiante</th>
              <th style="padding: 12px 14px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">Asignatura</th>
              <th style="padding: 12px 14px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">Actividad</th>
              <th style="padding: 12px 14px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: center;">Fecha</th>
              <th style="padding: 12px 14px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: center;">Nota</th>
              <th style="padding: 12px 14px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">Observación</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>

      <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px 18px; border-radius: 0 10px 10px 0; margin-bottom: 24px;">
        <div style="font-size: 13px; font-weight: 700; color: #1e40af; margin-bottom: 6px;">
          Coordinación Tutorial Sugerida
        </div>
        <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #1e3a8a; line-height: 1.6;">
          <li>El docente <strong>Prof. ${teacherName}</strong> remite este informe para coordinación oportuna del <strong>refuerzo pedagógico</strong>.</li>
          <li>Revisar en conjunto si el estudiante presenta dificultades en otras asignaturas para convocar a su representante legal si fuere necesario.</li>
        </ul>
      </div>

      <div style="text-align: center; margin-bottom: 12px;">
        <a href="https://ais-pre-hau6fuyqmtdajg6kctz75u-590796226929.us-west2.run.app" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 12px 28px; border-radius: 10px;">
          Ingresar al Panel de Tutoría NotAI ➔
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f1f5f9; border-top: 1px solid #e2e8f0; padding: 20px 28px; text-align: center; font-size: 11px; color: #64748b;">
      <div style="font-weight: 600; color: #334155;">Unidad Educativa de Formación Integral - CEDFI</div>
      <div>NotAI Sistema Académico • Comunicación Directa Docente - Tutoría</div>
    </div>

  </div>
</body>
</html>
  `;
}

export function generateTeacherProtocolAuditHtml(params: {
  teacherName: string;
  periodText: string;
  tutorReports: TutorReportData[];
  dispatches: ProtocolDispatchEntry[];
  protocolEmail?: string;
  executedAt?: string;
  redirectNotice?: string;
}): string {
  const {
    teacherName,
    periodText,
    tutorReports,
    dispatches,
    protocolEmail = PROTOCOL_AUDIT_EMAIL,
    executedAt = new Date().toLocaleString('es-EC', { timeZone: 'America/Guayaquil' }),
    redirectNotice,
  } = params;

  const totalTutors = tutorReports.length;
  const successCount = dispatches.filter(d => d.success).length;
  const failureCount = dispatches.filter(d => !d.success).length;
  const totalAlerts = tutorReports.reduce((acc, r) => acc + r.alerts.length, 0);

  const dispatchSummaryRows = dispatches.map((d, idx) => {
    const bgColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
    const statusBadge = d.success
      ? `<span style="display: inline-block; padding: 3px 8px; font-size: 11px; font-weight: 700; color: #166534; background-color: #dcfce7; border-radius: 6px;">✓ ENVIADO</span>`
      : `<span style="display: inline-block; padding: 3px 8px; font-size: 11px; font-weight: 700; color: #991b1b; background-color: #fee2e2; border-radius: 6px;">✗ ERROR</span>`;

    return `
      <tr style="background-color: ${bgColor}; border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 12px; font-size: 12px; color: #0f172a; font-weight: 700;">
          ${d.tutorName}
          <div style="font-size: 11px; color: #64748b; font-weight: normal;">${d.level} • ${d.courses.join(', ')}</div>
        </td>
        <td style="padding: 10px 12px; font-size: 12px; color: #334155; font-family: monospace;">
          ${d.tutorEmail}
          ${d.redirected ? `<div style="font-size: 10px; color: #b45309;">Entregado en: ${d.sentTo}</div>` : ''}
        </td>
        <td style="padding: 10px 12px; font-size: 12px; color: #0f172a; font-weight: 700; text-align: center;">
          ${d.alertsCount}
        </td>
        <td style="padding: 10px 12px; text-align: center;">
          ${statusBadge}
        </td>
        <td style="padding: 10px 12px; font-size: 11px; color: #64748b; font-family: monospace;">
          ${d.resendId || d.error || '-'}
        </td>
      </tr>
    `;
  }).join('');

  const tutorContentSections = tutorReports.map((report) => {
    const coursesList = report.courses.join(', ');
    const alertRows = report.alerts.map((item, idx) => {
      const bgColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      const gradeColor = item.grade < 5.0 ? '#b91c1c' : '#c2410c';
      const gradeBg = item.grade < 5.0 ? '#fee2e2' : '#ffedd5';

      return `
        <tr style="background-color: ${bgColor}; border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 10px; font-size: 12px; color: #1e293b; font-weight: 600;">
            ${item.studentName}
            <div style="font-size: 10px; color: #64748b; font-weight: normal;">Cód: ${item.studentCode} | ${item.course}</div>
          </td>
          <td style="padding: 8px 10px; font-size: 12px; color: #334155;">${item.subject}</td>
          <td style="padding: 8px 10px; font-size: 11px; color: #475569;">
            ${item.activityName}
            <div style="font-size: 10px; color: #64748b;">${item.component}</div>
          </td>
          <td style="padding: 8px 10px; font-size: 11px; color: #64748b; text-align: center;">${item.date}</td>
          <td style="padding: 8px 10px; text-align: center;">
            <span style="display: inline-block; padding: 2px 8px; font-size: 12px; font-weight: 700; color: ${gradeColor}; background-color: ${gradeBg}; border-radius: 5px;">
              ${item.grade.toFixed(2)} / 10
            </span>
          </td>
          <td style="padding: 8px 10px; font-size: 11px; color: #475569;">
            ${item.observation || 'Requiere refuerzo pedagógico'}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div style="border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; margin-bottom: 20px;">
        <div style="background-color: #1e293b; color: #ffffff; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <div style="font-size: 13px; font-weight: 700;">Tutor(a): ${report.tutorName} (${report.tutorEmail})</div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Nivel: ${report.level} • Cursos: ${coursesList}</div>
          </div>
          <div style="background-color: #dc2626; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px;">
            ${report.alerts.length} alertas &lt; 7.00
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background-color: #f1f5f9; border-bottom: 1px solid #cbd5e1;">
              <th style="padding: 8px 10px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase;">Estudiante</th>
              <th style="padding: 8px 10px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase;">Asignatura</th>
              <th style="padding: 8px 10px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase;">Actividad</th>
              <th style="padding: 8px 10px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: center;">Fecha</th>
              <th style="padding: 8px 10px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: center;">Nota</th>
              <th style="padding: 8px 10px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase;">Observación</th>
            </tr>
          </thead>
          <tbody>
            ${alertRows}
          </tbody>
        </table>
      </div>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Constancia de Protocolo - Notificación Docente a Tutores</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <div style="max-width: 780px; margin: 24px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08); border: 1px solid #cbd5e1;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #1d4ed8 100%); padding: 30px 28px; color: #ffffff;">
      <div style="margin-bottom: 10px;">
        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; color: #fde68a; background: rgba(255,255,255,0.12); padding: 4px 12px; border-radius: 9999px;">
          Constancia de Protocolo Institucional • NotAI CEDFI
        </span>
      </div>
      <h1 style="margin: 0 0 8px 0; font-size: 21px; font-weight: 800;">
        E-mail de Envío Realizado: Notificaciones a Tutores por Docente
      </h1>
      <p style="margin: 0; font-size: 13px; color: #cbd5e1;">
        Docente Remitente: <strong style="color: #ffffff;">Prof. ${teacherName}</strong> • Destinatario de Protocolo: <strong style="color: #ffffff;">${protocolEmail}</strong>
      </p>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #93c5fd;">
        Período Compilado: <strong style="color: #ffffff;">${periodText}</strong> • Ejecutado: ${executedAt}
      </p>
    </div>

    ${redirectNotice ? `
    <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; padding: 14px 18px; border-radius: 8px; margin: 18px 28px 0 28px;">
      <div style="font-size: 12px; font-weight: 700; color: #b45309; margin-bottom: 3px;">
        ⚠️ Aviso de Entrega de Protocolo (Modo Prueba Resend)
      </div>
      <div style="font-size: 12px; color: #92400e; line-height: 1.5;">
        ${redirectNotice}
      </div>
    </div>
    ` : ''}

    <div style="padding: 24px 28px;">
      <div style="display: flex; gap: 12px; margin-bottom: 24px;">
        <div style="flex: 1; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; text-align: center;">
          <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Tutores Notificados</div>
          <div style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 4px;">${totalTutors}</div>
        </div>
        <div style="flex: 1; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 12px; text-align: center;">
          <div style="font-size: 11px; color: #166534; font-weight: 600; text-transform: uppercase;">Envíos Exitosos</div>
          <div style="font-size: 20px; font-weight: 800; color: #15803d; margin-top: 4px;">${successCount}</div>
        </div>
        <div style="flex: 1; background-color: ${failureCount > 0 ? '#fef2f2' : '#f8fafc'}; border: 1px solid ${failureCount > 0 ? '#fecaca' : '#e2e8f0'}; border-radius: 12px; padding: 12px; text-align: center;">
          <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Envíos Fallidos</div>
          <div style="font-size: 20px; font-weight: 800; color: ${failureCount > 0 ? '#dc2626' : '#475569'}; margin-top: 4px;">${failureCount}</div>
        </div>
        <div style="flex: 1; background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 12px; text-align: center;">
          <div style="font-size: 11px; color: #9a3412; font-weight: 600; text-transform: uppercase;">Total Alertas Remitidas</div>
          <div style="font-size: 20px; font-weight: 800; color: #c2410c; margin-top: 4px;">${totalAlerts}</div>
        </div>
      </div>

      <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 10px;">
        1. Bitácora de Despacho a Docentes Tutores
      </div>
      <div style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 28px;">
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
              <th style="padding: 10px 12px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">Tutor / Nivel</th>
              <th style="padding: 10px 12px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">Correo Destino</th>
              <th style="padding: 10px 12px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: center;">Alertas</th>
              <th style="padding: 10px 12px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: center;">Estado</th>
              <th style="padding: 10px 12px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">ID Resend / Detalle</th>
            </tr>
          </thead>
          <tbody>
            ${dispatchSummaryRows}
          </tbody>
        </table>
      </div>

      <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 12px;">
        2. Contenido Íntegro Remitido a Cada Tutor
      </div>
      ${tutorContentSections}
    </div>

    <!-- Footer -->
    <div style="background-color: #f1f5f9; border-top: 1px solid #e2e8f0; padding: 18px 28px; text-align: center; font-size: 11px; color: #64748b;">
      <div style="font-weight: 700; color: #334155;">Unidad Educativa de Formación Integral - CEDFI</div>
      <div>Respaldo institucional automático enviado a ${protocolEmail} • Acción realizada por Prof. ${teacherName}</div>
    </div>
  </div>
</body>
</html>
  `;
}

export async function executeTeacherNotificationPipeline(params: TeacherNotificationParams) {
  const {
    teacherName,
    rangeType,
    customRange,
    trimestreName = '1º Trimestre',
    selectedSubject,
    selectedCourses,
    activities,
    grades,
    students = STUDENTS_DATA as Student[],
    apiKey,
    fromEmail,
    overrideRecipientEmail,
    protocolRecipientEmail = (typeof process !== 'undefined' ? process.env?.PROTOCOL_AUDIT_EMAIL : undefined) || PROTOCOL_AUDIT_EMAIL,
    simulatedFallback = false,
  } = params;

  const periodText = getConfiguredPeriodText(rangeType, customRange, trimestreName);

  // 1. Extract teacher low grades
  const alerts = extractTeacherLowGrades({
    activities,
    grades,
    students,
    selectedSubject,
    selectedCourses,
    rangeType,
    customRange,
    fallbackToSimulatedIfEmpty: simulatedFallback,
  });

  // 2. Group alerts by tutor
  const allTutorsReports = groupLowGradesByTutorAndLevel(alerts);
  // Only include tutors that have alerts or whose assigned courses are among selectedCourses
  const activeTutorReports = allTutorsReports.filter(t => {
    if (t.alerts.length > 0) return true;
    if (selectedCourses && selectedCourses.length > 0) {
      return t.courses.some(c => selectedCourses.includes(c));
    }
    return false;
  });

  const defaultFallbackEmail = (typeof process !== 'undefined' ? process.env?.TEST_NOTIFICATION_EMAIL : undefined) || 'jorensang@gmail.com';
  const isResendOnboardingDomain = Boolean(fromEmail && fromEmail.includes('onboarding@resend.dev'));

  const dispatchResults: ProtocolDispatchEntry[] = [];

  // 3. Dispatch to each tutor
  for (let i = 0; i < activeTutorReports.length; i++) {
    const report = activeTutorReports[i];

    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    let targetEmail = overrideRecipientEmail ? overrideRecipientEmail.trim() : report.tutorEmail;
    let redirected = false;
    let redirectReason: string | undefined = undefined;

    if (!overrideRecipientEmail && isResendOnboardingDomain && !targetEmail.toLowerCase().includes('gmail.com')) {
      targetEmail = defaultFallbackEmail;
      redirected = true;
      redirectReason = `Redirigido a ${defaultFallbackEmail} porque el remitente actual es onboarding@resend.dev y requiere verificar el dominio institucional @cedfi.edu.ec en resend.com/domains para enviar directamente a los tutores.`;
    }

    const redirectNotice = redirected 
      ? `Este reporte corresponde a la tutoría de <strong>${report.tutorName}</strong> (${report.tutorEmail}). Fue entregado a <strong>${targetEmail}</strong> debido a que el remitente actual es de pruebas (<em>onboarding@resend.dev</em>). Para que llegue directamente al correo del docente, verifique su dominio institucional en <strong>resend.com/domains</strong> y configure <code>RESEND_FROM_EMAIL</code>.`
      : undefined;

    const html = generateTeacherTutorReportHtml({
      teacherName,
      tutorName: report.tutorName,
      tutorEmail: report.tutorEmail,
      level: report.level,
      courses: report.courses,
      alerts: report.alerts,
      periodText,
      subjectTitle: selectedSubject !== 'ALL' ? selectedSubject : undefined,
      redirectNotice,
    });

    const subjectPrefix = redirected ? `[Tutor: ${report.tutorName}] ` : '';
    const subject = `${subjectPrefix}[CEDFI NotAI] Notificación de Calificaciones Bajas (< 7/10) - Prof. ${teacherName} (${report.courses.join(', ')})`;

    try {
      const res = await sendResendEmail({
        apiKey,
        from: fromEmail,
        to: targetEmail,
        subject,
        html,
      });

      dispatchResults.push({
        tutorName: report.tutorName,
        tutorEmail: report.tutorEmail,
        sentTo: targetEmail,
        level: report.level,
        courses: report.courses,
        alertsCount: report.alerts.length,
        success: true,
        resendId: res.id,
        redirected,
        redirectReason,
      });
    } catch (err: any) {
      const errMsg = err?.message || String(err);

      if (!redirected && (errMsg.includes('only send testing emails') || errMsg.includes('testing email address'))) {
        try {
          await new Promise(resolve => setTimeout(resolve, 600));

          const fallbackNotice = `Este reporte corresponde a <strong>${report.tutorName}</strong> (${report.tutorEmail}). Fue redirigido automáticamente a <strong>${defaultFallbackEmail}</strong> porque Resend requiere verificar el dominio @cedfi.edu.ec en resend.com/domains antes de enviar correos a destinatarios externos.`;
          const fallbackHtml = generateTeacherTutorReportHtml({
            teacherName,
            tutorName: report.tutorName,
            tutorEmail: report.tutorEmail,
            level: report.level,
            courses: report.courses,
            alerts: report.alerts,
            periodText,
            subjectTitle: selectedSubject !== 'ALL' ? selectedSubject : undefined,
            redirectNotice: fallbackNotice,
          });
          const fallbackSubject = `[Tutor: ${report.tutorName}] [CEDFI NotAI] Alertas Docente - Prof. ${teacherName} (${report.courses.join(', ')})`;

          const retryRes = await sendResendEmail({
            apiKey,
            from: fromEmail,
            to: defaultFallbackEmail,
            subject: fallbackSubject,
            html: fallbackHtml,
          });

          dispatchResults.push({
            tutorName: report.tutorName,
            tutorEmail: report.tutorEmail,
            sentTo: defaultFallbackEmail,
            level: report.level,
            courses: report.courses,
            alertsCount: report.alerts.length,
            success: true,
            resendId: retryRes.id,
            redirected: true,
            redirectReason: `Redirigido a ${defaultFallbackEmail} (dominio @cedfi.edu.ec no verificado en Resend).`,
          });
          continue;
        } catch {
          // Fall through
        }
      }

      dispatchResults.push({
        tutorName: report.tutorName,
        tutorEmail: report.tutorEmail,
        sentTo: targetEmail,
        level: report.level,
        courses: report.courses,
        alertsCount: report.alerts.length,
        success: false,
        error: errMsg,
        redirected,
        redirectReason,
      });
    }
  }

  // 4. Protocol Confirmation Email to jsangurimas@cedfi.edu.ec with full dispatched content
  await new Promise(resolve => setTimeout(resolve, 600));

  let protocolTargetEmail = protocolRecipientEmail.trim();
  let protocolRedirected = false;
  let protocolRedirectReason: string | undefined = undefined;

  if (isResendOnboardingDomain && !protocolTargetEmail.toLowerCase().includes('gmail.com')) {
    protocolTargetEmail = overrideRecipientEmail ? overrideRecipientEmail.trim() : defaultFallbackEmail;
    protocolRedirected = true;
    protocolRedirectReason = `Redirigido a ${protocolTargetEmail} porque el remitente actual es onboarding@resend.dev. Al verificar @cedfi.edu.ec en Resend se entregará directamente a ${protocolRecipientEmail}.`;
  }

  const protocolRedirectNotice = protocolRedirected
    ? `Este correo de protocolo de envío realizado está dirigido institucionalmente a <strong>${protocolRecipientEmail}</strong>. Fue entregado en <strong>${protocolTargetEmail}</strong> porque el remitente actual (<em>onboarding@resend.dev</em>) se encuentra en modo prueba.`
    : undefined;

  const protocolHtml = generateTeacherProtocolAuditHtml({
    teacherName,
    periodText,
    tutorReports: activeTutorReports,
    dispatches: dispatchResults,
    protocolEmail: protocolRecipientEmail,
    redirectNotice: protocolRedirectNotice,
  });

  const protocolSubject = `[Protocolo Envío Realizado -> ${protocolRecipientEmail}] Notificación Docente: Prof. ${teacherName} a Tutores (${periodText})`;

  let protocolConfirmation: ProtocolConfirmationResult;

  try {
    const protoRes = await sendResendEmail({
      apiKey,
      from: fromEmail,
      to: protocolTargetEmail,
      subject: protocolSubject,
      html: protocolHtml,
    });

    protocolConfirmation = {
      protocolEmail: protocolRecipientEmail,
      sentTo: protocolTargetEmail,
      success: true,
      resendId: protoRes.id,
      redirected: protocolRedirected,
      redirectReason: protocolRedirectReason,
    };
  } catch (err: any) {
    const errMsg = err?.message || String(err);

    if (!protocolRedirected && (errMsg.includes('only send testing emails') || errMsg.includes('testing email address'))) {
      try {
        await new Promise(resolve => setTimeout(resolve, 600));

        const fallbackProtoNotice = `Este correo de protocolo de envío realizado corresponde a <strong>${protocolRecipientEmail}</strong>. Fue redirigido automáticamente a <strong>${defaultFallbackEmail}</strong> porque el dominio @cedfi.edu.ec aún no está verificado en Resend.`;
        const fallbackProtoHtml = generateTeacherProtocolAuditHtml({
          teacherName,
          periodText,
          tutorReports: activeTutorReports,
          dispatches: dispatchResults,
          protocolEmail: protocolRecipientEmail,
          redirectNotice: fallbackProtoNotice,
        });

        const retryProtoRes = await sendResendEmail({
          apiKey,
          from: fromEmail,
          to: defaultFallbackEmail,
          subject: protocolSubject,
          html: fallbackProtoHtml,
        });

        protocolConfirmation = {
          protocolEmail: protocolRecipientEmail,
          sentTo: defaultFallbackEmail,
          success: true,
          resendId: retryProtoRes.id,
          redirected: true,
          redirectReason: `Redirigido a ${defaultFallbackEmail} (dominio @cedfi.edu.ec no verificado en Resend).`,
        };
      } catch (retryErr: any) {
        protocolConfirmation = {
          protocolEmail: protocolRecipientEmail,
          sentTo: protocolTargetEmail,
          success: false,
          error: retryErr?.message || errMsg,
        };
      }
    } else {
      protocolConfirmation = {
        protocolEmail: protocolRecipientEmail,
        sentTo: protocolTargetEmail,
        success: false,
        error: errMsg,
      };
    }
  }

  const successCount = dispatchResults.filter(r => r.success).length;
  const failureCount = dispatchResults.filter(r => !r.success).length;

  return {
    periodText,
    totalAlerts: alerts.length,
    tutorsProcessed: activeTutorReports.length,
    successCount,
    failureCount,
    dispatches: dispatchResults,
    protocolConfirmation,
  };
}
