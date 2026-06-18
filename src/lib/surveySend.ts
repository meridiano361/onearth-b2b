import webPush from 'web-push';
import { prisma } from '@/lib/prisma';
import { sendSurveyInviteEmail } from '@/lib/surveyEmail';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.b2b.on-earth.it';

let vapidConfigured = false;
function ensureVapid() {
  if (vapidConfigured) return;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subj = process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com';
  if (!pub || !priv) return;
  webPush.setVapidDetails(subj, pub, priv);
  vapidConfigured = true;
}

async function sendPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url: string }
): Promise<void> {
  ensureVapid();
  if (!vapidConfigured) throw new Error('VAPID non configurato');
  await webPush.sendNotification(
    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    JSON.stringify(payload)
  );
}

export interface SendSurveyResult {
  total: number;
  pushSent: number;
  emailSent: number;
  errors: number;
}

export async function sendSurveyToAllCustomers(surveyId: string): Promise<SendSurveyResult> {
  const survey = await prisma.survey.findUniqueOrThrow({ where: { id: surveyId } });

  // Get all recipients not yet sent
  const recipients = await prisma.surveyRecipient.findMany({
    where: { surveyId, status: { in: ['pending', 'sent'] }, emailSentAt: null, pushSentAt: null },
    include: {
      customer: { select: { email: true, companyName: true, isActive: true } },
    },
  });

  // Build email → push subscriptions map
  const allSubs = await prisma.pushSubscription.findMany({
    select: { userEmail: true, endpoint: true, p256dh: true, auth: true },
  });
  const subsByEmail = new Map<string, typeof allSubs>();
  for (const sub of allSubs) {
    const list = subsByEmail.get(sub.userEmail) ?? [];
    list.push(sub);
    subsByEmail.set(sub.userEmail, list);
  }

  let pushSent = 0;
  let emailSent = 0;
  let errors = 0;

  await Promise.allSettled(
    recipients
      .filter((r) => r.customer.isActive)
      .map(async (recipient) => {
        const surveyUrl = `${APP_URL}/survey/${survey.slug}?token=${recipient.token}`;
        const subs = subsByEmail.get(recipient.email) ?? [];
        let pushedOk = false;
        let emailOk = false;

        // Push
        for (const sub of subs) {
          try {
            await sendPush(sub, {
              title: 'OnEarth',
              body: 'Aiutaci a migliorare l\'app: lascia la tua opinione in 2 minuti.',
              url: surveyUrl,
            });
            pushedOk = true;
            pushSent++;
          } catch (e: any) {
            if (e?.statusCode === 410 || e?.statusCode === 404) {
              await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
            } else {
              console.error('[survey-push] push failed for', recipient.email, e?.message);
            }
          }
        }

        // Email
        const result = await sendSurveyInviteEmail({
          to: recipient.email,
          companyName: recipient.customer.companyName,
          surveySlug: survey.slug,
          token: recipient.token,
        });
        if (result.sent) {
          emailOk = true;
          emailSent++;
        } else {
          console.error('[survey-email] email failed for', recipient.email, result.error);
          if (!pushedOk) errors++;
        }

        const channel = pushedOk && emailOk ? 'both' : pushedOk ? 'push' : emailOk ? 'email' : 'none';
        await prisma.surveyRecipient.update({
          where: { id: recipient.id },
          data: {
            pushSentAt: pushedOk ? new Date() : undefined,
            emailSentAt: emailOk ? new Date() : undefined,
            deliveryChannel: channel,
            status: pushedOk || emailOk ? 'sent' : 'pending',
          },
        });
      })
  );

  return { total: recipients.length, pushSent, emailSent, errors };
}
