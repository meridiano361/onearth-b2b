import webPush from 'web-push';
import { prisma } from '@/lib/prisma';
import { sendCustomerNotificationEmail } from '@/lib/email';

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subj = process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com';
  if (!pub || !priv) {
    console.error('[push] VAPID keys missing — push disabled');
    return;
  }
  webPush.setVapidDetails(subj, pub, priv);
  vapidConfigured = true;
}

async function sendPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url: string }
): Promise<void> {
  ensureVapid();
  if (!vapidConfigured) return;
  try {
    await webPush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    );
  } catch (err: any) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
    } else {
      throw err;
    }
  }
}

export async function sendNotificationToCustomers(notification: {
  id: string;
  titolo: string;
  testo: string;
  linkUrl: string | null;
}): Promise<void> {
  const payload = {
    title: notification.titolo,
    body: notification.testo,
    url: notification.linkUrl ?? '/home',
  };

  // All push subscriptions (customers + operators)
  const allSubs = await prisma.pushSubscription.findMany({
    select: { userEmail: true, endpoint: true, p256dh: true, auth: true },
  });

  // Push to everyone with a subscription
  const pushedEmails = new Set<string>();
  await Promise.allSettled(
    allSubs.map(async (sub) => {
      try {
        await sendPush(sub, payload);
        pushedEmails.add(sub.userEmail);
      } catch (e) {
        console.error('[push] Push failed for', sub.userEmail, e);
      }
    })
  );

  // Email fallback: customers without push subscription
  const customers = await prisma.customer.findMany({
    where: { isActive: true, notificationsEnabled: true },
    select: { id: true, email: true, companyName: true },
  });

  await Promise.allSettled(
    customers
      .filter((c) => !pushedEmails.has(c.email))
      .map(async (customer) => {
        try {
          await sendCustomerNotificationEmail(customer, notification);
        } catch (e) {
          console.error('[push] Email failed for', customer.email, e);
        }
      })
  );
}
