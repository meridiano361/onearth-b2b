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
      // Subscription expired — delete it
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
  const customers = await prisma.customer.findMany({
    where: { isActive: true, notificationsEnabled: true },
    select: {
      id: true,
      email: true,
      companyName: true,
      pushSubscriptions: { select: { endpoint: true, p256dh: true, auth: true } },
    },
  });

  const payload = {
    title: notification.titolo,
    body: notification.testo,
    url: notification.linkUrl ?? '/catalog',
  };

  await Promise.allSettled(
    customers.map(async (customer) => {
      try {
        if (customer.pushSubscriptions.length > 0) {
          await Promise.allSettled(customer.pushSubscriptions.map((sub) => sendPush(sub, payload)));
        } else {
          await sendCustomerNotificationEmail(customer, notification);
        }
      } catch (e) {
        console.error('[push] Delivery failed for customer', customer.id, e);
      }
    })
  );
}
