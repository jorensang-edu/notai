import type { IncomingMessage, ServerResponse } from 'http';
import { 
  executeWeeklyReportsPipeline, 
  sendResendEmail, 
  generateTutorReportHtml, 
  generateProtocolAuditReportHtml,
  PROTOCOL_AUDIT_EMAIL,
  groupLowGradesByTutorAndLevel, 
  getSimulatedWeeklyLowGrades, 
  getWeeklyPeriodText,
  TutorReportData,
  ProtocolConfirmationResult
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

      // Enviar e-mail de protocolo de envío realizado a jsangurimas@cedfi.edu.ec con el contenido despachado
      await new Promise(resolve => setTimeout(resolve, 600));
      const protocolRecipient = process.env.PROTOCOL_AUDIT_EMAIL || PROTOCOL_AUDIT_EMAIL;
      const isOnboardingDomain = Boolean(fromEmail && fromEmail.includes('onboarding@resend.dev'));
      let protocolTarget = protocolRecipient;
      let protocolRedirected = false;

      if (isOnboardingDomain && !protocolTarget.toLowerCase().includes('gmail.com')) {
        protocolTarget = testEmail;
        protocolRedirected = true;
      }

      const protocolNotice = protocolRedirected
        ? `Este correo de protocolo de envío realizado está dirigido institucionalmente a <strong>${protocolRecipient}</strong>. Fue entregado en <strong>${protocolTarget}</strong> porque el remitente actual (<em>onboarding@resend.dev</em>) está en modo prueba.`
        : undefined;

      const protocolHtml = generateProtocolAuditReportHtml({
        weekPeriodText: weekPeriod,
        tutorReports: [pilotReport],
        dispatches: [{
          tutorName: pilotReport.tutorName,
          tutorEmail: pilotReport.tutorEmail,
          sentTo: testEmail,
          level: pilotReport.level,
          courses: pilotReport.courses,
          alertsCount: pilotReport.alerts.length,
          success: true,
          resendId: resendResult.id,
        }],
        redirectNotice: protocolNotice,
      });

      let protocolConfirmation: ProtocolConfirmationResult | undefined;
      try {
        const protoRes = await sendResendEmail({
          apiKey,
          from: fromEmail,
          to: protocolTarget,
          subject: `[Protocolo Envío Realizado -> ${protocolRecipient}] [CEDFI NotAI] Prueba Piloto (${weekPeriod})`,
          html: protocolHtml,
        });
        protocolConfirmation = {
          protocolEmail: protocolRecipient,
          sentTo: protocolTarget,
          success: true,
          resendId: protoRes.id,
          redirected: protocolRedirected,
        };
      } catch (protoErr: any) {
        const errMsg = protoErr?.message || String(protoErr);
        if (!protocolRedirected && (errMsg.includes('only send testing emails') || errMsg.includes('testing email address'))) {
          try {
            await new Promise(resolve => setTimeout(resolve, 600));
            const fallbackProtoRes = await sendResendEmail({
              apiKey,
              from: fromEmail,
              to: testEmail,
              subject: `[Protocolo Envío Realizado -> ${protocolRecipient}] [CEDFI NotAI] Prueba Piloto (${weekPeriod})`,
              html: generateProtocolAuditReportHtml({
                weekPeriodText: weekPeriod,
                tutorReports: [pilotReport],
                dispatches: [{
                  tutorName: pilotReport.tutorName,
                  tutorEmail: pilotReport.tutorEmail,
                  sentTo: testEmail,
                  level: pilotReport.level,
                  courses: pilotReport.courses,
                  alertsCount: pilotReport.alerts.length,
                  success: true,
                  resendId: resendResult.id,
                }],
                redirectNotice: `Redirigido a <strong>${testEmail}</strong> (destinatario de protocolo: <strong>${protocolRecipient}</strong>).`,
              }),
            });
            protocolConfirmation = {
              protocolEmail: protocolRecipient,
              sentTo: testEmail,
              success: true,
              resendId: fallbackProtoRes.id,
              redirected: true,
            };
          } catch {
            // Ignorar fallo secundario
          }
        }
      }

      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        message: `Correo de prueba piloto enviado a ${testEmail} + Constancia de protocolo remitida a ${protocolRecipient}`,
        resendId: resendResult.id,
        protocolConfirmation,
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

    let activities: any[] = [];
    let grades: any[] = [];

    if (body.simulated === false) {
      try {
        const { db, auth } = await import('../src/firebase');
        const { signInAnonymously } = await import('firebase/auth');
        const { collection, getDocs } = await import('firebase/firestore');

        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }
        const actsSnap = await getDocs(collection(db, 'activities'));
        actsSnap.forEach(d => activities.push(d.data()));
        const gradesSnap = await getDocs(collection(db, 'grades'));
        gradesSnap.forEach(d => grades.push(d.data()));
      } catch {
        // Fallback to simulated if Firestore is unreachable
      }
    }

    const result = await executeWeeklyReportsPipeline({
      apiKey,
      fromEmail,
      overrideRecipientEmail: testEmail,
      simulated: body.simulated !== false || activities.length === 0,
      activities,
      grades,
    });

    res.statusCode = 200;
    res.end(JSON.stringify({
      success: result.failureCount === 0,
      message: `Envío completado: ${result.successCount} reportes a tutores despachados + correo de protocolo a ${result.protocolConfirmation?.protocolEmail || PROTOCOL_AUDIT_EMAIL}.`,
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
