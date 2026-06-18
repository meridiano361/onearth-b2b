/**
 * Crea la survey "recensione-app-giugno-2026", popola le domande,
 * registra i destinatari e lancia l'invio push + email a tutti i clienti attivi.
 *
 * Eseguire con:
 *   npx tsx scripts/launch-survey-giugno-2026.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SLUG = 'recensione-app-giugno-2026';

const QUESTIONS = [
  {
    sortOrder: 1,
    questionKey: 'soddisfazione',
    questionText: 'Quanto sei soddisfattə dell\'app?',
    questionType: 'stars',
    optionsJson: null,
  },
  {
    sortOrder: 2,
    questionKey: 'facilita_uso',
    questionText: 'Quanto è stato facile utilizzarla?',
    questionType: 'stars',
    optionsJson: null,
  },
  {
    sortOrder: 3,
    questionKey: 'sezioni_utili',
    questionText: 'Quali sezioni ti sono state più utili?',
    questionType: 'multi_select',
    optionsJson: ['Catalogo', 'Ordini', 'Esposizione', 'Calendario', 'Aiuto', 'Tutte'],
  },
  {
    sortOrder: 4,
    questionKey: 'prenotazioni_future',
    questionText: 'Vorresti utilizzare l\'app anche per le future prenotazioni?',
    questionType: 'single_select',
    optionsJson: ['Sì', 'No'],
  },
  {
    sortOrder: 5,
    questionKey: 'uso_demetra',
    questionText: 'Hai utilizzato l\'app per esportare l\'ordine in Demetra?',
    questionType: 'single_select',
    optionsJson: ['Sì', 'No', 'In parte'],
  },
  {
    sortOrder: 6,
    questionKey: 'suggerimento',
    questionText: 'Quale miglioramento o nuova funzione ti piacerebbe trovare nell\'app?',
    questionType: 'text',
    optionsJson: null,
    required: false,
  },
] as const;

async function main() {
  console.log('── Survey: recensione-app-giugno-2026 ──');

  // 1. Upsert survey
  const existing = await prisma.survey.findUnique({ where: { slug: SLUG } });
  let survey;
  if (existing) {
    console.log('Survey già esistente, aggiorno...');
    survey = await prisma.survey.update({
      where: { slug: SLUG },
      data: { status: 'active' },
    });
  } else {
    survey = await prisma.survey.create({
      data: {
        slug: SLUG,
        title: 'Aiutaci a migliorare l\'app. Lascia la tua opinione: bastano solo 2 minuti.',
        description: 'Rispondi entro domenica 21 giugno.',
        startsAt: new Date(),
        endsAt: new Date('2026-06-21T23:59:59Z'),
        status: 'active',
      },
    });
    console.log('Survey creata:', survey.id);
  }

  // 2. Upsert questions
  for (const q of QUESTIONS) {
    await prisma.surveyQuestion.upsert({
      where: { surveyId_questionKey: { surveyId: survey.id, questionKey: q.questionKey } },
      create: {
        surveyId: survey.id,
        sortOrder: q.sortOrder,
        questionKey: q.questionKey,
        questionText: q.questionText,
        questionType: q.questionType,
        optionsJson: q.optionsJson ?? undefined,
        required: (q as any).required !== false,
      },
      update: {
        sortOrder: q.sortOrder,
        questionText: q.questionText,
        optionsJson: q.optionsJson ?? undefined,
      },
    });
  }
  console.log(`${QUESTIONS.length} domande configurate`);

  // 3. Register recipients (idempotente)
  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    select: { id: true, email: true },
  });

  let newRecipients = 0;
  for (const c of customers) {
    const exists = await prisma.surveyRecipient.findUnique({
      where: { surveyId_customerId: { surveyId: survey.id, customerId: c.id } },
    });
    if (!exists) {
      await prisma.surveyRecipient.create({
        data: { surveyId: survey.id, customerId: c.id, email: c.email },
      });
      newRecipients++;
    }
  }
  console.log(`${newRecipients} nuovi destinatari registrati (${customers.length} totali)`);

  // 4. Send push + email
  console.log('Avvio invio push + email...');
  // Dynamic import to avoid issues with module resolution
  const { sendSurveyToAllCustomers } = await import('../src/lib/surveySend');
  const result = await sendSurveyToAllCustomers(survey.id);

  console.log('\n✅ Invio completato:');
  console.log(`   Destinatari processati : ${result.total}`);
  console.log(`   Push inviate           : ${result.pushSent}`);
  console.log(`   Email inviate          : ${result.emailSent}`);
  console.log(`   Errori (no canale)     : ${result.errors}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
