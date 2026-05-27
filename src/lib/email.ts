import { Resend } from 'resend';

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
}): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  console.log('[EMAIL] Invio a:', to, '— Oggetto:', subject);
  try {
    const result = await resend.emails.send({ from: FROM, to, subject, html });
    console.log('[EMAIL] Inviata — ID:', result.data?.id, '| Errore:', result.error ?? 'nessuno');
    return !result.error;
  } catch (error) {
    console.error('[EMAIL] ERRORE invio a', to, ':', error);
    return false;
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

export async function sendCredenziali(params: {
  nome: string;
  email: string;
  password: string;
  orgNome: string;
  noteCliente?: string | null;
}): Promise<{ sent: boolean }> {
  const notaHtml = params.noteCliente
    ? `<div style="border-left:3px solid #C17A5A;padding:12px 16px;margin:0 0 24px;background:#FDFAF7;border-radius:4px;">
        <p style="color:#374151;font-size:14px;margin:0;line-height:1.6;">${params.noteCliente.replace(/\n/g, '<br>')}</p>
       </div>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F9F6F1;font-family:'Georgia',serif;">
  <div style="max-width:560px;margin:32px auto;background:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #E8DDD0;">
    <div style="background:#111827;padding:32px 40px;text-align:center;">
      <h1 style="color:#F5F0E8;font-size:22px;font-weight:300;letter-spacing:5px;margin:0;">ON EARTH</h1>
      <p style="color:#C17A5A;font-size:10px;letter-spacing:3px;margin:6px 0 0;text-transform:uppercase;">B2B Platform</p>
    </div>
    <div style="padding:40px;">
      <p style="color:#6B7280;font-size:14px;margin:0 0 8px;">Gentile ${params.nome},</p>
      <p style="color:#111827;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Il tuo accesso alla piattaforma <strong>ON EARTH B2B</strong> è stato attivato.
        Puoi accedere da qualsiasi dispositivo, anche installando l'app sulla schermata home del telefono.
      </p>
      <div style="background:#F5F0E8;border:1px solid #E8DDD0;border-radius:8px;padding:24px;margin-bottom:24px;">
        <p style="color:#C17A5A;font-size:10px;text-transform:uppercase;letter-spacing:2px;margin:0 0 16px;font-weight:600;">Le tue credenziali</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#6B7280;font-size:12px;width:90px;vertical-align:top;">Indirizzo</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;">app.b2b.on-earth.it</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6B7280;font-size:12px;vertical-align:top;">Email</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;">${params.email}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6B7280;font-size:12px;vertical-align:top;">Password</td>
            <td style="padding:6px 0;color:#111827;font-size:18px;font-weight:700;font-family:monospace,monospace;letter-spacing:2px;">${params.password}</td>
          </tr>
        </table>
      </div>
      ${notaHtml}
      <p style="color:#6B7280;font-size:13px;line-height:1.6;margin:0;">
        Hai domande? Scrivici a <a href="mailto:e.mazzolari@meridiano361.it" style="color:#C17A5A;text-decoration:none;">e.mazzolari@meridiano361.it</a>
      </p>
    </div>
    <div style="background:#F9F6F1;border-top:1px solid #E8DDD0;padding:20px 40px;text-align:center;">
      <p style="color:#9CA3AF;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0;">ON EARTH · on-earth.it</p>
    </div>
  </div>
</body>
</html>`;

  const sent = await sendEmail({
    to: params.email,
    subject: 'Benvenuto su ON EARTH B2B — Le tue credenziali di accesso',
    html,
  });
  return { sent };
}
