import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';

const FROM = process.env.RESEND_FROM ?? 'onboarding@resend.dev';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error('[EMAIL] RESEND_API_KEY mancante — email non inviata');
    return null;
  }
  return new Resend(key);
}

async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ sent: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) return { sent: false, error: 'RESEND_API_KEY mancante' };

  console.log('[EMAIL] FROM:', FROM, '→ TO:', to, '— Oggetto:', subject);
  try {
    const result = await resend.emails.send({ from: FROM, to, subject, html });
    if (result.error) {
      const errMsg = `${result.error.name}: ${result.error.message}`;
      console.error('[EMAIL] Rifiutata da Resend:', errMsg);
      return { sent: false, error: errMsg };
    }
    console.log('[EMAIL] Inviata — ID:', result.data?.id);
    return { sent: true };
  } catch (error: any) {
    const errMsg = error?.message ?? String(error);
    console.error('[EMAIL] ERRORE invio a', to, ':', errMsg);
    return { sent: false, error: errMsg };
  }
}

export async function sendAccessRequestNotification(data: {
  nome: string;
  cognome: string;
  organizzazione: string;
  email: string;
  telefono?: string | null;
}): Promise<void> {
  await sendEmail({
    to: 'e.mazzolari@meridiano361.it',
    subject: `Nuova richiesta di accesso - ${data.nome} ${data.cognome} - ${data.organizzazione}`,
    html: `
      <h2>Nuova richiesta di accesso al portale ON EARTH B2B</h2>
      <p><strong>Organizzazione:</strong> ${data.organizzazione}</p>
      <p><strong>Nome:</strong> ${data.nome} ${data.cognome}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Telefono:</strong> ${data.telefono || 'non fornito'}</p>
      <p><strong>Data:</strong> ${new Date().toLocaleString('it-IT')}</p>
      <br>
      <a href="https://app.b2b.on-earth.it/admin/access-requests">Gestisci la richiesta</a>
    `,
  });
}

// Re-export the type for callers that need to inspect errors
export type EmailResult = { sent: boolean; error?: string };

