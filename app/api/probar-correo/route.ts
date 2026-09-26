import { 
  executeWeeklyReportsPipeline, 
  sendResendEmail, 
  generateTutorReportHtml, 
  groupLowGradesByTutorAndLevel, 
  getSimulatedWeeklyLowGrades, 
  getWeeklyPeriodText,
  TutorReportData
} from '../../../src/services/emailReportService';

export const dynamic = 'force-dynamic';

/**
 * Endpoint de prueba piloto para envío de correos vía Resend API
 * Soporta POST con cuerpo JSON y GET con query params para pruebas rápidas
 */
export async function POST(request: Request) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const testEmail = body.email || body.testEmail || process.env.TEST_NOTIFICATION_EMAIL || 'jorensang@gmail.com';
    const apiKey = body.apiKey || process.env.RESEND_API_KEY;
    const fromEmail = body.fromEmail || process.env.RESEND_FROM_EMAIL || 'Reporte Semanal <onboarding@resend.dev>';
    const sendAllTutors = Boolean(body.sendAllTutors);
    const selectedLevel = body.level as string | undefined;

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Falta la variable de entorno RESEND_API_KEY en Vercel o en el cuerpo de la petición.',
          instructions: 'Configura RESEND_API_KEY en Vercel > Settings > Environment Variables con tu clave de https://resend.com.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!testEmail && !sendAllTutors) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Debe ingresar un correo electrónico de destino para la prueba piloto (ej: jorensang@gmail.com).',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generar notas simuladas menores a 7.00/10
    let simulatedAlerts = getSimulatedWeeklyLowGrades();
    if (selectedLevel) {
      simulatedAlerts = simulatedAlerts.filter(a => a.level.toLowerCase() === selectedLevel.toLowerCase());
    }

    // Agrupar por tutor y nivel educativo
    const tutorReports = groupLowGradesByTutorAndLevel(simulatedAlerts);
    const weekPeriod = getWeeklyPeriodText(7);

    // Si es prueba piloto a un correo personal específico
    if (!sendAllTutors && testEmail) {
      // Tomamos el primer tutor o un reporte consolidado representativo
      const sampleTutor = tutorReports.find(t => t.alerts.length > 0) || tutorReports[0];
      
      // Creamos un reporte consolidado con alertas de ambos niveles para la prueba piloto
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

      return new Response(
        JSON.stringify({
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
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Si se solicitó ejecutar el envío a todos los tutores con override a correo de prueba
    const result = await executeWeeklyReportsPipeline({
      apiKey,
      fromEmail,
      overrideRecipientEmail: testEmail,
      simulated: true,
    });

    return new Response(
      JSON.stringify({
        success: result.failureCount === 0,
        message: `Envío completado: ${result.successCount} reportes despachados correctamente.`,
        data: result,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Error inesperado al enviar correo de prueba.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email') || process.env.TEST_NOTIFICATION_EMAIL || 'jorensang@gmail.com';
  const apiKey = searchParams.get('apiKey') || process.env.RESEND_API_KEY;

  const fakeReq = new Request(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, apiKey, simulated: true }),
  });

  return POST(fakeReq);
}
