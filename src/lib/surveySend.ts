import webPush from 'web-push';
import { prisma } from '@/lib/prisma';
import { sendSurveyInviteEmailBatch, sendSurveyCustomEmailBatch } from '@/lib/surveyEmail';

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
  emailFailed: number;
  errors: number;
}

const BATCH_SIZE = 100;

export async function sendSurveyToAllCustomers(surveyId: string): Promise<SendSurveyResult> {
  const survey = await prisma.survey.findUniqueOrThrow({ where: { id: surveyId } });

  const recipients = await prisma.surveyRecipient.findMany({
    where: {
      surveyId,
      status: { notIn: ['completed'] },
      OR: [{ emailSentAt: null }, { pushSentAt: null }],
    },
  });

  // ── PUSH ────────────────────────────────────────────────────────────────────
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
  const pushedRecipientIds = new Set<string>();

  await Promise.allSettled(
    recipients
      .filter((r) => !r.pushSentAt)
      .map(async (recipient) => {
        const surveyUrl = `${APP_URL}/survey/${survey.slug}?token=${recipient.token}`;
        const subs = subsByEmail.get(recipient.email) ?? [];
        for (const sub of subs) {
          try {
            await sendPush(sub, {
              title: 'OnEarth',
              body: 'Aiutaci a migliorare l\'app: lascia la tua opinione in 2 minuti.',
              url: surveyUrl,
            });
            pushedRecipientIds.add(recipient.id);
            pushSent++;
          } catch (e: any) {
            if (e?.statusCode === 410 || e?.statusCode === 404) {
              await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
            } else {
              console.error('[survey-push] failed for', recipient.email, e?.message);
            }
          }
        }
      })
  );

  // ── EMAIL (batch, 100 per volta) ────────────────────────────────────────────
  const toEmail = recipients.filter((r) => !r.emailSentAt);
  let emailSent = 0;
  let emailFailed = 0;
  const sentEmailIds = new Set<string>();

  for (let i = 0; i < toEmail.length; i += BATCH_SIZE) {
    const chunk = toEmail.slice(i, i + BATCH_SIZE);
    const result = await sendSurveyInviteEmailBatch(
      chunk.map((r) => ({
        to: r.email,
        companyName: r.respondentName ?? r.email,
        surveySlug: survey.slug,
        token: r.token,
        endsAt: survey.endsAt,
      }))
    );
    if (result.failedEmails.length === 0) {
      chunk.forEach((r) => sentEmailIds.add(r.id));
      emailSent += result.sentCount;
    } else {
      // partial failure: mark the ones NOT in failedEmails as sent
      const failedSet = new Set(result.failedEmails);
      chunk.forEach((r) => {
        if (!failedSet.has(r.email)) { sentEmailIds.add(r.id); emailSent++; }
        else emailFailed++;
      });
    }
  }

  // ── UPDATE DB ───────────────────────────────────────────────────────────────
  const now = new Date();
  await Promise.all(
    recipients.map((r) => {
      const gotPush = pushedRecipientIds.has(r.id);
      const gotEmail = sentEmailIds.has(r.id);
      if (!gotPush && !gotEmail) return null;

      const pushOk = gotPush || !!r.pushSentAt;
      const emailOk = gotEmail || !!r.emailSentAt;
      const channel = pushOk && emailOk ? 'both' : pushOk ? 'push' : emailOk ? 'email' : 'none';

      return prisma.surveyRecipient.update({
        where: { id: r.id },
        data: {
          pushSentAt: gotPush ? now : undefined,
          emailSentAt: gotEmail ? now : undefined,
          deliveryChannel: channel,
          status: pushOk || emailOk ? 'sent' : 'pending',
        },
      });
    }).filter(Boolean)
  );

  return { total: recipients.length, pushSent, emailSent, emailFailed, errors: emailFailed };
}

export interface SendCustomNotifOptions {
  title: string;
  body: string;
  channel: 'push' | 'email' | 'both';
  target: 'pending' | 'all';
}

export async function sendSurveyCustomNotification(
  surveyId: string,
  opts: SendCustomNotifOptions
): Promise<{ total: number; pushSent: number; emailSent: number; emailFailed: number }> {
  const survey = await prisma.survey.findUniqueOrThrow({ where: { id: surveyId } });

  const recipients = await prisma.surveyRecipient.findMany({
    where: {
      surveyId,
      ...(opts.target === 'pending' ? { status: { notIn: ['completed'] } } : {}),
    },
  });

  let pushSent = 0;
  let emailSent = 0;
  let emailFailed = 0;

  if (opts.channel !== 'email') {
    const allSubs = await prisma.pushSubscription.findMany({
      select: { userEmail: true, endpoint: true, p256dh: true, auth: true },
    });
    const subsByEmail = new Map<string, typeof allSubs>();
    for (const sub of allSubs) {
      const list = subsByEmail.get(sub.userEmail) ?? [];
      list.push(sub);
      subsByEmail.set(sub.userEmail, list);
    }

    await Promise.allSettled(
      recipients.map(async (recipient) => {
        const surveyUrl = `${APP_URL}/survey/${survey.slug}?token=${recipient.token}`;
        const subs = subsByEmail.get(recipient.email) ?? [];
        for (const sub of subs) {
          try {
            await sendPush(sub, { title: opts.title, body: opts.body, url: surveyUrl });
            pushSent++;
          } catch (e: any) {
            if (e?.statusCode === 410 || e?.statusCode === 404) {
              await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
            } else {
              console.error('[survey-custom-push]', recipient.email, e?.message);
            }
          }
        }
      })
    );
  }

  if (opts.channel !== 'push') {
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const chunk = recipients.slice(i, i + BATCH_SIZE);
      const result = await sendSurveyCustomEmailBatch(
        chunk.map((r) => ({
          to: r.email,
          companyName: r.respondentName ?? r.email,
          surveySlug: survey.slug,
          token: r.token,
          subject: opts.title,
          bodyText: opts.body,
        }))
      );
      emailSent += result.sentCount;
      emailFailed += result.failedEmails.length;
    }
  }

  return { total: recipients.length, pushSent, emailSent, emailFailed };
}
