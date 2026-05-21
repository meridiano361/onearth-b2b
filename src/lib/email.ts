import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM ?? 'ON EARTH B2B <onboarding@resend.dev>';
const ADMIN_EMAIL = 'e.mazzolari@meridiano361.it';

export async function sendAccessRequestNotification(data: {
  organizzazione: string;
  nome: string;
  cognome: string;
  email: string;
  telefono?: string | null;
  createdAt: Date;
}) {
  const telefono = data.telefono?.trim() || 'non fornito';
  const dataOra = data.createdAt.toLocaleString('it-IT', { timeZone: 'Europe/Rome' });

  await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `Nuova richiesta di accesso - ${data.nome} ${data.cognome} - ${data.organizzazione}`,
    text: [
      'È arrivata una nuova richiesta di accesso al portale ON EARTH B2B.',
      '',
      'Dettagli richiesta:',
      `- Organizzazione: ${data.organizzazione}`,
      `- Nome: ${data.nome} ${data.cognome}`,
      `- Email: ${data.email}`,
      `- Telefono: ${telefono}`,
      `- Data: ${dataOra}`,
      '',
      'Gestisci la richiesta qui: https://app.b2b.on-earth.it/admin/access-requests',
    ].join('\n'),
  });
}
