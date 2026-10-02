import type { IncomingMessage, ServerResponse } from 'http';
import { executeWeeklyReportsPipeline } from '../src/services/emailReportService';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');

  try {
    const authHeader = req.headers['authorization'];
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      res.statusCode = 401;
      res.end(JSON.stringify({ success: false, error: 'No autorizado: Token CRON_SECRET inválido' }));
      return;
    }

    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Reporte Semanal <onboarding@resend.dev>';
    const overrideRecipient = process.env.OVERRIDE_TUTOR_EMAIL;

    if (!apiKey) {
      res.statusCode = 500;
      res.end(JSON.stringify({ 
        success: false, 
        error: 'Falta la variable de entorno RESEND_API_KEY en Vercel.' 
      }));
      return;
    }

    let activities: any[] = [];
    let grades: any[] = [];

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
    } catch (dbErr) {
      console.warn('Advertencia: no se pudieron cargar actividades de Firestore, usando datos simulados:', dbErr);
    }

    const result = await executeWeeklyReportsPipeline({
      apiKey,
      fromEmail,
      overrideRecipientEmail: overrideRecipient,
      simulated: activities.length === 0,
      activities,
      grades,
    });

    res.statusCode = 200;
    res.end(JSON.stringify({
      success: result.failureCount === 0,
      message: `Cron semanal ejecutado con éxito: ${result.successCount} tutores notificados.`,
      data: result,
    }));
  } catch (err: any) {
    res.statusCode = 500;
    res.end(JSON.stringify({
      success: false,
      error: err.message || 'Error en ejecución de cron semanal.',
    }));
  }
}
