import type { IncomingMessage, ServerResponse } from 'http';
import { 
  executeWeeklyReportsPipeline, 
  sendResendEmail, 
  generateTutorReportHtml, 
  groupLowGradesByTutorAndLevel, 
  getSimulatedWeeklyLowGrades, 
  getWeeklyPeriodText,
  TutorReportData
} from '../src/services/emailReportService';

export default async function handler(req: IncomingMessage & { body?: any; query?: any }, res: ServerResponse) {
  // Configurar CORS y tipo de respuesta
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  try {
    let body: any = {};
    if (req.method === 'POST') {
      if (req.body && typeof req.body === 'object') {
        body = req.body;
      } else {
        const buffers = [];
        for await (const chunk of req) {
          buffers.push(chunk);
        }
        const data = Buffer.concat(buffers).toString();
        if (data) {
          try {
            body = JSON.parse(data);
          } catch {
            body = {};
          }
        }
      }
    } else {
      const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
      body = {
        email: url.searchParams.get('email'),
        apiKey: url.searchParams.get('apiKey'),
        simulated: true,
      };
    }

    const testEmail = body.email || body.testEmail || process.env.TEST_NOTIFICATION_EMAIL || 'jorensang@gmail.com';
    const apiKey = body.apiKey || process.env.RESEND_API_KEY;
    const fromEmail = body.fromEmail || process.env.RESEND_FROM_EMAIL || 'Reporte Semanal <onboarding@resend.dev>';
    const sendAllTutors = Boolean(body.sendAllTutors);
    const selectedLevel = body.level as string | undefined;

    if (!apiKey) {
      res.statusCode = 400;
      res.end(JSON.stringify({
        success: false,
        error: 'Falta la variable de entorno RESEND_API_KEY en Vercel o en el cuerpo de la petición.',
        instructions: 'Configura RESEND_API_KEY en Vercel > Settings > Environment Variables con tu clave de https://resend.com.',
      }));
      return;
    }

    // Generar notas simuladas menores a 7.00/10
    let simulatedAlerts = getSimulatedWeeklyLowGrades();
    if (selectedLevel) {
      simulatedAlerts = simulatedAlerts.filter(a => a.level.toLowerCase() === selectedLevel.toLowerCase());
    }

    const tutorReports = groupLowGradesByTutorAndLevel(simulatedAlerts);
    const weekPeriod = getWeeklyPeriodText(7);

    if (!sendAllTutors && testEmail) {
      const sampleTutor = tutorReports.find(t => t.alerts.length > 0) || tutorReports[0];
      
      const pilotReport: TutorReportData = {
        tutorCode: 'PILOTO',
        tutorName: `${sampleTutor.tutorName} (Prueba Piloto Tutoría)`,
        tutorEmail: testEmail,
        level: selectedLevel || 'Básica Superior y Bachillerato',
        courses: ['8 EGB A', '9 EGB B', '10 EGB B', '1 BACH. A', '2 BACH. B', '3 BACH. A'],
        alerts: simulatedAlerts,
      };

      const html = generateTutorReportHtml(pilotReport, weekPeriod);
      const subject = `[Prueba Piloto CEDFI] Reporte Semanal de Calificaciones Bajas (< 7/10) - ${weekPeriod}`;

      const resendResult = await sendResendEmail({
        apiKey,
        from: fromEmail,
        to: testEmail,
        subject,
        html,
      });

      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        message: `Correo de prueba piloto enviado exitosamente a ${testEmail}`,
        resendId: resendResult.id,
        recipient: testEmail,
        weekPeriod,
        totalAlerts: simulatedAlerts.length,
        tutorsConfigured: tutorReports.map(t => ({
          tutor: t.tutorName,
          email: t.tutorEmail,
          level: t.level,
          courses: t.courses,
          alertsCount: t.alerts.length,
        })),
      }));
      return;
    }

    const result = await executeWeeklyReportsPipeline({
      apiKey,
      fromEmail,
      overrideRecipientEmail: testEmail,
      simulated: true,
    });

    res.statusCode = 200;
    res.end(JSON.stringify({
      success: result.failureCount === 0,
      message: `Envío completado: ${result.successCount} reportes despachados correctamente.`,
      data: result,
    }));
  } catch (err: any) {
    res.statusCode = 500;
    res.end(JSON.stringify({
      success: false,
      error: err.message || 'Error inesperado al procesar correo de prueba.',
    }));
  }
}
