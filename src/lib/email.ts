import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendAccessRequestNotification(data: {
  nome: string;
  cognome: string;
  organizzazione: string;
  email: string;
  telefono?: string | null;
}) {
  if (!resend) {
    console.log('[email] RESEND_API_KEY non configurato, email non inviata');
    return;
  }
  try {
    await resend.emails.send({
      from: 'onboarding@resend.dev',
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
  } catch (error) {
    console.error('Errore invio email:', error);
  }
}
