import { Resend } from 'resend';

const FROM = process.env.RESEND_FROM ?? 'onboarding@resend.dev';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.b2b.on-earth.it';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function buildHtml(companyName: string, surveySlug: string, token: string, endsAt?: Date): string {
  const surveyUrl = `${APP_URL}/survey/${surveySlug}?token=${token}`;
  const deadline = endsAt
    ? endsAt.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })
    : null;

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#F9F6F1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #DEDAD7;">
    <div style="background:#000000;padding:28px 40px;text-align:center;">
      <h1 style="color:#F5F4F2;font-size:20px;font-weight:300;letter-spacing:5px;margin:0;">ON EARTH</h1>
      <p style="color:#ACA39A;font-size:10px;letter-spacing:3px;margin:6px 0 0;text-transform:uppercase;">B2B Platform</p>
    </div>
    <div style="padding:36px 40px;">
      <p style="color:#6B7280;font-size:13px;margin:0 0 20px;">Gentile ${companyName},</p>
      <p style="color:#111827;font-size:16px;font-weight:600;margin:0 0 16px;line-height:1.4;">
        Aiutaci a migliorare l'app OnEarth
      </p>
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 12px;">
        Stiamo raccogliendo i feedback sull'app OnEarth per migliorarne l'esperienza d'uso.
        Ti chiediamo 2 minuti per rispondere a un breve questionario.
      </p>
      ${deadline ? `<p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 28px;">Rispondi entro il <strong>${deadline}</strong>.</p>` : '<p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 28px;">Rispondi quando puoi, grazie!</p>'}
      <div style="text-align:center;margin-bottom:28px;">
        <a href="${surveyUrl}"
           style="display:inline-block;background:#000000;color:#FFFFFF;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:14px;font-weight:600;letter-spacing:0.5px;">
          Lascia la tua opinione
        </a>
      </div>
      <p style="color:#9CA3AF;font-size:12px;line-height:1.6;margin:0;">
        Il link è personale e funziona anche senza accedere all'app.
        Se hai già risposto, puoi ignorare questo messaggio.
      </p>
    </div>
    <div style="background:#F9F6F1;border-top:1px solid #DEDAD7;padding:16px 40px;text-align:center;">
      <p style="color:#9CA3AF;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0;">ON EARTH · on-earth.it</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendSurveyInviteEmail(params: {
  to: string;
  companyName: string;
  surveySlug: string;
  token: string;
  endsAt?: Date;
}): Promise<{ sent: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) return { sent: false, error: 'RESEND_API_KEY mancante' };

  try {
    const result = await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: 'Aiutaci a migliorare OnEarth',
      html: buildHtml(params.companyName, params.surveySlug, params.token, params.endsAt),
    });
    if (result.error) return { sent: false, error: `${result.error.name}: ${result.error.message}` };
    return { sent: true };
  } catch (e: any) {
    return { sent: false, error: e?.message ?? String(e) };
  }
}

// Sends up to 100 emails per Resend batch call — avoids rate limiting from parallel sends
export async function sendSurveyInviteEmailBatch(
  items: Array<{ to: string; companyName: string; surveySlug: string; token: string; endsAt?: Date }>
): Promise<{ sentCount: number; failedEmails: string[]; error?: string }> {
  if (items.length === 0) return { sentCount: 0, failedEmails: [] };

  const resend = getResend();
  if (!resend) return { sentCount: 0, failedEmails: items.map((i) => i.to), error: 'RESEND_API_KEY mancante' };

  const payload = items.map((i) => ({
    from: FROM,
    to: i.to,
    subject: 'Aiutaci a migliorare OnEarth',
    html: buildHtml(i.companyName, i.surveySlug, i.token, i.endsAt),
  }));

  try {
    const result = await resend.batch.send(payload);
    if (result.error) {
      console.error('[survey-email-batch] batch error:', result.error);
      return { sentCount: 0, failedEmails: items.map((i) => i.to), error: `${result.error.name}: ${result.error.message}` };
    }
    return { sentCount: items.length, failedEmails: [] };
  } catch (e: any) {
    console.error('[survey-email-batch] exception:', e?.message);
    return { sentCount: 0, failedEmails: items.map((i) => i.to), error: e?.message ?? String(e) };
  }
}
