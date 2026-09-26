import { executeWeeklyReportsPipeline } from '../../../src/services/emailReportService';

export const dynamic = 'force-dynamic';

/**
 * Vercel Cron Endpoint: Se ejecuta automáticamente todas las semanas (ej. lunes 8:00 AM)
 * Configurado en vercel.json -> /api/cron-reporte
 */
export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}

async function handleCron(request: Request) {
  try {
    // Verificación opcional de seguridad con CRON_SECRET de Vercel
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new Response(
        JSON.stringify({ success: false, error: 'No autorizado: Token CRON_SECRET inválido o ausente' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Reporte Semanal <onboarding@resend.dev>';
    const overrideRecipient = process.env.OVERRIDE_TUTOR_EMAIL; // Opcional en modo staging/testing

    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Falta la variable de entorno RESEND_API_KEY en Vercel.' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Ejecuta el flujo consolidado agrupado por tutor y nivel educativo
    const result = await executeWeeklyReportsPipeline({
      apiKey,
      fromEmail,
      overrideRecipientEmail: overrideRecipient,
      simulated: false, // Intenta obtener notas reales de la base de datos (con fallback seguro a recientes)
    });

    return new Response(
      JSON.stringify({
        success: result.failureCount === 0,
        message: `Cron semanal ejecutado: ${result.successCount} tutores notificados.`,
        data: result,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Error en ejecución de cron semanal.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