export async function sendCredenziali(params: {
  nome: string;
  email: string;
  password: string;
  orgNome: string;
  noteCliente?: string | null;
}): Promise<{ sent: boolean; error?: string }> {
  const notaHtml = params.noteCliente
    ? `<div style="border-left:3px solid #ACA39A;padding:12px 16px;margin:0 0 24px;background:#FDFAF7;border-radius:4px;">
        <p style="color:#374151;font-size:14px;margin:0;line-height:1.6;">${params.noteCliente.replace(/\n/g, '<br>')}</p>
       </div>`
    : '';

  // Read customized subject and body from AppSettings
  let emailOggetto = 'Benvenuto su ON EARTH B2B — Le tue credenziali di accesso';
  let emailCorpo = `Il tuo accesso alla piattaforma <strong>ON EARTH B2B</strong> è stato attivato. Puoi accedere da qualsiasi dispositivo, anche installando l'app sulla schermata home del telefono.`;
  let emailCorpoPost = '';
  try {
    const settings = await prisma.appSettings.findMany({
      where: { chiave: { in: ['email_credenziali_oggetto', 'email_credenziali_corpo', 'email_credenziali_corpo_post'] } },
    });
    for (const s of settings) {
      if (s.chiave === 'email_credenziali_oggetto' && s.valore) emailOggetto = s.valore;
      if (s.chiave === 'email_credenziali_corpo' && s.valore) emailCorpo = s.valore;
      if (s.chiave === 'email_credenziali_corpo_post' && s.valore) emailCorpoPost = s.valore;
    }
  } catch { /* fall back to defaults */ }

  const corpoPostHtml = emailCorpoPost
    ? `<p style="color:#111827;font-size:15px;line-height:1.7;margin:0 0 24px;">${emailCorpoPost.replace(/\n/g, '<br>')}</p>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link href="https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700&display=swap" rel="stylesheet"></head>
<body style="margin:0;padding:0;background:#F9F6F1;font-family:'Nunito',Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #DEDAD7;">
    <div style="background:#000000;padding:32px 40px;text-align:center;">
      <h1 style="color:#F5F4F2;font-size:22px;font-weight:300;letter-spacing:5px;margin:0;">ON EARTH</h1>
      <p style="color:#ACA39A;font-size:10px;letter-spacing:3px;margin:6px 0 0;text-transform:uppercase;">B2B Platform</p>
    </div>
    <div style="padding:40px;">
      <p style="color:#6B7280;font-size:14px;margin:0 0 8px;">Gentile ${params.nome},</p>
      <p style="color:#111827;font-size:15px;line-height:1.7;margin:0 0 28px;">
        ${emailCorpo}
      </p>
      <div style="background:#F5F4F2;border:1px solid #DEDAD7;border-radius:8px;padding:24px;margin-bottom:24px;">
        <p style="color:#ACA39A;font-size:10px;text-transform:uppercase;letter-spacing:2px;margin:0 0 16px;font-weight:600;">Le tue credenziali</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#6B7280;font-size:12px;width:90px;vertical-align:top;">Indirizzo</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;word-break:break-all;overflow-wrap:anywhere;">app.b2b.on-earth.it</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6B7280;font-size:12px;vertical-align:top;">Email</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;word-break:break-all;overflow-wrap:anywhere;">${params.email}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6B7280;font-size:12px;vertical-align:top;">Password</td>
            <td style="padding:6px 0;color:#111827;font-size:16px;font-weight:700;letter-spacing:2px;word-break:break-all;overflow-wrap:anywhere;">${params.password}</td>
          </tr>
        </table>
      </div>
      ${notaHtml}
      ${corpoPostHtml}
      <p style="color:#6B7280;font-size:13px;line-height:1.6;margin:0;">
        Hai domande? Scrivici a <a href="mailto:e.mazzolari@meridiano361.it" style="color:#ACA39A;text-decoration:none;">e.mazzolari@meridiano361.it</a>
      </p>
    </div>
    <div style="background:#F9F6F1;border-top:1px solid #DEDAD7;padding:20px 40px;text-align:center;">
      <p style="color:#9CA3AF;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0;">ON EARTH · on-earth.it</p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    to: params.email,
    subject: emailOggetto,
    html,
  });
}

export async function sendCustomerNotificationEmail(
  customer: { email: string; companyName: string },
  notification: { titolo: string; testo: string; linkUrl: string | null }
): Promise<void> {
  const linkHtml = notification.linkUrl
    ? `<p style="margin:20px 0 0;"><a href="${notification.linkUrl}" style="background:#000;color:#fff;text-decoration:none;padding:10px 20px;border-radius:4px;font-size:13px;display:inline-block;">Scopri di più</a></p>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link href="https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700&display=swap" rel="stylesheet"></head>
<body style="margin:0;padding:0;background:#F9F6F1;font-family:'Nunito',Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #DEDAD7;">
    <div style="background:#000000;padding:28px 40px;text-align:center;">
      <h1 style="color:#F5F4F2;font-size:20px;font-weight:300;letter-spacing:5px;margin:0;">ON EARTH</h1>
      <p style="color:#ACA39A;font-size:10px;letter-spacing:3px;margin:6px 0 0;text-transform:uppercase;">B2B Platform</p>
    </div>
    <div style="padding:36px 40px;">
      <p style="color:#6B7280;font-size:13px;margin:0 0 20px;">Gentile ${customer.companyName},</p>
      <h2 style="color:#111827;font-size:18px;font-weight:700;margin:0 0 12px;">${notification.titolo}</h2>
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0;">${notification.testo.replace(/\n/g, '<br>')}</p>
      ${linkHtml}
    </div>
    <div style="background:#F9F6F1;border-top:1px solid #DEDAD7;padding:16px 40px;text-align:center;">
      <p style="color:#9CA3AF;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px;">ON EARTH · on-earth.it</p>
      <a href="https://app.b2b.on-earth.it/catalog" style="color:#ACA39A;font-size:11px;text-decoration:underline;">Gestisci preferenze notifiche</a>
    </div>
  </div>
</body>
</html>`;

  await sendEmail({ to: customer.email, subject: notification.titolo, html });
}

export async function sendReminder(params: {
  nome: string;
  email: string;
  orgNome: string;
  messaggioPersonalizzato?: string;
}): Promise<{ sent: boolean; error?: string }> {
  const extraHtml = params.messaggioPersonalizzato
    ? `<div style="border-left:3px solid #ACA39A;padding:12px 16px;margin:0 0 24px;background:#FDFAF7;border-radius:4px;">
        <p style="color:#374151;font-size:14px;margin:0;line-height:1.6;">${params.messaggioPersonalizzato.replace(/\n/g, '<br>')}</p>
       </div>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link href="https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700&display=swap" rel="stylesheet"></head>
<body style="margin:0;padding:0;background:#F9F6F1;font-family:'Nunito',Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #DEDAD7;">
    <div style="background:#000000;padding:32px 40px;text-align:center;">
      <h1 style="color:#F5F4F2;font-size:22px;font-weight:300;letter-spacing:5px;margin:0;">ON EARTH</h1>
      <p style="color:#ACA39A;font-size:10px;letter-spacing:3px;margin:6px 0 0;text-transform:uppercase;">B2B Platform</p>
    </div>
    <div style="padding:40px;">
      <p style="color:#6B7280;font-size:14px;margin:0 0 8px;">Gentile ${params.nome},</p>
      <p style="color:#111827;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Ti ricordiamo che hai accesso alla piattaforma <strong>ON EARTH B2B</strong>, dove puoi consultare il catalogo,
        effettuare ordini e gestire le tue esposizioni.
      </p>
      ${extraHtml}
      <div style="background:#F5F4F2;border:1px solid #DEDAD7;border-radius:8px;padding:24px;margin-bottom:28px;">
        <p style="color:#ACA39A;font-size:10px;text-transform:uppercase;letter-spacing:2px;margin:0 0 16px;font-weight:600;">Accedi ora</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#6B7280;font-size:12px;width:90px;">Indirizzo</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;word-break:break-all;overflow-wrap:anywhere;">app.b2b.on-earth.it</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6B7280;font-size:12px;">Email</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;word-break:break-all;overflow-wrap:anywhere;">${params.email}</td>
          </tr>
        </table>
      </div>
      <p style="color:#6B7280;font-size:13px;line-height:1.6;margin:0;">
        Hai bisogno di supporto? Scrivici a <a href="mailto:e.mazzolari@meridiano361.it" style="color:#ACA39A;text-decoration:none;">e.mazzolari@meridiano361.it</a>
      </p>
    </div>
    <div style="background:#F9F6F1;border-top:1px solid #DEDAD7;padding:20px 40px;text-align:center;">
      <p style="color:#9CA3AF;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0;">ON EARTH · on-earth.it</p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    to: params.email,
    subject: `Promemoria: accedi alla piattaforma ON EARTH B2B — ${params.orgNome}`,
    html,
  });
}
